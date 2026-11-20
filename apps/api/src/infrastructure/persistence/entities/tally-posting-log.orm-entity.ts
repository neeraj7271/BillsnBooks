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
import { ImportBatchOrmEntity } from './import-batch.orm-entity';
import { VoucherOrmEntity } from './voucher.orm-entity';
import { TallyPostingStatus } from '@platform/shared-types';

@Entity('tally_posting_logs')
export class TallyPostingLogOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'batch_id', type: 'uuid' })
  batchId!: string;

  @ManyToOne(() => ImportBatchOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batch_id' })
  batch!: ImportBatchOrmEntity;

  @Index()
  @Column({ name: 'voucher_id', type: 'uuid' })
  voucherId!: string;

  @ManyToOne(() => VoucherOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voucher_id' })
  voucher!: VoucherOrmEntity;

  @Column({ name: 'tally_guid', type: 'varchar', length: 100, nullable: true })
  tallyGuid!: string | null;

  @Column({ name: 'tally_voucher_number', type: 'varchar', length: 100, nullable: true })
  tallyVoucherNumber!: string | null;

  @Index()
  @Column({
    name: 'posting_status',
    type: 'varchar',
    length: 50,
    default: TallyPostingStatus.PENDING,
  })
  postingStatus!: TallyPostingStatus;

  @Column({ name: 'payload_sent', type: 'jsonb', nullable: true })
  payloadSent!: Record<string, any> | null;

  @Column({ name: 'read_back_data', type: 'jsonb', nullable: true })
  readBackData!: Record<string, any> | null;

  @Column({ name: 'verification_status', type: 'varchar', length: 50, default: 'PENDING' })
  verificationStatus!: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'sent_at', type: 'timestamp with time zone', nullable: true })
  sentAt!: Date | null;

  @Column({ name: 'verified_at', type: 'timestamp with time zone', nullable: true })
  verifiedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}

