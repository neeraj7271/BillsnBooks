# Reports (routes: `/reports`, `/reports/*`, `/reports/shared/[token]`)

## Purpose
Delivers 28 statutory financial, sales, expense, payable, and cash/bank audit reports with Excel/PDF/HTML export, pinned favorites, and time-limited public share links.

## User journey
1. Navigate to `/reports` to browse the 28-report catalog, filter by category or search, and star/unstar favorite reports.
2. Open **Trial Balance** (`/reports/trial-balance`), **Profit & Loss** (`/reports/profit-and-loss`), or **Balance Sheet** (`/reports/balance-sheet`), adjust `asOfDate` / `fromDate`–`toDate`, and verify accounting equilibrium (`Total Dr = Total Cr`, `Assets = Liabilities + Equity`).
3. Open **General Ledger** (`/reports/general-ledger`), select a ledger and date range, and inspect running balances.
4. Open **Customer Sales**, **Item Sales**, **Expenses**, **Payables**, or **Cash & Bank Audit** to inspect analytical breakdowns and statutory hygiene flags (Sec 40A(3) `> ₹10,000`, Sec 269ST `>= ₹2,00,000`, missing PAN/GSTIN).
5. Click **Export** (`XLSX` / `PDF` / `HTML`) or **Share** to generate a `rpt_<token>` public link (`/reports/shared/[token]`).

## Validations & rules (from code)
- **Tenant & Company Isolation** (`apps/api/src/modules/reports/reports.service.ts:83-107`):
  - `resolveCompanyAndTenant` filters strictly by `{ id: companyId, tenantId }` and sets `app.tenant_id` for PostgreSQL RLS.
- **Trial Balance Equilibrium** (`reports.service.ts:109-298`):
  - Aggregates only `POSTED` vouchers `<= asOfDate`; `isBalanced = netDifference === 0`.
- **Balance Sheet & Indian FY** (`reports.service.ts:459-532`):
  - Derives Indian FY start (`Apr 1` of FY, `:526-532`); computes current-year Net Profit using unrounded `_exactClosing*` balances to avoid 1-paise rounding drift; `isBalanced = variance.isZero()`.
- **Cash & Bank Audit Statutory Thresholds** (`reports.service.ts:1621-1895`):
  - `cash-negative`: running cash balance `< 0`
  - `bank-negative`: running bank balance `< 0`
  - `inter-bank`: `CONTRA` debits
  - `cash-over-10k` (Sec 40A(3)): cash `CREDIT > ₹10,000`
  - `cash-over-2l` (Sec 269ST): cash `DEBIT >= ₹2,00,000`
- **Payables & Ledger Hygiene** (`reports.service.ts:1346, 1901-2173`):
  - Vendor TDS flag at `totalAmount >= ₹30,000` (`:1346`).
  - Hygiene filters: `missing-pan` (Sec 206AA), `missing-gstin`, `squared-off`, `stagnant`.
- **Export & PDF Rendering** (`report-export.service.ts`, `pdf-render.service.ts:75-107`):
  - ExcelJS exports include `=SUM(...)` formulas and Indian `₹ #,##,##0.00` formatting; PDF uses headless Chromium A4.
- **Share Token Expiry** (`report-share.service.ts:31-32, 82-93`):
  - Token format `rpt_<32-hex>`, default 7-day expiry; expired token throws `GoneException`: `'This report link has expired. Please request an updated share link from your accountant.'`.

## Test cases

