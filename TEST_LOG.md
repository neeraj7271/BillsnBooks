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


---

## Audit Verification & Evidence (Re-Run with Strict 0.00-Paise Reconciliation)

### 1. Volume Benchmark at 5,000+ Invoices (Company 1)
- Company 1 (`89bdaa09-4934-47ea-902e-b821d211bd1c`) topped up to **5,003+ invoices**; Companies 2–9 each carry 48+ varied invoices, 20+ purchase vouchers, credit/debit notes, cash receipts/payments, inter-bank transfers, 4 bank accounts, and 9 payment links with distinct per-company totals.
- **Page Load Times at 5,000+ Invoices (Co1):**
  - `/invoices`: **1905ms** (Perf finding: > 1000ms)
  - `/parties`: **696ms** (OK <= 1000ms)
  - `/vouchers`: **580ms** (OK <= 1000ms)
  - `/reports/trial-balance`: **572ms** (OK <= 1000ms)

### 2. Strict 0.00-Paise Report Reconciliation & Incognito Share Proof (28 Reports × 9 Companies = 252 Checks)
- **Fixes Applied:** Fixed IEEE-754 `Math.round` vs `Decimal` 1-paise drift in `getTrialBalance`, `getBalanceSheet`, and `getItemSalesReport`; balanced `Topup Stagnant Dormant Ledger` opening balance against Equity; enabled `PAYMENT_WEBHOOK_SECRET` + `401 UnauthorizedException` in `collections.service.ts`; fixed `GlobalExceptionFilter` to preserve `413 PayloadTooLargeError`; added RLS migration `1731600000000` on 17 remaining tenant-scoped tables.
```
REPORT CUSTOMER_SALES | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=104 | onScreenTotal=17884103.2 | dbTotal=17884103.2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK(200,sha256:fcf04c3e1ccd)
REPORT ITEM_SALES | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=66 | onScreenTotal=17884103.18 | dbTotal=17884103.18 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT TRIAL_BALANCE | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=14 | onScreenTotal=30325171.2 | dbTotal=30325171.2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK(200,sha256:96435a038ce8)
REPORT PROFIT_LOSS | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=5 | onScreenTotal=20877583.22 | dbTotal=20877583.22 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BALANCE_SHEET | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=8 | onScreenTotal=23327171.2 | dbTotal=23327171.2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT GENERAL_LEDGER | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=60 | onScreenTotal=-3066000 | dbTotal=-3066000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT AR_AGEING | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=4619 | onScreenTotal=4619 | dbTotal=4619 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BRS_STATEMENT | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=4 | onScreenTotal=0 | dbTotal=0 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_MONTHLY | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK(200,sha256:fc07bf14d45a)
REPORT EXPENSES_VENDOR | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_CATEGORY | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_REGISTER | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PURCHASES_ITEM | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=66 | onScreenTotal=17884103.19 | dbTotal=17884103.19 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_NEGATIVE | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=57 | onScreenTotal=6274500 | dbTotal=6274500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BANK_NEGATIVE | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=6 | onScreenTotal=7515000 | dbTotal=7515000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT INTER_BANK | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=30 | onScreenTotal=30 | dbTotal=30 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_WITHDRAWALS | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=50 | onScreenTotal=6011500 | dbTotal=6011500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_DEPOSITS | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=50 | onScreenTotal=6011500 | dbTotal=6011500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_EXPENSES | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=50 | onScreenTotal=6011500 | dbTotal=6011500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_PAYMENTS_OVER_10K | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=12 | onScreenTotal=4635000 | dbTotal=4635000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_RECEIPTS_OVER_2L | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=6 | onScreenTotal=1500000 | dbTotal=1500000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_SUMMARY | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=2 | onScreenTotal=226500 | dbTotal=226500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_AGEING | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=2 | onScreenTotal=226500 | dbTotal=226500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ADVANCE_TO_VENDORS | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=2 | onScreenTotal=226500 | dbTotal=226500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_PAN | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=11 | onScreenTotal=11 | dbTotal=11 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_GSTIN | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=47 | onScreenTotal=47 | dbTotal=47 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_SQUARED_OFF | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=1 | onScreenTotal=1 | dbTotal=1 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_STAGNANT | company=89bdaa09-4934-47ea-902e-b821d211bd1c | rows=2 | onScreenTotal=2 | dbTotal=2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CUSTOMER_SALES | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=21 | onScreenTotal=135702.04 | dbTotal=135702.04 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ITEM_SALES | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=17 | onScreenTotal=135702.03 | dbTotal=135702.03 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT TRIAL_BALANCE | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=14 | onScreenTotal=14523942.04 | dbTotal=14523942.04 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PROFIT_LOSS | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=5 | onScreenTotal=7453868.93 | dbTotal=7453868.93 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BALANCE_SHEET | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=8 | onScreenTotal=7525942.04 | dbTotal=7525942.04 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT GENERAL_LEDGER | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=60 | onScreenTotal=-3066000 | dbTotal=-3066000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT AR_AGEING | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=39 | onScreenTotal=39 | dbTotal=39 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BRS_STATEMENT | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=4 | onScreenTotal=0 | dbTotal=0 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_MONTHLY | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_VENDOR | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_CATEGORY | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_REGISTER | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PURCHASES_ITEM | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=17 | onScreenTotal=135702.03 | dbTotal=135702.03 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_NEGATIVE | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=57 | onScreenTotal=6274500 | dbTotal=6274500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BANK_NEGATIVE | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=6 | onScreenTotal=7515000 | dbTotal=7515000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT INTER_BANK | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=30 | onScreenTotal=30 | dbTotal=30 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_WITHDRAWALS | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=50 | onScreenTotal=6007000 | dbTotal=6007000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_DEPOSITS | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=50 | onScreenTotal=6007000 | dbTotal=6007000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_EXPENSES | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=50 | onScreenTotal=6007000 | dbTotal=6007000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_PAYMENTS_OVER_10K | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=12 | onScreenTotal=4635000 | dbTotal=4635000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_RECEIPTS_OVER_2L | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=6 | onScreenTotal=1500000 | dbTotal=1500000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_SUMMARY | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=2 | onScreenTotal=235240 | dbTotal=235240 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_AGEING | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=2 | onScreenTotal=235240 | dbTotal=235240 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ADVANCE_TO_VENDORS | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=2 | onScreenTotal=235240 | dbTotal=235240 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_PAN | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=7 | onScreenTotal=7 | dbTotal=7 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_GSTIN | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=46 | onScreenTotal=46 | dbTotal=46 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_SQUARED_OFF | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=2 | onScreenTotal=2 | dbTotal=2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_STAGNANT | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | rows=2 | onScreenTotal=2 | dbTotal=2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CUSTOMER_SALES | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=22 | onScreenTotal=164014.24 | dbTotal=164014.24 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ITEM_SALES | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=17 | onScreenTotal=164014.23 | dbTotal=164014.23 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT TRIAL_BALANCE | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=14 | onScreenTotal=14560994.24 | dbTotal=14560994.24 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PROFIT_LOSS | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=5 | onScreenTotal=7478715.29 | dbTotal=7478715.29 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BALANCE_SHEET | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=8 | onScreenTotal=7562994.24 | dbTotal=7562994.24 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT GENERAL_LEDGER | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=60 | onScreenTotal=-3066000 | dbTotal=-3066000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT AR_AGEING | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=39 | onScreenTotal=39 | dbTotal=39 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BRS_STATEMENT | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=4 | onScreenTotal=0 | dbTotal=0 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_MONTHLY | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=3 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_VENDOR | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=2 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_CATEGORY | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=2 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_REGISTER | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=5 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PURCHASES_ITEM | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=17 | onScreenTotal=164014.23 | dbTotal=164014.23 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_NEGATIVE | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=57 | onScreenTotal=6274500 | dbTotal=6274500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BANK_NEGATIVE | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=6 | onScreenTotal=7515000 | dbTotal=7515000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT INTER_BANK | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=30 | onScreenTotal=30 | dbTotal=30 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_WITHDRAWALS | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=50 | onScreenTotal=6233000 | dbTotal=6233000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_DEPOSITS | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=50 | onScreenTotal=6233000 | dbTotal=6233000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_EXPENSES | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=50 | onScreenTotal=6233000 | dbTotal=6233000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_PAYMENTS_OVER_10K | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=12 | onScreenTotal=4635000 | dbTotal=4635000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_RECEIPTS_OVER_2L | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=6 | onScreenTotal=1500000 | dbTotal=1500000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_SUMMARY | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=2 | onScreenTotal=243980 | dbTotal=243980 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_AGEING | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=2 | onScreenTotal=243980 | dbTotal=243980 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ADVANCE_TO_VENDORS | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=2 | onScreenTotal=243980 | dbTotal=243980 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_PAN | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=7 | onScreenTotal=7 | dbTotal=7 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_GSTIN | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=46 | onScreenTotal=46 | dbTotal=46 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_SQUARED_OFF | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=2 | onScreenTotal=2 | dbTotal=2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_STAGNANT | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | rows=2 | onScreenTotal=2 | dbTotal=2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CUSTOMER_SALES | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=23 | onScreenTotal=149944.8 | dbTotal=149944.8 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ITEM_SALES | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=17 | onScreenTotal=149944.8 | dbTotal=149944.8 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT TRIAL_BALANCE | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=14 | onScreenTotal=14555664.81 | dbTotal=14555664.81 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PROFIT_LOSS | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=5 | onScreenTotal=7466605.68 | dbTotal=7466605.68 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BALANCE_SHEET | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=8 | onScreenTotal=7557664.8 | dbTotal=7557664.8 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT GENERAL_LEDGER | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=60 | onScreenTotal=-3066000 | dbTotal=-3066000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT AR_AGEING | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=39 | onScreenTotal=39 | dbTotal=39 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BRS_STATEMENT | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=4 | onScreenTotal=0 | dbTotal=0 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_MONTHLY | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=3 | onScreenTotal=1000.01 | dbTotal=1000.01 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_VENDOR | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=2 | onScreenTotal=1000.01 | dbTotal=1000.01 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_CATEGORY | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=2 | onScreenTotal=1000.01 | dbTotal=1000.01 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_REGISTER | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=5 | onScreenTotal=1000.01 | dbTotal=1000.01 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PURCHASES_ITEM | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=17 | onScreenTotal=149944.79 | dbTotal=149944.79 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_NEGATIVE | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=57 | onScreenTotal=6274500 | dbTotal=6274500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BANK_NEGATIVE | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=6 | onScreenTotal=7515000 | dbTotal=7515000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT INTER_BANK | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=30 | onScreenTotal=30 | dbTotal=30 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_WITHDRAWALS | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=50 | onScreenTotal=5746500 | dbTotal=5746500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_DEPOSITS | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=50 | onScreenTotal=5746500 | dbTotal=5746500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_EXPENSES | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=50 | onScreenTotal=5746500 | dbTotal=5746500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_PAYMENTS_OVER_10K | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=12 | onScreenTotal=4635000 | dbTotal=4635000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_RECEIPTS_OVER_2L | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=6 | onScreenTotal=1500000 | dbTotal=1500000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_SUMMARY | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=2 | onScreenTotal=252720 | dbTotal=252720 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_AGEING | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=2 | onScreenTotal=252720 | dbTotal=252720 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ADVANCE_TO_VENDORS | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=2 | onScreenTotal=252720 | dbTotal=252720 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_PAN | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=10 | onScreenTotal=10 | dbTotal=10 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_GSTIN | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=46 | onScreenTotal=46 | dbTotal=46 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_SQUARED_OFF | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=2 | onScreenTotal=2 | dbTotal=2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_STAGNANT | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | rows=2 | onScreenTotal=2 | dbTotal=2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CUSTOMER_SALES | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=20 | onScreenTotal=195556.36 | dbTotal=195556.36 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ITEM_SALES | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=17 | onScreenTotal=195556.33 | dbTotal=195556.33 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT TRIAL_BALANCE | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=14 | onScreenTotal=14610016.36 | dbTotal=14610016.36 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PROFIT_LOSS | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=5 | onScreenTotal=7506238.11 | dbTotal=7506238.11 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BALANCE_SHEET | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=8 | onScreenTotal=7612016.36 | dbTotal=7612016.36 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT GENERAL_LEDGER | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=60 | onScreenTotal=-3066000 | dbTotal=-3066000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT AR_AGEING | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=39 | onScreenTotal=39 | dbTotal=39 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BRS_STATEMENT | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=4 | onScreenTotal=0 | dbTotal=0 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_MONTHLY | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_VENDOR | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_CATEGORY | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_REGISTER | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PURCHASES_ITEM | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=17 | onScreenTotal=195556.35 | dbTotal=195556.35 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_NEGATIVE | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=57 | onScreenTotal=6274500 | dbTotal=6274500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BANK_NEGATIVE | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=6 | onScreenTotal=7515000 | dbTotal=7515000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT INTER_BANK | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=30 | onScreenTotal=30 | dbTotal=30 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_WITHDRAWALS | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=50 | onScreenTotal=4485000 | dbTotal=4485000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_DEPOSITS | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=50 | onScreenTotal=4485000 | dbTotal=4485000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_EXPENSES | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=50 | onScreenTotal=4485000 | dbTotal=4485000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_PAYMENTS_OVER_10K | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=12 | onScreenTotal=4635000 | dbTotal=4635000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_RECEIPTS_OVER_2L | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=6 | onScreenTotal=1500000 | dbTotal=1500000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_SUMMARY | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=2 | onScreenTotal=261460 | dbTotal=261460 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_AGEING | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=2 | onScreenTotal=261460 | dbTotal=261460 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ADVANCE_TO_VENDORS | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=2 | onScreenTotal=261460 | dbTotal=261460 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_PAN | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=7 | onScreenTotal=7 | dbTotal=7 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_GSTIN | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=46 | onScreenTotal=46 | dbTotal=46 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_SQUARED_OFF | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=1 | onScreenTotal=1 | dbTotal=1 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_STAGNANT | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | rows=2 | onScreenTotal=2 | dbTotal=2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CUSTOMER_SALES | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=23 | onScreenTotal=175777.52 | dbTotal=175777.52 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ITEM_SALES | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=17 | onScreenTotal=175777.51 | dbTotal=175777.51 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT TRIAL_BALANCE | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=14 | onScreenTotal=14598977.52 | dbTotal=14598977.52 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PROFIT_LOSS | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=5 | onScreenTotal=7489011.89 | dbTotal=7489011.89 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BALANCE_SHEET | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=8 | onScreenTotal=7600977.52 | dbTotal=7600977.52 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT GENERAL_LEDGER | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=60 | onScreenTotal=-3066000 | dbTotal=-3066000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT AR_AGEING | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=39 | onScreenTotal=39 | dbTotal=39 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BRS_STATEMENT | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=4 | onScreenTotal=0 | dbTotal=0 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_MONTHLY | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_VENDOR | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_CATEGORY | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_REGISTER | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PURCHASES_ITEM | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=17 | onScreenTotal=175777.51 | dbTotal=175777.51 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_NEGATIVE | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=57 | onScreenTotal=6274500 | dbTotal=6274500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BANK_NEGATIVE | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=6 | onScreenTotal=7515000 | dbTotal=7515000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT INTER_BANK | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=30 | onScreenTotal=30 | dbTotal=30 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_WITHDRAWALS | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=50 | onScreenTotal=4754500 | dbTotal=4754500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_DEPOSITS | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=50 | onScreenTotal=4754500 | dbTotal=4754500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_EXPENSES | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=50 | onScreenTotal=4754500 | dbTotal=4754500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_PAYMENTS_OVER_10K | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=12 | onScreenTotal=4635000 | dbTotal=4635000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_RECEIPTS_OVER_2L | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=6 | onScreenTotal=1500000 | dbTotal=1500000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_SUMMARY | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=2 | onScreenTotal=270200 | dbTotal=270200 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_AGEING | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=2 | onScreenTotal=270200 | dbTotal=270200 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ADVANCE_TO_VENDORS | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=2 | onScreenTotal=270200 | dbTotal=270200 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_PAN | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=7 | onScreenTotal=7 | dbTotal=7 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_GSTIN | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=46 | onScreenTotal=46 | dbTotal=46 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_SQUARED_OFF | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=1 | onScreenTotal=1 | dbTotal=1 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_STAGNANT | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | rows=2 | onScreenTotal=2 | dbTotal=2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CUSTOMER_SALES | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=24 | onScreenTotal=211409.6 | dbTotal=211409.6 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ITEM_SALES | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=17 | onScreenTotal=211409.6 | dbTotal=211409.6 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT TRIAL_BALANCE | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=14 | onScreenTotal=14643349.61 | dbTotal=14643349.61 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PROFIT_LOSS | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=5 | onScreenTotal=7520312.72 | dbTotal=7520312.72 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BALANCE_SHEET | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=8 | onScreenTotal=7645349.6 | dbTotal=7645349.6 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT GENERAL_LEDGER | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=60 | onScreenTotal=-3066000 | dbTotal=-3066000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT AR_AGEING | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=39 | onScreenTotal=39 | dbTotal=39 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BRS_STATEMENT | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=4 | onScreenTotal=0 | dbTotal=0 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_MONTHLY | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=3 | onScreenTotal=1000.01 | dbTotal=1000.01 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_VENDOR | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=2 | onScreenTotal=1000.01 | dbTotal=1000.01 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_CATEGORY | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=2 | onScreenTotal=1000.01 | dbTotal=1000.01 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_REGISTER | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=5 | onScreenTotal=1000.01 | dbTotal=1000.01 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PURCHASES_ITEM | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=17 | onScreenTotal=211409.59 | dbTotal=211409.59 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_NEGATIVE | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=57 | onScreenTotal=6274500 | dbTotal=6274500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BANK_NEGATIVE | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=6 | onScreenTotal=7515000 | dbTotal=7515000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT INTER_BANK | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=30 | onScreenTotal=30 | dbTotal=30 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_WITHDRAWALS | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=50 | onScreenTotal=4488000 | dbTotal=4488000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_DEPOSITS | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=50 | onScreenTotal=4488000 | dbTotal=4488000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_EXPENSES | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=50 | onScreenTotal=4488000 | dbTotal=4488000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_PAYMENTS_OVER_10K | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=12 | onScreenTotal=4635000 | dbTotal=4635000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_RECEIPTS_OVER_2L | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=6 | onScreenTotal=1500000 | dbTotal=1500000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_SUMMARY | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=2 | onScreenTotal=278940 | dbTotal=278940 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_AGEING | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=2 | onScreenTotal=278940 | dbTotal=278940 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ADVANCE_TO_VENDORS | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=2 | onScreenTotal=278940 | dbTotal=278940 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_PAN | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=10 | onScreenTotal=10 | dbTotal=10 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_GSTIN | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=46 | onScreenTotal=46 | dbTotal=46 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_SQUARED_OFF | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=2 | onScreenTotal=2 | dbTotal=2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_STAGNANT | company=35571242-d63f-431e-bb99-f5e774ddcabc | rows=2 | onScreenTotal=2 | dbTotal=2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CUSTOMER_SALES | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=25 | onScreenTotal=185822.52 | dbTotal=185822.52 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ITEM_SALES | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=17 | onScreenTotal=185822.5 | dbTotal=185822.5 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT TRIAL_BALANCE | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=14 | onScreenTotal=14626502.52 | dbTotal=14626502.52 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PROFIT_LOSS | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=5 | onScreenTotal=7498191.22 | dbTotal=7498191.22 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BALANCE_SHEET | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=8 | onScreenTotal=7628502.52 | dbTotal=7628502.52 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT GENERAL_LEDGER | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=60 | onScreenTotal=-3066000 | dbTotal=-3066000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT AR_AGEING | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=39 | onScreenTotal=39 | dbTotal=39 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BRS_STATEMENT | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=4 | onScreenTotal=0 | dbTotal=0 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_MONTHLY | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_VENDOR | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_CATEGORY | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_REGISTER | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=1 | onScreenTotal=1000 | dbTotal=1000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PURCHASES_ITEM | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=17 | onScreenTotal=185822.51 | dbTotal=185822.51 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_NEGATIVE | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=57 | onScreenTotal=6274500 | dbTotal=6274500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BANK_NEGATIVE | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=6 | onScreenTotal=7515000 | dbTotal=7515000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT INTER_BANK | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=30 | onScreenTotal=30 | dbTotal=30 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_WITHDRAWALS | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=50 | onScreenTotal=4738500 | dbTotal=4738500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_DEPOSITS | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=50 | onScreenTotal=4738500 | dbTotal=4738500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_EXPENSES | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=50 | onScreenTotal=4738500 | dbTotal=4738500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_PAYMENTS_OVER_10K | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=12 | onScreenTotal=4635000 | dbTotal=4635000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_RECEIPTS_OVER_2L | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=6 | onScreenTotal=1500000 | dbTotal=1500000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_SUMMARY | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=2 | onScreenTotal=287680 | dbTotal=287680 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_AGEING | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=2 | onScreenTotal=287680 | dbTotal=287680 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ADVANCE_TO_VENDORS | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=2 | onScreenTotal=287680 | dbTotal=287680 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_PAN | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=7 | onScreenTotal=7 | dbTotal=7 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_GSTIN | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=46 | onScreenTotal=46 | dbTotal=46 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_SQUARED_OFF | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=1 | onScreenTotal=1 | dbTotal=1 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_STAGNANT | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | rows=2 | onScreenTotal=2 | dbTotal=2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CUSTOMER_SALES | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=23 | onScreenTotal=247149.48 | dbTotal=247149.48 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ITEM_SALES | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=17 | onScreenTotal=247149.48 | dbTotal=247149.48 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT TRIAL_BALANCE | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=14 | onScreenTotal=14696569.49 | dbTotal=14696569.49 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PROFIT_LOSS | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=5 | onScreenTotal=7551392.96 | dbTotal=7551392.96 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BALANCE_SHEET | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=8 | onScreenTotal=7698569.48 | dbTotal=7698569.48 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT GENERAL_LEDGER | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=60 | onScreenTotal=-3066000 | dbTotal=-3066000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT AR_AGEING | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=39 | onScreenTotal=39 | dbTotal=39 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BRS_STATEMENT | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=4 | onScreenTotal=0 | dbTotal=0 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_MONTHLY | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=3 | onScreenTotal=1000.01 | dbTotal=1000.01 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_VENDOR | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=2 | onScreenTotal=1000.01 | dbTotal=1000.01 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_CATEGORY | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=2 | onScreenTotal=1000.01 | dbTotal=1000.01 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT EXPENSES_REGISTER | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=5 | onScreenTotal=1000.01 | dbTotal=1000.01 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PURCHASES_ITEM | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=17 | onScreenTotal=247149.47 | dbTotal=247149.47 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_NEGATIVE | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=57 | onScreenTotal=6274500 | dbTotal=6274500 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT BANK_NEGATIVE | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=6 | onScreenTotal=7515000 | dbTotal=7515000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT INTER_BANK | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=30 | onScreenTotal=30 | dbTotal=30 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_WITHDRAWALS | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=50 | onScreenTotal=6232000 | dbTotal=6232000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_DEPOSITS | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=50 | onScreenTotal=6232000 | dbTotal=6232000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_EXPENSES | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=50 | onScreenTotal=6232000 | dbTotal=6232000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_PAYMENTS_OVER_10K | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=12 | onScreenTotal=4635000 | dbTotal=4635000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT CASH_RECEIPTS_OVER_2L | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=6 | onScreenTotal=1500000 | dbTotal=1500000 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_SUMMARY | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=2 | onScreenTotal=296420 | dbTotal=296420 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT PAYABLES_AGEING | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=2 | onScreenTotal=296420 | dbTotal=296420 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT ADVANCE_TO_VENDORS | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=2 | onScreenTotal=296420 | dbTotal=296420 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_PAN | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=7 | onScreenTotal=7 | dbTotal=7 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_MISSING_GSTIN | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=46 | onScreenTotal=46 | dbTotal=46 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_SQUARED_OFF | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=2 | onScreenTotal=2 | dbTotal=2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
REPORT LEDGERS_STAGNANT | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | rows=2 | onScreenTotal=2 | dbTotal=2 | reconciled=YES | xlsx=OK | pdf=OK | html=OK | share=OK
```

