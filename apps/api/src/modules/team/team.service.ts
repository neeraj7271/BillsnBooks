import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { DataSource, EntityManager } from 'typeorm';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { UserOrmEntity } from '../../infrastructure/persistence/entities/user.orm-entity';
import { TenantOrmEntity } from '../../infrastructure/persistence/entities/tenant.orm-entity';
import { PracticeJobOrmEntity } from '../../infrastructure/persistence/entities/practice-job.orm-entity';
import {
  TeamInvitationOrmEntity,
  PermissionRoleOrmEntity,
  PermissionMatrix,
  JobRoleOrmEntity,
  ClientJobRoleAssignmentOrmEntity,
  ClientTeamMemberOrmEntity,
} from '../../infrastructure/persistence/entities/team-and-review.orm-entity';

const SYSTEM_PERMISSION_ROLES: Array<{
  code: string;
  name: string;
  description: string;
  permissions: PermissionMatrix;
}> = [
  {
    code: 'FIRM_PARTNER',
    name: 'Firm Partner',
    description: 'Full firm access, team management, billing, and final statutory sign-off.',
    permissions: {
      manageTeam: true,
      manageServices: true,
      viewBilling: true,
      approveSignoff: true,
      manageClients: true,
      fileReturns: true,
      manageSettings: true,
      restrictedClientAccess: false,
    },
  },
  {
    code: 'FIRM_ADMIN',
    name: 'Firm Admin',
    description: 'Manage team, clients, services, and billing operations.',
    permissions: {
      manageTeam: true,
      manageServices: true,
      viewBilling: true,
      approveSignoff: true,
      manageClients: true,
      fileReturns: true,
      manageSettings: true,
      restrictedClientAccess: false,
    },
  },
  {
    code: 'MANAGER',
    name: 'Manager / Reviewer',
    description: 'Mid-tier reviewer: can review/approve preparer work and manage client engagements.',
    permissions: {
      manageTeam: false,
      manageServices: true,
      viewBilling: true,
      approveSignoff: true,
      manageClients: true,
      fileReturns: true,
      manageSettings: false,
      restrictedClientAccess: false,
    },
  },
  {
    code: 'STAFF_ACCOUNTANT',
    name: 'Staff Accountant',
    description: 'Preparer: executes assigned jobs, uploads documents, logs time.',
    permissions: {
      manageTeam: false,
      manageServices: false,
      viewBilling: false,
      approveSignoff: false,
      manageClients: false,
      fileReturns: false,
      manageSettings: false,
      restrictedClientAccess: false,
    },
  },
];

const DEFAULT_JOB_ROLES = [
  { code: 'PREPARER', name: 'Preparer', description: 'Prepares return, schedules, and working papers', sortOrder: 1 },
  { code: 'REVIEWER', name: 'Reviewer', description: 'Reviews preparer work and approves or returns for rework', sortOrder: 2 },
  { code: 'PARTNER_SIGNATORY', name: 'Partner / Signatory', description: 'Final statutory sign-off and UDIN authorization', sortOrder: 3 },
  { code: 'BOOKKEEPER', name: 'Bookkeeper', description: 'Monthly accounting & bank reconciliation', sortOrder: 4 },
  { code: 'ACCOUNT_MANAGER', name: 'Account Manager', description: 'Primary client relationship coordinator', sortOrder: 5 },
];

@Injectable()
export class TeamService {
  constructor(
    private readonly uow: UnitOfWorkService,
    private readonly dataSource: DataSource,
  ) {}

  private assertCanManageTeam(role: string) {
    if (!['FIRM_PARTNER', 'FIRM_ADMIN', 'SUPER_ADMIN'].includes(role)) {
      throw new ForbiddenException('Only Firm Partners or Admins can manage team members.');
    }
  }

  async ensureDefaultPermissionRolesInTx(manager: EntityManager, tenantId: string) {
    await manager.query(`SELECT pg_advisory_xact_lock(hashtext('seed_perm_roles_' || $1))`, [tenantId]);
    const repo = manager.getRepository(PermissionRoleOrmEntity);
    const existing = await repo.find({ where: { tenantId }, order: { createdAt: 'ASC' } });
    if (existing.length > 0) return existing;

    const created: PermissionRoleOrmEntity[] = [];
    for (const r of SYSTEM_PERMISSION_ROLES) {
      created.push(
        await repo.save(
          repo.create({
            tenantId,
            code: r.code,
            name: r.name,
            description: r.description,
            isSystem: true,
            isActive: true,
            permissions: r.permissions,
          }),
        ),
      );
    }
    return created;
  }

