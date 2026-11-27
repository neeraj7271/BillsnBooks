# 🎨 UI Redesign — Antigravity Books / BillsnBooks (`ux/refresh-v2`)

Audit of the current `apps/web` found a half-built design system (good tokens in `packages/ui/src/tokens.ts`, good `globals.css` CSS variables, good Tailwind wiring) that most pages ignore, hundreds of hardcoded `text-slate-*` / `bg-slate-*` / `dark:*` pairs, duplicated page-shell boilerplate (items 791 lines, invoices 496, companies 413, reports 416), near-zero a11y attributes, missing loading / empty states, no type scale, no tabular-nums for money, and no live preview on the invoice create screen. The backend, API contracts, DB schema, test harness and recently-fixed accounting/RLS code **are not to be touched**. This is a UI refresh only.

**Branch:** create `ux/refresh-v2` off current `dev`. Everything lands here, one PR at the end. All work in one uninterrupted campaign with live `[web] [test]` logs tailed to one terminal, headless Playwright.

**Design direction (study these first, no copying pixels):**
- **Shell + navigation + dashboard:** Zoho Books (SaaS accounting, India-aware).
- **Invoice create screen:** QuickBooks Online (split form + live preview).
- **Report pages:** Xero (sticky header, drill-down, consistent action cluster).
- **GST/import flows:** ClearTax (inline per-row validation + fix buttons).
- **Practice module (`/practice/*`):** Karbon (task triage, client folders) + TaxDome (document portal).
- **Density target:** one notch tighter than Zoho, looser than Tally. Compact-by-default with a Comfortable toggle in user settings.

---

## 0. Rules

1. **Backend is frozen.** Not one line of `apps/api/**`, `packages/accounting-core/**`, `packages/gst-rules/**`, migrations, or seed data changes. Not one API contract shape changes. If you need a new field, write a note in `UI_REDESIGN_LOG.md` and work around it in the UI.
2. **One PR, feature-by-feature inside.** Work the sections below in order. Each section ends with a commit; the final commit opens the PR.
3. **Semantic tokens only.** No `text-slate-*`, `bg-slate-*`, `text-blue-*`, `bg-rose-*` etc. in `apps/web/src/app/**` or `apps/web/src/components/**`. Use `text-primary`, `text-secondary`, `text-muted`, `bg-surface`, `bg-surface-raised`, `border-subtle`, `border-default`, `bg-brand`, `text-brand-text`, `bg-status-success-subtle`, `text-status-success-text`, etc. (already defined in `tailwind.config.js` via CSS vars). Add an ESLint rule that fails the build on raw palette use.
4. **Headless Playwright** on every change. Visual regression snapshot per page × light/dark × desktop/mobile against baselines captured on the first green run.
5. **No downsizing counts, no faking passes, no bypassing the UI.** The same honesty rules as the previous campaign.
6. **Docs log** at `docs/UI_REDESIGN_LOG.md` — one row per section with what changed, screenshots-before/after paths, and the commit SHA.

---

## 1. Finish the design system (must happen before any page changes)

1.1 **Type scale.** Load Inter via `next/font` with `display: swap`, plus JetBrains Mono (or Geist Mono) for numbers. Extend Tailwind with a single explicit type scale and use it everywhere afterwards:
   - `display`: 32/40/−0.02em
   - `h1`: 24/32/−0.015em
   - `h2`: 20/28/−0.01em
   - `h3`: 16/24/−0.005em
   - `body`: 14/20
   - `body-sm`: 13/18
   - `caption`: 12/16
   - `mono`: 13/18 `tabular-nums`

1.2 **Spacing scale.** Keep the existing 4/8/12/16/20/24/32/40/48/64 ladder from `tokens.ts`; nothing in-between.

1.3 **Radius.** `sm 6`, `md 8`, `lg 12`, `xl 16`. Pick one per surface (card = `xl`, input = `md`, button = `lg`, badge = `full`); pages must not override.

1.4 **Elevation.** Three shadows only: `shadow-xs` (resting card), `shadow-md` (dropdown / popover), `shadow-lg` (modal). No ad-hoc shadows.

1.5 **Semantic tokens.** Keep the current CSS var set in `globals.css`. Add tokens the audit showed were missing: `--color-text-strong` (table headers), `--color-row-hover`, `--color-row-stripe`, `--color-focus-ring`, `--color-skeleton`. Ship both light and dark values. Regenerate `tailwind.config.js` so every token is a class.