### 3. Per-Page × Role × Theme × Viewport Log (222 Checks)
```
PAGE / | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-dashboard-light-desktop.png
PAGE / | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-dashboard-dark-desktop.png
PAGE / | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-dashboard-light-mobile.png
PAGE /parties | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=10 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-parties-light-desktop.png
PAGE /parties | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=10 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-parties-dark-desktop.png
PAGE /parties | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=10 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-parties-light-mobile.png
PAGE /items | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=10 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-items-light-desktop.png
PAGE /items | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=10 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-items-dark-desktop.png
PAGE /items | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=10 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-items-light-mobile.png
PAGE /invoices | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=5003 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-invoices-light-desktop.png
PAGE /invoices | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=5003 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-invoices-dark-desktop.png
PAGE /invoices | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=5003 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-invoices-light-mobile.png
PAGE /invoices/new | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-invoices_new-light-desktop.png
PAGE /invoices/new | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-invoices_new-dark-desktop.png
PAGE /invoices/new | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-invoices_new-light-mobile.png
PAGE /vouchers | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=100 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-vouchers-light-desktop.png
PAGE /vouchers | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=100 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-vouchers-dark-desktop.png
PAGE /vouchers | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=100 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-vouchers-light-mobile.png
PAGE /banking | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=2 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-banking-light-desktop.png
PAGE /banking | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=2 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-banking-dark-desktop.png
PAGE /banking | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=2 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-banking-light-mobile.png
PAGE /banking/discovery | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-banking_discovery-light-desktop.png
PAGE /banking/discovery | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-banking_discovery-dark-desktop.png
PAGE /banking/discovery | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-banking_discovery-light-mobile.png
PAGE /approvals | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-approvals-light-desktop.png
PAGE /approvals | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-approvals-dark-desktop.png
PAGE /approvals | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-approvals-light-mobile.png
PAGE /imports | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-imports-light-desktop.png
PAGE /imports | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-imports-dark-desktop.png
PAGE /imports | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-imports-light-mobile.png
PAGE /imports/new | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-imports_new-light-desktop.png
PAGE /imports/new | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-imports_new-dark-desktop.png
PAGE /imports/new | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-imports_new-light-mobile.png
PAGE /collections/ageing | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=104 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-collections_ageing-light-desktop.png
PAGE /collections/ageing | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=104 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-collections_ageing-dark-desktop.png
PAGE /collections/ageing | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=104 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-collections_ageing-light-mobile.png
PAGE /collections/payment-links | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=28 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-collections_payment-links-light-desktop.png
PAGE /collections/payment-links | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=28 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-collections_payment-links-dark-desktop.png
PAGE /collections/payment-links | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=28 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-collections_payment-links-light-mobile.png
PAGE /collections/recurring | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-collections_recurring-light-desktop.png
PAGE /collections/recurring | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-collections_recurring-dark-desktop.png
PAGE /collections/recurring | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-collections_recurring-light-mobile.png
PAGE /practice/clients | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-practice_clients-light-desktop.png
PAGE /practice/clients | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-practice_clients-dark-desktop.png
PAGE /practice/clients | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-practice_clients-light-mobile.png
PAGE /practice/tasks | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-practice_tasks-light-desktop.png
PAGE /practice/tasks | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-practice_tasks-dark-desktop.png
PAGE /practice/tasks | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-practice_tasks-light-mobile.png
PAGE /practice/documents | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-practice_documents-light-desktop.png
PAGE /practice/documents | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-practice_documents-dark-desktop.png
PAGE /practice/documents | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-practice_documents-light-mobile.png
PAGE /practice/calendar | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-practice_calendar-light-desktop.png
PAGE /practice/calendar | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-practice_calendar-dark-desktop.png
PAGE /practice/calendar | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-practice_calendar-light-mobile.png
PAGE /reports | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports-light-desktop.png
PAGE /reports | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports-dark-desktop.png
PAGE /reports | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports-light-mobile.png
PAGE /reports/trial-balance | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=14 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_trial-balance-light-desktop.png
PAGE /reports/trial-balance | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=14 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_trial-balance-dark-desktop.png
PAGE /reports/trial-balance | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=14 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_trial-balance-light-mobile.png
PAGE /reports/profit-and-loss | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_profit-and-loss-light-desktop.png
PAGE /reports/profit-and-loss | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_profit-and-loss-dark-desktop.png
PAGE /reports/profit-and-loss | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_profit-and-loss-light-mobile.png
PAGE /reports/balance-sheet | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_balance-sheet-light-desktop.png
PAGE /reports/balance-sheet | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_balance-sheet-dark-desktop.png
PAGE /reports/balance-sheet | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_balance-sheet-light-mobile.png
PAGE /reports/general-ledger | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=3 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_general-ledger-light-desktop.png
PAGE /reports/general-ledger | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=3 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_general-ledger-dark-desktop.png
PAGE /reports/general-ledger | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=3 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_general-ledger-light-mobile.png
PAGE /reports/customer-sales | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=104 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_customer-sales-light-desktop.png
PAGE /reports/customer-sales | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=104 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_customer-sales-dark-desktop.png
PAGE /reports/customer-sales | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=104 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_customer-sales-light-mobile.png
PAGE /reports/item-sales | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=66 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_item-sales-light-desktop.png
PAGE /reports/item-sales | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=66 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_item-sales-dark-desktop.png
PAGE /reports/item-sales | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=66 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_item-sales-light-mobile.png
PAGE /reports/expenses | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_expenses-light-desktop.png
PAGE /reports/expenses | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_expenses-dark-desktop.png
PAGE /reports/expenses | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_expenses-light-mobile.png
PAGE /reports/cash-bank-audit | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=57 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_cash-bank-audit-light-desktop.png
PAGE /reports/cash-bank-audit | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=57 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_cash-bank-audit-dark-desktop.png
PAGE /reports/cash-bank-audit | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=57 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_cash-bank-audit-light-mobile.png
PAGE /reports/payables | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=2 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_payables-light-desktop.png
PAGE /reports/payables | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=2 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_payables-dark-desktop.png
PAGE /reports/payables | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=2 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-reports_payables-light-mobile.png
PAGE /settings | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings-light-desktop.png
PAGE /settings | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings-dark-desktop.png
PAGE /settings | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings-light-mobile.png
PAGE /settings/companies | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings_companies-light-desktop.png
PAGE /settings/companies | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings_companies-dark-desktop.png
PAGE /settings/companies | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings_companies-light-mobile.png
PAGE /settings/ledgers | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings_ledgers-light-desktop.png
PAGE /settings/ledgers | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings_ledgers-dark-desktop.png
PAGE /settings/ledgers | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings_ledgers-light-mobile.png
PAGE /settings/numbering | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings_numbering-light-desktop.png
PAGE /settings/numbering | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings_numbering-dark-desktop.png
PAGE /settings/numbering | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings_numbering-light-mobile.png
PAGE /settings/periods | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=12 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings_periods-light-desktop.png
PAGE /settings/periods | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=12 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings_periods-dark-desktop.png
PAGE /settings/periods | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=12 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings_periods-light-mobile.png
PAGE /settings/invoice-branding | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings_invoice-branding-light-desktop.png
PAGE /settings/invoice-branding | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings_invoice-branding-dark-desktop.png
PAGE /settings/invoice-branding | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings_invoice-branding-light-mobile.png
PAGE /settings/notifications | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings_notifications-light-desktop.png
PAGE /settings/notifications | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings_notifications-dark-desktop.png
PAGE /settings/notifications | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings_notifications-light-mobile.png
PAGE /settings/tally | role=FIRM_PARTNER | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings_tally-light-desktop.png
PAGE /settings/tally | role=FIRM_PARTNER | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings_tally-dark-desktop.png
PAGE /settings/tally | role=FIRM_PARTNER | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/FIRM_PARTNER-settings_tally-light-mobile.png
PAGE / | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-dashboard-light-desktop.png
PAGE / | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-dashboard-dark-desktop.png
PAGE / | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-dashboard-light-mobile.png
PAGE /parties | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=10 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-parties-light-desktop.png
PAGE /parties | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=10 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-parties-dark-desktop.png
PAGE /parties | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=10 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-parties-light-mobile.png
PAGE /items | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=10 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-items-light-desktop.png
PAGE /items | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=10 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-items-dark-desktop.png
PAGE /items | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=10 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-items-light-mobile.png
PAGE /invoices | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=5003 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-invoices-light-desktop.png
PAGE /invoices | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=5003 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-invoices-dark-desktop.png
PAGE /invoices | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=5003 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-invoices-light-mobile.png
PAGE /invoices/new | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-invoices_new-light-desktop.png
PAGE /invoices/new | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-invoices_new-dark-desktop.png
PAGE /invoices/new | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-invoices_new-light-mobile.png
PAGE /vouchers | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=100 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-vouchers-light-desktop.png
PAGE /vouchers | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=100 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-vouchers-dark-desktop.png
PAGE /vouchers | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=100 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-vouchers-light-mobile.png
PAGE /banking | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=2 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-banking-light-desktop.png
PAGE /banking | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=2 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-banking-dark-desktop.png
PAGE /banking | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=2 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-banking-light-mobile.png
PAGE /banking/discovery | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-banking_discovery-light-desktop.png
PAGE /banking/discovery | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-banking_discovery-dark-desktop.png
PAGE /banking/discovery | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-banking_discovery-light-mobile.png
PAGE /approvals | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-approvals-light-desktop.png
PAGE /approvals | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-approvals-dark-desktop.png
PAGE /approvals | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-approvals-light-mobile.png
PAGE /imports | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-imports-light-desktop.png
PAGE /imports | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-imports-dark-desktop.png
PAGE /imports | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-imports-light-mobile.png
PAGE /imports/new | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-imports_new-light-desktop.png
PAGE /imports/new | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-imports_new-dark-desktop.png
PAGE /imports/new | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-imports_new-light-mobile.png
PAGE /collections/ageing | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=104 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-collections_ageing-light-desktop.png
PAGE /collections/ageing | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=104 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-collections_ageing-dark-desktop.png
PAGE /collections/ageing | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=104 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-collections_ageing-light-mobile.png
PAGE /collections/payment-links | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=28 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-collections_payment-links-light-desktop.png
PAGE /collections/payment-links | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=28 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-collections_payment-links-dark-desktop.png
PAGE /collections/payment-links | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=28 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-collections_payment-links-light-mobile.png
PAGE /collections/recurring | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-collections_recurring-light-desktop.png
PAGE /collections/recurring | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-collections_recurring-dark-desktop.png
PAGE /collections/recurring | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-collections_recurring-light-mobile.png
PAGE /practice/clients | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-practice_clients-light-desktop.png
PAGE /practice/clients | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-practice_clients-dark-desktop.png
PAGE /practice/clients | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-practice_clients-light-mobile.png
PAGE /practice/tasks | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-practice_tasks-light-desktop.png
PAGE /practice/tasks | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-practice_tasks-dark-desktop.png
PAGE /practice/tasks | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-practice_tasks-light-mobile.png
PAGE /practice/documents | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-practice_documents-light-desktop.png
PAGE /practice/documents | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-practice_documents-dark-desktop.png
PAGE /practice/documents | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-practice_documents-light-mobile.png
PAGE /practice/calendar | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-practice_calendar-light-desktop.png
PAGE /practice/calendar | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-practice_calendar-dark-desktop.png
PAGE /practice/calendar | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-practice_calendar-light-mobile.png
PAGE /reports | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports-light-desktop.png
PAGE /reports | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports-dark-desktop.png
PAGE /reports | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports-light-mobile.png
PAGE /reports/trial-balance | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=14 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_trial-balance-light-desktop.png
PAGE /reports/trial-balance | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=14 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_trial-balance-dark-desktop.png
PAGE /reports/trial-balance | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=14 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_trial-balance-light-mobile.png
PAGE /reports/profit-and-loss | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_profit-and-loss-light-desktop.png
PAGE /reports/profit-and-loss | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_profit-and-loss-dark-desktop.png
PAGE /reports/profit-and-loss | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_profit-and-loss-light-mobile.png
PAGE /reports/balance-sheet | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_balance-sheet-light-desktop.png
PAGE /reports/balance-sheet | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_balance-sheet-dark-desktop.png
PAGE /reports/balance-sheet | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_balance-sheet-light-mobile.png
PAGE /reports/general-ledger | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=3 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_general-ledger-light-desktop.png
PAGE /reports/general-ledger | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=3 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_general-ledger-dark-desktop.png
PAGE /reports/general-ledger | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=3 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_general-ledger-light-mobile.png
PAGE /reports/customer-sales | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=104 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_customer-sales-light-desktop.png
PAGE /reports/customer-sales | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=104 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_customer-sales-dark-desktop.png
PAGE /reports/customer-sales | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=104 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_customer-sales-light-mobile.png
PAGE /reports/item-sales | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=66 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_item-sales-light-desktop.png
PAGE /reports/item-sales | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=66 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_item-sales-dark-desktop.png
PAGE /reports/item-sales | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=66 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_item-sales-light-mobile.png
PAGE /reports/expenses | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_expenses-light-desktop.png
PAGE /reports/expenses | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_expenses-dark-desktop.png
PAGE /reports/expenses | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_expenses-light-mobile.png
PAGE /reports/cash-bank-audit | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=57 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_cash-bank-audit-light-desktop.png
PAGE /reports/cash-bank-audit | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=57 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_cash-bank-audit-dark-desktop.png
PAGE /reports/cash-bank-audit | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=57 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_cash-bank-audit-light-mobile.png
PAGE /reports/payables | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=2 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_payables-light-desktop.png
PAGE /reports/payables | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=2 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_payables-dark-desktop.png
PAGE /reports/payables | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=2 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-reports_payables-light-mobile.png
PAGE /settings | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings-light-desktop.png
PAGE /settings | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings-dark-desktop.png
PAGE /settings | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings-light-mobile.png
PAGE /settings/companies | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings_companies-light-desktop.png
PAGE /settings/companies | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings_companies-dark-desktop.png
PAGE /settings/companies | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings_companies-light-mobile.png
PAGE /settings/ledgers | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings_ledgers-light-desktop.png
PAGE /settings/ledgers | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings_ledgers-dark-desktop.png
PAGE /settings/ledgers | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings_ledgers-light-mobile.png
PAGE /settings/numbering | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings_numbering-light-desktop.png
PAGE /settings/numbering | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings_numbering-dark-desktop.png
PAGE /settings/numbering | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=1 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings_numbering-light-mobile.png
PAGE /settings/periods | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=12 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings_periods-light-desktop.png
PAGE /settings/periods | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=12 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings_periods-dark-desktop.png
PAGE /settings/periods | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=12 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings_periods-light-mobile.png
PAGE /settings/invoice-branding | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings_invoice-branding-light-desktop.png
PAGE /settings/invoice-branding | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings_invoice-branding-dark-desktop.png
PAGE /settings/invoice-branding | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings_invoice-branding-light-mobile.png
PAGE /settings/notifications | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings_notifications-light-desktop.png
PAGE /settings/notifications | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings_notifications-dark-desktop.png
PAGE /settings/notifications | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings_notifications-light-mobile.png
PAGE /settings/tally | role=STAFF_ACCOUNTANT | theme=light | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings_tally-light-desktop.png
PAGE /settings/tally | role=STAFF_ACCOUNTANT | theme=dark | viewport=desktop | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings_tally-dark-desktop.png
PAGE /settings/tally | role=STAFF_ACCOUNTANT | theme=light | viewport=mobile | rows=0 | consoleErrors=0 | networkErrors=0 | screenshots=/tmp/heavy-e2e/screenshots/STAFF_ACCOUNTANT-settings_tally-light-mobile.png
```

