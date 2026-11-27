# 🚀 FINAL PRODUCTION-READINESS CAMPAIGN — Test every control, fix every defect, ship a zero-error platform

This is the final gate before this product goes to market. The vision: a GST accounting + CA-practice platform real Indian firms pay for and use daily, with **zero errors** a user can hit. Your job is to exhaustively exercise EVERY interactive element in the app — from the smallest icon button to the largest flow — verify the behaviour and the API behind it, fix every defect you find, and produce an auditable report proving each one works. Nothing is "assumed working." Every button is clicked, every dropdown is opened, every dialog is submitted and cancelled, every report is exported, in both themes, at desktop and mobile, as every role.

Work on the SAME branch `ux/refresh-v6` (do not create a new branch). Stream `[api] [web] [worker] [test]` live logs to one terminal. Headless Playwright. Honesty rules below are absolute.

Companion file: `docs/FEATURE_INVENTORY.md` lists every route, control, dialog, report and its backing API. Use it as your checklist spine — do not skip a row.

---

## 0. The contract (read first, violate nothing)

1. **Zero-error target.** The definition of done is: a user can perform every flow in `FEATURE_INVENTORY.md` without hitting a crash, a 4xx/5xx the UI didn't intend, a dead button, a broken dropdown, an unreadable field, a wrong number, or a console error. Every defect you find is FIXED on this branch, not just logged.
2. **Real UI, real data.** All testing drives the actual running app through headless Playwright. The data in the DB is the data created by the user-journey scripts from the previous campaign (real UI-driven records) — do not wipe it; top it up if a flow needs more.
3. **Every element, individually.** Not "the page loads." Every button clicked, every dropdown opened and an option selected, every menu item followed, every dialog opened + submitted + cancelled + Esc-closed, every table sorted and paged and filtered, every row action fired, every export downloaded and opened, every toggle flipped, every keyboard shortcut exercised.
4. **API verification per action.** For every action, capture the network request it issued and assert the response status is what the UI intended (200/201 for success paths, the correct 4xx for validation paths). Any unexpected 4xx/5xx is a bug — fix the frontend payload or the backend handler. Record every endpoint's observed status in the report.
5. **No faking, no downsizing, no skipping.** If a flow is broken and you cannot fix it, STOP and report exactly where with the trace — do not mark it green. If a feature has no backend, log it as a product gap; do not stub a fake success.
6. **Both themes, desktop + mobile, three roles.** Every page tested in light AND dark, at 1440×900 AND 390×844, as FIRM_PARTNER, STAFF_ACCOUNTANT, and CLIENT_VIEWER (role-appropriate access verified — a CLIENT_VIEWER must not reach partner-only actions, and the UI must degrade gracefully, not crash).
7. **Evidence or it didn't happen.** Every tested element gets a row in `docs/PRODUCTION_TEST_REPORT.md` and a Playwright trace. Screenshots for every page state.
8. **DESIGN FREEZE — do not restyle anything.** The user has approved the current visual design. This campaign fixes BEHAVIOUR only: dead/broken buttons, non-working dropdowns, failed API calls, wrong numbers, clipped/unreadable fields, missing labels, crashes, console errors, accessibility failures. You may change colors/spacing/typography ONLY where a specific defect requires it (e.g. an unreadable field, a contrast failure, an invisible value) — and when you do, make the minimal change and note it in the report. You may NOT re-theme, re-layout, swap components, or "improve" a screen that already works. If a screen looks fine and every control works, leave it exactly as it is.

---

## 1. Pre-flight — stand up the full stack and wire real monitoring

1.1 Bring up Postgres (as the non-superuser `app_user`), Redis, MinIO, the API, the web app, and the worker. Confirm `/v1/health` is HEALTHY and `/v1/metrics` responds.

