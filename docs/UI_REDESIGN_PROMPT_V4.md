# 🧹 UI Polish V4 — Fix the template preview, make every input readable, kill the cramped-columns bug across the app

The V3 fixes landed, but real polish bugs remain. User reports are concrete and reproducible from screenshots:

1. **Live Preview panel on `/invoices/new` shows the same layout for Minimal / Modern / Tally** — only the header tint changes. The three real templates are never rendered.
2. **Line-item inputs on `/invoices/new` are unreadable** — Rate shows only `₹`, UOM shows only `N`, Qty is blank. User can't type into them comfortably.
3. **Form section headers are corporate-formal** ("3. Billable Line Items & HSN Classification", "4. Statutory Tax & Value Breakdown", "5. Notes, Terms & Settlement Instructions") and layout puts section 4 + 5 side-by-side at the bottom — looks arbitrary.
4. **Same cramped-input pattern appears across many pages.** This is not a one-page bug; the whole app has it.
5. **Overall the app still does not feel professional** — not Zoho / QuickBooks / Xero level.

Fix on branch `ux/refresh-v5` off current `ux/refresh-v4`. Hand-written, screenshot-verified, no codemod. Honesty rules from prior campaigns apply. Live logs to one terminal `[web] [test]`, headless Playwright.

---

## 1. Fix the Live Preview — actually render the three real templates

**Root cause (audit-verified):** `apps/web/src/app/invoices/new/invoice-preview-card.tsx` renders a single hand-rolled card and only varies the top-strip background (`bg-brand-subtle` for Modern, `bg-surface-sunken` for Tally, `bg-surface` for Minimal). The three real templates already exist and are used on the invoice detail page:
- `apps/web/src/app/invoices/[id]/templates/minimal-compact-template.tsx`
- `apps/web/src/app/invoices/[id]/templates/modern-brand-template.tsx`
- `apps/web/src/app/invoices/[id]/templates/tally-classic-template.tsx`

**Fix:**

1.1 Extract each template component so it accepts an `invoice`-shaped prop AND can be rendered from both the detail page (with saved data) and the create page (with in-progress form data).

