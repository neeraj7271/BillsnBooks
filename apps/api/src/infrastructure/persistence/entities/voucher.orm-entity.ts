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
  VersionColumn,
} from 'typeorm';
import { CompanyOrmEntity } from './company.orm-entity';
import { BranchOrmEntity } from './branch.orm-entity';
import { FinancialYearOrmEntity } from './financial-year.orm-entity';
import { JournalEntryOrmEntity } from './journal-entry.orm-entity';
import { VoucherType, VoucherStatus } from '@platform/shared-types';
import { DecimalTransformer } from '../transformers/decimal.transformer';
import { Decimal } from 'decimal.js';

@Entity('vouchers')
export class VoucherOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => CompanyOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: CompanyOrmEntity;

  @Index()
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => BranchOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branch_id' })
  branch!: BranchOrmEntity;

  @Index()
  @Column({ name: 'financial_year_id', type: 'uuid' })
  financialYearId!: string;

  @ManyToOne(() => FinancialYearOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'financial_year_id' })
  financialYear!: FinancialYearOrmEntity;

  @Column({
    name: 'voucher_type',
    type: 'varchar',
    length: 50,
  })
  voucherType!: VoucherType;

  @Column({ name: 'voucher_number', type: 'varchar', length: 100 })
  voucherNumber!: string;

  @Column({ name: 'voucher_date', type: 'date' })
  voucherDate!: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: VoucherStatus.DRAFT,
  })
  status!: VoucherStatus;

  @Column({
    name: 'total_amount',
    type: 'numeric',
    precision: 20,
    scale: 4,
    default: '0.0000',
    transformer: new DecimalTransformer(),
  })
  totalAmount!: Decimal;

  @Index()
  @Column({ name: 'idempotency_key', type: 'varchar', length: 255, nullable: true })
  idempotencyKey?: string | null;

  @Column({ name: 'reversal_of_id', type: 'uuid', nullable: true })
  reversalOfId?: string | null;

  @Column({ type: 'text', nullable: true })
  narration?: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @VersionColumn()
  version!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => JournalEntryOrmEntity, (entry) => entry.voucher, { cascade: true })
  entries!: JournalEntryOrmEntity[];
}

