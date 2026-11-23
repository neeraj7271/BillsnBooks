# Production-Readiness Audit — BillsnBooks / "Antigravity Books"

**Reviewer:** Independent engineering review (architecture, security, accounting correctness, data, UX, DevOps, testing)
**Date:** 2026-11-23
**Scope:** `apps/api` (NestJS), `apps/web` (Next.js), `apps/worker`, `packages/*`, migrations, Docker, CI, tests.
**Baseline:** Audited against the **committed** code (branch `main` / HEAD). An uncommitted `dev` branch already remediates several auth findings; these are flagged **[fixed on dev]** where relevant. Nothing in this report required code changes.

---

## 1. Executive Summary

BillsnBooks is an ambitious, India-specific double-entry accounting + GST + CA-practice platform. The **accounting kernel is genuinely well-built** — a framework-free domain model, 4-decimal `Money`, and database-level invariants (balance, immutability, period-lock triggers, row-level security). The **breadth is large and coherent**: companies/branches, chart of accounts, parties, items, invoicing, approvals, vouchers, banking reconciliation, imports, collections, reports, practice management, settings, notifications, Tally.

However, **it is not production-ready.** The gap is not features — it is correctness, security, and the difference between "demo works" and "safe with real multi-tenant money." The most serious issues:

| # | Severity | Finding | Where |
|---|----------|---------|-------|
| 1 | **Critical** | No authentication on ~170 of ~176 endpoints; identity trusted from client headers / default UUIDs | all controllers **[fixed on dev]** |
| 2 | **Critical** | Cross-tenant IDOR in the **entire Reports module** — any company id is accepted regardless of tenant, and the tenant context is rebound to the victim's tenant | `reports.service.ts:77` `resolveCompanyAndTenant` |
| 3 | **Critical** | Payment-gateway callback is a **mock with no signature verification** — anyone can mark a payment link as paid and trigger a receipt voucher | `collections.service.ts` `simulatePaymentCallback` |
| 4 | **High** | Invoice→ledger posting **silently plugs cess and round-off into the Sales revenue line**; cess liability is never booked | `invoice.service.ts` `postSalesVoucherForInvoice` |
| 5 | **High** | Financial **reports compute in JS floating-point**, load all journal rows into memory, hardcode FY start `2024-04-01`, and omit equity ledgers from the balance sheet | `reports.service.ts` |
| 6 | **High** | Secrets have hardcoded fallbacks; JWT/encryption keys default to publicly-known strings; no startup validation | `jwt-auth.guard.ts`, `auth.service.ts`, `encryption.transformer.ts` **[fixed on dev]** |
| 7 | **High** | The "Shared Accounting Intelligence Engine / OCR" is a **hardcoded mock**; "AI narration scan" is keyword `includes()` | `intelligence/mock-ai.provider.ts`, `sales-discovery.service.ts` |
| 8 | **Medium** | No RBAC enforced (roles exist, unused); RLS has no `WITH CHECK`; audit log is not truly append-only/hash-chained; dev DB runs as superuser (bypasses RLS) | guards, migrations |
| 9 | **Medium** | Worker only flips outbox rows to `PUBLISHED` and publishes nowhere; BullMQ/Redis/MinIO provisioned but unused | `apps/worker`, `docker` |
| 10 | **Medium** | Giant services (reports 2.1k, invoice 1.2k, collections 1.1k LOC), no ESLint config, ~478 `any`, no react-query despite install | `apps/*` |

**Verdict:** Strong foundation, **demo-grade delivery.** With focused work on the P0 security/correctness items (1–6), this can become a credible beta. As-is it must not touch real customer data or money.

**Readiness scorecard (1–5):**

| Dimension | Score | Note |
|---|---|---|
| Accounting kernel & DB invariants | 4 | Best part of the system |
| Security (authn/authz/tenant) | 1 | Open API + cross-tenant IDOR |
| Financial reporting correctness | 2 | Float math, FY hardcode, BS omits equity |
| Architecture & boundaries | 3 | Good intent, partly unimplemented |
| Data model & migrations | 4 | Solid, reversible, invariant-rich |
| Frontend UX & flows | 3 | Rich, consistent, but a11y/state gaps |
| Integrations (Tally/AI/payments) | 1 | Mostly mocked/simulated |
| Infra / worker / observability | 2 | Outbox dead-ends; no real async tier |
| Testing | 2 | Good unit kernel; zero authz/tenant tests |

