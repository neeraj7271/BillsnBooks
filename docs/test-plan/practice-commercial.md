# Practice — Commercial & Billing (routes: `/practice/proposals*`, `/practice/engagements/[id]`, `/practice/timesheets`, `/practice/billing`, `/practice/capacity`)

## Purpose
Covers the CA-firm revenue pipeline: Proposals → Engagement Letter with dual e-sign & auto-spawned Jobs → Timesheet logging & approval → WIP aggregation → Practice Bill → GST Invoice → Paid & Client/Job Profitability, alongside weekly Staff Capacity planning.

## User journey
1. Create a proposal in `/practice/proposals/new` with `FIXED`, `RECURRING`, or `HOURLY` service lines and generate its PDF.
2. Convert the proposal to an Engagement (`/practice/engagements/[id]`), sign as Client (consent + name + optional canvas signature), then **Counter-sign as Firm** → marks Engagement `ACTIVE`, creates `ClientService` subscriptions, and auto-spawns due jobs.
3. Log billable & non-billable time in `/practice/timesheets` and approve entries via `approveTimesheet` (`SUBMITTED` → `APPROVED`).
4. Open `/practice/billing`, inspect **Unbilled WIP**, generate a Practice Bill (`PB-xxxxxx`), click **Convert to GST Invoice** (posts an `ISSUED` GST invoice + GL voucher), and click **Mark Paid**.
5. Inspect **Profitability** (revenue vs `hourlyCostRate` cost & margin %) on `/practice/billing` and **Staff Capacity** (`w1_tds`, `w2_gst1_pf`, `w3_gstr3b`, `w4_close` heatmap) on `/practice/capacity`.

## Validations & rules (from code)
- **Proposals** (`practice-onboarding.service.ts:62-282, 362-474`):
  - Initial status `'DRAFT'`; `validUntil` defaults to `+30 days`; default `gstRate = 18%`.
  - Requires client or prospect name (`400`: `'Select a client or enter a prospect name.'`) and `>= 1` line (`400`: `'Add at least one service line to the proposal.'`).
  - Converting to Engagement requires linked `clientId` (`400`: `'Link proposal to a client before converting to an engagement.'`).
- **Engagements & E-Sign** (`practice-onboarding.service.ts:332-640`):
  - States: `SENT` → `SIGNED` (client e-sign stamps SHA-256 certificate onto PDF and saves `Signed-Engagement-<id8>.pdf` in `Agreements` vault folder) → `ACTIVE` (firm counter-sign subscribes services & spawns due jobs).
  - Client sign requires consent (`400`: `'Consent checkbox must be accepted to sign.'`) and signer name (`400`: `'Signer name is required.'`).
- **Timesheets** (`practice-billing.service.ts:29-164`):
  - States: `DRAFT | SUBMITTED | APPROVED`; default `hourlyRate = ₹1,500`.
  - Requires `clientId` (`400`: `'clientId is required'`) and `minutes > 0` (`400`: `'minutes must be > 0'`).
  - *(Note: `getUnbilledWip` includes all `isBillable && !isWriteOff && billId IS NULL` entries regardless of `approvalStatus`.)*
- **WIP → Bill → GST Invoice → Paid & Profitability** (`practice-billing.service.ts:168-480`):
  - `createBillFromWip`: pulls unbilled time + active retainer fees, supports `writeOffAmount` and `retainerDrawdown`, adds `18%` GST, generates `PB-<6 digits>`, due `+15 days`. Empty WIP → `400`: `'No unbilled time entries or active fee schedules found for this client.'`.
  - `convertBillToGstInvoice`: idempotent if `bill.invoiceId` exists; uses `InvoiceService.createInvoice` (`SAC 998221`, `18%` GST), marks bill `INVOICED`.
  - `markBillPaid`: marks bill `PAID` and linked `InvoiceOrmEntity.status = 'PAID'`.
  - `getProfitabilityReport`: cost uses `user.hourlyCostRate || 500`.
- **Capacity** (`practice-operations.service.ts:28-128`, `capacity/page.tsx:111`):
  - Default weekly capacity `40` hrs; `isOverloaded = assignedHours > capacity`; buckets by due-date day (`<=7`, `8-15`, `16-22`, `>22`). Heatmap colors: `>12h` danger, `>6h` warning, `>0h` info.

## Test cases

