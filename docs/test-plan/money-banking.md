# Money & Banking (routes: `/vouchers`, `/banking`, `/banking/[id]/reconcile`, `/banking/discovery`)

## Purpose
Manages double-entry general ledger vouchers (Journal, Payment, Receipt, Contra) with strict debit=credit & period-lock invariants, bank account management, multi-bank statement ingestion, 2-way Bank Reconciliation (BRS), and unbilled Sales Discovery ticket conversion.

## User journey
1. Navigate to `/vouchers` to view the Day Book, filter by voucher type/status, drill into journal legs, post a manual balanced Journal Voucher, or reverse an existing `POSTED` voucher.
2. Navigate to `/banking` to create a bank account (linked to a GL bank ledger), upload a bank statement (`.xlsx`/`.csv`), and inspect parsed statement transactions.
3. Click **Reconcile** (`/banking/[id]/reconcile`) to review match suggestions (`score >= 40`), match statement transactions 1-to-1 to GL vouchers, or unmatch them, and verify BRS variance (`isBalanced`).
4. Navigate to `/banking/discovery` to scan unmatched credit transactions, review detected deposit tickets (`ADVANCE_RECEIPT`, `CUSTOMER_DEPOSIT`, `OTHER_INCOME`, `UNBILLED_SALES`), and convert a ticket into a double-entry Receipt/Sales voucher.

## Validations & rules (from code)
- **Debit = Credit & Non-Empty Legs** (`packages/accounting-core/src/voucher.entity.ts:93-121`, `apps/web/src/app/vouchers/new-jv-dialog.tsx:79,91-105`):
  - Minimum 2 journal legs; every leg needs a valid `ledgerId` and `amount > 0` (`"All journal lines must specify a valid ledger and an amount greater than zero."`).
  - `totalDebit` must equal `totalCredit` (`"Cannot post unbalanced voucher: Total debits must equal credits exactly."` in UI; `UnbalancedVoucherError` on backend).
- **Period Lock Enforcement** (`apps/api/src/modules/voucher/voucher.service.ts:45-57, 166-178`):
  - Rejects `POST` or `REVERSE` if `voucherDate` (or reversal date) falls inside a locked `AccountingPeriodOrmEntity`: `"Cannot post voucher on <date>: Accounting period \"<name>\" is locked."`.
- **Posted Immutability & Reversal** (`packages/accounting-core/src/voucher.entity.ts:131-169`):
  - `POSTED` vouchers cannot be edited (`PostedVoucherImmutableError`); only `POSTED` vouchers can be reversed (creates mirror voucher in `REVERSAL` series and marks original `REVERSED`).
- **Idempotency** (`apps/api/src/modules/voucher/voucher.service.ts:34-42`):
  - `x-idempotency-key` deduplicates on `(tenantId, companyId, idempotencyKey)`.
- **Gap-Free Numbering** (`apps/api/src/modules/voucher/voucher.service.ts:325-361`):
  - `SELECT FOR UPDATE` (`pessimistic_write`) on `VoucherSequenceOrmEntity` per `(companyId, voucherType, series, financialYearId)`.
- **Bank Statement Deduplication & Continuity** (`apps/api/src/modules/banking/banking.service.ts:114, 129`, `bank-parser.service.ts:134-140`):
  - Duplicate SHA-256 file per `(tenantId, bankAccountId)` throws `ConflictException`: `"This exact bank statement file has already been ingested (Statement ID: <id>)."`.
  - Continuity gap `>= 0.05` marks statement `'WARNING_CONTINUITY_GAP'`; `< 0.05` marks `'VERIFIED'`.
- **Match Scoring & 1-to-1 Rule** (`apps/api/src/modules/banking/reconciliation.service.ts:136-277`):
  - Evaluates last 50 unmatched vouchers; score = Exact amount `< 0.01` (+50), Approx `< 5%` (+20), Ref/UTR (+40), Party (+30), Date `<= 3d` (+15) / `<= 10d` (+10); threshold `>= 40`.
  - Rejects already reconciled txn (`"Transaction is already reconciled."`).
