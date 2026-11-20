import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { InvoiceOrmEntity } from './invoice.orm-entity';
import { ItemOrmEntity } from './item.orm-entity';
import { DecimalTransformer } from '../transformers/decimal.transformer';
import { Decimal } from 'decimal.js';

@Entity('invoice_items')
export class InvoiceItemOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'invoice_id', type: 'uuid' })
  invoiceId!: string;

  @ManyToOne(() => InvoiceOrmEntity, (inv) => inv.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice!: InvoiceOrmEntity;

  @Column({ name: 'item_id', type: 'uuid', nullable: true })
  itemId?: string;

  @ManyToOne(() => ItemOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'item_id' })
  item?: ItemOrmEntity;

  @Column({ type: 'varchar', length: 500 })
  description!: string;

  @Column({ name: 'hsn_sac_code', type: 'varchar', length: 20 })
  hsnSacCode!: string;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: '1',
    transformer: new DecimalTransformer(),
  })
  quantity!: Decimal;

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
    name: 'discount_percent',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: '0.00',
    transformer: new DecimalTransformer(),
  })
  discountPercent!: Decimal;

  @Column({
    name: 'discount_amount',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: '0.0000',
    transformer: new DecimalTransformer(),
  })
  discountAmount!: Decimal;

  @Column({
    name: 'taxable_amount',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: '0.0000',
    transformer: new DecimalTransformer(),
  })
  taxableAmount!: Decimal;

  @Column({
    name: 'gst_rate_percent',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: '0.00',
    transformer: new DecimalTransformer(),
  })
  gstRatePercent!: Decimal;

  @Column({
    name: 'cgst_amount',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: '0.0000',
    transformer: new DecimalTransformer(),
  })
  cgstAmount!: Decimal;

  @Column({
    name: 'sgst_amount',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: '0.0000',
    transformer: new DecimalTransformer(),
  })
  sgstAmount!: Decimal;

  @Column({
    name: 'igst_amount',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: '0.0000',
    transformer: new DecimalTransformer(),
  })
  igstAmount!: Decimal;

  @Column({
    name: 'cess_amount',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: '0.0000',
    transformer: new DecimalTransformer(),
  })
  cessAmount!: Decimal;

  @Column({
    name: 'total_amount',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: '0.0000',
    transformer: new DecimalTransformer(),
  })
  totalAmount!: Decimal;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

