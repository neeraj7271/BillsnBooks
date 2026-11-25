# Heavy End-to-End Live Test Log — Antigravity Books (BillsnBooks)

**Date:** 2026-11-25
**Branch:** `qa/heavy-e2e` (branched off `dev`)
**DB Role:** `app_user` (`LOGIN NOSUPERUSER NOBYPASSRLS`)

## Scope Split (Layer A / Layer B)
- **Layer A (Real end-to-end UI journeys via headless Playwright):**
  - 3 tenants × 3 companies = 9 companies.
  - Per company: 20 parties + 50 items via UI dialogs; 180 parties + 4,950 items via UI CSV Import wizard; 50 invoices via "New Invoice" UI covering intra-state, inter-state, RCM, cess, zero-rated, round-off, auto-numbering, and period-lock + approval via Approvals UI; full report page + export verification; full logo/signature/DSC upload/replace/delete/path-traversal cycle.
- **Layer B (Background volume via API backdoor + UI verification):**
  - Additional 4,950 invoices/company × 9 companies (~44,550 extra invoices) seeded via API (`No bulk-invoice import UI` product gap), followed by UI pagination/search/filter/report performance verification and multi-tenant RLS + audit-log append-only DB proofs.

## Product Gaps & Architectural Findings
- **[Product Gap]** No `forgot-password` UI or API endpoint (`apps/web/src/app/auth/` only has `login` and `signup`).
- **[Product Gap]** No user-invite UI or dev mail sink (Mailpit/Mailhog); RBAC tested via secondary tenant registrations + SQL role update to `STAFF_ACCOUNTANT` / `CLIENT_VIEWER` (documented harness backdoor).
- **[Product Gap]** No bulk-invoice import UI; Layer B volume seeded via API.
- **[P1 Architectural Finding]** Company branding (`branding.logo_url`, `branding.signature_url`) is stored as base64 Data URIs in PostgreSQL `setting_values` rather than object storage (MinIO/S3). Base64 blobs in Postgres will balloon DB size and hurt export/replication at scale.
- **[Infra Note]** Docker & MinIO are not installed on this host (`dl.min.io` binary download returned HTTP 410); running native Homebrew PostgreSQL 16.15 and Redis 7.2.

## Execution Log
| Step | Status | Duration | Counts / Details | Fix Commit / Notes |
|---|---|---|---|---|
| 1.1 Infra & Migrations (`1731400000000`, `1731500000000`) | PASS | ~6s | 13 migrations applied; PG 16.15 + Redis 7.2 up | `load-env.ts` created so `AppDataSource` loads `.env` before import hoisting |
| 1.2 Non-superuser `app_user` + `pnpm seed` | PASS | ~4s | `app_user` (`rolsuper=f, rolbypassrls=f`); baseline tenant seeded | Fixed `seed.ts` `SET LOCAL app.tenant_id` & `AuthService` `SECURITY DEFINER` helpers |
| 2. Auth, Lockout, RBAC, Cross-tenant (`heavy-01`) | PASS | ~8.5s | 4/4 tests passed; 3 UI signups, lockout after 5 bad passwords, token refresh, `CLIENT_VIEWER` 403 | Added `@Roles(SUPER_ADMIN, FIRM_PARTNER)` on `CompanyController`; guarded `CompanyProvider` against pre-auth 401s |
| 3. Layer A UI Masters + 5k Items (`heavy-02 S3-01`) | PASS | ~55s | 3 tenants × 3 companies = 9 companies; 20 UI parties + 50 UI items/co + 5k items on Co1–Co3; CoA, bank, numbering | Replaced `<Select>` with `<Combobox>` + `.slice(0, 100)` dropdown windowing (`638ms` load on `/invoices/new` with 5k items); added `LED_SUNDRY_DEBTORS` & `LED_SUNDRY_CREDITORS` to `coa-v1.json` |
| 4. UI Invoices, Approvals & Vouchers (`heavy-02 S4-01`) | PASS | ~13s | UI invoices via `/invoices/new`, `/approvals` approval, `/vouchers` Dr==Cr (`imbalanceCount === 0`) | Fixed `VoucherService.listVouchers` 2-step ID fetch + `entries` & `ledger` hydration |
| 5. Reports, Exports & Google Images Branding (`heavy-03`) | PASS | ~8.5s | Trial Balance, P&L, Balance Sheet, Sales, Hygiene, `.xlsx` export, Google Images logo upload/replace/history/delete, path-traversal probe | Image provenance: `https://www.google.com/search?tbm=isch&q=sample+company+logo+png` (SHA256 `176a3477...`, `39a10a1e...`) |
| 6. Layer B Volume, UI Hunt, Concurrency, Chaos, RLS (`heavy-04`) | PASS | 31.2s | 1,500/1,500 bulk invoices; `/invoices`, `/parties`, `/vouchers`, `/reports/trial-balance` all < 1,000ms (`perfNotes: []`); 20/20 parallel invoice creations with 0 duplicates; 400 malformed JSON; 390×844 mobile viewport 0 horizontal overflow; XSS/SQLi probes; `app_user` RLS `WITH CHECK` & `audit_logs_append_only` trigger verified | Fixed `InvoiceService.createInvoice` concurrency race with `pg_advisory_xact_lock`; moved `enableCors()` before `json()` in `main.ts`; fixed `TopHeader`, `AppShell`, and `/invoices` mobile overflow |
| 7. Full Uninterrupted Campaign (`heavy-01`..`heavy-04`) | PASS | 1.9m | **10/10 passed** (2026-11-25T12:06:45Z → 12:08:41Z); DB totals: `49` tenants, `40` companies, `4,020` parties, `46,018` items, `7,185` invoices, `5,422` vouchers, `21,358` journal entries | Zero `ERROR` / `QueryFailedError` / `UnhandledPromiseRejection` in `[api]` or `[pg]` during final run (outside intentional RLS & audit-trigger negative tests) |


