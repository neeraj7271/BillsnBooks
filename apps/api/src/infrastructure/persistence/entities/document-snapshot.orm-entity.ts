import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('document_snapshots')
@Index('idx_document_snapshots_lookup', ['documentType', 'documentId'], { unique: true })
export class DocumentSnapshotOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'document_type', type: 'varchar', length: 32 })
  documentType!: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId!: string;

  @Column({ name: 'snapshot_data', type: 'jsonb' })
  snapshotData!: any;

  @Column({ name: 'sha256_hash', type: 'varchar', length: 64 })
  sha256Hash!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

