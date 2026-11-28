# End-to-End User Journeys

Six cross-feature journeys designed to be executed sequentially from a clean database. Every party, item, GSTIN, tax split, and voucher amount below is internally consistent.

---

## Journey 1: New Firm from Scratch (Signup → Company → Masters → Invoices → Ageing → Receipt → Trial Balance)
1. **Signup (`/auth/signup`):** Select `CA`, Name `Ananya Mehta`, Firm `Mehta & Associates CA`, Email `ananya@mehtaassociates.in`, Password `MehtaCA@2026`.
2. **Create Company (`/settings/companies`):** Legal Name `Mehta Precision Mfg Pvt Ltd`, GSTIN `27AABCM1234F1Z5` (`27` Maharashtra).
   - *Verify:* CoA, `FY`, `Head Office` branch (`stateCode: '27'`), and `INV/` sequence auto-seeded.
3. **Add Parties (`/parties`):**
   - `Infosys Limited` (`REGULAR`, GSTIN `29AAACI4567M1Z1`, State `29` KA).
   - `Walk-in Retail Customer` (`UNREGISTERED`, no GSTIN, State `27` MH).
4. **Add Items (`/items`):**
   - `Industrial Valve 50mm` (`GOODS`, HSN `8481`, `NOS`, `18%`, ₹4,200).
   - `Annual Security Audit` (`SERVICE`, SAC `998314`, `NOS`, `18%`, ₹85,000).
5. **Create B2B Inter-State Invoice (`/invoices/new`):** Customer `Infosys Limited`, Item `Industrial Valve 50mm` × `5` = ₹21,000 + 18% IGST ₹3,780 = **₹24,780.00** → **Issue**.
6. **Create B2C Intra-State Invoice (`/invoices/new`):** Customer `Walk-in Retail Customer`, Item `Annual Security Audit` × `1` = ₹85,000 + 9% CGST ₹7,650 + 9% SGST ₹7,650 = **₹1,00,300.00** → **Issue**.
7. **Verify Ageing (`/collections/ageing`):** Both invoices appear in `0–30 days`; Total AR = **₹1,25,080.00**.
8. **Record Receipt Voucher (`/vouchers`):** Type `RECEIPT`, `HDFC Bank` Dr ₹24,780.00, `Sundry Debtors` Cr ₹24,780.00 → **Post**.
9. **Verify Trial Balance (`/reports/trial-balance`):**
   - **Expected End State:** `2` `ISSUED` invoices, `3` `POSTED` vouchers (2 sales + 1 receipt), Trial Balance `isBalanced: true`, `totalClosingDebit === totalClosingCredit`, Sales = ₹1,06,000.00, Output IGST = ₹3,780.00, Output CGST = ₹7,650.00, Output SGST = ₹7,650.00.

---

## Journey 2: Bulk Onboarding (Masters → Sales Register → Auto-Fix → Post → GL & Reports)
1. **Upload Parties Master (`/imports/new`):** Upload [parties-master-50.xlsx](./data/parties-master-50.xlsx) (50 parties with Mod-36 GSTINs) or resolve via Step 3.
2. **Upload Items Master (`/imports/new`):** Upload [items-master-50.xlsx](./data/items-master-50.xlsx) (50 goods/services across slabs).
3. **Upload Labeled Validation Register (`/imports/new`):** Select `Sales Invoices`, upload [sales-validation-states.xlsx](./data/sales-validation-states.xlsx), click **Proceed to Header Mapping** → **Apply Mapping & Validate**.
4. **Resolve & Auto-Fix (`/imports/[id]/review`):**
   - Verify `RED-01..RED-13` display inline error reasons, `YELLOW-01` flags unmatched party, `BLUE-01` flags `> ₹5,00,000`.
   - Click **Resolve Missing Masters** → **1-Click Create All with Defaults** (`YELLOW-01` turns `GREEN`).
   - Click **Auto-Fix Tax Splits** (`RED-11-INTER-CGST` and `RED-12-INTRA-IGST` turn `GREEN`).
   - Click **Edit** on `RED-10-MATH`, change `totalAmount` from `12500` to `11800` → **Save & Re-validate** (turns `GREEN`).
5. **Upload & Post Volume Sales Register:** Upload [sales-register-50.xlsx](./data/sales-register-50.xlsx) (52 rows) → Resolve Missing Masters → **Approve & Post (52 Vouchers)**.
6. **Expected End State:** `/imports` shows `Posted` for the 52-row batch; `/vouchers` has 52 new `SALES` vouchers; `/reports/trial-balance` and `/reports/balance-sheet` remain balanced (`variance = 0`).

---

## Journey 3: Bank Reconciliation (Import Statement → Match Transactions → BRS)
1. **Create Bank Account (`/banking`):** Account Name `HDFC Current A/C`, Account No `50200012345678`, IFSC `HDFC0000001`, linked GL Ledger `HDFC Bank`.
2. **Upload Statement (`/banking`):** Upload [bank-statement-55.xlsx](./data/bank-statement-55.xlsx) (55 rows: 28 credits, 27 debits).
3. **Reconcile (`/banking/[id]/reconcile`):**
   - Select credit entry matching Journey 1's ₹24,780.00 receipt → review suggested match (`score >= 40`) → click **Match**.
   - Click **Scan** on `/banking/discovery` and convert 1 `OPEN` unmatched credit ticket (`partyLedgerId` = `Tata Consultancy Services Ltd`) into a `RECEIPT` voucher.