- **Sales Discovery Conversion** (`apps/api/src/modules/banking/sales-discovery.service.ts:122-239`, `banking.controller.ts:124`):
  - Requires `partyLedgerId` (`"partyLedgerId is required to convert ticket into double-entry voucher."`) and `bankAccount.ledgerId`; rejects already `'RESOLVED'` tickets.

## Test cases

| # | Case | Type | Data to use | Steps | Expected result (cite code) |
|---|------|------|-------------|-------|-----------------------------|
| 1 | Post balanced manual Journal Voucher | Happy | JV-01 from type-in table (`Rent Expense` Dr ₹50,000, `HDFC Bank` Cr ₹50,000) | `/vouchers` → **New Journal Entry** → enter 2 legs → **Post Voucher** | Voucher saved as `POSTED` with gap-free `JOU/0001` number; `OUTBOX` `VOUCHER_POSTED` + `AuditLog` written (`voucher.service.ts:110-139,351`). |
| 2 | Reverse a `POSTED` voucher | Happy | Voucher from Case 1 | `/vouchers` → click **Reverse** → confirm dialog | Mirror `REVERSAL` voucher created; original status becomes `REVERSED`; Trial Balance net effect = ₹0 (`voucher.entity.ts:131-157`). |
| 3 | Create bank account & upload 55-row statement | Happy | `docs/test-plan/data/bank-statement-55.xlsx` | `/banking` → **New Bank Account** → **Upload Statement** → select `.xlsx` | Statement parsed via `BankParserService`; 55 txns created; statement status `VERIFIED` or `WARNING_CONTINUITY_GAP`; `bankAccount.currentBalance` updated (`banking.service.ts:84-171`). |
| 4 | 2-way match bank txn to GL voucher & check BRS | Happy | Receipt voucher ₹23,600 + `BANK-GREEN-CR` | `/banking/[id]/reconcile` → select unmatched txn → click suggested match → **Match** | `matchStatus` becomes `MATCHED`; BRS `matchedCount` increments and `netVariance` updates (`reconciliation.service.ts:44-134,236-277`). |
| 5 | Unmatch reconciled bank transaction | Happy | Matched txn from Case 4 | `/banking/[id]/reconcile` → filter `MATCHED` → **Unmatch** | `matchStatus` returns to `UNMATCHED`; `matchedVoucherId` cleared. |
| 6 | Convert Sales Discovery ticket to Receipt voucher | Happy | Unmatched credit txn from Case 3 | `/banking/discovery` → **Scan** → **Convert** on `OPEN` ticket → select `partyLedgerId` | `POSTED` `RECEIPT` voucher (`ADV-REC/...`) created, ticket marked `RESOLVED`, txn auto-matched (`sales-discovery.service.ts:122-239`). |
| 7 | Idempotent voucher retry with same key | Edge | Same `x-idempotency-key` sent twice | `POST /v1/companies/:cid/vouchers` twice with identical header | Second call returns existing voucher without creating duplicate (`voucher.service.ts:34-42`). |
| 8 | Multi-leg JV (3+ legs) with 1-paise precision | Edge | JV-02 (`Consulting` Cr ₹10,000.01, `TDS` Dr ₹1,000.00, `Bank` Dr ₹9,000.01) | `/vouchers` → **New JV** → add 3rd leg → **Post** | Accepted (`|Dr - Cr| < 0.01`); exact decimal stored (`new-jv-dialog.tsx:91`). |
| 9 | Unbalanced JV rejected | Negative | `Rent` Dr ₹10,000, `Bank` Cr ₹9,500 | `/vouchers` → **New JV** → **Post** | Blocked with `"Cannot post unbalanced voucher: Total debits must equal credits exactly."` (`new-jv-dialog.tsx:97`, `voucher.entity.ts:98-121`). |
| 10 | Zero / negative leg amount rejected | Negative | `Rent` Dr ₹0, `Bank` Cr ₹0 | `/vouchers` → **New JV** → **Post** | Blocked with `"All journal lines must specify a valid ledger and an amount greater than zero."` (`new-jv-dialog.tsx:103`). |
| 11 | Voucher date in locked accounting period | Negative | Lock `April 2026`, post JV on `15/04/2026` | Lock period in `/settings/periods` → `/vouchers` → **New JV** on `2026-04-15` | API rejects with `"Cannot post voucher on 2026-04-15: Accounting period \"...\" is locked."` (`voucher.service.ts:55`). |
| 12 | Re-upload identical bank statement file | Negative | Upload `bank-statement-55.xlsx` twice to same account | `/banking` → **Upload Statement** same file | `409 Conflict`: `"This exact bank statement file has already been ingested (Statement ID: ...)."` (`banking.service.ts:114`). |
| 13 | Upload empty or non-bank Excel file | Negative | `docs/test-plan/data/items-master-50.xlsx` | `/banking` → **Upload Statement** | Rejected with `"Could not identify valid bank statement columns (Date, Narration/Description, Debit/Credit, Balance)."` (`bank-parser.service.ts:68`). |
| 14 | Double-match already reconciled transaction | Negative | `POST /v1/banking/transactions/:id/match` on `MATCHED` txn | Call match API on already matched txn | Rejected: `"Transaction is already reconciled."` (`reconciliation.service.ts:255`). |

