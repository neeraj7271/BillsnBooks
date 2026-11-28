# Auth & Onboarding (routes: `/auth/login`, `/auth/signup`, `/auth/accept-invite`, `/settings/companies`)

## Purpose
Handles multi-tenant user registration, JWT authentication (`15m` access / `7d` refresh), colleague invitation acceptance, first-company provisioning (auto-seeding CoA, FY, head-office branch, and sales voucher sequence), company switching, and PostgreSQL RLS tenant isolation.

## User journey
1. Open `/auth/signup`, select profile (`CA`, `BUSINESS`, or `ACCOUNTANT`), enter firm/business name, first/last name, email, and password (`>= 8` chars), and click **Create Account** → creates tenant (`plan = 'PRO'`) + `FIRM_PARTNER` user and redirects to `/settings/companies?welcome=true`.
2. Create the first company in `/settings/companies` → atomically seeds `Company`, `FY`, `Head Office` branch, statutory CoA (`TRADER`), and `INV/.../YY-YY` sales voucher sequence.
3. Switch companies anytime from `TopHeader` (`⌘⇧C` or dropdown).
4. Existing users sign in at `/auth/login` → redirects to `/settings/companies`.
5. Invited colleagues open `/auth/accept-invite?token=<hex>` → set password → redirects to `/practice`.

## Validations & rules (from code)
- **Sign Up** (`apps/web/src/app/auth/signup/page.tsx:28-36`, `apps/api/src/modules/auth/auth.service.ts:80-134`, `dto/auth.dto.ts:3-30`):
  - Frontend: missing name/email/password → `'Please fill in your name, email, and password.'`; `< 8` chars → `'Password must be at least 8 characters long.'`.
  - Backend: `@IsEmail()`, `@MinLength(8)`; duplicate email via `auth_email_exists($1)` → `409 Conflict`: `'User with this email already exists'`.
- **Login & Brute-Force Throttle** (`apps/web/src/app/auth/login/page.tsx:17-20`, `auth.service.ts:33-67, 220-229`):
  - Empty fields → `'Please provide email and password.'`.
  - `MAX_LOGIN_ATTEMPTS = 5` within `LOGIN_WINDOW_MS = 15m` → `429 Too Many Requests`: `'Too many failed login attempts. Try again in <N> seconds.'`.
  - Inactive/unknown email → `401`: `'Invalid credentials or account inactive'`; wrong password → `401`: `'Invalid credentials'`.
- **Accept Invite** (`auth.service.ts:291-332`, `accept-invite/page.tsx:35-53`):
  - Missing token → `401`: `'Invalid invitation link.'`; non-`PENDING` → `409`: `'Invitation is already <status>.'`; expired (`7` days) → `401`: `'Invitation has expired.'`.
  - *(Note: `auth.controller.ts:62` accepts inline body without `@MinLength(8)` and `accept-invite/page.tsx` lacks `< 8` char check.)*
- **Company Auto-Seeding** (`apps/api/src/modules/company/company.service.ts:113-174`, `company.controller.ts:21`):
  - Restricted to `SUPER_ADMIN` / `FIRM_PARTNER`; empty `legalName` → `400`: `'Legal name is required.'`.
  - Seeds Company (`INR`), `FinancialYearOrmEntity`, `Head Office` branch (`stateCode` from first 2 chars of `gstin` or `'27'`), `ChartOfAccountsSeeder.seedForCompany` (skipped if `accountingMode === 'TALLY_CONNECTED'`), and `VoucherSequenceOrmEntity` (`INV/`, 4-digit padding).
  - *(Edge note: `company.service.ts:131-139` uses `new Date().getFullYear()` without Jan–Mar FY adjustment.)*
- **RLS & Cross-Tenant Guard** (`apps/api/src/common/interceptors/tenant-context.interceptor.ts:31-42`, `unit-of-work.service.ts:40-43`):
  - Mismatched `x-tenant-id` header (non-`SUPER_ADMIN`) → `403`: `'Cross-tenant access forbidden'`.
  - Every transaction executes `SELECT set_config('app.tenant_id', $1, true)` so PostgreSQL `FORCE ROW LEVEL SECURITY` isolates rows.

## Test cases

