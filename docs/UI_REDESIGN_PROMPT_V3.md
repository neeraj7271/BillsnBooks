# 🎯 UI Refresh V3 — targeted fixes + production plan

The V2 campaign landed. The UI is readable now, but 5 real issues remain and the project has no production deployment plan. Fix exactly these on branch `ux/refresh-v4` (off current `ux/refresh-v3`). Do not reopen anything already fixed. Hand-written, not codemod-driven. Honesty rules from previous campaigns apply.

Live logs to one terminal `[web] [api] [test]`, headless Playwright, same tenants and data as the last run.

---

## 1. Fix the scrolling container — sidebar must stay pinned

**Root cause (audit-verified):** `apps/web/src/components/app-shell.tsx` renders:
```tsx
<div className="flex min-h-screen bg-canvas text-primary ...">
  <aside className="hidden lg:block shrink-0 ...">
    <div className="sticky top-0 h-screen">{renderContent(false)}</div>
  </aside>
  <div className="flex flex-1 flex-col min-w-0 ...">
    <TopHeader .../>
    <main className="flex-1 w-full min-w-0 overflow-y-auto px-4 py-4 ...">
      ...
    </main>
  </div>
</div>
```
The outer container is `min-h-screen` (not fixed), so the body itself scrolls when a page is long. `<main>` has `overflow-y-auto` but no height constraint, so it never actually scrolls internally. The sidebar's `sticky top-0` only pins within its offsetParent — when the body scrolls, the sidebar slides up with it.

**Fix (exact):**
- Outer container: `className="flex h-screen overflow-hidden bg-canvas text-primary ..."` (change `min-h-screen` → `h-screen`, add `overflow-hidden`).
- Sidebar `<aside>`: drop `sticky top-0 h-screen` from the inner div; just use `h-full`. The aside is already a flex child so it fills height naturally.
- Right column `<div className="flex flex-1 flex-col min-w-0 ...">`: add `h-full overflow-hidden` so only `<main>` scrolls.
- `<main>`: keep `overflow-y-auto`, but add `h-0 flex-1` so flex gives it a definite height that triggers the overflow. Keep the inner `max-w-7xl mx-auto` wrapper.
- Print: keep `print:block print:w-full print:p-0 print:overflow-visible` escape hatches so printing is not broken.

**Acceptance:**
- On every page, scroll the page content with the mouse wheel → the sidebar stays fully visible, the top header stays fixed at the top, only the central content area scrolls.
- Open a long page (e.g. `/items` with 5000 rows loaded, `/vouchers` with hundreds of rows). Scroll to the bottom. Sidebar is still there, unchanged.
- Resize to mobile → the drawer still opens and closes correctly; no horizontal scroll introduced on body.
- Keyboard: Tab into the main area, scroll with `PageDown`, confirm the sidebar does not move.
- Add a Playwright test: `expect(await page.locator('[data-testid=sidebar]').boundingBox()).toMatchObject({ y: 0 })` after scrolling.

Commit: `fix(shell): make <main> the only scroll container so sidebar stays pinned`.

---

## 2. Invoice create — fix form rhythm and give it a real Preview toggle

Audit of `apps/web/src/app/invoices/new/page.tsx`: 640 lines, mixed `space-y-3` / `space-y-4` / `gap-4`, forced 55/45 split on desktop, mobile-only tab toggle. The split is cramped on 13" screens (the PDF preview is too small to read) and absent on 27" screens as a user choice (no way to hide it).

**Rework the layout:**

2.1 **Top-of-page view toggle.** At the top-right of the page header, add a 3-way segmented control: `Edit` / `Split` / `Preview`. Default is `Edit` (form at full width). State persisted per user in `localStorage` as `antigravity_invoice_view_mode`. Keyboard shortcut `⌘⇧P` toggles to Preview, `⌘⇧E` back to Edit.

2.2 **Edit mode (default).** Form occupies `max-w-4xl` centered, full width on mobile. No preview rendered at all (don't just hide — unmount it, so there's zero cost when editing). Use the **FormPage** primitive with grouped fieldsets:
- **Fieldset 1 — Document.** Document type, branch, FY, custom invoice number, numbering preview. One row of 4 fields at `md` breakpoint.
- **Fieldset 2 — Party & Dates.** Party combobox (full width), invoice date, due date, place-of-supply. One row of 3 after the party.
- **Fieldset 3 — Line items.** Sticky header row. Add row / delete row buttons on each line. Keyboard `Alt+N` adds, `Alt+Backspace` deletes.
- **Fieldset 4 — Totals.** Right-aligned block, subtotal / discount / taxable / CGST+SGST or IGST / round-off / grand total, every number `tabular-nums`.
- **Fieldset 5 — Notes & Terms.** Textarea for notes, optional bank details toggle.
- **Sticky action bar at bottom-right.** `Save as Draft` (secondary), `Save & Submit for Approval` (primary). `⌘S` saves, `⌘Return` submits.

