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
import { BranchOrmEntity } from './branch.orm-entity';
import { UserOrmEntity } from './user.orm-entity';
import { ImportRowOrmEntity } from './import-row.orm-entity';
import { ImportBatchStatus, ImportType, ColumnMappingConfig } from '@platform/shared-types';

@Entity('import_batches')
@Index(['tenantId', 'companyId', 'fileHashSha256'], { unique: true })
export class ImportBatchOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => CompanyOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: CompanyOrmEntity;

  @Index()
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  @ManyToOne(() => BranchOrmEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch!: BranchOrmEntity | null;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'file_hash_sha256', type: 'varchar', length: 64 })
  fileHashSha256!: string;

  @Column({ name: 'file_size_bytes', type: 'bigint' })
  fileSizeBytes!: string;

  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl!: string | null;

  @Column({
    name: 'import_type',
    type: 'varchar',
    length: 50,
    default: ImportType.SALES_REGISTER,
  })
  importType!: ImportType;

  @Column({ name: 'column_mapping', type: 'jsonb', default: {} })
  columnMapping!: ColumnMappingConfig;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 50,
    default: ImportBatchStatus.UPLOADED,
  })
  status!: ImportBatchStatus;

  @Column({ name: 'total_rows', type: 'int', default: 0 })
  totalRows!: number;

  @Column({ name: 'valid_rows', type: 'int', default: 0 })
  validRows!: number;

  @Column({ name: 'blocked_rows', type: 'int', default: 0 })
  blockedRows!: number;

  @Column({ name: 'clarification_rows', type: 'int', default: 0 })
  clarificationRows!: number;

  @Column({ name: 'detected_headers', type: 'jsonb', nullable: true })
  detectedHeaders!: string[] | null;

  @Column({ name: 'sample_rows', type: 'jsonb', nullable: true })
  sampleRows!: Record<string, any>[] | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator!: UserOrmEntity | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy!: string | null;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver!: UserOrmEntity | null;

  @Column({ name: 'approved_at', type: 'timestamp with time zone', nullable: true })
  approvedAt!: Date | null;

  @OneToMany(() => ImportRowOrmEntity, (row) => row.batch)
  rows!: ImportRowOrmEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}