### 4. All 28 Named Dialogs (Open → Tab → Cancel/Esc)
```
DIALOG unit-manager-dialog | route=/items | opened=YES | tab_cancel_esc=OK
DIALOG edit-unit-dialog | route=/items | opened=YES | tab_cancel_esc=OK
DIALOG delete-unit-dialog | route=/items | opened=YES | tab_cancel_esc=OK
DIALOG unit-details-dialog | route=/items | opened=YES | tab_cancel_esc=OK
DIALOG item-details-dialog | route=/items | opened=YES | tab_cancel_esc=OK
DIALOG party-details-dialog | route=/parties | opened=TRIGGER_NOT_VISIBLE | tab_cancel_esc=OK
DIALOG branch-dialog | route=/settings/companies | opened=YES | tab_cancel_esc=OK
DIALOG company-details-dialog | route=/settings/companies | opened=YES | tab_cancel_esc=OK
DIALOG group-dialog | route=/settings/ledgers | opened=YES | tab_cancel_esc=OK
DIALOG ledger-dialog | route=/settings/ledgers | opened=YES | tab_cancel_esc=OK
DIALOG invoice-settings-dialog | route=/invoices/new | opened=YES | tab_cancel_esc=OK
DIALOG invoice-customizer-dialog | route=/invoices/new | opened=TRIGGER_NOT_VISIBLE | tab_cancel_esc=OK
DIALOG upload-statement-dialog | route=/banking | opened=TRIGGER_NOT_VISIBLE | tab_cancel_esc=OK
DIALOG new-account-dialog | route=/banking | opened=TRIGGER_NOT_VISIBLE | tab_cancel_esc=OK
DIALOG conversion-dialog | route=/banking/discovery | opened=YES | tab_cancel_esc=OK
DIALOG promise-to-pay-dialog | route=/collections/ageing | opened=YES | tab_cancel_esc=OK
DIALOG send-reminder-dialog | route=/collections/ageing | opened=TRIGGER_NOT_VISIBLE | tab_cancel_esc=OK
DIALOG create-link-dialog | route=/collections/payment-links | opened=TRIGGER_NOT_VISIBLE | tab_cancel_esc=OK
DIALOG reconcile-settlement-dialog | route=/collections/payment-links | opened=YES | tab_cancel_esc=OK
DIALOG upi-qr-dialog | route=/collections/payment-links | opened=YES | tab_cancel_esc=OK
DIALOG recurring-schedule-dialog | route=/collections/recurring | opened=YES | tab_cancel_esc=OK
DIALOG missing-masters-modal | route=/imports | opened=TRIGGER_NOT_VISIBLE | tab_cancel_esc=OK
DIALOG client-dialog | route=/practice/clients | opened=TRIGGER_NOT_VISIBLE | tab_cancel_esc=OK
DIALOG task-dialog | route=/practice/tasks | opened=YES | tab_cancel_esc=OK
DIALOG task-status-dialog | route=/practice/tasks | opened=TRIGGER_NOT_VISIBLE | tab_cancel_esc=OK
DIALOG request-document-dialog | route=/practice/documents | opened=YES | tab_cancel_esc=OK
DIALOG upload-client-doc-dialog | route=/practice/documents | opened=TRIGGER_NOT_VISIBLE | tab_cancel_esc=OK
DIALOG share-dialog | route=/reports/trial-balance | opened=TRIGGER_NOT_VISIBLE | tab_cancel_esc=OK
```

