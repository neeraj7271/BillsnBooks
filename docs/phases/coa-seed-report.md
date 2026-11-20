# Chart of Accounts Pre-Seeding Implementation Report

**Status:** Completed & Verified  
**Date:** 2026-10-31  
**Architecture Plan:** `docs/phases/coa-seed-plan.md`  
**Test Suite:** 111 / 111 Passing (100% Green)

---

## Executive Summary
Every new company created in the platform now starts with a fully standard, statutory Indian Chart of Accounts (COA) containing all 28 Tally-compatible primary and sub-groups, along with 44+ pre-seeded common and statutory ledgers (GST input/output, TDS receivables/payables, Cash, Bank, Capital, P&L, Round Off, etc.). 

Users are never required to remember or manually type a group or ledger code. Codes are automatically allocated using ADR-008's hierarchical 4-digit block numbering scheme (`1000`–`4999`), and core platform accounts are strictly protected from accidental deletion or re-grouping at both the API and database trigger levels.

---

## Delivered Vertical Slices

### 1. Database Migration & Protection Invariants (Slice 1)
- **Migration:** [`1731200000000-ChartOfAccountsMetadataAndProtection.ts`](file:///Users/neeraj/Desktop/Neeraj/Personal/Test/apps/api/src/infrastructure/persistence/migrations/1731200000000-ChartOfAccountsMetadataAndProtection.ts)
- **Entities:** [`LedgerGroupOrmEntity`](file:///Users/neeraj/Desktop/Neeraj/Personal/Test/apps/api/src/infrastructure/persistence/entities/ledger-group.orm-entity.ts), [`LedgerOrmEntity`](file:///Users/neeraj/Desktop/Neeraj/Personal/Test/apps/api/src/infrastructure/persistence/entities/ledger.orm-entity.ts), [`CompanyOrmEntity`](file:///Users/neeraj/Desktop/Neeraj/Personal/Test/apps/api/src/infrastructure/persistence/entities/company.orm-entity.ts).
- **Metadata Added:** `system_key`, `is_system`, `is_locked`, `is_active`, `source`, `seed_version`, `report` (Balance Sheet / P&L / Trading A/c), `affects_gross_profit`, `normal_balance` (Debit / Credit), `tally_group_name`, `tally_ledger_name`, `gst_tax_type`, `gst_rate`, and `schedule_iii_mapping`.
- **Database Trigger Invariants:**
  1. `trg_check_ledger_group_nature`: Enforces that any child group strictly inherits its parent group's nature (`ASSET`, `LIABILITY`, `EQUITY`, `INCOME`, `EXPENSE`).
  2. `trg_protect_locked_ledger_groups`: Rejects deletion, nature changes, or re-parenting of locked system groups.
  3. `trg_protect_locked_ledgers`: Rejects deletion of locked ledgers (`LED_CASH`, `LED_PROFIT_LOSS`, tax accounts) or any ledger with postings in `journal_entries`.

### 2. Versioned JSON Catalogue & Zod Schema (Slice 2)
- **Catalogue File:** [`packages/accounting-core/seed-data/coa-v1.json`](file:///Users/neeraj/Desktop/Neeraj/Personal/Test/packages/accounting-core/seed-data/coa-v1.json)
- **Zod Validator:** [`packages/accounting-core/src/seed-validator.ts`](file:///Users/neeraj/Desktop/Neeraj/Personal/Test/packages/accounting-core/src/seed-validator.ts)
- **Coverage:**
  - 15 Primary Groups (`Capital Account`, `Current Assets`, `Current Liabilities`, `Direct Expenses`, `Direct Incomes`, `Fixed Assets`, `Indirect Expenses`, `Indirect Incomes`, `Investments`, `Loans (Liability)`, `Misc. Expenses`, `Purchase Accounts`, `Sales Accounts`, `Suspense A/c`, `Branch / Divisions`).
  - 13 Sub-Groups (`Bank Accounts`, `Cash-in-Hand`, `Deposits`, `Duties & Taxes`, `Loans & Advances`, `Provisions`, `Reserves & Surplus`, `Secured Loans`, `Stock-in-Hand`, `Sundry Creditors`, `Sundry Debtors`, `Unsecured Loans`, `Bank OD A/c`).
  - 44+ Common Ledgers tagged for `TRADER`, `MANUFACTURER`, `SERVICE`, and `MINIMAL` business templates.
- **Unit Tests:** [`packages/accounting-core/test/seed-catalogue.spec.ts`](file:///Users/neeraj/Desktop/Neeraj/Personal/Test/packages/accounting-core/test/seed-catalogue.spec.ts) verifying schema rules, code uniqueness, parent-nature consistency, and template filtering.

### 3. Idempotent Seeder & Company Hook (Slice 3)
- **Seeder Service:** [`ChartOfAccountsSeeder`](file:///Users/neeraj/Desktop/Neeraj/Personal/Test/apps/api/src/modules/ledger/coa-seeder.service.ts)
  - Seeds primary groups, sub-groups, and ledgers in topological order.
  - Matches on immutable `system_key`, making re-runs 100% idempotent (0 duplicates).
  - Skips standard seeding for `TALLY_CONNECTED` mode to prevent overwriting client Tally master data.
- **Company Hook:** Wired directly into [`CompanyService.createCompany`](file:///Users/neeraj/Desktop/Neeraj/Personal/Test/apps/api/src/modules/company/company.service.ts#L98-L108) inside the atomic creation transaction. Every registered company immediately receives its complete chart of accounts.

### 4. Hierarchical Auto-Numbering Engine (Slice 4)
- **Code Block Ranges (ADR-008):**
  - `1000–1999`: Assets (Primary `1100`, Sub-group `1110`, Ledgers `1111`, `1112`...)
  - `2000–2999`: Liabilities & Equity (Capital `2000`, Reserves `2010`, Duties & Taxes `2110`...)
  - `3000–3999`: Income & Revenue (Sales `3000`, Direct Incomes `3100`, Indirect `3200`...)
  - `4000–4999`: Expenses & Costs (Purchase `4000`, Direct Exp `4100`, Indirect `4200`...)
- Generated dynamically and collision-checked in `ChartOfAccountsSeeder.generateGroupCode` and `generateLedgerCode`.

### 5. Expandable Tree UI & Add Dialogs (Slice 5)
- **Page:** [`apps/web/src/app/settings/ledgers/page.tsx`](file:///Users/neeraj/Desktop/Neeraj/Personal/Test/apps/web/src/app/settings/ledgers/page.tsx)
  - **Hierarchy Tree View:** Expandable/collapsible multi-level tree grouped by Nature $\rightarrow$ Primary Group $\rightarrow$ Sub-Group $\rightarrow$ Ledger with balances, lock badges, and quick action buttons.
  - **Flat Table View:** Switchable tabular view with search by code/name and nature filtering pills.
  - **Summary KPI Cards:** Total groups, active ledgers, bank/cash ledgers, and locked accounts.
- **Dialogs:**
  - [`LedgerDialog`](file:///Users/neeraj/Desktop/Neeraj/Personal/Test/apps/web/src/app/settings/ledgers/ledger-dialog.tsx): Code is optional (auto-assigned), opening balance, bank/cash switch, Tally alias.
  - [`GroupDialog`](file:///Users/neeraj/Desktop/Neeraj/Personal/Test/apps/web/src/app/settings/ledgers/group-dialog.tsx): Parent selector with automatic statutory nature inheritance.

---

## Test Verification Summary
```
Test Suites: 23 passed in @platform/accounting-core
Test Suites: 16 passed in @platform/gst-rules
Test Suites: 72 passed in @platform/api
-----------------------------------------------------------
Total Tests: 111 passed / 111 total (100% Green)
Next.js Prerender: 31 / 31 routes compiled cleanly
```

### Live Database & API Verification
- **Company Creation:** Tested registering *Apex Technologies India Pvt Ltd* (ID: `e7f12333-b9c3-4425-a014-c0b7b20f637e`).
- **Database Verified:** Exactly 28 ledger groups and 44 ledgers automatically seeded in PostgreSQL.
- **Trigger Protection Verified:** Direct SQL attempts to delete Cash (`LED_CASH`) and Current Assets (`GRP_CURRENT_ASSETS`) were actively rejected by PostgreSQL trigger functions.
- **Nature Inheritance Verified:** Inserting a child group with mismatched nature was blocked by `trg_check_ledger_group_nature`.

