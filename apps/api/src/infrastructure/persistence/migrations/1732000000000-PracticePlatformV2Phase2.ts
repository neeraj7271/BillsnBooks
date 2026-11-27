import { MigrationInterface, QueryRunner } from 'typeorm';

export class PracticePlatformV2Phase21732000000000 implements MigrationInterface {
  name = 'PracticePlatformV2Phase21732000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Proposals & Proposal Lines
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "practice_proposals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "client_id" uuid,
        "prospect_name" varchar(255),
        "prospect_email" varchar(255),
        "status" varchar(30) NOT NULL DEFAULT 'DRAFT',
        "valid_until" date NOT NULL,
        "created_by_user_id" uuid NOT NULL,
        "accepted_at" timestamptz,
        "total_value" numeric(14,2) NOT NULL DEFAULT 0,
        "gst_amount" numeric(14,2) NOT NULL DEFAULT 0,
        "currency" varchar(10) NOT NULL DEFAULT 'INR',
        "notes" text,
        "pdf_file_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_practice_proposals" PRIMARY KEY ("id"),
        CONSTRAINT "FK_practice_proposals_client" FOREIGN KEY ("client_id") REFERENCES "firm_clients"("id") ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS "IDX_practice_proposals_tenant" ON "practice_proposals" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IDX_practice_proposals_client" ON "practice_proposals" ("client_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "practice_proposal_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "proposal_id" uuid NOT NULL,
        "service_type_id" uuid,
        "description" varchar(255) NOT NULL,
        "fee_type" varchar(20) NOT NULL DEFAULT 'RECURRING',
        "fee_amount" numeric(14,2) NOT NULL DEFAULT 0,
        "recurrence_frequency" varchar(30),
        "estimated_hours" numeric(6,2) NOT NULL DEFAULT 0,
        "hourly_rate" numeric(12,2) NOT NULL DEFAULT 0,
        "gst_rate" numeric(5,2) NOT NULL DEFAULT 18,
        "sort_order" int NOT NULL DEFAULT 0,
        CONSTRAINT "PK_practice_proposal_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_practice_proposal_lines_prop" FOREIGN KEY ("proposal_id") REFERENCES "practice_proposals"("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_practice_proposal_lines_prop" ON "practice_proposal_lines" ("proposal_id");
    `);

    // 2. Engagement Letter Templates & Engagements
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "practice_engagement_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(180) NOT NULL,
        "description" text,
        "body_template" text NOT NULL,
        "is_default" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_practice_engagement_templates" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_practice_eng_tpl_tenant" ON "practice_engagement_templates" ("tenant_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "practice_engagements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "proposal_id" uuid,
        "template_id" uuid,
        "title" varchar(255) NOT NULL,
        "status" varchar(30) NOT NULL DEFAULT 'DRAFT',
        "engagement_letter_file_id" uuid,
        "signature_file_id" uuid,
        "scope_of_services" jsonb NOT NULL DEFAULT '[]',
        "fee_schedule" jsonb NOT NULL DEFAULT '[]',
        "letter_body" text,
        "start_date" date NOT NULL,
        "end_date" date,
        "signed_by_client_at" timestamptz,
        "signed_by_client_name" varchar(180),
        "signed_by_client_email" varchar(180),
        "signed_by_client_ip" varchar(80),
        "signed_by_firm_at" timestamptz,
        "signed_by_firm_user_id" uuid,
        "document_sha256" varchar(64),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_practice_engagements" PRIMARY KEY ("id"),
        CONSTRAINT "FK_practice_engagements_client" FOREIGN KEY ("client_id") REFERENCES "firm_clients"("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_practice_engagements_tenant" ON "practice_engagements" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IDX_practice_engagements_client" ON "practice_engagements" ("client_id");
    `);

    // 3. Extend practice_time_entries
    await queryRunner.query(`
      ALTER TABLE "practice_time_entries"
        ADD COLUMN IF NOT EXISTS "service_type_id" uuid,
        ADD COLUMN IF NOT EXISTS "entry_date" date NOT NULL DEFAULT CURRENT_DATE,
        ADD COLUMN IF NOT EXISTS "hourly_rate" numeric(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "approval_status" varchar(20) NOT NULL DEFAULT 'DRAFT',
        ADD COLUMN IF NOT EXISTS "bill_id" uuid,
        ADD COLUMN IF NOT EXISTS "is_write_off" boolean NOT NULL DEFAULT false;
    `);

