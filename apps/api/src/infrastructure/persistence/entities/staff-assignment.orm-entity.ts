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
import { TenantOrmEntity } from './tenant.orm-entity';
import { UserOrmEntity } from './user.orm-entity';
import { FirmClientOrmEntity } from './firm-client.orm-entity';
import { StaffRole } from '@platform/shared-types';

@Entity('staff_assignments')
export class StaffAssignmentOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => TenantOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantOrmEntity;

  @Index()
  @Column({ name: 'client_id', type: 'uuid' })
  clientId!: string;

  @ManyToOne(() => FirmClientOrmEntity, (c) => c.staffAssignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client!: FirmClientOrmEntity;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserOrmEntity;

  @Column({
    type: 'varchar',
    length: 50,
    default: StaffRole.SENIOR_ACCOUNTANT,
  })
  role!: StaffRole;

  @Column({ name: 'is_lead', type: 'boolean', default: false })
  isLead!: boolean;

  @Column({ name: 'assigned_at', type: 'timestamptz', default: () => 'NOW()' })
  assignedAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

