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
import { InvoiceOrmEntity } from './invoice.orm-entity';
import { PartyOrmEntity } from './party.orm-entity';
import { PaymentLinkProvider, PaymentLinkStatus } from '@platform/shared-types';

@Entity('payment_links')
export class PaymentLinkOrmEntity {
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

  @Index()
  @Column({ name: 'invoice_id', type: 'uuid' })
  invoiceId!: string;

  @ManyToOne(() => InvoiceOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice!: InvoiceOrmEntity;

  @Column({ name: 'party_id', type: 'uuid' })
  partyId!: string;

  @ManyToOne(() => PartyOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'party_id' })
  party!: PartyOrmEntity;

  @Column({ type: 'varchar', length: 32, default: PaymentLinkProvider.RAZORPAY })
  provider!: PaymentLinkProvider;

  @Column({ name: 'link_id', type: 'varchar', length: 128, unique: true })
  linkId!: string;

  @Column({ name: 'short_url', type: 'varchar', length: 512 })
  shortUrl!: string;

  @Column({ type: 'numeric', precision: 20, scale: 4 })
  amount!: string;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency!: string;

  @Index()
  @Column({ type: 'varchar', length: 32, default: PaymentLinkStatus.CREATED })
  status!: PaymentLinkStatus;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt?: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

