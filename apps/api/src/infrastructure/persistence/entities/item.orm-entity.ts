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
import { LedgerOrmEntity } from './ledger.orm-entity';
import { ItemType } from '@platform/shared-types';
import { DecimalTransformer } from '../transformers/decimal.transformer';
import { Decimal } from 'decimal.js';

@Entity('items')
export class ItemOrmEntity {
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
  @Column({ name: 'item_code', type: 'varchar', length: 100 })
  itemCode!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'hsn_sac_code', type: 'varchar', length: 20 })
  hsnSacCode!: string;

  @Column({
    name: 'item_type',
    type: 'varchar',
    length: 50,
    default: ItemType.GOODS,
  })
  itemType!: ItemType;

  @Column({ type: 'varchar', length: 20, default: 'NOS' })
  uom!: string;

  @Column({
    name: 'unit_price',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: '0',
    transformer: new DecimalTransformer(),
  })
  unitPrice!: Decimal;

  @Column({
    name: 'gst_rate_percent',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: '18.00',
    transformer: new DecimalTransformer(),
  })
  gstRatePercent!: Decimal;

  @Column({
    name: 'cess_rate_percent',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: '0.00',
    transformer: new DecimalTransformer(),
  })
  cessRatePercent!: Decimal;

  @Column({ name: 'sales_ledger_id', type: 'uuid', nullable: true })
  salesLedgerId?: string;

  @ManyToOne(() => LedgerOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sales_ledger_id' })
  salesLedger?: LedgerOrmEntity;

  @Column({ name: 'purchase_ledger_id', type: 'uuid', nullable: true })
  purchaseLedgerId?: string;

  @ManyToOne(() => LedgerOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'purchase_ledger_id' })
  purchaseLedger?: LedgerOrmEntity;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

