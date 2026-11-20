import { MigrationInterface, QueryRunner } from 'typeorm';

export class InvoiceDocumentTypesAndCollectionsPromise1730900000000 implements MigrationInterface {
  name = 'InvoiceDocumentTypesAndCollectionsPromise1730900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE invoices 
        ADD COLUMN IF NOT EXISTS document_type VARCHAR(50) NOT NULL DEFAULT 'TAX_INVOICE',
        ADD COLUMN IF NOT EXISTS is_rcm BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS tax_classification VARCHAR(50) NOT NULL DEFAULT 'TAXABLE',
        ADD COLUMN IF NOT EXISTS promise_to_pay_date DATE NULL,
        ADD COLUMN IF NOT EXISTS promise_to_pay_notes TEXT NULL;

      CREATE INDEX IF NOT EXISTS idx_invoices_document_type ON invoices(document_type);
      CREATE INDEX IF NOT EXISTS idx_invoices_promise_to_pay ON invoices(promise_to_pay_date);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_invoices_promise_to_pay;
      DROP INDEX IF EXISTS idx_invoices_document_type;
      ALTER TABLE invoices 
        DROP COLUMN IF EXISTS promise_to_pay_notes,
        DROP COLUMN IF EXISTS promise_to_pay_date,
        DROP COLUMN IF EXISTS tax_classification,
        DROP COLUMN IF EXISTS is_rcm,
        DROP COLUMN IF EXISTS document_type;
    `);
  }
}

