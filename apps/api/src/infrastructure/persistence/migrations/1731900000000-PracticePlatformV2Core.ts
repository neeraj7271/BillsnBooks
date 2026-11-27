import { MigrationInterface, QueryRunner } from 'typeorm';

export class PracticePlatformV2Core1731900000000 implements MigrationInterface {
  name = 'PracticePlatformV2Core1731900000000';

  private readonly newTables = [
    'service_types',
    'client_services',
    'client_credentials',
    'practice_custom_fields',
    'practice_labels',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. service_types
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "code" character varying(60) NOT NULL,
        "category" character varying(80) NOT NULL DEFAULT 'General',
        "description" text,
        "frequency" character varying(30) NOT NULL DEFAULT 'MONTHLY',
        "custom_recurrence_rule" character varying(255),
        "default_due_date_rule" jsonb NOT NULL DEFAULT '{"basis":"period_end","offsetDays":20}',
        "default_stages" jsonb NOT NULL DEFAULT '[]',
        "default_checklist" jsonb NOT NULL DEFAULT '[]',
        "default_assignee_role" character varying(60),
        "default_priority" character varying(20) NOT NULL DEFAULT 'MEDIUM',
        "estimated_hours" numeric(6,2) NOT NULL DEFAULT 2,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_system_seeded" boolean NOT NULL DEFAULT false,
        "sort_order" integer NOT NULL DEFAULT 100,
        "statutory_form_ref" character varying(80),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_types" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_service_types_tenant_id" ON "service_types" ("tenant_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_service_types_code" ON "service_types" ("code");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_service_types_category" ON "service_types" ("category");`);

    // 2. client_services
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "client_services" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "service_type_id" uuid NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date,
        "fee_amount" numeric(14,2),
        "fee_type" character varying(30) NOT NULL DEFAULT 'recurring',
        "assigned_staff_id" uuid,
        "custom_stages" jsonb,
        "custom_due_rule" jsonb,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_services" PRIMARY KEY ("id"),
        CONSTRAINT "FK_client_services_client" FOREIGN KEY ("client_id") REFERENCES "firm_clients"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_client_services_service" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_client_services_tenant_id" ON "client_services" ("tenant_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_client_services_client_id" ON "client_services" ("client_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_client_services_service_type_id" ON "client_services" ("service_type_id");`);

    // 3. client_credentials
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "client_credentials" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "label" character varying(120) NOT NULL,
        "portal_type" character varying(60) NOT NULL DEFAULT 'GST',
        "username" character varying(255) NOT NULL,
        "password_encrypted" text NOT NULL,
        "url" character varying(500),
        "notes" text,
        "last_updated_by_user_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_credentials" PRIMARY KEY ("id"),
        CONSTRAINT "FK_client_credentials_client" FOREIGN KEY ("client_id") REFERENCES "firm_clients"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_client_credentials_tenant_id" ON "client_credentials" ("tenant_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_client_credentials_client_id" ON "client_credentials" ("client_id");`);

    // 4. practice_custom_fields
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "practice_custom_fields" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "entity_type" character varying(20) NOT NULL,
        "field_key" character varying(80) NOT NULL,
        "label" character varying(120) NOT NULL,
        "field_type" character varying(30) NOT NULL DEFAULT 'text',
        "options" jsonb NOT NULL DEFAULT '[]',
        "is_required" boolean NOT NULL DEFAULT false,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_practice_custom_fields" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_practice_custom_fields_tenant_id" ON "practice_custom_fields" ("tenant_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_practice_custom_fields_entity" ON "practice_custom_fields" ("entity_type");`);

    // 5. practice_labels
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "practice_labels" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(80) NOT NULL,
        "color" character varying(30) NOT NULL DEFAULT 'brand',
        "entity_type" character varying(20) NOT NULL DEFAULT 'ALL',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_practice_labels" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_practice_labels_tenant_id" ON "practice_labels" ("tenant_id");`);

    // 6. Extend firm_clients
    await queryRunner.query(`
      ALTER TABLE "firm_clients"
        ADD COLUMN IF NOT EXISTS "entity_type" character varying(50) NOT NULL DEFAULT 'Pvt Ltd',
        ADD COLUMN IF NOT EXISTS "incorporation_date" date,
        ADD COLUMN IF NOT EXISTS "cin" character varying(30),
        ADD COLUMN IF NOT EXISTS "tan" character varying(20),
        ADD COLUMN IF NOT EXISTS "aadhaar_masked" character varying(20),
        ADD COLUMN IF NOT EXISTS "registered_address" text,
        ADD COLUMN IF NOT EXISTS "gstins" jsonb NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS "fy_preference" character varying(20) NOT NULL DEFAULT 'APR_MAR',
        ADD COLUMN IF NOT EXISTS "is_vip" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "assigned_partner_id" uuid,
        ADD COLUMN IF NOT EXISTS "custom_fields" jsonb NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS "labels" jsonb NOT NULL DEFAULT '[]';
    `);

    // 7. Extend workflow_templates
    await queryRunner.query(`
      ALTER TABLE "workflow_templates"
        ADD COLUMN IF NOT EXISTS "service_type_id" uuid,
        ADD COLUMN IF NOT EXISTS "is_default" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "stage_configs" jsonb NOT NULL DEFAULT '[]';
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_workflow_templates_service_type_id" ON "workflow_templates" ("service_type_id");`);

    // 8. Extend practice_jobs
    await queryRunner.query(`
      ALTER TABLE "practice_jobs"
        ADD COLUMN IF NOT EXISTS "service_type_id" uuid,
        ADD COLUMN IF NOT EXISTS "stages" jsonb NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS "custom_fields" jsonb NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS "labels" jsonb NOT NULL DEFAULT '[]';
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_practice_jobs_service_type_id" ON "practice_jobs" ("service_type_id");`);

    // 9. Extend compliance_tasks
    await queryRunner.query(`
      ALTER TABLE "compliance_tasks"
        ADD COLUMN IF NOT EXISTS "service_type_id" uuid;
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_compliance_tasks_service_type_id" ON "compliance_tasks" ("service_type_id");`);

    // 10. RLS + app_user grants on new tables
    for (const table of this.newTables) {
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
          GRANT SELECT, INSERT, UPDATE, DELETE ON "service_types", "client_services", "client_credentials", "practice_custom_fields", "practice_labels" TO app_user;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_compliance_tasks_service_type_id";`);
    await queryRunner.query(`ALTER TABLE "compliance_tasks" DROP COLUMN IF EXISTS "service_type_id";`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_practice_jobs_service_type_id";`);
    await queryRunner.query(`
      ALTER TABLE "practice_jobs"
        DROP COLUMN IF EXISTS "labels",
        DROP COLUMN IF EXISTS "custom_fields",
        DROP COLUMN IF EXISTS "stages",
        DROP COLUMN IF EXISTS "service_type_id";
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workflow_templates_service_type_id";`);
    await queryRunner.query(`
      ALTER TABLE "workflow_templates"
        DROP COLUMN IF EXISTS "stage_configs",
        DROP COLUMN IF EXISTS "is_active",
        DROP COLUMN IF EXISTS "is_default",
        DROP COLUMN IF EXISTS "service_type_id";
    `);

    await queryRunner.query(`
      ALTER TABLE "firm_clients"
        DROP COLUMN IF EXISTS "labels",
        DROP COLUMN IF EXISTS "custom_fields",
        DROP COLUMN IF EXISTS "assigned_partner_id",
        DROP COLUMN IF EXISTS "is_vip",
        DROP COLUMN IF EXISTS "fy_preference",
        DROP COLUMN IF EXISTS "gstins",
        DROP COLUMN IF EXISTS "registered_address",
        DROP COLUMN IF EXISTS "aadhaar_masked",
        DROP COLUMN IF EXISTS "tan",
        DROP COLUMN IF EXISTS "cin",
        DROP COLUMN IF EXISTS "incorporation_date",
        DROP COLUMN IF EXISTS "entity_type";
    `);

    for (const table of [...this.newTables].reverse()) {
      await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_policy ON "${table}";`);
      await queryRunner.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY;`);
      await queryRunner.query(`DROP TABLE IF EXISTS "${table}";`);
    }
  }
}