4. **Expected End State:** Statement status `VERIFIED` (or `WARNING_CONTINUITY_GAP`); matched transactions count = `2`; Discovery ticket status = `RESOLVED`; BRS displays Statement Balance vs Book Balance and exact `netVariance`.

---

## Journey 4: CA Practice Lifecycle (Client → Services → Proposal → E-Sign → Jobs → Time → WIP → GST Invoice → Paid → Profitability)
1. **Onboard Client (`/practice/clients`):** Code `ZEN-01`, Legal Name `Zenith Precision Exports Pvt Ltd`, PAN `AABCZ9012K`, State `27` (MH), Contact `Vikram Desai`, Email `vikram@zenithexports.in`.
2. **Verify Services (`/practice/settings/services`):** Confirm seeded `Monthly GST Return` (₹12,000, `MONTHLY`) exists.
3. **Create Proposal (`/practice/proposals/new`):** Select `ZEN-01`, add `Monthly GST Return` (`RECURRING` ₹12,000, GST 18%) + `Advisory` (`HOURLY` 4 hrs × ₹2,500 = ₹10,000, GST 18%) → Save → **Generate PDF**.
4. **Convert & E-Sign Engagement (`/practice/engagements/[id]`):**
   - Click **Convert to Engagement** (`SENT`).
   - Fill Client Signer `Vikram Desai`, accept consent, draw signature → **Sign Engagement** (`SIGNED`, PDF stamped with SHA-256 in `Agreements` vault folder).
   - Click **Counter-sign as Firm** (`ACTIVE` → `ClientService` subscribed + due jobs auto-spawned).
5. **Log Time & Approve (`/practice/timesheets`):** Log `120` mins @ `₹2,000/hr` billable on `ZEN-01` (₹4,000.00) → select entry → **Approve** (`APPROVED`).
6. **Generate WIP Bill → GST Invoice → Paid (`/practice/billing`):**
   - Click **Create Bill from WIP** → `PB-xxxxxx` created (`DRAFT`, includes ₹4,000 time + ₹12,000 retainer + 18% GST = ₹18,880.00).
   - Click **Convert to GST Invoice** (`INVOICED`, creates `ISSUED` GST invoice `SAC 998221` + GL voucher).
   - Click **Mark Paid** (`PAID`, linked invoice `PAID`).
7. **Expected End State:** Engagement `ACTIVE`, Timesheet `BILLED`, Practice Bill `PAID`, GST Invoice `PAID`, Profitability tab shows Billed = ₹16,000.00, Collected = ₹16,000.00, Time Cost = ₹1,000.00 (2h × ₹500/hr), Margin = ₹15,000.00 (`93.75%`).

---

## Journey 5: Compliance, Notices & Document Vault
1. **Calendar (`/practice/calendar`):** Confirm `ZEN-01` auto-seeded tasks (`GSTR-1` 11th, `GSTR-3B` 20th, `Bank Recon` 25th) appear on Month grid and Timeline.
2. **Notices (`/practice/notices`):** Log `GST` `ASMT-10 Scrutiny` (`DRC-01A/2026/009`, due `25/05/2026`) for `ZEN-01` → update status to `RESPONDED` (`resolvedAt` populated).
3. **Document Request & Vault (`/practice/documents` → `/practice/clients/[id]/vault`):**
   - Request `April 2026 Sales Register` (`SALES_REGISTER`) for `ZEN-01`.
   - Upload a `< 25 MB` PDF → **Accept** → verify file auto-placed in `ZEN-01`'s `GST` vault folder.
4. **Expected End State:** Calendar shows `1` filed / `2` pending (or updated counts); Notice status = `RESPONDED`; Document request status = `ACCEPTED` with file in Vault `GST` folder.

---

## Journey 6: Multi-Tenant RLS Safety
1. **Register Second Tenant (`/auth/signup`):** Email `rohan@rivalca.in`, Firm `Rival & Co`, Password `RivalCA@2026`.
2. **Create Second Company:** `Rival Traders LLP` (`29AABCR9999K1Z5`).
3. **Cross-Tenant UI & API Checks:**
   - Open `/invoices`, `/parties`, `/items`, `/vouchers`, `/imports`, `/practice/clients` as `rohan@rivalca.in` → **0 rows** from `Mehta & Associates CA` visible.
   - Replay any Tenant A API request (`GET /v1/companies/:tenantACompanyId/invoices` or spoof `x-tenant-id: <tenantA_id>`) with `rohan@rivalca.in`'s JWT.
4. **Expected End State:** All cross-tenant lists return empty for Tenant B; any spoofed `x-tenant-id` header returns **`403 Forbidden`** (`'Cross-tenant access forbidden'`).
