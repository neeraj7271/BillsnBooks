import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { VoucherOrmEntity } from './voucher.orm-entity';
import { LedgerOrmEntity } from './ledger.orm-entity';
import { EntryType } from '@platform/shared-types';
import { DecimalTransformer } from '../transformers/decimal.transformer';
import { Decimal } from 'decimal.js';

@Entity('journal_entries')
export class JournalEntryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'voucher_id', type: 'uuid' })
  voucherId!: string;

  @ManyToOne(() => VoucherOrmEntity, (voucher) => voucher.entries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voucher_id' })
  voucher!: VoucherOrmEntity;

  @Index()
  @Column({ name: 'ledger_id', type: 'uuid' })
  ledgerId!: string;

  @ManyToOne(() => LedgerOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ledger_id' })
  ledger!: LedgerOrmEntity;

  @Column({
    name: 'entry_type',
    type: 'varchar',
    length: 10,
  })
  entryType!: EntryType;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 4,
    transformer: new DecimalTransformer(),
  })
  amount!: Decimal;

  @Column({
    name: 'foreign_amount',
    type: 'numeric',
    precision: 20,
    scale: 4,
    nullable: true,
    transformer: new DecimalTransformer(),
  })
  foreignAmount?: Decimal | null;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency!: string;

  @Column({ type: 'text', nullable: true })
  narration?: string | null;

  @Column({ name: 'line_index', type: 'int' })
  lineIndex!: number;
}

