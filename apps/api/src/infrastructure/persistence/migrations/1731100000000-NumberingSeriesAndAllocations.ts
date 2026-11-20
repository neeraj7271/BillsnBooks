import { MigrationInterface, QueryRunner } from 'typeorm';

export class NumberingSeriesAndAllocations1731100000000 implements MigrationInterface {
  name = 'NumberingSeriesAndAllocations1731100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS numbering_series (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        company_id UUID NOT NULL,
        branch_id UUID NULL,
        doc_type VARCHAR(32) NOT NULL,
        series_code VARCHAR(32) NOT NULL,
        format_pattern VARCHAR(128) NOT NULL,
        seq_padding INTEGER NOT NULL DEFAULT 5,
        start_seq INTEGER NOT NULL DEFAULT 1,
        current_seq INTEGER NOT NULL DEFAULT 0,
        reset_frequency VARCHAR(16) NOT NULL DEFAULT 'YEARLY',
        is_manual BOOLEAN NOT NULL DEFAULT FALSE,
        is_locked BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_numbering_series_unique 
        ON numbering_series(company_id, doc_type, series_code);

      CREATE INDEX IF NOT EXISTS idx_numbering_series_company_doc 
        ON numbering_series(company_id, doc_type, is_active);

      CREATE TABLE IF NOT EXISTS number_allocations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        series_id UUID NOT NULL REFERENCES numbering_series(id) ON DELETE RESTRICT,
        company_id UUID NOT NULL,
        doc_type VARCHAR(32) NOT NULL,
        document_id UUID NOT NULL,
        allocated_number VARCHAR(64) NOT NULL,
        seq_number INTEGER NOT NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'ISSUED',
        cancellation_reason TEXT NULL,
        allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        allocated_by UUID NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_allocations_series_seq 
        ON number_allocations(series_id, seq_number);

      CREATE UNIQUE INDEX IF NOT EXISTS idx_allocations_doc_unique 
        ON number_allocations(company_id, doc_type, allocated_number);

      CREATE INDEX IF NOT EXISTS idx_allocations_document_id 
        ON number_allocations(document_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS number_allocations;
      DROP TABLE IF EXISTS numbering_series;
    `);
  }
}

