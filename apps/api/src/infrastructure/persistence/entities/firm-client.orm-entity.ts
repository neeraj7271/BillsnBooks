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

