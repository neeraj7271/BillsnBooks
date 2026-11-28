# Imports — Bulk Ingestion Engine (routes: `/imports`, `/imports/new`, `/imports/[id]/review`)

## Purpose
Provides a unified 2-step upload and column-mapping wizard (`/imports/new`) feeding a single canonical validation, missing-master resolution, auto-fix, inline edit, and General Ledger posting cockpit (`/imports/[id]/review`) for Sales Registers, Purchase Registers, and Bank Statements.

## User journey
1. Navigate to `/imports` and click **Upload Register** (`/imports/new`).
2. Select Register Type (`Sales Invoices`, `Purchase Bills`, or `Bank Statement (Multi-Bank)`), optionally download an Excel template (`sales-invoices`, `purchase-bills`, `bank-statement`, `parties-master`, `items-master`), drop/select an `.xlsx` or `.csv` file, and click **Proceed to Header Mapping**.
3. Review auto-mapped canonical headers (Step 2 of 2) and click **Apply Mapping & Validate** → routes directly to `/imports/[id]/review`.
4. Inspect KPI cards (`Total Staged`, `Clean / Ready`, `Needs Mapping`, `Blocked / Errors`) and inline `Audit / Error Reasons` per row:
   - Click **Resolve Missing Masters** for `YELLOW` rows (1-click create missing Parties/Items).
   - Click **Auto-Fix Tax Splits** for `RED` CGST+SGST ↔ IGST rows.
   - Click **Edit** on any row to fix fields inline and **Save & Re-validate**.
5. Click **Approve & Post (N Vouchers)** → posts all `GREEN` rows to double-entry vouchers and shows the Post Success card with links to `/vouchers`, `/invoices`, and `/imports`.

## Validations & rules (from code)
- **Supported Formats & Deduplication** (`import.service.ts:60-72`, `file-parser.service.ts:38-96`):
  - Accepts `.csv`, `.tsv`, `.txt`, `.xlsx`, `.xls`.
  - SHA-256 deduplication across non-`FAILED` batches: `` `Duplicate file upload detected! An identical file was already uploaded in Batch #${existing.id} (Status: ${existing.status}).` ``.
- **Validation State Precedence** (`import-validation.service.ts:280-291`):
  1. `RED` (`errorReasons.length > 0`) — blocks batch approval (`import.service.ts:482-486`).
  2. `YELLOW` (`!isBankStatement && missingLedger`) — `` `Party '${partyName}' not matched to a ledger — resolve missing masters or map ledger.` `` (`:285`).
  3. `BLUE` (`totalDec.gt(500000)`) — `'Amount exceeds ₹5,00,000 — requires maker-checker approval.'` (`:288`).
  4. `GREEN` — clean & ready to post (`import.service.ts:574-581` posts `GREEN` rows only).
- **All 13 `RED` Validation Checks** (`import-validation.service.ts`):
  1. Missing invoice/voucher no (`:61-62`, auto-filled for `BANK_STATEMENT`): `'Invoice / Voucher Number is missing'`
  2. Missing date (`:69-70`): `'Transaction date is missing'`
  3. Invalid date format (`:73-74`): `` `Invalid date format '${rawDate}'. Expected DD/MM/YYYY or YYYY-MM-DD.` `` (supports `DD/MM/YYYY`, `YYYY-MM-DD`, `DD-MM-YYYY`, `DD.MM.YYYY`, and 5-digit Excel serial `/^\d{5}$/` at `:310-318`)
  4. Missing party name (`:89-90`, falls back to `narration.slice(0,60)` for `BANK_STATEMENT`): `'Party / Customer / Vendor name is missing'`
  5. Invalid Party GSTIN (`:96-105`, skipped for `BANK_STATEMENT`; `packages/gst-rules/src/gstin-validator.ts:13-52`): length ≠ 15, regex, invalid state code, or Mod-36 checksum failure
  6. Invalid Place of Supply state code (`:108-120`, skipped for `BANK_STATEMENT`): `` `Invalid Place of Supply state code '${pos}'` ``
  7. Invalid HSN/SAC (`:124-136`, skipped for `BANK_STATEMENT`): goods 4/6/8 digits, services 6 digits starting `99`
  8. Non-statutory GST slab (`:180-187`): allowed `[0, 0.1, 0.25, 1.5, 3, 5, 12, 18, 28]`
  9. Non-positive amount (`:218-220`): `'Invoice must have positive taxable or total amount'`
  10. Math discrepancy (`:230-235`, tolerance `<= 0.10`): `` `Math discrepancy: Total (₹${totalDec.toFixed(2)}) ≠ Taxable + Taxes (₹${sumOfParts.toFixed(2)})` ``
  11. Inter-state with CGST/SGST (`:241-246`): `` `Inter-state supply (POS: ${pos} vs Co: ${companyState}) cannot have CGST/SGST. Must be IGST.` ``
  12. Intra-state with IGST (`:248-252`): `` `Intra-state supply (POS: ${pos}) cannot have IGST. Must be CGST + SGST.` ``
  13. Intra-state CGST ≠ SGST (`:253-255`, tolerance `<= 0.05`): `'CGST and SGST amounts must be equal for intra-state supply'`