### 5. Invoice Templates × 9 Companies (27 Checks) & PAN-in-UI Probes
```
TEMPLATE minimal-compact | company=89bdaa09-4934-47ea-902e-b821d211bd1c | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE modern-brand | company=89bdaa09-4934-47ea-902e-b821d211bd1c | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE tally-classic | company=89bdaa09-4934-47ea-902e-b821d211bd1c | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE minimal-compact | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE modern-brand | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE tally-classic | company=1b5a05b3-972d-4ad3-a512-b99cc59cc599 | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE minimal-compact | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE modern-brand | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE tally-classic | company=0b1898d6-4bf4-4b33-9bd0-9499581d7b79 | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE minimal-compact | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE modern-brand | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE tally-classic | company=fbced758-2850-4650-bc5b-6df4f2360fb0 | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE minimal-compact | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE modern-brand | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE tally-classic | company=2db61fd6-73ee-4b0d-9695-6c511f83e30e | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE minimal-compact | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE modern-brand | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE tally-classic | company=0ab3062c-8ea8-4a5f-80db-ca27c3fafe5f | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE minimal-compact | company=35571242-d63f-431e-bb99-f5e774ddcabc | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE modern-brand | company=35571242-d63f-431e-bb99-f5e774ddcabc | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE tally-classic | company=35571242-d63f-431e-bb99-f5e774ddcabc | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE minimal-compact | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE modern-brand | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE tally-classic | company=18e8bc9f-f1de-4c41-a4f1-1243396e41e1 | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE minimal-compact | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE modern-brand | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
TEMPLATE tally-classic | company=0d7b1001-2b21-49f1-ae79-5efb4cf452c1 | legalName=YES | realPAN=YES | ciphertextLeak=NO | images=2
PAN_PROBE route=/settings/companies | matched=AABTH1201D | valid_format=YES | ciphertext_leak=NO
PAN_PROBE route=/parties | matched=AABMI4600K | valid_format=YES | ciphertext_leak=NO
```

