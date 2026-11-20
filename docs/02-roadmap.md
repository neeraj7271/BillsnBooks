# Document 02: Master Implementation Roadmap & Milestones (Phases 0–8)

**Project:** End-to-End Accounting Operations Platform  
**Author:** Principal Software Architect & Senior Full-Stack Engineer  
**Status:** Under Review (Step 0)  
**Date:** October 2026  

---

## 1. Executive Phased Progression Strategy

The roadmap is structured into 9 strictly sequential phases (Phases 0 through 8). Each phase delivers a complete, production-grade vertical slice with automated migrations, integration tests, UI screens, and release gate verification. No phase commences until the preceding phase satisfies its non-negotiable definition of done and formal sign-off.

```mermaid
gantt
    title Platform Master Implementation Roadmap
    dateFormat  YYYY-MM-DD
    section Core Infrastructure
    Phase 0: Foundation & Accounting Core          :p0, 2026-11-01, 14d
    Phase 1: Tally Entry Integrity & Bulk Import    :p1, after p0, 14d
    section Financial Intelligence
    Phase 2: Bank Statement Intelligence & Sales   :p2, after p1, 14d
    Phase 3: Native Cloud Bookkeeping Engine       :p3, after p2, 14d
    section Commerce & Workspaces
    Phase 4: Billing, Invoicing & Mobile Controls   :p4, after p3, 14d
    Phase 5: CA Firm Practice & Client Portal       :p5, after p4, 14d
    section Compliance & Expansion
    Phase 6: Collections & Recurring Workflows      :p6, after p5, 10d
    Phase 7: GST Compliance (GSTR-1, 2B, 3B, IMS)  :p7, after p6, 14d
    Phase 8: Advanced Operations & Multi-Entity     :p8, after p7, 14d
```

---

## 2. Detailed Phase Specifications

### Phase 0: Foundation & Core Accounting Engine (Current Target)
*Objective: Build the rock-solid multi-tenant substrate, canonical double-entry ledger, database-level invariants, outbox pattern, and foundational pipelines.*

- **Scope & Deliverables:**
  - Monorepo tooling (`pnpm` workspaces + Turborepo), TypeScript strict configurations, ESLint, Prettier, Husky.
  - Docker Compose environment (PostgreSQL 16, Redis 7.2 with `noeviction`, local MinIO for S3 emulation).
  - TypeORM configuration with migrations pipeline (`synchronize: false` strictly enforced).
  - Multi-tenancy substrate: `Tenant`, `Company`, `Branch` entities with PostgreSQL Row-Level Security (`SET LOCAL app.tenant_id`) and automated cross-tenant leakage tests.
  - Canonical Double-Entry Engine (`packages/accounting-core`): Pure domain entities (Voucher, JournalEntry, Ledger, LedgerGroup), database triggers enforcing $\sum \text{debits} = \sum \text{credits}$, non-negative values, and immutability of posted vouchers.
  - Decimal money transformer (`NUMERIC(20,4)` mapped to `Decimal.js`).
  - Pessimistic sequence locking for gap-free document numbering.
  - Period locking table and enforcement trigger.
  - Authentication (JWT + rotating refresh token cookies, password hashing with Argon2id), RBAC guards.
  - Transactional Outbox pattern (`outbox` table, polling dispatcher, and BullMQ worker harness in `apps/worker`).
  - Pluggable `AiProvider` interface and initial mock implementation.
  - Versioned GST rules foundation (`packages/gst-rules`): CGST/SGST vs. IGST state engine, HSN/SAC validation, basic tax math.
  - Shared Accounting Intelligence Engine (AIE) 8-stage pipeline skeleton with State machine (`GREEN`, `YELLOW`, `RED`, `BLUE`).
  - Next.js web application skeleton (`apps/web`) with design system tokens, Radix UI, Tailwind CSS, and Storybook.
  - CI pipeline with GitHub Actions executing lint, type-check, migration tests, and unit/integration tests with Testcontainers.