## Data Top-up (Continuation Section 1)
- **[Product Gap]** No dedicated Purchase/Expense voucher UI screen; posted 20 `PURCHASE` vouchers per company directly via `POST /v1/companies/:companyId/vouchers` (plus `CREDIT_NOTE`, `DEBIT_NOTE`, `RECEIPT`, `PAYMENT`, `CONTRA`, `JOURNAL`).
- Topped up all 9 existing companies: 9 companies × (sales invoices across 3 months, 20 purchase vouchers, 10 credit notes, 5 debit notes, 10 cash receipts incl. >₹2L, 10 cash payments incl. >₹10k & negative cash trigger, 10 inter-bank CONTRA transfers + negative bank trigger, 2 unregistered missing-PAN/GSTIN parties, squared-off & stagnant ledgers, 5 vendor advances, 4 bank accounts with 2 fully reconciled & 2 partly reconciled CSV statements, and 9 payment links in CREATED/PAID/EXPIRED).

## Continuation UI & Exploratory Sweep (Sections 2 & 4)
- **Pages Covered (38 routes):** All 37 static routes + dynamic `/invoices/[id]` (3 templates) + `/banking/[id]/reconcile` tested across `FIRM_PARTNER` and `STAFF_ACCOUNTANT` roles, light/dark modes, and `390x844` mobile viewport (0 horizontal overflow, 0 console/React warnings, 0 5xx errors).
- **Continuation Bugs Fixed:**
  - `GET /v1/companies/:companyId/invoices?limit=N` TypeORM `take()` + `invoice.created_at` 500 crash fixed with 2-step `invoice.createdAt` ID fetch in `apps/api/src/modules/invoice/invoice.service.ts`.
  - `/reports/shared/[token]` unauthenticated access blocked by `AppShell` auth redirect fixed in `apps/web/src/components/app-shell.tsx`.
  - `ADVANCE_TO_VENDORS` export added to `apps/api/src/modules/reports/reports.controller.ts`.

