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
import { AccountingPeriodOrmEntity } from './accounting-period.orm-entity';

@Entity('financial_years')
export class FinancialYearOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => CompanyOrmEntity, (company) => company.financialYears, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company!: CompanyOrmEntity;

  @Column({ type: 'varchar', length: 50 })
  name!: string; // e.g. "FY 2026-27"

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ name: 'is_closed', type: 'boolean', default: false })
  isClosed!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => AccountingPeriodOrmEntity, (period) => period.financialYear)
  accountingPeriods!: AccountingPeriodOrmEntity[];
}

