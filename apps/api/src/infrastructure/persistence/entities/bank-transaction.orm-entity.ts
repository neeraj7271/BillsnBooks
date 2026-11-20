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
import { BankStatementOrmEntity } from './bank-statement.orm-entity';
import { BankAccountOrmEntity } from './bank-account.orm-entity';

@Entity('bank_transactions')
export class BankTransactionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'statement_id', type: 'uuid' })
  statementId!: string;

  @ManyToOne(() => BankStatementOrmEntity, (s) => s.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'statement_id' })
  statement!: BankStatementOrmEntity;

  @Index()
  @Column({ name: 'bank_account_id', type: 'uuid' })
  bankAccountId!: string;

  @ManyToOne(() => BankAccountOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bank_account_id' })
  bankAccount!: BankAccountOrmEntity;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'transaction_date', type: 'date' })
  transactionDate!: Date;

  @Column({ name: 'value_date', type: 'date', nullable: true })
  valueDate!: Date | null;

  @Column({ name: 'narration', type: 'text' })
  narration!: string;

  @Column({ name: 'debit_amount', type: 'numeric', precision: 20, scale: 4, default: 0 })
  debitAmount!: number;

  @Column({ name: 'credit_amount', type: 'numeric', precision: 20, scale: 4, default: 0 })
  creditAmount!: number;

  @Column({ name: 'balance_after', type: 'numeric', precision: 20, scale: 4, default: 0 })
  balanceAfter!: number;

  @Column({ name: 'reference_number', type: 'varchar', length: 100, nullable: true })
  referenceNumber!: string | null;

  @Column({ name: 'payment_mode', type: 'varchar', length: 50, default: 'OTHER' })
  paymentMode!: string;

  @Column({ name: 'extracted_party_name', type: 'varchar', length: 255, nullable: true })
  extractedPartyName!: string | null;

  @Index()
  @Column({ name: 'match_status', type: 'varchar', length: 50, default: 'UNMATCHED' })
  matchStatus!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