1.2 **Instrument for zero-error detection.** Before testing, wire these so NOTHING slips:
- A Playwright global fixture that fails the test on ANY browser `console.error` or `console.warn`, any uncaught page exception, any failed network request (status ≥ 400) that the test did not explicitly expect, and any React hydration warning.
- An API-side request log that records every request's method, path, status, and latency during the test run, written to `docs/production-test/api-requests.log`.
- A list of every `console.error/log/warn` currently in the frontend (32 files per the audit) — route them through a proper logger that is silent in production (`NEXT_PUBLIC_LOG_LEVEL`), or remove them. The app must emit zero console noise in production mode.

1.3 Run the app in PRODUCTION mode (`next build && next start`, `NODE_ENV=production` on the API) for the test run — dev-mode hides real build and hydration errors. Fix every build warning and every hydration mismatch before proceeding.

Commit: `chore(qa): production-mode stack, console-error-failing Playwright fixture, request logging`.

---

## 2. Global chrome — top bar, sidebar, command palette (test once, used everywhere)

Exhaustively, per `FEATURE_INVENTORY.md` "Top bar":

2.1 **Company switcher.** Open it. Search. Select a different company. Assert the sidebar, top bar, and the current page's data ALL re-render to the new company — no stale rows from the previous company anywhere. Switch 5 times rapidly; no race, no flch of wrong data. ⌘⇧C opens it. Keyboard navigate + Enter selects.

2.2 **⌘K command palette.** Open via click and via ⌘K. Type a partial route name; assert fuzzy results. Type a partial party name; assert it finds the record. Enter navigates. Esc closes. Arrow keys move selection.

2.3 **Bell / notifications.** Badge shows the real unread count. Open dropdown; grouping by Today/Yesterday/This Week/Earlier renders. Click a notification → navigates to its target AND marks it read (badge decrements). "Mark all as read" clears the badge. `/notifications` full page loads, infinite-scrolls, filters work.

2.4 **Theme toggle.** Flip to dark. Walk the WHOLE app in dark mode (every page in §3) and assert zero invisible text, zero mismatched-theme panels, zero contrast failures. Flip back. Preference persists across reload.

2.5 **Profile menu.** Opens. "Settings" navigates. "Sign Out" clears tokens, redirects to `/auth/login`, and a protected route now redirects to login.

2.6 **Sidebar.** Every section collapses/expands and persists. Every one of the ~30 nav items navigates to the right route and shows the active state. Collapsed mode shows icons + tooltips. Mobile drawer opens/closes, traps focus, closes on backdrop click.

Report rows + traces for each. Commit: `test(qa): global chrome — switcher, palette, bell, theme, profile, sidebar all verified`.

---

## 3. Every page, every control — the exhaustive sweep

For EACH of the 42 routes in `FEATURE_INVENTORY.md`, in both themes, desktop + mobile, as each applicable role, do ALL of:

3.1 **Load.** Page renders with real data (not empty — the DB is populated). No console error, no failed request, no layout break, no horizontal scroll on mobile.

3.2 **Every button.** Click each one. Primary actions complete their flow. Secondary actions (Refresh, Export, Filter, etc.) do what they say. Icon-only buttons (the "smallest eye button" the user mentioned — view/preview/expand/copy/delete icons in table rows) each fire their action. Capture the network call + status for each.

3.3 **Every dropdown / Select / Combobox.** Open it. Assert options render (not empty, not "Loading…" stuck). Select an option; assert the UI updates and the value persists in the trigger. Typeahead comboboxes (party, item, client pickers): type 3 chars, assert filtered options, pick one. GST% / state / frequency / status selects: pick each option, assert the dependent fields update.

3.4 **Every table.** Sort by each sortable column (asc + desc). Apply each filter; assert rows change. Search; assert it filters. Paginate: next, prev, jump to page, change page size — assert the "showing X–Y of N" and the rows update, and the URL reflects the page. Bulk-select + bulk action where present. Every row-level action (view, edit, duplicate, delete, approve, reject, download, reverse) fires and completes.

3.5 **Every row action's confirm.** Destructive actions open the themed ConfirmDialog (never a browser confirm). Confirm completes; Cancel aborts; Esc closes.