- **Key Tables / Migrations:** `tenants`, `users`, `roles`, `permissions`, `companies`, `branches`, `financial_years`, `accounting_periods`, `ledger_groups`, `ledgers`, `vouchers`, `journal_entries`, `voucher_sequences`, `outbox`, `audit_logs`.
- **Queues & Jobs:** `queue.outbox.dispatch`, `queue.audit.persist`.
- **Release Gate 0:**
  1. Testcontainers prove that unbalanced vouchers cannot be committed (DB raises deferred trigger error).
  2. Testcontainers prove that attempting to update or delete a `POSTED` voucher or journal entry raises an immutability exception.
  3. Testcontainers prove that tenant B cannot read or alter tenant A's ledger entries under any circumstances via RLS.
  4. Migration up and down works flawlessly on clean databases.
  5. 100% pass on fast-check property tests for ledger balancing.

---

### Phase 1: Tally Entry Integrity & Bulk Import Wizard
*Objective: Build the end-to-end commercial workflow for Tally users: Excel/CSV/PDF voucher ingestion, GST validation, maker-checker approval, posting to Tally, and read-back verification.*

- **Scope & Deliverables:**
  - Windows Connector local bridge prototype (outbound WebSocket client, local SQLite buffer, Tally XML HTTP client).
  - Ingestion & Bulk Import Wizard: Excel/CSV/PDF upload, schema inference, column mapping UI, and staging table.
  - Master Data Sync: Fetching ledgers, groups, and voucher types from Tally; fuzzy-matching against incoming import rows.
  - Pre-import Exception Report: Interactive screen detailing valid rows, blocked rows (missing master, GST mismatch, math error), and clarification items.
  - Maker-Checker Workflow: Staff prepares import batch, authorized approver reviews and signs off.
  - Tally Posting & Read-Back Verification Protocol: Submitting XML vouchers to Tally, handling network timeouts, transitioning to `UNCERTAIN` state, querying Tally daybook to verify actual write before marking `VERIFIED`.
- **Key Tables / Migrations:** `import_batches`, `import_rows`, `tally_connectors`, `tally_sync_logs`, `external_mappings`.
- **Queues & Jobs:** `queue.import.process`, `queue.tally.post`, `queue.tally.readback`.
- **Release Gate 1:**
  1. Zero duplicate vouchers posted to Tally under simulated connector disconnects or network timeouts.
  2. Read-back verification successfully flags any discrepancy between intended voucher and Tally stored state.
  3. Pre-import report catches 100% of injected malformed GSTINs, negative amounts, and invalid HSN codes in test fixtures.

---

### Phase 2: Bank Statement Intelligence & Sales Discovery
*Objective: Ingest bank statements, parse narrations, match against open invoices/vouchers, detect unbilled transactions, and reconcile balances.*

- **Scope & Deliverables:**
  - Bank statement parser supporting major Indian banks (HDFC, ICICI, SBI, Axis, Kotak) across PDF, CSV, and Excel.
  - Narration tokenizer: Extracting UTR numbers, UPI IDs, IMPS codes, and counterparty names.
  - Intelligent Matching Engine: 1:1, 1:Many, and Many:1 allocation against open receivables and payables.
  - Sales Discovery Workflow: Isolating credit entries without matching invoices; investigating against advances/loans; guided workflow to generate compliant GST invoices without assuming all credits are taxable revenue.
  - Bank Reconciliation Statement (BRS) engine: Unreconciled bank movements, uncleared cheques, and ledger balance reconciliation.
- **Key Tables / Migrations:** `bank_accounts`, `bank_statements`, `bank_transactions`, `bank_reconciliation_items`, `sales_discovery_tickets`.
- **Queues & Jobs:** `queue.bank.statement_parse`, `queue.bank.narration_match`, `queue.bank.reconcile`.
- **Release Gate 2:**
  1. Measured matching precision $\ge 98\%$ on labeled test datasets; zero ambiguous items auto-posted without review.
  2. BRS balance identically equals general ledger bank account balance plus timing differences.

---

