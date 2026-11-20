import { MigrationInterface, QueryRunner } from 'typeorm';

export class TallyAndImportStaging1730400000000 implements MigrationInterface {
  name = 'TallyAndImportStaging1730400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. tally_connectors
    await queryRunner.query(`
      CREATE TABLE tally_connectors (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        machine_name VARCHAR(255) NOT NULL,
        connector_version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
        tally_version VARCHAR(50) NOT NULL DEFAULT 'TallyPrime 4.0',
        tally_port INT NOT NULL DEFAULT 9000,
        status VARCHAR(50) NOT NULL DEFAULT 'OFFLINE',
        last_heartbeat_at TIMESTAMP WITH TIME ZONE NULL,
        active_tally_company VARCHAR(255) NULL,
        secret_token_encrypted TEXT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_tally_connectors_tenant_id ON tally_connectors(tenant_id);
      CREATE INDEX idx_tally_connectors_company_id ON tally_connectors(company_id);
    `);

    // 2. import_batches
    await queryRunner.query(`
      CREATE TABLE import_batches (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
        branch_id UUID NULL REFERENCES branches(id) ON DELETE SET NULL,
        file_name VARCHAR(255) NOT NULL,
        file_hash_sha256 VARCHAR(64) NOT NULL,
        file_size_bytes BIGINT NOT NULL,
        file_url TEXT NULL,
        import_type VARCHAR(50) NOT NULL DEFAULT 'SALES_REGISTER',
        column_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
        status VARCHAR(50) NOT NULL DEFAULT 'UPLOADED',
        total_rows INT NOT NULL DEFAULT 0,
        valid_rows INT NOT NULL DEFAULT 0,
        blocked_rows INT NOT NULL DEFAULT 0,
        clarification_rows INT NOT NULL DEFAULT 0,
        detected_headers JSONB NULL,
        sample_rows JSONB NULL,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        approved_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMP WITH TIME ZONE NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_import_batches_hash UNIQUE(tenant_id, company_id, file_hash_sha256)
      );
      CREATE INDEX idx_import_batches_tenant_id ON import_batches(tenant_id);
      CREATE INDEX idx_import_batches_company_id ON import_batches(company_id);
      CREATE INDEX idx_import_batches_status ON import_batches(status);
    `);

    // 3. import_rows
    await queryRunner.query(`
      CREATE TABLE import_rows (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        row_index INT NOT NULL,
        raw_data JSONB NOT NULL,
        parsed_data JSONB NOT NULL,
        validation_state VARCHAR(50) NOT NULL DEFAULT 'YELLOW',
        error_reasons TEXT[] NOT NULL DEFAULT '{}',
        matched_ledger_id UUID NULL REFERENCES ledgers(id) ON DELETE SET NULL,
        generated_voucher_id UUID NULL REFERENCES vouchers(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_import_rows_batch_id ON import_rows(batch_id);
      CREATE INDEX idx_import_rows_tenant_id ON import_rows(tenant_id);
      CREATE INDEX idx_import_rows_validation_state ON import_rows(validation_state);
      CREATE INDEX idx_import_rows_matched_ledger_id ON import_rows(matched_ledger_id);
    `);

    // 4. tally_masters
    await queryRunner.query(`
      CREATE TABLE tally_masters (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        parent_group VARCHAR(255) NOT NULL,
        gstin VARCHAR(15) NULL,
        state VARCHAR(100) NULL,
        opening_balance NUMERIC(18, 4) NOT NULL DEFAULT 0,
        is_party BOOLEAN NOT NULL DEFAULT FALSE,
        synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_tally_masters_name UNIQUE(company_id, name)
      );
      CREATE INDEX idx_tally_masters_tenant_id ON tally_masters(tenant_id);
      CREATE INDEX idx_tally_masters_company_id ON tally_masters(company_id);
    `);

    // 5. tally_posting_logs
    await queryRunner.query(`
      CREATE TABLE tally_posting_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
        voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
        tally_guid VARCHAR(100) NULL,
        tally_voucher_number VARCHAR(100) NULL,
        posting_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        payload_sent JSONB NULL,
        read_back_data JSONB NULL,
        verification_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        error_message TEXT NULL,
        sent_at TIMESTAMP WITH TIME ZONE NULL,
        verified_at TIMESTAMP WITH TIME ZONE NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_tally_posting_logs_batch_id ON tally_posting_logs(batch_id);
      CREATE INDEX idx_tally_posting_logs_voucher_id ON tally_posting_logs(voucher_id);
      CREATE INDEX idx_tally_posting_logs_posting_status ON tally_posting_logs(posting_status);
    `);

    // 6. Enable Row Level Security (RLS) on all 5 tables
    const tables = [
      'tally_connectors',
      'import_batches',
      'import_rows',
      'tally_masters',
      'tally_posting_logs',
    ];

    for (const table of tables) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
      await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`);
      await queryRunner.query(`
        CREATE POLICY ${table}_tenant_isolation ON ${table}
          AS RESTRICTIVE
          USING (
            tenant_id::text = current_setting('app.tenant_id', true)
            OR current_setting('app.tenant_id', true) IS NULL
            OR current_setting('app.tenant_id', true) = ''
          );
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'tally_posting_logs',
      'tally_masters',
      'import_rows',
      'import_batches',
      'tally_connectors',
    ];

    for (const table of tables) {
      await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table};`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
    }
  }
}

