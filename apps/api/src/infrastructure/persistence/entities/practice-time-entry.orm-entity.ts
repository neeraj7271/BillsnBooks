import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PracticeJobOrmEntity } from './practice-job.orm-entity';
import { FirmClientOrmEntity } from './firm-client.orm-entity';

@Entity('practice_time_entries')
export class PracticeTimeEntryOrmEntity {
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

  @Index()
  @Column({ name: 'job_id', type: 'uuid', nullable: true })
  jobId?: string | null;

  @ManyToOne(() => PracticeJobOrmEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'job_id' })
  job?: PracticeJobOrmEntity | null;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'service_type_id', type: 'uuid', nullable: true })
  serviceTypeId?: string | null;

  @Column({ name: 'entry_date', type: 'date', default: () => 'CURRENT_DATE' })
  entryDate!: string;

  @Column({ type: 'int', default: 0 })
  minutes!: number;

  @Column({ name: 'is_billable', type: 'boolean', default: true })
  isBillable!: boolean;

  @Column({ name: 'hourly_rate', type: 'numeric', precision: 12, scale: 2, default: 0 })
  hourlyRate!: number;

  @Column({ name: 'approval_status', type: 'varchar', length: 20, default: 'DRAFT' })
  approvalStatus!: 'DRAFT' | 'SUBMITTED' | 'APPROVED';

  @Column({ name: 'bill_id', type: 'uuid', nullable: true })
  billId?: string | null;

  @Column({ name: 'is_write_off', type: 'boolean', default: false })
  isWriteOff!: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