---

## 2. Scope & Method

Read end-to-end: domain core (`accounting-core`, `gst-rules`), every API controller and the major services (voucher, invoice, reports, collections, banking, import, numbering, tally, settings, practice, notification, auth), persistence (entities, 11 migrations, transformers, unit-of-work, outbox), infra (Docker, CI, worker), and the web app (api-client, company context, shell/sidebar, invoice/imports/reports/banking flows). Dynamic testing (running the stack, pen-testing) was **not** performed; findings are from static review and the project's own logs. Pass/fail claims about tests reflect the repo's own `test-results` and local runs of the unit suite.

---

## 3. System Architecture

### 3.1 Topology
Modular monolith: Next.js 14 (App Router) → NestJS 10 REST API → PostgreSQL 16, with a separate NestJS worker. Docker Compose provisions Postgres, Redis, MinIO. pnpm workspace + Turborepo. Swagger at `/v1/docs`.

### 3.2 Monorepo & dependency direction (good intent, partial)
- `packages/accounting-core` and `packages/gst-rules` are **pure** (no NestJS/TypeORM) — the dependency rule holds here. ✅
- **Claimed but missing:** `dependency-cruiser` enforcement, repository/port interfaces (`IVoucherRepository`, etc.), and a `packages/testing`. Services talk to TypeORM directly via `qr.manager`; only vouchers have a domain mapper. So "Ports & Adapters / hexagonal" is aspirational for most modules. Reality is a clean-ish layered monolith, not hexagonal.
- Config package (`@platform/config`) holds a strict tsconfig base (noUnusedLocals, noUncheckedIndexedAccess) used by `packages/*` — but **`apps/api/tsconfig.json` does not extend it**, so the API is checked under weaker rules.

### 3.3 Data model
~50 entities, tenant_id-scoped, NUMERIC(20,4) money columns via a `DecimalTransformer`. ERD is coherent (tenant→company→branch→FY→vouchers→journal entries; parties/items/invoices; banking; practice; collections; settings; numbering). Migrations are reversible and ship real SQL invariants (§5.1). This is the most production-shaped part of the codebase.

### 3.4 Tech-stack risk notes
- `packageManager: pnpm@12.14.0` while `engines.pnpm: >=9` — pin vs range mismatch; CI uses 12.14.0.
- react-query + zustand are dependencies but **used nowhere** in the web app (0 references).

---

## 4. Security Audit (most urgent)

### 4.1 Authentication — Critical **[fixed on dev]**
On `main`, `JwtAuthGuard` is applied to exactly one route (`GET /v1/auth/me`). Every other controller derives identity as `req.user?.tenantId || req.headers['x-tenant-id'] || '<hardcoded default UUID>'`. Consequences:
- The API is effectively **unauthenticated**; any caller sets `x-tenant-id`/`x-user-id` headers to act as any tenant/user, or falls through to a baked-in demo tenant.
- The web client sends those headers from `localStorage`, so the server trusts client-asserted identity.
*Dev branch* registers a global `JwtAuthGuard` + `@Public()` allowlist and removes the header/default fallbacks across all 17 controllers.

### 4.2 Cross-tenant IDOR in Reports — Critical (NOT fixed on dev)
`reports.service.ts` → `resolveCompanyAndTenant()`:
```
where: [{ id: companyId, tenantId }, { id: companyId }]   // second clause ignores tenant
const actualTenantId = company?.tenantId || tenantId;     // rebinds to the victim's tenant
await qr.query("SELECT set_config('app.tenant_id', $1, true)", [actualTenantId]);
```
Every report method calls this. A user supplies a `companyId` from **another tenant**, and the service (a) returns that company and (b) **re-points the RLS context to the other tenant** for the rest of the request. This defeats tenant isolation even with authentication working, and even with RLS enabled. **Must be removed** — resolve company strictly by `{ id, tenantId }` and 404 otherwise; never set `app.tenant_id` from a client-supplied company.

