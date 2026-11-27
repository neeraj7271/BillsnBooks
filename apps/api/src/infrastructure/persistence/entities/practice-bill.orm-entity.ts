import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { FirmClientOrmEntity } from './firm-client.orm-entity';

@Entity('practice_bills')
export class PracticeBillOrmEntity {
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

  @Column({ name: 'bill_number', type: 'varchar', length: 60 })
  billNumber!: string;

  @Column({ name: 'bill_date', type: 'date' })
  billDate!: string;

  @Column({ name: 'due_date', type: 'date' })
  dueDate!: string;

  @Column({ type: 'varchar', length: 30, default: 'DRAFT' })
  status!: 'DRAFT' | 'FINALIZED' | 'INVOICED' | 'PAID';

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ name: 'gst_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  gstAmount!: number;

  @Column({ name: 'total_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({ name: 'retainer_applied', type: 'numeric', precision: 14, scale: 2, default: 0 })
  retainerApplied!: number;

  @Column({ name: 'invoice_id', type: 'uuid', nullable: true })
  invoiceId?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @OneToMany(() => PracticeBillLineOrmEntity, (l) => l.bill, { cascade: true })
  lines!: PracticeBillLineOrmEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('practice_bill_lines')
export class PracticeBillLineOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'bill_id', type: 'uuid' })
  billId!: string;

  @ManyToOne(() => PracticeBillOrmEntity, (b) => b.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bill_id' })
  bill!: PracticeBillOrmEntity;

  @Column({ name: 'line_type', type: 'varchar', length: 30, default: 'TIME' })
  lineType!: 'TIME' | 'RETAINER' | 'FIXED_FEE' | 'EXPENSE' | 'WRITE_OFF';

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({ name: 'service_type_id', type: 'uuid', nullable: true })
  serviceTypeId?: string | null;

  @Column({ name: 'time_entry_id', type: 'uuid', nullable: true })
  timeEntryId?: string | null;

  @Column({ name: 'client_service_id', type: 'uuid', nullable: true })
  clientServiceId?: string | null;

  @Column({ type: 'numeric', precision: 8, scale: 2, default: 1 })
  hours!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  rate!: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  amount!: number;

  @Column({ name: 'gst_rate', type: 'numeric', precision: 5, scale: 2, default: 18 })
  gstRate!: number;

  @Column({ name: 'is_written_off', type: 'boolean', default: false })
  isWrittenOff!: boolean;
}
