# Sales & Billing (routes: `/invoices`, `/invoices/new`, `/invoices/[id]`, `/collections/recurring`, `/collections/payment-links`, `/collections/ageing`)

## Purpose
Manages GST Tax Invoices, Proforma Invoices, and Delivery Challans with direct General Ledger posting (`ISSUED` immediately for all non-draft invoices — no maker-checker approval queue), printable A4 templates, recurring billing schedules, payment links & gateway settlement reconciliation, and AR Ageing follow-ups.

## User journey
1. Navigate to `/invoices` (statuses: `DRAFT | ISSUED | CANCELLED`) and click **New Invoice** (`/invoices/new`).
2. Select customer (`PTY-01` intra-state or `PTY-02` inter-state or `PTY-03` B2C), add one or more line items with quantities/discounts/GST slabs, and click **Save & Issue** (or **Save as Draft**).
3. Non-draft Tax Invoices (regardless of amount, including `>= ₹50,000` / `₹1,00,000+`) save directly as `ISSUED` with `approvalStatus = APPROVED` and post a `SALES` double-entry voucher inline.
4. Open `/invoices/[id]` to switch print templates (`TALLY_CLASSIC`, `MODERN_BRAND`, `MINIMAL_COMPACT`), customize branding, issue a `DRAFT`, convert a `PROFORMA_INVOICE` to `TAX_INVOICE`, or cancel an invoice.
5. Manage recurring schedules in `/collections/recurring`, generate UPI payment links & reconcile gateway settlements in `/collections/payment-links`, and track AR buckets (`0-30`, `31-60`, `61-90`, `90+`), promise-to-pay, and reminders in `/collections/ageing`.

## Validations & rules (from code)
- **Direct Posting (Approvals Removed)** (`apps/api/src/modules/invoice/invoice.service.ts:384-390, 462-475`):
  - `isDraft === true` → `status = DRAFT`, `approvalStatus = PENDING`, no GL voucher.
  - All non-draft invoices → `status = ISSUED`, `approvalStatus = APPROVED`, GL voucher posted inline (`TAX_INVOICE`). `PROFORMA_INVOICE` and `DELIVERY_CHALLAN` save without GL voucher (`478-491`).
  - No `PENDING_APPROVAL` status, no `/approvals` route, and no `/invoices/:id/approve` or `/reject` endpoints exist.
- **Line Items & Edit Guards** (`invoice.service.ts:203-205, 557-564`):
  - Empty items → `400`: `'An invoice must contain at least one line item.'`.
  - Editing `ISSUED` or `CANCELLED` invoice → `400`: `'Invoices in <status> status cannot be edited directly under statutory accounting rules...'`.
- **GST POS, Tax & Rounding** (`packages/gst-rules/src/place-of-supply.ts:20-78`, `invoice.service.ts:242-323`):
  - `supplierStateCode === placeOfSupplyStateCode` → `INTRA_STATE` (CGST = rate/2, SGST = rate/2); else `INTER_STATE` (IGST = rate).
  - `NIL_RATED`, `EXEMPT`, `NON_GST` force `gstRate = 0, cessRate = 0`.
  - Backend rounds `finalTotal` to 2 decimal places (`ROUND_HALF_UP`) and posts `roundOff` to `LED_ROUND_OFF` (`954-972`).
  - **RCM (`isRcm = true`)**: debits Customer & credits Sales for `subtotal` only (`918-923`).
- **Period Lock Enforcement** (`voucher.service.ts:45-57`):
  - Issuing a Tax Invoice dated in a locked period fails with `"Cannot post voucher on <date>: Accounting period \"<name>\" is locked."`.
- **Collections Rules** (`apps/api/src/modules/collections/collections.service.ts:61-912`):
  - **AR Ageing**: includes `status = ISSUED` invoices only; buckets `0-30`, `31-60`, `61-90`, `90+` days.
  - **Recurring**: only `ACTIVE` schedules can run; requires active FY covering `nextRunDate`; auto-completes at `maxRuns` or `endDate`.
  - **Payment Links**: default 30-day expiry; HMAC-SHA256 callback check (`401`: `'Invalid payment callback signature.'`); expired → `400`: `'Payment link has expired.'`; marks invoice `PAID`.
  - **Gateway Settlements**: enforces `Gross - Fee - Tax == Net` (`400`: `'Settlement math mismatch...'`); posts `CONTRA` voucher (`series: 'SETTLE'`).

## Test cases

