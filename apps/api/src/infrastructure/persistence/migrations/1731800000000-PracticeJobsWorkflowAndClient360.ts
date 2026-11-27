import { MigrationInterface, QueryRunner } from 'typeorm';

export class PracticeJobsWorkflowAndClient3601731800000 implements MigrationInterface {
  name = 'PracticeJobsWorkflowAndClient3601731800000';

  private readonly tables = [
    'workflow_templates',
    'practice_jobs',
    'practice_job_comments',
    'client_contacts',
    'practice_time_entries',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workflow_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "job_type" character varying(80) NOT NULL,
        "description" text,
        "is_recurring" boolean NOT NULL DEFAULT false,
        "recurrence_frequency" character varying(30),
        "default_due_day" integer NOT NULL DEFAULT 20,
        "stages" jsonb NOT NULL DEFAULT '[]',
        "checklist" jsonb NOT NULL DEFAULT '[]',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workflow_templates" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_workflow_templates_tenant_id" ON "workflow_templates" ("tenant_id");`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "practice_jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "template_id" uuid,
        "title" character varying(255) NOT NULL,
        "job_type" character varying(80) NOT NULL,
        "period" character varying(40) NOT NULL,
        "stage" character varying(40) NOT NULL DEFAULT 'BACKLOG',
        "priority" character varying(20) NOT NULL DEFAULT 'MEDIUM',
        "due_date" date NOT NULL,
        "assigned_to_user_id" uuid,
        "is_recurring" boolean NOT NULL DEFAULT false,
        "recurrence_frequency" character varying(30),
        "next_spawned_job_id" uuid,
        "filing_ack_number" character varying(120),
        "checklist" jsonb NOT NULL DEFAULT '[]',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_practice_jobs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_practice_jobs_client" FOREIGN KEY ("client_id") REFERENCES "firm_clients"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_practice_jobs_template" FOREIGN KEY ("template_id") REFERENCES "workflow_templates"("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_practice_jobs_tenant_id" ON "practice_jobs" ("tenant_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_practice_jobs_client_id" ON "practice_jobs" ("client_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_practice_jobs_stage" ON "practice_jobs" ("stage");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_practice_jobs_due_date" ON "practice_jobs" ("due_date");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_practice_jobs_assigned_to" ON "practice_jobs" ("assigned_to_user_id");`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "practice_job_comments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "job_id" uuid NOT NULL,
        "user_id" uuid,
        "author_name" character varying(255) NOT NULL,
        "comment" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_practice_job_comments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_practice_job_comments_job" FOREIGN KEY ("job_id") REFERENCES "practice_jobs"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_practice_job_comments_tenant_id" ON "practice_job_comments" ("tenant_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_practice_job_comments_job_id" ON "practice_job_comments" ("job_id");`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "client_contacts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "role" character varying(80) NOT NULL,
        "email" character varying(255),
        "phone" character varying(50),
        "is_primary" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_contacts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_client_contacts_client" FOREIGN KEY ("client_id") REFERENCES "firm_clients"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_client_contacts_tenant_id" ON "client_contacts" ("tenant_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_client_contacts_client_id" ON "client_contacts" ("client_id");`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "practice_time_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "job_id" uuid,
        "user_id" uuid NOT NULL,
        "minutes" integer NOT NULL DEFAULT 0,
        "is_billable" boolean NOT NULL DEFAULT true,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_practice_time_entries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_practice_time_entries_client" FOREIGN KEY ("client_id") REFERENCES "firm_clients"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_practice_time_entries_job" FOREIGN KEY ("job_id") REFERENCES "practice_jobs"("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_practice_time_entries_tenant_id" ON "practice_time_entries" ("tenant_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_practice_time_entries_client_id" ON "practice_time_entries" ("client_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_practice_time_entries_job_id" ON "practice_time_entries" ("job_id");`);

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
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
          GRANT SELECT, INSERT, UPDATE, DELETE ON "workflow_templates", "practice_jobs", "practice_job_comments", "client_contacts", "practice_time_entries" TO app_user;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [...this.tables].reverse()) {
      await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_policy ON "${table}";`);
      await queryRunner.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY;`);
      await queryRunner.query(`DROP TABLE IF EXISTS "${table}";`);
    }
  }
}