1.6 **Density modes.** The two modes (`compact` / `comfortable`) are in `tokens.ts` but unused. Expose them as a user preference persisted in `localStorage` and a CSS data attribute on `<html>` (`data-density="compact"`). Default to `compact` for new users. Every primitive reads the active density.

1.7 **`MoneyText` hardening.** Add `font-variant-numeric: tabular-nums`, right-align in table cells by default, and a `negative` prop that renders red + parens.

1.8 **`DateText` hardening.** Expose variants: `short` (`25 Nov 26`), `long` (`25 November 2026`), `relative` (`2 days ago`); default is `short`.

1.9 **Primitives audit.** Open each file in `packages/ui/src`, remove any hardcoded `slate-*` / `blue-*`, replace with tokens, and add Storybook-free docs: create `packages/ui/src/__docs__/<primitive>.docs.tsx` that renders every variant in light + dark + compact + comfortable so you can snapshot them.

1.10 **ESLint rule.** Add a local lint rule (or a `grep` check in CI) that fails the build if any file under `apps/web/src/` uses `slate-`, `zinc-`, `gray-`, `blue-`, `rose-`, `emerald-`, `indigo-`, `amber-`, `orange-`, `sky-`, `violet-`, `purple-` as a Tailwind color token. Brand/status colors must come from the semantic set.

1.11 **Codemod.** Write a one-shot codemod (jscodeshift or a Python script with regex) that converts the ~500 known offenders (`text-slate-900` → `text-primary`, `text-slate-500` → `text-muted`, `bg-slate-50` → `bg-surface-sunken`, etc.) across `apps/web/src/**/*.tsx`. Run it, review the diff, fix the handful it got wrong, commit.

Commit: `refactor(ui): lock design tokens, type scale, density modes, semantic token codemod`.

---

## 2. Shared page shells (kill the 40% boilerplate)

Add these primitives to `packages/ui/src` and rewrite every list / detail / form page to use them:

2.1 **`PageHeader`** — title + optional subtitle + action cluster on the right. Breadcrumb slot above.

2.2 **`Toolbar`** — search box + filters + bulk-select actions + primary action (e.g., "New Invoice"). Collapses to a drawer on mobile.

2.3 **`ListPage`** — composes `PageHeader` + `Toolbar` + `DataTable` + `Pagination` + `EmptyState`. Takes a `query` function (React Query) and renders skeletons while loading, an empty state when done with 0 rows, and the table otherwise.

2.4 **`DetailPage`** — two-column grid (details on left, side actions on right) with a sticky action bar at the bottom on mobile.

2.5 **`FormPage`** — a form shell with title, description, grouped fieldsets, inline validation, sticky Save/Cancel footer, and dirty-guard on navigation.

2.6 **`EmptyState`** — illustration slot + title + description + primary CTA. One shared component, used everywhere.

2.7 **`LoadingState`** — skeleton row for tables, skeleton card for grids, spinner only for inline actions. No bare "Loading..." text anywhere.

2.8 **`ErrorState`** — a shared boundary showing `title` + `description` + `Retry` + `Report` (which copies the error context to the clipboard). Wraps every page.

Rewrite every page in `apps/web/src/app` to use these. This is the biggest-LOC-delta commit; the audit said items/page is 791 lines — target is under 220.

Commit: `refactor(ui): shared PageHeader / Toolbar / ListPage / FormPage / DetailPage shells`.

---

## 3. Shell refresh — sidebar, top bar, command palette

3.1 **Sidebar labels.** Plain-English pass:
   - "Overview Cockpit" → "Home"
   - "Tax Invoices" → "Invoices"
   - "Approval Inbox" → "Approvals"
   - "Customers & Vendors" → "Parties"
   - "Items & Products" → "Items"
   - "Bulk Import Register" → "Imports"
   - "Vouchers & Journals" → "Vouchers"
   - "Banking & BRS" → "Banking"
   - "Sales Discovery" → "Discovery"
   - "AR Ageing Analysis" → "Ageing"
   - "Recurring Schedules" → "Recurring"
   - "Payment Links & Settl." → "Payment Links"
   - "Client Directory" → "Clients"
   - "Compliance Tasks" → "Tasks"
   - "Statutory Calendar" → "Calendar"
   - "Client Documents" → "Documents"
   - "All Reports Hub" → "Reports"
   - "Trial Balance" → "Trial Balance" (keep)
   - "Profit & Loss (P&L)" → "P&L"
   - "Month-End Period Locks" → "Period Locks"
   - "Global System Settings" → "Settings"
   - "Chart of Accounts" → "Chart of Accounts" (keep)
   - "Companies & Branches" → "Companies"
   - "Invoice & Branding" → "Branding"
   - "Document Numbering" → "Numbering"
   - "Notifications & Alerts" → "Notifications"
   - "Tally Prime Bridge" → "Tally"

