# Pre-Seeded Chart of Accounts, Groups & Auto-Managed Codes — Master Implementation Plan

**Target Document:** `docs/phases/coa-seed-plan.md`  
**Date:** October 31, 2026  
**Status:** Awaiting Approval (Step 0 Protocol)  
**Author:** Principal Software Architect & Senior Full-Stack Engineer  

---

## 1. Executive Summary & Design Principles

Every newly registered enterprise company will immediately start with a standard, authoritative, Indian statutory Chart of Accounts tailored to their business model (Trader, Manufacturer, Service/CA, or Minimal) with zero manual setup. Users will never type or memorize ledger or group codes.

### Core Architectural Rules:
1. **Seed data is data, not code:** Defined in versioned, schema-validated JSON (`packages/accounting-core/seed-data/coa-v1.json`) validated via Zod in CI.
2. **Seeds are not migrations:** Schema migrations create tables and database constraints; seeding runs through a dedicated, idempotent `ChartOfAccountsSeeder` service.
3. **Idempotent and re-runnable:** Operations match on stable `system_key` (e.g. `GRP_SUNDRY_DEBTORS`, `LED_CASH`), never on display names. Re-running creates nothing twice and never overwrites user renames.
4. **Seed version tracking:** Each company tracks its applied `seed_version`. Upgrades add only newly introduced standard accounts without mutating existing records.
5. **Auto-managed hierarchical codes:** Generated atomically via `NumberingService`. Account names are primary in the UI; numeric codes (`1000`–`4999`) are secondary, searchable metadata.
6. **Accounting mode awareness:** Cloud-native companies seed the full chart. Tally-connected companies import and map authoritative Tally masters without destructive overwrites.

---

## 2. Database Schema & Migration Specification

### 2.1 Table Alterations: `ledger_groups`
Add the following columns to `ledger_groups`:
- `system_key VARCHAR(64) NULL` — Stable identifier (e.g. `GRP_CURRENT_ASSETS`).
- `is_system BOOLEAN NOT NULL DEFAULT FALSE` — Indicates pre-seeded standard group.
- `is_locked BOOLEAN NOT NULL DEFAULT FALSE` — Locked root groups cannot be deleted, re-parented, or have their nature modified.
- `is_active BOOLEAN NOT NULL DEFAULT TRUE` — Soft-deactivation state.
- `source VARCHAR(32) NOT NULL DEFAULT 'USER'` — `SEED` | `USER` | `TALLY_IMPORT` | `PLATFORM_EXTENSION`.
- `seed_version VARCHAR(16) NULL` — Version tag (e.g. `1.0.0`).
- `report VARCHAR(32) NOT NULL DEFAULT 'BALANCE_SHEET'` — `BALANCE_SHEET` | `PROFIT_AND_LOSS` | `TRADING_ACCOUNT`.
- `affects_gross_profit BOOLEAN NOT NULL DEFAULT FALSE` — Tally direct/indirect distinction.
- `normal_balance VARCHAR(8) NOT NULL DEFAULT 'DEBIT'` — `DEBIT` | `CREDIT`.
- `tally_group_name VARCHAR(150) NULL` — Exact Tally default group name for sync mapping.
- `schedule_iii_mapping VARCHAR(128) NULL` — Statutory Companies Act Schedule III disclosure line.

**Constraints & Indexes:**
- `CREATE UNIQUE INDEX idx_ledger_groups_company_code ON ledger_groups(company_id, code);`
- `CREATE UNIQUE INDEX idx_ledger_groups_company_system_key ON ledger_groups(company_id, system_key) WHERE system_key IS NOT NULL;`
- `CREATE INDEX idx_ledger_groups_company_parent ON ledger_groups(company_id, parent_group_id);`

### 2.2 Table Alterations: `ledgers`
Add the following columns to `ledgers`:
- `system_key VARCHAR(64) NULL` — Stable identifier (e.g. `LED_CASH`, `LED_OUTPUT_CGST`).
- `is_system BOOLEAN NOT NULL DEFAULT FALSE` — Standard platform ledger.
- `is_locked BOOLEAN NOT NULL DEFAULT FALSE` — Critical accounts that cannot be deleted or re-grouped.
- `source VARCHAR(32) NOT NULL DEFAULT 'USER'` — `SEED` | `USER` | `TALLY_IMPORT`.
- `seed_version VARCHAR(16) NULL` — Version tag.
- `bill_wise_tracking BOOLEAN NOT NULL DEFAULT FALSE` — Bill-by-bill outstanding settlement tracking.
- `affects_inventory BOOLEAN NOT NULL DEFAULT FALSE` — Stock integration toggle.
- `gst_applicable BOOLEAN NOT NULL DEFAULT FALSE` — GST tax flag.
- `gst_ledger_type VARCHAR(32) NULL` — `INPUT` | `OUTPUT` | `RCM_PAYABLE` | `RCM_INPUT` | `CASH_LEDGER` | `REVERSAL`.
- `tax_type VARCHAR(16) NULL` — `CGST` | `SGST` | `IGST` | `CESS` | `TDS` | `TCS`.
- `tds_section VARCHAR(16) NULL` — e.g. `194C`, `194J`, `194I`.
- `default_for VARCHAR(64) NULL` — Auto-fill tag (e.g. `SALES_INTRA`, `SALES_INTER`, `ROUND_OFF`).

