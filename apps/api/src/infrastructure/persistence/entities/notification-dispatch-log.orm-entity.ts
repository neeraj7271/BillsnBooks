import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('notification_dispatch_logs')
@Index('idx_dispatch_dedupe', ['entityId', 'eventType', 'offsetDayTriggered', 'channel'])
export class NotificationDispatchLogOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 64 })
  eventType!: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 32 })
  entityType!: string;

  @Index()
  @Column({ name: 'entity_id', type: 'uuid' })
  entityId!: string;

  @Column({ name: 'recipient_type', type: 'varchar', length: 32 })
  recipientType!: string;

  @Column({ name: 'recipient_address', type: 'varchar', length: 255 })
  recipientAddress!: string;

  @Column({ type: 'varchar', length: 32 })
  channel!: string;

  @Column({ name: 'offset_day_triggered', type: 'int' })
  offsetDayTriggered!: number;

  @Column({ type: 'varchar', length: 32, default: 'SENT' })
  status!: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn({ name: 'dispatched_at', type: 'timestamptz' })
  dispatchedAt!: Date;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt?: Date;
}