### 4.3 Authorization / RBAC — High
`UserRole` enum exists (SUPER_ADMIN, FIRM_PARTNER, STAFF_ACCOUNTANT, CLIENT_APPROVER, CLIENT_VIEWER) but **no route enforces roles** on `main`. A CLIENT_VIEWER can post vouchers, approve invoices, lock periods, change settings. *Dev branch* adds a `@Roles()` decorator + global `RolesGuard` and applies it to period lock/unlock and invoice/approval approve-reject; broader role mapping still needs product decisions.

### 4.4 Tenant isolation at the DB — Medium/High
- RLS is `ENABLE` + `FORCE` with `USING (tenant_id = NULLIF(current_setting('app.tenant_id', true),'')::uuid)`. Fails closed when unset. ✅ design.
- **No `WITH CHECK`** clause → RLS restricts read/update/delete visibility but does **not** constrain the tenant_id written on INSERT.
- `TenantGuard` on `main` calls `runWithContext(ctx, () => Promise.resolve())` — the context ends immediately and never wraps the handler, so `set_config` is effectively never applied by the guard; isolation on `main` rests only on per-query `where tenantId`. *Dev branch* replaces this with a `TenantContextInterceptor` that wraps the whole handler in AsyncLocalStorage.
- **Operationally:** `apps/api/.env` uses DB user `neeraj` with no password (likely a Postgres **superuser**, which BYPASSES RLS entirely). RLS must be validated under a non-superuser role or it is decorative.

### 4.5 Secrets — High **[fixed on dev]**
`JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY` all have hardcoded fallbacks in code (e.g. `'jwt-accounting-secret-key-32b'`, `'accounting-dev-master-encryption-key-32b'`). No startup validation. A misconfigured deploy would sign/verify tokens and encrypt PII with publicly-known keys. *Dev branch* adds fail-fast validation (`assertSecretsConfigured`), removes fallbacks, and makes the encryption key lazy (so migrations still run).

### 4.6 Payment callback spoofing — Critical
`POST /collections/payment-links/:linkId/callback` → `simulatePaymentCallback()` performs **no gateway signature/HMAC verification**. Any unauthenticated party (the route is also unguarded on `main`) can POST a "paid" callback, which can book a receipt and settle an invoice. Payment-link token is only `crypto.randomBytes(6)` (48-bit). Real gateways (Razorpay/Cashfree per `open-questions.md`) require webhook signature verification and idempotency — none present.

### 4.7 Token lifecycle — High **[fixed on dev]**
Access token (15 min) is the only token stored on `main`; `refreshTokens()` exists in the service but has **no route**, and the web has no 401/refresh handling → sessions silently die every 15 minutes. No logout revocation. *Dev branch* adds `/v1/auth/refresh` + `/logout`, stores the refresh token, and does transparent one-shot refresh-on-401 in the client.

### 4.8 Other security notes
- **Credentials committed in tests:** `tests/e2e/helpers/auth.ts` hardcodes a real-looking email + `SecurePassword123!`.
- **CORS:** `main` allows any `localhost` origin and otherwise only `CORS_ORIGIN`. *Dev branch* tightens to a `CORS_ORIGINS` allowlist (localhost only outside production).
- **Body limit:** global 25 MB JSON (to support base64 logos) — DoS surface; prefer multipart upload with per-route limits.
- **Rate limiting:** none on `main` (no throttler/lockout). *Dev branch* adds an in-memory login throttle; a distributed limiter (Redis) is the production answer.
- **File upload (imports):** CSV/XLSX parsing — validate MIME/size/row-count ceilings and treat uploads as untrusted; confirm no formula/CSV-injection passthrough into exports.
- **Validation:** `ValidationPipe` with whitelist/forbidNonWhitelisted is enabled globally (good), but controllers parse `@Query` as raw strings with hand `parseInt`, and use `req: any` throughout.

---

## 5. Data Integrity & Accounting Correctness

### 5.1 Double-entry kernel — Strong ✅
- `Money` (decimal.js, 4 dp, rejects negatives, currency-guarded). `Voucher.validateBalance()` requires ≥1 debit, ≥1 credit, and Σdebit = Σcredit. Posted vouchers are immutable; reversals are the only correction path. Idempotency keys on create.
- DB-enforced invariants (migration `1730300000000`): deferred constraint trigger for balance, immutability triggers on posted vouchers/journal entries, period-lock trigger on insert. These are the right controls and rare to see done well.
- Voucher **number allocation uses `SELECT … FOR UPDATE`** (pessimistic, gap-free). ✅

