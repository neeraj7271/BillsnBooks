import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FirmClientOrmEntity } from './firm-client.orm-entity';

@Entity('practice_notices')
export class PracticeNoticeOrmEntity {
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
  @Column({ type: 'varchar', length: 30, default: 'GST' })
  authority!: 'INCOME_TAX' | 'GST' | 'ROC' | 'PAN' | 'TAN' | 'TDS' | 'OTHER';

  @Column({ name: 'notice_type', type: 'varchar', length: 120 })
  noticeType!: string;

  @Column({ name: 'notice_no', type: 'varchar', length: 120 })
  noticeNo!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  section?: string | null;

  @Column({ name: 'received_date', type: 'date' })
  receivedDate!: string;

  @Index()
  @Column({ name: 'response_due_date', type: 'date' })
  responseDueDate!: string;

  @Index()
  @Column({ type: 'varchar', length: 30, default: 'NEW' })
  status!: 'NEW' | 'IN_PROGRESS' | 'RESPONDED' | 'CLOSED' | 'ESCALATED';

  @Column({ name: 'assigned_staff_id', type: 'uuid', nullable: true })
  assignedStaffId?: string | null;

  @Column({ name: 'amount_involved', type: 'numeric', precision: 14, scale: 2, nullable: true })
  amountInvolved?: number | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  documents!: string[];

  @Column({ name: 'response_notes', type: 'text', nullable: true })
  responseNotes?: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
