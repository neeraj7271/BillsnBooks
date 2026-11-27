# 🧰 UI Polish V5 — Fix the audit findings, hand-written, screenshot-proven

An audit of the whole frontend produced 15 ordered findings with their exact root cause and file locations. Fix every one on branch `ux/refresh-v6` (off current `ux/refresh-v5`). Hand-written, no codemod. Screenshot each fix. Honesty rules from prior campaigns apply. Live logs `[web] [test]` to one terminal, headless Playwright only.

Treat the P0 block (sections 1–3) as a hard gate — do NOT move to P1 without passing P0 user review.

---

## P0 — the three bugs the user is actively hitting

### 1. Wire the real invoice templates into `/invoices/new` Live Preview

**Root cause:** `apps/web/src/app/invoices/new/invoice-preview-card.tsx` renders a single hand-rolled card and only changes the top-strip background. The three real templates already exist at:
- `apps/web/src/app/invoices/[id]/templates/minimal-compact-template.tsx`
- `apps/web/src/app/invoices/[id]/templates/modern-brand-template.tsx`
- `apps/web/src/app/invoices/[id]/templates/tally-classic-template.tsx`

**Fix:**

1.1 Create `apps/web/src/app/invoices/new/invoice-preview-model.ts` exporting `buildInvoicePreviewModel(formState, activeCompany, activeBranch, selectedParty, lineItems, computedTotals)`. It returns the exact object shape the three templates already read on the detail page (`invoice.invoiceNumber`, `invoice.party`, `invoice.items[]` with `hsnSacCode`/`quantity`/`unitPrice`/`gstRatePercent`/`amount`, `invoice.totalCgst/totalSgst/totalIgst/totalCess/roundOff/totalAmount`, `invoice.companyLegalNameSnapshot`, `invoice.companyPanSnapshot`, `invoice.partyPanSnapshot`, `invoice.billingAddressSnapshot`). Missing fields fall back to muted-italic placeholders (`"(auto)"` for invoice number, `"Customer not selected"` for party).

1.2 Rewrite `invoice-preview-card.tsx` to pick the component by template:
```tsx
const TemplateComponent = {
  Minimal: MinimalCompactTemplate,
  Modern: ModernBrandTemplate,
  Tally: TallyClassicTemplate,
}[templateStyle];
return <TemplateComponent invoice={previewModel} company={activeCompany} settings={brandingSettings} />;
```

1.3 Wrap the rendered template in a 1:1 A4 frame (`aspect-[1/1.414] max-w-[794px] mx-auto`) so the preview looks like paper.

1.4 Each template keeps its distinct look. If any two look similar, fix the template component — do not fall back to a generic card.

**Acceptance (saved to `docs/ui-review-v5/`):**
- `01-preview-minimal.png`, `02-preview-modern.png`, `03-preview-tally.png` — same invoice, three visibly different designs.
- `04-print-minimal.pdf`, `05-print-modern.pdf`, `06-print-tally.pdf` — printed via Playwright, 1-page A4 each, real company legal name and real PAN visible, no app chrome.

Commit: `fix(invoice): render real Minimal/Modern/Tally templates in /invoices/new preview with A4 frame`.

---

### 2. Fix every line-item column so values are actually visible

**Root cause (measured):** in `apps/web/src/app/invoices/new/invoice-line-items.tsx` the UOM cell is `w-16` (64 px). Cell padding `p-2` eats 16 px, input padding `px-2.5` eats 20 px, leaving **28 px** of text area. "NOS" in mono at `text-xs` is ~30 px → clipped to "N". Same style bug on Qty / Disc% / HSN / GST% / Rate (Rate is worst — `pl-6` addon reserves another 24 px).

**Fix:**

2.1 Column widths (td + input):
| Column | New TD width | Cell padding | Input padding | Addon | Text area |
|---|---|---|---|---|---|
| Item (Combobox) | flex, `min-w-[220px]` | `py-1.5 px-2` | — | — | fills |
| HSN | `w-[112px]` | `py-1.5 px-1.5` | `px-2` | — | ~85 px |
| Qty | `w-[88px]` | `py-1.5 px-1.5` | `px-2` | — | ~61 px |
| UOM | `w-[80px]` | `py-1.5 px-1.5` | `px-2` | — | ~53 px |
| Rate | `w-[144px]` | `py-1.5 px-1.5` | `pl-6 pr-2` | ₹ | ~92 px |
| Disc% | `w-[80px]` | `py-1.5 px-1.5` | `pr-5` | % | ~57 px |
| GST% (Select) | `w-[88px]` | `py-1.5 px-1.5` | `px-2` | chevron | ~55 px |
| Amount (read-only) | `w-[144px]` | `py-1.5 px-2` | — | — | fills |
| Remove | `w-[40px]` | `py-1.5` | — | — | icon |