1.2 Create a `buildInvoicePreviewModel(formState, activeCompany, activeBranch, selectedParty, lineItems, computedTotals)` helper in `app/invoices/new/invoice-preview-model.ts` that produces an object with the exact shape the three templates expect — same field names (`invoice.invoiceNumber`, `invoice.party`, `invoice.items[]` with `hsnSacCode`/`quantity`/`unitPrice`/`gstRatePercent`/`amount`, `invoice.totalCgst`/`totalSgst`/`totalIgst`/`totalCess`/`roundOff`/`totalAmount`, `invoice.companyLegalNameSnapshot`, `invoice.companyPanSnapshot`, `invoice.partyPanSnapshot`, `invoice.billingAddressSnapshot`, etc.). Where a field is empty in the draft (e.g. the invoice number hasn't been auto-generated yet), feed a visible placeholder (`'(auto)'` for number, `'Customer not selected'` for party, grey italic muted text) so the preview still looks like a real document.

1.3 In `InvoicePreviewCard`, replace the hand-rolled JSX with a switch:
```tsx
const TemplateComponent = {
  Minimal: MinimalCompactTemplate,
  Modern: ModernBrandTemplate,
  Tally: TallyClassicTemplate,
}[templateStyle];

return <TemplateComponent invoice={previewModel} company={activeCompany} settings={brandingSettings} />;
```

1.4 Each template keeps its distinct look. Visibly different: typography, spacing, brand accent, header layout, column styling, signature placement, totals block styling. No template should look like another. If any two look similar after this change, that is a template design bug to fix inside the template component — not a reason to fall back to a generic card.

1.5 When the user clicks Print/PDF from the preview mode, it uses `window.print()` and a print-stylesheet in the template that strips shell chrome and renders A4 portrait. All three templates must print cleanly.

1.6 Wrap the template preview in a 1:1-scaled A4 frame (`aspect-[1/1.414]` with `max-width: 794px` for A4 at 96 dpi) and center it inside the preview column so users see what will actually print.

**Acceptance (screenshot per step, saved to `docs/ui-review-v4/`):**
- `01-preview-minimal.png`, `02-preview-modern.png`, `03-preview-tally.png` — same invoice, three distinct designs, visibly different fonts / colors / layout.
- `04-preview-print-minimal.pdf`, `05-preview-print-modern.pdf`, `06-preview-print-tally.pdf` — downloaded via Playwright, each a 1-page A4 PDF with the real company name and real PAN visible, no app chrome.

Commit: `fix(invoice): render real Minimal/Modern/Tally templates in live preview with A4 frame`.

---

## 2. Fix the line-item inputs (every column must show its value)

**Root cause (audit-verified):** `apps/web/src/app/invoices/new/invoice-line-items.tsx` sets column widths on `<th>` cells (`w-16`, `w-20`, `w-24`, `w-28`), but the inputs inside (especially `CurrencyInput` with a `₹` left-addon) eat the space with their padding and don't propagate `w-full min-w-0`. On a 1280-px viewport in Split mode the whole form column is ~700 px, which leaves ~40–60 px per input — the ₹ sign fills it.

**Fix:**

2.1 Rewrite the line-item table with explicit, proven widths that work at 1280 px in Split mode:
- Item (Combobox) — flex, `min-w-[220px]`.
- HSN/SAC — `w-[96px]` text, `tabular-nums`.
- Qty — `w-[72px]`, right-aligned, `tabular-nums`, no addon.
- UOM — `w-[72px]`, select with 3–4 char codes (NOS, KG, PCS, LTR), centered.
- Rate — `w-[140px]`, right-aligned, `tabular-nums`, addon `₹` is INSIDE the input with `pl-7`, not a separate flex child that steals width.
- Disc % — `w-[80px]`, right-aligned, addon `%` right, `pr-6`.
- GST % — `w-[88px]`, right-aligned, select with options (0 / 5 / 12 / 18 / 28), `tabular-nums`.
- Amount — `w-[140px]`, right-aligned, bold, `tabular-nums`.
- Remove row (trash icon) — `w-[40px]`, centered.

Total minimum table width ~948 px. At viewports < 1200 px the form becomes single-column (Split disabled, per V3) so this fits. At narrower widths the table gets a horizontal scroll with the Item column pinned (`position: sticky; left: 0`) so the user never loses their place.

2.2 Every input inside a cell gets `className="w-full min-w-0"`. Every `CurrencyInput` ships with the `₹` as an absolute-positioned prefix OUTSIDE the inner `<input>`'s width calculation, OR as text padding inside the input (`padding-left: 1.75rem`) with the symbol absolutely positioned; either works, both are tested.

2.3 Default values shown on a new line are real and typeable: Qty `1`, UOM `NOS`, Rate empty (placeholder `0.00`), Disc% empty (`0`), GST% `18`. Not the placeholder-only state the user is seeing now.

2.4 Keyboard behaviour: `Tab` moves left-to-right across the row; `Shift+Tab` back; `Alt+N` adds a new row and focuses its Item combobox; `Alt+Backspace` removes the focused row (confirm if it has values).

2.5 Line amount updates live on every input blur (not on every keystroke, to avoid re-render thrash).

**Acceptance:**
- Screenshot `07-line-items-filled.png` showing a row with real values visible in every column (Qty `2`, UOM `PCS`, Rate `₹10,000.00`, Disc `5%`, GST `18%`, Amount `₹22,420.00`).
- Screenshot `08-line-items-at-1280px.png` — the Split view at exactly 1280-px window, every column readable.
- Screenshot `09-line-items-at-960px.png` — single-column mode with horizontal scroll, Item column sticky left.
- Playwright: type into each field, assert the DOM value matches what was typed, assert the Amount cell updates.

Commit: `fix(invoice): line-item columns use explicit widths with w-full inputs; all values visible`.

---

## 3. Form layout + copy pass on `/invoices/new`

3.1 **Section labels rewritten** (drop the numbering and the corporate phrasing):
- "3. Billable Line Items & HSN Classification" → **Line Items**
- "4. Statutory Tax & Value Breakdown" → **Totals**
- "5. Notes, Terms & Settlement Instructions" → **Notes & Terms**
- "1. …" and "2. …" if they exist → drop numbers. The visual grouping (card + title) is the structure; numbers add nothing.
- "Tax Treatment: Composition Scheme" chip stays but moves to the party card header, not a standalone row.

3.2 **Layout: vertical rhythm, not side-by-side at the bottom.** Order top to bottom in Edit mode:
1. Document card (type, branch, FY, series). Title `Document`.
2. Party & Dates card. Title `Party`. Party combobox full width; Invoice Date / Due Date / Place of Supply in a 3-column grid below.
3. Line Items card (full width).
4. Totals card on the right at `max-w-sm`, Notes & Terms card on the left taking the remaining space. 2-column grid at ≥ 1024 px, stacked below.
5. Sticky action bar at the bottom: `Save as Draft` (secondary) + `Save & Submit for Approval` (primary).

Scrap the "5. Notes, Terms & Settlement Instructions" / "4. Statutory Tax & Value Breakdown" side-by-side that the screenshot shows. That layout pairs an input area with a static summary — two different interaction types that shouldn't share a row.

3.3 **Totals card content** (right side):
- `Subtotal`, `Discount (–)`, `Taxable`, `CGST` + `SGST` (intra-state) OR `IGST` (inter-state), `Cess` (if any), `Round Off`, `Grand Total`.
- Grand Total row is `text-base font-bold`, separated by a 1-px divider above.
- All numbers `tabular-nums`, right-aligned.
- Below the card: `GST Rule 46 Compliant ✓` + the shortcut hints (`⌘S to Save Draft · ⌘⏎ to Submit`).

3.4 **Notes & Terms card content** (left side):
- Textarea for notes (6 rows).
- `Print Bank & Remittance Details on Invoice (Rule 46(q))` toggle with a tooltip explaining what gets printed.
- `Attach additional terms` — optional second textarea, hidden behind a disclosure.

3.5 **Top strip inside the form card (currently showing "Tax Treatment / Composition Scheme / GSTIN / PAN / City / State")** — reflow as a clean party summary chip row with 2 lines max: line 1 = party name + registration badge; line 2 = GSTIN, PAN, state as monospace chips with copy-on-click.

3.6 **Preview column scroll.** In Split mode, the preview column is `overflow-y-auto` inside its own fixed-height container so it doesn't pull the page scrollbar to the left edge. Keep the shell's scroll contract from V3.

**Acceptance:**
- Screenshot `10-form-edit-default.png` — all section titles plain-English, no numbering, clean grouping.
- Screenshot `11-form-split.png` — preview column scrolls internally, no left-edge page scrollbar.
- Visual diff vs V3 baseline — every section header, side-by-side layout and copy change is intentional and matches the acceptance screenshots.

Commit: `feat(invoice): plain-English section titles, totals-right + notes-left layout, clean party chip row`.

---

## 4. App-wide input and number visibility audit — fix every cramped column

The pattern in /invoices/new isn't unique. Run the audit and fix every occurrence.

4.1 **Grep for the symptoms.** Across `apps/web/src`:
- `<input` inside a `<td` OR inside a `grid-cols-` parent with `w-16`/`w-20`/`w-24` sibling classes.
- `CurrencyInput` without an explicit `w-full min-w-0` on the input element.
- `<Input` or `<Select` inside a table row without `w-full`.
- Any element with both an addon (prefix / suffix icon) AND a fixed narrow width.
- Any `Combobox` inside a table row — must have `w-full min-w-0`.

List every hit in `docs/INPUT_AUDIT.md`, open each, fix it to the same contract as section 2 above: TD/cell width is the OUTER constraint, inside the cell everything is `w-full min-w-0`, addons are absolute-positioned inside the input, not flex children.

4.2 **Pages to re-screenshot after the audit and fix cycle** (one light + one dark PNG each, saved to `docs/ui-review-v4/screens/`):
- `/parties` list and the party create/edit dialog (party-dialog.tsx).
- `/items` list and item create/edit dialog (item-dialog.tsx) and unit-manager-dialog.
- `/invoices` list and `/invoices/new` (all three view modes).
- `/vouchers` list and the voucher detail drawer.
- `/approvals` list.
- `/banking` list and `/banking/[id]/reconcile` (both panes).
- `/imports` list and `/imports/[id]/review` (the row-edit modal).
- `/collections/payment-links` and create-link-dialog.
- `/collections/recurring` and recurring-schedule-dialog.
- `/practice/clients`, `/practice/tasks`, `/practice/documents`.
- `/reports/trial-balance`, `/reports/profit-and-loss`, `/reports/balance-sheet`, `/reports/general-ledger`, `/reports/customer-sales`, `/reports/item-sales`, `/reports/expenses` (every tab), `/reports/cash-bank-audit` (every tab), `/reports/payables` (every tab).
- `/settings/companies` and company-dialog + branch-dialog.
- `/settings/ledgers` and group-dialog + ledger-dialog.
- `/settings/numbering`.
- `/settings/invoice-branding`.
- `/settings/notifications`.
- `/settings/periods`.
- `/settings/tally`.

For each page: every input visible and typeable, every money number right-aligned with `tabular-nums` and fully readable (never truncated to `₹` or `1,…`), every placeholder visible but not confused with a real value (muted color), every select shows the current selection (not a blank chevron), every column header matches its column data, no `UOM` showing only `N`, no `Rate` showing only `₹`.

4.3 **Add a visual regression check** per page that fails if an input element's rendered width is < 48 px OR if an input's text is horizontally clipped (CSS `scrollWidth > clientWidth` on an input where it shouldn't scroll). Playwright script in `tests/e2e/visibility.spec.ts`. Run on every commit.

4.4 **Number format** rules, applied everywhere a rupee number renders:
- Indian numbering: `₹ 1,23,45,678.90` — not `₹ 12,345,678.90`.
- Negative values: wrapped in parentheses `(₹ 1,000.00)` AND rendered in `text-status-danger-text`. Not just a leading `-`.
- Zero: rendered as `₹ 0.00`, not `—` or blank, unless the row is explicitly "no activity".
- `tabular-nums` always.
- Right-aligned always in tables; right-aligned in forms when they represent money.

4.5 **Select/combobox rendering** — the selected value must be visible in the trigger. Audit all `Select` / `Combobox` usages where the trigger shows only the chevron without the value. Fix each.

**Acceptance:**
- `docs/INPUT_AUDIT.md` lists every originally-broken input + the fix commit SHA.
- `docs/ui-review-v4/screens/` has the full set of light+dark screenshots per page.
- `tests/e2e/visibility.spec.ts` passes on CI.

Commit per logical group (e.g., `fix(ui): visible inputs and tabular numbers across list pages`, `fix(ui): visible inputs across dialogs`, `fix(ui): visible inputs across settings`).

---

## 5. Professional polish checklist (apply to every page you touch)

Treat these as pass/fail, not advice. If you touch a page and any item fails, fix it before committing.

- Exactly one `h1` per page. Every subheading on the page is `h2` / `h3` in correct order.
- One primary action per screen. Never two brand-colored buttons in the same cluster.
- Every money number: right-aligned, `tabular-nums`, Indian comma grouping, visible in full.
- Every date: `25 Nov 2026` default (configurable per user). Never `11/25/2026` ambiguous.
- Every GSTIN and PAN: `font-mono`, uppercase, non-truncated, with a copy-on-click affordance.
- Every input: label above (not placeholder-as-label), helper text below if any, error state inline (not just a toast).
- Every table header: sticky on vertical scroll inside the table.
- Every table row: hover state (`bg-surface-sunken` subtly), click/keyboard focus-visible ring.
- Every empty state: icon + title + description + primary CTA. Never a blank table.
- Every loading state: skeleton, not a bare spinner.
- Every error: inline, with Retry. Never silent.
- Every dropdown/popover: positions correctly in both themes, never overflows the viewport, dismisses on Esc and outside click.
- Every modal/dialog: focus traps inside, focus returns to trigger on close, Esc closes, Enter submits (unless in a textarea).
- Every page: axe-core passes with 0 serious violations in BOTH themes.
- Every page: visual regression under 0.1% diff against the pre-V5 baseline (regressions explained in the commit body, no silent breakage).
- Every page: mobile 390×844 has zero horizontal scroll and all CTAs reachable.

---

## 6. Verification

6.1 For every commit:
- Open the page in headless Playwright at both desktop (1440×900) and mobile (390×844), both themes.
- Screenshot to `docs/ui-review-v4/screens/<page>-<desktop|mobile>-<light|dark>.png`.
- Open the screenshot YOURSELF before claiming done.
- Diff against baseline; any regression is a fix.
- Run axe-core; 0 serious violations required.
- Run `tests/e2e/visibility.spec.ts`; must pass.

6.2 Final deliverable:
- `docs/ui-review-v4/` with screenshots and the three PDF print samples (section 1.6).
- `docs/INPUT_AUDIT.md` closed-out with every hit fixed.
- `TEST_LOG.md` appends a `UI_POLISH_V4` section listing every page re-screenshotted, every input fixed, every acceptance criterion passed with its commit SHA.
- One-minute screencast demonstrating: open `/invoices/new`, switch templates in Preview (three distinct designs appear), type real values into all 7 line-item columns and see them, submit the invoice, open the detail page (3 template options still render distinctly).
- PR into `dev` with every commit SHA and the before/after screenshots inlined for the five numbered symptom categories above.

---

## 7. What you will NOT do

- No codemod, no sed, no automated class rewrites. Hand-edit every file.
- No leaving a cramped column because "the width is technically set" — if the rendered value isn't readable on a 1280-px viewport, the width is wrong.
- No reinventing the three invoice templates — reuse the files that already exist in `app/invoices/[id]/templates/`. Share, don't fork.
- No downsizing the input-audit scope — every page listed in section 4.2 gets both its screenshots and the audit entry.
- No marking Section 1 done without the three preview screenshots showing visibly different templates and the three A4 PDFs saved.
- No merging to `dev` until the user has opened `docs/ui-review-v4/` and said OK.

**Begin. Hand-written, screenshot-verified, section-by-section commits. Don't stop until the three template previews look like three different invoices, every line-item column shows its actual value, every page listed in 4.2 is re-screenshotted clean, and the polish checklist in section 5 passes on every page you touch.**
