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
import { FirmClientOrmEntity } from './firm-client.orm-entity';
import { DocumentRequestType, DocumentRequestStatus } from '@platform/shared-types';

@Entity('client_document_requests')
export class ClientDocumentRequestOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => TenantOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantOrmEntity;

  @Index()
  @Column({ name: 'client_id', type: 'uuid' })
  clientId!: string;

  @ManyToOne(() => FirmClientOrmEntity, (c) => c.documentRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client!: FirmClientOrmEntity;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    name: 'document_type',
    type: 'varchar',
    length: 50,
    default: DocumentRequestType.BANK_STATEMENT,
  })
  documentType!: DocumentRequestType;

  @Column({ type: 'varchar', length: 50 })
  period!: string;

  @Index()
  @Column({
    type: 'varchar',
    length: 50,
    default: DocumentRequestStatus.REQUESTED,
  })
  status!: DocumentRequestStatus;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: string | null;

  @Column({ name: 'file_url', type: 'varchar', length: 1024, nullable: true })
  fileUrl?: string | null;

  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: true })
  fileName?: string | null;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes?: number | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