Total minimum table width = 1016 px. On < 1200 px viewports the Split view is disabled (V3 rule already in place), and the Edit view gets single-column form at `max-w-5xl`, so this fits comfortably.

2.2 Every input inside a cell carries `className="w-full min-w-0"`. Every `CurrencyInput` keeps its absolute-positioned `₹` prefix (already correct in `packages/ui/src/currency-input.tsx`); only the host cell widths change.

2.3 Horizontal overflow fallback: at viewports narrower than the table's min-width, wrap the table in `overflow-x-auto` with the Item column `position: sticky; left: 0; background: bg-surface` so the user doesn't lose context while scrolling.

2.4 New-row defaults are real values users can see before typing: `Qty 1`, `UOM NOS`, `Rate 0.00`, `Disc% 0`, `GST% 18`.

**Acceptance:**
- `07-line-items-filled.png` — a row with Qty `2`, UOM `PCS`, Rate `₹10,000.00`, Disc `5%`, GST `18%`, Amount `₹22,420.00` — every value legibly visible.
- `08-line-items-split-1280.png` — at exactly 1280 × 900, Split view, every column readable.
- `09-line-items-narrow.png` — at 960 px, single-column form with the table horizontally scrolling, Item column sticky.
- Playwright `tests/e2e/visibility.spec.ts` — for each column, type a value, assert `input.scrollWidth <= input.clientWidth` (not clipped).

Commit: `fix(invoice): widen line-item columns so UOM/Qty/Rate/HSN/GST values are fully readable`.

---

### 3. Add a Toast primitive and delete every `alert()` and `confirm()`

**Root cause:** no toast / snackbar primitive in `packages/ui/src`. `alert()` appears in 6 files, `confirm()` in `apps/web/src/app/settings/ledgers/page.tsx` (3×). Browser-native dialog pops over the app, isn't theme-aware, isn't styleable, breaks the professional look instantly.

**Fix:**

3.1 Create `packages/ui/src/toast.tsx` (headless-ui or Radix `@radix-ui/react-toast`). Export `Toaster`, `toast.success(msg)`, `toast.error(msg)`, `toast.info(msg)`, `toast.warning(msg)`. Top-right position, 3 s success, 5 s error, 4 s info/warning. Themed via semantic tokens. Dismiss on click or X. Max 3 stacked; older toasts collapse.

3.2 Create `packages/ui/src/confirm-dialog.tsx` (already present? audit shows `ConfirmDialog` used in `invoices/page.tsx`; verify and consolidate). Signature: `await confirmDialog({title, description, confirmLabel, cancelLabel, variant: 'default' | 'danger'})` returns `boolean`. Theme-aware, keyboard-friendly (Esc = cancel, Enter = confirm).

3.3 Mount `<Toaster />` in `apps/web/src/app/layout.tsx` once.

3.4 Replace every `alert()`:
- `apps/web/src/app/items/page.tsx:201` → `toast.error(msg)`
- `apps/web/src/app/reports/cash-bank-audit/page.tsx:134,145` → `toast.error('Export failed: ' + err.message)` / `toast.error('Print failed: ' + err.message)`
- `apps/web/src/app/reports/item-sales/page.tsx:81,91` → same pattern
- `apps/web/src/app/reports/expenses/page.tsx:151,162` → same pattern

3.5 Replace every `confirm()`:
- `apps/web/src/app/settings/ledgers/page.tsx:157,163,176` → `await confirmDialog({title: 'Delete ledger', description: 'This will remove the ledger …', confirmLabel: 'Delete', variant: 'danger'})`

3.6 Grep after: `grep -rnE "\balert\(|\bconfirm\(|window\.alert|window\.confirm" apps/web/src` returns 0 hits (excluding comments).

**Acceptance:**
- `10-toast-success.png`, `11-toast-error.png`, `12-confirm-dialog.png` — in both themes.
- Playwright: trigger an export error on a reports page; a toast appears top-right (not an OS alert). Trigger a ledger delete; the themed ConfirmDialog opens.

Commit: `feat(ui): add Toast + ConfirmDialog primitives, remove browser alert()/confirm() app-wide`.

---

## P1 — gaps that make the app look unfinished

### 4. LoadingState on every page that fetches data

**Finding:** 32 of ~42 pages have no `LoadingState` or `Skeleton`. User sees a dead blank table while the API loads.

**Fix:** add `<LoadingState rows={8} />` (or `<LoadingState variant="cards" />`, `variant="form"`) to every one of these pages while their data query is `isLoading`. Every one named in the audit: approvals, auth/login, auth/signup, banking/[id]/reconcile, banking/discovery, banking, collections/ageing, collections/payment-links, collections/recurring, imports/[id]/review, imports/new, imports, invoices/[id], invoices, items, parties, practice/calendar, practice/clients, practice/documents, practice/tasks, reports/balance-sheet, reports/customer-sales, reports/general-ledger, reports (hub), reports/profit-and-loss, reports/trial-balance, settings/companies, settings/invoice-branding, settings/numbering, settings/periods, settings/tally, vouchers.

