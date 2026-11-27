# ▶️ Continue on `ux/refresh-v6` — seed first, then the recurring dialog, then the rest

P0 is approved. Lift the hard gate. Do NOT wait for user review between the remaining sections — stream live logs, commit per logical change, keep going. Order below is binding. All work on the same branch `ux/refresh-v6`. Hand-written, no codemod, honesty rules, screenshots to `docs/ui-review-v5/`.

Two items were in V5 but never started — do these FIRST before any other P1/P2 work:

---

## STEP 1 (highest priority) — Seed realistic data everywhere the UI is empty

Nothing in the app can be judged while most pages show empty states. Populate first, polish second.

### 1A. Practice-module seeder (V5 §18)

Create `apps/api/src/infrastructure/persistence/seeds/practice-seed.ts` and a `pnpm --filter @platform/api seed:practice` script. Idempotent, deterministic, dev-only.

**Per existing tenant / company:**

- **30 firm clients** with realistic Indian company names (mix of Pvt Ltd, LLP, HUF, Proprietorship, OPC). Pull name fragments from a built-in pool of ~80 Indian surnames + industry words (Agarwal Industries, Bharti Motors, Chandak Exports, Deshmukh Consultancy LLP, Gowda Enterprises Pvt Ltd, Iyer & Co Chartered Accountants, Kulkarni Textiles, Mehta Trading, Nair Infotech LLP, Patel Metalworks, Rao Logistics, Sharma Pharmaceuticals, Shetty Developers, Singh Brothers HUF, Verma Food Processing …). Contact names from a mixed Indian pool (Priya, Rohan, Aditi, Kabir, Zara, Vikram, Meera, Arjun, Sneha, Ananya, Siddharth, Ishaan, Riya, Nikhil, Diya …). PANs valid format `[A-Z]{5}[0-9]{4}[A-Z]`. GSTINs valid format and checksum (use `packages/gst-rules` helper). Phones `+91 9xxx xxx xxx`. Email domains plausible (acme.in, bharat-steel.com, kiran.ca). Spread across 15 states.

- **200 compliance tasks** across the current month and the next 3 months. Types: GSTR-1, GSTR-3B, GSTR-9, GSTR-9C, TDS Return 26Q, TDS Return 24Q, Advance Tax Q1/Q2/Q3/Q4, ITR filing, Tax Audit u/s 44AB, ROC AOC-4, ROC MGT-7, PF ECR, ESI monthly, Professional Tax, GST Reconciliation, Bookkeeping close. Statuses mixed across Not Started / In Progress / Review / Filed / Overdue. Owners distributed across 3 seeded staff users. Due dates distributed so a user opening the app today sees **3–5 Overdue, 10–15 Due this week, 20+ Upcoming**.

- **80 client-document requests** in mixed states: Pending (40%), Uploaded (30%), Approved (20%), Rejected (10%). Document types: Bank Statement, Sales Register, Purchase Register, Form 26AS, TDS Certificates (Form 16A), ITR V, Board Resolution, Audit Report, Rent Agreement, Vendor Invoices Scan, Fixed Asset Register, Loan Statement, Credit Card Statement, GST Portal Login.

- **60 statutory calendar entries** for the current + next FY. Real statutory dates: GSTR-1 on the 11th each month, GSTR-3B on the 20th, TDS payment on the 7th, PF on the 15th, ESI on the 15th, Advance Tax installments (15 Jun / 15 Sep / 15 Dec / 15 Mar), ROC AOC-4 (30 Oct), ROC MGT-7 (29 Nov), Tax Audit (30 Sep), ITR Non-Audit (31 Jul), ITR Audit (31 Oct). Each entry links to one or more affected seeded clients.

Deterministic seed with a `--seed=<N>` CLI flag so runs are reproducible. Idempotent check on a natural key (client_code / `(task_type, client_id, period)` / `(doc_type, client_id, due_date)`). Guarded by `NODE_ENV !== 'production'`. Error out with a plain message if someone attempts it against a production DB.

### 1B. App-wide demo seeder (V5 §19)

Create `apps/api/src/infrastructure/persistence/seeds/demo-seed.ts` and a `pnpm --filter @platform/api seed:demo` script.

**Per existing tenant / company:**