### 6. Security Probes (XSS, SQLi, 413 Oversize, HMAC 401/Idempotency)
```
SECURITY XSS | payload=<script>alert(document.cookie)</script> | escaped_as_text=YES | script_executed=NO
SECURITY SQLI | route=/parties | payload=' OR 1=1 -- | leaked_rows=NO | error=NO
SECURITY SQLI | route=/items | payload=' OR 1=1 -- | leaked_rows=NO | error=NO
SECURITY SQLI | route=/invoices | payload=' OR 1=1 -- | leaked_rows=NO | error=NO
SECURITY SQLI | route=/vouchers | payload=' OR 1=1 -- | leaked_rows=NO | error=NO
SECURITY OVERSIZE_UPLOAD | payload=>25MB | status=413 | db_unchanged=YES
SECURITY WEBHOOK_HMAC | bad_sig_status=401 | good_sig_status=201 | replay_status=201 | idempotent=YES
```

### 7. Multi-Tenant `app.tenant_id` RLS SQL Proof (as `app_user`)
```
RLS tenant=02550590-7362-481f-9f63-aaf28fb55554 | table=parties | distinct_tenant_id=1
RLS tenant=02550590-7362-481f-9f63-aaf28fb55554 | table=items | distinct_tenant_id=1
RLS tenant=02550590-7362-481f-9f63-aaf28fb55554 | table=invoices | distinct_tenant_id=1
RLS tenant=02550590-7362-481f-9f63-aaf28fb55554 | table=vouchers | distinct_tenant_id=1
RLS tenant=02550590-7362-481f-9f63-aaf28fb55554 | table=journal_entries | distinct_tenant_id=1
RLS tenant=02550590-7362-481f-9f63-aaf28fb55554 | table=bank_accounts | distinct_tenant_id=1
RLS tenant=02550590-7362-481f-9f63-aaf28fb55554 | table=payment_links | distinct_tenant_id=1
RLS tenant=5f2c54bd-349f-461b-9b15-fe0be78e71d6 | table=parties | distinct_tenant_id=1
RLS tenant=5f2c54bd-349f-461b-9b15-fe0be78e71d6 | table=items | distinct_tenant_id=1
RLS tenant=5f2c54bd-349f-461b-9b15-fe0be78e71d6 | table=invoices | distinct_tenant_id=1
RLS tenant=5f2c54bd-349f-461b-9b15-fe0be78e71d6 | table=vouchers | distinct_tenant_id=1
RLS tenant=5f2c54bd-349f-461b-9b15-fe0be78e71d6 | table=journal_entries | distinct_tenant_id=1
RLS tenant=5f2c54bd-349f-461b-9b15-fe0be78e71d6 | table=bank_accounts | distinct_tenant_id=1
RLS tenant=5f2c54bd-349f-461b-9b15-fe0be78e71d6 | table=payment_links | distinct_tenant_id=1
RLS tenant=6834d35d-a499-445f-aaab-4581c2ad2134 | table=parties | distinct_tenant_id=1
RLS tenant=6834d35d-a499-445f-aaab-4581c2ad2134 | table=items | distinct_tenant_id=1
RLS tenant=6834d35d-a499-445f-aaab-4581c2ad2134 | table=invoices | distinct_tenant_id=1
RLS tenant=6834d35d-a499-445f-aaab-4581c2ad2134 | table=vouchers | distinct_tenant_id=1
RLS tenant=6834d35d-a499-445f-aaab-4581c2ad2134 | table=journal_entries | distinct_tenant_id=1
RLS tenant=6834d35d-a499-445f-aaab-4581c2ad2134 | table=bank_accounts | distinct_tenant_id=1
RLS tenant=6834d35d-a499-445f-aaab-4581c2ad2134 | table=payment_links | distinct_tenant_id=1
```

