import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentVaultAndStorage1731700000000 implements MigrationInterface {
  name = 'DocumentVaultAndStorage1731700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "document_folders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "parent_id" uuid,
        "name" character varying(150) NOT NULL,
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_document_folders" PRIMARY KEY ("id"),
        CONSTRAINT "FK_document_folders_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_document_folders_client" FOREIGN KEY ("client_id") REFERENCES "firm_clients"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_document_folders_tenant_id" ON "document_folders" ("tenant_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_document_folders_client_id" ON "document_folders" ("client_id");`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "document_files" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "folder_id" uuid,
        "request_id" uuid,
        "file_group_id" uuid NOT NULL,
        "storage_key" character varying(1024) NOT NULL,
        "file_name" character varying(255) NOT NULL,
        "mime_type" character varying(150) NOT NULL,
        "size_bytes" bigint NOT NULL,
        "sha256" character(64) NOT NULL,
        "uploaded_by_user_id" uuid,
        "uploaded_by_name" character varying(255),
        "version" integer NOT NULL DEFAULT 1,
        "is_latest" boolean NOT NULL DEFAULT true,
        "is_deleted" boolean NOT NULL DEFAULT false,
        "deleted_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_document_files" PRIMARY KEY ("id"),
        CONSTRAINT "FK_document_files_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_document_files_client" FOREIGN KEY ("client_id") REFERENCES "firm_clients"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_document_files_folder" FOREIGN KEY ("folder_id") REFERENCES "document_folders"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_document_files_request" FOREIGN KEY ("request_id") REFERENCES "client_document_requests"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_document_files_tenant_id" ON "document_files" ("tenant_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_document_files_client_id" ON "document_files" ("client_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_document_files_folder_id" ON "document_files" ("folder_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_document_files_request_id" ON "document_files" ("request_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_document_files_file_group_id" ON "document_files" ("file_group_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_document_files_is_latest" ON "document_files" ("is_latest");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_document_files_is_deleted" ON "document_files" ("is_deleted");`);

    for (const table of ['document_folders', 'document_files']) {
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
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
          GRANT SELECT, INSERT, UPDATE, DELETE ON "document_folders", "document_files" TO app_user;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['document_files', 'document_folders']) {
      await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_policy ON "${table}";`);
      await queryRunner.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY;`);
    }
    await queryRunner.query(`DROP TABLE IF EXISTS "document_files";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "document_folders";`);
  }
}
