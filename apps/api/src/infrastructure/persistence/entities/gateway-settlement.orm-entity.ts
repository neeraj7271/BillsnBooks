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
import { TenantOrmEntity } from './tenant.orm-entity';
import { CompanyOrmEntity } from './company.orm-entity';
import { VoucherOrmEntity } from './voucher.orm-entity';
import { PaymentLinkProvider, GatewaySettlementStatus } from '@platform/shared-types';

@Entity('gateway_settlements')
export class GatewaySettlementOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => TenantOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantOrmEntity;

  @Index()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => CompanyOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company!: CompanyOrmEntity;

  @Column({ name: 'settlement_id', type: 'varchar', length: 128, unique: true })
  settlementId!: string;

  @Column({ type: 'varchar', length: 32, default: PaymentLinkProvider.RAZORPAY })
  provider!: PaymentLinkProvider;

  @Column({ name: 'settlement_date', type: 'date' })
  settlementDate!: string;

  @Column({ name: 'gross_amount', type: 'numeric', precision: 20, scale: 4 })
  grossAmount!: string;

  @Column({ name: 'fee_amount', type: 'numeric', precision: 20, scale: 4 })
  feeAmount!: string;

  @Column({ name: 'tax_on_fee', type: 'numeric', precision: 20, scale: 4 })
  taxOnFee!: string;

  @Column({ name: 'net_credit_amount', type: 'numeric', precision: 20, scale: 4 })
  netCreditAmount!: string;

  @Column({ name: 'bank_reference', type: 'varchar', length: 128, nullable: true })
  bankReference?: string | null;

  @Column({ name: 'voucher_id', type: 'uuid', nullable: true })
  voucherId?: string | null;

  @ManyToOne(() => VoucherOrmEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'voucher_id' })
  voucher?: VoucherOrmEntity | null;

  @Column({ type: 'varchar', length: 32, default: GatewaySettlementStatus.RECONCILED })
  status!: GatewaySettlementStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

