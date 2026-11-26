# UI Redesign Log — Antigravity Books / BillsnBooks (`ux/refresh-v2`)

**Branch:** `ux/refresh-v2` (branched off `dev`)  
**Scope:** UI-only redesign (`apps/web` + `packages/ui`). Backend (`apps/api/**`, `packages/accounting-core/**`, `packages/gst-rules/**`, migrations, seeds) remained strictly untouched.

---

## Summary of Commits

| Section | Commit | Summary |
| :--- | :--- | :--- |
| 1. Design System & Codemod | `fb1eedf` | Loaded `Inter` & `JetBrains_Mono`, added semantic CSS vars (`--color-text-strong`, `--color-row-hover`, `--color-row-stripe`, `--color-focus-ring`, `--color-skeleton`), density CSS vars (`compact` / `comfortable`), type scale, `MoneyText` (`tabular-nums`), `DateText`, `scripts/codemod-semantic-tokens.mjs`, and `pnpm lint:tokens` build gate (6,232 raw palette tokens replaced across 119 files -> `0` remaining). |
| 2. Shared Page Shells | `4e372b8` | Created `PageHeader`, `Toolbar`, `EmptyState`, `LoadingState`, `ErrorState`, `ListPage`, `DetailPage`, `FormPage` in `@platform/ui`; added `PageErrorBoundary` + `#main-content` skip link; rewrote `/items` (791 → 219 lines), `/invoices` (496 → 188 lines), `/parties`, `/approvals`. |
| 3. Shell Refresh | `daed1dc` | Zoho Books-style plain-English sidebar labels across 5 groups (`Sales`, `Money`, `Reports`, `Practice`, `Setup`), `border-l-2 border-brand` active state, company switcher displaying `legalName` + `pan`, removed top-bar Tally pill. |
| 4. Dashboard | `9355155` | Zoho-style dashboard: 4 KPI cards + inline SVG sparklines, Receivables & Payables ageing split, Recent Invoices (10), Approvals Pending (inline Approve/Reject), Period Status, collapsible System Health. |
| 5. Invoice Create | `463d5cc` | QuickBooks Online-style 55%/45% split form + sticky live PDF preview (`Minimal` / `Modern` / `Tally` template switcher), mobile Preview toggle, keyboard shortcuts (`⌘S`, `⌘Enter`, `Alt+N`, `Alt+D`). |
| 6. Invoice Detail | `8deb216` | Xero-style `DetailPage` 60/40 split (A4 preview left, Summary + Accounting & Audit sidebar right) and shared `ReportPage` shell. |
| 7. Reports | `6670133` | Unified `/reports/trial-balance`, `/reports/customer-sales`, `/reports/profit-and-loss`, `/reports/balance-sheet` onto `ReportPage` with sticky headers, `MoneyText` tabular-nums, drill-down links to General Ledger, Compare Period toggle, and Export/Print actions. |
| 8. Masters | `181284c` | Unified `/vouchers` and `/banking` onto `ListPage` + `Toolbar` with sticky headers and semantic tokens. |
| 9. Dialogs Standardization | `2c2e498` | Added exact size tokens (`sm: 400px`, `md: 560px`, `lg: 760px`, `xl: 960px`, `full`) and scrollable viewport cap to `@platform/ui` `DialogContent`; migrated `ShareDialog` off raw `fixed inset-0` overlay to `Dialog`. |
| 10. Settings & Periods | `c1e34a8` | Added live Table Density toggle (`compact` / `comfortable`) on `/settings`; upgraded `/settings/periods` to `ListPage` with `FIRM_PARTNER` role gating (`STAFF_ACCOUNTANT` sees disabled lock/unlock with tooltip). |
| 11. Practice | `ffc3d98` | Upgraded `/practice/clients` to `ListPage`; added Karbon-style Table / Kanban board view toggle and `LoadingState` Suspense fallback on `/practice/tasks`. |
| 12–16. A11y, Docs & Dark Mode | `886a1bb` | Exported `PrimitivesCatalogue` from `@platform/ui`, added `/docs/components` live catalogue route, and replaced remaining `dark:text-white` / `dark:hover:text-white` across 57 files with semantic `text-primary` tokens. |
| 17. Polish | `cc7a47a` | Replaced `console.error` in `/vouchers` with `ErrorState` bound to `ListPage`. |

---

## Verification & Artifacts

- **Semantic Token CI Gate (`pnpm --filter @platform/web lint:tokens`):** `0` raw palette classes (`slate-`, `zinc-`, `gray-`, `blue-`, `rose-`, `emerald-`, `indigo-`, `amber-`, `orange-`, `sky-`, `violet-`, `purple-`) across `apps/web/src/`.
- **Production Build (`pnpm --filter @platform/ui build && pnpm --filter @platform/web build`):** All 42/42 Next.js routes compiled cleanly with zero TypeScript or lint errors.
- **Pre-Refresh Baselines:** 51 screenshots (17 routes × light-desktop, dark-desktop, light-mobile) in `tests/e2e/baselines/before/` via `tests/e2e/ux-baseline.spec.ts`.
- **Post-Refresh Verification & Baselines:** 63 screenshots (21 routes × light-desktop, dark-desktop, light-mobile) in `tests/e2e/baselines/after/` via `tests/e2e/ux-refresh-verify.spec.ts` verifying:
  - `#main-content` landmark present on all 21 routes
  - Zero horizontal overflow at mobile `390×844` across all 21 routes
  - Live `compact` / `comfortable` density toggle updating `html[data-density]`
  - Zero `pageerror`s and zero UI console errors
- **Screencast:** `tests/e2e/screencasts/ux-refresh-v2-walkthrough.webm` (1.5 MB).