### 5.2 Invoice → ledger posting — High severity bug
`postSalesVoucherForInvoice()`:
- **Ledger resolution by fuzzy name match** (`name ILIKE '%Sales%'`, `'%Debtor%'`, `name.includes('CGST'/'SGST'/'IGST')`, `getOne()` with no ordering). Rename or duplicate a ledger and it silently picks the wrong account or throws.
- **Cess is computed but never posted** as a credit line, yet it is included in the customer debit (total). The code then detects the debit≠credit variance and **adds it to the Sales credit line** — so cess liability is misbooked as sales revenue. Round-off is handled the same way (plugged into Sales) rather than a dedicated Round-Off ledger.
- **RCM (reverse charge) ignored** at posting even though `isRcm` exists on the invoice.
Net effect: revenue overstated, output-tax/cess liability understated whenever cess or rounding is non-zero. This is a statutory-accuracy problem, not cosmetic.

### 5.3 Invoice numbering race — Medium **[fixed on dev]**
When no numbering series is configured, the fallback is `count(invoices)+1`, which races under concurrency. A unique constraint `uq_company_invoice_number` prevents actual duplicates, so the race surfaces as a 500. *Dev branch* retries auto-numbering on that unique violation. (When a series **is** configured, `numbering.service.allocateNextNumber` is pessimistically locked and correct.)

### 5.4 Reports correctness — High
- **Floating-point money:** trial balance / P&L / balance sheet pull raw rows (`getRawMany`) and sum with JS `Number` + `Math.round(x*100)/100`. Diverges from the 4-dp canonical ledger and accumulates error at scale.
- **Hardcoded FY start:** `getBalanceSheet` calls `getProfitAndLoss(..., '2024-04-01', asOfDate)` — wrong for any FY other than 2024-25.
- **Balance sheet omits equity:** only `LIABILITY`-nature rows are summed as liabilities; `EQUITY`-nature ledgers (capital, reserves) are dropped from both sides, and net profit is bolted on as a proxy. The statement will not reconcile for real books; `isBalanced` uses a `< 0.05` float tolerance.
- **Scalability:** every report loads all journal entries up to the date into memory and aggregates in JS — should be SQL `SUM … GROUP BY ledger_id, entry_type` with date predicates and indexes.

### 5.5 Imports — Medium
`postBatchToVouchers` posts rows by calling `createAndPostVoucher` across **separate `executeInTransaction` calls per row**. A failure mid-batch leaves earlier rows committed → partial posting with no atomic rollback of the batch. Blocked-row guard exists, but the posting loop itself is not atomic. Imports only ever post `VoucherType.SALES`.

### 5.6 Audit trail — Medium
Audit rows store a `recordHash = sha256(payload + Date.now())` but it is **not chained** to the previous row's hash and there is **no append-only trigger** on `audit_logs` (only the RLS policy). So deletion/reordering is not tamper-evident despite the "append-only" claim.

---

## 6. Flow-by-Flow Analysis

For each flow: **Works / Gaps / Risk**.

### 6.1 Auth & onboarding
**Works:** Register creates tenant + SUPER_ADMIN, Argon2id hashing, auto tenant name/slug, token issue. **Gaps:** no email verification, no MFA (claimed in architecture), no refresh route on `main`, credentials trusted from headers downstream. **Risk:** High (identity is the whole security model).

### 6.2 Company & branch setup
**Works:** 3 modes (Standalone / Tally Sync / Invoicing-Only), branch with state code, CoA seed on create. **Gaps:** company fetched by `{id}` only in a few places (see reports IDOR, share service); state name/code integrity previously buggy (BUG-006). **Risk:** Medium.

### 6.3 Chart of accounts
**Works:** groups/ledgers tree, seeder (`coa-v1.json`), protection metadata, Tally aliases hidden when Tally off. **Gaps:** ledger posting depends on name matching (§5.2) rather than a stable `classification`/system-ledger key. **Risk:** High (drives posting correctness).

