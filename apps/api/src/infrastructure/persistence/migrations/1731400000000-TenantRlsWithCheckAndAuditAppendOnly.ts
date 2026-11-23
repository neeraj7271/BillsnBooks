import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hardens tenant isolation and audit integrity:
 *  1. Adds a WITH CHECK clause to every tenant-isolation RLS policy so a row can
 *     never be INSERTed/UPDATEd into another tenant (USING alone only governs
 *     read/update/delete visibility, not the tenant_id written on INSERT).
 *  2. Makes `audit_logs` genuinely append-only by rejecting UPDATE and DELETE,
 *     so the tamper-evidence claim holds at the database level.
 *
 * All tenant policies share the identical qualifier, so we recreate them
 * uniformly regardless of their individual names.
 */
export class TenantRlsWithCheckAndAuditAppendOnly1731400000000
  implements MigrationInterface
{
  private readonly qual =
    "tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        r RECORD;
        v_qual text := '${this.qual}';
      BEGIN
        FOR r IN
          SELECT schemaname, tablename, policyname
          FROM pg_policies
          WHERE policyname LIKE '%tenant_isolation%'
        LOOP
          EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
          EXECUTE format(
            'CREATE POLICY %I ON %I.%I FOR ALL USING (%s) WITH CHECK (%s)',
            r.policyname, r.schemaname, r.tablename, v_qual, v_qual
          );
        END LOOP;
      END $$;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_audit_logs_append_only()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'audit_logs is append-only; % is not permitted', TG_OP;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`DROP TRIGGER IF EXISTS audit_logs_append_only ON audit_logs;`);
    await queryRunner.query(`
      CREATE TRIGGER audit_logs_append_only
      BEFORE UPDATE OR DELETE ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION trg_audit_logs_append_only();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS audit_logs_append_only ON audit_logs;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS trg_audit_logs_append_only();`);

    await queryRunner.query(`
      DO $$
      DECLARE
        r RECORD;
        v_qual text := '${this.qual}';
      BEGIN
        FOR r IN
          SELECT schemaname, tablename, policyname
          FROM pg_policies
          WHERE policyname LIKE '%tenant_isolation%'
        LOOP
          EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
          EXECUTE format(
            'CREATE POLICY %I ON %I.%I FOR ALL USING (%s)',
            r.policyname, r.schemaname, r.tablename, v_qual
          );
        END LOOP;
      END $$;
    `);
  }
}
