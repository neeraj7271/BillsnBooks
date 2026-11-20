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
import { BankTransactionOrmEntity } from './bank-transaction.orm-entity';
import { VoucherOrmEntity } from './voucher.orm-entity';

@Entity('sales_discovery_tickets')
export class SalesDiscoveryTicketOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId!: string;

  @ManyToOne(() => BankTransactionOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction!: BankTransactionOrmEntity;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'OPEN' })
  status!: string;

  @Column({ name: 'classification', type: 'varchar', length: 50, nullable: true })
  classification!: string | null;

  @Index()
  @Column({ name: 'generated_voucher_id', type: 'uuid', nullable: true })
  generatedVoucherId!: string | null;

  @ManyToOne(() => VoucherOrmEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'generated_voucher_id' })
  generatedVoucher!: VoucherOrmEntity | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