| # | Case | Type | Data to use | Steps | Expected result (cite code) |
|---|------|------|-------------|-------|-----------------------------|
| 1 | Register new firm tenant & user | Happy | Signup row `SIGNUP-01` (`ananya@mehtaassociates.in`) | `/auth/signup` → select `CA` → fill form → **Create Account** | `201 Created`; tenant (`PRO`) + `FIRM_PARTNER` user created; redirected to `/settings/companies?welcome=true` (`auth.service.ts:80-134`, `signup/page.tsx:58-61`). |
| 2 | Create first company with auto-seeding | Happy | `CO-01` (`Mehta Precision Mfg Pvt Ltd`, GSTIN `27AABCM1234F1Z5`) | `/settings/companies` → **New Company** → save | Company, `FY`, `Head Office` branch (`stateCode: '27'`), CoA ledgers (`/settings/ledgers`), and `INV/` sequence created (`company.service.ts:113-174`). |
| 3 | Sign in & switch between two companies | Happy | Create `CO-02`, sign out, sign in at `/auth/login` | `/auth/login` → TopHeader `⌘⇧C` → select `CO-02` | Redirects to `/settings/companies`; `antigravity_active_company_id` updates and pages reload `CO-02` data (`company-context.tsx:84-117`). |
| 4 | Accept team invitation | Happy | Token from `/practice/team` invite | Open `/auth/accept-invite?token=...` → enter name & password → submit | User created as `FIRM_COLLEAGUE`, invite marked `ACCEPTED`, redirects to `/practice` (`auth.service.ts:308-332`). |
| 5 | Concurrent 401 token refresh | Edge | Expired access token + valid refresh token | Trigger parallel API requests after 15m (or clear access token) | `refreshPromise` deduplicates refresh call and retries requests transparently (`api-client.ts:30-67`). |
| 6 | Duplicate email on signup | Negative | `ananya@mehtaassociates.in` (already registered) | `/auth/signup` with existing email | `409 Conflict`: `'User with this email already exists'` (`auth.service.ts:80-86`). |
| 7 | Short password (`< 8` chars) on signup | Negative | Password `Pass@1` (6 chars) | `/auth/signup` → **Create Account** | Client-side error `'Password must be at least 8 characters long.'` (`signup/page.tsx:33-36`). |
| 8 | Brute-force lockout after 5 failed logins | Negative | `ananya@mehtaassociates.in` + wrong password 6× | `/auth/login` → submit wrong password 5×, then 6th time | 1–5 return `401` `'Invalid credentials'`; 6th returns `429` `'Too many failed login attempts. Try again in ... seconds.'` (`auth.service.ts:33-67`). |
| 9 | Expired / reused invitation link | Negative | Used token from Case 4 | Re-open `/auth/accept-invite?token=...` | `409`: `'Invitation is already accepted.'` (`auth.service.ts:291-301`). |
| 10 | Cross-tenant `x-tenant-id` spoof | Negative | Tenant B JWT + Tenant A `x-tenant-id` | `GET /v1/companies` with Tenant A header | `403 Forbidden`: `'Cross-tenant access forbidden'` (`tenant-context.interceptor.ts:31-42`). |

## Edge & boundary cases
- **Stale `activeCompanyId` in `localStorage`:** If `localStorage` holds a company ID belonging to another tenant or deleted company, `CompanyProvider` falls back to `companyList[0].id` (`company-context.tsx:84-117`).
- **Tally-connected mode:** Creating a company with `accountingMode === 'TALLY_CONNECTED'` skips CoA auto-seeding (`company.service.ts:154-160`).

## Negative / error cases
- Missing JWT token on any protected route → `401` `'Missing authentication token'` (`jwt-auth.guard.ts:39`).
- Missing `legalName` on `POST /v1/companies` → `400` `'Legal name is required.'` (`company.service.ts:114-116`).

## State/UI checks
- `/auth/login`, `/auth/signup`, `/auth/accept-invite` render cleanly in both light and dark themes.
- Signing out clears tokens and redirects to `/auth/login` (`top-header.tsx`).

## Realistic data (Type-in)

| Ref | Flow | Firm / Company Name | Name | Email | Password | GSTIN / State |
|-----|------|---------------------|------|-------|----------|---------------|
| `SIGNUP-01` | Signup | `Mehta & Associates CA` | `Ananya Mehta` | `ananya@mehtaassociates.in` | `MehtaCA@2026` | — |
| `CO-01` | Company | `Mehta Precision Mfg Pvt Ltd` | — | — | — | `27AABCM1234F1Z5` (`27` MH) |
| `CO-02` | Company | `Mehta Logistics South LLP` | — | — | — | `29AABCM5678G1Z2` (`29` KA) |