3.2 **Sidebar structure.** Two modes stay (Invoicing-only / Full). In Full mode, group as:
   - **Sales** (Home, Invoices, Approvals, Parties, Items, Imports)
   - **Money** (Vouchers, Banking, Discovery, Payment Links, Ageing, Recurring)
   - **Reports** (Reports hub + the 9 named reports)
   - **Practice** (Clients, Tasks, Calendar, Documents)
   - **Setup** (Settings, Chart of Accounts, Companies, Branding, Numbering, Notifications, Period Locks, Tally)

3.3 **Active state** — brand accent bar on the left of the item + subtle brand-subtle background, no full-color fill. Icon + label swap to `text-brand-text` when active.

3.4 **Collapsed sidebar** — icons only, tooltip on hover. Sections collapse to a divider.

3.5 **Top bar** — reorder: company switcher (primary, wider), separator, breadcrumb/page title, right side `⌘K Search`, Notifications, Theme toggle, User menu. Drop the "Tally online" dot from the top bar; move it into Settings → Tally status chip.

3.6 **Company switcher** — show company legal name + PAN (NOT the raw GSTIN which is long); on hover reveal the active branch + state. Keyboard searchable with `⌘⇧C` shortcut.

3.7 **Command palette (`⌘K`)** — already exists, polish: group results as "Jump to…", "Create…", "Recently viewed…", with per-group separator. Add fuzzy matching on Hindi party-name transliterations.

3.8 **Breadcrumb** — rendered inline in the top bar on desktop, hidden on mobile. Deepest segment is the page title.

Commit: `feat(ui): refresh sidebar labels, top bar, command palette grouping`.

---

## 4. Dashboard (`app/page.tsx`)

Benchmark Zoho Books. Replace the current connector-only cards with:

- **KPI row (4 cards):** This month's revenue, Outstanding AR, Overdue > 30 days, Cash position. Each with a sparkline (use the existing `Progress` primitive or add a tiny SVG sparkline — don't add a chart lib).
- **Receivables & payables split:** two columns, 0–30 / 31–60 / 61–90 / 90+ ageing buckets with click-through to `/collections/ageing`.
- **Recent invoices (10):** compact table, click-through to detail.
- **Approvals pending:** list of up to 5 with inline Approve/Reject buttons (FIRM_PARTNER only).
- **Period status:** current FY, which periods are locked/open, one-click to lock.
- **System health:** Tally bridge, Outbox depth, Payment webhook last-seen — collapsed by default.

Mobile: stacks vertically, KPI cards 2-wide.

Commit: `feat(ui): dashboard redesign — KPIs, ageing, recent activity`.

---

## 5. Invoice create (`app/invoices/new/page.tsx`)

Benchmark QuickBooks Online. Split-pane layout:

- **Left (55%):** the form — party select, date, place of supply, line items (sticky header row, inline add/remove, keyboard shortcuts `Alt+N` add row / `Alt+D` delete), totals block pinned at the bottom.
- **Right (45%):** live PDF preview that updates on blur. Template switcher as a segmented control above it (`Minimal` / `Modern` / `Tally`). "Download PDF" / "Print" / "Save as draft" / "Submit for approval" buttons under the preview.
- **Keyboard**: `⌘S` save, `⌘Return` submit, `Esc` discard with confirm.
- **Mobile**: preview collapses behind a "Preview" button in the toolbar.

Line item table: columns are `Item (combobox with 5000-item typeahead, already fixed) / HSN / Qty / Rate / Disc% / GST% / Amount`. Selected item fills HSN + Rate + GST from the item master. Running line total appears right-aligned in `tabular-nums`.

Commit: `feat(invoice): split form + live preview, keyboard shortcuts, template switcher`.

---

## 6. Invoice detail (`app/invoices/[id]/page.tsx`)

Benchmark Xero invoice view.

