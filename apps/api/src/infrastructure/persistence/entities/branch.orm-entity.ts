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

@Entity('branches')
export class BranchOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => CompanyOrmEntity, (company) => company.branches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company!: CompanyOrmEntity;

  @Column({ name: 'branch_name', type: 'varchar', length: 150 })
  branchName!: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  gstin?: string | null;

  @Column({ name: 'state_code', type: 'varchar', length: 2 })
  stateCode!: string;

  @Column({ name: 'address_line1', type: 'varchar', length: 255, nullable: true })
  addressLine1?: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  pincode?: string | null;

  @Column({ name: 'is_head_office', type: 'boolean', default: false })
  isHeadOffice!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