### 6.4 Parties & items
**Works:** GSTIN validation + state detection, registration types, HSN/SAC, UQC units, 360 dialogs, party↔ledger link. **Gaps:** item/party GST snapshotting good but relies on fuzzy ledgers downstream. **Risk:** Low–Medium.

### 6.5 Invoicing
**Works:** POS resolution, per-line GST via `gst-rules`, intra/inter-state, discounts, amount-in-words, document types (tax/proforma/challan), unregistered-seller handling (BUG-005 fixed), templates. **Gaps:** cess/round-off posting bug (§5.2), client vs server math drift (§8), numbering fallback race (fixed on dev). **Risk:** High (statutory accuracy).

### 6.6 Approvals (maker-checker)
**Works:** >₹50k or flagged invoices quarantine to an approval inbox; approve posts the canonical voucher idempotently; reject cancels. **Gaps:** no role enforcement on `main`; approver can equal maker (no segregation-of-duties check). **Risk:** Medium.

### 6.7 Vouchers & periods
**Works:** manual JV with live balance check, payment/receipt/contra, pessimistic numbering, reversal, period-lock trigger. **Gaps:** **reversal skips the application period-lock check** (createAndPost checks it; reverse does not) — a reversal dated today could still be blocked by the DB trigger but the service won't pre-validate; also reversals write outbox but not an audit row. **Risk:** Medium.

### 6.8 Banking & reconciliation
**Works:** statement upload/parse (bank registry + metadata scanner), BRS workbench, match candidates with confidence/reasons, match/unmatch. **Gaps:** balances in float; matching is heuristic; parser robustness across bank formats unverified. **Risk:** Medium.

### 6.9 Sales discovery
**Works:** scans UNMATCHED credits, raises tickets, converts to vouchers + reconciles. **Gaps:** "AI narration scan" is `narration.includes('…')` keyword matching, not AI. **Risk:** Low (functional) / Medium (over-claimed in UI).

### 6.10 Imports (bulk)
**Works:** 4-step wizard (upload→map→validate→post), missing-master scan/resolve, GST auto-fix, RED-row blocking. **Gaps:** non-atomic batch posting (§5.5); SALES-only. **Risk:** Medium.

### 6.11 Collections
**Works:** AR ageing (summary/party/invoice), promise-to-pay, recurring schedules + run, payment links, settlements, reminders. **Gaps:** **payment callback spoofable** (§4.6); recurring run spans multiple transactions. **Risk:** High (money movement).

### 6.12 Reports & sharing
**Works:** catalog + favorites, customer/item sales, expenses, trial balance, GL, P&L, BS, export, tokenized share link. **Gaps:** cross-tenant IDOR (§4.2), float/FY/equity correctness (§5.4); the **public share page builds an export URL against the hardcoded default company** `c0000000-…` and hits an authed export route, so external sharing is effectively broken and leaks the demo company id. **Risk:** Critical (IDOR) + High (correctness).

### 6.13 Practice management
**Works:** clients, tasks + status + comments, document requests/upload/review, calendar, client stats. **Gaps:** auth/role gaps as elsewhere; document storage pathway (MinIO) not wired. **Risk:** Medium.

### 6.14 Settings (layered)
**Works:** registry-driven layered settings with history, copy/export/import, null-override deletes row (BUG-002 fixed), encrypted values via transformer. **Gaps:** encryption key fallback (fixed on dev). **Risk:** Low–Medium.

### 6.15 Notifications
**Works:** in-app notifications, settings, scheduler scan, test send. **Gaps:** on `main`, notification context **auto-discovered the "first" tenant/company/user** — a cross-tenant smell (fixed on dev to require ownership); scheduler is in-process. **Risk:** Medium.

### 6.16 Tally integration
**Works:** XML envelope generation (voucher + master), read-back parse, heartbeat + staleness → ONLINE/OFFLINE, master cache. **Gaps:** no live bidirectional sync in-repo (the Windows bridge is external); effectively a preview/mock; web hardcodes heartbeat values. **Risk:** Low (optional) / Medium (over-claimed).

---

## 7. User Journeys (end-to-end)

