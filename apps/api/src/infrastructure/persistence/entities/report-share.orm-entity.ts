import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('report_shares')
export class ReportShareOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'report_key', type: 'varchar', length: 64 })
  reportKey!: string;

  @Column({ name: 'report_title', type: 'varchar', length: 255 })
  reportTitle!: string;

  @Column({ type: 'jsonb', default: {} })
  filters!: Record<string, any>;

  @Column({ type: 'varchar', length: 16, default: 'PDF' })
  format!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 128 })
  token!: string;

  @Column({ name: 'recipient_email', type: 'varchar', length: 255, nullable: true })
  recipientEmail?: string | null;

  @Column({ name: 'recipient_phone', type: 'varchar', length: 50, nullable: true })
  recipientPhone?: string | null;

  @Column({ name: 'share_channel', type: 'varchar', length: 32, default: 'LINK' })
  shareChannel!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'download_count', type: 'int', default: 0 })
  downloadCount!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
