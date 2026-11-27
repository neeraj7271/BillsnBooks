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
import { FirmClientOrmEntity } from './firm-client.orm-entity';
import { EncryptionTransformer } from '../transformers/encryption.transformer';

@Entity('client_credentials')
export class ClientCredentialOrmEntity {
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

  @Column({ type: 'varchar', length: 120 })
  label!: string;

  @Column({ name: 'portal_type', type: 'varchar', length: 60, default: 'GST' })
  portalType!: string; // GST | INCOME_TAX | TRACES | MCA | EPFO | ESIC | BANK | OTHER

  @Column({ type: 'varchar', length: 255 })
  username!: string;

  @Column({
    name: 'password_encrypted',
    type: 'text',
    transformer: new EncryptionTransformer(),
  })
  passwordEncrypted!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  url?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'last_updated_by_user_id', type: 'uuid', nullable: true })
  lastUpdatedByUserId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
