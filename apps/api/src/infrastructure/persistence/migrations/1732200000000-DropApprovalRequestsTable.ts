import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropApprovalRequestsTable1732200000000 implements MigrationInterface {
  name = 'DropApprovalRequestsTable1732200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "approval_requests" CASCADE;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Approval workflow removed; no-op rollback.
  }
}