2.3 **Preview mode.** Form unmounts, preview renders at `max-w-4xl` centered, same template selector segmented control above (`Minimal` / `Modern` / `Tally`). A "← Back to Edit" button pinned top-left. Print and Download buttons at the top-right.

2.4 **Split mode.** 55/45 as today but with explicit affordances: a vertical resizer between the two columns (drag to adjust 40/60 to 70/30), persisted in `localStorage`. On < 1280 px viewport, Split mode is disabled and the toggle shows a tooltip "Enable wider viewport for Split".

2.5 **Spacing rhythm (fix now, apply everywhere):**
- Between fieldsets: `space-y-6` (24 px).
- Between label and input: `mb-2` (8 px).
- Between input and helper text: `mt-1.5` (6 px).
- Between fields in a row: `gap-4` (16 px).
- Fieldset internal top/bottom padding: `py-5` (20 px) inside a card.
- Line item row internal padding: `py-2 px-3` (compact density) or `py-3 px-4` (comfortable).

2.6 **Line-items table must align like a real spreadsheet.** Columns with fixed widths:
- Item (combobox) — `min-w-[220px]` flexes to fill.
- HSN — `w-24 tabular-nums`.
- Qty — `w-20 text-right tabular-nums`.
- UOM — `w-16`.
- Rate — `w-28 text-right tabular-nums`.
- Disc% — `w-16 text-right`.
- GST% — `w-16 text-right`.
- Amount — `w-32 text-right tabular-nums font-semibold`.
- Delete — `w-10`.

**Acceptance:**
- Open `/invoices/new`. Default view is Edit, full width. No preview on screen.
- Click `Preview` in the top-right segmented control. Form unmounts, preview fills the viewport. Template switcher visible. Print button works.
- Click `Edit`. Form renders back with the data intact (no state loss).
- Click `Split` on a 1440×900 monitor. Two columns, draggable divider. Resize to 1200×900 — Split option becomes disabled.
- `⌘⇧P` toggles to Preview; `⌘⇧E` back.
- Visual: open in both light and dark modes, snapshot each view mode. All three snapshots have consistent spacing (none of the "inconsistent gaps" from before).

Commit: `feat(invoice): 3-mode Edit/Split/Preview, fixed-width line-item columns, consistent rhythm`.

---

## 3. Pagination on every list page

**Audit (pagination-hits per page from grep):** parties 6, items 11, invoices 0, vouchers 0, approvals 0, banking 0, practice/clients 0, practice/tasks 0, collections/payment-links 0, collections/recurring 0, imports 0.

**Fix:** The `DataTable` primitive in `packages/ui/src/data-table.tsx` already supports `pageSize`, `page`, `onPageChange`, `totalCount`. Nine list pages ignore it.