- **Top bar:** invoice number + status badge, action cluster on the right (Edit / Duplicate / Print / Download / Share / Cancel).
- **Left column (60%):** preview of the selected template inline, same three templates as section 5.
- **Right column (40%):** party card, dates, totals, GST breakdown, payment status, promise-to-pay history, linked voucher (click → vouchers page), audit log timeline.
- Status badges: `Draft` (neutral), `Submitted` (info), `Approved` (success), `Rejected` (danger), `Cancelled` (muted).

Commit: `feat(invoice): detail page redesign — preview + sidebar, audit timeline`.

---

## 7. Report pages (every one of the 9 routes + catalog)

Benchmark Xero. One shared `ReportPage` component composes:

- **`PageHeader`** with report title + description + date-range picker + "Export" split button (Excel / PDF / HTML / Share Link).
- **Sticky column headers** on the table (all 28 reports).
- **Tabular-nums** for all numeric columns.
- **Drill-down rows** — click a party / ledger / item in a row to open the related detail page.
- **Favorites** — star button top-left, persists per user.
- **Compare mode** — add a "Compare to previous period" toggle; adds an extra column with the previous-period figure and % change.
- **Empty state** when no data for the selected range (don't just show a blank table).

Report pages to rewrite: `/reports`, `/reports/trial-balance`, `/reports/profit-and-loss`, `/reports/balance-sheet`, `/reports/general-ledger`, `/reports/customer-sales`, `/reports/item-sales`, `/reports/expenses`, `/reports/cash-bank-audit`, `/reports/payables`, plus the shared-token view `/reports/shared/[token]`.

Commit: `feat(reports): unified report page shell with sticky headers, drill-down, compare mode`.

---

## 8. Masters — parties, items, vouchers, banking

8.1 **`/parties`** — `ListPage` rewrite. Columns: Code / Name / Type (badge) / GSTIN / Balance (money) / Last Activity (relative). Filters: type, state, has-GSTIN. Bulk actions: export, mark inactive.

8.2 **`/items`** (currently 791 lines → target 220) — `ListPage` rewrite. Columns: Code / Name / HSN / UOM / GST% / Price. Filters: type (goods/service), GST slab, has-cess. Bulk actions: export, price update.

8.3 **`/vouchers`** — `ListPage`. Columns: Number / Date / Type / Narration / Dr / Cr. Expandable rows show journal entries inline. Filter by type, date range, ledger involved.

8.4 **`/banking`** — card per bank account with current balance, last-reconciled date, unreconciled count. Click into `/banking/[id]/reconcile` which gets a two-pane layout: statement rows on the left, matched vouchers on the right, suggestions in the middle.

Commit: `feat(masters): parties/items/vouchers/banking as ListPage with shared toolbar`.

---

## 9. Dialogs — standardize all 28

For every dialog (see the earlier audit's enumerated list), standardize:
- Title + optional description at the top, single row of close/help on the right.
- Form body with the same input spacing as `FormPage`.
- Footer: Cancel (ghost) + Primary action (brand) right-aligned.
- Keyboard: `Esc` closes, `Enter` submits (unless focus is in a textarea), `⌘S` saves, dirty-guard confirmation.
- Focus trap, focus returns to trigger on close.
- Max width scales: `sm 400`, `md 560`, `lg 760`, `xl 960`, `full` — pick per dialog, don't invent new widths.

Commit: `refactor(dialogs): standardize 28 dialogs on shared Dialog primitive`.

---

## 10. Settings

10.1 **`/settings`** — card grid with section cards (Companies, Branding, Numbering, Notifications, Periods, Tally, Chart of Accounts, Users-when-added). Each card shows the section's current state in one line.

10.2 **`/settings/invoice-branding`** — three-panel layout: logo/signature uploads on the left, template picker in the middle, live preview on the right. Keep the current base64-in-DB behaviour (noted as a P1 architectural finding, not a UI change).

10.3 **`/settings/companies`** — company list with branch chips; click a company opens a slide-over with company + branch edit.

10.4 **`/settings/ledgers`** — tree view on the left, selected ledger detail on the right, inline add-child button on each group.

10.5 **`/settings/notifications`** — grouped toggle switches with test-send buttons.

10.6 **`/settings/periods`** — timeline view of the FY with locked/open segments, lock-and-unlock with a confirm dialog (FIRM_PARTNER only — button disabled for STAFF_ACCOUNTANT with a tooltip explaining why).

10.7 **`/settings/tally`** — connector status card, token display + regenerate, preview envelope button, recent sync log.

Commit: `feat(settings): redesign hub, branding preview, ledger tree, period timeline`.

---

## 11. Practice module

11.1 **`/practice/clients`** — Karbon-style grid of client cards: logo, name, PAN, open tasks count, pending documents, last activity. Filter by status, assigned staff.

11.2 **`/practice/tasks`** — Kanban columns (Backlog / In Progress / Review / Done) with task cards (title, client, due date chip, owner avatar). Drag to move. Filter by owner / client / due date.

11.3 **`/practice/calendar`** — month grid with statutory due dates highlighted (GSTR-1 10th, GSTR-3B 20th, TDS 7th, etc.). Click a date to see tasks due that day.

11.4 **`/practice/documents`** — TaxDome-style list: pending requests at the top, completed below. Each request has client, type, status, download button.

Commit: `feat(practice): clients/tasks/calendar/documents Karbon-style refresh`.

---

## 12. A11y pass

- Every icon-only button gets `aria-label`.
- Every input gets a visible `<label>` or `aria-label`.
- Focus-visible ring everywhere (via `--color-focus-ring`), never `outline: none` without replacement.
- Dialog focus trap + focus-return on close.
- `aria-live="polite"` region for toasts.
- Skip-to-content link in `AppShell`.
- Semantic headings (`<h1>` once per page, no heading-level jumps).
- Keyboard-only navigation works on every page (tab through, Enter/Space activates).
- Axe-core run in Playwright on every page — must pass with 0 serious violations.

Commit: `fix(a11y): labels, focus rings, focus traps, axe-core green on every page`.

---

## 13. Loading, empty, error states — every page

- Every list page shows skeleton rows (3–5) while loading.
- Every list page shows `EmptyState` with a primary CTA when the query returns 0 rows (not when filters hide rows — that gets a different "No matches" variant).
- Every page is wrapped in `ErrorState` boundary that catches render errors and API 5xx.
- No bare `"Loading..."` text anywhere. No blank `<div />` while waiting.

Commit: `feat(ui): loading + empty + error states on every page`.

---

## 14. Mobile pass

- Every page tested at 390×844 and 360×800, zero horizontal scroll.
- Sidebar → drawer behind the hamburger.
- Toolbars collapse: search stays, filters move into a bottom-sheet.
- Tables → cards on narrow viewports, or horizontal scroll with sticky first column.
- Sticky action bars at the bottom of forms and detail pages (instead of scrolling to find the Save button).
- Touch targets ≥ 44 px.

Commit: `feat(ui): mobile responsive pass, drawer menu, filter bottom sheets, sticky actions`.

---

## 15. Theming polish

- Dark mode: no hardcoded `dark:*` variants in pages. All contrast comes from semantic tokens. Dark mode screenshot per page matches light mode in information density.
- `prefers-color-scheme` respected by default, user override wins and is persisted.
- Print styles reviewed — invoice templates must print cleanly on A4 with no shell chrome.

Commit: `fix(ui): dark mode via tokens only, prefers-color-scheme, print pass`.

---

## 16. Component docs

Build a `/docs/components` route (dev-only, behind an env flag) that lists every `@platform/ui` primitive with every variant rendered in light + dark + compact + comfortable. This is the designer's single source of truth. Use it for visual regression baselines.

Commit: `docs(ui): primitives catalogue at /docs/components`.

---

## 17. Evidence & deliverables

- `UI_REDESIGN_LOG.md` — one row per section with before/after screenshots paths, bytes-saved per rewritten page, and commit SHA.
- Playwright visual regression report — every page, every theme, every viewport, diffed against the pre-refresh baseline you snapshot on the very first commit of this branch.
- Lighthouse score per page — target Accessibility ≥ 95, Best Practices ≥ 95, Performance ≥ 85.
- Short screencast (≤ 2 min) walking through the new shell → dashboard → invoice create → report export → logo upload.
- Open PR into `dev` with every commit SHA, every section complete, before/after screenshots inline.

**Do not stop until every section is green, every page is on the shared shells, every `slate-` / raw-palette instance under `apps/web/src/**` is replaced, every page has loading + empty + error states, every page is mobile-clean, and axe-core is green everywhere. No downsizing, no bypassing, no fake passes. Live logs stream throughout.**
