# Party Master, GST Registration, Address and Tax-Treatment Integrity Report

**Document Reference:** `docs/phases/party-fix-report.md`  
**Execution Phase:** Step 3: Build & Step 4: Verification Complete  
**Audit Reference:** `docs/party-audit.md`  
**Master Plan Reference:** `docs/phases/party-fix-plan.md`  
**Statutory Verification Log:** `docs/open-questions.md`  
**Status:** Complete — Ready for User Sign-Off  

---

## 1. Executive Summary & Root Cause Resolution

### 1.1 Resolution of the Unregistered GSTIN Bug (Part A)
- **Root Cause Identified:**
  1. The legacy database `parties` table had no `registration_type` column (only `party_type`: `CUSTOMER`, `VENDOR`, `BOTH`), leaving statutory status implicit.
  2. The UI forms and invoice display components utilized raw fallback expressions like `{party.gstin || 'Unregistered'}` or `GSTIN: {party.gstin || 'Unregistered'}`. When an unregistered party had any string stored in `gstin`, or when rendering without a registration type check, it erroneously printed the GSTIN or formatted the label unconditionally.
  3. Invoices lacked immutable party snapshot columns, dynamically reading from the mutable `parties` table and mutating historical tax vouchers when party masters changed.
- **Architectural Fix Implemented:**
  1. **Relational Model & DB Constraints:** Created `party_registrations`, `party_addresses`, and `party_ledger_links` with PostgreSQL CHECK constraints `chk_gstin_registration_type` strictly enforcing `gstin IS NULL` for `UNREGISTERED` and `OVERSEAS` parties.
  2. **Single Declarative Registration Policy:** Implemented `PartyRegistrationPolicy` with a statutory truth matrix. Any attempt to supply a GSTIN to an unregistered or overseas party is blocked at the domain, API, and database layers.
  3. **Shared Universal Formatter:** Built `formatPartyTaxIdentity(registrationType, gstin)` in `@platform/shared-types` and `@platform/gst-rules`. Unregistered entities render `<Badge variant="neutral">Unregistered / Consumer</Badge>` with `showGstin: false`, guaranteeing that "GSTIN:" is never output across forms, lists, invoice details, or exports.
  4. **Immutable Document Snapshots:** Added snapshot columns (`party_name_snapshot`, `party_registration_type_snapshot`, `party_gstin_snapshot`, `billing_address_snapshot`, `shipping_address_snapshot`) to `invoices`. When an invoice is issued, the exact snapshot is captured; downstream reads and reprints read from snapshots exclusively.

---

## 2. Changes Made by Vertical Slice

### Slice 1: Database Migration & Entities
- **Migration Executed:** `1731300000000-PartyMasterGstIntegrityAndSnapshots.ts`:
  - Added `party_code`, `registration_type` (default `'REGULAR'`), and `currency` (`'INR'`) to `parties`.
  - Created `party_registrations` with effective dates (`valid_from`, `valid_to`), `verification_status`, and partial unique index `(company_id, gstin) WHERE gstin IS NOT NULL AND status = 'ACTIVE'`.
  - Created `party_addresses` with multi-site support and partial unique indexes for `is_default_billing` and `is_default_shipping`.
  - Created `party_ledger_links` with `UNIQUE (company_id, party_id, link_type)`.
  - Added snapshot columns to `invoices`: `party_name_snapshot`, `party_trade_name_snapshot`, `party_registration_type_snapshot`, `party_gstin_snapshot`, `party_pan_snapshot`, `billing_address_snapshot`, `shipping_address_snapshot`, `tax_rule_version_snapshot`.
- **Entities Updated / Created:**
  - Updated `PartyOrmEntity` & `InvoiceOrmEntity`.
  - Created `PartyRegistrationOrmEntity`, `PartyAddressOrmEntity`, `PartyLedgerLinkOrmEntity`.
  - Registered in `data-source.ts`.

