# Party Master, GST Registration, Address and Tax-Treatment Integrity Audit

**Audit Date:** 2026-10-31  
**Auditor:** Antigravity AI Engine  
**Scope:** Party Masters, Registration Types, GSTIN Lifecycle, Multi-State Addresses, Ledger Mapping, Tax-Rate Resolution, Invoice/Voucher Snapshots, Place of Supply, Tally Export, and Database Integrity.

---

## PART A: ROOT CAUSE ANALYSIS OF THE REPORTED BUG

### 1. Bug Description
An **unregistered** party currently displays a GSTIN on the UI form, in party lists, in the invoice/voucher editor, on invoice prints/PDFs, and in exports.

### 2. Locations Where the Bug Occurs
1. **Invoice Party Details Display:**
   - **File:** `apps/web/src/app/invoices/[id]/invoice-party-details.tsx` (Line 79)
   - **Code:** `<div><span className="font-bold">GSTIN:</span> {invoice.party?.gstin || 'Unregistered'}</div>`
   - **Flaw:** If `invoice.party?.gstin` contains any string (even whitespace or a stale value), JavaScript truthiness causes it to print the GSTIN value instead of "Unregistered".
2. **Invoice Creation Header:**
   - **File:** `apps/web/src/app/invoices/new/invoice-header-fields.tsx` (Line 181)
   - **Code:** `<div><span className="font-bold">GSTIN:</span> <span className="font-mono">{selectedParty.gstin || 'Unregistered'}</span></div>`
   - **Flaw:** Identical fallback defect.
3. **Party Master Directory List:**
   - **File:** `apps/web/src/app/parties/page.tsx` (Line 96)
   - **Code:** `<div className="font-semibold text-slate-700 dark:text-slate-300">{p.gstin || 'Unregistered'}</div>`
   - **Flaw:** Directly shows the raw `gstin` string regardless of registration type.
4. **Party Creation / Edit Modal Dialog:**
   - **File:** `apps/web/src/app/parties/party-dialog.tsx` (Lines 150–159)
   - **Flaw:** The GSTIN input field is rendered unconditionally for every party. There is no `registrationType` selector. A user creating a retail consumer or unregistered entity sees a prominent GSTIN input with placeholder `"27AABCA1234F1Z5"`.
5. **Backend Master Persistence Service:**
   - **File:** `apps/api/src/modules/party/party.service.ts` (Lines 108, 158)
   - **Flaw:** `party.gstin` accepts and persists any uppercase string. Because the backend has no concept of `registration_type`, it cannot enforce that GSTIN must be `NULL` for unregistered entities.
6. **Voucher Immutability & Snapshot Gap:**
   - **File:** `apps/api/src/infrastructure/persistence/entities/invoice.orm-entity.ts` (Lines 57–63)
   - **Flaw:** Invoices do not store snapshots of party name, registration type, GSTIN, or billing/shipping address. When loading an invoice, TypeORM executes a dynamic join on `parties`. If the party master is updated or corrupted later, all past issued/posted invoices reflect the altered GSTIN.

### 3. Root Cause Classification
- **Root Cause 1 (Absence of Registration Policy):** The database schema (`PartyOrmEntity`) lacks a `registration_type` column. Without an explicit registration taxonomy, the system cannot enforce whether GSTIN is *Required*, *Optional*, or *Forbidden*.
- **Root Cause 2 (UI Rendering Truthiness):** The pattern `{party.gstin || 'Unregistered'}` is used everywhere rather than checking the party's legal registration status via a shared formatter.
- **Root Cause 3 (Stale Data Retention):** When an entity changes from registered to unregistered, the previous GSTIN is not cleared or archived.
- **Root Cause 4 (Absence of Voucher Snapshots):** Vouchers dynamically link to the live party record, violating accounting immutability.

---

## PART B: EVIDENCE-BASED AUDIT (ITEMS 1 TO 14)

