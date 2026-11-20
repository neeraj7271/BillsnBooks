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
import { CompanyOrmEntity } from './company.orm-entity';
import { UserOrmEntity } from './user.orm-entity';
import { ApprovalStatus, ApprovalRequestType } from '@platform/shared-types';

@Entity('approval_requests')
export class ApprovalRequestOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => CompanyOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: CompanyOrmEntity;

  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType!: 'INVOICE' | 'VOUCHER' | 'BANK_TRANSACTION';

  @Index()
  @Column({ name: 'entity_id', type: 'uuid' })
  entityId!: string;

  @Column({
    name: 'request_type',
    type: 'varchar',
    length: 50,
    default: ApprovalRequestType.HIGH_VALUE_INVOICE,
  })
  requestType!: ApprovalRequestType;

  @Index()
  @Column({ name: 'requested_by', type: 'uuid' })
  requestedBy!: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requested_by' })
  requester!: UserOrmEntity;

  @Column({
    type: 'varchar',
    length: 50,
    default: ApprovalStatus.PENDING,
  })
  status!: ApprovalStatus;

  @Column({ name: 'approver_id', type: 'uuid', nullable: true })
  approverId?: string;

  @ManyToOne(() => UserOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approver_id' })
  approver?: UserOrmEntity;

  @Column({ name: 'action_timestamp', type: 'timestamptz', nullable: true })
  actionTimestamp?: Date;

  @Column({ type: 'text', nullable: true })
  comments?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

