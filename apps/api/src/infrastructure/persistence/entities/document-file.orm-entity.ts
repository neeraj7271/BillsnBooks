import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TenantOrmEntity } from './tenant.orm-entity';
import { FirmClientOrmEntity } from './firm-client.orm-entity';
import { DocumentFolderOrmEntity } from './document-folder.orm-entity';
import { ClientDocumentRequestOrmEntity } from './client-document-request.orm-entity';

@Entity('document_files')
export class DocumentFileOrmEntity {
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

  @ManyToOne(() => FirmClientOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client!: FirmClientOrmEntity;

  @Index()
  @Column({ name: 'folder_id', type: 'uuid', nullable: true })
  folderId?: string | null;

  @ManyToOne(() => DocumentFolderOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'folder_id' })
  folder?: DocumentFolderOrmEntity | null;

  @Index()
  @Column({ name: 'request_id', type: 'uuid', nullable: true })
  requestId?: string | null;

  @ManyToOne(() => ClientDocumentRequestOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'request_id' })
  request?: ClientDocumentRequestOrmEntity | null;

  @Index()
  @Column({ name: 'file_group_id', type: 'uuid' })
  fileGroupId!: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 1024 })
  storageKey!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 150 })
  mimeType!: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes!: number;

  @Column({ type: 'char', length: 64 })
  sha256!: string;

  @Column({ name: 'uploaded_by_user_id', type: 'uuid', nullable: true })
  uploadedByUserId?: string | null;

  @Column({ name: 'uploaded_by_name', type: 'varchar', length: 255, nullable: true })
  uploadedByName?: string | null;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Index()
  @Column({ name: 'is_latest', type: 'boolean', default: true })
  isLatest!: boolean;

  @Index()
  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
