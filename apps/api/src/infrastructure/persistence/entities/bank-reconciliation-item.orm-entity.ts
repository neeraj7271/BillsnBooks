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
import { BankTransactionOrmEntity } from './bank-transaction.orm-entity';
import { VoucherOrmEntity } from './voucher.orm-entity';

@Entity('bank_reconciliation_items')
export class BankReconciliationItemOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId!: string;

  @ManyToOne(() => BankTransactionOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction!: BankTransactionOrmEntity;

  @Index()
  @Column({ name: 'voucher_id', type: 'uuid' })
  voucherId!: string;

  @ManyToOne(() => VoucherOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voucher_id' })
  voucher!: VoucherOrmEntity;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'match_type', type: 'varchar', length: 50, default: 'EXACT_1_TO_1' })
  matchType!: string;

  @Column({ name: 'allocated_amount', type: 'numeric', precision: 20, scale: 4 })
  allocatedAmount!: number;

  @Column({ name: 'matched_at', type: 'timestamp with time zone', default: () => 'NOW()' })
  matchedAt!: Date;

  @Column({ name: 'matched_by', type: 'uuid', nullable: true })
  matchedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
