import { MigrationInterface, QueryRunner } from 'typeorm';

export class CollectionsAndRecurringInvoices1730800000000 implements MigrationInterface {
  name = 'CollectionsAndRecurringInvoices1730800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. recurring_schedules
    await queryRunner.query(`
      CREATE TABLE recurring_schedules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
        frequency VARCHAR(32) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        next_run_date DATE NOT NULL,
        last_run_date DATE NULL,
        end_date DATE NULL,
        template_payload JSONB NOT NULL,
        total_runs INT NOT NULL DEFAULT 0,
        max_runs INT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_recurring_schedules_tenant ON recurring_schedules(tenant_id);
      CREATE INDEX idx_recurring_schedules_company ON recurring_schedules(company_id);
      CREATE INDEX idx_recurring_schedules_next_run ON recurring_schedules(status, next_run_date);
    `);

    // 2. payment_links
    await queryRunner.query(`
      CREATE TABLE payment_links (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
        provider VARCHAR(32) NOT NULL DEFAULT 'RAZORPAY',
        link_id VARCHAR(128) NOT NULL UNIQUE,
        short_url VARCHAR(512) NOT NULL,
        amount NUMERIC(20,4) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        status VARCHAR(32) NOT NULL DEFAULT 'CREATED',
        paid_at TIMESTAMP WITH TIME ZONE NULL,
        expires_at TIMESTAMP WITH TIME ZONE NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_payment_links_tenant ON payment_links(tenant_id);
      CREATE INDEX idx_payment_links_invoice ON payment_links(invoice_id);
      CREATE INDEX idx_payment_links_status ON payment_links(status);
    `);

    // 3. gateway_settlements
    await queryRunner.query(`
      CREATE TABLE gateway_settlements (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        settlement_id VARCHAR(128) NOT NULL UNIQUE,
        provider VARCHAR(32) NOT NULL DEFAULT 'RAZORPAY',
        settlement_date DATE NOT NULL,
        gross_amount NUMERIC(20,4) NOT NULL,
        fee_amount NUMERIC(20,4) NOT NULL,
        tax_on_fee NUMERIC(20,4) NOT NULL,
        net_credit_amount NUMERIC(20,4) NOT NULL,
        bank_reference VARCHAR(128) NULL,
        voucher_id UUID NULL REFERENCES vouchers(id) ON DELETE SET NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'RECONCILED',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_gateway_settlements_tenant ON gateway_settlements(tenant_id);
      CREATE INDEX idx_gateway_settlements_company ON gateway_settlements(company_id);
    `);

    // 4. collection_reminders
    await queryRunner.query(`
      CREATE TABLE collection_reminders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
        channel VARCHAR(32) NOT NULL DEFAULT 'WHATSAPP',
        cadence VARCHAR(64) NOT NULL,
        recipient VARCHAR(255) NOT NULL,
        message_body TEXT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'SENT',
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE INDEX idx_collection_reminders_tenant ON collection_reminders(tenant_id);
      CREATE INDEX idx_collection_reminders_invoice ON collection_reminders(invoice_id);
      CREATE INDEX idx_collection_reminders_party ON collection_reminders(party_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS collection_reminders CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS gateway_settlements CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS payment_links CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS recurring_schedules CASCADE;`);
  }
}

