import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BankAccountOrmEntity } from './bank-account.orm-entity';
import { BankTransactionOrmEntity } from './bank-transaction.orm-entity';

@Entity('bank_statements')
@Index(['tenantId', 'bankAccountId', 'fileHashSha256'], { unique: true })
export class BankStatementOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'bank_account_id', type: 'uuid' })
  bankAccountId!: string;

  @ManyToOne(() => BankAccountOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bank_account_id' })
  bankAccount!: BankAccountOrmEntity;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'file_hash_sha256', type: 'varchar', length: 64 })
  fileHashSha256!: string;

  @Column({ name: 'period_start', type: 'date', nullable: true })
  periodStart!: Date | null;

  @Column({ name: 'period_end', type: 'date', nullable: true })
  periodEnd!: Date | null;

  @Column({ name: 'opening_balance', type: 'numeric', precision: 20, scale: 4, default: 0 })
  openingBalance!: number;

  @Column({ name: 'closing_balance', type: 'numeric', precision: 20, scale: 4, default: 0 })
  closingBalance!: number;

  @Column({ name: 'total_transactions', type: 'int', default: 0 })
  totalTransactions!: number;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'PARSED' })
  status!: string;

  @OneToMany(() => BankTransactionOrmEntity, (txn) => txn.statement)
  transactions!: BankTransactionOrmEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