- **Auto-Fix Tax Splits** (`import-validation.service.ts:345-394`, `import.service.ts:776-836`): Converts CGST+SGST ↔ IGST based on `companyStateCode` vs `placeOfSupply` and upgrades clean matched rows to `GREEN`.
- **Note on RCM:** `Reverse Charge (Y/N)` (`rcm`) is present in `sales-invoices` and `purchase-bills` Excel templates (`excel-template.service.ts:118,243`), though `ImportValidationService` currently does not parse/post RCM-specific tax entries.

## Test cases

| # | Case | Type | Data to use | Steps | Expected result (cite code) |
|---|------|------|-------------|-------|-----------------------------|
| 1 | Download all 5 Excel templates | Happy | `/imports/new` → Download Excel Template dropdown | Download `Sales Invoices`, `Purchase Bills`, `Bank Statement`, `Parties Master`, `Items Master` | All 5 `.xlsx` files download with populated sample rows (`excel-template.service.ts:62-91`). |
| 2 | Upload & post 52-row Sales Register | Happy | [sales-register-50.xlsx](./data/sales-register-50.xlsx) | Upload → Map → `/imports/[id]/review` → Resolve Missing Masters → **Approve & Post** | All 52 rows become `GREEN`; 52 `SALES` vouchers posted; `/imports` shows `Posted` (`import.service.ts:570-660`). |
| 3 | Upload & post 50-row Purchase Register | Happy | [purchase-register-50.xlsx](./data/purchase-register-50.xlsx) | Select `Purchase Bills` → upload → Map → Resolve Masters → **Approve & Post** | 50 `PURCHASE` vouchers posted (`import.service.ts`). |
| 4 | Upload & post 55-row Bank Statement | Happy | [bank-statement-55.xlsx](./data/bank-statement-55.xlsx) | Select `Bank Statement` → upload → Map → **Approve & Post** | `autoDetectMapping` skips `pos` substring match on `Deposit (Credit)` (`file-parser.service.ts:135`); 55 `RECEIPT`/`PAYMENT` vouchers posted (`import-validation.service.ts:95-136`). |
| 5 | Import 50 Parties & 50 Items masters | Happy | [parties-master-50.xlsx](./data/parties-master-50.xlsx), [items-master-50.xlsx](./data/items-master-50.xlsx) | Upload via `/imports/new` or `/imports/:id/masters/resolve` | Parties and Items created with valid Mod-36 GSTINs and statutory UQCs (`import-masters.service.ts:231-329`). |
| 6 | Verify `GREEN`, `YELLOW`, `BLUE`, `RCM`, & Excel-serial date | Edge | [sales-validation-states.xlsx](./data/sales-validation-states.xlsx) (`GREEN-01..05`, `YELLOW-01`, `BLUE-01`) | Upload & map → inspect rows in `/imports/[id]/review` | `GREEN-01..05` (incl. `46117` → `2026-04-05`) are `GREEN`; `YELLOW-01` is `YELLOW` with `'not matched to a ledger'`; `BLUE-01` (>₹5L) is `BLUE` (`import-validation.service.ts:280-318`). |
| 7 | Auto-Fix Tax Splits on `RED-11` & `RED-12` | Edge | `RED-11-INTER-CGST`, `RED-12-INTRA-IGST` in [sales-validation-states.xlsx](./data/sales-validation-states.xlsx) | Click **Auto-Fix Tax Splits** on `/imports/[id]/review` | `RED-11` converts CGST+SGST → IGST; `RED-12` splits IGST 50:50 → CGST+SGST; both turn `GREEN` (`import-validation.service.ts:345-394`). |
| 8 | Inline row edit & re-validate | Edge | `RED-10-MATH` (change total from `12500` to `11800`) | Click **Edit** → fix `totalAmount` → **Save & Re-validate** | Row re-runs `validateRow` via `PATCH .../rows/:rowId` and transitions `RED` → `GREEN` (`import.service.ts:390-465`). |
| 9 | Verify all 13 `RED` validation checks | Negative | Rows `RED-01` through `RED-13` in [sales-validation-states.xlsx](./data/sales-validation-states.xlsx) | Upload & map → filter `RED` tab on `/imports/[id]/review` | Every `RED` row displays its exact inline `Audit / Error Reasons` (`import-validation.service.ts:61-255`), and **Approve & Post** excludes `RED` rows. |
| 10 | Purchase & Bank labeled validation states | Negative | [purchase-validation-states.xlsx](./data/purchase-validation-states.xlsx), [bank-validation-states.xlsx](./data/bank-validation-states.xlsx) | Upload each with matching Register Type → `/imports/[id]/review` | `PUR-RED-*` and `BANK-RED-*` rows show exact error reasons; `BLUE` rows flag `> ₹5,00,000`. |
| 11 | Duplicate file upload blocked | Negative | Upload [sales-register-50.xlsx](./data/sales-register-50.xlsx) twice | Upload same file again on `/imports/new` | `409 Conflict`: `"Duplicate file upload detected!..."` shown in red error banner (`import.service.ts:64-72`). |
| 12 | Unsupported file format rejected | Negative | Any `.pdf` or `.docx` file | Select file on `/imports/new` → **Proceed** | Error: `"Unsupported file format... Please upload an .xlsx or .csv file."` (`file-parser.service.ts:90`). |