### Phase 3: Native Cloud Bookkeeping Engine
*Objective: Launch the full double-entry cloud accounting experience, allowing businesses to run authoritative books entirely on the platform without Tally.*

- **Scope & Deliverables:**
  - Native voucher management UI: Sales, Purchase, Receipt, Payment, Contra, Journal, Debit Note, Credit Note.
  - Real-time General Ledger, Daybook, Cash Book, and Bank Book.
  - Trial Balance generator with drill-down to individual vouchers.
  - Financial statements: Profit & Loss Statement (Trading & Income Statement), Balance Sheet, and Schedule III groupings.
  - Period close and financial year rollover automation.
  - Tally-to-Cloud Migration Wizard: Full export import of Tally masters, vouchers, and opening balances with comparative Trial Balance validation.
- **Key Tables / Migrations:** `cost_centres`, `bill_references`, `financial_reports_cache`, `migration_batches`.
- **Release Gate 3:**
  1. Trial Balance perfectly balances ($\sum \text{Debit} - \sum \text{Credit} = 0.0000$) across 100,000 synthetic vouchers.
  2. Tally migration produces identical Trial Balance and ledger closing balances before cutover authorization.

---

### Phase 4: Billing, Invoicing & Mobile Controls
*Objective: Empower business owners and freelancers to create invoices, track payments, manage collections, and review approvals on web and mobile.*

- **Scope & Deliverables:**
  - Multi-template GST invoice generator (B2B, B2C, Export, SEZ) with instant PDF generation.
  - Customer master management with automated GSTIN verification via GSP mock adapter.
  - Mobile Application (React Native / Expo): Approval Inbox, draft invoice creator, bank exception reviewer.
  - Push and email notification center for pending approvals and overdue invoices.
- **Key Tables / Migrations:** `customers`, `items`, `units`, `invoices`, `invoice_items`, `notification_templates`, `notifications`.
- **Release Gate 4:**
  1. Invoices generate compliant QR codes, tax breakups, and Indian currency words representation.
  2. WCAG 2.2 AA accessibility and mobile touch target compliance verified via automated tests.

---

### Phase 5: CA Firm Practice Management & Client Portal
*Objective: Provide CA firms with a centralized command center to manage multiple clients, staff workloads, tasks, and client document collection.*

- **Scope & Deliverables:**
  - Multi-client dashboard with visual status of books (Tally-connected vs. Cloud-native).
  - Staff task management: Task creation, assignment, maker-checker review workflows, and workload tracking.
  - Statutory Compliance Calendar: Pre-configured with GST, TDS, Advance Tax, and ROC filing deadlines with auto-calculated due dates.
  - Client Portal: Secure authenticated workspace for clients to upload documents, view open queries, approve drafted invoices, and download financial statements.
- **Key Tables / Migrations:** `firm_clients`, `staff_assignments`, `compliance_tasks`, `task_comments`, `client_document_requests`.
- **Release Gate 5:**
  1. Strict role-based security: Staff assigned to Client X cannot query or access Client Y's data or tasks.
  2. Document uploads enforce virus scanning, cryptographic hashing, and signed URL retrieval.

---

### Phase 6: Collections & Recurring Workflows
*Objective: Automate payment collection, debtor follow-ups, payment gateway reconciliation, and recurring billing.*

- **Scope & Deliverables:**
  - Accounts receivable ageing reports (0–30, 31–60, 61–90, 90+ days).
  - Automated collection reminders via WhatsApp and Email with configurable tone and cadence.
  - Payment links generation (Razorpay/Cashfree adapter).
  - Payment gateway settlement reconciliation (gross amount, processing fee, GST on fee, net credit).
  - Recurring invoice engine: Automated scheduling (monthly, quarterly, annual) with statutory re-validation before generation.
- **Key Tables / Migrations:** `recurring_schedules`, `payment_links`, `gateway_settlements`, `collection_reminders`.
- **Queues & Jobs:** `queue.recurring.generate`, `queue.collections.remind`, `queue.gateway.reconcile`.
- **Release Gate 6:**
  1. Recurring invoices re-verify tax rates and place of supply on generation date; rule updates abort invalid generations.
  2. Gateway fee and net settlement reconciliation balances to the penny with automated expense booking for bank charges.