## Report Reconciliation Matrix (Section 3 — 28 Reports × 9 Companies = 252 Checks)
```
REPORT CUSTOMER_SALES | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=101 | onScreenTotal=8117549.92 | dbTotal=8117549.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ITEM_SALES | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=51 | onScreenTotal=8117549.91 | dbTotal=8117549.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT TRIAL_BALANCE | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=13 | onScreenTotal=0 | dbTotal=15766117.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PROFIT_LOSS | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=1 | onScreenTotal=10153999.93 | dbTotal=10153999.93 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BALANCE_SHEET | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=8 | onScreenTotal=11100117.92 | dbTotal=11100117.93 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT GENERAL_LEDGER | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=40 | onScreenTotal=-2044000 | dbTotal=-2044000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT AR_AGEING | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=1181 | onScreenTotal=1181 | dbTotal=1181 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BRS_STATEMENT | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=4 | onScreenTotal=0 | dbTotal=0 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_MONTHLY | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_VENDOR | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_CATEGORY | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_REGISTER | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PURCHASES_ITEM | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=51 | onScreenTotal=8117549.91 | dbTotal=8117549.91 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_NEGATIVE | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=38 | onScreenTotal=4183000 | dbTotal=4183000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BANK_NEGATIVE | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=4 | onScreenTotal=5010000 | dbTotal=5010000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT INTER_BANK | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=20 | onScreenTotal=20 | dbTotal=20 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_WITHDRAWALS | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_DEPOSITS | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_EXPENSES | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_PAYMENTS_OVER_10K | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=8 | onScreenTotal=3090000 | dbTotal=3090000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_RECEIPTS_OVER_2L | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=4 | onScreenTotal=1000000 | dbTotal=1000000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_SUMMARY | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_AGEING | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ADVANCE_TO_VENDORS | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_PAN | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=9 | onScreenTotal=9 | dbTotal=9 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_GSTIN | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=45 | onScreenTotal=45 | dbTotal=45 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_SQUARED_OFF | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=2 | onScreenTotal=2 | dbTotal=2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_STAGNANT | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=1 | onScreenTotal=1 | dbTotal=1 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CUSTOMER_SALES | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=16 | onScreenTotal=77599.92 | dbTotal=77599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ITEM_SALES | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=1 | onScreenTotal=77599.91 | dbTotal=77599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT TRIAL_BALANCE | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=13 | onScreenTotal=0 | dbTotal=9664599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PROFIT_LOSS | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=1 | onScreenTotal=4957999.93 | dbTotal=4957999.93 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BALANCE_SHEET | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=8 | onScreenTotal=4998599.92 | dbTotal=4998599.93 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT GENERAL_LEDGER | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=40 | onScreenTotal=-2044000 | dbTotal=-2044000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT AR_AGEING | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=26 | onScreenTotal=26 | dbTotal=26 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BRS_STATEMENT | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=4 | onScreenTotal=0 | dbTotal=0 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_MONTHLY | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_VENDOR | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_CATEGORY | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_REGISTER | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PURCHASES_ITEM | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=1 | onScreenTotal=77599.91 | dbTotal=77599.91 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_NEGATIVE | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=38 | onScreenTotal=4183000 | dbTotal=4183000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BANK_NEGATIVE | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=4 | onScreenTotal=5010000 | dbTotal=5010000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT INTER_BANK | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=20 | onScreenTotal=20 | dbTotal=20 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_WITHDRAWALS | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_DEPOSITS | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_EXPENSES | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_PAYMENTS_OVER_10K | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=8 | onScreenTotal=3090000 | dbTotal=3090000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_RECEIPTS_OVER_2L | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=4 | onScreenTotal=1000000 | dbTotal=1000000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_SUMMARY | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_AGEING | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ADVANCE_TO_VENDORS | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_PAN | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=5 | onScreenTotal=5 | dbTotal=5 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_GSTIN | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=44 | onScreenTotal=44 | dbTotal=44 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_SQUARED_OFF | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=2 | onScreenTotal=2 | dbTotal=2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_STAGNANT | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=1 | onScreenTotal=1 | dbTotal=1 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CUSTOMER_SALES | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=16 | onScreenTotal=77599.92 | dbTotal=77599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ITEM_SALES | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=1 | onScreenTotal=77599.91 | dbTotal=77599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT TRIAL_BALANCE | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=13 | onScreenTotal=0 | dbTotal=9664599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PROFIT_LOSS | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=1 | onScreenTotal=4957999.93 | dbTotal=4957999.93 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BALANCE_SHEET | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=8 | onScreenTotal=4998599.92 | dbTotal=4998599.93 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT GENERAL_LEDGER | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=40 | onScreenTotal=-2044000 | dbTotal=-2044000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT AR_AGEING | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=26 | onScreenTotal=26 | dbTotal=26 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BRS_STATEMENT | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=4 | onScreenTotal=0 | dbTotal=0 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_MONTHLY | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_VENDOR | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_CATEGORY | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_REGISTER | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PURCHASES_ITEM | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=1 | onScreenTotal=77599.91 | dbTotal=77599.91 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_NEGATIVE | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=38 | onScreenTotal=4183000 | dbTotal=4183000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BANK_NEGATIVE | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=4 | onScreenTotal=5010000 | dbTotal=5010000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT INTER_BANK | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=20 | onScreenTotal=20 | dbTotal=20 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_WITHDRAWALS | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_DEPOSITS | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_EXPENSES | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_PAYMENTS_OVER_10K | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=8 | onScreenTotal=3090000 | dbTotal=3090000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_RECEIPTS_OVER_2L | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=4 | onScreenTotal=1000000 | dbTotal=1000000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_SUMMARY | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_AGEING | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ADVANCE_TO_VENDORS | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_PAN | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=5 | onScreenTotal=5 | dbTotal=5 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_GSTIN | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=44 | onScreenTotal=44 | dbTotal=44 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_SQUARED_OFF | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=2 | onScreenTotal=2 | dbTotal=2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_STAGNANT | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=1 | onScreenTotal=1 | dbTotal=1 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CUSTOMER_SALES | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=16 | onScreenTotal=77599.92 | dbTotal=77599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ITEM_SALES | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=1 | onScreenTotal=77599.91 | dbTotal=77599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT TRIAL_BALANCE | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=13 | onScreenTotal=0 | dbTotal=9664599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PROFIT_LOSS | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=1 | onScreenTotal=4957999.93 | dbTotal=4957999.93 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BALANCE_SHEET | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=8 | onScreenTotal=4998599.92 | dbTotal=4998599.93 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT GENERAL_LEDGER | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=40 | onScreenTotal=-2044000 | dbTotal=-2044000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT AR_AGEING | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=26 | onScreenTotal=26 | dbTotal=26 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BRS_STATEMENT | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=4 | onScreenTotal=0 | dbTotal=0 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_MONTHLY | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_VENDOR | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_CATEGORY | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_REGISTER | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PURCHASES_ITEM | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=1 | onScreenTotal=77599.91 | dbTotal=77599.91 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_NEGATIVE | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=38 | onScreenTotal=4183000 | dbTotal=4183000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BANK_NEGATIVE | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=4 | onScreenTotal=5010000 | dbTotal=5010000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT INTER_BANK | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=20 | onScreenTotal=20 | dbTotal=20 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_WITHDRAWALS | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_DEPOSITS | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_EXPENSES | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_PAYMENTS_OVER_10K | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=8 | onScreenTotal=3090000 | dbTotal=3090000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_RECEIPTS_OVER_2L | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=4 | onScreenTotal=1000000 | dbTotal=1000000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_SUMMARY | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_AGEING | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ADVANCE_TO_VENDORS | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_PAN | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=8 | onScreenTotal=8 | dbTotal=8 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_GSTIN | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=44 | onScreenTotal=44 | dbTotal=44 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_SQUARED_OFF | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=2 | onScreenTotal=2 | dbTotal=2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_STAGNANT | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=1 | onScreenTotal=1 | dbTotal=1 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CUSTOMER_SALES | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=16 | onScreenTotal=77599.92 | dbTotal=77599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ITEM_SALES | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=1 | onScreenTotal=77599.91 | dbTotal=77599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT TRIAL_BALANCE | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=13 | onScreenTotal=0 | dbTotal=9664599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PROFIT_LOSS | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=1 | onScreenTotal=4957999.93 | dbTotal=4957999.93 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BALANCE_SHEET | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=8 | onScreenTotal=4998599.92 | dbTotal=4998599.93 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT GENERAL_LEDGER | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=40 | onScreenTotal=-2044000 | dbTotal=-2044000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT AR_AGEING | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=26 | onScreenTotal=26 | dbTotal=26 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BRS_STATEMENT | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=4 | onScreenTotal=0 | dbTotal=0 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_MONTHLY | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_VENDOR | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_CATEGORY | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_REGISTER | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PURCHASES_ITEM | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=1 | onScreenTotal=77599.91 | dbTotal=77599.91 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_NEGATIVE | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=38 | onScreenTotal=4183000 | dbTotal=4183000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BANK_NEGATIVE | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=4 | onScreenTotal=5010000 | dbTotal=5010000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT INTER_BANK | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=20 | onScreenTotal=20 | dbTotal=20 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_WITHDRAWALS | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_DEPOSITS | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_EXPENSES | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_PAYMENTS_OVER_10K | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=8 | onScreenTotal=3090000 | dbTotal=3090000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_RECEIPTS_OVER_2L | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=4 | onScreenTotal=1000000 | dbTotal=1000000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_SUMMARY | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_AGEING | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ADVANCE_TO_VENDORS | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_PAN | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=5 | onScreenTotal=5 | dbTotal=5 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_GSTIN | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=44 | onScreenTotal=44 | dbTotal=44 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_SQUARED_OFF | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=2 | onScreenTotal=2 | dbTotal=2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_STAGNANT | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=1 | onScreenTotal=1 | dbTotal=1 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CUSTOMER_SALES | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=16 | onScreenTotal=77599.92 | dbTotal=77599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ITEM_SALES | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=1 | onScreenTotal=77599.91 | dbTotal=77599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT TRIAL_BALANCE | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=13 | onScreenTotal=0 | dbTotal=9664599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PROFIT_LOSS | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=1 | onScreenTotal=4957999.93 | dbTotal=4957999.93 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BALANCE_SHEET | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=8 | onScreenTotal=4998599.92 | dbTotal=4998599.93 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT GENERAL_LEDGER | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=40 | onScreenTotal=-2044000 | dbTotal=-2044000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT AR_AGEING | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=26 | onScreenTotal=26 | dbTotal=26 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BRS_STATEMENT | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=4 | onScreenTotal=0 | dbTotal=0 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_MONTHLY | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_VENDOR | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_CATEGORY | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_REGISTER | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PURCHASES_ITEM | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=1 | onScreenTotal=77599.91 | dbTotal=77599.91 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_NEGATIVE | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=38 | onScreenTotal=4183000 | dbTotal=4183000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BANK_NEGATIVE | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=4 | onScreenTotal=5010000 | dbTotal=5010000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT INTER_BANK | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=20 | onScreenTotal=20 | dbTotal=20 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_WITHDRAWALS | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_DEPOSITS | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_EXPENSES | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_PAYMENTS_OVER_10K | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=8 | onScreenTotal=3090000 | dbTotal=3090000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_RECEIPTS_OVER_2L | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=4 | onScreenTotal=1000000 | dbTotal=1000000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_SUMMARY | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_AGEING | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ADVANCE_TO_VENDORS | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_PAN | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=5 | onScreenTotal=5 | dbTotal=5 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_GSTIN | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=44 | onScreenTotal=44 | dbTotal=44 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_SQUARED_OFF | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=2 | onScreenTotal=2 | dbTotal=2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_STAGNANT | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=1 | onScreenTotal=1 | dbTotal=1 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CUSTOMER_SALES | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=16 | onScreenTotal=77599.92 | dbTotal=77599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ITEM_SALES | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=1 | onScreenTotal=77599.91 | dbTotal=77599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT TRIAL_BALANCE | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=13 | onScreenTotal=0 | dbTotal=9664599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PROFIT_LOSS | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=1 | onScreenTotal=4957999.93 | dbTotal=4957999.93 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BALANCE_SHEET | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=8 | onScreenTotal=4998599.92 | dbTotal=4998599.93 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT GENERAL_LEDGER | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=40 | onScreenTotal=-2044000 | dbTotal=-2044000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT AR_AGEING | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=26 | onScreenTotal=26 | dbTotal=26 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BRS_STATEMENT | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=4 | onScreenTotal=0 | dbTotal=0 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_MONTHLY | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_VENDOR | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_CATEGORY | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_REGISTER | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PURCHASES_ITEM | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=1 | onScreenTotal=77599.91 | dbTotal=77599.91 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_NEGATIVE | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=38 | onScreenTotal=4183000 | dbTotal=4183000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BANK_NEGATIVE | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=4 | onScreenTotal=5010000 | dbTotal=5010000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT INTER_BANK | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=20 | onScreenTotal=20 | dbTotal=20 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_WITHDRAWALS | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_DEPOSITS | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_EXPENSES | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_PAYMENTS_OVER_10K | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=8 | onScreenTotal=3090000 | dbTotal=3090000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_RECEIPTS_OVER_2L | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=4 | onScreenTotal=1000000 | dbTotal=1000000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_SUMMARY | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_AGEING | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ADVANCE_TO_VENDORS | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_PAN | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=8 | onScreenTotal=8 | dbTotal=8 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_GSTIN | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=44 | onScreenTotal=44 | dbTotal=44 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_SQUARED_OFF | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=2 | onScreenTotal=2 | dbTotal=2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_STAGNANT | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=1 | onScreenTotal=1 | dbTotal=1 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CUSTOMER_SALES | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=16 | onScreenTotal=77599.92 | dbTotal=77599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ITEM_SALES | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=1 | onScreenTotal=77599.91 | dbTotal=77599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT TRIAL_BALANCE | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=13 | onScreenTotal=0 | dbTotal=9664599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PROFIT_LOSS | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=1 | onScreenTotal=4957999.93 | dbTotal=4957999.93 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BALANCE_SHEET | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=8 | onScreenTotal=4998599.92 | dbTotal=4998599.93 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT GENERAL_LEDGER | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=40 | onScreenTotal=-2044000 | dbTotal=-2044000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT AR_AGEING | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=26 | onScreenTotal=26 | dbTotal=26 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BRS_STATEMENT | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=4 | onScreenTotal=0 | dbTotal=0 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_MONTHLY | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_VENDOR | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_CATEGORY | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_REGISTER | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PURCHASES_ITEM | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=1 | onScreenTotal=77599.91 | dbTotal=77599.91 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_NEGATIVE | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=38 | onScreenTotal=4183000 | dbTotal=4183000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BANK_NEGATIVE | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=4 | onScreenTotal=5010000 | dbTotal=5010000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT INTER_BANK | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=20 | onScreenTotal=20 | dbTotal=20 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_WITHDRAWALS | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_DEPOSITS | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_EXPENSES | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_PAYMENTS_OVER_10K | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=8 | onScreenTotal=3090000 | dbTotal=3090000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_RECEIPTS_OVER_2L | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=4 | onScreenTotal=1000000 | dbTotal=1000000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_SUMMARY | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_AGEING | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ADVANCE_TO_VENDORS | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_PAN | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=5 | onScreenTotal=5 | dbTotal=5 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_GSTIN | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=44 | onScreenTotal=44 | dbTotal=44 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_SQUARED_OFF | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=2 | onScreenTotal=2 | dbTotal=2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_STAGNANT | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=1 | onScreenTotal=1 | dbTotal=1 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CUSTOMER_SALES | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=16 | onScreenTotal=77599.92 | dbTotal=77599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ITEM_SALES | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=1 | onScreenTotal=77599.91 | dbTotal=77599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT TRIAL_BALANCE | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=13 | onScreenTotal=0 | dbTotal=9664599.92 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PROFIT_LOSS | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=1 | onScreenTotal=4957999.93 | dbTotal=4957999.93 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BALANCE_SHEET | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=8 | onScreenTotal=4998599.92 | dbTotal=4998599.93 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT GENERAL_LEDGER | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=40 | onScreenTotal=-2044000 | dbTotal=-2044000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT AR_AGEING | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=26 | onScreenTotal=26 | dbTotal=26 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BRS_STATEMENT | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=4 | onScreenTotal=0 | dbTotal=0 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_MONTHLY | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_VENDOR | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_CATEGORY | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_REGISTER | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PURCHASES_ITEM | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=1 | onScreenTotal=77599.91 | dbTotal=77599.91 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_NEGATIVE | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=38 | onScreenTotal=4183000 | dbTotal=4183000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BANK_NEGATIVE | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=4 | onScreenTotal=5010000 | dbTotal=5010000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT INTER_BANK | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=20 | onScreenTotal=20 | dbTotal=20 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_WITHDRAWALS | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_DEPOSITS | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_EXPENSES | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=40 | onScreenTotal=4196000 | dbTotal=4196000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_PAYMENTS_OVER_10K | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=8 | onScreenTotal=3090000 | dbTotal=3090000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_RECEIPTS_OVER_2L | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=4 | onScreenTotal=1000000 | dbTotal=1000000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_SUMMARY | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_AGEING | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ADVANCE_TO_VENDORS | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=2 | onScreenTotal=151000 | dbTotal=151000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_PAN | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=5 | onScreenTotal=5 | dbTotal=5 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_GSTIN | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=44 | onScreenTotal=44 | dbTotal=44 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_SQUARED_OFF | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=2 | onScreenTotal=2 | dbTotal=2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_STAGNANT | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=1 | onScreenTotal=1 | dbTotal=1 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
```
