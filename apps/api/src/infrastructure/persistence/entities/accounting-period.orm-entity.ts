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
import { FinancialYearOrmEntity } from './financial-year.orm-entity';

@Entity('accounting_periods')
export class AccountingPeriodOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Index()
  @Column({ name: 'financial_year_id', type: 'uuid' })
  financialYearId!: string;

  @ManyToOne(() => FinancialYearOrmEntity, (fy) => fy.accountingPeriods, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'financial_year_id' })
  financialYear!: FinancialYearOrmEntity;

  @Column({ name: 'period_name', type: 'varchar', length: 50 })
  periodName!: string; // e.g. "Apr 2026"

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ name: 'is_locked', type: 'boolean', default: false })
  isLocked!: boolean;

  @Column({ name: 'locked_at', type: 'timestamp', nullable: true })
  lockedAt?: Date | null;

  @Column({ name: 'locked_by', type: 'uuid', nullable: true })
  lockedBy?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