### Slice 2: Domain Engine (`@platform/gst-rules` & `@platform/shared-types`)
- **`PartyRegistrationPolicy`:** Truth matrix mapping `UNREGISTERED`, `REGULAR`, `COMPOSITION`, `SEZ_UNIT`, `SEZ_DEVELOPER`, `DEEMED_EXPORT`, `OVERSEAS`, `UIN_HOLDER` to GSTIN requirement (`FORBIDDEN` vs `REQUIRED`), allowed document types, tax splits, and Tally export tags.
- **`TaxRateResolver`:** Statutory precedence engine (Item Master HSN rate $\rightarrow$ Party concession override $\rightarrow$ Manual voucher override triggering maker-checker approval).
- **`formatPartyTaxIdentity`:** Shared UI and export identity formatter with strict zero-GSTIN guarantee for unregistered parties.

### Slice 3: API Party Master & Ledger Auto-Provisioning (`@platform/api`)
- Updated `PartyService`:
  - Validates party registration against statutory truth matrix before insertion.
  - Auto-allocates structured party codes (`CUST-0001`, `VEND-0001`, `PRTY-0001`).
  - Implements duplicate detection on active GSTIN and PAN within the company.
  - Persists associated `party_registrations`, default `party_addresses`, and `party_ledger_links`.

### Slice 4: Invoice Service Snapshot & Immutability (`apps/api`)
- Updated `InvoiceService`:
  - Captures party snapshots on invoice creation, enforcing `partyGstinSnapshot = null` for unregistered consumers.
  - Synthesizes snapshot data in `toDto`, guaranteeing historical immutability if the counterparty master is subsequently renamed or reclassified.

### Slice 5: User Interface Redesign (`apps/web`)
- **`PartyDialog` (`apps/web/src/app/parties/party-dialog.tsx`):**
  - Added `registrationType` selector.
  - When `UNREGISTERED` or `OVERSEAS` is chosen, the GSTIN input is completely hidden, and an informative banner is displayed explaining that B2C supply rules apply and GSTIN is disabled.
  - When switching to unregistered, any entered GSTIN is automatically cleared.
- **Party Directory (`apps/web/src/app/parties/page.tsx`):**
  - Replaced raw fallback column with structured `Tax Registration & GSTIN` column powered by `formatPartyTaxIdentity`.
- **Invoice Header & Details (`invoice-header-fields.tsx`, `invoice-party-details.tsx`):**
  - Reads from snapshot fields.
  - Never emits "GSTIN:" string for unregistered consumers. Displays tax treatment badge and clean address metadata.

### Slice 6: Tally Prime XML Statutory Sync
- Enhanced `TallyGatewayService`:
  - Added `generatePartyLedgerXmlEnvelope` generating official TallyPrime `<LEDGER>` envelopes with `<GSTREGISTRATIONTYPE>`, `<PARTYGSTIN>`, `<STATENAME>`, `<COUNTRYNAME>`, and `<ISBILLWISEON>Yes</ISBILLWISEON>`.
  - Unregistered parties emit `<GSTREGISTRATIONTYPE>Consumer</GSTREGISTRATIONTYPE>` and empty `<PARTYGSTIN></PARTYGSTIN>`.

---

## 3. Automated Test Suite Results

| Test Suite | Tests Passed | Status |
| :--- | :--- | :--- |
| `@platform/accounting-core` | 23 / 23 passed | **PASS** |
| `@platform/gst-rules` | 27 / 27 passed | **PASS** |
| `@platform/api` (including `party-integrity.spec.ts`) | 79 / 79 passed | **PASS** |
| **Total Automated Tests** | **129 / 129 passed** | **100% PASS** |
| Next.js Web Production Build (`@platform/web`) | 31 / 31 routes generated | **PASS** |

---

## 4. Operational Invariants Verified

1. **Zero Preventable Master-Data Errors:** Database CHECK constraints and domain validators reject invalid GSTINs, mismatched state codes, and forbidden GSTINs on unregistered entities.
2. **Immutability of Issued Documents:** Invoices snapshot legal name, registration type, GSTIN, PAN, and address at time of issue. Changing master records does not mutate posted invoices.
3. **Clean Statutory Output:** Unregistered retail consumers never emit a GSTIN in UI tables, voucher details, or Tally XML envelopes.

