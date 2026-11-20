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
import { LedgerOrmEntity } from './ledger.orm-entity';
import { PartyRegistrationOrmEntity } from './party-registration.orm-entity';
import { PartyAddressOrmEntity } from './party-address.orm-entity';
import { PartyLedgerLinkOrmEntity } from './party-ledger-link.orm-entity';
import { PartyType, PartyRegistrationType } from '@platform/shared-types';
import { DecimalTransformer } from '../transformers/decimal.transformer';
import { Decimal } from 'decimal.js';

@Entity('parties')
export class PartyOrmEntity {
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

  @Column({ name: 'party_code', type: 'varchar', length: 50, nullable: true })
  partyCode?: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'trade_name', type: 'varchar', length: 255, nullable: true })
  tradeName?: string;

  @Column({
    name: 'party_type',
    type: 'varchar',
    length: 50,
    default: PartyType.CUSTOMER,
  })
  partyType!: PartyType;

  @Column({
    name: 'registration_type',
    type: 'varchar',
    length: 50,
    default: PartyRegistrationType.REGULAR,
  })
  registrationType!: PartyRegistrationType;

  @Column({ type: 'varchar', length: 15, nullable: true })
  gstin?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  pan?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency!: string;

  @Column({ name: 'billing_address_line1', type: 'varchar', length: 255, nullable: true })
  billingAddressLine1?: string;

  @Column({ name: 'billing_address_line2', type: 'varchar', length: 255, nullable: true })
  billingAddressLine2?: string;

  @Column({ name: 'billing_city', type: 'varchar', length: 100, nullable: true })
  billingCity?: string;

  @Column({ name: 'billing_state', type: 'varchar', length: 100, nullable: true })
  billingState?: string;

  @Column({ name: 'billing_state_code', type: 'varchar', length: 2, default: '27' })
  billingStateCode!: string;

  @Column({ name: 'billing_pincode', type: 'varchar', length: 10, nullable: true })
  billingPincode?: string;

  @Column({ name: 'shipping_address_line1', type: 'varchar', length: 255, nullable: true })
  shippingAddressLine1?: string;

  @Column({ name: 'shipping_city', type: 'varchar', length: 100, nullable: true })
  shippingCity?: string;

  @Column({ name: 'shipping_state_code', type: 'varchar', length: 2, nullable: true })
  shippingStateCode?: string;

  @Column({ name: 'shipping_pincode', type: 'varchar', length: 10, nullable: true })
  shippingPincode?: string;

  @Column({
    name: 'credit_limit',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: '0',
    transformer: new DecimalTransformer(),
  })
  creditLimit!: Decimal;

  @Column({ name: 'payment_terms_days', type: 'int', default: 30 })
  paymentTermsDays!: number;

  @Column({ name: 'ledger_id', type: 'uuid', nullable: true })
  ledgerId?: string;

  @ManyToOne(() => LedgerOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ledger_id' })
  ledger?: LedgerOrmEntity;

  @OneToMany(() => PartyRegistrationOrmEntity, (r) => r.party)
  registrations?: PartyRegistrationOrmEntity[];

  @OneToMany(() => PartyAddressOrmEntity, (a) => a.party)
  addresses?: PartyAddressOrmEntity[];

  @OneToMany(() => PartyLedgerLinkOrmEntity, (l) => l.party)
  ledgerLinks?: PartyLedgerLinkOrmEntity[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