**Constraints & Indexes:**
- `CREATE UNIQUE INDEX idx_ledgers_company_code ON ledgers(company_id, code);`
- `CREATE UNIQUE INDEX idx_ledgers_company_system_key ON ledgers(company_id, system_key) WHERE system_key IS NOT NULL;`
- `CREATE INDEX idx_ledgers_company_group ON ledgers(company_id, group_id);`

### 2.3 Database Invariant Triggers
- **Parent-Nature Consistency Trigger:** Prevents a child group from having a different `nature` than its parent group.
- **No-Delete Locked / Referenced Guard:** Rejects `DELETE` queries on groups or ledgers with `is_locked = TRUE` or ledgers referenced by `journal_entries`.

---

## 3. Hierarchical Code Scheme (ADR)

### ADR-008: Hierarchical 4-Digit Block Numbering Scheme
- **Context:** Group and ledger codes must be system-managed, deterministic, sortable, and extensible with room for growth. Users should not type them.
- **Decision:** Adopt a 4-digit hierarchical block scheme segmented by accounting nature:
  - **1000–1999 (Assets):**
    - `1000`: Primary Asset Groups
    - `1100`: Current Assets
    - `1110`: Bank Accounts (`1111`, `1112`... Ledgers)
    - `1120`: Cash-in-Hand (`1121` Cash A/c, `1122` Petty Cash)
    - `1130`: Sundry Debtors
    - `1200`: Fixed Assets (`1210` Tangible, `1220` Intangible)
    - `1300`: Investments
  - **2000–2999 (Liabilities & Capital):**
    - `2000`: Capital Account (`2010` Share Capital, `2020` Reserves & Surplus)
    - `2100`: Current Liabilities
    - `2110`: Duties & Taxes (`2111` Output CGST, `2112` Output SGST, `2113` Output IGST, `2121` Input CGST...)
    - `2130`: Sundry Creditors
    - `2140`: Provisions & Outstanding Expenses
    - `2200`: Loans (Liability) (`2210` Secured Loans, `2220` Unsecured Loans)
  - **3000–3999 (Income & Revenue):**
    - `3100`: Sales Accounts (`3101` Sales Intra-State, `3102` Sales Inter-State, `3103` Sales Export)
    - `3200`: Direct Incomes / Service Income
    - `3300`: Indirect Incomes (`3301` Interest Received, `3302` Discount Received)
  - **4000–4999 (Expenses):**
    - `4100`: Purchase Accounts (`4101` Purchases Local, `4102` Purchases Inter-State, `4103` Import Purchases)
    - `4200`: Direct Expenses (`4201` Freight Inward, `4202` Wages Direct, `4203` Customs Duty)
    - `4300`: Indirect Expenses (`4301` Rent, `4302` Salaries, `4303` Electricity, `4304` Audit Fees, `4399` Round Off)
- **Automatic Allocation:** Adding a new group or ledger under a parent queries the highest sequence in that parent's block via `NumberingService` and allocates `currentMax + 1`.

---

## 4. Standard Groups & Common Ledgers Catalogue

### 4.1 The 28 Standard Tally Groups
- **15 Primary Groups:**
  1. `Branch / Divisions` (Asset/Liability)
  2. `Capital Account` (Liability/Equity)
  3. `Current Assets` (Asset)
  4. `Current Liabilities` (Liability)
  5. `Direct Expenses` (Expense, affects gross profit: true)
  6. `Direct Incomes` (Income, affects gross profit: true)
  7. `Fixed Assets` (Asset)
  8. `Indirect Expenses` (Expense, affects gross profit: false)
  9. `Indirect Incomes` (Income, affects gross profit: false)
  10. `Investments` (Asset)
  11. `Loans (Liability)` (Liability)
  12. `Misc. Expenses (Asset)` (Asset)
  13. `Purchase Accounts` (Expense, affects gross profit: true)
  14. `Sales Accounts` (Income, affects gross profit: true)
  15. `Suspense A/c` (Liability/Asset)
- **13 Sub-Groups:**
  - Under `Capital Account`: `Reserves & Surplus`
  - Under `Current Assets`: `Bank Accounts`, `Cash-in-Hand`, `Deposits (Asset)`, `Loans & Advances (Asset)`, `Stock-in-Hand`, `Sundry Debtors`
  - Under `Current Liabilities`: `Bank OD A/c`, `Duties & Taxes`, `Provisions`, `Sundry Creditors`
  - Under `Loans (Liability)`: `Secured Loans`, `Unsecured Loans`
- **Platform Sub-Groups (source = platform-extension):**
  - Under `Duties & Taxes`: `GST Output`, `GST Input`, `TDS Payable`, `TCS Payable`
  - Under `Fixed Assets`: `Tangible Assets`, `Intangible Assets`