    // 4. Practice Bills & Bill Lines
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "practice_bills" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "bill_number" varchar(60) NOT NULL,
        "bill_date" date NOT NULL,
        "due_date" date NOT NULL,
        "status" varchar(30) NOT NULL DEFAULT 'DRAFT',
        "subtotal" numeric(14,2) NOT NULL DEFAULT 0,
        "gst_amount" numeric(14,2) NOT NULL DEFAULT 0,
        "total_amount" numeric(14,2) NOT NULL DEFAULT 0,
        "retainer_applied" numeric(14,2) NOT NULL DEFAULT 0,
        "invoice_id" uuid,
        "notes" text,
        "created_by_user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_practice_bills" PRIMARY KEY ("id"),
        CONSTRAINT "FK_practice_bills_client" FOREIGN KEY ("client_id") REFERENCES "firm_clients"("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_practice_bills_tenant" ON "practice_bills" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IDX_practice_bills_client" ON "practice_bills" ("client_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "practice_bill_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "bill_id" uuid NOT NULL,
        "line_type" varchar(30) NOT NULL DEFAULT 'TIME',
        "description" varchar(255) NOT NULL,
        "service_type_id" uuid,
        "time_entry_id" uuid,
        "client_service_id" uuid,
        "hours" numeric(8,2) NOT NULL DEFAULT 1,
        "rate" numeric(12,2) NOT NULL DEFAULT 0,
        "amount" numeric(14,2) NOT NULL DEFAULT 0,
        "gst_rate" numeric(5,2) NOT NULL DEFAULT 18,
        "is_written_off" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_practice_bill_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_practice_bill_lines_bill" FOREIGN KEY ("bill_id") REFERENCES "practice_bills"("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_practice_bill_lines_bill" ON "practice_bill_lines" ("bill_id");
    `);

    // 5. Notice Management
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "practice_notices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "authority" varchar(30) NOT NULL DEFAULT 'GST',
        "notice_type" varchar(120) NOT NULL,
        "notice_no" varchar(120) NOT NULL,
        "section" varchar(120),
        "received_date" date NOT NULL,
        "response_due_date" date NOT NULL,
        "status" varchar(30) NOT NULL DEFAULT 'NEW',
        "assigned_staff_id" uuid,
        "amount_involved" numeric(14,2),
        "documents" jsonb NOT NULL DEFAULT '[]',
        "response_notes" text,
        "resolved_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_practice_notices" PRIMARY KEY ("id"),
        CONSTRAINT "FK_practice_notices_client" FOREIGN KEY ("client_id") REFERENCES "firm_clients"("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_practice_notices_tenant" ON "practice_notices" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IDX_practice_notices_due" ON "practice_notices" ("response_due_date");
    `);

    // 6. Reminder Templates & Notification Rules
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "practice_reminder_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "event_type" varchar(40) NOT NULL,
        "channel" varchar(20) NOT NULL DEFAULT 'EMAIL',
        "name" varchar(150) NOT NULL,
        "subject" varchar(255) NOT NULL,
        "body_template" text NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_practice_reminder_templates" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_practice_rem_tpl_tenant" ON "practice_reminder_templates" ("tenant_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "practice_notification_rules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(150) NOT NULL,
        "event_type" varchar(40) NOT NULL,
        "days_before" int NOT NULL DEFAULT 3,
        "recipients" jsonb NOT NULL DEFAULT '["ASSIGNEE","CLIENT"]',
        "template_id" uuid,
        "is_active" boolean NOT NULL DEFAULT true,
        "last_run_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_practice_notification_rules" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_practice_notif_rules_tenant" ON "practice_notification_rules" ("tenant_id");
    `);

    // 7. Tenant practiceMode + User capacity/cost
    await queryRunner.query(`
      ALTER TABLE "tenants"
        ADD COLUMN IF NOT EXISTS "practice_mode" varchar(20) NOT NULL DEFAULT 'FIRM';
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "weekly_capacity_hours" int NOT NULL DEFAULT 40,
        ADD COLUMN IF NOT EXISTS "hourly_cost_rate" numeric(10,2) NOT NULL DEFAULT 500;
    `);

    // 8. RLS + GRANT for all new tenant-scoped tables
    const newTables = [
      'practice_proposals',
      'practice_proposal_lines',
      'practice_engagement_templates',
      'practice_engagements',
      'practice_bills',
      'practice_bill_lines',
      'practice_notices',
      'practice_reminder_templates',
      'practice_notification_rules',
    ];
    for (const tbl of newTables) {
      await queryRunner.query(`
        ALTER TABLE "${tbl}" ENABLE ROW LEVEL SECURITY;
        ALTER TABLE "${tbl}" FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "tenant_isolation_policy" ON "${tbl}";
        CREATE POLICY "tenant_isolation_policy" ON "${tbl}"
          USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
          WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
        GRANT SELECT, INSERT, UPDATE, DELETE ON "${tbl}" TO app_user;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const newTables = [
      'practice_notification_rules',
      'practice_reminder_templates',
      'practice_notices',
      'practice_bill_lines',
      'practice_bills',
      'practice_engagements',
      'practice_engagement_templates',
      'practice_proposal_lines',
      'practice_proposals',
    ];
    for (const tbl of newTables) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${tbl}" CASCADE;`);
    }
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "weekly_capacity_hours",
        DROP COLUMN IF EXISTS "hourly_cost_rate";
      ALTER TABLE "tenants"
        DROP COLUMN IF EXISTS "practice_mode";
      ALTER TABLE "practice_time_entries"
        DROP COLUMN IF EXISTS "service_type_id",
        DROP COLUMN IF EXISTS "entry_date",
        DROP COLUMN IF EXISTS "hourly_rate",
        DROP COLUMN IF EXISTS "approval_status",
        DROP COLUMN IF EXISTS "bill_id",
        DROP COLUMN IF EXISTS "is_write_off";
    `);
  }
}
