import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export interface PermissionMatrix {
  manageTeam: boolean;
  manageServices: boolean;
  viewBilling: boolean;
  approveSignoff: boolean;
  manageClients: boolean;
  fileReturns: boolean;
  manageSettings: boolean;
  restrictedClientAccess: boolean;
}

@Entity('team_invitations')
export class TeamInvitationOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 180, nullable: true })
  name?: string | null;

  @Column({ name: 'invited_role', type: 'varchar', length: 60, default: 'STAFF_ACCOUNTANT' })
  invitedRole!: string;

  @Column({ name: 'permission_role_id', type: 'uuid', nullable: true })
  permissionRoleId?: string | null;

  @Column({ name: 'invited_by_user_id', type: 'uuid' })
  invitedByUserId!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120 })
  token!: string;

  @Column({ type: 'varchar', length: 30, default: 'PENDING' })
  status!: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

@Entity('permission_roles')
export class PermissionRoleOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Index()
  @Column({ type: 'varchar', length: 60 })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  permissions!: PermissionMatrix;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('job_roles')
export class JobRoleOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 60 })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 10 })
  sortOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

@Entity('client_job_role_assignments')
export class ClientJobRoleAssignmentOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'client_id', type: 'uuid' })
  clientId!: string;

  @Column({ name: 'job_role_id', type: 'uuid' })
  jobRoleId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

@Entity('client_team_members')
export class ClientTeamMemberOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'client_id', type: 'uuid' })
  clientId!: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'job_role_id', type: 'uuid', nullable: true })
  jobRoleId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

@Entity('practice_job_reviews')
export class PracticeJobReviewOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'job_id', type: 'uuid' })
  jobId!: string;

  @Column({ type: 'varchar', length: 60 })
  stage!: string;

  @Column({ type: 'varchar', length: 40 })
  action!: 'SUBMIT_FOR_REVIEW' | 'APPROVE' | 'RETURN_FOR_REWORK' | 'SIGN_OFF' | 'SELF_SIGN_OFF';

  @Column({ name: 'actor_user_id', type: 'uuid' })
  actorUserId!: string;

  @Column({ name: 'actor_name', type: 'varchar', length: 180 })
  actorName!: string;

  @Column({ name: 'actor_role', type: 'varchar', length: 80 })
  actorRole!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'deliverable_hash', type: 'varchar', length: 64, nullable: true })
  deliverableHash?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
