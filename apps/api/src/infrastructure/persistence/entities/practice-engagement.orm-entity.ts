import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FirmClientOrmEntity } from './firm-client.orm-entity';

@Entity('practice_engagement_templates')
export class PracticeEngagementTemplateOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 180 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'body_template', type: 'text' })
  bodyTemplate!: string;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('practice_engagements')
export class PracticeEngagementOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'client_id', type: 'uuid' })
  clientId!: string;

  @ManyToOne(() => FirmClientOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client!: FirmClientOrmEntity;

  @Column({ name: 'proposal_id', type: 'uuid', nullable: true })
  proposalId?: string | null;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId?: string | null;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 30, default: 'DRAFT' })
  status!: 'DRAFT' | 'SENT' | 'SIGNED' | 'COUNTERSIGNED' | 'ACTIVE' | 'TERMINATED';

  @Column({ name: 'engagement_letter_file_id', type: 'uuid', nullable: true })
  engagementLetterFileId?: string | null;

  @Column({ name: 'signature_file_id', type: 'uuid', nullable: true })
  signatureFileId?: string | null;

  @Column({ name: 'scope_of_services', type: 'jsonb', default: () => "'[]'" })
  scopeOfServices!: any[];

  @Column({ name: 'fee_schedule', type: 'jsonb', default: () => "'[]'" })
  feeSchedule!: any[];

  @Column({ name: 'letter_body', type: 'text', nullable: true })
  letterBody?: string | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string | null;

  @Column({ name: 'signed_by_client_at', type: 'timestamptz', nullable: true })
  signedByClientAt?: Date | null;

  @Column({ name: 'signed_by_client_name', type: 'varchar', length: 180, nullable: true })
  signedByClientName?: string | null;

  @Column({ name: 'signed_by_client_email', type: 'varchar', length: 180, nullable: true })
  signedByClientEmail?: string | null;

  @Column({ name: 'signed_by_client_ip', type: 'varchar', length: 80, nullable: true })
  signedByClientIp?: string | null;

  @Column({ name: 'signed_by_firm_at', type: 'timestamptz', nullable: true })
  signedByFirmAt?: Date | null;

  @Column({ name: 'signed_by_firm_user_id', type: 'uuid', nullable: true })
  signedByFirmUserId?: string | null;

  @Column({ name: 'document_sha256', type: 'varchar', length: 64, nullable: true })
  documentSha256?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
