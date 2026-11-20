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
import {
  AccountNature,
  ReportType,
  NormalBalance,
  CoaSource,
} from '@platform/shared-types';

@Entity('ledger_groups')
export class LedgerGroupOrmEntity {
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

  @Column({ name: 'parent_group_id', type: 'uuid', nullable: true })
  parentGroupId?: string | null;

  @ManyToOne(() => LedgerGroupOrmEntity, (group) => group.subGroups, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_group_id' })
  parentGroup?: LedgerGroupOrmEntity | null;

  @OneToMany(() => LedgerGroupOrmEntity, (group) => group.parentGroup)
  subGroups!: LedgerGroupOrmEntity[];

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  nature!: AccountNature;

  @Index()
  @Column({ name: 'system_key', type: 'varchar', length: 100, nullable: true })
  systemKey?: string | null;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;

  @Column({ name: 'is_locked', type: 'boolean', default: false })
  isLocked!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'source', type: 'varchar', length: 50, default: CoaSource.USER })
  source!: CoaSource;

  @Column({ name: 'seed_version', type: 'varchar', length: 20, nullable: true })
  seedVersion?: string | null;

  @Column({
    name: 'report',
    type: 'varchar',
    length: 50,
    default: ReportType.BALANCE_SHEET,
  })
  report!: ReportType;

  @Column({ name: 'affects_gross_profit', type: 'boolean', default: false })
  affectsGrossProfit!: boolean;

  @Column({
    name: 'normal_balance',
    type: 'varchar',
    length: 10,
    default: NormalBalance.DEBIT,
  })
  normalBalance!: NormalBalance;

  @Column({ name: 'tally_group_name', type: 'varchar', length: 150, nullable: true })
  tallyGroupName?: string | null;

  @Column({ name: 'schedule_iii_mapping', type: 'varchar', length: 150, nullable: true })
  scheduleIiiMapping?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
