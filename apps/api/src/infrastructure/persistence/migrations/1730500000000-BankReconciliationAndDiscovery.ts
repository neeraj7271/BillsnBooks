import { MigrationInterface, QueryRunner } from 'typeorm';

export class BankReconciliationAndDiscovery1730500000000 implements MigrationInterface {
  name = 'BankReconciliationAndDiscovery1730500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. bank_accounts
    await queryRunner.query(`
      CREATE TABLE bank_accounts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        branch_id UUID NULL REFERENCES branches(id) ON DELETE SET NULL,
        bank_name VARCHAR(100) NOT NULL,
        account_number_encrypted TEXT NOT NULL,
        ifsc_code VARCHAR(11) NOT NULL,
        account_type VARCHAR(50) NOT NULL DEFAULT 'CURRENT',
        ledger_id UUID NULL REFERENCES ledgers(id) ON DELETE RESTRICT,
        opening_balance NUMERIC(20, 4) NOT NULL DEFAULT 0,
        current_balance NUMERIC(20, 4) NOT NULL DEFAULT 0,
        currency VARCHAR(3) NOT NULL DEFAULT 'INR',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_bank_accounts_tenant_id ON bank_accounts(tenant_id);
      CREATE INDEX idx_bank_accounts_company_id ON bank_accounts(company_id);
    `);

    // 2. bank_statements
    await queryRunner.query(`
      CREATE TABLE bank_statements (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_hash_sha256 VARCHAR(64) NOT NULL,
        period_start DATE NULL,
        period_end DATE NULL,
        opening_balance NUMERIC(20, 4) NOT NULL DEFAULT 0,
        closing_balance NUMERIC(20, 4) NOT NULL DEFAULT 0,
        total_transactions INT NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'PARSED',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_bank_statements_hash UNIQUE(tenant_id, bank_account_id, file_hash_sha256)
      );
      CREATE INDEX idx_bank_statements_tenant_id ON bank_statements(tenant_id);
      CREATE INDEX idx_bank_statements_account_id ON bank_statements(bank_account_id);
    `);

    // 3. bank_transactions
    await queryRunner.query(`
      CREATE TABLE bank_transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        statement_id UUID NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
        bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        transaction_date DATE NOT NULL,
        value_date DATE NULL,
        narration TEXT NOT NULL,
        debit_amount NUMERIC(20, 4) NOT NULL DEFAULT 0,
        credit_amount NUMERIC(20, 4) NOT NULL DEFAULT 0,
        balance_after NUMERIC(20, 4) NOT NULL DEFAULT 0,
        reference_number VARCHAR(100) NULL,
        payment_mode VARCHAR(50) NOT NULL DEFAULT 'OTHER',
        extracted_party_name VARCHAR(255) NULL,
        match_status VARCHAR(50) NOT NULL DEFAULT 'UNMATCHED',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_bank_transactions_statement_id ON bank_transactions(statement_id);
      CREATE INDEX idx_bank_transactions_account_id ON bank_transactions(bank_account_id);
      CREATE INDEX idx_bank_transactions_tenant_id ON bank_transactions(tenant_id);
      CREATE INDEX idx_bank_transactions_match_status ON bank_transactions(match_status);
    `);

    // 4. bank_reconciliation_items
    await queryRunner.query(`
      CREATE TABLE bank_reconciliation_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        transaction_id UUID NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,
        voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        match_type VARCHAR(50) NOT NULL DEFAULT 'EXACT_1_TO_1',
        allocated_amount NUMERIC(20, 4) NOT NULL,
        matched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        matched_by UUID NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_bank_recon_items_txn_id ON bank_reconciliation_items(transaction_id);
      CREATE INDEX idx_bank_recon_items_voucher_id ON bank_reconciliation_items(voucher_id);
      CREATE INDEX idx_bank_recon_items_tenant_id ON bank_reconciliation_items(tenant_id);
    `);

    // 5. sales_discovery_tickets
    await queryRunner.query(`
      CREATE TABLE sales_discovery_tickets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        transaction_id UUID NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
        classification VARCHAR(50) NULL,
        generated_voucher_id UUID NULL REFERENCES vouchers(id) ON DELETE SET NULL,
        notes TEXT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_sales_discovery_txn_id ON sales_discovery_tickets(transaction_id);
      CREATE INDEX idx_sales_discovery_tenant_id ON sales_discovery_tickets(tenant_id);
      CREATE INDEX idx_sales_discovery_status ON sales_discovery_tickets(status);
    `);

    // 6. Enable Row-Level Security (RLS) on all 5 tables
    const tables = [
      'bank_accounts',
      'bank_statements',
      'bank_transactions',
      'bank_reconciliation_items',
      'sales_discovery_tickets',
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
      'sales_discovery_tickets',
      'bank_reconciliation_items',
      'bank_transactions',
      'bank_statements',
      'bank_accounts',
    ];

    for (const table of tables) {
      await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table};`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
    }
  }
}