3.6 **Empty + loading + error states.** Force each: a slow API (skeleton shows), a filtered-to-zero result ("No matches" + clear-filters), an API 500 (ErrorState with Retry, not a white screen).

3.7 **Mobile.** At 390×844: no horizontal scroll, drawer nav works, tables reflow or scroll with sticky first column, sticky action bars reachable, tap targets ≥ 44px.

Produce one report row PER control (button/dropdown/table/row-action), not per page. The items page alone has ~18 click targets — each gets a row.

Commit per page-group (e.g. `test(qa): invoices + invoice/new + invoice/[id] — every control verified & fixed`).

---

## 4. The 33 dialogs — each one, fully

For every dialog in `FEATURE_INVENTORY.md`:
- Opens from its trigger. Correct size, centered, backdrop.
- Every field has a visible label (the recurring dialog regression must not recur anywhere) and is typeable — values fully visible, never clipped.
- Tab order is sensible; Enter submits (except in textarea); Esc closes; focus returns to the trigger on close.
- Required-field validation shows inline (not just a toast), naming the missing field.
- Submit completes the flow, closes the dialog, refreshes the underlying list, and shows a success toast.
- Cancel discards; a dirty form warns before discarding.
- Dark mode + mobile sheet variant both correct.

Specifically re-verify the **recurring-schedule dialog** (every field labeled, helper text, next-run preview, confirm step) and every file-upload dialog (real file picker, replace, delete, reject bad files).

Commit: `test(qa): all 33 dialogs — labels, validation, submit/cancel/esc, dark+mobile verified`.

---

## 5. The 28 reports — each one, end to end

For every report in `FEATURE_INVENTORY.md`:
- Loads with data (DB is populated). Correct columns, sticky header, tabular-nums, Indian number format, right-aligned money.
- Change the date range via the DatePicker/quick-chips; data updates; edge ranges (today only, future, year-ago) don't crash.
- **Reconcile** on-screen totals against the DB via a harness query — exact to the paise. Trial balance Dr==Cr; Balance Sheet A==L+E; P&L Revenue−Expenses==Net Profit.
- Drill-down on a party/ledger/item cell navigates to the detail.
- Favorite/unfavorite persists.
- Export xlsx → open it → totals match screen. Export pdf → open it → real company name + real PAN present (no placeholder, no ciphertext), amounts formatted. Export html → renders.
- Share → open the share link in an UNAUTHENTICATED context → shows only that company's data, no cross-tenant leak.

Report row per report per format. Commit: `test(qa): all 28 reports — reconciled, exported (xlsx/pdf/html), shared, drill-down verified`.

---

## 6. Core business-logic correctness (the money must be right)

Beyond "the button works," prove the accounting is correct, because a wrong number kills trust:
- Create invoices covering intra-state (CGST+SGST), inter-state (IGST), RCM, cess, zero-rated, round-off. For each, approve it, open the posted voucher, assert the RIGHT ledgers (Output CGST/SGST/IGST/Cess, Round Off — never Input, never a Sales plug) and Dr==Cr to the paise.
- Reverse a voucher in a locked period → blocked with a clear message.
- Invoice auto-numbering under rapid creation → no duplicates, no gaps.
- Payment webhook: bad HMAC → 401; replayed good HMAC → idempotent.
- Cross-tenant: as tenant B, attempt to open tenant A's invoice/party/report by guessed URL → 404/blocked, never leaked. The `x-tenant-id` spoof → 403.
- Period lock prevents back-dated posting into it.

Commit: `test(qa): accounting correctness — ledgers, Dr=Cr, reversal lock, numbering, webhook, tenant isolation`.

---

## 7. Resilience & zero-error hardening

