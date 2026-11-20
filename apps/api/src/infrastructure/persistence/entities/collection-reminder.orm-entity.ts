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
import { CompanyOrmEntity } from './company.orm-entity';
import { InvoiceOrmEntity } from './invoice.orm-entity';
import { PartyOrmEntity } from './party.orm-entity';
import { ReminderChannel, ReminderCadence, ReminderStatus } from '@platform/shared-types';

@Entity('collection_reminders')
export class CollectionReminderOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => TenantOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantOrmEntity;

  @Index()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => CompanyOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company!: CompanyOrmEntity;

  @Index()
  @Column({ name: 'invoice_id', type: 'uuid' })
  invoiceId!: string;

  @ManyToOne(() => InvoiceOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice!: InvoiceOrmEntity;

  @Index()
  @Column({ name: 'party_id', type: 'uuid' })
  partyId!: string;

  @ManyToOne(() => PartyOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'party_id' })
  party!: PartyOrmEntity;

  @Column({ type: 'varchar', length: 32, default: ReminderChannel.WHATSAPP })
  channel!: ReminderChannel;

  @Column({ type: 'varchar', length: 64 })
  cadence!: ReminderCadence;

  @Column({ type: 'varchar', length: 255 })
  recipient!: string;

  @Column({ name: 'message_body', type: 'text' })
  messageBody!: string;

  @Column({ type: 'varchar', length: 32, default: ReminderStatus.SENT })
  status!: ReminderStatus;

  @Column({ name: 'sent_at', type: 'timestamptz', default: () => 'NOW()' })
  sentAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

