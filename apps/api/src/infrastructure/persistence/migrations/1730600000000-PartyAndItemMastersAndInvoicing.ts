import { MigrationInterface, QueryRunner } from 'typeorm';

export class PartyAndItemMastersAndInvoicing1730600000000 implements MigrationInterface {
  name = 'PartyAndItemMastersAndInvoicing1730600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. parties
    await queryRunner.query(`
      CREATE TABLE parties (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        trade_name VARCHAR(255) NULL,
        party_type VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER',
        gstin VARCHAR(15) NULL,
        pan VARCHAR(10) NULL,
        email VARCHAR(255) NULL,
        phone VARCHAR(50) NULL,
        billing_address_line1 VARCHAR(255) NULL,
        billing_address_line2 VARCHAR(255) NULL,
        billing_city VARCHAR(100) NULL,
        billing_state VARCHAR(100) NULL,
        billing_state_code VARCHAR(2) NOT NULL DEFAULT '27',
        billing_pincode VARCHAR(10) NULL,
        shipping_address_line1 VARCHAR(255) NULL,
        shipping_city VARCHAR(100) NULL,
        shipping_state_code VARCHAR(2) NULL,
        shipping_pincode VARCHAR(10) NULL,
        credit_limit NUMERIC(18, 4) NOT NULL DEFAULT 0,
        payment_terms_days INT NOT NULL DEFAULT 30,
        ledger_id UUID NULL REFERENCES ledgers(id) ON DELETE SET NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_parties_tenant_id ON parties(tenant_id);
      CREATE INDEX idx_parties_company_id ON parties(company_id);
      CREATE INDEX idx_parties_type ON parties(party_type);
      CREATE INDEX idx_parties_gstin ON parties(gstin);
    `);

    // 2. items
    await queryRunner.query(`
      CREATE TABLE items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        item_code VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        hsn_sac_code VARCHAR(20) NOT NULL,
        item_type VARCHAR(50) NOT NULL DEFAULT 'GOODS',
        uom VARCHAR(20) NOT NULL DEFAULT 'NOS',
        unit_price NUMERIC(18, 4) NOT NULL DEFAULT 0,
        gst_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
        cess_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        sales_ledger_id UUID NULL REFERENCES ledgers(id) ON DELETE SET NULL,
        purchase_ledger_id UUID NULL REFERENCES ledgers(id) ON DELETE SET NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_company_item_code UNIQUE(company_id, item_code)
      );
      CREATE INDEX idx_items_tenant_id ON items(tenant_id);
      CREATE INDEX idx_items_company_id ON items(company_id);
      CREATE INDEX idx_items_code ON items(item_code);
    `);

    // 3. invoices
    await queryRunner.query(`
      CREATE TABLE invoices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
        financial_year_id UUID NOT NULL REFERENCES financial_years(id) ON DELETE RESTRICT,
        party_id UUID NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
        invoice_number VARCHAR(100) NOT NULL,
        invoice_date DATE NOT NULL,
        due_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
        supply_type VARCHAR(50) NOT NULL DEFAULT 'INTRA_STATE',
        place_of_supply_state_code VARCHAR(2) NOT NULL,
        subtotal_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
        cgst_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
        sgst_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
        igst_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
        cess_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
        round_off_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
        total_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
        notes TEXT NULL,
        terms_and_conditions TEXT NULL,
        voucher_id UUID NULL REFERENCES vouchers(id) ON DELETE SET NULL,
        idempotency_key VARCHAR(255) NULL,
        approval_status VARCHAR(50) NOT NULL DEFAULT 'NONE',
        approved_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMP WITH TIME ZONE NULL,
        rejection_reason TEXT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        CONSTRAINT uq_company_invoice_number UNIQUE(company_id, invoice_number)
      );
      CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
      CREATE INDEX idx_invoices_company_id ON invoices(company_id);
      CREATE INDEX idx_invoices_party_id ON invoices(party_id);
      CREATE INDEX idx_invoices_status ON invoices(status);
      CREATE INDEX idx_invoices_approval_status ON invoices(approval_status);
    `);

    // 4. invoice_items
    await queryRunner.query(`
      CREATE TABLE invoice_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        item_id UUID NULL REFERENCES items(id) ON DELETE SET NULL,
        description VARCHAR(500) NOT NULL,
        hsn_sac_code VARCHAR(20) NOT NULL,
        quantity NUMERIC(18, 4) NOT NULL DEFAULT 1,
        uom VARCHAR(20) NOT NULL DEFAULT 'NOS',
        unit_price NUMERIC(18, 4) NOT NULL DEFAULT 0,
        discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        discount_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
        taxable_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
        gst_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        cgst_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
        sgst_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
        igst_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
        cess_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
        total_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_invoice_items_tenant_id ON invoice_items(tenant_id);
      CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
    `);

    // 5. approval_requests
    await queryRunner.query(`
      CREATE TABLE approval_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        request_type VARCHAR(50) NOT NULL DEFAULT 'HIGH_VALUE_INVOICE',
        requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        approver_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        action_timestamp TIMESTAMP WITH TIME ZONE NULL,
        comments TEXT NULL,
        metadata JSONB NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_approval_requests_tenant_id ON approval_requests(tenant_id);
      CREATE INDEX idx_approval_requests_company_id ON approval_requests(company_id);
      CREATE INDEX idx_approval_requests_status ON approval_requests(status);
      CREATE INDEX idx_approval_requests_entity ON approval_requests(entity_type, entity_id);
    `);

    // 6. notifications
    await queryRunner.query(`
      CREATE TABLE notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'INVOICE_ISSUED',
        entity_type VARCHAR(50) NULL,
        entity_id UUID NULL,
        is_read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_notifications_tenant_id ON notifications(tenant_id);
      CREATE INDEX idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX idx_notifications_read ON notifications(is_read);
    `);

    // 7. Enable Row-Level Security (RLS) on all 6 tables
    const tables = [
      'parties',
      'items',
      'invoices',
      'invoice_items',
      'approval_requests',
      'notifications',
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
      'notifications',
      'approval_requests',
      'invoice_items',
      'invoices',
      'items',
      'parties',
    ];

    for (const table of tables) {
      await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table};`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
    }
  }
}

