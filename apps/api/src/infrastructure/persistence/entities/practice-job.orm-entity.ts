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
import { WorkflowTemplateOrmEntity } from './workflow-template.orm-entity';
import { ServiceStageDef } from './service-type.orm-entity';

export interface JobChecklistItem {
  id: string;
  title: string;
  stage: string;
  completed: boolean;
}

@Entity('practice_jobs')
export class PracticeJobOrmEntity {
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

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId?: string | null;

  @Index()
  @Column({ name: 'service_type_id', type: 'uuid', nullable: true })
  serviceTypeId?: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  stages!: ServiceStageDef[];

  @Column({ name: 'custom_fields', type: 'jsonb', default: () => "'{}'" })
  customFields!: Record<string, any>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  labels!: string[];

  @ManyToOne(() => WorkflowTemplateOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'template_id' })
  template?: WorkflowTemplateOrmEntity | null;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ name: 'job_type', type: 'varchar', length: 80 })
  jobType!: string;

  @Column({ type: 'varchar', length: 40 })
  period!: string;

  @Index()
  @Column({ type: 'varchar', length: 40, default: 'BACKLOG' })
  stage!: string; // BACKLOG | IN_PROGRESS | REVIEW | AWAITING_CLIENT | FILED | DONE

  @Column({ type: 'varchar', length: 20, default: 'MEDIUM' })
  priority!: string;

  @Index()
  @Column({ name: 'due_date', type: 'date' })
  dueDate!: string;

  @Index()
  @Column({ name: 'assigned_to_user_id', type: 'uuid', nullable: true })
  assignedToUserId?: string | null;

  @Column({ name: 'is_recurring', type: 'boolean', default: false })
  isRecurring!: boolean;

  @Column({ name: 'recurrence_frequency', type: 'varchar', length: 30, nullable: true })
  recurrenceFrequency?: string | null;

  @Column({ name: 'next_spawned_job_id', type: 'uuid', nullable: true })
  nextSpawnedJobId?: string | null;

  @Column({ name: 'filing_ack_number', type: 'varchar', length: 120, nullable: true })
  filingAckNumber?: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  checklist!: JobChecklistItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
