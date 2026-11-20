import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TenantOrmEntity } from './tenant.orm-entity';
import { ComplianceTaskOrmEntity } from './compliance-task.orm-entity';
import { UserOrmEntity } from './user.orm-entity';

@Entity('task_comments')
export class TaskCommentOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => TenantOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantOrmEntity;

  @Index()
  @Column({ name: 'task_id', type: 'uuid' })
  taskId!: string;

  @ManyToOne(() => ComplianceTaskOrmEntity, (t) => t.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task!: ComplianceTaskOrmEntity;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserOrmEntity;

  @Column({ type: 'text' })
  comment!: string;

  @Column({ name: 'is_internal_only', type: 'boolean', default: false })
  isInternalOnly!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