| # | Case | Type | Data to use | Steps | Expected result (cite code) |
|---|------|------|-------------|-------|-----------------------------|
| 1 | Reports hub catalog & favorite toggle | Happy | Seeded company | `/reports` → star/unstar a report → reload | `POST /v1/reports/favorites/:key/toggle` persists; Starred shelf updates (`reports.service.ts:821`). |
| 2 | Trial Balance balances after invoice + voucher | Happy | Posted invoice ₹1,18,000 + JV-01 | `/reports/trial-balance` → set `asOfDate` | `isBalanced: true`, `totalClosingDebit === totalClosingCredit` (`reports.service.ts:288-291`). *(Watch UI bug: `trial-balance/page.tsx:48-49` reads `totalDebit` instead of `totalClosingDebit`)* |
| 3 | Balance Sheet `Assets = Liabilities + Equity` | Happy | Same posted data | `/reports/balance-sheet` | `isBalanced: true`, `variance === 0`, `netProfitCurrentYear` matches P&L (`reports.service.ts:459-532`). |
| 4 | Profit & Loss Revenue vs Expenses | Happy | Posted sales + expense JV | `/reports/profit-and-loss` | `grossProfit = totalRevenue - totalDirectExpenses`; `netProfit = grossProfit - totalIndirectExpenses` (`reports.service.ts:411-457`). |
| 5 | Item Sales & Customer Sales aggregation | Happy | Posted B2B + B2C invoices | `/reports/item-sales`, `/reports/customer-sales` | Non-`CANCELLED` invoices aggregated accurately (`reports.service.ts:917-1164`). |
| 6 | Export Trial Balance / P&L to XLSX & PDF | Happy | Posted data | Click **Export Excel** & **Export PDF** | `.xlsx` opens with `=SUM(...)` & `₹` format; `.pdf` renders A4 via Chromium (`report-export.service.ts`, `pdf-render.service.ts:75-107`). |
| 7 | Share report link & open `/reports/shared/[token]` | Happy | Share Trial Balance | Click **Share** → copy `/reports/shared/rpt_...` → open in incognito | Public page loads report snapshot (`report-share.service.ts:31-93`). *(Watch bug: `shared/[token]/page.tsx:56` hardcodes company ID + calls auth-gated export)* |
| 8 | Cash Sec 40A(3) & Sec 269ST boundary | Edge | Cash payment ₹10,001 & ₹10,000; Cash receipt ₹2,00,000 & ₹1,99,999 | Post cash vouchers → `/reports/cash-bank-audit` | ₹10,001 flagged under `cash-over-10k` (₹10,000 not); ₹2,00,000 flagged under `cash-over-2l` (`reports.service.ts:1661-1848`). |
| 9 | Reversed/Cancelled invoice excluded from Sales & TB | Edge | Cancel an invoice / reverse a voucher | Re-run Customer Sales & Trial Balance | Cancelled invoices excluded from Sales (`:917`); reversed vouchers net to zero in TB (`:109`). |
| 10 | Expired share token rejected | Negative | Share token with `expiresAt < now` | Open `/reports/shared/<expired_token>` | `410 Gone`: `'This report link has expired. Please request an updated share link from your accountant.'` (`report-share.service.ts:82-93`). |
| 11 | Cross-tenant report access blocked | Negative | Tenant B token + Tenant A `companyId` | `GET /v1/companies/:tenantACid/reports/trial-balance` | `403 Forbidden` via tenant guard + RLS (`reports.service.ts:83-107`). |

## Edge & boundary cases
- **Known UI/Backend Contract Mismatches to flag during QA:**
  - `reports/trial-balance/page.tsx:48-49` reads `totalDebit`/`totalCredit` instead of `totalClosingDebit`/`totalClosingCredit`.
  - `reports/general-ledger/page.tsx:186,247-285` reads `report.entries` (`voucherDate`, `entryType`, `amount`, `particulars`) while backend returns `lines` (`date`, `debit`, `credit`, `narration`).
  - `reports/customer-sales/page.tsx:61,95` reads `totalAmount`/`taxAmount` while backend returns `totalSales`/`totalTax`.
  - `reports/cash-bank-audit/page.tsx:59-89,612-628` sends tab keys and reads columns that differ from `getCashBankAuditReport`.
  - `reports/payables/page.tsx:116` passes `toDate` as `method` param to `getPayablesAgeing`.

## Negative / error cases
- Invalid `fromDate > toDate` or nonexistent `ledgerId` on General Ledger returns empty/404 cleanly without crashing.
- Unsupported export report key on `GET /reports/:reportKey/export` returns `400 BadRequestException`.

## State/UI checks
- Empty states when 0 vouchers/invoices exist; loading spinners; light & dark theme tables; `tabular-nums` right-aligned Indian `₹` figures; back navigation to `/reports`.

## Realistic data
- Generated automatically from [sales-register-50.xlsx](./data/sales-register-50.xlsx), [purchase-register-50.xlsx](./data/purchase-register-50.xlsx), and manual vouchers in [money-banking.md](./money-banking.md).
- For Cash Audit boundary testing, enter these two cash vouchers in `/vouchers`:

| Ref | Type | Date | Dr | Cr | Expected Audit Flag |
|-----|------|------|----|----|---------------------|
| CASH-40A3 | `PAYMENT` | `15/04/2026` | `Office Expenses` ₹10,001.00 | `Cash in Hand` ₹10,001.00 | Flagged under `cash-over-10k` (`> ₹10,000`) |
| CASH-269ST | `RECEIPT` | `16/04/2026` | `Cash in Hand` ₹2,00,000.00 | `Sundry Debtors` ₹2,00,000.00 | Flagged under `cash-over-2l` (`>= ₹2,00,000`) |