### 1. Registration Type
- **Current State:** **MISSING.**
- **Table:** `parties` (`apps/api/src/infrastructure/persistence/entities/party.orm-entity.ts#L40-47`).
- **Evidence:** Only `party_type` exists with values `CUSTOMER`, `VENDOR`, and `BOTH`. There is zero representation of statutory registration status.
- **Expected Taxonomy:**
  - `REGULAR`: Normal taxpayer. GSTIN is **MANDATORY**.
  - `COMPOSITION`: Composition dealer. GSTIN is **MANDATORY**; bill of supply only; no ITC.
  - `UNREGISTERED`: Consumer / Unregistered vendor. GSTIN is **FORBIDDEN** (must be NULL).
  - `SEZ_UNIT` & `SEZ_DEVELOPER`: Special Economic Zone. GSTIN is **MANDATORY**; inter-state deemed supply.
  - `DEEMED_EXPORT`: Section 147 supply. GSTIN is **MANDATORY**.
  - `OVERSEAS`: Non-resident / Export. GSTIN is **FORBIDDEN**; country and currency required.
  - `UIN_HOLDER`: Consulates / Embassies / UN. 15-character UIN required.

### 2. GSTIN Rules
- **Storage:** `parties.gstin VARCHAR(15) NULL`.
- **Validation:**
  - **Function:** `validateGstin(gstin: string)` in `packages/gst-rules/src/gstin-validator.ts#L13-L52`.
  - **Tests:** `packages/gst-rules/test/gstin.spec.ts` (16 test cases).
  - **Checks Performed:** 15-character length, standard GSTIN regex (`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`), valid state code (`01`–`37`), and Mod-36 checksum on character 15.
- **Gaps:**
  - No database-level CHECK constraint enforcing `gstin IS NULL` when `registration_type = 'UNREGISTERED'`.
  - No uniqueness constraint scoped per company (`(company_id, gstin)`).
  - Stale GSTIN values are never cleared on type transitions.

### 3. Registration Lifecycle & Effective-Dating
- **Current State:** **NOT IMPLEMENTED.**
- **Evidence:** `PartyOrmEntity` stores only current scalar fields. No history table exists.
- **Risk:** If customer "ABC Corp" was unregistered from April to September and registered for GST on October 1st, changing their status in the master today retroactively alters April's tax invoices to show the new GSTIN, causing severe tax audit non-compliance.
- **Required Model:** `party_registrations` table with `party_id`, `registration_type`, `gstin`, `valid_from`, and `valid_to`.

### 4. Multiple GSTINs per Legal Entity
- **Current State:** **NOT SUPPORTED.**
- **Evidence:** `PartyOrmEntity` has a single `gstin` string column.
- **Risk:** Enterprise clients with operations across multiple states (e.g. Tata Motors in Maharashtra `27` and Gujarat `24`) cannot be linked to distinct state registrations under one umbrella customer.

### 5. Addresses (Billing & Shipping)
- **Current State:** **FLATTENED COLUMNS ON PARTY ENTITY.**
- **Evidence:** `party.orm-entity.ts#L60-89` defines:
  - `billing_address_line1`, `billing_address_line2`, `billing_city`, `billing_state`, `billing_state_code`, `billing_pincode`
  - `shipping_address_line1`, `shipping_city`, `shipping_state_code`, `shipping_pincode`
- **Gaps:**
  - Does not support multiple shipping sites/warehouses.
  - Address state code is not cross-validated against the first 2 digits of the GSTIN.
  - Addresses are not snapshotted into vouchers.

### 6. Party ↔ Ledger Relationship
- **Current State:** **OPTIONAL WEAK FOREIGN KEY.**
- **Evidence:** `party.orm-entity.ts#L103-108` (`ledger_id UUID NULL REFERENCES ledgers(id) ON DELETE SET NULL`).
- **Function:** `PartyService.createParty` (`apps/api/src/modules/party/party.service.ts#L88-99`).
  - If `ledgerId` is omitted, the code searches for any ledger whose parent group name matches `%Debtor%` or `%Creditor%`, attaching all customers to one single shared control ledger!
- **Gaps:**
  - Parties do not get dedicated, auto-numbered sub-ledgers.
  - A party marked `BOTH` (customer and vendor) cannot maintain separate receivable and payable ledgers.
  - Zero duplicate detection on creation (same GSTIN, PAN, or normalized trade name).

### 7. Tax Rate Sources and Precedence
- **Current State:** **HARDCODED DEFAULT IN LINE ITEMS.**
- **Evidence:** `InvoiceService.createInvoice` (`apps/api/src/modules/invoice/invoice.service.ts#L175-181`):
  ```typescript
  const gstRate = isZeroRatedOrExempt
    ? new Decimal(0)
    : new Decimal(itemInput.gstRatePercent !== undefined ? itemInput.gstRatePercent : 18);
  ```
