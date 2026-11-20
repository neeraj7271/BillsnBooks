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
import { PartyOrmEntity } from './party.orm-entity';
import { PartyRegistrationOrmEntity } from './party-registration.orm-entity';
import { AddressType } from '@platform/shared-types';

@Entity('party_addresses')
export class PartyAddressOrmEntity {
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

  @Index()
  @Column({ name: 'party_id', type: 'uuid' })
  partyId!: string;

  @ManyToOne(() => PartyOrmEntity, (p) => p.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'party_id' })
  party!: PartyOrmEntity;

  @Column({ name: 'registration_id', type: 'uuid', nullable: true })
  registrationId?: string | null;

  @ManyToOne(() => PartyRegistrationOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'registration_id' })
  registration?: PartyRegistrationOrmEntity | null;

  @Column({
    name: 'address_type',
    type: 'varchar',
    length: 20,
    default: AddressType.BILLING,
  })
  addressType!: AddressType;

  @Column({ type: 'varchar', length: 100, default: 'Main Office' })
  label!: string;

  @Column({ name: 'address_line1', type: 'varchar', length: 255 })
  addressLine1!: string;

  @Column({ name: 'address_line2', type: 'varchar', length: 255, nullable: true })
  addressLine2?: string | null;

  @Column({ type: 'varchar', length: 100 })
  city!: string;

  @Column({ name: 'state_code', type: 'varchar', length: 2 })
  stateCode!: string;

  @Column({ type: 'varchar', length: 10 })
  pincode!: string;

  @Column({ type: 'varchar', length: 3, default: 'IND' })
  country!: string;

  @Column({ name: 'is_default_billing', type: 'boolean', default: false })
  isDefaultBilling!: boolean;

  @Column({ name: 'is_default_shipping', type: 'boolean', default: false })
  isDefaultShipping!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

