import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export interface ServiceStageDef {
  key: string;
  label: string;
  order: number;
  assigneeRole?: string;
  slaOffsetDays?: number;
  requiresApproval?: boolean;
}

export interface ServiceChecklistDef {
  id: string;
  title: string;
  stage: string;
}

export interface DueDateRuleDef {
  basis: 'period_end' | 'period_start' | 'fixed_date';
  offsetDays?: number;
  fixedMonth?: number;
  fixedDay?: number;
}

@Entity('service_types')
export class ServiceTypeOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Index()
  @Column({ type: 'varchar', length: 60 })
  code!: string;

  @Index()
  @Column({ type: 'varchar', length: 80, default: 'General' })
  category!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 30, default: 'MONTHLY' })
  frequency!: string; // ONE_TIME | WEEKLY | MONTHLY | QUARTERLY | HALF_YEARLY | ANNUAL | CUSTOM

  @Column({ name: 'custom_recurrence_rule', type: 'varchar', length: 255, nullable: true })
  customRecurrenceRule?: string | null;

  @Column({ name: 'default_due_date_rule', type: 'jsonb', default: () => "'{\"basis\":\"period_end\",\"offsetDays\":20}'" })
  defaultDueDateRule!: DueDateRuleDef;

  @Column({ name: 'default_stages', type: 'jsonb', default: () => "'[]'" })
  defaultStages!: ServiceStageDef[];

  @Column({ name: 'default_checklist', type: 'jsonb', default: () => "'[]'" })
  defaultChecklist!: ServiceChecklistDef[];

  @Column({ name: 'default_assignee_role', type: 'varchar', length: 60, nullable: true })
  defaultAssigneeRole?: string | null;

  @Column({ name: 'default_priority', type: 'varchar', length: 20, default: 'MEDIUM' })
  defaultPriority!: string;

  @Column({ name: 'estimated_hours', type: 'numeric', precision: 6, scale: 2, default: 2 })
  estimatedHours!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'is_system_seeded', type: 'boolean', default: false })
  isSystemSeeded!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 100 })
  sortOrder!: number;

  @Column({ name: 'statutory_form_ref', type: 'varchar', length: 80, nullable: true })
  statutoryFormRef?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