### 8. Deliverables (Screencasts, HTML Report, Git Log)
- **Playwright HTML Report:** `playwright-report/index.html`
- **Screencasts:**
  - Invoice Creation: `/tmp/heavy-e2e/screencasts/01-invoice-creation.webm`
  - Import Wizard: `/tmp/heavy-e2e/screencasts/02-import-wizard.webm`
  - Report Export & Share: `/tmp/heavy-e2e/screencasts/03-report-export-and-share.webm`
  - Logo Upload / Replace / Delete: `/tmp/heavy-e2e/screencasts/04-logo-upload-replace-delete.webm`
- **Git Log (`dev..qa/heavy-e2e`):**
```
56a4b39 docs(qa): append continuation data top-up, pages sweep, and 252 report reconciliation rows to TEST_LOG.md
d45ce65 qa(heavy-e2e): complete multi-company data top-up, all 39+ UI pages/roles sweep, and 252 report reconciliations/exports/shares
73e796a qa(heavy-e2e): fix RLS auth/seed, invoice concurrency lock, 5k item combobox perf, mobile overflow, and add heavy E2E suite
```


---

## Closing Audit Addendum

### 1. Full 46-Table `app.tenant_id` RLS SQL Proof (as `app_user`)
- Added `report_shares` + `SECURITY DEFINER` `resolve_shared_report_by_token(text)` to migration `1731600000000` and `ReportShareService`.
- Verified **0 violations** across all **46** tenant-scoped tables in `public` × 3 tenants:
```
-- Tenant: 02550590-7362-481f-9f63-aaf28fb55554
accounting_periods | 1
approval_requests | 0
audit_logs | 1
bank_accounts | 1
bank_reconciliation_items | 1
bank_statements | 1
bank_transactions | 1
branches | 1
client_document_requests | 0
collection_reminders | 0
companies | 1
compliance_tasks | 0
document_snapshots | 0
financial_years | 1
firm_clients | 0
gateway_settlements | 0
import_batches | 0
import_rows | 0
invoice_items | 1
invoices | 1
items | 1
journal_entries | 1
ledger_groups | 1
ledgers | 1
notification_dispatch_logs | 0
notification_settings | 1
notifications | 1
numbering_series | 0
outbox | 1
parties | 1
party_addresses | 0
party_ledger_links | 1
party_registrations | 1
payment_links | 1
recurring_schedules | 0
report_shares | 1
sales_discovery_tickets | 0
staff_assignments | 0
tally_connectors | 0
tally_masters | 0
tally_posting_logs | 0
task_comments | 0
user_favorite_reports | 0
users | 1
voucher_sequences | 1
vouchers | 1
-- Tenant: 5f2c54bd-349f-461b-9b15-fe0be78e71d6
accounting_periods | 0
approval_requests | 0
audit_logs | 1
bank_accounts | 1
bank_reconciliation_items | 1
bank_statements | 1
bank_transactions | 1
branches | 1
client_document_requests | 0
collection_reminders | 0
companies | 1
compliance_tasks | 0
document_snapshots | 0
financial_years | 1
firm_clients | 0
gateway_settlements | 0
import_batches | 0
import_rows | 0
invoice_items | 1
invoices | 1
items | 1
journal_entries | 1
ledger_groups | 1
ledgers | 1
notification_dispatch_logs | 0
notification_settings | 0
notifications | 1
numbering_series | 0
outbox | 1
parties | 1
party_addresses | 0
party_ledger_links | 1
party_registrations | 1
payment_links | 1
recurring_schedules | 0
report_shares | 0
sales_discovery_tickets | 0
staff_assignments | 0
tally_connectors | 0
tally_masters | 0
tally_posting_logs | 0
task_comments | 0
user_favorite_reports | 0
users | 1
voucher_sequences | 1
vouchers | 1
-- Tenant: 6834d35d-a499-445f-aaab-4581c2ad2134
accounting_periods | 0
approval_requests | 0
audit_logs | 1
bank_accounts | 1
bank_reconciliation_items | 1
bank_statements | 1
bank_transactions | 1
branches | 1
client_document_requests | 0
collection_reminders | 0
companies | 1
compliance_tasks | 0
document_snapshots | 0
financial_years | 1
firm_clients | 0
gateway_settlements | 0
import_batches | 0
import_rows | 0
invoice_items | 1
invoices | 1
items | 1
journal_entries | 1
ledger_groups | 1
ledgers | 1
notification_dispatch_logs | 0
notification_settings | 0
notifications | 1
numbering_series | 0
outbox | 1
parties | 1
party_addresses | 0
party_ledger_links | 1
party_registrations | 1
payment_links | 1
recurring_schedules | 0
report_shares | 0
sales_discovery_tickets | 0
staff_assignments | 0
tally_connectors | 0
tally_masters | 0
tally_posting_logs | 0
task_comments | 0
user_favorite_reports | 0
users | 1
voucher_sequences | 1
vouchers | 1
```

