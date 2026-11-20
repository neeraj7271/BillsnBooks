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
import { CompanyOrmEntity } from './company.orm-entity';
import { BranchOrmEntity } from './branch.orm-entity';
import { LedgerOrmEntity } from './ledger.orm-entity';
import { EncryptionTransformer } from '../transformers/encryption.transformer';

@Entity('bank_accounts')
export class BankAccountOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => CompanyOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company!: CompanyOrmEntity;

  @Index()
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  @ManyToOne(() => BranchOrmEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch!: BranchOrmEntity | null;

  @Column({ name: 'bank_name', type: 'varchar', length: 100 })
  bankName!: string;

  @Column({
    name: 'account_number_encrypted',
    type: 'text',
    transformer: new EncryptionTransformer(),
  })
  accountNumberEncrypted!: string;

  @Column({ name: 'ifsc_code', type: 'varchar', length: 11 })
  ifscCode!: string;

  @Column({ name: 'account_type', type: 'varchar', length: 50, default: 'CURRENT' })
  accountType!: string;

  @Index()
  @Column({ name: 'ledger_id', type: 'uuid', nullable: true })
  ledgerId!: string | null;

  @ManyToOne(() => LedgerOrmEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'ledger_id' })
  ledger!: LedgerOrmEntity | null;

  @Column({ name: 'opening_balance', type: 'numeric', precision: 20, scale: 4, default: 0 })
  openingBalance!: number;

  @Column({ name: 'current_balance', type: 'numeric', precision: 20, scale: 4, default: 0 })
  currentBalance!: number;

  @Column({ name: 'currency', type: 'varchar', length: 3, default: 'INR' })
  currency!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
