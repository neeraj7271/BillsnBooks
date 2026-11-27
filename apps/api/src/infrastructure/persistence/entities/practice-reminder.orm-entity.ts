import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('practice_reminder_templates')
export class PracticeReminderTemplateOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 40 })
  eventType!: 'DUE_DATE' | 'DOC_REQUEST' | 'INVOICE_DELIVERY' | 'ENGAGEMENT_SIGN' | 'NOTICE_RESPONSE';

  @Column({ type: 'varchar', length: 20, default: 'EMAIL' })
  channel!: 'EMAIL' | 'WHATSAPP' | 'IN_APP';

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  subject!: string;

  @Column({ name: 'body_template', type: 'text' })
  bodyTemplate!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('practice_notification_rules')
export class PracticeNotificationRuleOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 40 })
  eventType!: 'DUE_DATE' | 'DOC_REQUEST' | 'INVOICE_DELIVERY' | 'ENGAGEMENT_SIGN' | 'NOTICE_RESPONSE';

  @Column({ name: 'days_before', type: 'int', default: 3 })
  daysBefore!: number;

  @Column({ type: 'jsonb', default: () => "'[\"ASSIGNEE\",\"CLIENT\"]'" })
  recipients!: string[];

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'last_run_at', type: 'timestamptz', nullable: true })
  lastRunAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
