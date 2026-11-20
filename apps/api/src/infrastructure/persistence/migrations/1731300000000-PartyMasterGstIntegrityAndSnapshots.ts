import { MigrationInterface, QueryRunner } from 'typeorm';

export class PartyMasterGstIntegrityAndSnapshots1731300000000 implements MigrationInterface {
  name = 'PartyMasterGstIntegrityAndSnapshots1731300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Alter parties table
    await queryRunner.query(`
      ALTER TABLE parties 
        ADD COLUMN IF NOT EXISTS party_code VARCHAR(50) NULL,
        ADD COLUMN IF NOT EXISTS registration_type VARCHAR(50) NOT NULL DEFAULT 'REGULAR',
        ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'INR';

      CREATE INDEX IF NOT EXISTS idx_parties_code ON parties(company_id, party_code);
      CREATE INDEX IF NOT EXISTS idx_parties_reg_type ON parties(registration_type);
    `);

    // 2. Create party_registrations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS party_registrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
        registration_type VARCHAR(50) NOT NULL,
        gstin VARCHAR(15) NULL,
        state_code VARCHAR(2) NOT NULL,
        legal_name VARCHAR(255) NULL,
        trade_name VARCHAR(255) NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
        valid_to DATE NULL,
        verification_status VARCHAR(50) NOT NULL DEFAULT 'UNVERIFIED',
        verified_at TIMESTAMPTZ NULL,
        verification_source VARCHAR(100) NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_gstin_registration_type CHECK (
          (registration_type IN ('UNREGISTERED', 'OVERSEAS') AND gstin IS NULL)
          OR
          (registration_type NOT IN ('UNREGISTERED', 'OVERSEAS') AND gstin IS NOT NULL)
        )
      );

      CREATE INDEX IF NOT EXISTS idx_party_reg_tenant ON party_registrations(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_party_reg_company ON party_registrations(company_id);
      CREATE INDEX IF NOT EXISTS idx_party_reg_party ON party_registrations(party_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_active_company_gstin 
        ON party_registrations(company_id, gstin) 
        WHERE gstin IS NOT NULL AND status = 'ACTIVE';
    `);

    // 3. Create party_addresses table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS party_addresses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
        registration_id UUID NULL REFERENCES party_registrations(id) ON DELETE SET NULL,
        address_type VARCHAR(20) NOT NULL DEFAULT 'BILLING',
        label VARCHAR(100) NOT NULL DEFAULT 'Main Office',
        address_line1 VARCHAR(255) NOT NULL,
        address_line2 VARCHAR(255) NULL,
        city VARCHAR(100) NOT NULL,
        state_code VARCHAR(2) NOT NULL,
        pincode VARCHAR(10) NOT NULL,
        country VARCHAR(3) NOT NULL DEFAULT 'IND',
        is_default_billing BOOLEAN NOT NULL DEFAULT FALSE,
        is_default_shipping BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_party_addr_tenant ON party_addresses(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_party_addr_company ON party_addresses(company_id);
      CREATE INDEX IF NOT EXISTS idx_party_addr_party ON party_addresses(party_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_party_default_billing 
        ON party_addresses(party_id) 
        WHERE is_default_billing = TRUE;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_party_default_shipping 
        ON party_addresses(party_id) 
        WHERE is_default_shipping = TRUE;
    `);

    // 4. Create party_ledger_links table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS party_ledger_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
        ledger_id UUID NOT NULL REFERENCES ledgers(id) ON DELETE RESTRICT,
        link_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_company_party_ledger_link UNIQUE (company_id, party_id, link_type)
      );

      CREATE INDEX IF NOT EXISTS idx_party_link_tenant ON party_ledger_links(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_party_link_company ON party_ledger_links(company_id);
      CREATE INDEX IF NOT EXISTS idx_party_link_party ON party_ledger_links(party_id);
      CREATE INDEX IF NOT EXISTS idx_party_link_ledger ON party_ledger_links(ledger_id);
    `);

    // 5. Add snapshot columns to invoices table
    await queryRunner.query(`
      ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS party_name_snapshot VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS party_trade_name_snapshot VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS party_registration_type_snapshot VARCHAR(50) NULL,
        ADD COLUMN IF NOT EXISTS party_gstin_snapshot VARCHAR(15) NULL,
        ADD COLUMN IF NOT EXISTS party_pan_snapshot VARCHAR(10) NULL,
        ADD COLUMN IF NOT EXISTS billing_address_snapshot JSONB NULL,
        ADD COLUMN IF NOT EXISTS shipping_address_snapshot JSONB NULL,
        ADD COLUMN IF NOT EXISTS tax_rule_version_snapshot VARCHAR(50) NULL,
        ADD COLUMN IF NOT EXISTS tax_rate_sources_snapshot JSONB NULL;

      CREATE INDEX IF NOT EXISTS idx_invoices_party_gstin_snapshot ON invoices(party_gstin_snapshot);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE invoices
        DROP COLUMN IF EXISTS tax_rate_sources_snapshot,
        DROP COLUMN IF EXISTS tax_rule_version_snapshot,
        DROP COLUMN IF EXISTS shipping_address_snapshot,
        DROP COLUMN IF EXISTS billing_address_snapshot,
        DROP COLUMN IF EXISTS party_pan_snapshot,
        DROP COLUMN IF EXISTS party_gstin_snapshot,
        DROP COLUMN IF EXISTS party_registration_type_snapshot,
        DROP COLUMN IF EXISTS party_trade_name_snapshot,
        DROP COLUMN IF EXISTS party_name_snapshot;

      DROP TABLE IF EXISTS party_ledger_links;
      DROP TABLE IF EXISTS party_addresses;
      DROP TABLE IF EXISTS party_registrations;

      ALTER TABLE parties
        DROP COLUMN IF EXISTS currency,
        DROP COLUMN IF EXISTS registration_type,
        DROP COLUMN IF EXISTS party_code;
    `);
  }
}