Use the existing `LoadingState` primitive in `packages/ui/src` (confirm variant list; if the `cards` / `form` variants don't exist, add them).

**Acceptance:** Playwright script loads each page with a 2-s delay injected on the API call; a skeleton is visible on every page during that window. Screenshot per page to `docs/ui-review-v5/loading/`.

Commit: `feat(ui): LoadingState on 32 pages — no more blank-table-while-loading`.

---

### 5. EmptyState on every list / form page

**Finding:** 42 pages have no `EmptyState`. First-use experience is a blank table with no guidance.

**Fix:** `<EmptyState icon={...} title={...} description={...} action={{label, onClick}} />` on every page when data returns 0 rows (and no filter is active — see 5.1 for filter-empty). Keep it distinct from the Loading state.

5.1 Second variant when a filter is active and returns 0 rows: `<EmptyState icon={<Search/>} title="No matches" description="Try widening your filters." action={{label: 'Clear filters', onClick: resetFilters}} />`.

5.2 Copy per page (short, action-oriented — not generic "No data"):
- `/parties` — "No parties yet" / "Add a customer or vendor to start billing."
- `/items` — "No items yet" / "Add goods or services you sell."
- `/invoices` — "No invoices yet" / "Create your first GST invoice."
- `/vouchers` — "No journal vouchers" / "Vouchers appear here once invoices are approved or you post a manual journal."
- `/approvals` — "Inbox zero" / "No invoices pending your approval right now."
- `/banking` — "No bank accounts" / "Add a bank account to upload statements and reconcile."
- `/practice/clients` — "No clients yet" / "Invite a client to start their file."
- etc.

List the full copy in the commit body; design the icons from `lucide-react` (Receipt, Users, Boxes, Scroll, Inbox, Landmark, Briefcase, Calendar, FileText …).

**Acceptance:** per-page screenshot in `docs/ui-review-v5/empty/`; axe-core passes on the empty variant.

Commit: `feat(ui): EmptyState on 42 pages with page-specific copy and action CTA`.

---

### 6. Tooltip primitive + aria + wire on every icon-only button

**Finding:** no Tooltip primitive. Icon-only buttons have `aria-label` but no on-hover help, so discoverability is zero.

**Fix:**

6.1 Create `packages/ui/src/tooltip.tsx` using Radix `@radix-ui/react-tooltip`. Delay 400 ms. Dark surface in light mode, light surface in dark mode (inverted). Positions: `top/right/bottom/left` with auto-flip. Max width `240 px`, text wrap.

6.2 Wrap every icon-only button (`Button` with `size="icon"` or `size="icon-sm"`) in a `<Tooltip content="…">`.

6.3 Keyboard shortcut hint in the tooltip where one applies: `Download PDF (⌘D)`, `New invoice (N)`, etc.

**Acceptance:** `13-tooltips.png` showing 4 different tooltips hovered in both themes.

Commit: `feat(ui): Tooltip primitive wired to every icon button app-wide`.

---

### 7. GSTIN & PAN get copy-on-click with a `<MonoCopyable>` component

**Finding:** 54 places render a GSTIN or PAN, only 4 have a copy affordance.

**Fix:**

7.1 Create `packages/ui/src/mono-copyable.tsx` — `<MonoCopyable value="27AAACP0012A1ZS" label="GSTIN" />`. Renders as `font-mono text-xs uppercase` with a `Copy` icon that appears on hover, click copies to clipboard + fires a `toast.success('GSTIN copied')`.

7.2 Grep for `GSTIN:` and `PAN:` labels across `apps/web/src/app/**` (54 hits per audit). For each, wrap the value in `<MonoCopyable>`.

7.3 On the invoice-detail Party card, the whole chip becomes copyable; on tables (parties list), only the raw value becomes copyable; on the invoice preview/template, no copy affordance (printed output stays clean).

**Acceptance:** `14-gstin-copy.png` showing the hover state and the toast; Playwright test clicks a GSTIN and asserts `navigator.clipboard` has the value.

Commit: `feat(ui): MonoCopyable for GSTIN/PAN across 54 render sites`.

---

### 8. Standardize dialog widths with 5 named sizes

**Finding:** 50 occurrences of ad-hoc `max-w-sm/md/lg/xl/2xl/3xl/4xl/5xl/6xl/7xl` across dialogs. Same type of form opens at different widths in different places.

**Fix:**

8.1 Expose a `size` prop on the `Dialog` primitive with 5 named values:
- `xs` — `max-w-[420px]` (confirm, single input)
- `sm` — `max-w-[560px]` (short form, 4–6 fields)
- `md` — `max-w-[720px]` (standard form, grouped fieldsets)
- `lg` — `max-w-[960px]` (dense form, table-in-dialog)
- `xl` — `max-w-[1200px]` (wide tools; rare, needs justification)

8.2 Audit each of the 50 call sites; pick the appropriate size and remove the inline `max-w-*` class.

8.3 ESLint rule: any `<Dialog*>` component with a `className` containing `max-w-` triggers a warning (prefer `size=` prop).

**Acceptance:** before/after screenshot of 5 dialogs at matching sizes; the 50-hit grep returns 0.

Commit: `refactor(ui): Dialog size tokens xs/sm/md/lg/xl; remove 50 ad-hoc width overrides`.

---

### 9. Shared `formatDate` / `formatMoney` helpers, one source of truth

**Finding:** 15+ inline uses of `toLocaleDateString('en-IN')` and raw `new Date().toISOString().split('T')[0]`. 10+ inline uses of `toLocaleString('en-IN', {minimumFractionDigits: 2})`. Dates render differently on different pages.

**Fix:**

9.1 Create `packages/ui/src/format.ts`:
```ts
export function formatDate(d: Date | string, variant: 'short' | 'long' | 'iso' = 'short'): string;
export function formatMoney(amount: number | string, opts?: {sign?: boolean, currency?: string}): string;
export function parseISODate(s: string): Date;
export function todayISO(): string;        // YYYY-MM-DD in local time
export function addDaysISO(s: string, n: number): string;
```

- `short` → `25 Nov 2026`
- `long` → `25 November 2026`
- `iso` → `2026-11-25`
- `formatMoney(123456.78)` → `₹ 1,23,456.78`
- `formatMoney(-500)` → `(₹ 500.00)` — wrapped in parens, callers color with `text-status-danger-text`.

9.2 Replace every inline `toLocaleDateString`, `toISOString().split('T')[0]`, `toLocaleString('en-IN')` across `apps/web/src/app/**` with these helpers.

9.3 `DateText` and `MoneyText` primitives both delegate to these helpers (single source of truth).

**Acceptance:** grep post-fix: `grep -rn "toLocaleDateString\|toLocaleString('en-IN'" apps/web/src` returns 0 hits (excluding the helpers themselves).

Commit: `refactor(ui): formatDate/formatMoney helpers; delete every inline toLocale call`.

---

### 10. Preview column internal scroll on `/invoices/new`

**Finding:** the right preview column overflows into the page, dragging a scrollbar onto the left edge — breaks the V3 shell contract.

**Fix:**

10.1 In Split mode, the preview column container is `h-[calc(100vh-theme(spacing.14))] overflow-y-auto` (viewport height minus top header), so the preview scrolls internally.

10.2 In Preview full-width mode, the preview renders inside the page's regular scrollable `<main>` at `max-w-[820px] mx-auto` with no internal scroll.

10.3 Add `data-testid="invoice-preview-scroll"` for Playwright assertion.

**Acceptance:** scroll a long preview; body scrollbar stays put, only the preview column scrolls internally. Screenshot `15-preview-internal-scroll.png`.

Commit: `fix(invoice): preview column scrolls internally in Split mode`.

---

## P2 — consistency and copy

### 11. Section copy pass on `/invoices/new`

**Fix:**
- "3. Billable Line Items & HSN Classification" → **Line Items**
- "4. Statutory Tax & Value Breakdown" → **Totals**
- "5. Notes, Terms & Settlement Instructions" → **Notes & Terms**
- Drop the numbering on any other section too.
- Layout: Document → Party → Line Items (full width) → Totals (right, `max-w-sm`) + Notes (left, flex) as a 2-col grid at ≥ 1024 px, stacked below. No more section 4 + 5 side-by-side mess.

Commit: `refactor(invoice): plain-English section titles and vertical Totals/Notes rhythm`.

---

### 12. Rewrite the four oversize pages on top of the shared shells

The audit shows these pages > 500 lines, duplicating layout work the shells already do:

- `apps/web/src/app/settings/notifications/page.tsx` — 878 lines → target 350 using `ListPage` for the rules table + `FormPage` for the settings.
- `apps/web/src/app/items/page.tsx` — 807 lines → target 300 using `ListPage`.
- `apps/web/src/app/vouchers/page.tsx` — 758 lines → target 300 using `ListPage`.
- `apps/web/src/app/invoices/new/page.tsx` — 662 lines → target 350 after moving fieldsets to child components (per 3.3–3.4 of the V3 prompt).

Per-page commit: `refactor(<page>): rewrite on ListPage/FormPage shells, -NNN lines`.

---

### 13. Convert raw `<table>` to `DataTable` where applicable

**Finding:** 10 files use raw `<table>` — keep the 3 invoice templates (they're print artefacts) and `imports/[id]/review` (per-row-editable grid, too specific). Convert the rest:
- `app/settings/page.tsx`
- `app/imports/new/step2-mapping.tsx`
- `app/imports/new/step3-validation.tsx`
- `app/invoices/[id]/invoice-tax-schedule.tsx`
- `app/invoices/[id]/invoice-items-table.tsx`

All inherit pagination / sorting / empty / loading from `DataTable` for free.

Commit: `refactor(ui): raw <table> → DataTable in 5 non-template places`.

---

### 14. Button hierarchy sweep

**Finding:** `settings/numbering` has 7 brand buttons, `vouchers/ledgers/companies/notifications` have 4–5 each.

**Fix:** per page, exactly one `variant="primary"` button in the main action cluster. Everything else becomes `outline`, `ghost`, or `secondary`. Destructive stays `danger`. If a page genuinely needs multiple creation flows (e.g. `settings/numbering` supports configuring a series AND creating a series), group them under a single primary split-button with a chevron dropdown.

Audit each of the 7 flagged pages, make the change, screenshot before/after per page.

Commit: `fix(ui): single primary button per page; group secondary creates under split-buttons`.

---

### 15. Print stylesheet audit on the three invoice templates

**Finding:** templates use `print:bg-white print:text-black` overrides but there is no comprehensive print setup: no `@page { size: A4; margin: 15mm }`, no `page-break` rules on multi-page invoices, no forced `font-family` for print (some systems render differently).

**Fix:** add a shared `apps/web/src/app/invoices/print.css` imported only by the template components. Contains:
```css
@media print {
  @page { size: A4; margin: 15mm }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; color: black !important; font-family: Inter, -apple-system, system-ui, sans-serif; }
  .no-print { display: none !important; }
  .page-break-before { break-before: page; }
  .page-break-avoid { break-inside: avoid; }
  table thead { display: table-header-group; }
  table tr { break-inside: avoid; }
}
```

Templates add `.page-break-avoid` on totals block, `.no-print` on any live-only element.

Commit: `feat(invoice): shared print stylesheet with A4, color-adjust, repeated table headers`.

---

## Verification protocol (same as prior rounds — do not skip)

For each commit:
- Open the affected pages headless Playwright, desktop 1440×900 + mobile 390×844, both themes.
- Screenshot to `docs/ui-review-v5/<section>/<page>-<mode>.png`.
- Open the screenshot YOURSELF before claiming done.
- Diff vs the pre-V5 baseline; regressions are fixes, not tolerances.
- Run axe-core; 0 serious violations in both themes.
- Run `tests/e2e/visibility.spec.ts`; pass.
- Update `docs/UI_REDESIGN_LOG_V5.md` with the acceptance row + commit SHA.

## Final deliverables

- `docs/ui-review-v5/` populated per section.
- `docs/UI_REDESIGN_LOG_V5.md` with per-section rows.
- A 2-minute screencast demonstrating: template switch in preview (three distinct outputs), line-item row with every value readable, an error toast (not an alert), a ledger-delete confirm dialog, an icon-button tooltip, a GSTIN copy with toast, a page loading skeleton → populated, an empty-state CTA.
- PR into `dev`, every commit SHA listed, before/after screenshots inline for sections 1, 2, 3.

## Hard bans

- No codemod. Hand-edit every file.
- No "width is technically set" excuse — if a value isn't readable at 1280 px, the width is wrong.
- No reinventing the three invoice templates — reuse the files already in `app/invoices/[id]/templates/`.
- No merging to `dev` until the user has opened `docs/ui-review-v5/` and said OK.

**Begin. P0 first (sections 1–3); stop and show the user `01-preview-minimal.png` through `12-confirm-dialog.png` before starting P1. Stream logs continuously. Don't stop until every section is backed by log evidence and screenshots.**

---

## P1.5 — four more findings from the user (add these to the same V6 branch)

### 16. Recurring Invoicing Schedule dialog — make it legible for any user

**Root cause:** `apps/web/src/app/collections/recurring/recurring-schedule-dialog.tsx` currently:
- Puts the "Template Line Item" section as a sunken box with THREE inputs that have only placeholders (`SAC / HSN`, `Unit Price`, `GST %`) and NO visible labels — users have to guess what each field is after they click into it.
- Labels existing fields with technical names (`Customer Account`, `Max Invoices to Generate`) that aren't self-explanatory.
- Doesn't explain the cadence impact ("Monthly" doesn't say whether it means "every 30 days" or "same day each month"), the next-run preview, or the GST re-verification note on the page header.
- Doesn't show a preview of what the first generated invoice will look like, so the user is flying blind until the first run.
- No validation feedback ("Max Invoices to Generate" accepts any integer with no cap hint).

**Fix:**

16.1 **Every input gets a visible label above it** AND a one-line helper text below where ambiguity exists. No placeholder-as-label.

16.2 **Rename the fields for a non-technical user:**
- "Customer Account" → **Bill to Customer**
- "Frequency" → **Billing Frequency** — helper: "How often an invoice is generated."
- "Start Date" → **First Invoice Date** — helper: "The first invoice runs on this date."
- "Max Invoices to Generate" → **Number of Invoices** — helper: "Total invoices this schedule will create. Leave blank for unlimited until End Date."
- "End Date (Optional)" → **Stop After (Optional)** — helper: "No invoices are generated past this date."
- "TEMPLATE LINE ITEM" sunken box → **What's on each invoice** section with three clearly labeled rows:
  - `Description` (what appears on the invoice line)
  - `HSN / SAC Code` + helper "The 6- or 8-digit code for GST classification. 998222 is standard for accounting services."
  - `Unit Price (₹)` + helper "Amount before GST, per invoice."
  - `GST Rate (%)` + helper "Standard rates: 5, 12, 18, 28."
- Add a second line-item row option — one retainer isn't always one line item in practice.

16.3 **Live "Next run" summary.** A read-only chip row at the bottom of the form that updates as the user types:
- "First invoice: 1 Dec 2026 · Then: 1 Jan 2027, 1 Feb 2027, 1 Mar 2027 …" (show 3 upcoming dates).
- "Total: 12 invoices · Grand total per invoice: ₹ 29,500 (incl. 18% GST)".
- Red warning if the current period for the First Invoice Date is locked.

16.4 **Primary action copy clearer:** "Activate Schedule" → stays, but disabled until the required fields are valid; tooltip on the disabled button names the missing field.

16.5 **Confirmation step before activation.** Clicking Activate shows a one-screen summary (same fields, read-only, plus a "Preview first invoice" link that opens the generated invoice in a drawer) with a final **Activate** button.

16.6 **Pause / resume / edit from the dialog** when opened on an existing schedule — currently the dialog only creates. Extend it to edit (passing initial values) and pause.

**Acceptance:**
- `16-recurring-dialog-filled.png` — every input has a visible label, helper text where needed, and the "Next run" preview is rendered.
- `17-recurring-confirm.png` — the confirmation step with the first-invoice preview drawer.

Commit: `feat(collections): plain-English labels, helper text, next-run preview, confirm step on recurring dialog`.

---

### 17. Modern, consistent date picker everywhere

**Root cause:** 25 `<Input type="date">` instances across 16 files. Browser-native date inputs render differently on every OS (ugly on Windows, iOS has a wheel, Firefox Linux is plain), and they ignore the app's design tokens entirely.

**Fix:**

17.1 **Add a `DatePicker` primitive** at `packages/ui/src/date-picker.tsx` built on `react-day-picker` v9 (already lightweight, no jQuery) + `@radix-ui/react-popover` for the anchored dropdown. Install:
```
pnpm add react-day-picker@^9 @radix-ui/react-popover date-fns
```
API:
```tsx
<DatePicker
  value={startDate}             // ISO date string or Date
  onChange={(iso) => ...}
  min={todayISO()}
  max={addDaysISO(todayISO(), 365)}
  placeholder="Select date"
  disabled={false}
  format="dd MMM yyyy"          // trigger label format
  size="sm" | "md"
  weekStartsOn={1}              // Monday for Indian users
  locale="en-IN"
/>
```

Features:
- Trigger button shows the selected date formatted via `formatDate(value, 'short')` from the helper added in section 9, with a calendar icon on the right.
- Popover opens below the trigger, flips up if no space; closes on outside click or Esc.
- Month-year header with prev/next chevrons AND clickable month/year that opens a year grid for fast jumps (useful for DOB or FY start).
- "Today" shortcut + "Clear" shortcut at the bottom (Clear hidden if required).
- `min`/`max` grey out out-of-range dates.
- Keyboard: `←/→` moves by day, `↑/↓` by week, `PageUp/PageDown` by month, `Enter` picks, `Esc` closes.
- Tokens: selected date is `bg-brand text-inverse`, today is `ring-1 ring-brand`, muted outside-month days.
- Supports a range mode via `<DateRangePicker>` (needed on all report pages — their `from`/`to` becomes one popover instead of two inputs).

17.2 **Replace every `<Input type="date">` with `<DatePicker>`.** 16 files:
- `app/invoices/new/invoice-header-fields.tsx` (Invoice Date, Due Date)
- `app/vouchers/page.tsx` (JV date)
- `app/collections/recurring/recurring-schedule-dialog.tsx` (Start Date, End Date)
- `app/collections/ageing/promise-to-pay-dialog.tsx` (promised date)
- `app/collections/payment-links/reconcile-settlement-dialog.tsx` (settlement date)
- `app/practice/tasks/task-dialog.tsx` (due date)
- `app/practice/documents/request-document-dialog.tsx` (due date)
- all 7 report pages (from / to → one `DateRangePicker`)

17.3 **Range quick-chips** on report pages: `This Month`, `Last Month`, `This Quarter`, `This FY`, `Last FY`, `Custom`. Clicking a chip sets both dates.

17.4 **Statutory Calendar (`/practice/calendar`)** gets its own big calendar grid upgrade too — a proper month view with due-date dots on each cell (color-coded by compliance type: red GST, amber TDS, blue ROC), click a date opens a side drawer with the tasks for that day. Reference pattern: Fantastical / Google Calendar.

17.5 **Grep after:** `grep -rn 'type="date"' apps/web/src/app` returns 0 hits.

**Acceptance:**
- `18-datepicker-open.png` — the new popover in both light and dark modes.
- `19-daterange-picker.png` — a range selection with the quick chips.
- `20-statutory-calendar-month.png` — the practice calendar's upgraded month view with due-date dots.

Commit: `feat(ui): DatePicker + DateRangePicker primitives; replace 25 native date inputs app-wide`.
Commit: `feat(practice): statutory calendar month grid with color-coded compliance dots`.

---

### 18. Seed the Practice module with realistic data — so the UI is actually visible

**Root cause:** The `/practice/clients`, `/practice/tasks`, `/practice/documents`, `/practice/calendar` endpoints exist but the DB is empty for most tenants. Most of what the user sees today is an empty page, so there's no way to tell if the UI works.

**Fix:**

18.1 **Create a dedicated practice-data seeder** at `apps/api/src/infrastructure/persistence/seeds/practice-seed.ts`. On a dev-only `pnpm seed:practice` script, for each existing tenant / company:

- **30 firm clients** with realistic Indian company names (Pvt Ltd / LLP / HUF / Proprietorship mix), varied PANs, varied GSTINs (some registered / some unregistered / some composition), with realistic contact names (first names drawn from a representative pool, e.g., Priya, Rohan, Aditi, Kabir, Zara, Vikram, Meera, Arjun, Sneha, Ananya — not Western-only), phone numbers in `+91 9xxx xxx xxx` format, and plausible email domains. Clients span multiple states.

- **200 compliance tasks** spread across the current and next 3 months, with realistic types (GSTR-1, GSTR-3B, GSTR-9, TDS Return 26Q, TDS Return 24Q, Advance Tax, ITR filing, ROC AOC-4, ROC MGT-7, PF, ESI, audit prep, bookkeeping close) and statuses (Not Started / In Progress / Review / Filed / Overdue), owner assignments across 3 staff users, due dates both past (to populate the Overdue bucket) and future.

- **80 client-document requests** in mixed states: Pending, Uploaded, Approved, Rejected — covering typical doc types (Bank Statement, Sales Register, Purchase Register, Form 26AS, TDS Certificates, Board Resolution, ITR V, Audit Report, Rent Agreement).

- **60 practice calendar entries** for the statutory due dates of the current FY and next (GSTR-1 on the 10th, GSTR-3B on the 20th, TDS on the 7th, PF on the 15th, ESI on the 15th, Advance Tax installments, ROC annual filings), each linked to one or more affected clients.

- Dates distributed so at any time a user opening the app sees: 3-5 overdue, 10-15 due this week, 20+ upcoming.

18.2 **Idempotent.** The seeder checks for existing rows by a natural key (client_code / task + client + period) and does nothing on re-run. Safe to run repeatedly in dev and demo environments. Never runs automatically in production (guarded by `NODE_ENV !== 'production'`).

18.3 **Expose a UI control in `/settings`** (dev-only, gated by `NEXT_PUBLIC_DEV_TOOLS=true`): "Reseed demo data" button that calls a dev endpoint `POST /v1/dev/reseed/practice`. Only enabled when the dev flag is on.

**Acceptance:**
- Run the seeder; open `/practice/clients` — 30 real-looking rows visible with varied data; open `/practice/tasks` — 200 tasks with mixed statuses visible in the Kanban columns; open `/practice/calendar` — the month shows due-date dots on multiple days; open `/practice/documents` — 80 requests with varied statuses.
- Screenshots `21-practice-clients.png`, `22-practice-tasks.png`, `23-practice-calendar.png`, `24-practice-documents.png` in both themes.

Commit: `feat(seed): practice-data seeder — 30 clients, 200 tasks, 80 doc requests, 60 calendar entries per tenant`.

---

### 19. Seed realistic data everywhere else the UI is empty — 400–500 records per domain

**Root cause:** Several modules show empty UI because the DB has no data for a fresh tenant. Audit of likely-empty areas:

- Notifications (bell dropdown and `/notifications`)
- Vouchers list (shows only approved-invoice-posted vouchers; other voucher types rare)
- Banking (bank accounts, bank transactions, discovery tickets)
- Collections (payment links, settlements, reminders)
- Approvals
- Imports (batches)
- Dashboard KPI cards and ageing bars

**Fix:**

19.1 **Expand the demo-data seeder** at `apps/api/src/infrastructure/persistence/seeds/demo-seed.ts`. On `pnpm seed:demo`, for each existing tenant / company:

- **500 parties** (customers + vendors mix, varied registration types, varied states).
- **500 items** across GOODS and SERVICES, varied HSN/SAC codes (10-15 real codes), varied GST slabs (0 / 5 / 12 / 18 / 28), some with cess.
- **500 invoices** over the last 12 months with varied statuses (DRAFT / SUBMITTED / APPROVED / CANCELLED / PAID), varied tax scenarios (intra-state, inter-state, RCM, zero-rated, with cess), varied amounts (₹2 000 to ₹25 00 000 range).
- **500 journal vouchers** of mixed types (Sales / Purchase / Receipt / Payment / Journal / Contra), posted and reversed mix.
- **100 bank accounts** across HDFC/ICICI/SBI/Axis/Kotak, each with 50 bank transactions (so 5 000 transactions total per tenant).
- **200 payment links** in Created / Paid / Expired states.
- **150 notifications** across types (invoice approved, invoice rejected, payment received, period locked, reminder sent, security event, system update, import completed, document uploaded) with realistic timestamps spread over the last 30 days, mix of read/unread (keep 20 unread so the bell badge is populated).
- **50 approval requests** of varied age (fresh, this week, older) with varied priorities.
- **40 import batches** in various states (PROCESSING / PARTIAL / COMPLETED / FAILED).
- **80 recurring schedules** across MONTHLY / QUARTERLY / ANNUAL.
- **30 collection reminders** of mixed age and status.

19.2 **Variety guarantees** (not just 500 copies of the same thing):
- Customer and item names use real-looking varied strings (not `Buyer 1 / Buyer 2 / Buyer 3`). Pool of ~200 company-name fragments combined with suffixes (Industries, Enterprises, Trading Co, Services Pvt Ltd, LLP, & Sons, Mills, Exports). Pool of ~100 item-name fragments (e.g. Office Chair, Printer Cartridge, Consulting Services, SaaS License, Freight, Packaging, Raw Material - Grade A). Names are seeded with a deterministic seed so runs are reproducible.
- Dates are spread logarithmically — more activity in the recent week, tapering off over the year, so dashboards and reports show realistic trends.
- Amounts follow a log-normal distribution so there's a mix of small retail invoices and a few large enterprise ones (so reports have interesting shape, not a flat line).
- States across all of India (not just Maharashtra). A mix means inter-state invoices actually exist in the data.

19.3 **Deterministic.** Same seed → same data. Allow a `--seed=<N>` CLI flag.

19.4 **Expose two UI buttons in `/settings` (dev-only, same flag as 18.3):**
- "Reseed demo data" — repopulates everything from scratch (truncates first).
- "Top up demo data" — adds more realistic rows on top of what's there, without truncating.

19.5 **Document the seeder** in `docs/dev/DEMO_SEEDER.md` so a new dev / designer can get a fully-populated app in one command.

19.6 **Acceptance:**
- After the seeder runs, no page in the app shows an empty state unless the user explicitly filters to zero rows.
- Dashboard KPI cards show non-zero numbers, ageing bars have multiple buckets populated, recent invoices list shows 10 real-looking rows.
- Bell badge shows "20" unread notifications.
- Reports show interesting curves (not flat).
- Screenshots `25-dashboard-populated.png`, `26-vouchers-populated.png`, `27-banking-populated.png`, `28-notifications-populated.png` in both themes.

Commit: `feat(seed): comprehensive demo seeder — 500 parties, 500 items, 500 invoices, 5k txns, 150 notifications per tenant with variety`.

---

## Updated acceptance for V5 (replaces the previous "Verification protocol")

Before opening the PR, the user must see in `docs/ui-review-v5/`:

- Preview screenshots `01` through `06` (templates).
- Line-item screenshots `07` through `09`.
- Toast + ConfirmDialog `10` through `12`.
- Tooltip `13`, GSTIN copy `14`, preview internal scroll `15`.
- Recurring dialog `16`–`17`.
- DatePicker, DateRangePicker, statutory calendar `18`–`20`.
- Practice populated `21`–`24`.
- Rest-of-app populated `25`–`28`.

**Total: 28 numbered screenshots covering every acceptance point. If any is missing, the PR is not ready.**
