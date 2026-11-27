import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { FirmClientOrmEntity } from './firm-client.orm-entity';

@Entity('practice_proposals')
export class PracticeProposalOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'client_id', type: 'uuid', nullable: true })
  clientId?: string | null;

  @ManyToOne(() => FirmClientOrmEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'client_id' })
  client?: FirmClientOrmEntity | null;

  @Column({ name: 'prospect_name', type: 'varchar', length: 255, nullable: true })
  prospectName?: string | null;

  @Column({ name: 'prospect_email', type: 'varchar', length: 255, nullable: true })
  prospectEmail?: string | null;

  @Column({ type: 'varchar', length: 30, default: 'DRAFT' })
  status!: 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

  @Column({ name: 'valid_until', type: 'date' })
  validUntil!: string;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt?: Date | null;

  @Column({ name: 'total_value', type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalValue!: number;

  @Column({ name: 'gst_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  gstAmount!: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'pdf_file_id', type: 'uuid', nullable: true })
  pdfFileId?: string | null;

  @OneToMany(() => PracticeProposalLineOrmEntity, (line) => line.proposal, { cascade: true })
  lines!: PracticeProposalLineOrmEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('practice_proposal_lines')
export class PracticeProposalLineOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'proposal_id', type: 'uuid' })
  proposalId!: string;

  @ManyToOne(() => PracticeProposalOrmEntity, (p) => p.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'proposal_id' })
  proposal!: PracticeProposalOrmEntity;

  @Column({ name: 'service_type_id', type: 'uuid', nullable: true })
  serviceTypeId?: string | null;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({ name: 'fee_type', type: 'varchar', length: 20, default: 'RECURRING' })
  feeType!: 'FIXED' | 'RECURRING' | 'HOURLY';

  @Column({ name: 'fee_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  feeAmount!: number;

  @Column({ name: 'recurrence_frequency', type: 'varchar', length: 30, nullable: true })
  recurrenceFrequency?: string | null;

  @Column({ name: 'estimated_hours', type: 'numeric', precision: 6, scale: 2, default: 0 })
  estimatedHours!: number;

  @Column({ name: 'hourly_rate', type: 'numeric', precision: 12, scale: 2, default: 0 })
  hourlyRate!: number;

  @Column({ name: 'gst_rate', type: 'numeric', precision: 5, scale: 2, default: 18 })
  gstRate!: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;
}