| # | Case | Type | Data to use | Steps | Expected result (cite code) |
|---|------|------|-------------|-------|-----------------------------|
| 1 | Create ₹1,00,000+ B2B Intra-State Tax Invoice (direct post) | Happy | `INV-01` (`PTY-01` MH, `ITM-02` ₹1,00,000 + 18% GST = ₹1,18,000) | `/invoices/new` → fill → **Issue** | Saves immediately as `ISSUED` (`approvalStatus: APPROVED`) with `voucherId` populated (`invoice.service.ts:384-390, 839-1004`). |
| 2 | Create Inter-State B2B Tax Invoice (IGST) | Happy | `INV-02` (`PTY-02` KA, `ITM-01` × 5 = ₹21,000 + 18% IGST ₹3,780 = ₹24,780) | `/invoices/new` → select `PTY-02` → **Issue** | `supplyType: INTER_STATE`, `igstAmount: 3780`, `cgstAmount: 0`, `sgstAmount: 0` (`place-of-supply.ts:20-78`). |
| 3 | Create B2C Invoice + Multi-line Discount Invoice | Happy | `INV-03` (`PTY-03` Unregistered, 2 items, 10% discount) | `/invoices/new` → add 2 lines → apply 10% discount → **Issue** | Saved as `ISSUED` with `partyGstinSnapshot: null` and discounted subtotal (`invoice.service.ts:258-323`). |
| 4 | Save Draft → Issue Draft & Proforma → Convert to Tax Invoice | Happy | `INV-04` Draft; `INV-05` Proforma | Save Draft → `/invoices/[id]` → **Issue & Post to Books**; Proforma → **Convert to Tax Invoice** | Draft becomes `ISSUED` with GL voucher; Proforma converts to `TAX_INVOICE` (`invoice.service.ts:748-770`). |
| 5 | Switch Invoice Print Templates & Cancel Invoice | Happy | `INV-01` | `/invoices/[id]` → switch `TALLY_CLASSIC` / `MODERN_BRAND` / `MINIMAL_COMPACT` → **Cancel** | Templates render cleanly; status becomes `CANCELLED` (`invoice.service.ts:803-837`). |
| 6 | Recurring Schedule → Run → Create Invoice | Happy | Monthly schedule for `PTY-01`, `ITM-01` | `/collections/recurring` → **New Schedule** → **Run Now** | Generates `ISSUED` invoice and advances `nextRunDate` (`collections.service.ts:441-556`). |
| 7 | Payment Link & Gateway Settlement Reconciliation | Happy | Link for `INV-02` ₹24,780; Settlement Gross ₹24,780, Fee ₹495.60, Tax ₹89.21, Net ₹24,195.19 | `/collections/payment-links` → **Create Link** → simulate callback → **Reconcile Settlement** | Link marks `INV-02` `PAID`; settlement posts `CONTRA` voucher (`collections.service.ts:698-912`). |
| 8 | AR Ageing Buckets & Promise-to-Pay | Happy | Unpaid `INV-01` | `/collections/ageing` → **Promise to Pay** → **Send Reminder** | Invoice appears in `0-30` bucket; promise status & reminder saved (`collections.service.ts:61-275`). |
| 9 | Multi-slab + 1-paise Round-off | Edge | Item ₹100.40 (`NIL_RATED` vs `3%` slab) | `/invoices/new` → test `NIL_RATED` & `3%` | `NIL_RATED` forces 0% tax (`invoice.service.ts:242-246`); backend rounds to 2dp (`:321`). |
| 10 | Empty items / Edit ISSUED invoice / Locked period | Negative | 0 line items; edit `INV-01`; date in locked period | Submit 0 lines / edit `ISSUED` / post in locked period | `400` errors per `invoice.service.ts:203,557` and `voucher.service.ts:55`. |
| 11 | Duplicate custom invoice number | Negative | Reuse `INV-00001` with manual numbering | `/invoices/new` → **Issue** | `409 Conflict`: `'Invoice number ... already exists for this company.'` (`invoice.service.ts:330`). |
| 12 | Settlement math mismatch | Negative | Gross `10000`, Fee `200`, Tax `36`, Net `9000` (≠ `9764`) | `/collections/payment-links` → **Reconcile Settlement** | Blocked (`reconcile-settlement-dialog.tsx:54`, `collections.service.ts:799`). |

## Edge & boundary cases
- **Known Bugs / Gaps to verify & track during manual testing:**
  - `invoice-math.ts:65-66` rounds `grandTotal` to integer while backend `invoice.service.ts:321` rounds to 2dp.
  - `invoice-preview-model.ts:21` reads missing `isInterState` so live preview always shows `CGST+SGST`.
  - `invoices/page.tsx:251` links to `/invoices/new?edit=...` while `use-invoice-form.ts:15` expects `?cloneFrom=...&mode=edit`.
  - `invoices/[id]/page.tsx:130-150` (`handleIssueDraft`) sends `taxRate`/`hsnSac`/`discountAmount` instead of `gstRatePercent`/`hsnSacCode`/`discountPercent`.
  - `invoice.service.ts:803-837` (`cancelInvoice`) does not reverse `invoice.voucherId` in `VoucherService`.
  - `invoice.service.ts:232-236` does not pass `isSez`/`isExport` flags to `resolvePlaceOfSupply`.
  - `recurring-schedule-dialog.tsx:201` checks `p.status !== 'LOCKED'` instead of `p.isLocked`.

## Negative / error cases
- Cancel an already `CANCELLED` invoice → `400`: `'Invoice is already cancelled.'` (`invoice.service.ts:820`).
- Payment link callback after expiry → `400`: `'Payment link has expired.'` (`collections.service.ts:714`).

## State/UI checks
- Sidebar has **no** `Approvals` link; `/approvals` returns `404`; `/invoices` filter chips show only `All Invoices`, `ISSUED`, `CANCELLED`, `DRAFT`.
- Light + dark themes, Indian `₹` lakh grouping, `tabular-nums`, back navigation.

## Realistic data (Type-in)

| Ref | Party | Item(s) | Qty | Rate (₹) | Discount | Slab | Expected Tax | Expected Total |
|-----|-------|---------|-----|----------|----------|------|--------------|----------------|
| `INV-01` | `PTY-01` (MH) | `Annual Security Audit` (`998314`) | `1` | `1,00,000.00` | `0%` | `18%` | CGST ₹9,000 + SGST ₹9,000 | `₹1,18,000.00` |
| `INV-02` | `PTY-02` (KA) | `Industrial Valve 50mm` (`8481`) | `5` | `4,200.00` | `0%` | `18%` | IGST ₹3,780.00 | `₹24,780.00` |
| `INV-03` | `PTY-03` (B2C) | `Gold Bullion Assay Kit` (`7108`) | `1` | `25,000.00` | `10%` | `3%` | CGST ₹337.50 + SGST ₹337.50 | `₹23,175.00` |
