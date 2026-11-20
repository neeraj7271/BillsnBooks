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
import { CompanyOrmEntity } from './company.orm-entity';
import { TallyConnectorStatus } from '@platform/shared-types';
import { EncryptionTransformer } from '../transformers/encryption.transformer';

@Entity('tally_connectors')
export class TallyConnectorOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => CompanyOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company!: CompanyOrmEntity;

  @Column({ name: 'machine_name', type: 'varchar', length: 255 })
  machineName!: string;

  @Column({ name: 'connector_version', type: 'varchar', length: 50, default: '1.0.0' })
  connectorVersion!: string;

  @Column({ name: 'tally_version', type: 'varchar', length: 50, default: 'TallyPrime 4.0' })
  tallyVersion!: string;

  @Column({ name: 'tally_port', type: 'int', default: 9000 })
  tallyPort!: number;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 50,
    default: TallyConnectorStatus.OFFLINE,
  })
  status!: TallyConnectorStatus;

  @Column({ name: 'last_heartbeat_at', type: 'timestamp with time zone', nullable: true })
  lastHeartbeatAt!: Date | null;

  @Column({ name: 'active_tally_company', type: 'varchar', length: 255, nullable: true })
  activeTallyCompany!: string | null;

  @Column({
    name: 'secret_token_encrypted',
    type: 'text',
    nullable: true,
    transformer: new EncryptionTransformer(),
  })
  secretTokenEncrypted!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}

