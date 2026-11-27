import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { PracticeJobOrmEntity } from '../../infrastructure/persistence/entities/practice-job.orm-entity';
import {
  PracticeJobReviewOrmEntity,
  ClientJobRoleAssignmentOrmEntity,
  JobRoleOrmEntity,
  PermissionRoleOrmEntity,
} from '../../infrastructure/persistence/entities/team-and-review.orm-entity';
import { TenantOrmEntity } from '../../infrastructure/persistence/entities/tenant.orm-entity';
import { UserOrmEntity } from '../../infrastructure/persistence/entities/user.orm-entity';
import { AuditLogOrmEntity } from '../../infrastructure/persistence/entities/audit-log.orm-entity';
import { NotificationOrmEntity } from '../../infrastructure/persistence/entities/notification.orm-entity';
import { NotificationType } from '@platform/shared-types';

@Injectable()
export class PracticeReviewService {
  constructor(private readonly uow: UnitOfWorkService) {}

  private hash(payload: unknown): string {
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  async getReviewSettings(tenantId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const [tenant, colleagueCount] = await Promise.all([
        qr.manager.findOne(TenantOrmEntity, { where: { id: tenantId } }),
        qr.manager.count(UserOrmEntity, {
          where: { tenantId, userKind: 'FIRM_COLLEAGUE', isActive: true },
        }),
      ]);
      return {
        reviewMode: (tenant?.reviewMode as 'OFF' | 'SELF_SIGNOFF' | 'ENFORCED') || 'ENFORCED',
        colleagueCount,
        suggestedMode: colleagueCount <= 1 ? 'SELF_SIGNOFF' : 'ENFORCED',
      };
    });
  }

  async setReviewMode(
    tenantId: string,
    role: string,
    reviewMode: 'OFF' | 'SELF_SIGNOFF' | 'ENFORCED',
  ) {
    if (!['FIRM_PARTNER', 'FIRM_ADMIN', 'SUPER_ADMIN'].includes(role)) {
      throw new ForbiddenException('Only Firm Partners or Admins can change review settings.');
    }
    if (!['OFF', 'SELF_SIGNOFF', 'ENFORCED'].includes(reviewMode)) {
      throw new BadRequestException('Invalid reviewMode');
    }
    return this.uow.executeInTransaction(async (qr) => {
      await qr.manager.update(TenantOrmEntity, { id: tenantId }, { reviewMode });
      return { reviewMode };
    });
  }

  async submitForReview(tenantId: string, userId: string, jobId: string, notes?: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const job = await qr.manager.findOne(PracticeJobOrmEntity, {
        where: { id: jobId, tenantId },
        relations: ['client'],
      });
      if (!job) throw new NotFoundException('Job not found');

      const user = await qr.manager.findOne(UserOrmEntity, { where: { id: userId } });
      const actorName = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : 'Preparer';

      const stages = job.stages?.length
        ? job.stages
        : [
            { key: 'BACKLOG', label: 'Backlog', order: 1 },
            { key: 'IN_PROGRESS', label: 'In Progress', order: 2 },
            { key: 'REVIEW', label: 'Review', order: 3, requiresApproval: true },
            { key: 'FILED', label: 'Filed', order: 4 },
            { key: 'DONE', label: 'Done', order: 5 },
          ];

      const curIdx = stages.findIndex((s) => s.key === job.stage);
      const nextReviewStage =
        stages.slice(Math.max(0, curIdx + 1)).find((s) => s.requiresApproval || s.key.includes('REVIEW')) ||
        stages.find((s) => s.requiresApproval || s.key.includes('REVIEW')) ||
        { key: 'REVIEW', label: 'Review' };

      // Resolve reviewer from client job-role assignments if not yet set
      let reviewerId = job.reviewerUserId;
      if (!reviewerId) {
        const jobRoles = await qr.manager.find(JobRoleOrmEntity, { where: { tenantId } });
        const revRole = jobRoles.find((r) => r.code === 'REVIEWER' || r.code === 'PARTNER_SIGNATORY');
        if (revRole) {
          const mapping = await qr.manager.findOne(ClientJobRoleAssignmentOrmEntity, {
            where: { tenantId, clientId: job.clientId, jobRoleId: revRole.id },
          });
          if (mapping) reviewerId = mapping.userId;
        }
      }

      job.preparerUserId = userId;
      if (reviewerId) job.reviewerUserId = reviewerId;
      job.stage = nextReviewStage.key;
      job.reviewStatus = 'IN_REVIEW';
      job.reviewNotes = notes || null;
      job.stageState = {
        ...(job.stageState || {}),
        [stages[Math.max(0, curIdx)]?.key || 'IN_PROGRESS']: {
          status: 'COMPLETED',
          completedByUserId: userId,
          completedAt: new Date().toISOString(),
        },
      };
      await qr.manager.save(job);

      const reviewRepo = qr.manager.getRepository(PracticeJobReviewOrmEntity);
      await reviewRepo.save(
        reviewRepo.create({
          tenantId,
          jobId: job.id,
          stage: job.stage,
          action: 'SUBMIT_FOR_REVIEW',
          actorUserId: userId,
          actorName,
          actorRole: user?.role || 'STAFF_ACCOUNTANT',
          notes: notes || 'Submitted for review',
        }),
      );

      const auditRepo = qr.manager.getRepository(AuditLogOrmEntity);
      const payload = { jobId: job.id, stage: job.stage, action: 'SUBMIT_FOR_REVIEW', actorName };
      await auditRepo.save(
        auditRepo.create({
          tenantId,
          companyId: job.client?.companyId || null,
          actorId: userId,
          entityType: 'PRACTICE_JOB_REVIEW',
          entityId: job.id,
          action: 'SUBMIT_FOR_REVIEW',
          payloadAfter: payload,
          recordHash: this.hash(payload),
        }),
      );

      if (reviewerId && reviewerId !== userId) {
        await qr.manager.save(
          qr.manager.getRepository(NotificationOrmEntity).create({
            tenantId,
            userId: reviewerId,
            title: 'Job Awaiting Your Review',
            message: `${actorName} submitted "${job.title}" for review.`,
            type: NotificationType.APPROVAL_REQUIRED,
            entityType: 'PRACTICE_JOB',
            entityId: job.id,
            isRead: false,
          }),
        );
      }

      return job;
    });
  }

  async approveOrSignOff(
    tenantId: string,
    userId: string,
    userRole: string,
    jobId: string,
    dto: { notes?: string; isFinalSignoff?: boolean },
  ) {
    return this.uow.executeInTransaction(async (qr) => {
      const [tenant, job, user] = await Promise.all([
        qr.manager.findOne(TenantOrmEntity, { where: { id: tenantId } }),
        qr.manager.findOne(PracticeJobOrmEntity, {
          where: { id: jobId, tenantId },
          relations: ['client'],
        }),
        qr.manager.findOne(UserOrmEntity, { where: { id: userId } }),
      ]);
      if (!job) throw new NotFoundException('Job not found');

      const reviewMode = (tenant?.reviewMode as 'OFF' | 'SELF_SIGNOFF' | 'ENFORCED') || 'ENFORCED';

      // ENFORCED SEPARATION OF DUTIES
      if (reviewMode === 'ENFORCED' && job.preparerUserId && job.preparerUserId === userId) {
        throw new ForbiddenException(
          'Separation of duties: the preparer cannot approve or sign off their own work.',
        );
      }

      // Verify user has approval capability or holds Reviewer/Partner job role for this client
      let canApprove = ['FIRM_PARTNER', 'FIRM_ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(userRole);
      if (!canApprove && user?.permissionRoleId) {
        const pr = await qr.manager.findOne(PermissionRoleOrmEntity, {
          where: { id: user.permissionRoleId, tenantId },
        });
        if (pr?.permissions?.approveSignoff) canApprove = true;
      }
      if (!canApprove) {
        const assignment = await qr.manager.findOne(ClientJobRoleAssignmentOrmEntity, {
          where: { tenantId, clientId: job.clientId, userId },
        });
        if (assignment) canApprove = true;
      }
      if (!canApprove && reviewMode === 'ENFORCED') {
        throw new ForbiddenException('You do not have review/sign-off authority for this job.');
      }

      const actorName = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : 'Reviewer';
      const stages = job.stages?.length
        ? job.stages
        : [
            { key: 'BACKLOG', label: 'Backlog', order: 1 },
            { key: 'IN_PROGRESS', label: 'In Progress', order: 2 },
            { key: 'REVIEW', label: 'Review', order: 3, requiresApproval: true },
            { key: 'FILED', label: 'Filed', order: 4 },
            { key: 'DONE', label: 'Done', order: 5 },
          ];
      const curIdx = stages.findIndex((s) => s.key === job.stage);
      const nextStage = stages[curIdx + 1]?.key || 'FILED';
      const isFinal = Boolean(dto.isFinalSignoff) || nextStage === 'FILED' || nextStage === 'DONE';

      const prevStage = job.stage;
      job.stage = nextStage;
      job.reviewStatus = isFinal ? 'SIGNED_OFF' : 'APPROVED';
      if (isFinal) job.partnerUserId = userId;
      else job.reviewerUserId = userId;
      job.reviewNotes = dto.notes || null;
      job.stageState = {
        ...(job.stageState || {}),
        [prevStage]: {
          status: 'APPROVED',
          completedByUserId: userId,
          completedAt: new Date().toISOString(),
        },
      };
      await qr.manager.save(job);

      const deliverableHash = this.hash({
        jobId: job.id,
        title: job.title,
        period: job.period,
        checklist: job.checklist,
        signedBy: userId,
        at: new Date().toISOString(),
      });

      const action =
        reviewMode !== 'ENFORCED' && job.preparerUserId === userId
          ? 'SELF_SIGN_OFF'
          : isFinal
            ? 'SIGN_OFF'
            : 'APPROVE';

      await qr.manager.save(
        qr.manager.getRepository(PracticeJobReviewOrmEntity).create({
          tenantId,
          jobId: job.id,
          stage: prevStage,
          action,
          actorUserId: userId,
          actorName,
          actorRole: userRole,
          notes: dto.notes || (isFinal ? 'Partner final sign-off' : 'Approved'),
          deliverableHash,
        }),
      );

      const auditPayload = { jobId: job.id, stage: prevStage, action, actorName, deliverableHash };
      await qr.manager.save(
        qr.manager.getRepository(AuditLogOrmEntity).create({
          tenantId,
          companyId: job.client?.companyId || null,
          actorId: userId,
          entityType: 'PRACTICE_JOB_REVIEW',
          entityId: job.id,
          action,
          payloadAfter: auditPayload,
          recordHash: this.hash(auditPayload),
        }),
      );

      return job;
    });
  }

  async returnForRework(
    tenantId: string,
    userId: string,
    userRole: string,
    jobId: string,
    notes: string,
  ) {
    if (!notes?.trim()) {
      throw new BadRequestException('Actionable rework notes are required when returning a job.');
    }
    return this.uow.executeInTransaction(async (qr) => {
      const [job, user] = await Promise.all([
        qr.manager.findOne(PracticeJobOrmEntity, {
          where: { id: jobId, tenantId },
          relations: ['client'],
        }),
        qr.manager.findOne(UserOrmEntity, { where: { id: userId } }),
      ]);
      if (!job) throw new NotFoundException('Job not found');

      const actorName = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : 'Reviewer';
      const stages = job.stages?.length ? job.stages : [];
      const prepStage =
        stages.find((s) => !s.requiresApproval && s.order && s.order > 1)?.key || 'IN_PROGRESS';

      const prevStage = job.stage;
      job.stage = prepStage;
      job.reviewStatus = 'CHANGES_REQUESTED';
      job.reviewNotes = notes.trim();
      await qr.manager.save(job);

      await qr.manager.save(
        qr.manager.getRepository(PracticeJobReviewOrmEntity).create({
          tenantId,
          jobId: job.id,
          stage: prevStage,
          action: 'RETURN_FOR_REWORK',
          actorUserId: userId,
          actorName,
          actorRole: userRole,
          notes: notes.trim(),
        }),
      );

      const auditPayload = { jobId: job.id, stage: prevStage, action: 'RETURN_FOR_REWORK', notes: notes.trim() };
      await qr.manager.save(
        qr.manager.getRepository(AuditLogOrmEntity).create({
          tenantId,
          companyId: job.client?.companyId || null,
          actorId: userId,
          entityType: 'PRACTICE_JOB_REVIEW',
          entityId: job.id,
          action: 'RETURN_FOR_REWORK',
          payloadAfter: auditPayload,
          recordHash: this.hash(auditPayload),
        }),
      );

      if (job.preparerUserId) {
        await qr.manager.save(
          qr.manager.getRepository(NotificationOrmEntity).create({
            tenantId,
            userId: job.preparerUserId,
            title: 'Changes Requested on Job',
            message: `${actorName} returned "${job.title}": ${notes.trim()}`,
            type: NotificationType.APPROVAL_RESOLVED,
            entityType: 'PRACTICE_JOB',
            entityId: job.id,
            isRead: false,
          }),
        );
      }

      return job;
    });
  }

  async getReviewInbox(tenantId: string, userId: string, userRole: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const jobs = await qr.manager.find(PracticeJobOrmEntity, {
        where: { tenantId },
        relations: ['client', 'client.company'],
        order: { dueDate: 'ASC' },
      });

      const pending = jobs.filter((j) => {
        const isReviewStage =
          j.reviewStatus === 'IN_REVIEW' ||
          j.stage.includes('REVIEW') ||
          (j.stages || []).some((s) => s.key === j.stage && s.requiresApproval);
        if (!isReviewStage) return false;
        if (['FIRM_PARTNER', 'FIRM_ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(userRole)) {
          return true;
        }
        return j.reviewerUserId === userId || j.partnerUserId === userId;
      });

      return pending.map((j) => ({
        id: j.id,
        title: j.title,
        clientId: j.clientId,
        clientName: j.client?.company?.legalName || 'Client',
        period: j.period,
        stage: j.stage,
        dueDate: j.dueDate,
        reviewStatus: j.reviewStatus,
        preparerUserId: j.preparerUserId,
        reviewerUserId: j.reviewerUserId,
        updatedAt: j.updatedAt,
      }));
    });
  }

  async getJobReviewHistory(tenantId: string, jobId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      return await qr.manager.find(PracticeJobReviewOrmEntity, {
        where: { tenantId, jobId },
        order: { createdAt: 'ASC' },
      });
    });
  }
}
