# 🚨 CONTINUATION — Finish the heavy E2E on `qa/heavy-e2e`. Same account, same tenants, every page, every report.

Resume where you stopped. **Do not create a new session, do not reset the database, do not re-register users.** Use the tenants, users, companies, parties, items and invoices that already exist on this machine from the last run. Branch stays `qa/heavy-e2e`. Keep streaming `[pg] [api] [web] [worker] [test]` logs to one tailing terminal.

**The last run left most of the UI and most of the reports untested. That is unacceptable. Finish them — every page, every report, no exceptions. Populate real data until every report screen has content to show.**

---

## 0. Ground rules (unchanged)

- Headless Playwright drives the real UI. Nothing manufactured through curl except what the previous prompt documented (volume seeding for invoices past the UI's ability, and clock manipulation for scheduled jobs). Both of those are explicitly logged in `TEST_LOG.md`.
- One terminal, concurrent tails.
- Zero red in console / network / API logs by the end.
- Honest reporting. If a page is unreachable or broken, fix it and re-run; don't skip and don't claim pass.

---

## 1. First: make sure every report has data to show

Before you open the report pages, make sure the database has enough variety that no report comes up empty. For **each of the companies created in the previous run**, top up (through the UI or the documented bulk backdoor, with the reason recorded) so the following are all non-trivially populated:

- At least 20 approved **sales invoices** per company spread across the last 3 months, mixing intra-state (CGST+SGST), inter-state (IGST), zero-rated, with cess, with round-off.
- At least 20 approved **purchase/expense vouchers** per company (if there is no purchase/expense UI yet, record it as a product gap and post the equivalent vouchers directly to Expense ledgers via the vouchers API — log it).
- At least 10 **credit notes** and 5 **debit notes** per company.
- At least 10 **cash receipts** and 10 **cash payments** per company, including some over ₹2 lakh (for CASH_RECEIPTS_OVER_2L) and some over ₹10 000 (for CASH_PAYMENTS_OVER_10K).
- At least 10 **inter-bank transfers** per company (BANK → BANK vouchers), so INTER_BANK has rows.
- A handful of ledgers with **negative balances** at month-end (over-drawn bank, unposted cash) so CASH_NEGATIVE and BANK_NEGATIVE have rows.
- A handful of parties left intentionally **without PAN** and without **GSTIN**, so LEDGERS_MISSING_PAN and LEDGERS_MISSING_GSTIN have rows.
- A few ledgers with zero net movement over a quarter, so LEDGERS_SQUARED_OFF and LEDGERS_STAGNANT have rows.
- At least 5 **advances to vendors** per company (payment without invoice), so ADVANCE_TO_VENDORS has rows.
- Fully reconciled bank statements on at least 2 bank accounts per company, and partly-reconciled on 2 more, so BRS_STATEMENT has both matched and unmatched rows.
- At least 3 **payment links** per company in each status: PENDING, PAID, EXPIRED.

Record what you added in `TEST_LOG.md` under a "Data top-up" heading.

---

## 2. Every UI page. Open each, assert it renders real data, click every control.

For each tenant, with at least two different user roles (FIRM_PARTNER and STAFF_ACCOUNTANT), open every one of the pages below in a headless Playwright context. For every page, the test must:
- Load with HTTP 200 and no React/Next error in the console.
- Render actual data rows (not an "empty state") after the top-up in section 1.
- Paginate through at least 2 pages where applicable.
- Sort by every sortable column (ascending and descending).
- Apply every filter / search box with a value that returns at least one row.
- Open every row-level action (view, edit, delete, duplicate, approve, reject, etc.) and complete at least one of each.
- Open every dialog launched from the page, Tab through its fields, submit it successfully, cancel it, re-open and confirm fields are reset.
- Screenshot after render; diff against a baseline on subsequent runs.
- Switch to dark mode, re-screenshot, re-diff.
- Switch to mobile viewport (390×844), re-screenshot, confirm no horizontal scroll.

**Pages to cover (explicitly — this is the full map, don't miss any):**

Dashboard
- `/` — dashboard home.

Auth
- `/auth/login`, `/auth/signup`.

Masters
- `/parties` (list), the party dialog (new, edit), `party-details-dialog`.
- `/items` (list), `item-dialog`, `item-details-dialog`, `unit-manager-dialog`, `edit-unit-dialog`, `delete-unit-dialog`, `unit-details-dialog`.

Invoicing
- `/invoices` (list).
- `/invoices/new` — full flow including the invoice-settings dialog and invoice-customizer dialog.
- `/invoices/[id]` — the 3 templates: `minimal-compact-template`, `modern-brand-template`, `tally-classic-template` — switch between them, print preview each, export each to PDF.

Vouchers
- `/vouchers` (list), voucher detail drawer/modal, reverse-voucher confirmation.

Banking
- `/banking` (list), `new-account-dialog`, `upload-statement-dialog`.
- `/banking/[id]/reconcile` — drive the reconciliation UI end-to-end: match suggestions, manual match, unmatch, create ad-hoc voucher.
- `/banking/discovery` — the discovery tickets page, `conversion-dialog`.

Approvals
- `/approvals` — list, approve and reject at least one request, confirm UI refreshes, confirm the invoice page reflects the new status.

Imports
- `/imports` (list), `/imports/new` (wizard), `/imports/[id]/review`.
- Drive the full wizard: upload CSV, map columns, resolve warnings, approve, post. Confirm batch status becomes COMPLETED with 0 FAILED. Do a run with intentionally bad rows and confirm per-row failure isolation shows on screen.
- `missing-masters-modal` — confirm the "resolve on the fly" path works.

Collections
- `/collections/ageing` — list, `promise-to-pay-dialog`, `send-reminder-dialog`.
- `/collections/payment-links` — list, `create-link-dialog`, `reconcile-settlement-dialog`, `upi-qr-dialog`.
- `/collections/recurring` — list, `recurring-schedule-dialog`, pause/resume/run-now actions.

Practice (CA firm workflow)
- `/practice/clients` — `client-dialog`.
- `/practice/tasks` — `task-dialog`, `task-status-dialog`.
- `/practice/documents` — `request-document-dialog`, `upload-client-doc-dialog`, download flow.
- `/practice/calendar`.

Reports (open every one of them — see section 3)
- `/reports` (catalog, favorites toggle, category filter, search).
- Every individual report page.

Settings
- `/settings` (hub).
- `/settings/companies` — `company-dialog`, `branch-dialog`, `company-details-dialog`. Create, edit, deactivate, re-activate. Switch the active company from the top bar and confirm the whole shell re-renders.
- `/settings/ledgers` — `group-dialog`, `ledger-dialog`. Create a custom ledger group, create a custom ledger under it, edit, archive. Confirm it appears in the picker when creating a journal voucher.
- `/settings/numbering` — add a new series for every document type, edit prefix / running number, confirm the next invoice/number-respecting-series actually uses it.
- `/settings/periods` — lock a period, attempt to post a voucher dated inside it (must fail with a user-visible error), unlock the period, retry (must succeed), re-lock. Confirm only FIRM_PARTNER can lock/unlock (STAFF_ACCOUNTANT button is disabled or 403s).
- `/settings/invoice-branding` — full upload/replace/delete/re-upload cycle for logo and signature (per section 6 of the earlier prompt). Preview an invoice PDF after each change. Try to upload a non-image, a 100 MB file, a path-traversal name.
- `/settings/notifications` — edit notification preferences, trigger a test notification, trigger-scan.
- `/settings/tally` — connector page: generate/regenerate the connector token, copy to clipboard affordance, "preview envelope" button with a seeded party, heartbeat endpoint responds.

Each page's results (pass / fail / screenshot path / console-error list) must land in `TEST_LOG.md`.

---

## 3. Every report. Open the page, read numbers, reconcile, export, re-reconcile.

For each company, open the `/reports` catalog and open each report page listed below. For every one:

1. Load the page; confirm it renders rows (not the "no data" empty state) — because of section 1 top-up, this is non-negotiable.
2. Change the date range (last month, current quarter, FY to date); confirm the data updates and the page does not crash on edge ranges (today only, future only, year-ago).
3. Read the on-screen totals. Reconcile against the source data (sum of invoice line items, sum of voucher entries, etc.) via a direct DB query in the test harness — must match to the paise.
4. For reports that support it, toggle the group-by / drill-down. Click a row that drills into another page; confirm the detail page loads.
5. Favorite / un-favorite the report from the catalog page; confirm it sticks after page reload.
6. Export to every format the UI offers (xlsx, pdf, html). Download via Playwright, open the file in the test, confirm the totals row equals what was on screen. For PDFs, confirm the real company legal name AND real PAN appear (not placeholder, not ciphertext).
7. Share the report (Share dialog); copy the link; open the link in an **unauthenticated** Playwright context; confirm the shared page renders with the right data and does NOT expose any cross-tenant info or require a fresh login.

**Reports to cover (this is the catalog — do EVERY one):**

Sales & Revenue
- CUSTOMER_SALES
- ITEM_SALES

Financial Statements
- TRIAL_BALANCE
- PROFIT_LOSS
- BALANCE_SHEET
- GENERAL_LEDGER

Receivables
- AR_AGEING

Bank Reconciliation
- BRS_STATEMENT

Purchases & Expenses
- EXPENSES_MONTHLY
- EXPENSES_VENDOR
- EXPENSES_CATEGORY
- EXPENSES_REGISTER
- PURCHASES_ITEM

Cash & Bank Audit
- CASH_NEGATIVE
- BANK_NEGATIVE
- INTER_BANK
- CASH_WITHDRAWALS
- CASH_DEPOSITS
- CASH_EXPENSES
- CASH_PAYMENTS_OVER_10K
- CASH_RECEIPTS_OVER_2L

Payables & Vendors
- PAYABLES_SUMMARY
- PAYABLES_AGEING
- ADVANCE_TO_VENDORS

Master Data Hygiene
- LEDGERS_MISSING_PAN
- LEDGERS_MISSING_GSTIN
- LEDGERS_SQUARED_OFF
- LEDGERS_STAGNANT

Dedicated report pages (open each at its route, in addition to the catalog entries above):
- `/reports/trial-balance`
- `/reports/profit-and-loss`
- `/reports/balance-sheet`
- `/reports/general-ledger`
- `/reports/customer-sales`
- `/reports/item-sales`
- `/reports/expenses` (tabs: monthly / vendor / category / register)
- `/reports/cash-bank-audit` (every sub-tab)
- `/reports/payables` (summary / ageing / missing-pan / missing-gstin tabs)

For every report, write one line to `TEST_LOG.md`:
`REPORT <key> | company=<id> | rows=<n> | onScreenTotal=<x> | dbTotal=<y> | reconciled=YES/NO | xlsx=OK/FAIL | pdf=OK/FAIL | html=OK/FAIL | share=OK/FAIL`

If `reconciled=NO` anywhere, fix the backend math or the UI summation, re-run.

---

## 4. Full-app exploratory pass

With the full data loaded, open the app once as a FIRM_PARTNER and run an automated exploratory sweep:

- From the dashboard, follow every top-bar link, every sidebar link, every link inside every card. Hit every route that resolves.
- Open every dropdown menu, every tooltip, every popover; confirm none freeze the page.
- Switch the active company in the top-bar switcher at least 5 times, confirm the UI fully re-renders each time with no stale rows.
- Toggle theme (light/dark) on every page; snapshot both; diff.
- Switch to mobile viewport on every page; confirm the layout reflows (no horizontal scroll, readable text, usable touch targets).
- Scan the Playwright network trace: no 500s, no CORS errors, no response body that contains ciphertext where a cleartext field is expected, no cross-tenant data in any response.
- Scan the browser console: zero React warnings, zero hydration mismatches, zero 404s on bundle chunks, zero unhandled promise rejections.

Any issue found → open a bug in `TEST_LOG.md`, fix the code on `qa/heavy-e2e`, re-run the affected page.

---

## 5. Final deliverable

When — and only when — every item in sections 1–4 is green:

- Commit everything to `qa/heavy-e2e`, push, open a PR into `dev`.
- PR description: exact counts covered (pages / dialogs / reports / data rows / files uploaded), total wall-clock, every bug found with root cause and fix commit, remaining known issues with severity and reason not fixed.
- Attach `TEST_LOG.md`, full Playwright HTML report, API log tail, and at least one screencast each of: a full invoice-creation journey, an import-wizard run to completion, a report-export-and-share flow, a full file-upload-replace-delete cycle.

If any individual page or report genuinely can't be made green, stop with exactly where, the exact error, a screenshot, the console/API log excerpt, and what you need from me — but do not call the overall run complete until every page and every report is green.

**Resume now. Same account, same tenants, same browser session state. Keep the terminal streaming. Don't stop until every page and every report is tested, reconciled, exported and documented.**