## Edge & boundary cases
- **Reversing a reversed voucher:** Attempting to reverse a `REVERSED` voucher throws `InvalidVoucherStatusError` (`"Cannot reverse voucher ... Only POSTED vouchers can be reversed."`, `voucher.entity.ts:131-157`).
- **Bank continuity gap >= ₹0.05:** Statement with opening/closing balance jump `>= 0.05` saves with `WARNING_CONTINUITY_GAP` rather than failing (`bank-parser.service.ts:134-140`).
- **Match score boundary (39 vs 40):** Suggestion engine excludes candidates with `score < 40` and caps score at `100` (`reconciliation.service.ts:136-234`).
- **Known UI/API field-name gaps to watch during manual testing:**
  - `banking/page.tsx:197` reads `acc.accountNumber` (`BankingService` returns `accountNumberMasked`) and `tx.description`/`tx.amount`/`tx.reconciliationStatus` (`BankingService` returns `narration`/`debitAmount`/`creditAmount`/`matchStatus`).
  - `bank-statement-feed.tsx:63-74` and `match-candidates.tsx:81` have similar field-name mismatches (`tx.description`, `s.date`).
  - `discovery/page.tsx:22,103,118,128` checks `status === 'CONVERTED'` while backend sets `'RESOLVED'`.

## Negative / error cases
- Missing `voucherId` on `POST /transactions/:id/match` → `"voucherId is required for matching."` (`banking.controller.ts:90`).
- Missing `partyLedgerId` on `POST /discovery/tickets/:id/convert` → `"partyLedgerId is required to convert ticket into double-entry voucher."` (`banking.controller.ts:124`).
- Multi-tenant RLS: Tenant B querying `/v1/companies/:tenantACompanyId/vouchers` receives `403`.

## State/UI checks
- Empty state on `/vouchers` and `/banking` when no vouchers/accounts exist.
- Light + dark theme card elevation (`bg-surface`, `shadow-card`, `border-subtle`), Indian `₹` lakh grouping (`tabular-nums`).
- Back navigation from `/banking/[id]/reconcile` → `/banking`.

## Realistic data
- **Statement file:** [bank-statement-55.xlsx](./data/bank-statement-55.xlsx) (55 rows) and [bank-validation-states.xlsx](./data/bank-validation-states.xlsx).
- **Type-in Vouchers:**

| Ref | Type | Date | Leg 1 (Dr) | Leg 2 (Cr) | Leg 3 | Narration |
|-----|------|------|------------|------------|-------|-----------|
| JV-01 (Happy) | `JOURNAL` | `05/04/2026` | `Rent Expense` ₹50,000.00 | `HDFC Bank` ₹50,000.00 | — | April office rent accrual |
| JV-02 (Edge 3-leg) | `RECEIPT` | `10/04/2026` | `HDFC Bank` ₹9,000.01 | `TDS Receivable` Dr ₹1,000.00 | `Consulting Income` Cr ₹10,000.01 | Receipt net of 10% TDS |
| JV-03 (Negative) | `JOURNAL` | `12/04/2026` | `Rent Expense` ₹10,000.00 | `HDFC Bank` ₹9,500.00 | — | Unbalanced test (must fail) |
