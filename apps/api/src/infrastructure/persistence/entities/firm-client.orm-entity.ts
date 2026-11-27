import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { TenantOrmEntity } from './tenant.orm-entity';
import { CompanyOrmEntity } from './company.orm-entity';
import { StaffAssignmentOrmEntity } from './staff-assignment.orm-entity';
import { ComplianceTaskOrmEntity } from './compliance-task.orm-entity';
import { ClientDocumentRequestOrmEntity } from './client-document-request.orm-entity';
import { EngagementType, ServiceTier, ClientHealthStatus } from '@platform/shared-types';

@Entity('firm_clients')
export class FirmClientOrmEntity {
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

  @Column({ name: 'client_code', type: 'varchar', length: 50 })
  clientCode!: string;

  @Column({ name: 'primary_contact_name', type: 'varchar', length: 255 })
  primaryContactName!: string;

  @Column({ name: 'primary_contact_email', type: 'varchar', length: 255 })
  primaryContactEmail!: string;

  @Column({ name: 'primary_contact_phone', type: 'varchar', length: 50, nullable: true })
  primaryContactPhone?: string | null;

  @Column({
    name: 'engagement_type',
    type: 'varchar',
    length: 50,
    default: EngagementType.RETAINER,
  })
  engagementType!: EngagementType;

  @Column({
    name: 'service_tier',
    type: 'varchar',
    length: 50,
    default: ServiceTier.STANDARD,
  })
  serviceTier!: ServiceTier;

  @Column({ name: 'is_portal_enabled', type: 'boolean', default: true })
  isPortalEnabled!: boolean;

  @Index()
  @Column({
    name: 'health_status',
    type: 'varchar',
    length: 50,
    default: ClientHealthStatus.HEALTHY,
  })
  healthStatus!: ClientHealthStatus;

  @Column({ name: 'entity_type', type: 'varchar', length: 50, default: 'Pvt Ltd' })
  entityType!: string;

  @Column({ name: 'incorporation_date', type: 'date', nullable: true })
  incorporationDate?: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  cin?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  tan?: string | null;

  @Column({ name: 'aadhaar_masked', type: 'varchar', length: 20, nullable: true })
  aadhaarMasked?: string | null;

  @Column({ name: 'registered_address', type: 'text', nullable: true })
  registeredAddress?: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  gstins!: string[];

  @Column({ name: 'fy_preference', type: 'varchar', length: 20, default: 'APR_MAR' })
  fyPreference!: string;

  @Column({ name: 'is_vip', type: 'boolean', default: false })
  isVip!: boolean;

  @Column({ name: 'assigned_partner_id', type: 'uuid', nullable: true })
  assignedPartnerId?: string | null;

  @Column({ name: 'custom_fields', type: 'jsonb', default: () => "'{}'" })
  customFields!: Record<string, any>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  labels!: string[];

  @OneToMany(() => StaffAssignmentOrmEntity, (a) => a.client)
  staffAssignments!: StaffAssignmentOrmEntity[];

  @OneToMany(() => ComplianceTaskOrmEntity, (t) => t.client)
  tasks!: ComplianceTaskOrmEntity[];

  @OneToMany(() => ClientDocumentRequestOrmEntity, (d) => d.client)
  documentRequests!: ClientDocumentRequestOrmEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