| # | Case | Type | Data to use | Steps | Expected result (cite code) |
|---|------|------|-------------|-------|-----------------------------|
| 1 | Create Proposal (`FIXED` + `HOURLY` lines) & PDF | Happy | `PR-PROP-01` for `PR-CLI-01` | `/practice/proposals/new` → add 2 lines → save → **Generate PDF** | Proposal saved `DRAFT`; PDF uploaded to client vault (`practice-onboarding.service.ts:257-281`). |
| 2 | Convert Proposal → Client e-Sign → Firm Counter-sign | Happy | `PR-PROP-01` | **Convert to Engagement** → Client Sign (consent + name + canvas) → **Firm Counter-sign** | Engagement `SENT` → `SIGNED` → `ACTIVE`; `Signed-Engagement-*.pdf` in vault; services subscribed & jobs spawned (`:398-638`). |
| 3 | Log time & Approve Timesheets (`approveTimesheet`) | Happy | `120` mins @ `₹2,000/hr` billable for `PR-CLI-01` | `/practice/timesheets` → **Log Time** → select → **Approve** | `hours = 2.00`, `amount = ₹4,000`; `approvalStatus` becomes `APPROVED` (`practice-billing.service.ts:103`, `timesheets/page.tsx:76`). |
| 4 | WIP → Practice Bill → GST Invoice → Paid + Profitability | Happy | Unbilled WIP ₹4,000 + Retainer ₹12,000 | `/practice/billing` → **Create Bill from WIP** → **Convert to GST Invoice** → **Mark Paid** | `PB-xxxxxx` (`₹16,000 + 18% GST = ₹18,880`) → `INVOICED` (`SAC 998221`) → `PAID`; Profitability shows billed, collected, cost (`500/hr`), margin (`:188-480`). |
| 5 | Staff Capacity heatmap & job reassignment | Happy | Multiple open jobs across weeks | `/practice/capacity` → inspect week buckets → **Reassign** job | Utilization % updates; reassigned staff receives `NotificationOrmEntity` (`practice-operations.service.ts:28-128`). |
| 6 | Write-off & retainer drawdown on WIP bill | Edge | WIP ₹10,000, `writeOffAmount: 1000`, `retainerDrawdown: 2000` | Create bill with write-off & drawdown | Negative `WRITE_OFF` line added; `subtotal = max(0, sum - drawdown)` (`:261-279`). |
| 7 | Idempotent `convertBillToGstInvoice` retry | Edge | Call convert twice on same `PB-xxxxxx` | Trigger convert twice | Returns existing `invoiceId` without creating duplicate invoice (`:329`). |
| 8 | Convert Proposal without linked `clientId` | Negative | Prospect-only proposal | Click **Convert to Engagement** | `400`: `'Link proposal to a client before converting to an engagement.'` (`:371`). |
| 9 | Client e-Sign without consent or signer name | Negative | Unchecked consent or blank signer name | `/practice/engagements/[id]` → **Sign** | `400`: `'Consent checkbox must be accepted to sign.'` / `'Signer name is required.'` (`:486-489`). |
| 10 | Log time with `0` minutes or missing client | Negative | `minutes = 0` | `/practice/timesheets` → submit | `400`: `'minutes must be > 0'` / `'clientId is required'` (`practice-billing.service.ts:43-44`). |
| 11 | Create WIP bill when client has ₹0 WIP & no retainers | Negative | Client with no unbilled time/retainers | `/practice/billing` → **Create Bill** | `400`: `'No unbilled time entries or active fee schedules found for this client.'` (`:258`). |

## Edge & boundary cases
- **100% write-off / drawdown:** `subtotal` floors at `0` (`Math.max(0, ...)` at `practice-billing.service.ts:274`).
- **Capacity overload:** Assigned hours `> 40` sets `isOverloaded = true` (`practice-operations.service.ts:73`).

## Negative / error cases
- Converting bill when no active Branch or Financial Year exists → `400` (`practice-billing.service.ts:334, 340`).

## State/UI checks
- `timesheets/page.tsx` displays `BILLED` badge once `billId` is linked.
- Light/dark themes, Indian `₹` formatting, `tabular-nums` across Billing & Profitability tables.

## Realistic data (Type-in)

| Ref | Flow | Details |
|-----|------|---------|
| `PR-PROP-01` | Proposal | Client `ZEN-01`, Line 1: `Monthly GST Return` (`RECURRING`, ₹12,000, GST 18%), Line 2: `Advisory Consultation` (`HOURLY`, 4 hrs × ₹2,500 = ₹10,000, GST 18%) |
| `PR-TIME-01` | Timesheet | Client `ZEN-01`, Job `PR-JOB-01`, Duration `120` mins, Rate `₹2,000/hr`, Billable `true` → `₹4,000.00` |
