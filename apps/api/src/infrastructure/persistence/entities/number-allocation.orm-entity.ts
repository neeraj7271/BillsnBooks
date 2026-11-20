import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NumberAllocationStatus } from '@platform/shared-types';
import { NumberingSeriesOrmEntity } from './numbering-series.orm-entity';

@Entity('number_allocations')
@Index('idx_allocations_series_seq', ['seriesId', 'seqNumber'], { unique: true })
@Index('idx_allocations_doc_unique', ['companyId', 'docType', 'allocatedNumber'], { unique: true })
export class NumberAllocationOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'series_id', type: 'uuid' })
  seriesId!: string;

  @ManyToOne(() => NumberingSeriesOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'series_id' })
  series?: NumberingSeriesOrmEntity;

  @Index()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Index()
  @Column({ name: 'doc_type', type: 'varchar', length: 32 })
  docType!: string;

  @Index()
  @Column({ name: 'document_id', type: 'uuid' })
  documentId!: string;

  @Column({ name: 'allocated_number', type: 'varchar', length: 64 })
  allocatedNumber!: string;

  @Column({ name: 'seq_number', type: 'integer' })
  seqNumber!: number;

  @Column({ name: 'status', type: 'varchar', length: 16, default: 'ISSUED' })
  status!: NumberAllocationStatus;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason!: string | null;

  @CreateDateColumn({ name: 'allocated_at', type: 'timestamptz' })
  allocatedAt!: Date;

  @Column({ name: 'allocated_by', type: 'uuid' })
  allocatedBy!: string;
}

