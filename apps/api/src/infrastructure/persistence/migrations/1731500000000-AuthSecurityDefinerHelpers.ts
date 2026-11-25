import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds SECURITY DEFINER lookup helpers for authentication flows (login, register,
 * refresh, logout) so that a non-superuser DB role (`app_user`) can resolve a
 * user's record and tenantId by globally-unique email or userId before setting
 * `app.tenant_id` via `set_config`, without loosening RLS on `users`.
 */
export class AuthSecurityDefinerHelpers1731500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION auth_find_user_by_email(p_email text)
      RETURNS SETOF users
      LANGUAGE sql
      SECURITY DEFINER
      SET search_path = public
      AS $$
        SELECT * FROM users WHERE email = lower(p_email) LIMIT 1;
      $$;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION auth_find_user_by_id(p_id uuid)
      RETURNS SETOF users
      LANGUAGE sql
      SECURITY DEFINER
      SET search_path = public
      AS $$
        SELECT * FROM users WHERE id = p_id LIMIT 1;
      $$;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION auth_email_exists(p_email text)
      RETURNS boolean
      LANGUAGE sql
      SECURITY DEFINER
      SET search_path = public
      AS $$
        SELECT EXISTS(SELECT 1 FROM users WHERE email = lower(p_email));
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
          GRANT EXECUTE ON FUNCTION auth_find_user_by_email(text) TO app_user;
          GRANT EXECUTE ON FUNCTION auth_find_user_by_id(uuid) TO app_user;
          GRANT EXECUTE ON FUNCTION auth_email_exists(text) TO app_user;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS auth_email_exists(text);`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS auth_find_user_by_id(uuid);`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS auth_find_user_by_email(text);`);
  }
}
