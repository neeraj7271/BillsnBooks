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
import { BranchOrmEntity } from './branch.orm-entity';
import { PartyOrmEntity } from './party.orm-entity';
import { RecurringFrequency, RecurringScheduleStatus, RecurringScheduleTemplate } from '@platform/shared-types';

@Entity('recurring_schedules')
export class RecurringScheduleOrmEntity {
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

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => BranchOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch!: BranchOrmEntity;

  @Column({ name: 'party_id', type: 'uuid' })
  partyId!: string;

  @ManyToOne(() => PartyOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'party_id' })
  party!: PartyOrmEntity;

  @Column({ type: 'varchar', length: 32 })
  frequency!: RecurringFrequency;

  @Index()
  @Column({ type: 'varchar', length: 32, default: RecurringScheduleStatus.ACTIVE })
  status!: RecurringScheduleStatus;

  @Index()
  @Column({ name: 'next_run_date', type: 'date' })
  nextRunDate!: string;

  @Column({ name: 'last_run_date', type: 'date', nullable: true })
  lastRunDate?: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string | null;

  @Column({ name: 'template_payload', type: 'jsonb' })
  templatePayload!: RecurringScheduleTemplate;

  @Column({ name: 'total_runs', type: 'int', default: 0 })
  totalRuns!: number;

  @Column({ name: 'max_runs', type: 'int', nullable: true })
  maxRuns?: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

