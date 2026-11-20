import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CompanyOrmEntity } from './company.orm-entity';
import { PartyOrmEntity } from './party.orm-entity';
import { LedgerOrmEntity } from './ledger.orm-entity';
import { PartyLedgerLinkType } from '@platform/shared-types';

@Entity('party_ledger_links')
export class PartyLedgerLinkOrmEntity {
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

  @ManyToOne(() => PartyOrmEntity, (p) => p.ledgerLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'party_id' })
  party!: PartyOrmEntity;

  @Index()
  @Column({ name: 'ledger_id', type: 'uuid' })
  ledgerId!: string;

  @ManyToOne(() => LedgerOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ledger_id' })
  ledger!: LedgerOrmEntity;

  @Column({
    name: 'link_type',
    type: 'varchar',
    length: 50,
  })
  linkType!: PartyLedgerLinkType;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

