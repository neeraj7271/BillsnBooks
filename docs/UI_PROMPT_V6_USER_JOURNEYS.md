# ▶️ V6 Continuation — populate data by USING THE APP, not by seeding

Lift the hard gate. Nothing proceeds while the app looks empty, and the only acceptable way to populate it is to drive the real UI as real users would — Playwright clicks, keystrokes, file pickers, typeaheads, approvals. No `pnpm seed:*`, no SQL inserts, no API-level bulk calls, no backend endpoints that bypass the normal request path. If the UI doesn't support creating a certain kind of record, that is a product gap to log and work around through whatever UI flow IS available — not a licence to insert rows directly.

All work continues on branch `ux/refresh-v6`. Stream `[api] [web] [test]` live logs to one terminal. Headless Playwright. No pauses between steps.

---

## 0. Rules (same honesty contract as the heavy E2E campaign)

1. **UI-first, no shortcuts.** Every piece of business data created in this step MUST originate from a Playwright script driving the real app: `page.click`, `page.fill`, `page.selectOption`, file-picker uploads, dialog submissions, approval button clicks. The HTTP call that lands in the database is the one the UI issued — never one the test harness crafted itself.
2. **No `curl` / direct API batch to manufacture records.** The two allowed back-doors are: (a) clock manipulation for future-run / overdue dates where the UI cannot set them, and (b) the GST-checksum helper in `packages/gst-rules` for valid GSTIN generation. Both must be called out in `TEST_LOG.md`.
3. **Multi-user.** Create real staff users and real client-portal users through the existing invitation / sign-up flow (or via the back-door documented in the prior heavy campaign for roles the UI can't invite yet), log them in from separate Playwright contexts, and let their actions interleave — the FIRM_PARTNER approves what the STAFF_ACCOUNTANT drafted, the CLIENT_VIEWER uploads documents the firm requested.
4. **Realistic variety.** Names from the Indian pool (see §1). Amounts from a log-normal distribution. Dates logarithmically weighted toward the recent week. No `Buyer 1 / Buyer 2 / Buyer 3`.
5. **Real files.** Logos, signatures and client documents come from a real Google Image Search inside Playwright (the same pattern you used in the heavy E2E campaign), downloaded to a temp dir and uploaded through the actual file picker.
6. **Side effects count.** Notifications, audit-log entries, approvals and voucher posts happen because the UI actions trigger them naturally — never injected. The bell badge populates because invoices actually got approved.
7. **No downsizing. No fake passes.** Volume targets are as stated. If a page gets slow, that's a UI finding, not a reason to lower the number.
8. **Visible proof.** For each journey, record a short Playwright trace/video. Save under `tests/e2e/journeys/traces/`. The user opens them to confirm the clicks happened.

---

## 1. Users and context

Create 3 real users per tenant through the real sign-up / invite flow (or the documented SQL back-door for role flips if the invite UI isn't there yet, same as the heavy campaign — flagged in `TEST_LOG.md`). Reuse the tenants that already exist from the heavy-e2e campaign. No fresh tenant creation.

Per tenant — 1 FIRM_PARTNER (the existing owner), 1 STAFF_ACCOUNTANT, 1 CLIENT_VIEWER.

Indian name pool (use throughout): first names {Priya, Rohan, Aditi, Kabir, Zara, Vikram, Meera, Arjun, Sneha, Ananya, Siddharth, Ishaan, Riya, Nikhil, Diya, Aarav, Kavya, Aryan, Isha, Dhruv}; surnames {Agarwal, Bharti, Chandak, Deshmukh, Gowda, Iyer, Kulkarni, Mehta, Nair, Patel, Rao, Sharma, Shetty, Singh, Verma, Reddy, Chatterjee, Kapoor, Joshi, Das}. Companies: pool of ~80 Indian firm names with mixed suffixes {Industries, Enterprises, Trading Co, Services Pvt Ltd, LLP, & Sons, Mills, Exports, Pharmaceuticals, Textiles, Infotech, Logistics, Developers, Consultancy, Food Processing, Metalworks}.

---

## 2. Practice module — driven by real clicks

Spec: one Playwright script `tests/e2e/journeys/practice.spec.ts` logs in as the FIRM_PARTNER and does the following, per tenant:

2.1 **30 firm clients** — open `/practice/clients`, click "New Client", fill the dialog (legal name, PAN typed character by character, GSTIN typed character by character with a valid checksum, primary contact name from the pool, email, phone, state from the dropdown), click Save. Wait for the row to appear in the list. Repeat 30 times. Between batches of 10 clients the script reloads the page to verify the pagination + list refresh work.

2.2 **200 compliance tasks** — open `/practice/tasks`, click "New Task" 200 times. Task types rotated across GSTR-1, GSTR-3B, GSTR-9, GSTR-9C, TDS 26Q, TDS 24Q, Advance Tax Q1-Q4, ITR filing, Tax Audit 44AB, ROC AOC-4, ROC MGT-7, PF ECR, ESI, PT, Bookkeeping close, GST Recon. Owner alternates between the FIRM_PARTNER and the STAFF_ACCOUNTANT (swap Playwright contexts for the STAFF_ACCOUNTANT ones so the audit log shows two authors). Due dates spread: 60 past (Overdue), 40 this week (Due Soon), 100 future. For the past dates, the script picks them in the date picker — the create API accepts any date, so no clock back-door needed. A random subset is moved to `In Progress` / `Review` / `Filed` by the staff user clicking the status change on each task card.

2.3 **80 client-document requests** — open `/practice/documents`, click "Request Document" 80 times. Client selected from the dropdown (populated from the 30 just-created clients), doc type rotated across Bank Statement, Sales Register, Form 26AS, TDS Certificates, ITR V, Board Resolution, Audit Report, Rent Agreement. 40 are left Pending, 30 are "uploaded" by the CLIENT_VIEWER context (log in, click into the request, click Upload, pick a real file from the Google Image Search pool or a dummy PDF), 20 are Approved by the FIRM_PARTNER clicking Approve, 10 are Rejected with a reason entered in the dialog.

2.4 **Statutory calendar** — the 60 statutory dates for the FY are entered through the UI's Add Event flow if it exists. If the only UI path is the system's auto-generated statutory dates (no manual add), note it in `TEST_LOG.md` and rely on the backend's existing calendar generation — that is backend behaviour, not fake data.

Each sub-step commits a Playwright trace under `tests/e2e/journeys/traces/practice-<N>.zip` and a screenshot of the finished page to `docs/ui-review-v5/populated/`.

Commit: `test(journey): populate Practice module via real UI clicks — 30 clients, 200 tasks, 80 docs per tenant`.

---

## 3. Masters — parties and items

3.1 **200 parties per tenant** — `tests/e2e/journeys/parties.spec.ts`. 
- The first 20 created via the UI's `+ New Party` dialog one at a time, with every field typed character by character. Mix of CUSTOMER / VENDOR / BOTH. Mix of REGULAR / UNREGISTERED / COMPOSITION / SEZ. Credit limits from a log-normal pool (~₹10 000 to ~₹2 cr). States spread across 15 of them.
- The remaining 180 created via the **UI's Import Parties wizard**. The test prepares a CSV with the varied data, opens `/parties` → Import, picks the CSV through the file picker, maps the columns on the mapping screen, clicks Preview, resolves any warnings, clicks Confirm. Verifies the batch finishes with 0 FAILED rows. If any row fails, it opens the row-detail page, fixes the value, re-submits. The CSV preparation is test harness logic; the import ITSELF is a real UI click flow.

3.2 **500 items per tenant** — `tests/e2e/journeys/items.spec.ts`. Same pattern: 50 created one-by-one through the Item dialog; 450 through the Import Items wizard driven through its real file picker + mapping steps. Varied HSN/SAC, GST slabs 0/5/12/18/28, some with cess. Names drawn from the realistic pool (Office Chair, Printer Cartridge, Consulting Services, Laptop, Keyboard, Monitor, SaaS License, Freight Charges, Packaging Material, Raw Material - Grade A …).

3.3 Per each master journey, screenshot the resulting list page after pagination (page 1, page 5, last page). Attach the import-batch status screenshot showing `COMPLETED · 0 failed`. If the import ever fails, it is a bug to fix in the backend row-validation; do not work around it.

Commits:
- `test(journey): 200 parties via UI dialog + UI import wizard per tenant`
- `test(journey): 500 items via UI dialog + UI import wizard per tenant`

---

## 4. Transactions — invoices, vouchers, bank, collections

4.1 **500 invoices per tenant** — `tests/e2e/journeys/invoices.spec.ts`. For each, the script:
- Opens `/invoices/new`.
- Picks a party from the real typeahead combobox (types 3 letters, waits for options, clicks).
- Picks items from the real typeahead combobox per line.
- Fills quantity, unit price (some lines get a discount), tabs through.
- Switches place of supply to produce the right mix: 70% intra-state (CGST+SGST), 25% inter-state (IGST), 5% RCM (checks the RCM toggle in the dialog).
- Picks a date from the real DatePicker — some past, some today, some future, log-normal weight toward the last 30 days.
- 50% click **Save & Submit for Approval**. 25% click **Save as Draft**. 25% switch to the invoice-settings dialog mid-way and toggle options before saving.

Then a second Playwright context (FIRM_PARTNER) opens `/approvals`, picks each submitted invoice, clicks Approve on most, Reject on a handful. Approvals fire voucher-posting as a side effect — the dashboard KPI cards and the vouchers list populate naturally.

Screenshots after: `/invoices` pagination page 1 / 5 / 25, one approved invoice detail page in each of the three templates.

4.2 **Credit notes and debit notes** — if the UI has a "New Credit Note" / "New Debit Note" flow, drive 50 of each through it. If only the Invoice dialog with a document type toggle is available, use that path. Record which it was in `TEST_LOG.md`.

4.3 **100 bank accounts per tenant** across HDFC / ICICI / SBI / Axis / Kotak — created through the real `+ Add Bank Account` dialog, with valid IFSC and account-number format for each bank.

4.4 **Bank transactions (50 per account = 5 000 per tenant)** — ingested via the real Statement Upload wizard. The test prepares a realistic bank-statement CSV (with narrations like "NEFT ACME ENTERPRISES", "UPI/P2M/...", "NACH/AUTOPAY", "ATM WDL", "INT CREDIT"), opens `/banking/<account-id>/reconcile`, clicks Upload Statement, picks the CSV, runs the match-suggestions, clicks Match on the obvious ones, creates ad-hoc Receipt / Payment vouchers for orphan rows via the inline UI.

4.5 **200 payment collection links per tenant** — created through `/collections/payment-links` → `+ New Link`, each tied to a real invoice via the typeahead. 60 get marked PAID by the test firing the webhook endpoint with a correct HMAC signature (the webhook IS the intended external integration surface, not a UI flow; the webhook call is fine). 20 expire naturally because the test picks a past expiry date. 120 stay CREATED.

4.6 **80 recurring schedules per tenant** — created via the real recurring-schedule dialog (rewritten in §5 below). Mix of MONTHLY / QUARTERLY / ANNUAL. Mix of statuses (Active / Paused).

Commits (one per logical group):
- `test(journey): 500 invoices via real New Invoice form + approvals flow per tenant`
- `test(journey): 100 bank accounts + 5000 statement txns via real upload + reconcile UI per tenant`
- `test(journey): 200 payment links with real HMAC-signed callback webhooks per tenant`
- `test(journey): 80 recurring schedules via the real dialog per tenant`

---

## 5. Recurring Invoicing Schedule dialog — rewrite THEN use

Before §4.6 can run, the dialog has to be the plain-English version. This is V5 §16, which Antigravity never started. Rewrite it NOW on this branch.

**File:** `apps/web/src/app/collections/recurring/recurring-schedule-dialog.tsx`

5.1 Every input gets a visible `<label>` above it AND a one-line `<FormField helper>` below where useful. Placeholder is never the only label.

| Current | New label | Helper |
|---|---|---|
| Customer Account | Bill to Customer | Who receives the recurring invoice. |
| Frequency | Billing Frequency | How often an invoice is generated. |
| Start Date | First Invoice Date | The first invoice runs on this date. |
| Max Invoices to Generate | Number of Invoices | Total invoices this schedule will create. Leave blank for unlimited until End Date. |
| End Date (Optional) | Stop After (Optional) | No invoices are generated past this date. |
| (sunken box title) TEMPLATE LINE ITEM | What's on each invoice | — |
| placeholder: Item / Service description | Description | Appears on the printed invoice line. |
| placeholder: SAC / HSN | HSN / SAC Code | Six- or eight-digit GST classification. 998222 is standard for accounting services. |
| placeholder: Unit Price | Unit Price (₹) | Amount before GST, per invoice. |
| placeholder: GST % | GST Rate (%) | Standard rates: 0, 5, 12, 18, 28. |

5.2 Add a `+ Add another line` button to append a second line item row; show a delete-row icon when there's more than one.

5.3 **Live "Next run" preview** rendered inside the dialog (above the footer):
```
Next invoice:  1 Dec 2026
Then:          1 Jan 2027, 1 Feb 2027, 1 Mar 2027 …
Total:         12 invoices
Per invoice:   ₹ 29,500 (₹ 25,000 + 18% GST ₹ 4,500)
```
Updates on every keystroke. If the First Invoice Date lands in a locked accounting period, red inline warning "The period for 1 Dec 2026 is locked. The first run would fail. Pick a later date or unlock the period."

5.4 **Two-step confirmation.** Clicking **Activate Schedule** swaps dialog content to a read-only summary with a **Preview first invoice** button (opens a side drawer rendering the Minimal template). Primary action becomes **Activate**; secondary **← Back to edit**.

5.5 **Edit + pause.** Opening the dialog on an existing schedule prefills every field; primary is **Save changes**; secondary buttons **Pause schedule** / **Resume schedule**.

5.6 Playwright `tests/e2e/recurring-dialog.spec.ts` asserts a `<label>` precedes each input (via accessible-name query), helper text exists, next-run preview updates, confirmation step renders with the drawer, and that §4.6's 80 schedules were all created through this dialog without error.

Screenshots: `16-recurring-dialog-filled.png`, `17-recurring-confirm.png`, both themes.

Commit: `feat(collections): recurring dialog — plain-English labels, helper text, next-run preview, confirm step`.

---

## 6. File uploads — real images, not placeholders

Per tenant, run `tests/e2e/journeys/branding.spec.ts`:

6.1 Playwright opens `https://www.google.com/search?tbm=isch&q=sample+company+logo+png` in a fresh context, searches, clicks an image result, screenshots-fallback or downloads via the browser. SHA256 and URL recorded in `TEST_LOG.md`.

6.2 Upload as the company logo via `/settings/invoice-branding` file picker. Click Save. Open an invoice preview, confirm the logo appears.

6.3 Repeat for signature (query: `handwritten signature png`) and DSC cert (query: `digital signature certificate sample filetype:pdf`).

6.4 Replace the logo with a second downloaded image; confirm the preview updates and the previous value is replaced.

6.5 Delete the logo through the UI; confirm the invoice preview shows the no-logo fallback cleanly.

6.6 Re-upload. Then try to upload a `.html` file renamed `.png` and a 100 MB file. Both must be rejected with a visible error inline — no silent server acceptance.

Commit: `test(journey): branding upload/replace/delete cycle with real Google-sourced images per tenant`.

---

## 7. Notifications populate naturally — don't inject them

After §4 runs, the bell should already be populated because every invoice approval, period lock, payment callback, recurring-run and import-completion fires a notification as a side effect. Verify:

7.1 Playwright logs in, counts the unread bell badge via `[data-testid=bell-badge]`. Must be > 0 and should settle around 15–25.

7.2 Click the bell, verify grouping by Today / Yesterday / This Week / Earlier (per the previous Linear-style notification refresh).

7.3 Click a few notifications; the badge decrements, the overlay toast confirms "Marked as read".

7.4 Click "Mark all as read"; badge hides.

7.5 Visit `/notifications` full page; infinite-scroll loads older ones.

If the badge isn't populating, that is a backend-emit bug (something is approving invoices but not writing to the notification table) — fix it on this branch, re-run.

Screenshot: `28-notifications-populated.png` both themes, with a visible badge count and grouped list.

Commit: `test(journey): verify notifications populate as side effects of real actions`.

---

## 8. Dev-tool buttons in Settings (replaces the "Reseed" / "Top up" buttons)

Since we are not using seed scripts, the Settings dev page gets two different buttons:

- **Replay demo journeys** → launches the Playwright journey suite against this environment (safe only in dev — gated by `NEXT_PUBLIC_DEV_TOOLS=true` and refuses to run against a production API URL).
- **Clear my tenant** → calls a dev-only endpoint that truncates the current tenant's rows (so the user can rerun journeys on a clean slate).

Document in `docs/dev/USER_JOURNEYS.md`.

Commit: `feat(dev-tools): Replay journeys + Clear tenant buttons in /settings (dev-flagged)`.

---

## 9. After the journeys have run — proceed with the rest of V5

Only after Steps 1–8 are green (every page populated with real journey-created data, all 28 screenshots in `docs/ui-review-v5/populated/`) do we continue with the remaining V5 polish items, in this order:

- V5 §4 LoadingState on 32 pages
- V5 §5 EmptyState on 42 pages (with page-specific copy)
- V5 §6 Tooltip primitive
- V5 §7 MonoCopyable for GSTIN/PAN
- V5 §17 DatePicker + DateRangePicker + practice calendar month grid
- V5 §8 Dialog size tokens
- V5 §9 formatDate / formatMoney helpers
- V5 §10 preview column internal scroll (verify)
- V5 §11 section copy pass on `/invoices/new`
- V5 §12 oversize-page rewrites
- V5 §13 raw `<table>` → DataTable
- V5 §14 button hierarchy sweep
- V5 §15 print stylesheet

One commit per section, no gates.

---

## 10. Honesty contract (unchanged)

- No seed scripts, no SQL inserts, no API-level bulk calls to create business data. Only real UI-driven Playwright clicks.
- If a UI flow is missing for a record type, log the product gap and work around it through the closest available UI; do not inject.
- No downsizing counts. 30 clients means 30, 500 invoices means 500.
- No "the journey ran but nothing shows in the UI" — screenshot the populated UI after every journey batch.
- No merging to `dev` until the 28-screenshot folder exists, every Playwright trace is in the traces folder, and the user has approved.

**Begin with §5 (recurring dialog rewrite) so §4.6 can use it — then the journeys in order §1 → §7, then §9. Stream `[api] [web] [test]` to one terminal continuously. The next time the user hears from you is when the populated UI screenshots exist and the Playwright traces are in the repo.**
