import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

import { ServiceStageDef } from './service-type.orm-entity';

export interface WorkflowChecklistTemplateItem {
  id: string;
  title: string;
  stage: string;
}

@Entity('workflow_templates')
export class WorkflowTemplateOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'service_type_id', type: 'uuid', nullable: true })
  serviceTypeId?: string | null;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'stage_configs', type: 'jsonb', default: () => "'[]'" })
  stageConfigs!: ServiceStageDef[];

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'job_type', type: 'varchar', length: 80 })
  jobType!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'is_recurring', type: 'boolean', default: false })
  isRecurring!: boolean;

  @Column({ name: 'recurrence_frequency', type: 'varchar', length: 30, nullable: true })
  recurrenceFrequency?: string | null; // MONTHLY | QUARTERLY | ANNUAL

  @Column({ name: 'default_due_day', type: 'int', default: 20 })
  defaultDueDay!: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  stages!: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  checklist!: WorkflowChecklistTemplateItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