3.1 **For every list page below, wire up pagination:**
- `/invoices` (server-side — invoices list is paginated server-side).
- `/vouchers` (server-side).
- `/approvals`.
- `/banking` (and within `/banking/[id]/reconcile` for the transactions table).
- `/banking/discovery`.
- `/parties` (already client-paginated — convert to server-side so 10 000+ parties don't ship in one call).
- `/items` (already client-paginated — convert to server-side).
- `/practice/clients`, `/practice/tasks`, `/practice/documents`.
- `/collections/payment-links`, `/collections/recurring`, `/collections/ageing/parties`, `/collections/ageing/invoices`.
- `/imports`.
- `/vouchers`.
- Every report table with > 50 rows (AR_AGEING, GENERAL_LEDGER, CUSTOMER_SALES, ITEM_SALES, CASH_*).

3.2 **Server-side pagination contract.** Backend contracts are already paginated for invoices/vouchers; wire the UI to send `?page=N&pageSize=M` and read `{data, pagination: {page, pageSize, total, totalPages}}`. For endpoints that don't paginate server-side yet, do NOT add backend changes — fall back to client pagination over the full list, and open a `docs/BACKEND_PAGINATION_GAP.md` listing each endpoint for a follow-up ticket.

3.3 **Pagination UI is the same on every page.** Below the table, a 40 px tall footer bar:
- Left: `"Showing 1–20 of 5,003"` (`tabular-nums`, with Indian numbering comma grouping).
- Center: numbered page buttons `← 1 2 3 … 250 →` with the current page `bg-brand-subtle text-brand-text`. Collapses sensibly with ellipses when `totalPages > 7`.
- Right: `"Rows per page: [25 ▾]"` dropdown with options `[10, 25, 50, 100]`, persisted per user per page (`localStorage`).
- Mobile: center collapses to `"Page 3 of 250"` with `← →` arrows.
- Keyboard: `[` previous page, `]` next page, `Home` first, `End` last.

3.4 **Empty-after-filter state.** If the current page returns 0 rows AND a filter is active, show `"No matches"` + `"Clear filters"` button. Distinct from the global empty state.

3.5 **URL state.** Current `page`, `pageSize`, and active filters are reflected in the URL query string so the page is deep-linkable and the back button works.

**Acceptance:**
- Visit every page listed above; pager is visible, numbers tally with `total`, arrows and numbered buttons work, URL query string updates.
- Reload the page after navigating to page 7 → still on page 7.
- Change page size → persisted across page loads.
- Playwright test per page: assert the pager exists, click `Next`, assert URL contains `page=2`, assert the top row differs from page 1.

Commit: `feat(list): wire server-side pagination + URL state on 14 list pages`.

---

## 4. Production deployment plan (make it real, not a doc)

Audit: `apps/web` has no `.env.example` or `Dockerfile`; `apps/api` has `.env.example` but no `Dockerfile`; `docker-compose.yml` only brings up infra; no CI/CD past `ci.yml`.

Produce an actual, runnable production stack. All of this lands on this same branch.

4.1 **Dockerfiles** (multi-stage, pinned Node 22-alpine):
- `apps/api/Dockerfile` — build step runs `pnpm install --frozen-lockfile`, `pnpm --filter @platform/api build`, final stage is distroless-node or `node:22-alpine` copying `dist/`, runs as non-root user, exposes 4000, healthcheck hits `/v1/health`.
- `apps/web/Dockerfile` — same shape, final stage `next start -p 3000`, healthcheck hits `/api/health` (add a tiny Next route for this).
- `apps/worker/Dockerfile` — final stage runs the outbox / recurring / reminder worker.
- Image labels: `org.opencontainers.image.source`, `.revision` (git SHA), `.version` (package.json), `.created` (build time).

4.2 **`apps/web/.env.example`** (new):
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
NEXT_PUBLIC_SENTRY_DSN=
```

4.3 **`apps/api/.env.example`** (expand): add `SENTRY_DSN`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`, `SMTP_URL`, `LOG_LEVEL`, `METRICS_PORT`, `DB_POOL_SIZE`.

4.4 **`docker/docker-compose.prod.yml`** (new) with templated env, running api / web / worker / postgres / redis / minio / caddy, with named volumes for `postgres_data`, `redis_data`, `minio_data`, `caddy_data`. Postgres container runs the `app_user` role (not superuser) via an init script. Redis uses `appendonly yes`.

4.5 **Caddy or Nginx front proxy** config with automatic HTTPS (Caddy is simplest):
- `app.yourdomain.com` → web:3000.
- `api.yourdomain.com` → api:4000.
- `storage.yourdomain.com` → minio:9000 (for serving uploaded logos if you move off base64).
- HSTS, gzip, brotli, HTTP/2.

4.6 **One-command bootstrap on a fresh server.** A `scripts/deploy/bootstrap.sh` that: installs Docker, clones the repo, generates `.env.production` from `.env.example` with prompts (or reads from Vault/SSM), runs `docker compose -f docker/docker-compose.prod.yml up -d`, runs migrations in a one-shot migration container, runs the seed only if the DB is empty.

4.7 **Zero-downtime deploys.** Document the sequence: build + push new images → `docker compose up -d api web worker` (same compose does rolling replace), run any new migrations beforehand in a separate `migrate` service that exits 0. Rollback: `docker compose up -d --no-deps api:<previous-tag>`.

4.8 **Database backup.** Add a `postgres-backup` container (prodrigestivill/postgres-backup-local) scheduled hourly keeping 7 days + daily keeping 30 days, writing into a `backups` volume. Document the restore command.

4.9 **Secrets management.** The deploy guide names three options: `.env.production` file with 600 permissions (OK for single-server), Docker Secrets (Swarm), or AWS Secrets Manager / Vault (named for readers who are at scale). Never commit secrets.

4.10 **CI/CD.** Extend `.github/workflows/ci.yml` (or add `deploy.yml`):
- On push to `dev`: run tests + lint + build, push images tagged `dev-<sha>` + `dev-latest` to GHCR.
- On push to `main`: build, push images tagged `v<semver>` + `latest`, SSH or GitHub Actions deploy step runs `scripts/deploy/rollout.sh` on the server (SSH key stored as a GH secret).
- Protected `main` branch, required PR reviews, required green CI.

4.11 **Observability.**
- `/v1/health` already exists — document it and have Docker healthchecks hit it.
- Add `/v1/metrics` returning Prometheus format (use `prom-client`) with request counts, latency histograms, outbox depth, DB pool stats.
- A `docker/monitoring-compose.yml` optional stack: Prometheus + Grafana + Loki + Promtail (Grafana dashboards JSON checked in at `docs/ops/grafana/`).
- Sentry wiring in both web and api (behind `SENTRY_DSN` env).

4.12 **Branding storage.** Right now logos/signatures are base64 in `setting_values` (flagged as a P1 architectural finding in the earlier audit). Document the migration path to MinIO/S3 in `docs/ops/BRANDING_STORAGE_MIGRATION.md`:
- Add `S3_*` env, add a `FileStorage` service in the API with a swappable driver (base64 default, s3 if configured).
- One-time migration script that uploads existing base64 blobs to S3 and rewrites `setting_values` rows to hold the S3 key.
- Fallback to base64 if S3 is down.

4.13 **DNS and SSL.** `docs/ops/DEPLOYMENT_GUIDE.md` walks a first-time deployer through: buying a domain, pointing A records at the server IP, running the bootstrap script, waiting for Caddy to provision certificates, visiting `https://app.yourdomain.com`, creating the first tenant. Screenshots of the first-run flow.

4.14 **Live-production checklist** (checklist in `docs/ops/GO_LIVE_CHECKLIST.md`):
- `app_user` is the DB user, not superuser.
- `ENCRYPTION_KEY`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PAYMENT_WEBHOOK_SECRET` are each ≥ 32 chars and freshly generated (not from `.env.example`).
- `CORS_ORIGINS` set to the exact prod domain, no localhost.
- `NODE_ENV=production` set everywhere.
- Backups confirmed running (check the backup volume has a file within 1 h of first run).
- Monitoring dashboards show green for all services.
- First tenant signup works end to end through Caddy HTTPS.
- Logo upload from a real file works (base64 or S3 depending on config).
- Invoice PDF renders with the real company legal name and real PAN.
- RLS proof SQL script re-run against production DB — every tenant-scoped table shows `distinct_tenant_id = 1` per tenant scope.

Commit the plan + the Dockerfiles + the compose + the bootstrap script + the docs in one commit: `feat(ops): production dockerfiles, compose, deploy guide, go-live checklist`.

---

## 5. Notification bell — rebuild as a real notification center

Audit: `apps/web/src/components/top-header.tsx` lines 213–244. Dropdown is 72 px wide, shows at most 5 notifications as raw text pills, no icons, no timestamps, no read/unread state, no actions, no "Mark all read". The API already exposes `listNotifications`, `markNotificationRead`, `markAllRead` — none of them used.

Rebuild against **Linear + Slack** reference patterns.

5.1 **Bell button in the top bar** — stays small, `h-9 w-9` rounded icon button. Shows a numeric badge with the unread count (top-right, `bg-brand text-inverse`, `text-[10px] px-1`, max displayed `99+`). Pulses subtly for 2 s when a new notification arrives (`animate-pulse` once).

5.2 **Dropdown panel** — opens on click, 400 px wide on desktop, full-width sheet on mobile. Layout:
- Header (sticky at top of panel): title "Notifications", a filter chip row (`All` / `Unread` / `Mentions` / `System`), a settings icon linking to `/settings/notifications`, a `✓ Mark all as read` button (enabled only if unread > 0).
- Body: grouped notifications by relative date — `Today`, `Yesterday`, `This week`, `Earlier`. Each group has an uppercase 11 px tracking-wide label.
- Each notification row:
  - Icon on the left (24 × 24) colored by type: approval (clipboard), invoice (receipt), payment (credit card), reminder (bell), system (sparkles), security (shield), import (file). Icons from lucide-react.
  - Title (`text-sm font-semibold text-primary`) + message (`text-xs text-secondary` with 2-line clamp).
  - Relative timestamp (`text-[11px] text-muted`) e.g. "2 min ago", "3 h ago", "Yesterday".
  - Unread indicator: a 6 px brand-color dot on the far right; row background `bg-brand-subtle/30` when unread.
  - Hover: `bg-surface-sunken`.
  - Row-click: navigates to the notification's `actionUrl` (e.g. an invoice detail), marks it read.
  - Overflow menu (3-dot): `Mark as read` / `Mark as unread` / `Snooze 1 h` / `Dismiss`.
- Footer (sticky at bottom): `View all notifications →` link to a new full-page route.
- Infinite scroll inside the panel: loads 20 at a time.
- Empty state: a muted icon + "You're all caught up" + a line about notification settings.
- Error state: inline retry.

5.3 **Full page `/notifications`** — same list but full width, with filters in a left rail (type, severity, date range, company), search box, bulk-select with `Mark selected read` / `Delete selected`.

5.4 **Realtime.** Poll `/v1/notifications?limit=20` every 30 s when the tab is focused. When a new notification arrives, show the pulse + an optional native browser notification (with user permission, asked once from `/settings/notifications`). Pause polling when the tab is backgrounded.

5.5 **API contract.** Reuse `listNotifications`, `markNotificationRead`, `markAllRead`. If the DTO lacks `actionUrl`, group counts, or `category`, flag it in `docs/BACKEND_NOTIFICATION_GAP.md` — the UI falls back cleanly when fields are missing but the gaps are documented for a follow-up API ticket.

5.6 **Settings → Notifications** should get a small refresh too: the existing channel toggles stay, add an "Allow browser push" toggle that triggers the permission prompt.

**Acceptance:**
- Create an invoice as user A; user A's bell shows a notification in real time within 30 s. Click it → navigates to the invoice detail.
- Fire 25 notifications; dropdown shows 20 with "Load more" that loads the next 20.
- Mark one as read → unread count decrements, dot disappears.
- Mark all as read → all unread states clear, badge hides.
- Dark mode and mobile viewport: both themes consistent.
- Keyboard: `b` opens the bell dropdown, `↑/↓` navigates rows, `Enter` opens the notification, `r` marks read, `Esc` closes. Document in the `?` shortcuts sheet.
- axe-core: zero serious violations.

Commit: `feat(notifications): Linear-style notification center with grouping, actions, realtime, full page`.

---

## 6. Verification before you call this done

- Visual regression per page per theme per viewport against the current baselines; any regression is a fix, not a tolerance bump.
- Export fresh screenshots for user review to `docs/ui-review-v3/`:
  - `shell-scroll-sidebar-pinned.png` (scroll to bottom of `/items`, show sidebar still visible).
  - `invoice-edit.png`, `invoice-split.png`, `invoice-preview.png` (same invoice in each mode).
  - `pagination-invoices.png`, `pagination-items.png`, `pagination-reports.png`.
  - `notifications-dropdown.png`, `notifications-full-page.png`.
  - All in light + dark.
- A new 3-minute screencast: open the app, navigate to `/items`, scroll (sidebar stays), open `/invoices/new`, toggle Edit→Preview→Split, create an invoice that triggers an approval notification, click the bell, open the notification, approve the invoice from the detail page. Record in both light and dark.
- `TEST_LOG.md` appends a `UI_REFRESH_V3` section with one line per acceptance criterion above, pass/fail, and the commit SHA that satisfied it.

---

## 7. What you will NOT do

- No codemods. Hand-edit every file.
- No reverting the V2 fixes — build on them.
- No downsizing acceptance counts. Every pager works on every listed page. Every view mode on invoice/new works. Every notification affordance is live.
- No faking production-deploy artifacts. The Dockerfiles must actually build; the compose must actually come up on a fresh VM; the bootstrap script must actually run end-to-end. Attach the output of a dry-run on an Ubuntu 22.04 VM (lima, Multipass, or a cloud VM — your choice) as `docs/ops/first-boot.log`.
- No merging to `dev` until the user has reviewed `docs/ui-review-v3/` screenshots and the screencast and said OK.

**Begin. Stream logs, commit per section, open the PR with before/after screenshots and the first-boot log attached.**
