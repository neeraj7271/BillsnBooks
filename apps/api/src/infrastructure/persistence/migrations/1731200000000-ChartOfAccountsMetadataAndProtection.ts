import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChartOfAccountsMetadataAndProtection1731200000000 implements MigrationInterface {
  name = 'ChartOfAccountsMetadataAndProtection1731200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Alter companies to store seed version & business template
    await queryRunner.query(`
      ALTER TABLE companies
        ADD COLUMN IF NOT EXISTS coa_seed_version VARCHAR(20) NULL,
        ADD COLUMN IF NOT EXISTS coa_template VARCHAR(50) NULL;
    `);

    // 2. Alter ledger_groups table
    await queryRunner.query(`
      ALTER TABLE ledger_groups
        ADD COLUMN IF NOT EXISTS system_key VARCHAR(100) NULL,
        ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT 'USER',
        ADD COLUMN IF NOT EXISTS seed_version VARCHAR(20) NULL,
        ADD COLUMN IF NOT EXISTS report VARCHAR(50) NOT NULL DEFAULT 'BALANCE_SHEET',
        ADD COLUMN IF NOT EXISTS affects_gross_profit BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS normal_balance VARCHAR(10) NOT NULL DEFAULT 'DEBIT',
        ADD COLUMN IF NOT EXISTS tally_group_name VARCHAR(150) NULL,
        ADD COLUMN IF NOT EXISTS schedule_iii_mapping VARCHAR(150) NULL;

      CREATE INDEX IF NOT EXISTS idx_ledger_groups_system_key ON ledger_groups(company_id, system_key);
      CREATE INDEX IF NOT EXISTS idx_ledger_groups_parent ON ledger_groups(company_id, parent_group_id);
      CREATE INDEX IF NOT EXISTS idx_ledger_groups_active ON ledger_groups(company_id, is_active);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_groups_company_system_key ON ledger_groups(company_id, system_key) WHERE system_key IS NOT NULL;
    `);

    // 3. Alter ledgers table
    await queryRunner.query(`
      ALTER TABLE ledgers
        ADD COLUMN IF NOT EXISTS system_key VARCHAR(100) NULL,
        ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT 'USER',
        ADD COLUMN IF NOT EXISTS seed_version VARCHAR(20) NULL,
        ADD COLUMN IF NOT EXISTS schedule_iii_mapping VARCHAR(150) NULL,
        ADD COLUMN IF NOT EXISTS tally_ledger_name VARCHAR(150) NULL,
        ADD COLUMN IF NOT EXISTS gst_tax_type VARCHAR(50) NULL,
        ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5, 2) NULL;

      CREATE INDEX IF NOT EXISTS idx_ledgers_system_key ON ledgers(company_id, system_key);
      CREATE INDEX IF NOT EXISTS idx_ledgers_active ON ledgers(company_id, is_active);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ledgers_company_system_key ON ledgers(company_id, system_key) WHERE system_key IS NOT NULL;
    `);

    // 4. Invariant Trigger 1: Child group nature must inherit parent group nature
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_check_ledger_group_nature()
      RETURNS TRIGGER AS $$
      DECLARE
        v_parent_nature VARCHAR(50);
      BEGIN
        IF NEW.parent_group_id IS NOT NULL THEN
          SELECT nature INTO v_parent_nature FROM ledger_groups WHERE id = NEW.parent_group_id;
          IF v_parent_nature IS NOT NULL AND NEW.nature <> v_parent_nature THEN
            RAISE EXCEPTION 'Child ledger group nature (%) must match parent group nature (%)', NEW.nature, v_parent_nature;
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS check_ledger_group_nature_trigger ON ledger_groups;
      CREATE TRIGGER check_ledger_group_nature_trigger
        BEFORE INSERT OR UPDATE OF parent_group_id, nature ON ledger_groups
        FOR EACH ROW EXECUTE FUNCTION trg_check_ledger_group_nature();
    `);

    // 5. Invariant Trigger 2: Prevent deletion or structural mutation of locked ledger groups
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_protect_locked_ledger_groups()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          IF OLD.is_locked = TRUE THEN
            RAISE EXCEPTION 'Cannot delete locked system ledger group: % (%)', OLD.name, OLD.system_key;
          END IF;
          -- Also prevent deletion if child groups or ledgers exist
          IF EXISTS (SELECT 1 FROM ledger_groups WHERE parent_group_id = OLD.id) THEN
            RAISE EXCEPTION 'Cannot delete ledger group % because it contains child groups', OLD.name;
          END IF;
          IF EXISTS (SELECT 1 FROM ledgers WHERE group_id = OLD.id) THEN
            RAISE EXCEPTION 'Cannot delete ledger group % because it contains ledgers', OLD.name;
          END IF;
          RETURN OLD;
        ELSIF TG_OP = 'UPDATE' THEN
          IF OLD.is_locked = TRUE THEN
            IF NEW.nature <> OLD.nature THEN
              RAISE EXCEPTION 'Cannot change nature of locked system ledger group: %', OLD.name;
            END IF;
            IF (OLD.parent_group_id IS NULL AND NEW.parent_group_id IS NOT NULL) OR
               (OLD.parent_group_id IS NOT NULL AND NEW.parent_group_id IS NULL) OR
               (OLD.parent_group_id <> NEW.parent_group_id) THEN
              RAISE EXCEPTION 'Cannot re-parent locked system ledger group: %', OLD.name;
            END IF;
          END IF;
          RETURN NEW;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS protect_locked_ledger_groups_trigger ON ledger_groups;
      CREATE TRIGGER protect_locked_ledger_groups_trigger
        BEFORE UPDATE OR DELETE ON ledger_groups
        FOR EACH ROW EXECUTE FUNCTION trg_protect_locked_ledger_groups();
    `);

    // 6. Invariant Trigger 3: Prevent deletion of locked ledgers or ledgers with postings
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_protect_locked_ledgers()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          IF OLD.is_locked = TRUE THEN
            RAISE EXCEPTION 'Cannot delete locked system ledger: % (%)', OLD.name, OLD.system_key;
          END IF;
          IF EXISTS (SELECT 1 FROM journal_entries WHERE ledger_id = OLD.id) THEN
            RAISE EXCEPTION 'Cannot delete ledger % with existing journal entry postings. Deactivate instead.', OLD.name;
          END IF;
          RETURN OLD;
        ELSIF TG_OP = 'UPDATE' THEN
          IF OLD.is_locked = TRUE THEN
            IF NEW.group_id <> OLD.group_id THEN
              RAISE EXCEPTION 'Cannot change group of locked system ledger: %', OLD.name;
            END IF;
          END IF;
          RETURN NEW;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS protect_locked_ledgers_trigger ON ledgers;
      CREATE TRIGGER protect_locked_ledgers_trigger
        BEFORE UPDATE OR DELETE ON ledgers
        FOR EACH ROW EXECUTE FUNCTION trg_protect_locked_ledgers();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS protect_locked_ledgers_trigger ON ledgers;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS trg_protect_locked_ledgers();`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS protect_locked_ledger_groups_trigger ON ledger_groups;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS trg_protect_locked_ledger_groups();`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS check_ledger_group_nature_trigger ON ledger_groups;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS trg_check_ledger_group_nature();`);

    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_ledgers_company_system_key;
      DROP INDEX IF EXISTS idx_ledgers_active;
      DROP INDEX IF EXISTS idx_ledgers_system_key;
      ALTER TABLE ledgers
        DROP COLUMN IF EXISTS gst_rate,
        DROP COLUMN IF EXISTS gst_tax_type,
        DROP COLUMN IF EXISTS tally_ledger_name,
        DROP COLUMN IF EXISTS schedule_iii_mapping,
        DROP COLUMN IF EXISTS seed_version,
        DROP COLUMN IF EXISTS source,
        DROP COLUMN IF EXISTS is_locked,
        DROP COLUMN IF EXISTS is_system,
        DROP COLUMN IF EXISTS system_key;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_ledger_groups_company_system_key;
      DROP INDEX IF EXISTS idx_ledger_groups_active;
      DROP INDEX IF EXISTS idx_ledger_groups_parent;
      DROP INDEX IF EXISTS idx_ledger_groups_system_key;
      ALTER TABLE ledger_groups
        DROP COLUMN IF EXISTS schedule_iii_mapping,
        DROP COLUMN IF EXISTS tally_group_name,
        DROP COLUMN IF EXISTS normal_balance,
        DROP COLUMN IF EXISTS affects_gross_profit,
        DROP COLUMN IF EXISTS report,
        DROP COLUMN IF EXISTS seed_version,
        DROP COLUMN IF EXISTS source,
        DROP COLUMN IF EXISTS is_active,
        DROP COLUMN IF EXISTS is_locked,
        DROP COLUMN IF EXISTS is_system,
        DROP COLUMN IF EXISTS system_key;
    `);

    await queryRunner.query(`
      ALTER TABLE companies
        DROP COLUMN IF EXISTS coa_template,
        DROP COLUMN IF EXISTS coa_seed_version;
    `);
  }
}

