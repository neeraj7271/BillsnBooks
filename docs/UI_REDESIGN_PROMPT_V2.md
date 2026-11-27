# 🚨 UI Redesign V2 — Fix the broken codemod, then apply real UI/UX principles

The previous redesign campaign (`ux/refresh-v2`) is **not acceptable**. The user reports input text is invisible, cards and dialogs show inverted colors, themes are mixed within the same page, and the overall result is unprofessional. The root cause is a broken codemod that appended semantic token classes WITHOUT removing the originals, producing conflicting class pairs in every primitive.

**You will not ship anything else on `ux/refresh-v2` until the following are fixed on branch `ux/refresh-v3` (branched from the commit BEFORE the codemod ran — identify it in `git log`; if you can't, branch from `dev` and re-port the audit log, screencast and other non-codemod deliverables file-by-file).**

---

## 0. The exact bugs you must fix (do not interpret, do not negotiate)

Verified in this session, in `packages/ui/src/*` and `apps/web/src/**/*.tsx`:

### Bug 1 — Conflicting class pairs (the "invisible text" bug)

Every one of these token pairs appears together in the same `className` string. Tailwind's last-class-wins rule means the second class silently defeats the first.

- `text-primary text-primary-inverse` → renders white text because `-inverse` wins. On a white `bg-surface` that is invisible. Files: `alert-dialog.tsx`, `data-table.tsx`, `card.tsx`, `alert.tsx`, `combobox.tsx`, `switch.tsx`, `dialog.tsx`, `select.tsx`, `input.tsx`, `dropdown-menu.tsx`, `button.tsx`, `tabs.tsx`, `badge.tsx`, plus app pages `apps/web/src/app/settings/ledgers/page.tsx`, `apps/web/src/app/settings/tally/page.tsx` and more.
- `bg-white bg-surface` → same source-order issue. Files above + `apps/web/src/app/settings/numbering/page.tsx`.
- `border border border-strong` and `border border bg-white` → the `border` utility duplicated 2–3 times in the same string.
- `border-status-danger border-status-danger`, `text-status-danger-text text-status-danger-text` → duplicated as a pair.
- `bg-status-danger-subtle bg-status-danger` → two different backgrounds in one class list.
- `hover:bg-surface-sunken hover:bg-surface-raised` → two hover backgrounds, the second wins.
- `text-secondary text-primary-inverse` (combobox) and `text-muted hover:text-primary hover:text-primary-inverse` (button ghost) — same pattern across variant lists.

### Bug 2 — `text-primary-inverse` is misused as "the dark-mode variant of text-primary"

It is NOT. The token `--color-text-inverse` is the text color that goes on top of inverse surfaces (brand-colored buttons, dark pills). It is white in light mode and near-black in dark mode. Using it in a `className` string next to `text-primary` is a bug in every single place it appears except inside an actual inverse surface.

### Bug 3 — Codemod residue in `packages/ui/src/*` variant lists

Button variants now contain fragments like:
`'bg-surface-sunken text-primary hover:bg-surface-sunken active:bg-surface-sunken focus-visible:ring-border-focus bg-surface-raised text-primary-inverse hover:bg-surface-raised'`

That reads as two variants concatenated together instead of one coherent variant. Rewrite every variant from scratch (section 2 below tells you the rules).

### Bug 4 — The ESLint rule that was added did not catch any of this

Because it only banned raw palette (`slate-*`, `blue-*`, …). It did not detect conflicting Tailwind utilities. You will add a second check that specifically detects:
- two text-color classes in one string
- two background-color classes in one string (excluding hover/focus/active variants)
- duplicate utility classes (e.g., `border border`)
- `-inverse` text/bg classes used outside of a surface declared as an inverse element

This runs in CI and blocks the build.

### Bug 5 — Themes mixed on the same page

Mostly a symptom of Bug 1. Some components defaulted to the lighter of the conflicting classes, some to the darker. Once Bug 1 is fixed, verify with a side-by-side screenshot of every page in light mode and every page in dark mode — nothing between those two canonical states.

---

## 1. Revert, don't patch

Do NOT try to fix the codemod residue by adding more classes. The only safe path:

1. `git checkout ux/refresh-v3`.
2. Hand-rewrite every file in `packages/ui/src/*.tsx` from scratch using the rules in section 2. Do not run any codemod, grep-replace or sed on them.
3. Hand-rewrite every file in `apps/web/src/app/**` and `apps/web/src/components/**` that currently contains any of the Bug 1 patterns. Grep-find them, open each, delete the offending class pairs, replace with the ONE correct token per CSS property.
4. Lock it down with the Bug 4 ESLint rule before committing.
5. Visual-regression every page in both themes against the Zoho Books / QuickBooks / Xero reference screenshots you captured in the previous campaign.

Commit: `revert(ui): rewrite primitives and pages without conflicting class pairs`.

---

## 2. The design token rules (memorize these)

**Each visible CSS property gets EXACTLY ONE class per responsive/state scope.**

For a given element, you may use at most one each of:
- one background utility in the base state (e.g. `bg-surface`), optionally one `hover:bg-*`, one `focus:bg-*`, one `active:bg-*`, one `dark:bg-*` if you are NOT using CSS-variable tokens (you ARE, so you don't need `dark:bg-*`).
- one text color utility in the base state (e.g. `text-primary`), similarly scoped variants.
- one border color (e.g. `border-default`).
- one border utility (`border`) — not three.

Because the token layer (CSS variables in `globals.css`) already changes value between light and dark via the `.dark` class, you DO NOT need `dark:bg-*` or `dark:text-*` on anything that uses a semantic token. The dark variant is automatic. Any `dark:` prefix in the codebase that targets a semantic token is noise — delete it.

**The canonical token set to use** (defined in `tailwind.config.js` + `globals.css`):

Surfaces (background):
- `bg-canvas` — the outermost app background.
- `bg-surface` — default card / input / dialog background.
- `bg-surface-raised` — elevated card (dashboard KPI tile, popover).
- `bg-surface-sunken` — recessed area (toolbar, sidebar section header, striped row).
- `bg-surface-overlay` — modal backdrop.
- `bg-brand`, `bg-brand-subtle` — brand primary and tinted.
- `bg-status-success-subtle`, `bg-status-warning-subtle`, `bg-status-danger-subtle`, `bg-status-info-subtle` — status pill backgrounds.

Text:
- `text-primary` — the main text color (dark on light, light on dark).
- `text-secondary` — supporting text, labels.
- `text-muted` — placeholder, helper text, timestamps.
- `text-inverse` — text that sits on top of a brand/dark surface (white button text).
- `text-brand-text` — brand-colored text on neutral surfaces (links, active sidebar item).
- `text-status-success-text`, `text-status-warning-text`, `text-status-danger-text`, `text-status-info-text` — matching status text.

Borders:
- `border-subtle` — the faintest separator.
- `border-default` — default border, inputs/cards.
- `border-strong` — emphasized border, hovered inputs.
- `border-focus` — focus ring color.

Never put `text-primary` and `text-inverse` in the same `className` string. Period.

---

## 3. UI/UX design principles you will follow

Treat these as acceptance criteria, not suggestions. Every page gets reviewed against this list before you mark it complete.

### 3.1 Contrast (WCAG AA minimum)

- Body text against its background: contrast ratio ≥ 4.5:1.
- Large text (≥ 18 pt or ≥ 14 pt bold) against background: ≥ 3:1.
- UI components (input borders, icon buttons) against adjacent colors: ≥ 3:1.
- Placeholder text against input background: ≥ 3:1 (yours currently fails because `text-muted` on `bg-surface` is close to the floor).
- Run `axe-core` AND a custom contrast scan (there are npm scripts) on every page in light and dark. Zero `serious` violations before you call a page done.

### 3.2 Visual hierarchy

- Exactly one `h1` per page, placed in the `PageHeader`.
- The next heading on the page is `h2`. Don't skip from `h1` to `h3`.
- Primary action per screen: one brand-colored button. If you need a second action, it's secondary (outline) or ghost. Never two brand-colored buttons side by side.
- Destructive actions are `variant="danger"` and never the default. Confirmation dialog required.
- Related information is grouped visually (card or titled fieldset). Unrelated things are separated by spacing or a divider, never just color.

### 3.3 Spacing and rhythm

- Use ONLY the 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 ladder from `tokens.ts`. Nothing in between. If you reach for `p-3.5` or `gap-7`, stop and pick from the ladder.
- Vertical rhythm on a form: 24 px between field groups, 16 px between field and field within a group, 8 px between label and input, 6 px between input and helper text.
- Table row height: 44 px in comfortable density, 36 px in compact. Cell padding `py-3 px-4` (comfortable) or `py-1.5 px-3` (compact).
- Page outer padding: `px-6 py-6` on desktop, `px-4 py-4` on mobile. Nothing wider than `max-w-7xl` for a content column.

### 3.4 Typography

- Use the Inter family (loaded via `next/font`), with weights 400 / 500 / 600 / 700.
- Mono font: JetBrains Mono (loaded via `next/font`) for GSTINs, PANs, invoice numbers, amounts, dates in tables.
- Type scale is the one defined in `tokens.ts` — do not invent sizes. If you want a size that isn't on the scale, your layout is wrong.
- Numbers: always `font-variant-numeric: tabular-nums` (`.tabular-nums` utility). Always right-aligned in tables.
- Line-height: 1.5 for body, 1.3 for headings, 1 for numbers in dense tables.
- No all-caps outside of small badges and table headers. Use `tracking-wide` only on all-caps.

### 3.5 Color use

- Color never carries meaning by itself. Any status indicator must also have an icon or text (badge with "Approved" word, not a bare green dot).
- Only four status colors: success (emerald), warning (amber), danger (rose), info (sky). Already in the token set. Pick one; do not mix.
- The brand color is used sparingly: primary buttons, active sidebar item, link text, selected tab underline, focus ring. Everywhere else is neutral.
- Backgrounds within the same page should not vary beyond two surface levels (`bg-surface` and either `bg-canvas` or `bg-surface-raised`).

### 3.6 Alignment and grid

- One alignment per column in a table (text left, money right, status center).
- Form labels are left-aligned above their input, not beside it (except in a compact density mode that can use the side layout — but the whole form must use one style, not mix).
- Icons inside buttons: 16 px, aligned with text baseline. 20 px for toolbar icons. 14 px for inline-table icons.
- Consistent corner radius per surface: cards 16 px, inputs/buttons 10 px, badges 6 px or full, popovers 12 px. Never mix on the same screen.

### 3.7 Affordance and feedback

- Every interactive element has a visible hover state (background or border change).
- Every interactive element has a visible `focus-visible` ring (2 px, `--color-border-focus`, 2 px offset). Never `outline: none` without a replacement.
- Clickable things look clickable: buttons have a filled or outlined shape, links are the brand color and underline on hover.
- Loading: show an inline spinner on the button that triggered the action. Disable it so the action can't fire twice. Show a skeleton on the area that will receive data.
- Success: brief toast (3 s), top-right, success color, with the action verb in past tense ("Invoice created").
- Error: toast red, longer (5 s), with a "Retry" or "Undo" if applicable. Never swallow an error silently.
- Destructive confirmation dialog: title says what will be deleted, confirm button is red and reads "Delete X", cancel is neutral.

### 3.8 States you must design for

Every list / form / detail page handles all of:
- Loading (skeleton, not spinner-only).
- Empty (illustration + title + description + primary CTA).
- Empty-after-filter ("No matches" + "Clear filters" button).
- Error (title + description + Retry + Report).
- Partial (some items loaded, more coming — pagination or infinite scroll).
- Permission denied (gentle page saying what role is required).

### 3.9 Keyboard

- Every action reachable via keyboard.
- Dialog: focus traps inside, `Esc` closes, focus returns to the trigger on close.
- Form: `Enter` submits unless focus is in a `<textarea>`, `Esc` discards with a dirty-guard confirm.
- Lists: `↑/↓` moves selection, `Enter` opens, `Delete` initiates delete-with-confirm.
- Global: `⌘K` command palette, `g` then a letter navigates (g then i → `/invoices`), `?` opens the shortcuts help sheet.

### 3.10 Motion

- Transitions ≤ 200 ms. Easing: `ease-out` on enter, `ease-in` on exit.
- No motion on page loads (just render). Motion on state change (hover, focus, menu open) only.
- Respect `prefers-reduced-motion`: disable all transforms and fades when set.

### 3.11 Mobile

- 390 × 844 minimum. Tables become card lists OR gain a sticky first column with horizontal scroll (not both).
- Primary action moves to a sticky bottom bar on mobile.
- Nav is a drawer behind a 44 × 44 px hamburger.
- No hover-only affordances (hover doesn't exist on touch).
- Tap targets ≥ 44 × 44 px with ≥ 8 px gap.

### 3.12 Print (invoices and reports)

- A4 portrait, 15 mm margins.
- No app chrome, no shell, no buttons.
- Black on white, grayscale status badges (no color ink required).
- Amounts right-aligned, `tabular-nums`, with a thousands separator per Indian numbering convention (₹ 1,23,456.00 — note the lakhs/crores grouping, NOT Western `123,456`).

### 3.13 Indian accounting specifics

- Dates in the UI: `25 Nov 2026` by default, never `11/25/2026`. Allow user preference for `25/11/2026`.
- Money: Indian numbering (₹ 1,23,45,678.90), with `tabular-nums` and `₹` as a text symbol, not an emoji.
- FY labels: `FY 2026-27` (hyphen, two-digit year on the right).
- GSTIN: display in mono, with a non-breaking space between the state code and the PAN-derived segment: `27 AAACP0012A 1ZS` for readability (optional).
- PAN: mono, uppercase only, 10 characters, never redacted in the UI unless the role lacks permission.
- State codes: show the state name alongside (2-letter numeric code is ambiguous to non-accountants).

---

## 4. Shell, dashboard, invoice create, reports (re-review these three specific pages)

The user explicitly said the result is not modern. Benchmark these three pages pixel-by-pixel against the reference screenshots you already captured. The acceptance test for each is the visual-regression diff score against the reference AND the design-principle checklist above.

### 4.1 Shell (sidebar + top bar) — Zoho Books benchmark

- Sidebar: 260 px wide expanded, 60 px collapsed. White/surface background, no border on the right in light mode (a subtle `border-subtle` only). Sections with uppercase 11 px tracking-wide labels in `text-muted`. Items 36 px tall, 12 px padding, rounded 8 px. Active item: brand-subtle background + 3 px brand accent bar on the left, `text-brand-text`.
- Top bar: 56 px tall. Logo left (28 px), company switcher next (max 240 px, truncates with ellipsis), breadcrumb middle (desktop only). Right: ⌘K search (ghost button with chip), bell with count, theme toggle, avatar menu.
- Shadows: sidebar none, top bar `shadow-xs` only.
- No dark-mode-specific hacks on either shell — they must look identical in structure between themes, only colors swap.

### 4.2 Dashboard — Zoho Books + Xero benchmark

- Hero row: 4 KPI cards in a 1 × 4 grid (desktop), each 160 px tall. KPI label top (11 px uppercase muted), big number center (28 px bold `tabular-nums`), delta chip bottom right (green ↑ or red ↓), sparkline occupying the right half.
- Second row: 2-column: Receivables ageing bars on the left, Payables ageing on the right. Horizontal bar per bucket (0-30 / 31-60 / 61-90 / 90+). Click a bar → `/collections/ageing` with that filter applied.
- Third row: Recent invoices (10 rows, compact table) and Pending approvals (5 rows with inline Approve/Reject for FIRM_PARTNER).
- Fourth row: Period status timeline + system health collapsible.

### 4.3 Invoice create — QuickBooks benchmark

- Split 55 / 45. Left is the form, right is the live PDF preview with a template switcher segmented control at the top.
- Form sections (titled fieldsets): Party & Dates, Line Items (table with sticky header), Totals & Tax, Notes.
- Totals block floats at the bottom-right of the form column, pinned so it stays visible while scrolling line items.
- Save/Submit buttons sticky at the bottom of the viewport on both desktop and mobile.
- ⌘S saves, ⌘Return submits for approval, Esc discards with confirm.
- Line-item table: 7 columns (Item / HSN / Qty / Rate / Disc% / GST% / Amount). Item column uses the Combobox with typeahead on 5000-item master. Rate and Amount tabular-nums. Add row = Alt+N, delete row = Alt+D.

### 4.4 Reports — Xero benchmark

- One shared `ReportPage` component (already specified in V1 prompt).
- Sticky header row.
- Numbers right-aligned, `tabular-nums`.
- Drill-down on every party/ledger/item cell.
- Export split-button in the page header, not inline.
- "Compare to previous period" toggle adds a second numeric column with % delta.

---

## 5. Verification protocol (none of this is optional)

For every change, before committing:

1. **Visual sweep.** Open the page in Chromium (headless Playwright), in BOTH light and dark mode, at desktop (1440 × 900) AND mobile (390 × 844). Screenshot. Open the screenshot yourself (don't just save it). If anything looks wrong — invisible text, mismatched theme, broken layout, two primary buttons, invisible placeholder — fix it before moving on.

2. **Automated contrast check.** Run `axe-core` with contrast rules enabled. Zero serious violations. Attach the report to `UI_REDESIGN_LOG_V2.md`.

3. **Class-conflict scan.** Grep the diff for the Bug 1 patterns:
   ```
   text-primary.*text-primary-inverse
   text-primary-inverse.*text-primary
   bg-white.*bg-surface
   bg-surface.*bg-white
   border border border
   border-default.*border-default
   ```
   Zero hits. Any hit → stop and fix.

4. **No `dark:*` class on anything that uses a semantic token.** If you need a dark-specific tweak, the token should change in `globals.css`, not in the component.

5. **Visual regression.** Playwright visual-regression against the reference screenshots captured on the first green commit of this branch. Any diff > 0.1% must be a deliberate improvement, logged in `UI_REDESIGN_LOG_V2.md`.

6. **Manual check on three pages for the user to review.** Export PNG screenshots of:
   - Dashboard (light + dark + mobile)
   - Invoice create (light + dark)
   - Trial balance report (light + dark + printed PDF)
   
   Place them in `docs/ui-review-v2/` and commit. The user will open these and tell you if they look like Zoho/QuickBooks/Xero or if you need another pass.

---

## 6. Order of operations (do not skip, do not reorder)

1. Branch `ux/refresh-v3` from the pre-codemod commit (or `dev` if that's impractical).
2. Hand-rewrite every file in `packages/ui/src/*.tsx`. Each file opened, old classes deleted, new classes written from the token rules in section 2. Commit as `revert(ui): rewrite primitives without conflicting class pairs`.
3. Add the Bug 4 ESLint rule in `packages/config/eslint-*.js` AND wire it to the web `.eslintrc`. CI must fail on any conflict. Commit: `chore(lint): detect conflicting Tailwind utility class pairs`.
4. Grep every file in `apps/web/src/**` for the Bug 1 patterns; hand-fix each. Commit: `fix(web): remove conflicting class pairs from all app pages`.
5. Load Inter + JetBrains Mono via `next/font`. Re-apply the type scale and tabular-nums universally. Commit: `feat(ui): Inter + JetBrains Mono via next/font, type scale, tabular-nums`.
6. Fix the shell (sidebar + top bar) against the Zoho benchmark and the design principles. Commit: `feat(shell): Zoho-benchmark sidebar + top bar refresh`.
7. Rebuild the dashboard against the Zoho + Xero benchmark. Commit: `feat(dashboard): KPI hero + ageing + recent activity`.
8. Rebuild the invoice-create screen against the QuickBooks benchmark. Commit: `feat(invoice): QuickBooks-style split form + live preview`.
9. Rebuild every report page on the shared `ReportPage` against the Xero benchmark. Commit: `feat(reports): Xero-style ReportPage with sticky header + compare mode`.
10. Pass through every remaining page (every list, every settings page, every detail page, every dialog) applying the design-principle checklist. Commit per logical group.
11. Run the full verification protocol (section 5) against every page. Commit: `test(ui): visual-regression baseline + axe-core green on every page`.
12. Export the three user-review screenshots to `docs/ui-review-v2/`. Commit: `docs(ui): user-review screenshots for dashboard, invoice-create, trial-balance`.
13. Open the PR into `dev`. PR description lists every commit SHA with what it changed, every design principle it respects, before/after screenshots inline.

---

## 7. What you will NOT do

- You will not run a codemod. Hand-write every change.
- You will not append a semantic class next to a raw class and call it done. Delete the raw class first.
- You will not reuse the existing variant strings in `packages/ui/src/button.tsx`, `input.tsx`, etc. — they are corrupted. Start each variant from an empty string.
- You will not use `dark:*` prefixes on anything that has a semantic-token class in the same scope.
- You will not claim visual regression is green without opening the screenshot yourself.
- You will not mark the PR ready until the three user-review screenshots exist in `docs/ui-review-v2/` and you have personally opened each and confirmed it looks modern, consistent and professional.
- You will not downsize, bypass, or fake. Honesty rules from the prior campaigns apply.

---

## 8. If you get stuck

Stop and write a plain-English report of exactly where you are stuck, what you tried, and what you need. Do not keep trying variants of the same broken approach. The previous campaign already produced a broken codemod because nobody stopped to check the output; don't repeat that.

**Begin. Hand-written, principled, verified. Don't stop until the dashboard, invoice-create and trial-balance screenshots in `docs/ui-review-v2/` are indistinguishable in quality from Zoho Books, QuickBooks Online, and Xero at the same page.**
