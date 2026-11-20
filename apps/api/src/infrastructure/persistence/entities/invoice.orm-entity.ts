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
import { CompanyOrmEntity } from './company.orm-entity';
import { BranchOrmEntity } from './branch.orm-entity';
import { FinancialYearOrmEntity } from './financial-year.orm-entity';
import { PartyOrmEntity } from './party.orm-entity';
import { VoucherOrmEntity } from './voucher.orm-entity';
import { UserOrmEntity } from './user.orm-entity';
import { InvoiceItemOrmEntity } from './invoice-item.orm-entity';
import { InvoiceStatus, DocumentType, TaxClassification, ApprovalStatus, SupplyType } from '@platform/shared-types';
import { DecimalTransformer } from '../transformers/decimal.transformer';
import { Decimal } from 'decimal.js';

@Entity('invoices')
export class InvoiceOrmEntity {
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

  @Index()
  @Column({ name: 'party_id', type: 'uuid' })
  partyId!: string;

  @ManyToOne(() => PartyOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'party_id' })
  party!: PartyOrmEntity;

  @Index()
  @Column({ name: 'invoice_number', type: 'varchar', length: 100 })
  invoiceNumber!: string;

  @Column({ name: 'invoice_date', type: 'date' })
  invoiceDate!: string;

  @Column({ name: 'due_date', type: 'date' })
  dueDate!: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: InvoiceStatus.DRAFT,
  })
  status!: InvoiceStatus;

  @Index()
  @Column({
    name: 'document_type',
    type: 'varchar',
    length: 50,
    default: DocumentType.TAX_INVOICE,
  })
  documentType!: DocumentType;

  @Column({
    name: 'is_rcm',
    type: 'boolean',
    default: false,
  })
  isRcm!: boolean;

  @Column({
    name: 'tax_classification',
    type: 'varchar',
    length: 50,
    default: TaxClassification.TAXABLE,
  })
  taxClassification!: TaxClassification;

  @Column({ name: 'promise_to_pay_date', type: 'date', nullable: true })
  promiseToPayDate?: string;

  @Column({ name: 'promise_to_pay_notes', type: 'text', nullable: true })
  promiseToPayNotes?: string;

  @Column({
    name: 'supply_type',
    type: 'varchar',
    length: 50,
    default: SupplyType.INTRA_STATE,
  })
  supplyType!: SupplyType;

  @Column({ name: 'place_of_supply_state_code', type: 'varchar', length: 2 })
  placeOfSupplyStateCode!: string;

  @Column({
    name: 'subtotal_amount',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: '0',
    transformer: new DecimalTransformer(),
  })
  subtotalAmount!: Decimal;

  @Column({
    name: 'cgst_amount',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: '0',
    transformer: new DecimalTransformer(),
  })
  cgstAmount!: Decimal;

  @Column({
    name: 'sgst_amount',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: '0',
    transformer: new DecimalTransformer(),
  })
  sgstAmount!: Decimal;

  @Column({
    name: 'igst_amount',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: '0',
    transformer: new DecimalTransformer(),
  })
  igstAmount!: Decimal;

  @Column({
    name: 'cess_amount',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: '0',
    transformer: new DecimalTransformer(),
  })
  cessAmount!: Decimal;

  @Column({
    name: 'round_off_amount',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: '0',
    transformer: new DecimalTransformer(),
  })
  roundOffAmount!: Decimal;

  @Column({
    name: 'total_amount',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: '0',
    transformer: new DecimalTransformer(),
  })
  totalAmount!: Decimal;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'terms_and_conditions', type: 'text', nullable: true })
  termsAndConditions?: string;

  @Column({ name: 'voucher_id', type: 'uuid', nullable: true })
  voucherId?: string;

  @ManyToOne(() => VoucherOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'voucher_id' })
  voucher?: VoucherOrmEntity;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 255, nullable: true })
  idempotencyKey?: string;

  @Column({
    name: 'approval_status',
    type: 'varchar',
    length: 50,
    default: ApprovalStatus.NONE,
  })
  approvalStatus!: ApprovalStatus;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy?: string;

  @ManyToOne(() => UserOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by' })
  approver?: UserOrmEntity;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ name: 'party_name_snapshot', type: 'varchar', length: 255, nullable: true })
  partyNameSnapshot?: string;

  @Column({ name: 'party_trade_name_snapshot', type: 'varchar', length: 255, nullable: true })
  partyTradeNameSnapshot?: string;

  @Column({ name: 'party_registration_type_snapshot', type: 'varchar', length: 50, nullable: true })
  partyRegistrationTypeSnapshot?: string;

  @Column({ name: 'party_gstin_snapshot', type: 'varchar', length: 15, nullable: true })
  partyGstinSnapshot?: string;

  @Column({ name: 'party_pan_snapshot', type: 'varchar', length: 10, nullable: true })
  partyPanSnapshot?: string;

  @Column({ name: 'billing_address_snapshot', type: 'jsonb', nullable: true })
  billingAddressSnapshot?: Record<string, any>;

  @Column({ name: 'shipping_address_snapshot', type: 'jsonb', nullable: true })
  shippingAddressSnapshot?: Record<string, any>;

  @Column({ name: 'tax_rule_version_snapshot', type: 'varchar', length: 50, nullable: true })
  taxRuleVersionSnapshot?: string;

  @Column({ name: 'tax_rate_sources_snapshot', type: 'jsonb', nullable: true })
  taxRateSourcesSnapshot?: Record<string, any>;

  @OneToMany(() => InvoiceItemOrmEntity, (item) => item.invoice, { cascade: true })
  items!: InvoiceItemOrmEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