- **Gaps:**
  - No centralized `TaxRateResolver`.
  - Item master HSN rates, party-level tax overrides, and manual line overrides have no documented resolution order or audit trail.

### 8. Master vs Voucher Immutability (Snapshot Gap)
- **Current State:** **CRITICAL VULNERABILITY (NO SNAPSHOT).**
- **Evidence:** `InvoiceOrmEntity` (`invoice.orm-entity.ts#L57-63`) stores only `partyId`.
- **Behavior:** Querying an invoice calls `leftJoinAndSelect('invoice.party', 'party')`.
- **Impact:** Any modification to a party's name, address, or GSTIN immediately alters historical issued and posted invoices.

### 9. Place of Supply & Tax Split
- **Current State:** **BASIC STATE MATCHING.**
- **Function:** `resolvePlaceOfSupply` in `packages/gst-rules/src/place-of-supply.ts#L20-78`.
- **Behavior:**
  - If `supplierStateCode === placeOfSupplyStateCode` $\rightarrow$ `INTRA_STATE` (CGST + SGST/UTGST).
  - Else $\rightarrow$ `INTER_STATE` (IGST).
  - Handles `isExport` and `isSez` flags.
- **Gaps:**
  - Does not distinguish between Goods (Section 10 IGST Act, where destination is delivery location) and Services (Section 12 IGST Act, recipient location on record).
  - Does not handle triangulation ("Bill-to Ship-to") where buyer is in State A but delivery is in State B.
  - Lacks ambiguous input handling ("Needs Clarification / Yellow").

### 10. Document Treatment per Registration Type
- **Current State:** **UNHANDLED.**
- **Evidence:** `InvoiceService` does not validate document type against party registration type:
  - Allows issuing a "Tax Invoice" with GST breakdown to an `UNREGISTERED` consumer without flagging B2C.
  - Allows issuing a "Tax Invoice" to a `COMPOSITION` dealer who cannot claim ITC.
  - No automated reverse-charge flag for purchases from unregistered suppliers where applicable.

### 11. Document Output (PDF & Exports)
- **Current State:** **LEAKS GSTIN FOR UNREGISTERED PARTIES.**
- **Evidence:** `invoice-party-details.tsx#L79` and `invoice-header-fields.tsx#L181` render:
  `GSTIN: {party.gstin || 'Unregistered'}`
  If `party.gstin` contains any string, it unconditionally displays the GSTIN.

### 12. Tally Mapping
- **Current State:** **MINIMAL ENVELOPE (LACKS STATUTORY TAGS).**
- **Function:** `TallyGatewayService.generateTallyXmlEnvelope` in `apps/api/src/modules/tally/tally-gateway.service.ts#L31-93`.
- **Gaps:**
  - Emits only `<PARTYLEDGERNAME>` and amounts.
  - Omits critical Tally statutory tags: `<GSTREGISTRATIONTYPE>`, `<PARTYGSTIN>`, `<STATENAME>`, and `<ISBILLWISEON>`.

### 13. Existing Data Quality in Database
- **Execution:** Direct audit query on PostgreSQL via `AppDataSource`.
- **Findings:**
  - Total Parties in DB: **0**
  - Total Invoices in DB: **0**
  - Legacy Data Issues: **0** (Database is currently clean with zero corrupted records, enabling a non-destructive, robust schema upgrade).

### 14. UI Behavior
- **Current State:** **STATIC FORMS WITH NO CONDITIONAL VISIBILITY.**
- **Evidence:** `PartyDialog` (`apps/web/src/app/parties/party-dialog.tsx`):
  - No `registrationType` selector.
  - GSTIN input is always displayed with a placeholder.
  - No dynamic masking, no inline checksum verification indicator, and no auto-lock of state based on GSTIN.

---

## AUDIT CONCLUSION & NEXT STEPS
The reported bug is a direct symptom of architectural gaps: the absence of a `registration_type` column on `parties`, the lack of a declarative `PartyRegistrationPolicy`, unconditional UI form inputs, and the lack of immutable party snapshots on invoices.

Per protocol:
1. Audit findings documented in `docs/party-audit.md`.
2. Statutory and mapping items documented in `docs/open-questions.md`.
3. **STOPPING HERE for user approval before drafting `docs/phases/party-fix-plan.md`.**

