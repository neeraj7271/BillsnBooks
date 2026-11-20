import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { VoucherType } from '@platform/shared-types';

@Entity('voucher_sequences')
@Unique('uq_company_voucher_sequence', ['companyId', 'voucherType', 'series', 'financialYearId'])
export class VoucherSequenceOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({
    name: 'voucher_type',
    type: 'varchar',
    length: 50,
  })
  voucherType!: VoucherType;

  @Column({ type: 'varchar', length: 50, default: 'DEFAULT' })
  series!: string;

  @Index()
  @Column({ name: 'financial_year_id', type: 'uuid' })
  financialYearId!: string;

  @Column({ name: 'last_sequence', type: 'bigint', default: 0 })
  lastSequence!: number;

  @Column({ type: 'varchar', length: 20, default: '' })
  prefix!: string;

  @Column({ type: 'varchar', length: 20, default: '' })
  suffix!: string;

  @Column({ type: 'int', default: 4 })
  padding!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

