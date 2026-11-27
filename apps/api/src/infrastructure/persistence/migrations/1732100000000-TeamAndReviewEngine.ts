import { MigrationInterface, QueryRunner } from 'typeorm';

export class TeamAndReviewEngine1732100000000 implements MigrationInterface {
  name = 'TeamAndReviewEngine1732100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "user_kind" varchar(30) NOT NULL DEFAULT 'FIRM_COLLEAGUE',
        ADD COLUMN IF NOT EXISTS "client_id" uuid,
        ADD COLUMN IF NOT EXISTS "permission_role_id" uuid,
        ADD COLUMN IF NOT EXISTS "job_role_ids" jsonb NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS "last_active_at" timestamptz;

      UPDATE "users" SET "user_kind" = 'CLIENT_USER' WHERE "role" IN ('CLIENT_VIEWER', 'CLIENT_APPROVER');

      ALTER TABLE "tenants"
        ADD COLUMN IF NOT EXISTS "review_mode" varchar(20) NOT NULL DEFAULT 'ENFORCED';

      ALTER TABLE "practice_jobs"
        ADD COLUMN IF NOT EXISTS "preparer_user_id" uuid,
        ADD COLUMN IF NOT EXISTS "reviewer_user_id" uuid,
        ADD COLUMN IF NOT EXISTS "partner_user_id" uuid,
        ADD COLUMN IF NOT EXISTS "review_status" varchar(30) NOT NULL DEFAULT 'NONE',
        ADD COLUMN IF NOT EXISTS "review_notes" text,
        ADD COLUMN IF NOT EXISTS "stage_state" jsonb NOT NULL DEFAULT '{}';
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "team_invitations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "email" varchar(255) NOT NULL,
        "name" varchar(180),
        "invited_role" varchar(60) NOT NULL DEFAULT 'STAFF_ACCOUNTANT',
        "permission_role_id" uuid,
        "invited_by_user_id" uuid NOT NULL,
        "token" varchar(120) NOT NULL,
        "status" varchar(30) NOT NULL DEFAULT 'PENDING',
        "expires_at" timestamptz NOT NULL,
        "accepted_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_team_invitations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_team_invitations_token" UNIQUE ("token")
      );
      CREATE INDEX IF NOT EXISTS "IDX_team_invitations_tenant" ON "team_invitations" ("tenant_id");
      CREATE INDEX IF NOT EXISTS "IDX_team_invitations_email" ON "team_invitations" ("email");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "permission_roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "code" varchar(60) NOT NULL,
        "description" text,
        "is_system" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "permissions" jsonb NOT NULL DEFAULT '{}',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_permission_roles" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_permission_roles_tenant" ON "permission_roles" ("tenant_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "job_roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "code" varchar(60) NOT NULL,
        "description" text,
        "sort_order" int NOT NULL DEFAULT 10,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_job_roles" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_job_roles_tenant" ON "job_roles" ("tenant_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "client_job_role_assignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "job_role_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_job_role_assignments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_client_job_role" UNIQUE ("tenant_id", "client_id", "job_role_id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_client_job_role_tenant" ON "client_job_role_assignments" ("tenant_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "client_team_members" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "job_role_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_team_members" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_client_team_member" UNIQUE ("tenant_id", "client_id", "user_id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_client_team_tenant" ON "client_team_members" ("tenant_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "practice_job_reviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "job_id" uuid NOT NULL,
        "stage" varchar(60) NOT NULL,
        "action" varchar(40) NOT NULL,
        "actor_user_id" uuid NOT NULL,
        "actor_name" varchar(180) NOT NULL,
        "actor_role" varchar(80) NOT NULL,
        "notes" text,
        "deliverable_hash" varchar(64),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_practice_job_reviews" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_practice_job_reviews_job" ON "practice_job_reviews" ("job_id");
      CREATE INDEX IF NOT EXISTS "IDX_practice_job_reviews_tenant" ON "practice_job_reviews" ("tenant_id");
    `);

    const tables = [
      'team_invitations',
      'permission_roles',
      'job_roles',
      'client_job_role_assignments',
      'client_team_members',
      'practice_job_reviews',
    ];
    for (const tbl of tables) {
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

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION auth_find_invite_by_token(p_token text)
      RETURNS TABLE (
        id uuid,
        "tenantId" uuid,
        email varchar,
        name varchar,
        "invitedRole" varchar,
        "permissionRoleId" uuid,
        status varchar,
        "expiresAt" timestamptz,
        "firmName" varchar
      )
      LANGUAGE sql
      SECURITY DEFINER
      AS $$
        SELECT i.id, i.tenant_id AS "tenantId", i.email, i.name, i.invited_role AS "invitedRole",
               i.permission_role_id AS "permissionRoleId", i.status, i.expires_at AS "expiresAt",
               t.name AS "firmName"
        FROM team_invitations i
        JOIN tenants t ON t.id = i.tenant_id
        WHERE i.token = p_token
        LIMIT 1;
      $$;
      GRANT EXECUTE ON FUNCTION auth_find_invite_by_token(text) TO app_user;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS auth_find_invite_by_token(text);`);
    const tables = [
      'practice_job_reviews',
      'client_team_members',
      'client_job_role_assignments',
      'job_roles',
      'permission_roles',
      'team_invitations',
    ];
    for (const tbl of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${tbl}" CASCADE;`);
    }
    await queryRunner.query(`
      ALTER TABLE "practice_jobs"
        DROP COLUMN IF EXISTS "preparer_user_id",
        DROP COLUMN IF EXISTS "reviewer_user_id",
        DROP COLUMN IF EXISTS "partner_user_id",
        DROP COLUMN IF EXISTS "review_status",
        DROP COLUMN IF EXISTS "review_notes",
        DROP COLUMN IF EXISTS "stage_state";
      ALTER TABLE "tenants"
        DROP COLUMN IF EXISTS "review_mode";
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "user_kind",
        DROP COLUMN IF EXISTS "client_id",
        DROP COLUMN IF EXISTS "permission_role_id",
        DROP COLUMN IF EXISTS "job_role_ids",
        DROP COLUMN IF EXISTS "last_active_at";
    `);
  }
}
