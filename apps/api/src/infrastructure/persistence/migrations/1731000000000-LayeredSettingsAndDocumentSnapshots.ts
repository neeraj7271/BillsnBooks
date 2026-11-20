import { MigrationInterface, QueryRunner } from 'typeorm';

export class LayeredSettingsAndDocumentSnapshots1731000000000 implements MigrationInterface {
  name = 'LayeredSettingsAndDocumentSnapshots1731000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE setting_scope_enum AS ENUM ('PLATFORM', 'TENANT', 'COMPANY', 'BRANCH', 'DOC_TYPE', 'USER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS setting_values (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        setting_key VARCHAR(128) NOT NULL,
        scope setting_scope_enum NOT NULL DEFAULT 'PLATFORM',
        scope_id UUID NULL,
        value JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by UUID NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_setting_values_unique 
        ON setting_values(setting_key, scope, COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'::uuid));

      CREATE INDEX IF NOT EXISTS idx_setting_values_lookup 
        ON setting_values(setting_key, scope, scope_id);

      CREATE TABLE IF NOT EXISTS setting_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        setting_key VARCHAR(128) NOT NULL,
        scope setting_scope_enum NOT NULL,
        scope_id UUID NULL,
        old_value JSONB NULL,
        new_value JSONB NULL,
        changed_by UUID NULL,
        change_reason TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_setting_history_key 
        ON setting_history(setting_key, scope, scope_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS document_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        company_id UUID NOT NULL,
        document_type VARCHAR(32) NOT NULL,
        document_id UUID NOT NULL,
        snapshot_data JSONB NOT NULL,
        sha256_hash VARCHAR(64) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_document_snapshots_lookup 
        ON document_snapshots(document_type, document_id);

      CREATE INDEX IF NOT EXISTS idx_document_snapshots_company 
        ON document_snapshots(company_id, created_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS document_snapshots;
      DROP TABLE IF EXISTS setting_history;
      DROP TABLE IF EXISTS setting_values;
      DROP TYPE IF EXISTS setting_scope_enum;
    `);
  }
}
