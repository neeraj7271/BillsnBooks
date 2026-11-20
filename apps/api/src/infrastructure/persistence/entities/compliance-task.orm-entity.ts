import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { TenantOrmEntity } from './tenant.orm-entity';
import { FirmClientOrmEntity } from './firm-client.orm-entity';
import { UserOrmEntity } from './user.orm-entity';
import { TaskCommentOrmEntity } from './task-comment.orm-entity';
import { TaskCategory, TaskStatus, TaskPriority } from '@platform/shared-types';

@Entity('compliance_tasks')
export class ComplianceTaskOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => TenantOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantOrmEntity;

  @Index()
  @Column({ name: 'client_id', type: 'uuid' })
  clientId!: string;

  @ManyToOne(() => FirmClientOrmEntity, (c) => c.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client!: FirmClientOrmEntity;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    default: TaskCategory.GST,
  })
  category!: TaskCategory;

  @Column({ name: 'statutory_period', type: 'varchar', length: 50 })
  statutoryPeriod!: string;

  @Index()
  @Column({ name: 'due_date', type: 'date' })
  dueDate!: string;

  @Index()
  @Column({
    type: 'varchar',
    length: 50,
    default: TaskStatus.NOT_STARTED,
  })
  status!: TaskStatus;

  @Column({
    type: 'varchar',
    length: 20,
    default: TaskPriority.MEDIUM,
  })
  priority!: TaskPriority;

  @Index()
  @Column({ name: 'assigned_to_user_id', type: 'uuid', nullable: true })
  assignedToUserId?: string | null;

  @ManyToOne(() => UserOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to_user_id' })
  assignedToUser?: UserOrmEntity | null;

  @Column({ name: 'reviewed_by_user_id', type: 'uuid', nullable: true })
  reviewedByUserId?: string | null;

  @ManyToOne(() => UserOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by_user_id' })
  reviewedByUser?: UserOrmEntity | null;

  @Column({ name: 'filing_acknowledgment_number', type: 'varchar', length: 100, nullable: true })
  filingAcknowledgmentNumber?: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date | null;

  @OneToMany(() => TaskCommentOrmEntity, (c) => c.task)
  comments!: TaskCommentOrmEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