### 4.2 Seeded Ledgers (50+ Standard Accounts)
- **Locked System Accounts:** `Cash`, `Profit & Loss A/c`, `Round Off (Dr/Cr)`.
- **GST & Statutory Duties:** `Output CGST`, `Output SGST`, `Output IGST`, `Output Cess`, `Input CGST`, `Input SGST`, `Input IGST`, `Input Cess`, `RCM Payable CGST/SGST/IGST`, `RCM Input CGST/SGST/IGST`, `GST Payable/Cash Ledger`, `GST ITC Reversal`, `TDS Payable (194C, 194J, 194I)`, `TDS Receivable`, `Advance Tax`.
- **Sales & Revenue:** `Sales - Intra-State (Local)`, `Sales - Inter-State`, `Sales - Export (Zero-Rated/LUT)`, `Sales - SEZ`, `Sales Returns`, `Professional & Consulting Fees`, `Service Income`.
- **Purchases & Direct Costs:** `Purchases - Local`, `Purchases - Inter-State`, `Purchases - Import`, `Purchases - Reverse Charge`, `Purchase Returns`, `Freight & Cartage Inward`, `Customs Duty & Clearance`.
- **Operating & Administrative:** `Salaries & Wages`, `Employer PF/ESI`, `Office Rent`, `Electricity & Utilities`, `Telephone & Internet`, `Printing & Stationery`, `Travelling & Conveyance`, `Repairs & Maintenance`, `Legal & Professional Fees`, `Audit Fees`, `Bank Charges`, `Depreciation`.

---

## 5. Business-Type Templates (Inclusion Rules)

A single master seed data file with template inclusion tags:
1. **Trader / Wholesale / Retail (`trader` - Default):** Full inventory, purchase/sales accounts, local/inter-state GST, debtors, creditors, carriage inward, stock-in-hand.
2. **Manufacturer (`manufacturer`):** Adds Raw Materials Stock, Work-in-Progress (WIP), Finished Goods, Factory Power & Fuel, Direct Wages, Plant & Machinery, Factory Overhead.
3. **Service Provider / CA Firm / Professional (`service`):** Omits physical inventory/carriage ledgers; highlights Professional Fees, Consulting Income, Subcontractor Costs, TDS Receivable/Payable, Unbilled Revenue.
4. **Minimal (`minimal`):** Core essential accounts only (Cash, Bank, Domestic Sales, Local Purchases, Output/Input GST, Debtors Control, Creditors Control, Rent, Salary, Office Expense).

---

## 6. UI & Interaction Specification

1. **Expandable COA Tree (`/settings/ledgers`):**
   - Renders a multi-level collapsible tree (`Primary Group` $\rightarrow$ `Sub-Group` $\rightarrow$ `Ledger`).
   - Search bar filters nodes while preserving ancestral branches.
   - Account names are bold and prominent; codes are displayed in subtle monospace pills (`1110`, `2111`).
   - Badges indicate `System`, `Locked`, `Active`, and `Currency`.
2. **Add Ledger Dialog:**
   - Group picker with search.
   - Code is auto-assigned from the selected parent group and displayed as read-only.
   - Nature and financial statement target are automatically inherited and previewed.
3. **Reusable `<LedgerPicker>` & `<GroupPicker>`:**
   - Replaces ad-hoc `<Select>` inputs across Invoicing, Banking, and Journal Vouchers.
   - Groups items logically and provides inline creation.
4. **Onboarding Template Step:**
   - Visual radio cards for Trader, Manufacturer, Service/CA, and Minimal with live ledger count preview.

---

## 7. Implementation Roadmap & Vertical Slices

- **Slice 1: Persistence Schema & JSON Seed Engine**
  - Migration for group/ledger metadata, constraints, and parent-nature check trigger.
  - Zod-validated master seed JSON `packages/accounting-core/seed-data/coa-v1.json`.
  - `ChartOfAccountsSeeder` service.
- **Slice 2: Hierarchical Numbering Integration & Company Creation Hook**
  - Wire seeder into `CompanyService.createCompany()`.
  - Connect `NumberingService` to generate hierarchical codes.
  - Add template parameter to company creation DTO.
- **Slice 3: Expandable Tree UI & Add Ledger Dialog**
  - Build expandable tree view in `/settings/ledgers`.
  - Update `ledger-dialog.tsx` and `group-dialog.tsx` to use auto-assigned codes.
  - Implement shared `<LedgerPicker>`.
- **Slice 4: Onboarding Flow, Tally Import Linking & Non-Destructive Upgrades**
  - Template selector in company onboarding.
  - Tally mapping view and non-destructive version upgrade mechanism.
- **Slice 5: Verification & End-to-End Testing**
  - Automated unit and integration tests (idempotency, protection rules, code generation, trial balance sanity).

---

## 8. Definition of Done
1. All standard Tally groups (15 primary + 13 sub-groups) and 50+ common ledgers seeded seamlessly on company creation.
2. Zero manual code entry required by users; hierarchical codes assigned automatically.
3. Seeding is completely idempotent and respects tenant isolation and accounting modes.
4. Expandable tree UI live in `/settings/ledgers`.
5. 100% green test suite with complete coverage of protection invariants.

