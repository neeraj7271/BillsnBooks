# 🚨 Heavy End-to-End Live User Testing — Antigravity Books / BillsnBooks

**This is real end-to-end user testing, not seed scripts.** You will drive the running web app as an actual human would — clicks, keystrokes, dialog navigation, file pickers, downloads — via headless Playwright against the production-mode build. Seeded data is only used to prove the app is empty-ready; every piece of business data in this run must enter the system through the UI.

Repo root: `/Users/neeraj/Desktop/Neeraj/Personal/Test` (monorepo). Base branch: `dev`. Create a working branch `qa/heavy-e2e` off `dev`. All code fixes land there.

---

## 0. Rules you WILL follow

1. **UI-first, no shortcuts.** Signup, login, every create/edit/delete, every upload, every approve, every report export — all through actual Playwright interactions against the running `apps/web`. No direct `curl` into the API to manufacture records, no SQL inserts, no calling the bulk-import endpoint programmatically with a prebuilt CSV when the UI flow is "open the import dialog, pick a file, map columns, click Confirm". If the UI is too slow for the volume, that's a UI bug — paginate server-side, virtualize the lists, raise it as a finding, don't bypass the UI to pretend it works.
2. **Live streaming logs** in one terminal, prefixed per source: `[pg]`, `[api]`, `[web]`, `[worker]`, `[test]`. Tail them concurrently (`tail -f ... | sed 's/^/[api] /'` or `concurrently`). Do not suppress stdout.
3. **Headless only.** `playwright test --reporter=line`, `headless: true`, `--workers=10`, trace on retry, video on failure. Never open a visible browser.
4. **Real third-party data.** When the test needs an image (logo / signature / profile pic), fetch a real one from Google Image Search via Playwright itself — open images.google.com, search, click a result, download, feed it into the file picker in Settings. Keep provenance (URL + sha256) in `TEST_LOG.md`.
5. **Real volume:** 20 tenants, 20 companies, 200 customers per company, 5 000 items per company, 50 invoices per customer. Every one of them created through the UI by a Playwright script that drives the human flow. If a flow has a "bulk import" option in the UI, use that UI option — not the API behind it.
6. **Reconcile every number you see on a report page against the raw data you entered.** If the Trial Balance doesn't balance to the paise, if the Balance Sheet's A ≠ L + E, if a Sales voucher is missing Output CGST/SGST, if a PAN on screen looks like `abcd:ef12:...`, open a bug in `TEST_LOG.md`, fix the code on `qa/heavy-e2e`, re-run the affected section.
7. **Zero red in the console.** React warnings, hydration errors, unhandled promise rejections, failed network requests that aren't deliberate negative-path tests — all fail the run.
8. **Don't stop.** Keep going until the entire matrix below is green on one uninterrupted run. If something blocks, fix it and resume, don't downsize the counts.
9. **No fake passes.** Ever. If a step genuinely can't pass, stop with an honest report of exactly where and why.

---

## 1. Infra bring-up

- `docker compose -f docker/docker-compose.yml up -d postgres redis minio` — confirm each is healthy.
- `pnpm install` at repo root.
- `cd apps/api && pnpm migration:run` — all 12 migrations including `1731400000000-TenantRlsWithCheckAndAuditAppendOnly` must apply.
- **Switch the API's DB user to a non-superuser role** (`CREATE ROLE app_user LOGIN NOSUPERUSER PASSWORD '...'; GRANT ... ON ALL TABLES/SEQUENCES ...`). Point `DATABASE_USER=app_user` in `.env`. Restart the API. This is required so RLS actually enforces; otherwise the whole multi-tenancy proof is theatre.
- Boot: `pnpm --filter @platform/api start` (NOT dev; build + production so you catch build-time issues), `pnpm --filter @platform/web start`, `pnpm --filter @platform/worker start`. Verify `GET /v1/health` → `HEALTHY`, `database: UP` by opening the URL from the Playwright browser, not curl.

**No seed data beyond the empty baseline.** Everything else is created through the UI as users.

---

## 2. Real user signup / login journeys

Write Playwright scripts that:

- Open the signup page, fill the form (visible errors on invalid inputs, Enter submits, spinner shows during request, redirect lands on the dashboard).
- Log out via the top header, log back in, confirm access token refreshes automatically when it expires (fake the expiry in the test by advancing clock or waiting past the 15-min token life with a very short-lived env override).
- Forgot-password flow end to end if the UI exposes it.
- Attempt login with wrong password 5 times — UI shows lockout after the 5th. Wait, retry, succeeds.

Do this for **20 real tenant signups**, each with a unique email the Playwright script types in. For each tenant:

- Invite 1 `STAFF_ACCOUNTANT` and 1 `CLIENT_VIEWER` through the users UI (whatever the current invite flow is). The invited users open the invite link (intercept the email via mailpit/mailhog in docker-compose, or read it from the API's dev mail sink) and complete their signup.
- Confirm roles are respected: the `CLIENT_VIEWER` cannot see the Settings / Users page in the sidebar; attempts to visit the URL directly show an access-denied page, not a crash.

**Cross-tenant check (UI level):** log in as tenant B's user, note the URL pattern for tenant A's company (sniff from tenant A's browser via a parallel context), paste it into tenant B's address bar → the page shows "Not Found" or redirects, never leaks tenant A data.

---

## 3. Masters created through the UI, at volume

Per tenant's first company, a Playwright script will:

- Open "Create Company", fill the legal name, PAN, default currency, submit, confirm the company appears in the top-bar switcher.
- Edit the head-office branch, enter a **valid GSTIN** (calculate with `packages/gst-rules` checksum helper, then type it character by character into the input), state code, address.
- Open "Seed Chart of Accounts", click Confirm, wait for the toast, open the Ledgers page and confirm ~200 ledgers appear.

Then for each of the **60 companies total (3 per tenant)**:

- **200 parties** entered through the Parties page. The first 10 by hand-driven dialog (open dialog, type each field, Save). The remaining 190 via the UI's "Import Parties" wizard — upload a CSV through the file picker, map columns on screen, click Preview, resolve warnings, click Confirm, wait for the batch to complete, open the batch detail page and confirm 0 FAILED rows. Open a few random parties afterward to confirm fields saved correctly (GSTIN, PAN, state, billing address).
- **5000 items** via the Items page's "Import Items" wizard, same pattern. Half GOODS, half SERVICE. HSN/SAC codes real, GST slabs across 0/5/12/18/28, some with cess. After import, open the items list — confirm the pagination, sorting, search, and column filters all work with 5000 rows (no UI freeze; if the page takes more than 3 s to respond or hangs, that's a bug to fix).
- **20 bank accounts** created by hand through the Banking page (valid IFSC, account number, type).
- **10 numbering series** configured through Settings → Numbering (per document type), with prefix, running number, reset frequency.

---

## 4. Transactions through the UI

Per company (×60), via Playwright scripts that genuinely open the Invoice/Voucher pages:

- **50 invoices per customer** (10 000 per company, **600 000 total**). For each: open "New Invoice", pick the party from the typeahead (test the typeahead reaches the right record even in a 200-party list), pick items from the typeahead (test it for a 5 000-item list), set quantity, change rate, set place-of-supply, pick template, Save Draft; a subset of them Submit for Approval; a subset of those get approved from the Approvals page by a user with the `FIRM_PARTNER` role.
  - Mix: 70% intra-state, 25% inter-state, 5% RCM, 2% with cess, 3% zero-rated/export.
  - Approved invoices should auto-post the voucher — assertion in the next step.
- **100 credit notes** and **50 debit notes** per company via their own UI flows.
- **500 bank transactions per bank account**: use the Statement Upload wizard, pick a realistic bank statement CSV, run the match-suggestions, click Match on the suggested ones, create ad-hoc vouchers for the orphans.
- **200 payment collection links** per company via the Collections UI. Half get marked PAID by driving the "simulate callback" UI if present, or by calling the webhook from the test (that's an external integration path, not a UI flow, so curl is fine for the callback itself — but with a correct HMAC signature).

**Per-invoice integrity assertions (open the invoice page, then the posted voucher page, read the on-screen values):**

- Invoice total on screen == sum of line totals you entered.
- Approved invoice → open its voucher → `Σ debit == Σ credit` in the on-screen journal entries table.
- Intra-state invoice → voucher shows `Output CGST` and `Output SGST`, NOT `Input CGST`/`Input SGST`, NOT "Sales" absorbing the tax.
- Inter-state → `Output IGST`.
- Cess → `Output Cess`.
- Round-off → separate `Round Off` row, not folded into Sales.
- RCM → tax ledgers absent on the Sales voucher, Sales credited for subtotal only.
- Open the invoice PDF preview — confirm the party's real PAN appears, the company's real PAN appears. If either reads like `abcd1234:ef5678:...`, that is a decryption-leakage bug; fail the test.

---

## 5. Reports through the UI

For each company, go to Reports, open each of these reports in the browser, let the page render, then click Export:

- Trial Balance → on-screen Dr total == Cr total to the paise. Export to Excel, open the file in the test, confirm the totals match the on-screen figures.
- P&L → Revenue − Expenses == Net Profit (on screen). Export PDF, parse text, confirm.
- Balance Sheet → `Assets == Liabilities + Equity`, FY start shows `2026-04-01`, Equity section is populated. Net Profit from the P&L equals the equity delta.
- GSTR-1 summary and GSTR-3B summary → totals reconcile against the invoices you filtered to this period.
- Customer / Vendor Ageing → open totals reconcile against the parties page's on-screen balance column.
- Cash & Bank Audit → matched bank txns reconcile to the Banking page figures.
- Ledger Hygiene (missing-PAN, missing-GSTIN) → the list shows only the parties you intentionally left incomplete.

Export every report to every format the UI offers (xlsx, pdf, html). Download via Playwright, open the file, assert the totals row matches what was on screen; for PDFs, assert the real company legal name and real PAN appear (no placeholder, no ciphertext).

---

## 6. File uploads — logos, signatures, DSC — real images from Google

For each of the 60 companies:

1. Playwright opens `https://www.google.com/imagesrq=<query>` in a new context, searches `"sample company logo"` / `"handwritten signature png"` / `"digital signature certificate sample"`, clicks a result, screenshots-fallback or downloads the image. Record the URL + sha256 in `TEST_LOG.md`.
2. Open Settings → Branding in the app. Pick the downloaded logo via the file picker. Click Save. Confirm the logo preview updates on screen.
3. Repeat for authorized signatory signature.
4. Upload a dummy PDF as the DSC cert.
5. Generate an invoice PDF — open it, confirm the logo is on the page and the signature is on the page.
6. **Replace** the logo (upload a different downloaded image). Re-generate the PDF — new logo appears; old logo file is purged from the storage bucket (list bucket via MinIO client in the test to confirm).
7. **Delete** the logo through the UI. Re-render. No broken-image placeholder, just no logo.
8. Re-upload. Then try to upload `../../etc/passwd` renamed as `.png`, and `evil.html` as logo — UI rejects with a visible error, backend does not write any file.

Repeat the same cycle for the invited user's profile picture if the app has one.

---

## 7. UI bug hunt (headless Playwright)

Run exhaustive tests against every page and every interactive element. Screenshot everything on failure. Specifically:

- Signup, login, invite-accept, forgot-password, logout — all green.
- Company switcher in the top bar — switching re-renders the sidebar, header, every list page to the new company's data (no stale rows from the previous company).
- Every list page (Parties, Items, Invoices, Vouchers, Payments, Bank Txns, Approvals, Audit Log): paginate through every page, sort by every sortable column (asc + desc), apply every filter, search, bulk-select, bulk-delete. Confirm the row count on screen matches the API response count.
- Every create/edit dialog: Tab through every field, required-field errors render inline (not as a global toast only), Save closes and refreshes, Cancel discards with a confirmation when there are unsaved changes, Esc closes.
- Keyboard-only navigation: Tab reaches every focusable control in a sensible order, Enter submits, Esc closes.
- Dark and light theme: visual regression snapshot each page in each theme, diff against baseline you capture on the first green run.
- Mobile viewport (iPhone 13, 390×844): no horizontal scroll on any page, the drawer menu opens/closes, touch targets are ≥ 44 px.
- Every invoice template (`minimal-compact`, `modern-brand`, `tally-classic`): render all three for a sample invoice, pixel-diff against baseline.
- Scan the browser console on every navigation: no React warnings, no hydration mismatches, no 404s on bundle chunks.
- Every network request in the Playwright trace: no 500s, no CORS errors, no secret tokens or encrypted blobs appearing in a response body visible to another tenant.

---

## 8. Concurrency and races (driven by multiple parallel Playwright contexts)

- 20 browser contexts in parallel, each creating an invoice in the same numbering series → the DB shows no duplicate invoice numbers, no gap beyond 1 (which indicates the retry-on-unique-violation actually works).
- 5 browser contexts try to approve the same invoice simultaneously → one succeeds, four get a user-visible "already processed" message, exactly one voucher exists in the DB afterward.
- Two contexts try to lock the same period at the same time → one wins, the other sees a clear error.
- One context deletes a party while another is editing an invoice that references it → either the delete is refused with a visible error, or the invoice edit fails cleanly.

---

## 9. Scheduled jobs and background worker

- Create a recurring invoice schedule through the UI. Advance `nextRunAt` by direct SQL as the test harness (this one back-door is acceptable because it's clock manipulation, not data manufacturing). Tick the worker. Observe the new invoice appear in the UI. Tick again — no duplicate.
- Create an overdue invoice. Verify the collections reminder job dispatches exactly once.
- Observe the outbox — events are consumed, status flips to PUBLISHED. Kill the worker mid-batch, restart, confirm no duplicate downstream effects (idempotency key honored).

---

## 10. Negative paths and chaos

- Mid-flow (during an invoice create), kill Postgres → the UI shows a user-friendly error ("something went wrong, please retry"), not a stack trace. Restart Postgres, retry succeeds, no partial invoice left behind.
- Kill Redis → the UI continues to work; any feature that wrongly hard-requires Redis is a bug.
- XSS probe: enter `<script>alert(1)</script>` as a party name; it renders as literal text on every page that shows the name, never executes.
- SQLi probe: search `' OR 1=1 --` in every list page's search box; returns zero rows (or treats it as a literal substring), no error.
- Oversize upload: 100 MB file through the logo picker → UI rejects with a visible size-limit error, nothing hits the bucket.
- Payment-link webhook: bad HMAC signature → 401; replayed good signature on an already-paid link → no second state change.

---

## 11. Multi-tenant proof (live, against the real DB, as `app_user`)

After everything above, open a `psql` session as `app_user`. For each tenant, do:

```sql
SELECT set_config('app.tenant_id', '<tenant_id>', false);
SELECT COUNT(DISTINCT tenant_id) FROM parties;
SELECT COUNT(DISTINCT tenant_id) FROM items;
SELECT COUNT(DISTINCT tenant_id) FROM invoices;
SELECT COUNT(DISTINCT tenant_id) FROM vouchers;
SELECT COUNT(DISTINCT tenant_id) FROM journal_entries;
SELECT COUNT(DISTINCT tenant_id) FROM audit_logs;
```

Each `COUNT(DISTINCT tenant_id)` must be `1`. If any returns `2+`, RLS is leaking on that table — add the missing policy, re-migrate, re-run the affected section.

Then try to insert a row with a tenant_id that does NOT match `set_config` — the insert must be rejected by the policy's `WITH CHECK`. Same for update.

Then run `UPDATE audit_logs SET action = action WHERE ...` on a real row — the append-only trigger must raise. Same for `DELETE`.

---

## 12. Final deliverable

When — and only when — the matrix is green on an uninterrupted run:

1. Commit everything to `qa/heavy-e2e`.
2. Push.
3. Open a PR into `dev`. The PR description lists:
   - Exact volume tested (tenants / companies / parties / items / invoices / vouchers / files uploaded).
   - Wall-clock duration of the full run.
   - Every bug found, root cause, fix commit.
   - Any remaining known issues, with severity and the reason they're not fixed.
4. Attach `TEST_LOG.md`, the Playwright HTML report, the API log tail, and at least one video of a full invoice-creation journey.

If any step genuinely can't pass, stop with an honest report of exactly where and why — never downsize the counts to pretend, never bypass the UI to pretend, never mark a fail as a pass.

**Begin. Keep the terminal streaming. Don't stop until this reads green.**
