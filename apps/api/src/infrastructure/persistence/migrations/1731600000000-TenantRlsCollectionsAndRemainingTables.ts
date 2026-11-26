import { MigrationInterface, QueryRunner } from 'typeorm';

export class TenantRlsCollectionsAndRemainingTables1731600000000 implements MigrationInterface {
  name = 'TenantRlsCollectionsAndRemainingTables1731600000000';

  private readonly tables = [
    'client_document_requests',
    'collection_reminders',
    'compliance_tasks',
    'document_snapshots',
    'firm_clients',
    'gateway_settlements',
    'notification_dispatch_logs',
    'notification_settings',
    'numbering_series',
    'party_addresses',
    'party_ledger_links',
    'party_registrations',
    'payment_links',
    'recurring_schedules',
    'report_shares',
    'staff_assignments',
    'task_comments',
    'user_favorite_reports',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      await queryRunner.query(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
      await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_policy ON "${table}";`);
      await queryRunner.query(`
        CREATE POLICY tenant_isolation_policy ON "${table}"
        USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
      `);
    }
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION resolve_shared_report_by_token(p_token text)
      RETURNS SETOF report_shares
      LANGUAGE sql
      SECURITY DEFINER
      SET search_path = public
      AS $$
        SELECT * FROM report_shares WHERE token = p_token LIMIT 1;
      $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
          GRANT EXECUTE ON FUNCTION resolve_shared_report_by_token(text) TO app_user;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS resolve_shared_report_by_token(text);`);
    for (const table of this.tables) {
      await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_policy ON "${table}";`);
      await queryRunner.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY;`);
    }
  }
}