---

### Phase 7: GST & Tax Compliance Engine
*Objective: Complete statutory compliance readiness: GSTR-1, GSTR-2B, GSTR-3B reconciliation, IMS action management, TDS registers, and e-invoice/e-way bill integrations.*

- **Scope & Deliverables:**
  - GSTR-1 auto-generation from outward supplies register matching official JSON portal schema.
  - GSTR-2B 3-way reconciliation: Comparing GSTR-2B JSON from portal with Purchase Register and IMS action states.
  - Rule-driven ITC eligibility engine: Flagging blocked ITC under Section 17(5) and vendor non-filing.
  - GSTR-3B computation sheet with tax liability and ITC offset simulation.
  - TDS / TCS registers with Section 194C, 194J, 194Q compliance tracking.
  - E-Invoice (IRN) and E-Way Bill generation via pluggable GSP adapter.
- **Key Tables / Migrations:** `gstr1_returns`, `gstr2b_downloads`, `gst_reconciliation_records`, `ims_actions`, `tds_entries`.
- **Release Gate 7:**
  1. Exported GSTR-1 JSON passes official GST Offline Utility validation with zero errors.
  2. 3-way reconciliation handles 50,000+ line items in under 30 seconds with 100% precision on exact matches.

---

### Phase 8: Advanced Operations & Multi-Entity Platform
*Objective: Expand into inventory tracking, cost centre analytics, multi-branch consolidation, audit paper trails, and enterprise integrations.*

- **Scope & Deliverables:**
  - Inventory management: Stock items, godowns/warehouses, stock journals, batches, and FIFO/weighted-average valuation.
  - Multi-branch accounting and inter-branch contra reconciliation.
  - Audit trial working papers and permanent document archive.
  - Advanced financial analytics, cash flow forecasting, and KPI dashboards.
- **Key Tables / Migrations:** `stock_items`, `godowns`, `stock_entries`, `inventory_batches`, `branch_consolidations`.
- **Release Gate 8:**
  1. Inventory valuation matches physical stock counts and valuation formulas without balance drift.
  2. Consolidated multi-branch financial statements eliminate inter-company/inter-branch transfers cleanly.

---

## 3. Immediate Action Plan: Phase 0 (Foundation) Kickoff

Upon user approval of Documents 00, 01, and 02, execution begins immediately on **Phase 0**. The concrete sequence of Phase 0 implementation will be:

1. **Monorepo Scaffold:** Initialize pnpm workspace, Turborepo, TypeScript strict configurations, ESLint, and Prettier.
2. **Docker Dev Environment:** Spin up PostgreSQL 16 and Redis 7.2 via `docker-compose.yml`.
3. **Domain Core (`packages/accounting-core`):** Define pure domain models (Money/Decimal, Voucher, JournalEntry, Ledger, AccountType).
4. **GST Rules Engine (`packages/gst-rules`):** Define deterministic state code, POS, and tax math rules with unit and property tests.
5. **Database Migrations & Entities:** Write initial reversible migrations for multi-tenancy, canonical accounting tables, database balance trigger, immutability trigger, and period lock trigger.
6. **Persistence & RLS Layer:** Implement Unit-of-Work, TypeORM entity mappers, and `SET LOCAL app.tenant_id` context.
7. **Auth & Identity:** Setup JWT auth, refresh cookies, and RBAC guards in `apps/api`.
8. **Transactional Outbox & Worker:** Setup outbox table, poller, and BullMQ worker harness in `apps/worker`.
9. **UI Design System:** Scaffold `packages/ui` with tokens, Radix UI primitives, and Tailwind CSS.
10. **Verification & Testing:** Execute Testcontainers suite for DB invariants, RLS tenant isolation, and fast-check property tests.

---

This roadmap serves as the definitive execution contract for all development phases.

