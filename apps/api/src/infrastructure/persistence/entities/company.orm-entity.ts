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
import { TenantOrmEntity } from './tenant.orm-entity';
import { BranchOrmEntity } from './branch.orm-entity';
import { FinancialYearOrmEntity } from './financial-year.orm-entity';
import { EncryptionTransformer } from '../transformers/encryption.transformer';

@Entity('companies')
export class CompanyOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => TenantOrmEntity, (tenant) => tenant.companies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantOrmEntity;

  @Column({ name: 'legal_name', type: 'varchar', length: 255 })
  legalName!: string;

  @Column({ name: 'trade_name', type: 'varchar', length: 255, nullable: true })
  tradeName?: string;

  @Column({
    name: 'pan_encrypted',
    type: 'text',
    nullable: true,
    transformer: new EncryptionTransformer(),
  })
  panEncrypted?: string | null;

  @Column({ name: 'default_currency', type: 'varchar', length: 3, default: 'INR' })
  defaultCurrency!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'coa_seed_version', type: 'varchar', length: 20, nullable: true })
  coaSeedVersion?: string | null;

  @Column({ name: 'coa_template', type: 'varchar', length: 50, nullable: true })
  coaTemplate?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => BranchOrmEntity, (branch) => branch.company)
  branches!: BranchOrmEntity[];

  @OneToMany(() => FinancialYearOrmEntity, (fy) => fy.company)
  financialYears!: FinancialYearOrmEntity[];
}

