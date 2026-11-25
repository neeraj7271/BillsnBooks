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
