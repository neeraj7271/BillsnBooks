import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchemaAndInvariants1730300000000 implements MigrationInterface {
  name = 'InitialSchemaAndInvariants1730300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // 2. Tenants Table
    await queryRunner.query(`
      CREATE TABLE tenants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        plan VARCHAR(50) NOT NULL DEFAULT 'STARTER',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    // 3. Users Table
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone_encrypted TEXT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'STAFF_ACCOUNTANT',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        refresh_token_hash VARCHAR(255) NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_users_tenant_id ON users(tenant_id);
    `);

    // 4. Companies Table
    await queryRunner.query(`
      CREATE TABLE companies (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        legal_name VARCHAR(255) NOT NULL,
        trade_name VARCHAR(255) NULL,
        pan_encrypted TEXT NULL,
        default_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_companies_tenant_id ON companies(tenant_id);
    `);

    // 5. Branches Table
    await queryRunner.query(`
      CREATE TABLE branches (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        branch_name VARCHAR(150) NOT NULL,
        gstin VARCHAR(15) NULL,
        state_code VARCHAR(2) NOT NULL,
        address_line1 VARCHAR(255) NULL,
        pincode VARCHAR(10) NULL,
        is_head_office BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_branches_tenant_id ON branches(tenant_id);
      CREATE INDEX idx_branches_company_id ON branches(company_id);
    `);

    // 6. Financial Years Table
    await queryRunner.query(`
      CREATE TABLE financial_years (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_closed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_financial_years_tenant_id ON financial_years(tenant_id);
      CREATE INDEX idx_financial_years_company_id ON financial_years(company_id);
    `);

    // 7. Accounting Periods Table
    await queryRunner.query(`
      CREATE TABLE accounting_periods (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        financial_year_id UUID NOT NULL REFERENCES financial_years(id) ON DELETE CASCADE,
        period_name VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_locked BOOLEAN NOT NULL DEFAULT FALSE,
        locked_at TIMESTAMP NULL,
        locked_by UUID NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_accounting_periods_tenant_id ON accounting_periods(tenant_id);
      CREATE INDEX idx_accounting_periods_company_id ON accounting_periods(company_id);
      CREATE INDEX idx_accounting_periods_fy_id ON accounting_periods(financial_year_id);
    `);

    // 8. Ledger Groups Table
    await queryRunner.query(`
      CREATE TABLE ledger_groups (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        parent_group_id UUID NULL REFERENCES ledger_groups(id) ON DELETE SET NULL,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(150) NOT NULL,
        nature VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_ledger_groups_tenant_id ON ledger_groups(tenant_id);
      CREATE INDEX idx_ledger_groups_company_id ON ledger_groups(company_id);
    `);

    // 9. Ledgers Table
    await queryRunner.query(`
      CREATE TABLE ledgers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        group_id UUID NOT NULL REFERENCES ledger_groups(id) ON DELETE RESTRICT,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(150) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'INR',
        opening_balance NUMERIC(20,4) NOT NULL DEFAULT 0.0000,
        current_balance NUMERIC(20,4) NOT NULL DEFAULT 0.0000,
        is_bank_or_cash BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_ledgers_tenant_id ON ledgers(tenant_id);
      CREATE INDEX idx_ledgers_company_id ON ledgers(company_id);
      CREATE INDEX idx_ledgers_group_id ON ledgers(group_id);
    `);

    // 10. Voucher Sequences Table
    await queryRunner.query(`
      CREATE TABLE voucher_sequences (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        voucher_type VARCHAR(50) NOT NULL,
        series VARCHAR(50) NOT NULL DEFAULT 'DEFAULT',
        financial_year_id UUID NOT NULL REFERENCES financial_years(id) ON DELETE CASCADE,
        last_sequence BIGINT NOT NULL DEFAULT 0,
        prefix VARCHAR(20) NOT NULL DEFAULT '',
        suffix VARCHAR(20) NOT NULL DEFAULT '',
        padding INT NOT NULL DEFAULT 4,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_company_voucher_sequence UNIQUE (company_id, voucher_type, series, financial_year_id)
      );
      CREATE INDEX idx_voucher_sequences_tenant_id ON voucher_sequences(tenant_id);
      CREATE INDEX idx_voucher_sequences_company_id ON voucher_sequences(company_id);
    `);

    // 11. Vouchers Table
    await queryRunner.query(`
      CREATE TABLE vouchers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
        branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
        financial_year_id UUID NOT NULL REFERENCES financial_years(id) ON DELETE RESTRICT,
        voucher_type VARCHAR(50) NOT NULL,
        voucher_number VARCHAR(100) NOT NULL,
        voucher_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
        total_amount NUMERIC(20,4) NOT NULL DEFAULT 0.0000,
        idempotency_key VARCHAR(255) NULL,
        reversal_of_id UUID NULL,
        narration TEXT NULL,
        created_by UUID NULL,
        version INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_vouchers_tenant_id ON vouchers(tenant_id);
      CREATE INDEX idx_vouchers_company_id ON vouchers(company_id);
      CREATE INDEX idx_vouchers_branch_id ON vouchers(branch_id);
      CREATE INDEX idx_vouchers_voucher_date ON vouchers(voucher_date);
      CREATE UNIQUE INDEX idx_vouchers_idempotency ON vouchers(tenant_id, company_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
    `);

    // 12. Journal Entries Table
    await queryRunner.query(`
      CREATE TABLE journal_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
        ledger_id UUID NOT NULL REFERENCES ledgers(id) ON DELETE RESTRICT,
        entry_type VARCHAR(10) NOT NULL,
        amount NUMERIC(20,4) NOT NULL,
        foreign_amount NUMERIC(20,4) NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'INR',
        narration TEXT NULL,
        line_index INT NOT NULL,
        CONSTRAINT chk_journal_entry_amount_positive CHECK (amount > 0),
        CONSTRAINT chk_journal_entry_type CHECK (entry_type IN ('DEBIT', 'CREDIT'))
      );
      CREATE INDEX idx_journal_entries_tenant_id ON journal_entries(tenant_id);
      CREATE INDEX idx_journal_entries_voucher_id ON journal_entries(voucher_id);
      CREATE INDEX idx_journal_entries_ledger_id ON journal_entries(ledger_id);
    `);

    // 13. Outbox Table
    await queryRunner.query(`
      CREATE TABLE outbox (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        aggregate_type VARCHAR(100) NOT NULL,
        aggregate_id UUID NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        retry_count INT NOT NULL DEFAULT 0,
        error_message TEXT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        published_at TIMESTAMP NULL
      );
      CREATE INDEX idx_outbox_tenant_id ON outbox(tenant_id);
      CREATE INDEX idx_outbox_status ON outbox(status);
      CREATE INDEX idx_outbox_aggregate ON outbox(aggregate_type, aggregate_id);
    `);

    // 14. Audit Logs Table
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NULL,
        actor_id UUID NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id UUID NOT NULL,
        action VARCHAR(50) NOT NULL,
        payload_before JSONB NULL,
        payload_after JSONB NULL,
        record_hash CHAR(64) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
      CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
    `);

    // =========================================================================
    // DATABASE INVARIANTS: RAW SQL FUNCTIONS & TRIGGERS
    // =========================================================================

    // A. Deferred Balancing Trigger on journal_entries
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_verify_voucher_balance()
      RETURNS TRIGGER AS $$
      DECLARE
        v_diff NUMERIC(20,4);
        v_status VARCHAR(50);
      BEGIN
        -- Check if parent voucher is in POSTED status
        SELECT status INTO v_status FROM vouchers WHERE id = NEW.voucher_id;

        IF v_status = 'POSTED' THEN
          SELECT COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE -amount END), 0)
          INTO v_diff
          FROM journal_entries
          WHERE voucher_id = NEW.voucher_id;

          IF v_diff <> 0 THEN
            RAISE EXCEPTION 'Voucher % is unbalanced. Difference: %', NEW.voucher_id, v_diff;
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE CONSTRAINT TRIGGER check_voucher_balance_deferred
      AFTER INSERT OR UPDATE ON journal_entries
      DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW EXECUTE FUNCTION trg_verify_voucher_balance();
    `);

    // B. Immutability Trigger on POSTED vouchers
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_enforce_posted_immutability()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.status = 'POSTED' AND TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'Posted voucher % cannot be deleted. Use reversal instead.', OLD.id;
        END IF;

        IF OLD.status = 'POSTED' AND TG_OP = 'UPDATE' THEN
          -- Allow status transition from POSTED to REVERSED only
          IF NEW.status = 'REVERSED' AND OLD.total_amount = NEW.total_amount THEN
            RETURN NEW;
          END IF;
          RAISE EXCEPTION 'Posted voucher % is immutable and cannot be updated.', OLD.id;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER enforce_voucher_immutability
      BEFORE UPDATE OR DELETE ON vouchers
      FOR EACH ROW EXECUTE FUNCTION trg_enforce_posted_immutability();
    `);

    // C. Immutability Trigger on journal_entries of POSTED vouchers
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_enforce_journal_entry_immutability()
      RETURNS TRIGGER AS $$
      DECLARE
        v_status VARCHAR(50);
      BEGIN
        SELECT status INTO v_status FROM vouchers WHERE id = OLD.voucher_id;
        IF v_status = 'POSTED' THEN
          RAISE EXCEPTION 'Journal entry % belongs to posted voucher % and cannot be altered or deleted.', OLD.id, OLD.voucher_id;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER enforce_journal_entry_immutability
      BEFORE UPDATE OR DELETE ON journal_entries
      FOR EACH ROW EXECUTE FUNCTION trg_enforce_journal_entry_immutability();
    `);

    // D. Accounting Period Lock Trigger on vouchers
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_check_period_lock()
      RETURNS TRIGGER AS $$
      DECLARE
        v_locked BOOLEAN;
      BEGIN
        SELECT is_locked INTO v_locked
        FROM accounting_periods
        WHERE company_id = NEW.company_id
          AND NEW.voucher_date BETWEEN start_date AND end_date;

        IF v_locked IS TRUE THEN
          RAISE EXCEPTION 'Accounting period for date % is locked. Posting prohibited.', NEW.voucher_date;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER check_period_lock_before_voucher_insert
      BEFORE INSERT OR UPDATE ON vouchers
      FOR EACH ROW EXECUTE FUNCTION trg_check_period_lock();
    `);

    // =========================================================================
    // POSTGRESQL ROW-LEVEL SECURITY (RLS) POLICIES
    // =========================================================================
    const tenantTables = [
      'users',
      'companies',
      'branches',
      'financial_years',
      'accounting_periods',
      'ledger_groups',
      'ledgers',
      'voucher_sequences',
      'vouchers',
      'journal_entries',
      'outbox',
      'audit_logs',
    ];

    for (const table of tenantTables) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
      await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`);
      await queryRunner.query(`
        CREATE POLICY tenant_isolation_${table} ON ${table}
        FOR ALL
        USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tenantTables = [
      'audit_logs',
      'outbox',
      'journal_entries',
      'vouchers',
      'voucher_sequences',
      'ledgers',
      'ledger_groups',
      'accounting_periods',
      'financial_years',
      'branches',
      'companies',
      'users',
    ];

    for (const table of tenantTables) {
      await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_${table} ON ${table};`);
      await queryRunner.query(`ALTER TABLE IF EXISTS ${table} DISABLE ROW LEVEL SECURITY;`);
    }

    // Drop Triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS check_period_lock_before_voucher_insert ON vouchers;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS trg_check_period_lock();`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS enforce_journal_entry_immutability ON journal_entries;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS trg_enforce_journal_entry_immutability();`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS enforce_voucher_immutability ON vouchers;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS trg_enforce_posted_immutability();`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS check_voucher_balance_deferred ON journal_entries;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS trg_verify_voucher_balance();`);

    // Drop Tables in reverse order
    for (const table of tenantTables) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
    }

    await queryRunner.query(`DROP TABLE IF EXISTS tenants CASCADE;`);
  }
}

