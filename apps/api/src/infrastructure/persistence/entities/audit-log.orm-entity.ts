import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLogOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId?: string | null;

  @Index()
  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId?: string | null;

  @Column({ name: 'entity_type', type: 'varchar', length: 100 })
  entityType!: string;

  @Index()
  @Column({ name: 'entity_id', type: 'uuid' })
  entityId!: string;

  @Column({ type: 'varchar', length: 50 })
  action!: string; // CREATE, UPDATE, DELETE, POST, REVERSE, LOCK

  @Column({ name: 'payload_before', type: 'jsonb', nullable: true })
  payloadBefore?: Record<string, unknown> | null;

  @Column({ name: 'payload_after', type: 'jsonb', nullable: true })
  payloadAfter?: Record<string, unknown> | null;

  @Column({ name: 'record_hash', type: 'char', length: 64 })
  recordHash!: string; // SHA-256 tamper-evident hash

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

