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

@Entity('tally_masters')
@Index(['companyId', 'name'], { unique: true })
export class TallyMasterOrmEntity {
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

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'parent_group', type: 'varchar', length: 255 })
  parentGroup!: string;

  @Column({ name: 'gstin', type: 'varchar', length: 15, nullable: true })
  gstin!: string | null;

  @Column({ name: 'state', type: 'varchar', length: 100, nullable: true })
  state!: string | null;

  @Column({ name: 'opening_balance', type: 'numeric', precision: 18, scale: 4, default: 0 })
  openingBalance!: number;

  @Column({ name: 'is_party', type: 'boolean', default: false })
  isParty!: boolean;

  @Column({ name: 'synced_at', type: 'timestamp with time zone', default: () => 'NOW()' })
  syncedAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}

