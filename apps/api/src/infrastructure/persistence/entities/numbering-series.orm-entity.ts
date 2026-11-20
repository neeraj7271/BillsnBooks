import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ResetFrequency } from '@platform/shared-types';

@Entity('numbering_series')
@Index('idx_numbering_series_unique', ['companyId', 'docType', 'seriesCode'], { unique: true })
export class NumberingSeriesOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Index()
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  @Index()
  @Column({ name: 'doc_type', type: 'varchar', length: 32 })
  docType!: string;

  @Column({ name: 'series_code', type: 'varchar', length: 32 })
  seriesCode!: string;

  @Column({ name: 'format_pattern', type: 'varchar', length: 128 })
  formatPattern!: string;

  @Column({ name: 'seq_padding', type: 'integer', default: 5 })
  seqPadding!: number;

  @Column({ name: 'start_seq', type: 'integer', default: 1 })
  startSeq!: number;

  @Column({ name: 'current_seq', type: 'integer', default: 0 })
  currentSeq!: number;

  @Column({ name: 'reset_frequency', type: 'varchar', length: 16, default: 'YEARLY' })
  resetFrequency!: ResetFrequency;

  @Column({ name: 'is_manual', type: 'boolean', default: false })
  isManual!: boolean;

  @Column({ name: 'is_locked', type: 'boolean', default: false })
  isLocked!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

