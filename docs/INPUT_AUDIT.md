# App-Wide Input & Number Visibility Audit Report (`INPUT_AUDIT.md`)

This audit documents every originally-broken, cramped, or unreadable input/cell across `apps/web`, along with the exact root cause and the architectural fix applied.

---

## 1. Audit Summary & Contract

Every form input, select, and numeric cell in the platform must comply with the following UX contract:
1. **Outer Constraint on Container / TD:** Column widths are set on the table header (`<th>`) and table cell (`<td>`), never relying on uncontrolled flex shrink.
2. **Inner Full Width:** Every `<Input>`, `<Select>`, `<CurrencyInput>`, and `<Combobox>` inside a cell or form grid has `w-full min-w-0`.
3. **Addons Absolute Positioned:** Currency symbols (`₹`) and percentage symbols (`%`) are absolutely positioned inside the input wrapper with explicit padding (`pl-7` for prefix, `pr-6` for suffix), never as flex siblings that steal layout width from numbers.
4. **Minimum Rendered Width:** No rendered input element may have an active width `< 48px`.
5. **No Text Clipping:** Inputs maintain `scrollWidth <= clientWidth` under standard test viewports.
6. **Indian Number Formatting:** All rupee figures format with Indian comma grouping (`₹ 1,23,45,678.90`), negatives in parentheses `(₹ 1,000.00)` in `text-status-danger-text`, zero as `₹ 0.00`, with `tabular-nums` throughout.

---

## 2. Itemized Hits and Fixes

### Hit 1: Line-Item Table on `/invoices/new`
- **Location:** `apps/web/src/app/invoices/new/invoice-line-items.tsx`
- **Symptom:** In Split mode at 1280px, Rate displayed only `₹`, UOM showed only `N`, Qty was blank, Disc% was clipped.
- **Root Cause:** Sibling classes `w-16`, `w-20`, `w-24`, `w-28` without `min-w-0` or explicit pixel constraints on cells.
- **Fix:** Replaced with explicit widths:
  - Item / Service: flex, `min-w-[220px]`, pinned with `sticky left-0 bg-surface z-10`.
  - HSN/SAC: `w-[96px]`, `tabular-nums`.
  - Qty: `w-[72px]`, right-aligned, `tabular-nums`.
  - UOM: `w-[72px]`, Select with standard units (NOS, PCS, KG, LTR, BOX, SET).
  - Rate: `w-[140px]`, right-aligned, `pl-7` absolute `₹` prefix, `tabular-nums`.
  - Disc %: `w-[80px]`, right-aligned, `pr-6` absolute `%` suffix.
  - GST %: `w-[88px]`, right-aligned Select with slabs (0, 5, 12, 18, 28%).
  - Amount: `w-[140px]`, right-aligned, bold, `tabular-nums`.
  - Delete Action: `w-[40px]`, centered.
  - Table minimum width `min-w-[948px]` inside `overflow-x-auto`.
- **Commit SHA:** `a0c2797`

### Hit 2: `CurrencyInput` and `Input` Addon Layout
- **Location:** `packages/ui/src/currency-input.tsx`, `packages/ui/src/input.tsx`
- **Symptom:** Left addon (`₹`) ate input width, causing numbers to truncate in narrow cards and dialogs.
- **Root Cause:** Default `Input` lacked explicit `w-full min-w-0` on `CurrencyInput`, and small inputs had insufficient padding.
- **Fix:** `CurrencyInput` now injects `w-full min-w-0 tabular-nums font-mono text-right` by default. `Input` positions `leftAddon` at `left-2.5` with `pl-7` padding, and `rightAddon` at `right-2.5` with `pr-6` padding.
- **Commit SHA:** `a0c2797`

### Hit 3: `Select` Trigger Text Wrapping
- **Location:** `packages/ui/src/select.tsx`
- **Symptom:** Long option values inside grid columns or table cells wrapped vertically into 2 lines, pushing trigger height and misaligning rows.
- **Root Cause:** `SelectPrimitive.Value` lacked `truncate` and `flex-1`.
- **Fix:** Wrapped `SelectPrimitive.Value` in `<span className="truncate block flex-1 text-left mr-1">`.
- **Commit SHA:** `2dc39dd`

### Hit 4: Plain-English Layout & Party Monospace Chips
- **Location:** `apps/web/src/app/invoices/new/invoice-header-fields.tsx`, `invoice-summary.tsx`, `page.tsx`
- **Symptom:** Numbered corporate section headers (`3. Billable Line Items...`, `4. Statutory Tax...`, `5. Notes...`), side-by-side bottom layout, cramped party information strip.
- **Root Cause:** Legacy numbered fieldsets and paired input/summary rows.
- **Fix:** Replaced with plain-English cards (`Document`, `Party`, `Line Items`, `Notes & Terms`, `Totals`). Bottom layout reflowed to 2 columns (Notes & Terms on left taking full remaining space, Totals on right with `max-w-sm`). Party summary reflowed to 2 lines max with monospace GSTIN, PAN, and state chips with copy-on-click affordance.
- **Commit SHA:** `2dc39dd`

### Hit 5: Import Column Mapping Table
- **Location:** `apps/web/src/app/imports/new/step2-mapping.tsx`
- **Symptom:** Mapping dropdowns were clipped on medium screens.
- **Root Cause:** Table cell lacked a minimum width constraint.
- **Fix:** Added `min-w-[260px]` to TD and `w-full min-w-0` to the `<Select>`.

### Hit 6: Journal Voucher Table Entries
- **Location:** `apps/web/src/app/vouchers/page.tsx`
- **Symptom:** JV entry row had cramped debit/credit indicator and amount field.
- **Root Cause:** `w-24` container for select option `Dr (Debit)` caused truncation.
- **Fix:** Widened type container to `w-28 shrink-0`, added `w-full min-w-0 font-mono text-right text-xs tabular-nums` to Amount input.

### Hit 7: Indian Numbering & Negative Currency Formatting
- **Location:** `packages/ui/src/money-text.tsx`, `packages/ui/src/utils.ts`
- **Symptom:** Inconsistent negative numbers (leading `-` instead of standard accounting parentheses), zero showing as empty dashes.
- **Root Cause:** Default Intl formatter produced `-₹123.00` without statutory parentheses.
- **Fix:** `formatCurrency` uses `en-IN` locale (`₹ 1,23,45,678.90`). Negatives are wrapped in `(₹ ...)` and styled with `text-status-danger-text`. Zero renders as `₹ 0.00`. Tabular numbers applied across all currency spans.

---

## 3. Automated Verification Script

Automated visual regression and input visibility assertions are run via Playwright in:
`tests/e2e/visibility.spec.ts`

This test suite asserts:
1. Every input element across the platform has rendered width $\ge 48\text{px}$.
2. Every input has `scrollWidth <= clientWidth + 2` (no horizontal text clipping).
3. Captures full light and dark mode screenshot baselines to `docs/ui-review-v4/screens/`.
