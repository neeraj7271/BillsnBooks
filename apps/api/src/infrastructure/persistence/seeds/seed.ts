import { AppDataSource } from '../data-source';
import * as argon2 from 'argon2';

export async function runSeed() {
  await AppDataSource.initialize();
  console.log('🌱 Connected to database for seeding...');

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const tenantId = 'a0000000-0000-4000-8000-000000000001';
    const userId = 'b0000000-0000-4000-8000-000000000001';
    const companyId = 'c0000000-0000-4000-8000-000000000001';
    const branchId = 'd0000000-0000-4000-8000-000000000001';
    const fyId = 'e0000000-0000-4000-8000-000000000001';

    // 1. Tenant
    await queryRunner.query(
      `INSERT INTO tenants (id, name, slug, plan)
       VALUES ($1, 'Acme Global Corp', 'acme-corp', 'ENTERPRISE')
       ON CONFLICT (slug) DO NOTHING;`,
      [tenantId],
    );

    // 2. User
    const passwordHash = await argon2.hash('Password@123');
    await queryRunner.query(
      `INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, 'admin@acme.com', $3, 'Rajesh', 'Sharma', 'FIRM_PARTNER', true)
       ON CONFLICT (email) DO NOTHING;`,
      [userId, tenantId, passwordHash],
    );

    // 3. Company
    await queryRunner.query(
      `INSERT INTO companies (id, tenant_id, legal_name, trade_name, default_currency, is_active)
       VALUES ($1, $2, 'Acme Solutions India Pvt Ltd', 'Acme Solutions', 'INR', true)
       ON CONFLICT (id) DO NOTHING;`,
      [companyId, tenantId],
    );

    // 4. Branch
    await queryRunner.query(
      `INSERT INTO branches (id, tenant_id, company_id, branch_name, gstin, state_code, is_head_office)
       VALUES ($1, $2, $3, 'Mumbai Corporate Office', '27AABCA1234F1Z5', '27', true)
       ON CONFLICT (id) DO NOTHING;`,
      [branchId, tenantId, companyId],
    );

    // 5. Financial Year
    await queryRunner.query(
      `INSERT INTO financial_years (id, tenant_id, company_id, name, start_date, end_date, is_closed)
       VALUES ($1, $2, $3, 'FY 2024-25', '2024-04-01', '2025-03-31', false)
       ON CONFLICT (id) DO NOTHING;`,
      [fyId, tenantId, companyId],
    );

    // 6. Ledger Groups
    const groupAssetsId = 'f0000000-0000-4000-8000-000000000001';
    const groupIncomeId = 'f0000000-0000-4000-8000-000000000002';
    const groupLiabilitiesId = 'f0000000-0000-4000-8000-000000000003';

    await queryRunner.query(
      `INSERT INTO ledger_groups (id, tenant_id, company_id, code, name, nature)
       VALUES 
        ($1, $4, $5, 'GRP-DEBTORS', 'Sundry Debtors', 'ASSET'),
        ($2, $4, $5, 'GRP-SALES', 'Sales Accounts', 'INCOME'),
        ($3, $4, $5, 'GRP-TAX', 'Duties & Taxes', 'LIABILITY')
       ON CONFLICT (id) DO NOTHING;`,
      [groupAssetsId, groupIncomeId, groupLiabilitiesId, tenantId, companyId],
    );

    // 7. Standard System Ledgers
    const ledgerSalesId = '10000000-0000-4000-8000-000000000001';
    const ledgerCgstId = '10000000-0000-4000-8000-000000000002';
    const ledgerSgstId = '10000000-0000-4000-8000-000000000003';
    const ledgerIgstId = '10000000-0000-4000-8000-000000000004';
    const ledgerParty1Id = '10000000-0000-4000-8000-000000000005';
    const ledgerParty2Id = '10000000-0000-4000-8000-000000000006';

    await queryRunner.query(
      `INSERT INTO ledgers (id, tenant_id, company_id, group_id, code, name, opening_balance, current_balance)
       VALUES 
        ($1, $7, $8, $9, 'LED-SALES', 'Domestic Sales Account', 0, 0),
        ($2, $7, $8, $10, 'LED-CGST', 'Output CGST Account', 0, 0),
        ($3, $7, $8, $10, 'LED-SGST', 'Output SGST Account', 0, 0),
        ($4, $7, $8, $10, 'LED-IGST', 'Output IGST Account', 0, 0),
        ($5, $7, $8, $11, 'LED-TATA', 'Tata Motors Commercial Ltd', 0, 0),
        ($6, $7, $8, $11, 'LED-RELIANCE', 'Reliance Retail Ventures', 0, 0)
       ON CONFLICT (id) DO NOTHING;`,
      [
        ledgerSalesId,
        ledgerCgstId,
        ledgerSgstId,
        ledgerIgstId,
        ledgerParty1Id,
        ledgerParty2Id,
        tenantId,
        companyId,
        groupIncomeId,
        groupLiabilitiesId,
        groupAssetsId,
      ],
    );

    // 8. Voucher Sequence for SALES
    await queryRunner.query(
      `INSERT INTO voucher_sequences (id, tenant_id, company_id, voucher_type, series, financial_year_id, last_sequence, prefix, suffix, padding)
       VALUES (uuid_generate_v4(), $1, $2, 'SALES', 'IMPORT', $3, 0, 'INV/', '/24-25', 4)
       ON CONFLICT DO NOTHING;`,
      [tenantId, companyId, fyId],
    );

    // 9. Tally Connector
    const connectorId = '20000000-0000-4000-8000-000000000001';
    await queryRunner.query(
      `INSERT INTO tally_connectors (id, tenant_id, company_id, machine_name, connector_version, tally_version, tally_port, status, last_heartbeat_at, active_tally_company)
       VALUES ($1, $2, $3, 'ACC-PROD-MUM-01', '2.1.0', 'TallyPrime 4.1', 9000, 'ONLINE', NOW(), 'Acme Solutions India Pvt Ltd')
       ON CONFLICT (id) DO NOTHING;`,
      [connectorId, tenantId, companyId],
    );

    // 10. Tally Masters cache
    await queryRunner.query(
      `INSERT INTO tally_masters (tenant_id, company_id, name, parent_group, gstin, state, opening_balance, is_party)
       VALUES 
        ($1, $2, 'Tata Motors Commercial Ltd', 'Sundry Debtors', '27AABCT2727Q1ZB', 'Maharashtra', 150000.00, true),
        ($1, $2, 'Reliance Retail Ventures', 'Sundry Debtors', '27AABCR4444N1ZR', 'Maharashtra', 285400.00, true),
        ($1, $2, 'Infosys Technologies', 'Sundry Debtors', '29AAACI4390F1Z4', 'Karnataka', 0.00, true)
       ON CONFLICT (company_id, name) DO NOTHING;`,
      [tenantId, companyId],
    );

    // 11. Bank Account (Phase 2)
    const bankAccountId = '30000000-0000-4000-8000-000000000001';
    const bankLedgerId = '10000000-0000-4000-8000-000000000007';
    const groupBankId = 'f0000000-0000-4000-8000-000000000004';

    await queryRunner.query(
      `INSERT INTO ledger_groups (id, tenant_id, company_id, code, name, nature)
       VALUES ($1, $2, $3, 'GRP-BANK', 'Bank Accounts', 'ASSET')
       ON CONFLICT (id) DO NOTHING;`,
      [groupBankId, tenantId, companyId],
    );

    await queryRunner.query(
      `INSERT INTO ledgers (id, tenant_id, company_id, group_id, code, name, opening_balance, current_balance, is_bank_or_cash)
       VALUES ($1, $2, $3, $4, 'LED-HDFC', 'HDFC Bank Current A/c - 5678', 1250000.00, 1250000.00, true)
       ON CONFLICT (id) DO NOTHING;`,
      [bankLedgerId, tenantId, companyId, groupBankId],
    );

    await queryRunner.query(
      `INSERT INTO bank_accounts (id, tenant_id, company_id, branch_id, bank_name, account_number_encrypted, ifsc_code, account_type, ledger_id, opening_balance, current_balance, currency)
       VALUES ($1, $2, $3, $4, 'HDFC Bank', '50200012345678', 'HDFC0000060', 'CURRENT', $5, 1250000.00, 1250000.00, 'INR')
       ON CONFLICT (id) DO NOTHING;`,
      [bankAccountId, tenantId, companyId, branchId, bankLedgerId],
    );

    // 12. Demo Parties (Customers & Vendors) (Phase 4)
    const party1Id = '70000000-0000-4000-8000-000000000001';
    const party2Id = '70000000-0000-4000-8000-000000000002';
    await queryRunner.query(
      `INSERT INTO parties (id, tenant_id, company_id, name, trade_name, party_type, gstin, pan, email, phone, billing_address_line1, billing_city, billing_state, billing_state_code, billing_pincode, credit_limit, payment_terms_days, ledger_id)
       VALUES 
        ($1, $3, $4, 'Tata Motors Commercial Ltd', 'Tata Motors', 'CUSTOMER', '27AAACT2727Q1ZW', 'AAACT2727Q', 'accounts@tatamotors.com', '+91 22 6665 8282', 'Bombay House, 24 Homi Mody Street', 'Mumbai', 'Maharashtra', '27', '400001', 5000000, 30, $5),
        ($2, $3, $4, 'Reliance Retail Ventures', 'Reliance Retail', 'CUSTOMER', '24AAACR4534K1ZV', 'AAACR4534K', 'billing@relianceretail.com', '+91 79 3503 1200', 'Reliance House, Near Mithakhali Six Roads', 'Ahmedabad', 'Gujarat', '24', '380006', 10000000, 45, $6)
       ON CONFLICT (id) DO NOTHING;`,
      [party1Id, party2Id, tenantId, companyId, ledgerParty1Id, ledgerParty2Id],
    );

    // 13. Demo Inventory Items & Services (Phase 4)
    const item1Id = '80000000-0000-4000-8000-000000000001';
    const item2Id = '80000000-0000-4000-8000-000000000002';
    const item3Id = '80000000-0000-4000-8000-000000000003';
    await queryRunner.query(
      `INSERT INTO items (id, tenant_id, company_id, item_code, name, description, hsn_sac_code, item_type, uom, unit_price, gst_rate_percent, sales_ledger_id)
       VALUES 
        ($1, $4, $5, 'ITM-CON-001', 'Cloud Architecture & Security Advisory', 'High-availability architecture design and SOC2 compliance consulting', '998311', 'SERVICES', 'HRS', 50000.00, 18.00, $6),
        ($2, $4, $5, 'ITM-LIC-002', 'Enterprise Platform Software Subscription', 'Annual enterprise node licensing and updates', '997331', 'GOODS', 'NOS', 120000.00, 18.00, $6),
        ($3, $4, $5, 'ITM-SUP-003', 'Dedicated Technical Support (Monthly)', '24/7 SLA enterprise support and incident response', '998313', 'SERVICES', 'NOS', 25000.00, 18.00, $6)
       ON CONFLICT (id) DO NOTHING;`,
      [item1Id, item2Id, item3Id, tenantId, companyId, ledgerSalesId],
    );

    await queryRunner.commitTransaction();
    console.log('✅ Database seeded successfully with enterprise demo tenant, company, ledgers, and Tally connector!');
  } catch (err) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Error during seeding:', err);
    throw err;
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

if (require.main === module) {
  runSeed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
