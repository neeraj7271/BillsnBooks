import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TenantOrmEntity } from './tenant.orm-entity';
import { UserRole } from '@platform/shared-types';
import { EncryptionTransformer } from '../transformers/encryption.transformer';

@Entity('users')
export class UserOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => TenantOrmEntity, (tenant) => tenant.users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantOrmEntity;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName!: string;

  @Column({
    name: 'phone_encrypted',
    type: 'text',
    nullable: true,
    transformer: new EncryptionTransformer(),
  })
  phoneEncrypted?: string | null;

  @Column({
    name: 'role',
    type: 'varchar',
    length: 50,
    default: UserRole.STAFF_ACCOUNTANT,
  })
  role!: UserRole;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'weekly_capacity_hours', type: 'int', default: 40 })
  weeklyCapacityHours!: number;

  @Column({ name: 'hourly_cost_rate', type: 'numeric', precision: 10, scale: 2, default: 500 })
  hourlyCostRate!: number;

  @Column({ name: 'user_kind', type: 'varchar', length: 30, default: 'FIRM_COLLEAGUE' })
  userKind!: 'FIRM_COLLEAGUE' | 'CLIENT_USER';

  @Column({ name: 'client_id', type: 'uuid', nullable: true })
  clientId?: string | null;

  @Column({ name: 'permission_role_id', type: 'uuid', nullable: true })
  permissionRoleId?: string | null;

  @Column({ name: 'job_role_ids', type: 'jsonb', default: () => "'[]'" })
  jobRoleIds!: string[];

  @Column({ name: 'last_active_at', type: 'timestamptz', nullable: true })
  lastActiveAt?: Date | null;

  @Column({
    name: 'refresh_token_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  refreshTokenHash?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