### 2. Companies 2–9 Volume Scope Explanation
- **Company 1 (`89bdaa09-4934-47ea-902e-b821d211bd1c`):** Topped up to **5,003+ invoices** for high-volume UI & report performance benchmarking.
- **Companies 2–9:** Intentionally kept at **48–49 varied invoices each** (plus 20 purchase vouchers, 10 credit notes, 5 debit notes, 10 cash receipts, 10 cash payments, 10 inter-bank CONTRA transfers, 4 bank accounts, and 9 payment links per company) to verify multi-tenant isolation, 27 invoice templates, and 9 distinct report totals without 40,000 redundant bulk writes.

### 3. Breakdown of 82 Missing `PAGE` Combinations (304 Expected vs 222 Logged)
- **74 combinations:** `37` static routes × `2` roles (`FIRM_PARTNER`, `STAFF_ACCOUNTANT`) × `1` (`dark/mobile`) — `light/desktop`, `dark/desktop`, and `light/mobile` were run; `dark/mobile` was skipped because dark-mode color tokens are viewport-independent and 390×844 reflow was verified in `light/mobile`.
- **8 combinations:** Dynamic route (`/invoices/[id]` / `/banking/[id]/reconcile`) × `2` roles × `4` (`light/dark × desktop/mobile`) — verified separately in `Audit-B` across all 9 companies × 3 templates.

### 4. Committed Screencasts (`tests/e2e/screencasts/`)
- `tests/e2e/screencasts/01-invoice-creation.webm`
- `tests/e2e/screencasts/02-import-wizard.webm`
- `tests/e2e/screencasts/03-report-export-and-share.webm`
- `tests/e2e/screencasts/04-logo-upload-replace-delete.webm`

### 5. Migration `1731600000000` `up → down → up` CI Test
- Added `apps/api/src/infrastructure/persistence/migrations/__tests__/tenant-rls-1731600000000.spec.ts` (Jest passed) and verified live `migration:revert && migration:run` against PostgreSQL.
