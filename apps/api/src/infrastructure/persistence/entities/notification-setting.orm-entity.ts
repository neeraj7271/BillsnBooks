import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('notification_settings')
@Unique('uq_company_event', ['companyId', 'eventType'])
export class NotificationSettingOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 64 })
  eventType!: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled!: boolean;

  @Column({ name: 'trigger_type', type: 'varchar', length: 32, default: 'OFFSET_SCHEDULED' })
  triggerType!: string;

  @Column({ name: 'offsets_days', type: 'int', array: true, default: () => "ARRAY[7, 3, 1]" })
  offsetsDays!: number[];

  @Column({ name: 'dispatch_time', type: 'time', default: '09:30:00' })
  dispatchTime!: string;

  @Column({ name: 'timezone', type: 'varchar', length: 64, default: 'Asia/Kolkata' })
  timezone!: string;

  @Column({ name: 'enable_in_app', type: 'boolean', default: true })
  enableInApp!: boolean;

  @Column({ name: 'enable_email', type: 'boolean', default: true })
  enableEmail!: boolean;

  @Column({ name: 'enable_whatsapp', type: 'boolean', default: false })
  enableWhatsapp!: boolean;

  @Column({ name: 'enable_sms', type: 'boolean', default: false })
  enableSms!: boolean;

  @Column({ name: 'include_payment_link', type: 'boolean', default: true })
  includePaymentLink!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
