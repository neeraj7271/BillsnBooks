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

  @Column({ type: 'int', default: 0 })
  minutes!: number;

  @Column({ name: 'is_billable', type: 'boolean', default: true })
  isBillable!: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