### J1 — CA practitioner (multi-client)
Sign up (CA) → tenant "X & Associates" (SUPER_ADMIN) → add client companies/branches → CoA seeds → masters → invoices/vouchers → approvals → banking/recon → reports → practice tasks. **Breaks at:** tenant isolation (any client/company id reachable cross-tenant via reports), role model (staff vs partner vs client-viewer unenforced), and report accuracy for real books. Journey *demoes* fully but is unsafe multi-tenant.

### J2 — Invoicing-only SMB
Sign up → Invoicing-Only mode → streamlined sidebar → create GST invoice → approve → share/print → collect via payment link. **Breaks at:** spoofable payment callback, cess/round-off posting error, 15-min silent logout (fixed on dev), share link targeting the default company.

### J3 — Standalone cloud bookkeeper
Full accounting: JVs, periods, BRS, P&L/BS. **Breaks at:** balance sheet omits equity + hardcoded FY → statements won't reconcile for real data; float rounding; reversal/period-lock edge.

Across all journeys the **happy path is impressively complete**; the failures are at the boundaries that matter for production (isolation, money, statutory accuracy).

---

## 8. Frontend / UX / Connectivity

**Connectivity:** one `request()` wrapper in `api-client.ts` (1,354 LOC single object); unwraps `{success,data}`, normalizes errors, injects `x-tenant-id`/token from `localStorage`. Routes match the backend. **State:** every page uses `useEffect` + local state — **no caching/dedupe/retry**; `@tanstack/react-query` and `zustand` are installed but unused. **Auth gating** is client-only (`app-shell` checks token in `localStorage`); no Next middleware or server session.

**Strengths:** mode-adaptive sidebar, command palette, dark mode, print styles, live GST math, balance indicator, amount-in-words, UPI QR, maker-checker inbox, multi-step import wizard, back-button E2E coverage. Consistent try/catch + loading state across ~42 pages.

**Gaps:**
- **Client-side GST math is a float re-implementation** (`invoice-math.ts`) separate from the server's Decimal engine → preview totals can drift from stored values.
- **Hardcoded default IDs** (`c0000000-…` company, `a0000000-…` tenant) throughout the client, including the shared-report export URL.
- **No route-level `error.tsx` / `loading.tsx` / `not-found.tsx`** boundaries → a render throw has no fallback.
- **Accessibility is thin:** ~26 aria/role usages and 11 `alt` across ~107 files; 168 `<button>` often without `type` (form-submit hazard).
- **Giant pages** (600–840 LOC) are hard to keep consistent/accessible.
- Error surfacing is inconsistent (toast/alert in ~7 files, console elsewhere).

---

## 9. Infrastructure & DevOps

- **Worker/outbox:** `OutboxDispatcherService` polls with `FOR UPDATE SKIP LOCKED` (good pattern) but only flips rows to `PUBLISHED` — it **publishes to nothing**. BullMQ is a dependency, Redis + MinIO are in compose, but no queue/object-storage code exists. The "async worker tier / OCR / notification dispatcher" is not implemented. Worker runs a 1s `setInterval` with no shutdown/backoff/jitter.
- **Migrations:** 11, reversible, real SQL invariants; CI runs up→down→up. ✅
- **CI:** format-check, lint, typecheck, unit/property tests, migration verify with Postgres+Redis services. But **`pnpm lint` = `next lint` and there is no ESLint config nor `eslint`/`eslint-config-next` installed** → lint is effectively unconfigured (likely failing or no-op). `@platform/web` `test` is `echo`.
- **Observability:** a Prometheus `/metrics` endpoint exists; no structured logging, tracing, error tracking, or health/readiness wired to orchestration. `/v1/health` checks DB only.
- **Config:** `.env` committed-adjacent (gitignored) with weak dev secrets; no secret manager; superuser DB role.

---

## 10. Testing

- **Unit/property (kernel):** `accounting-core` and `gst-rules` have Jest + coverage (money, ledger, voucher property tests, GSTIN, POS, tax calculator). Good.
- **API:** 14 spec files (invoice, reports, collections, encryption, numbering, imports, tally, etc.). Locally, the touched subset passes (encryption, invoice.service, numbering, import-validation, file-parser, notification = 28/28).
- **E2E:** 21 Playwright specs; `test-results/.last-run.json` = passed. But they drive the UI against a running stack with a single hardcoded user.
- **Missing entirely:** any test for authentication, authorization/RBAC, tenant isolation, or RLS — exactly the areas that are broken. The `PROGRESS.md` "T-0xx PASS" log is a manual visual-QA record, not automated assertions, and should not be read as production sign-off.