  async ensureDefaultJobRolesInTx(manager: EntityManager, tenantId: string) {
    await manager.query(`SELECT pg_advisory_xact_lock(hashtext('seed_job_roles_' || $1))`, [tenantId]);
    const repo = manager.getRepository(JobRoleOrmEntity);
    const existing = await repo.find({ where: { tenantId }, order: { sortOrder: 'ASC' } });
    if (existing.length > 0) return existing;

    const created: JobRoleOrmEntity[] = [];
    for (const r of DEFAULT_JOB_ROLES) {
      created.push(
        await repo.save(
          repo.create({
            tenantId,
            code: r.code,
            name: r.name,
            description: r.description,
            sortOrder: r.sortOrder,
            isActive: true,
          }),
        ),
      );
    }
    return created;
  }

  // ==================== §1 COLLEAGUES & INVITATIONS ====================

  async listColleaguesAndInvites(tenantId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const [permRoles, jobRoles, users, invitations] = await Promise.all([
        this.ensureDefaultPermissionRolesInTx(qr.manager, tenantId),
        this.ensureDefaultJobRolesInTx(qr.manager, tenantId),
        qr.manager.find(UserOrmEntity, {
          where: { tenantId, userKind: 'FIRM_COLLEAGUE' },
          order: { createdAt: 'ASC' },
        }),
        qr.manager.find(TeamInvitationOrmEntity, {
          where: { tenantId },
          order: { createdAt: 'DESC' },
        }),
      ]);

      const permMap = new Map(permRoles.map((r) => [r.id, r]));

      return {
        colleagues: users.map((u) => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
          role: u.role,
          permissionRoleId: u.permissionRoleId || null,
          permissionRoleName: u.permissionRoleId ? permMap.get(u.permissionRoleId)?.name || u.role : u.role,
          jobRoleIds: u.jobRoleIds || [],
          weeklyCapacityHours: u.weeklyCapacityHours || 40,
          hourlyCostRate: Number(u.hourlyCostRate || 500),
          isActive: u.isActive,
          lastActiveAt: u.lastActiveAt || u.updatedAt,
          createdAt: u.createdAt,
        })),
        invitations,
        permissionRoles: permRoles,
        jobRoles,
      };
    });
  }

  async createInvitation(
    tenantId: string,
    inviterId: string,
    inviterRole: string,
    dto: { email: string; name?: string; invitedRole?: string; permissionRoleId?: string },
  ) {
    this.assertCanManageTeam(inviterRole);
    const email = dto.email?.trim().toLowerCase();
    if (!email) throw new BadRequestException('Email is required');

    return this.uow.executeInTransaction(async (qr) => {
      const existingUser = await qr.manager.findOne(UserOrmEntity, { where: { email } });
      if (existingUser) {
        throw new ConflictException(`A user with email ${email} already exists.`);
      }

      const token = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 86400000);
      const repo = qr.manager.getRepository(TeamInvitationOrmEntity);

      const inv = await repo.save(
        repo.create({
          tenantId,
          email,
          name: dto.name?.trim() || null,
          invitedRole: dto.invitedRole || 'STAFF_ACCOUNTANT',
          permissionRoleId: dto.permissionRoleId || null,
          invitedByUserId: inviterId,
          token,
          status: 'PENDING',
          expiresAt,
        }),
      );

      return {
        invitation: inv,
        inviteLink: `/auth/accept-invite?token=${token}`,
        smtpConfigured: Boolean(process.env.SMTP_HOST),
      };
    });
  }

  async resendInvitation(tenantId: string, actorRole: string, id: string) {
    this.assertCanManageTeam(actorRole);
    return this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(TeamInvitationOrmEntity);
      const inv = await repo.findOne({ where: { id, tenantId } });
      if (!inv) throw new NotFoundException('Invitation not found');
      inv.token = crypto.randomBytes(24).toString('hex');
      inv.expiresAt = new Date(Date.now() + 7 * 86400000);
      inv.status = 'PENDING';
      const saved = await repo.save(inv);
      return { invitation: saved, inviteLink: `/auth/accept-invite?token=${saved.token}` };
    });
  }

  async revokeInvitation(tenantId: string, actorRole: string, id: string) {
    this.assertCanManageTeam(actorRole);
    return this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(TeamInvitationOrmEntity);
      const inv = await repo.findOne({ where: { id, tenantId } });
      if (!inv) throw new NotFoundException('Invitation not found');
      inv.status = 'REVOKED';
      return await repo.save(inv);
    });
  }

  // Public lookup for /auth/accept-invite (bypasses tenant RLS safely via token lookup)
  async getInvitationByToken(token: string) {
    const rows = await this.dataSource.query(
      `SELECT * FROM auth_find_invite_by_token($1)`,
      [token],
    );
    const inv = rows[0];
    if (!inv) throw new NotFoundException('Invalid invitation token');
    if (inv.status !== 'PENDING') throw new BadRequestException(`Invitation is ${inv.status.toLowerCase()}`);
    if (new Date(inv.expiresAt) < new Date()) throw new BadRequestException('Invitation has expired');
    return inv;
  }

  async addMemberDirectly(
    tenantId: string,
    actorRole: string,
    dto: {
      email: string;
      firstName: string;
      lastName: string;
      password: string;
      role?: string;
      permissionRoleId?: string;
      weeklyCapacityHours?: number;
      hourlyCostRate?: number;
    },
  ) {
    this.assertCanManageTeam(actorRole);
    const email = dto.email?.trim().toLowerCase();
    if (!email || !dto.password) throw new BadRequestException('Email and password are required');

    const passwordHash = await argon2.hash(dto.password);
    return this.uow.executeInTransaction(async (qr) => {
      const dup = await qr.manager.findOne(UserOrmEntity, { where: { email } });
      if (dup) throw new ConflictException('Email already registered');

      const userRepo = qr.manager.getRepository(UserOrmEntity);
      const saved = await userRepo.save(
        userRepo.create({
          tenantId,
          email,
          firstName: dto.firstName || 'Team',
          lastName: dto.lastName || 'Member',
          passwordHash,
          role: (dto.role || 'STAFF_ACCOUNTANT') as any,
          permissionRoleId: dto.permissionRoleId || null,
          userKind: 'FIRM_COLLEAGUE',
          weeklyCapacityHours: dto.weeklyCapacityHours ?? 40,
          hourlyCostRate: dto.hourlyCostRate ?? 500,
          isActive: true,
        }),
      );
      return { id: saved.id, email: saved.email, role: saved.role };
    });
  }

  async updateMember(
    tenantId: string,
    actorRole: string,
    userId: string,
    dto: Partial<{
      firstName: string;
      lastName: string;
      role: string;
      permissionRoleId: string | null;
      jobRoleIds: string[];
      weeklyCapacityHours: number;
      hourlyCostRate: number;
      isActive: boolean;
      reassignOpenJobsToUserId: string | null;
    }>,
  ) {
    this.assertCanManageTeam(actorRole);
    return this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(UserOrmEntity);
      const user = await repo.findOne({ where: { id: userId, tenantId } });
      if (!user) throw new NotFoundException('Team member not found');

      if (dto.firstName !== undefined) user.firstName = dto.firstName;
      if (dto.lastName !== undefined) user.lastName = dto.lastName;
      if (dto.role !== undefined) user.role = dto.role as any;
      if (dto.permissionRoleId !== undefined) user.permissionRoleId = dto.permissionRoleId;
      if (dto.jobRoleIds !== undefined) user.jobRoleIds = dto.jobRoleIds;
      if (dto.weeklyCapacityHours !== undefined) user.weeklyCapacityHours = dto.weeklyCapacityHours;
      if (dto.hourlyCostRate !== undefined) user.hourlyCostRate = dto.hourlyCostRate;
      if (dto.isActive !== undefined) user.isActive = dto.isActive;

      const saved = await repo.save(user);

      if (dto.isActive === false && dto.reassignOpenJobsToUserId !== undefined) {
        await qr.manager.query(
          `UPDATE practice_jobs SET assigned_to_user_id = $1
           WHERE tenant_id = $2 AND assigned_to_user_id = $3 AND stage NOT IN ('DONE', 'FILED')`,
          [dto.reassignOpenJobsToUserId, tenantId, userId],
        );
      }
      return saved;
    });
  }

  // ==================== §2 PERMISSION ROLES & JOB ROLES ====================

  async listPermissionRoles(tenantId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      return await this.ensureDefaultPermissionRolesInTx(qr.manager, tenantId);
    });
  }

  async createPermissionRole(
    tenantId: string,
    actorRole: string,
    dto: { name: string; description?: string; permissions: PermissionMatrix },
  ) {
    this.assertCanManageTeam(actorRole);
    if (!dto.name?.trim()) throw new BadRequestException('Role name is required');
    const code = dto.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');

    return this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(PermissionRoleOrmEntity);
      return await repo.save(
        repo.create({
          tenantId,
          name: dto.name.trim(),
          code,
          description: dto.description || null,
          isSystem: false,
          isActive: true,
          permissions: dto.permissions,
        }),
      );
    });
  }

  async updatePermissionRole(
    tenantId: string,
    actorRole: string,
    id: string,
    dto: Partial<{ name: string; description: string; permissions: PermissionMatrix; isActive: boolean }>,
  ) {
    this.assertCanManageTeam(actorRole);
    return this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(PermissionRoleOrmEntity);
      const role = await repo.findOne({ where: { id, tenantId } });
      if (!role) throw new NotFoundException('Permission role not found');
      if (dto.name !== undefined) role.name = dto.name.trim();
      if (dto.description !== undefined) role.description = dto.description;
      if (dto.permissions !== undefined) role.permissions = dto.permissions;
      if (dto.isActive !== undefined && !role.isSystem) role.isActive = dto.isActive;
      return await repo.save(role);
    });
  }

  async listJobRoles(tenantId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      return await this.ensureDefaultJobRolesInTx(qr.manager, tenantId);
    });
  }

  async createJobRole(tenantId: string, actorRole: string, dto: { name: string; description?: string }) {
    this.assertCanManageTeam(actorRole);
    if (!dto.name?.trim()) throw new BadRequestException('Job role name is required');
    const code = dto.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    return this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(JobRoleOrmEntity);
      return await repo.save(
        repo.create({
          tenantId,
          name: dto.name.trim(),
          code,
          description: dto.description || null,
          sortOrder: 50,
          isActive: true,
        }),
      );
    });
  }

  // ==================== §3 CLIENT-TEAM MEMBERSHIP & JOB-ROLE ASSIGNMENT ====================

  async getClientTeam(tenantId: string, clientId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const [jobRoles, members, assignments, colleagues] = await Promise.all([
        this.ensureDefaultJobRolesInTx(qr.manager, tenantId),
        qr.manager.find(ClientTeamMemberOrmEntity, { where: { tenantId, clientId } }),
        qr.manager.find(ClientJobRoleAssignmentOrmEntity, { where: { tenantId, clientId } }),
        qr.manager.find(UserOrmEntity, { where: { tenantId, userKind: 'FIRM_COLLEAGUE', isActive: true } }),
      ]);

      const userMap = new Map(
        colleagues.map((u) => [u.id, { id: u.id, name: `${u.firstName} ${u.lastName}`.trim() || u.email, email: u.email, role: u.role }]),
      );
      const roleMap = new Map(jobRoles.map((r) => [r.id, r]));

      return {
        members: members.map((m) => ({
          ...m,
          user: userMap.get(m.userId) || null,
          jobRole: m.jobRoleId ? roleMap.get(m.jobRoleId) || null : null,
        })),
        jobRoleAssignments: assignments.map((a) => ({
          ...a,
          user: userMap.get(a.userId) || null,
          jobRole: roleMap.get(a.jobRoleId) || null,
        })),
        jobRoles,
        colleagues: Array.from(userMap.values()),
      };
    });
  }

  async addClientTeamMember(
    tenantId: string,
    clientId: string,
    dto: { userId: string; jobRoleId?: string | null },
  ) {
    return this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(ClientTeamMemberOrmEntity);
      let existing = await repo.findOne({ where: { tenantId, clientId, userId: dto.userId } });
      if (!existing) {
        existing = repo.create({ tenantId, clientId, userId: dto.userId, jobRoleId: dto.jobRoleId || null });
      } else {
        existing.jobRoleId = dto.jobRoleId || null;
      }
      const saved = await repo.save(existing);

      if (dto.jobRoleId) {
        await this.upsertClientJobRoleInTx(qr.manager, tenantId, clientId, dto.jobRoleId, dto.userId);
      }
      return saved;
    });
  }

  private async upsertClientJobRoleInTx(
    manager: EntityManager,
    tenantId: string,
    clientId: string,
    jobRoleId: string,
    userId: string,
  ) {
    const repo = manager.getRepository(ClientJobRoleAssignmentOrmEntity);
    let existing = await repo.findOne({ where: { tenantId, clientId, jobRoleId } });
    if (!existing) {
      existing = repo.create({ tenantId, clientId, jobRoleId, userId });
    } else {
      existing.userId = userId;
    }
    return await repo.save(existing);
  }

  async assignClientJobRole(
    tenantId: string,
    clientId: string,
    dto: { jobRoleId: string; userId: string },
  ) {
    return this.uow.executeInTransaction(async (qr) => {
      // Ensure user is also on the client team
      const memberRepo = qr.manager.getRepository(ClientTeamMemberOrmEntity);
      const existingMember = await memberRepo.findOne({
        where: { tenantId, clientId, userId: dto.userId },
      });
      if (!existingMember) {
        await memberRepo.save(
          memberRepo.create({ tenantId, clientId, userId: dto.userId, jobRoleId: dto.jobRoleId }),
        );
      }
      return await this.upsertClientJobRoleInTx(qr.manager, tenantId, clientId, dto.jobRoleId, dto.userId);
    });
  }

  async removeClientTeamMember(tenantId: string, clientId: string, userId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      await qr.manager.delete(ClientTeamMemberOrmEntity, { tenantId, clientId, userId });
      await qr.manager.delete(ClientJobRoleAssignmentOrmEntity, { tenantId, clientId, userId });
      return { removed: true };
    });
  }
}