## Edge & boundary cases
- **₹5,00,000 boundary:** `totalAmount = 500000.00` is `GREEN`; `500000.01` is `BLUE` (`totalDec.gt(500000)`, `import-validation.service.ts:286`).
- **Rounding tolerance:** Math discrepancy `<= ₹0.10` passes; `CGST - SGST <= ₹0.05` passes (`:230,253`).
- **Excel serial date:** `46117` converts to `2026-04-05` (`:310-318`).
- **Batch status:** Posting sets `ImportBatchOrmEntity.status = 'COMPLETED'` (`import.service.ts:570`), displayed as `Posted` badge in `/imports` and `/imports/[id]/review`.

## Negative / error cases
- Attempting `POST /approve` while `blockedRows > 0` → `"Cannot approve batch with <N> blocked (RED) rows."` (`import.service.ts:482`).
- Requesting unknown template `/imports/templates/unknown` → `"Unknown template type: unknown"` (`excel-template.service.ts:86`).

## State/UI checks
- `/imports` empty state shows teaching checklist; KPI cards use `<Card>` elevation; status badges (`Processing`, `Ready for Review`, `Clarifications`, `Posted`, `Failed`).
- `/imports/[id]/review` state legend tooltips, filter tab counts match loaded rows, dark/light theme readability.

## Realistic data
- Volume files (50+ rows): [sales-register-50.xlsx](./data/sales-register-50.xlsx), [purchase-register-50.xlsx](./data/purchase-register-50.xlsx), [bank-statement-55.xlsx](./data/bank-statement-55.xlsx), [parties-master-50.xlsx](./data/parties-master-50.xlsx), [items-master-50.xlsx](./data/items-master-50.xlsx).
- Labeled validation state files: [sales-validation-states.xlsx](./data/sales-validation-states.xlsx), [purchase-validation-states.xlsx](./data/purchase-validation-states.xlsx), [bank-validation-states.xlsx](./data/bank-validation-states.xlsx).
