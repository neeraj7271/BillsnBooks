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
import { FirmClientOrmEntity } from './firm-client.orm-entity';
import { ServiceTypeOrmEntity, ServiceStageDef, DueDateRuleDef } from './service-type.orm-entity';

@Entity('client_services')
export class ClientServiceOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'client_id', type: 'uuid' })
  clientId!: string;

  @ManyToOne(() => FirmClientOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client!: FirmClientOrmEntity;

  @Index()
  @Column({ name: 'service_type_id', type: 'uuid' })
  serviceTypeId!: string;

  @ManyToOne(() => ServiceTypeOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_type_id' })
  serviceType!: ServiceTypeOrmEntity;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string | null;

  @Column({ name: 'fee_amount', type: 'numeric', precision: 14, scale: 2, nullable: true })
  feeAmount?: number | null;

  @Column({ name: 'fee_type', type: 'varchar', length: 30, default: 'recurring' })
  feeType!: string; // fixed | recurring | hourly

  @Column({ name: 'assigned_staff_id', type: 'uuid', nullable: true })
  assignedStaffId?: string | null;

  @Column({ name: 'custom_stages', type: 'jsonb', nullable: true })
  customStages?: ServiceStageDef[] | null;

  @Column({ name: 'custom_due_rule', type: 'jsonb', nullable: true })
  customDueRule?: DueDateRuleDef | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