---

## 11. Scalability & Performance

- Reports materialize full journal history in memory and compute in JS — O(entries) memory/CPU per report, no caching, no pagination beyond a `take(100)`/`limit`. Will not scale past small books.
- List endpoints cap at 100 with no cursor/offset pagination contract.
- Single process for all modules; worker is a 1s poller; no queueing, no horizontal story beyond "add replicas" (which the in-memory login throttle and in-process scheduler would then fragment).
- No evidence of composite indexes for the hot report/ledger queries (verify `journal_entries(tenant_id, voucher_id)`, `(ledger_id)`, `vouchers(company_id, status, voucher_date)`).

---

## 12. Prioritized Remediation Roadmap

**P0 — before any real/multi-tenant data (blockers):**
1. Enforce authentication globally; delete header/default-UUID identity fallbacks. *(done on dev — commit it)*
2. **Remove the reports cross-tenant IDOR** (`resolveCompanyAndTenant`): resolve by `{id, tenantId}`, 404 otherwise, never rebind `app.tenant_id` from client input.
3. Fix the **invoice→ledger posting**: book cess to a cess-liability ledger, round-off to a Round-Off ledger, resolve ledgers by stable system keys (not name matching), and handle RCM.
4. **Secure the payment callback** (gateway signature + idempotency) or disable payment links until a real gateway is integrated. *(partial auth fix on dev)*
5. Secrets fail-fast + no fallbacks; run the API as a **non-superuser** DB role and validate RLS actually filters. *(secrets done on dev)*
6. Add `WITH CHECK` to RLS policies.

**P1 — before beta:**
7. Reports: decimal/SQL aggregation, remove hardcoded FY, include equity in the balance sheet, add caching/pagination.
8. RBAC: map roles to routes (maker≠checker). *(mechanism on dev)*
9. Refresh-token route + client 401 handling. *(done on dev)*
10. Atomic import posting (single transaction or saga with compensation).
11. Implement the worker/outbox destination (real BullMQ consumers) or remove the unused infra and the "async tier" claim.
12. Append-only, hash-chained audit log (prev-hash linkage + DB trigger).
13. Replace mock OCR/AI with a real provider or clearly label as heuristic in the UI.

**P2 — hardening/maintainability:**
14. ESLint config + install; make `@platform/web test` real; extend API tsconfig to the strict base.
15. Move web to react-query (already installed); remove hardcoded default IDs; add `error.tsx`/`loading.tsx`.
16. Split the 1k–2k LOC services; introduce repository interfaces; add dependency-cruiser.
17. Accessibility pass (aria/alt/button type), rate limiting via Redis, structured logging + tracing + error tracking.
18. Remove committed test credentials; add authz/tenant/RLS test suites.

---

## 13. Appendix — Evidence pointers

- Auth fallbacks: every `*.controller.ts` `getContext`/`getTenantId` (pre-dev).
- Reports IDOR: `apps/api/src/modules/reports/reports.service.ts` `resolveCompanyAndTenant` (~line 77).
- Posting bug: `apps/api/src/modules/invoice/invoice.service.ts` `postSalesVoucherForInvoice` (~line 965).
- Reports float/FY/BS: `reports.service.ts` `getTrialBalance`/`getProfitAndLoss`/`getBalanceSheet` (~98–470).
- Payment callback: `apps/api/src/modules/collections/collections.service.ts` `simulatePaymentCallback`.
- Mock AI/OCR: `apps/api/src/modules/intelligence/mock-ai.provider.ts`; discovery keyword scan in `sales-discovery.service.ts`.
- DB invariants/RLS: `apps/api/src/infrastructure/persistence/migrations/1730300000000-InitialSchemaAndInvariants.ts`.
- Worker dead-end: `apps/worker/src/processors/outbox.processor.ts`.
- Share→default company: `apps/web/src/app/reports/shared/[token]/page.tsx`.
- Committed creds: `tests/e2e/helpers/auth.ts`.

*Prepared from a static read of the committed codebase. A dynamic security test and a load test are recommended before the P0 items are signed off.*