- **500 parties** (customers + vendors), varied registration types (REGULAR, UNREGISTERED, COMPOSITION, SEZ_UNIT), varied states (15 across India), varied credit limits (log-normal distribution so there's a mix of ₹10k retail accounts and a few ₹2cr enterprise ones).
- **500 items** across GOODS and SERVICES, 15 real HSN/SAC codes drawn from a representative pool, GST slabs 0/5/12/18/28 mixed, some with cess (tobacco, aerated drinks, luxury cars). Names from a pool (Office Chair, Printer Cartridge, Consulting Services, SaaS License, Freight Charges, Packaging Material, Raw Material - Grade A, Industrial Lubricant, Marketing Services, Legal Services, Electronic Component - Resistor, Steel Rod, Cotton Yarn, Sugar - Refined, Mobile Phone, Laptop, Keyboard, Monitor, Software Maintenance Fees, Annual Subscription …) + size/grade modifiers.
- **500 invoices** over the last 12 months with varied statuses (DRAFT 15%, SUBMITTED 10%, APPROVED 60%, CANCELLED 5%, PAID 10%), varied tax scenarios (70% intra-state CGST+SGST, 25% inter-state IGST, 5% RCM), varied amounts (₹2 000 to ₹25 00 000 log-normal), **dates distributed logarithmically — more activity in recent weeks tapering off over the year**.
- **500 journal vouchers** of mixed types (Sales / Purchase / Receipt / Payment / Journal / Contra), posted mostly, a handful reversed.
- **100 bank accounts** across HDFC / ICICI / SBI / Axis / Kotak, each with **50 bank transactions** → 5 000 transactions total per tenant. Mix of matched + unmatched for the reconciliation UI.
- **200 payment links** in Created / Paid / Expired states, varied amounts.
- **150 notifications** across types (INVOICE_APPROVED, INVOICE_REJECTED, PAYMENT_RECEIVED, PERIOD_LOCKED, REMINDER_SENT, SECURITY_EVENT, SYSTEM_UPDATE, IMPORT_COMPLETED, DOCUMENT_UPLOADED, TALLY_SYNC) with realistic timestamps spread over the last 30 days, **keep 20 unread so the bell badge is populated** at `20`.
- **50 approval requests** of mixed age (fresh / this week / older) and priority.
- **40 import batches** in PROCESSING / PARTIAL / COMPLETED / FAILED, with per-row failure counts.
- **80 recurring schedules** across MONTHLY / QUARTERLY / ANNUAL frequencies, some with next-run upcoming, some paused.
- **30 collection reminders** of mixed age and status.

**Variety rules:**
- No `Party 1 / Party 2 / Party 3`. Use the name pools above.
- No identical amounts across 500 invoices — draw from a log-normal so the long tail is populated.
- Dates logarithmically weighted toward the last 30 days so dashboards and reports show a realistic recent-heavy trend, not a flat line.
- Deterministic (same seed → same data) with a `--seed=<N>` flag.

**Dev-exposure:**
- Guarded by `NODE_ENV !== 'production'`.
- Expose two Settings buttons (gated by `NEXT_PUBLIC_DEV_TOOLS=true`):
  - **Reseed demo data** → `POST /v1/dev/reseed`
  - **Top up demo data** → `POST /v1/dev/topup`
- Document in `docs/dev/DEMO_SEEDER.md`: one command to populate a fully-realistic demo tenant.

**Acceptance for Step 1:**
- Run both seeders against a fresh tenant.
- Open the following pages — none shows an empty state unless the user explicitly filters to zero:
  - Dashboard: KPI cards non-zero, ageing bars populated, Recent Invoices shows 10 real-looking rows.
  - Bell icon: badge shows **20** unread.
  - `/parties`, `/items`, `/invoices`, `/vouchers`, `/approvals`, `/banking`, `/collections/payment-links`, `/collections/recurring`, `/notifications`, `/imports`, `/practice/clients`, `/practice/tasks`, `/practice/calendar`, `/practice/documents` — all populated with varied data.
- Screenshots `25-dashboard-populated.png`, `26-vouchers-populated.png`, `27-banking-populated.png`, `28-notifications-populated.png`, `21-practice-clients.png`, `22-practice-tasks.png`, `23-practice-calendar.png`, `24-practice-documents.png` in **both themes**, saved under `docs/ui-review-v5/populated/`.

Commits (one per logical change):
- `feat(seed): practice seeder — 30 clients, 200 tasks, 80 docs, 60 calendar entries per tenant`
- `feat(seed): demo seeder — 500 parties/items/invoices, 5k bank txns, 150 notifications, 20 unread per tenant`
- `feat(dev-tools): /settings Reseed and Top-up buttons gated by NEXT_PUBLIC_DEV_TOOLS`

---

## STEP 2 — Recurring Invoicing Schedule dialog: labels, helpers, next-run preview

The file `apps/web/src/app/collections/recurring/recurring-schedule-dialog.tsx` is unchanged. Rewrite per V5 §16.

**Current state (confirmed):**
- Labels still say "Customer Account", "Max Invoices to Generate", "End Date (Optional)".
- Template Line Item sunken box has 3 inputs with NO visible labels, only placeholders `SAC / HSN`, `Unit Price`, `GST %`.
- No helper text, no next-run preview, no confirmation step.

**Rewrite:**

2A. **Rename labels + add helper text under each. Every input gets a `<label>` AND a helper line.**

| Current | New label | Helper text under field |
|---|---|---|
| Customer Account | **Bill to Customer** | Who receives the recurring invoice. |
| Frequency | **Billing Frequency** | How often an invoice is generated. |
| Start Date | **First Invoice Date** | The first invoice runs on this date. |
| Max Invoices to Generate | **Number of Invoices** | Total invoices this schedule will create. Leave blank for unlimited until End Date. |
| End Date (Optional) | **Stop After (Optional)** | No invoices are generated past this date. |
| TEMPLATE LINE ITEM (sunken box title) | **What's on each invoice** | — |
| (placeholder "Item / Service description") | **Description** label above | Appears on the printed invoice line. |
| (placeholder "SAC / HSN") | **HSN / SAC Code** label above | Six- or eight-digit GST classification. 998222 is standard for accounting services. |
| (placeholder "Unit Price") | **Unit Price (₹)** label above | Amount before GST, per invoice. |
| (placeholder "GST %") | **GST Rate (%)** label above | Standard rates: 0, 5, 12, 18, 28. |

2B. **Add a second optional line item row.** Button `+ Add another line` below the first row. Delete icon on each row when there's more than one.

2C. **Live "Next run" preview block at the bottom of the form (before the footer):**
```
Next invoice:   1 Dec 2026
Then:           1 Jan 2027, 1 Feb 2027, 1 Mar 2027 …
Total:          12 invoices
Per invoice:    ₹ 29,500 (₹ 25,000 + 18% GST ₹ 4,500)
```
Updates live as the user types. If the First Invoice Date falls inside a locked accounting period, show a red warning banner "The period for 1 Dec 2026 is locked. The first run would fail. Pick a later date or unlock the period."

2D. **Primary action copy.** Button stays "Activate Schedule" but is disabled until required fields are valid. Tooltip on the disabled button says exactly which field is missing ("Pick a customer", "Set a unit price", etc.).

2E. **Two-step confirmation.** Clicking Activate Schedule swaps the dialog content to a read-only summary with:
- All the fields as-is, grouped.
- A "Preview first invoice" button that opens a side drawer with the fully-rendered invoice (using the Minimal template from V5 §1).
- Final **Activate** button bottom-right; **← Back to edit** button bottom-left.

2F. **Edit mode.** Opening the dialog with an existing schedule pre-fills every field and the primary button becomes **Save changes**. Add a **Pause schedule** / **Resume schedule** secondary button.

2G. **Error states are inline.** No toast on validation errors — show a red inline message below the specific field that failed.

**Acceptance:**
- `16-recurring-dialog-filled.png` (light + dark) — every input visibly labeled, helper text under each, Next run preview rendered.
- `17-recurring-confirm.png` (light + dark) — the confirmation step with the side drawer preview open.
- Playwright test: open the dialog, verify a `<label>` exists above each input via accessible-name query; fill required fields and assert Activate button enables; click Activate, assert confirmation view shows; click Back, assert form returns with data intact.

Commit: `feat(collections): plain-English labels, helper text, next-run preview, confirmation step on recurring dialog`.

---

## STEP 3 — Everything else from V5 (sections 4–15 and 17), no gates

After Steps 1 and 2 are in, continue through the V5 prompt in order. Do NOT wait for user review between sections — commit each when its acceptance passes and move on.

Order:
- V5 §4 LoadingState on 32 pages
- V5 §5 EmptyState on 42 pages (with the page-specific copy already written)
- V5 §6 Tooltip primitive + wire on every icon button
- V5 §7 MonoCopyable for GSTIN/PAN across 54 render sites
- V5 §17 DatePicker + DateRangePicker primitives, replace all 25 native date inputs, upgrade `/practice/calendar` to a month grid with color-coded dots
- V5 §8 Dialog size tokens xs/sm/md/lg/xl
- V5 §9 formatDate / formatMoney helpers, delete every inline toLocale call
- V5 §10 preview column internal scroll (verify — some of this already landed in `8f53851`)
- V5 §11 section copy pass on `/invoices/new`
- V5 §12 rewrite 4 oversize pages on top of ListPage / FormPage
- V5 §13 raw `<table>` → DataTable in 5 non-template places
- V5 §14 button hierarchy sweep — one primary per page
- V5 §15 print stylesheet on invoice templates

Each step commits with the same message convention V5 specifies.

---

## Final deliverable

When all steps are done:
- `docs/ui-review-v5/` holds **28 numbered screenshots in both themes** — if any is missing, stop and populate.
- `docs/UI_REDESIGN_LOG_V5.md` has one row per section with acceptance + commit SHA.
- A 3-minute screencast walking through: seeded dashboard → seeded practice → seeded notifications → seeded invoices → recurring dialog with every label visible + next-run preview + confirmation step → DatePicker flows → tooltips → GSTIN copy.
- Open the PR into `dev` with every commit SHA listed and the before/after screenshots inline.

## Honesty rules (same as before)

- No codemod. Hand-edit.
- No reusing the existing `recurring-schedule-dialog.tsx` structure as a starting point if it tempts shortcut — rewrite the form body from the labeled-block spec above.
- No downsizing the seeder counts. 500 parties means 500 parties, 150 notifications means 150.
- No "the seeder ran but nothing visibly changed" — open the pages, screenshot, confirm the UI shows the data, commit the screenshots.
- No merging to `dev` until the full 28-screenshot folder exists and the user has approved it.

**Begin with Step 1 (both seeders) immediately. Stream `[api] [web] [test]` logs to one terminal. No pauses. The next time the user hears from you is when Steps 1 and 2 are both committed and the populated-UI screenshots are in `docs/ui-review-v5/populated/`.**