- **Every network failure path.** Kill the API mid-action → the UI shows a friendly error + retry, never a white screen or a raw stack. Restart → retry succeeds, no corrupted state.
- **Token expiry mid-session** → silent refresh, the action completes; if refresh fails → clean redirect to login.
- **Double-submit guard** on every create button (disable + spinner while in flight).
- **XSS** probe (`<script>` in every text field) → rendered as literal text everywhere it's shown, including PDFs.
- **SQLi** probe (`' OR 1=1 --`) in every search → literal, no error, no leak.
- **Oversized upload** (100 MB) → 413 with a visible error.
- **Rapid navigation** (click through 20 routes fast) → no memory leak, no unhandled-rejection, no stuck spinner.
- **Browser back/forward** across filtered/paginated pages → state restored from URL.

Commit: `test(qa): resilience — failure paths, token refresh, double-submit, XSS/SQLi, upload caps`.

---

## 8. Accessibility & polish final pass

- axe-core on every page in both themes → zero serious/critical violations. Fix each.
- Keyboard-only: complete a full invoice-create → approve → export flow without a mouse.
- Focus-visible ring on every interactive element.
- Screen-reader labels on every icon button and form field.
- Lighthouse per page: Accessibility ≥ 95, Best Practices ≥ 95, Performance ≥ 85 on the heavy list pages.

Commit: `fix(a11y): axe-core green, keyboard flows, Lighthouse thresholds met`.

---

## 9. The zero-error report (the deliverable the user will read)

Produce `docs/PRODUCTION_TEST_REPORT.md` with:
- **Executive summary:** total controls tested, total defects found, total fixed, any remaining (with severity + reason).
- **Per-route table:** every route × every control × status (PASS/FIXED/GAP) × the API it hit × that API's observed status × the fix commit SHA.
- **Per-dialog table:** all 33, each criterion.
- **Per-report table:** all 28 × each format × reconciled Y/N × fix SHA.
- **API coverage table:** all 158 backend routes — called by UI? observed status? The 49 currently-unused routes: intentional or needs-UI?
- **Defect log:** every bug found, its root cause, the commit that fixed it, and the test that now guards it.
- **Product gaps:** anything with no backend/UI, flagged for roadmap (not faked).
- **Console-cleanliness proof:** zero console.error/warn in production build across the whole sweep.
- **The traces:** link every Playwright trace under `tests/e2e/production/traces/`.

---

## 10. Go-live checklist (must all be checked)

- [ ] Zero console errors/warnings in production build across every page.
- [ ] Every button, dropdown, row action, and dialog in `FEATURE_INVENTORY.md` tested and passing.
- [ ] Every one of the 28 reports reconciles to the paise and exports in all 3 formats with real PAN.
- [ ] Accounting correctness proven (ledgers, Dr=Cr, reversal lock, numbering, tenant isolation).
- [ ] Every failure path shows a friendly error, never a white screen or raw stack.
- [ ] axe-core zero serious violations; Lighthouse thresholds met.
- [ ] DB runs as non-superuser; RLS proof green on every tenant-scoped table.
- [ ] Secrets are production-strength; CORS locked to the prod domain; NODE_ENV=production.
- [ ] Dockerfiles build; compose comes up on a fresh VM; migrations run; backups confirmed.
- [ ] No `alert()`/`confirm()`; no TODO/stub/mock in a user-facing path.
- [ ] PR into `dev` with the full report and every trace attached.

---

## 11. Honesty contract (absolute)

- Every defect found is FIXED on this branch, or STOP-and-report with the trace — never marked green while broken.
- No downsizing the element count. Every control in the inventory is tested individually.
- No faked success for a missing feature — log it as a gap.
- No "the page loads so it passes" — the element-level checks are mandatory.
- No merging until the user has read `docs/PRODUCTION_TEST_REPORT.md` and approved.

**Begin with §1 (production-mode stack + console-error-failing fixture). Then §2 global chrome, then §3 the 42-route exhaustive sweep, §4 dialogs, §5 reports, §6 correctness, §7 resilience, §8 a11y, §9 report. Stream logs continuously. The next time the user hears from you is when `docs/PRODUCTION_TEST_REPORT.md` exists with the executive summary filled in and the defect log showing found-and-fixed.**
