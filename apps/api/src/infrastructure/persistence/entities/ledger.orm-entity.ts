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
import { LedgerGroupOrmEntity } from './ledger-group.orm-entity';
import { DecimalTransformer } from '../transformers/decimal.transformer';
import { Decimal } from 'decimal.js';
import { CoaSource, GstTaxType } from '@platform/shared-types';

@Entity('ledgers')
export class LedgerOrmEntity {
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
  @Column({ name: 'group_id', type: 'uuid' })
  groupId!: string;

  @ManyToOne(() => LedgerGroupOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'group_id' })
  group!: LedgerGroupOrmEntity;

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency!: string;

  @Column({
    name: 'opening_balance',
    type: 'numeric',
    precision: 20,
    scale: 4,
    default: '0.0000',
    transformer: new DecimalTransformer(),
  })
  openingBalance!: Decimal;

  @Column({
    name: 'current_balance',
    type: 'numeric',
    precision: 20,
    scale: 4,
    default: '0.0000',
    transformer: new DecimalTransformer(),
  })
  currentBalance!: Decimal;

  @Column({ name: 'is_bank_or_cash', type: 'boolean', default: false })
  isBankOrCash!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Index()
  @Column({ name: 'system_key', type: 'varchar', length: 100, nullable: true })
  systemKey?: string | null;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;

  @Column({ name: 'is_locked', type: 'boolean', default: false })
  isLocked!: boolean;

  @Column({ name: 'source', type: 'varchar', length: 50, default: CoaSource.USER })
  source!: CoaSource;

  @Column({ name: 'seed_version', type: 'varchar', length: 20, nullable: true })
  seedVersion?: string | null;

  @Column({ name: 'schedule_iii_mapping', type: 'varchar', length: 150, nullable: true })
  scheduleIiiMapping?: string | null;

  @Column({ name: 'tally_ledger_name', type: 'varchar', length: 150, nullable: true })
  tallyLedgerName?: string | null;

  @Column({ name: 'gst_tax_type', type: 'varchar', length: 50, nullable: true })
  gstTaxType?: GstTaxType | null;

  @Column({
    name: 'gst_rate',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  gstRate?: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
