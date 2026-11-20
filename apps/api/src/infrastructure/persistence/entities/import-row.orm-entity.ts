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
import { ImportBatchOrmEntity } from './import-batch.orm-entity';
import { VoucherOrmEntity } from './voucher.orm-entity';
import { LedgerOrmEntity } from './ledger.orm-entity';
import { RiskApprovalState, ParsedRowData } from '@platform/shared-types';

@Entity('import_rows')
export class ImportRowOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'batch_id', type: 'uuid' })
  batchId!: string;

  @ManyToOne(() => ImportBatchOrmEntity, (batch) => batch.rows, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batch_id' })
  batch!: ImportBatchOrmEntity;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'row_index', type: 'int' })
  rowIndex!: number;

  @Column({ name: 'raw_data', type: 'jsonb' })
  rawData!: Record<string, any>;

  @Column({ name: 'parsed_data', type: 'jsonb' })
  parsedData!: ParsedRowData;

  @Index()
  @Column({
    name: 'validation_state',
    type: 'varchar',
    length: 50,
    default: RiskApprovalState.YELLOW,
  })
  validationState!: RiskApprovalState;

  @Column({ name: 'error_reasons', type: 'text', array: true, default: '{}' })
  errorReasons!: string[];

  @Index()
  @Column({ name: 'matched_ledger_id', type: 'uuid', nullable: true })
  matchedLedgerId!: string | null;

  @ManyToOne(() => LedgerOrmEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'matched_ledger_id' })
  matchedLedger!: LedgerOrmEntity | null;

  @Index()
  @Column({ name: 'generated_voucher_id', type: 'uuid', nullable: true })
  generatedVoucherId!: string | null;

  @ManyToOne(() => VoucherOrmEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'generated_voucher_id' })
  generatedVoucher!: VoucherOrmEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}

