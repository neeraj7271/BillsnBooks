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
import {
  PartyRegistrationType,
  RegistrationStatus,
  VerificationStatus,
} from '@platform/shared-types';

@Entity('party_registrations')
export class PartyRegistrationOrmEntity {
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

  @ManyToOne(() => PartyOrmEntity, (p) => p.registrations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'party_id' })
  party!: PartyOrmEntity;

  @Column({
    name: 'registration_type',
    type: 'varchar',
    length: 50,
  })
  registrationType!: PartyRegistrationType;

  @Column({ type: 'varchar', length: 15, nullable: true })
  gstin?: string | null;

  @Column({ name: 'state_code', type: 'varchar', length: 2 })
  stateCode!: string;

  @Column({ name: 'legal_name', type: 'varchar', length: 255, nullable: true })
  legalName?: string | null;

  @Column({ name: 'trade_name', type: 'varchar', length: 255, nullable: true })
  tradeName?: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    default: RegistrationStatus.ACTIVE,
  })
  status!: RegistrationStatus;

  @Column({ name: 'valid_from', type: 'date', default: () => 'CURRENT_DATE' })
  validFrom!: string;

  @Column({ name: 'valid_to', type: 'date', nullable: true })
  validTo?: string | null;

  @Column({
    name: 'verification_status',
    type: 'varchar',
    length: 50,
    default: VerificationStatus.UNVERIFIED,
  })
  verificationStatus!: VerificationStatus;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt?: Date | null;

  @Column({ name: 'verification_source', type: 'varchar', length: 100, nullable: true })
  verificationSource?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

