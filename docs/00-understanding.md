# Document 00: Product Understanding, Module Map, Ambiguities & Glossary

**Project:** End-to-End Accounting Operations Platform  
**Author:** Principal Software Architect & Senior Full-Stack Engineer  
**Status:** Under Review (Step 0)  
**Date:** October 2026  

---

## 1. Executive Product Summary

The **End-to-End Accounting Operations Platform** is an enterprise-grade financial operating system designed for Indian businesses, chartered accountants (CAs), tax practitioners, bookkeepers, and corporate finance teams. Rather than being merely a billing tool, an OCR scanner, or a basic Tally utility, the platform represents a **unified accounting intelligence engine and native cloud bookkeeping system** that natively bridges legacy desktop accounting software (primarily TallyPrime/Tally.ERP9) with cloud-native double-entry books.

### 1.1 Operating Modes
The platform operates seamlessly in three explicit modes:
1. **Tally-Connected Mode:** Tally remains the authoritative system of record. The platform serves as an intelligent upstream automation, ingestion, GST validation, maker-checker approval, and mobile management layer. Entries are verified via a secure local connector with strict read-back verification.
2. **Cloud-Native Mode:** The platform is the authoritative system of record. It maintains an immutable, double-entry general ledger with database-level invariants, financial statement compilation (P&L, Balance Sheet, Trial Balance), inventory, period locks, and statutory GST filing preparation.
3. **Hybrid Mode:** Companies manage certain entities natively on the cloud while legacy entities or specific transaction streams remain anchored in Tally, governed by strict, mutually exclusive source-of-truth rules to guarantee zero duplicate postings or ledger drift.

### 1.2 Core Value Proposition & Architectural Tenet
The foundational philosophy is:
> **Capture → Understand → Identify → Classify → Validate → Resolve → Approve → Post → Verify → Reconcile → Monitor → Report**

Key non-negotiables:
- **Zero Silent Assumptions:** The platform never silently guesses tax treatments, reconciles ambiguous bank credits as revenue, or overrides failed statutory validations. When uncertainty exists, the system flags, isolates, and routes to human review.
- **Deterministic Statutory Validation:** Artificial Intelligence and OCR are restricted to document extraction, entity parsing, fuzzy matching, and advisory classification. Mandatory GST, TDS, and double-entry invariants are enforced by deterministic, versioned rule engines and database constraints.
- **Auditable & Reversible:** Posted transactions are immutable. Modifications occur exclusively through reversals, credit/debit notes, and compensating journal entries with a complete audit chain linking bank transaction or raw document bytes to ledger impact.

---

## 2. Module Map

The platform is structured into ten cohesive modules that share a unified domain core:

```
+----------------------------------------------------------------------------------------------------+
|                                    CHANNELS & CONTROL SURFACES                                     |
|  Next.js Web App  |  Mobile App (React Native)  |  WhatsApp Assistant  |  Windows Tally Connector  |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                             SHARED ACCOUNTING INTELLIGENCE ENGINE                                  |
|  [ Ingest ] ──► [ Extract ] ──► [ Master Match ] ──► [ GST Rules ] ──► [ Acc. Validate ]          |
|                                                                                │                   |
|  [ Verify Read-Back ] ◄── [ Post (Tally/Cloud) ] ◄── [ Maker-Checker Approval ] ◄┘                 |
+----------------------------------------------------------------------------------------------------+
         │                                   │                                      │
         ▼                                   ▼                                      ▼
+-----------------------+   +---------------------------------+   +----------------------------------+
|  TRANSACTION MODULES  |   |    CORE LEDGER & COMPLIANCE     |   |   PRACTICE & COLLABORATION       |
|  • Bulk Import Wizard |   |    • Double-Entry Engine        |   |   • CA Practice Workspace        |
|    (Excel/CSV/PDF)    |   |    • Period Locks & Reversals   |   |   • Multi-Client & Team Scoping  |
|  • Bank Statement     |   |    • GST Reconciliation         |   |   • Statutory Compliance Calendar|
|    Intelligence       |   |      (GSTR-1, 2B, 3B, IMS)      |   |   • Client Portal & Secure Docs  |
|  • Sales Discovery    |   |    • Financial Statements       |   |   • Maker-Checker Approvals      |
|  • Purchase & ITC     |   |      (TB, P&L, Balance Sheet)   |   |   • Multi-Channel Notifications  |
|  • Invoicing & Billing|   |    • Gap-Free Sequence Engine   |   |     (WhatsApp, Email, In-App)    |
|  • Collections & Recur|   |    • TDS / TCS Registers        |   |                                  |
+-----------------------+   +---------------------------------+   +----------------------------------+
                                             │
                                             ▼
+----------------------------------------------------------------------------------------------------+
|                              PLATFORM FOUNDATION & INFRASTRUCTURE                                  |
|  • Multi-Tenancy with Postgres Row-Level Security (RLS) & Tenant Scoping                           |
|  • Transactional Outbox Pattern & BullMQ Queue Processing                                          |
|  • Field-Level Encryption at Rest (PAN, Bank Details, Secrets)                                     |
|  • Immutable Append-Only Audit Logging & Hash Verification                                         |
+----------------------------------------------------------------------------------------------------+
```

### Module Breakdown:
1. **Platform Foundation & Security:**
   - Multi-tenant tenant/firm/client/company isolation via PostgreSQL Row-Level Security (`SET LOCAL app.tenant_id`).
   - Authentication (JWT + rotating refresh token cookies, MFA support), RBAC, policy-based authorization guards.
   - Transactional outbox table, event dispatcher, and BullMQ worker infrastructure.
   - Field-level AES-256-GCM encryption for PII/banking/statutory data.
2. **Shared Accounting Intelligence Engine (AIE):**
   - Universal 8-stage transaction lifecycle pipeline: Ingest → Extract → Master Data Match → GST Rules → Accounting Validation → Risk/Approval State → Post → Read-Back Verify.
   - Pluggable OCR/LLM adapters with strict confidence scores; deterministic rule gates that AI cannot bypass.
3. **Core Double-Entry Accounting Engine:**
   - Canonical chart of accounts, hierarchical ledger groups, ledgers, and cost centres.
   - Balanced voucher posting (Sales, Purchase, Payment, Receipt, Contra, Journal, Debit Note, Credit Note).
   - Database-level balancing triggers (`SUM(debit) = SUM(credit)` per voucher), period locking, and immutable posted entries.
   - Gap-free, series-wise, per-company, per-FY document sequence generators.
4. **Bulk Import & Document Processing:**
   - Universal ingestion for Excel, CSV, PDF invoices, and scanned vouchers.
   - Interactive column mapper, master auto-discovery, pre-import validation reports, and staging tables.
5. **Bank Statement Intelligence & Sales Discovery:**
   - Parser for major Indian bank statements (PDF, CSV, Excel), narration tokenizer, and UTR/UPI pattern extractor.
   - 1-to-1, 1-to-many, and many-to-1 invoice-to-receipt matching.
   - Sales discovery heuristic: flagging unidentified credits, verifying against loans/advances/transfers, and driving controlled invoice generation without auto-assuming revenue.
6. **Billing, Collections & Recurring Invoices:**
   - Web/Mobile invoice generation with HSN/SAC lookups, place of supply resolution, and bill-wise allocation.
   - Recurring billing schedules with auto-generation, re-validation, and reminders via WhatsApp/Email.
   - Payment links, ageing analysis, dispute tracking, and collections escalation.
7. **GST, Compliance & Financial Reporting:**
   - Versioned GST rules engine (`packages/gst-rules`) supporting CGST, SGST, IGST, UTGST, Cess, RCM, SEZ, exports, and composition schemes.
   - 3-way reconciliation: Purchase Register vs. GSTR-2B vs. IMS (Invoice Management System).
   - Compliance-ready JSON/Excel exports matching GST portal schemas.
   - Financial statements: Trial Balance, Trading Account, P&L, Balance Sheet, Ledger extracts.
8. **Tally Connector & Bi-Directional Synchronization:**
   - Windows desktop connector communicating outbound over encrypted WebSockets/HTTPS.
   - Master sync (groups, ledgers, items, tax units), voucher export with read-back verification, and offline queues.
9. **CA Firm Practice Management & Client Portal:**
   - Multi-client workspaces, staff assignment, workload dashboards, maker-checker authorization.
   - Statutory compliance calendar with filing deadlines and task dependencies.
   - Client portal for document uploads, query resolutions, and statement access.
10. **Mobile & Conversational Control Surface:**
    - Mobile-first approval inbox, invoice generation, bank review, and accounting health KPIs.
    - WhatsApp assistant for receipt uploads, status inquiries, and controlled draft creation.

---

## 3. Ambiguities & Assumptions (Flagged for Clarity)

Below is an explicit accounting and technical audit of ambiguities present in the blueprint or statutory landscape, along with our working architectural assumptions:

| # | Domain / Area | Ambiguity in Blueprint / Statutory Landscape | Architectural Assumption & Action Taken |
|---|---|---|---|
| **A-01** | **Tenancy Hierarchy** | Blueprint mentions Tenants, Firms, Clients, Companies, and Branches without defining their exact database hierarchy. | **Assumption:** Multi-tenancy is structured as: `Tenant` (Top-level billing account, e.g., a CA Firm or Enterprise) → `Client` (Business group or owner) → `Company` (Legal entity with PAN) → `Branch` (GSTIN-specific operational location). RLS is keyed at the `tenant_id` level, with mandatory `company_id` and `branch_id` scoping in application queries. |
| **A-02** | **Tally Integration Protocol** | Tally supports XML-over-HTTP, ODBC (read-only), and custom TDL (Tally Definition Language). TDL installation often requires administrative privileges in client environments. | **Assumption:** We default to Tally's standard XML-over-HTTP port interface (typically port 9000) using outbound HTTP/long-polling from the Windows Connector. Custom TDL will only be introduced via an optional plugin for advanced high-volume querying to minimize customer setup friction. |
| **A-03** | **GST Rounding & Section 170** | GST rules specify rounding off of tax amount to the nearest Rupee (Section 170 of CGST Act), but line-item vs. invoice-level rounding discrepancies regularly cause 1-paisa balancing issues between Tally and GST portal schemas. | **Assumption:** Line-item taxes are calculated using exact `NUMERIC(20,4)` precision. Total tax per component (CGST, SGST, IGST) is rounded to 2 decimal places per HSN, and final invoice rounding adjustment is posted to an automated "Round Off" ledger (`INDIRECT_EXPENSE` / `INDIRECT_INCOME`). |
| **A-04** | **Invoice Management System (IMS)** | GST Council introduced IMS in late 2024 / 2025 where taxpayers can accept, reject, or keep pending invoices in GSTR-2B. | **Assumption:** We treat IMS status as a discrete workflow state in the 3-way reconciliation engine (`ACCEPTED`, `REJECTED`, `PENDING`). The engine can output reconciliation records matching both traditional GSTR-2B static matching and dynamic IMS action sheets. |
| **A-05** | **E-Invoice / E-Way Bill Direct API Access** | Direct access to NIC/GSP APIs requires official GSP (GST Suvidha Provider) or ASP credentials, sandbox whitelisting, and strict IP bindings. | **Assumption:** We abstract e-invoice/e-way bill generation behind a pluggable `GspAdapter` interface. In Phase 0–1, we implement a robust `MockGspAdapter` that adheres strictly to the NIC schema, allowing seamless swap-in of real GSP credentials (e.g., Masters India, Clear, or Cygnet) once licensed. |
| **A-06** | **Bank Credit Classification (Sales Discovery)** | When an unknown bank credit arrives, auto-generating an invoice without knowing customer GSTIN or line items is legally risky under GST. | **Assumption:** Sales discovery creates an **Investigation Ticket** in the review queue. It suggests possible matches (historical customer, recurring advance). It NEVER automatically books revenue or generates an invoice until a human confirms item description, HSN, and Place of Supply. |
| **A-07** | **Money Representation & Precision** | JavaScript IEEE-754 floating-point numbers lead to catastrophic rounding errors in accounting (e.g., `0.1 + 0.2 !== 0.3`). | **Assumption:** Strict prohibition of native JS `number` for monetary values. Postgres stores `NUMERIC(20,4)`. Backend maps this via TypeORM transformer to `Decimal.js` instances. Shared frontend/DTO schemas validate decimal strings. |
| **A-08** | **Document Number Sequence Gaps** | Under Section 31 of CGST Act, invoices must be consecutive with unique serial numbers per financial year. Application-level autoincrement in concurrent systems can lead to sequence gaps on transaction rollback. | **Assumption:** We implement a dedicated sequence lock table with `SELECT FOR UPDATE` on `(company_id, voucher_type, series, financial_year)`. Numbers are reserved only inside the final posting transaction immediately prior to commit, guaranteeing gap-free consecutive numbering. |
| **A-09** | **Reversals vs. Deletions** | In draft state, can vouchers be deleted, or must all records be retained? | **Assumption:** Unposted `DRAFT` vouchers can be hard-deleted or soft-deleted. Once a voucher transitions to `POSTED`, it is strictly immutable. Any modification requires a compensating `REVERSAL` voucher with a direct foreign key link to the original voucher. |
| **A-10** | **WhatsApp Integration & Approvals** | Executing financial postings directly via unstructured WhatsApp text messages poses severe authentication and non-repudiation risks. | **Assumption:** WhatsApp can ingest documents, send status notifications, and prompt approvals. However, clicking "Approve" triggers a signed, short-lived magic link opening an authenticated mobile web view with biometric/pin confirmation, rather than executing raw database mutations from incoming chat webhooks. |

---

## 4. Comprehensive Accounting & Compliance Glossary

To establish unambiguous domain vocabulary across engineering, product, and accounting teams, the following terms are codified:

- **Voucher (वाउचर):** The primary business document recording a financial transaction. A voucher contains metadata (date, number, party, narration, company) and encapsulates one or more double-entry journal postings. Types include:
  - `SALES`: Outward supply of goods or services.
  - `PURCHASE`: Inward supply of goods or services.
  - `RECEIPT`: Inflow of funds into cash or bank accounts.
  - `PAYMENT`: Outflow of funds from cash or bank accounts.
  - `CONTRA`: Internal fund transfers (cash to bank, bank to cash, bank to bank).
  - `JOURNAL`: Non-cash adjustments, provisions, depreciation, and closing entries.
  - `CREDIT_NOTE`: Document issued to reduce the taxable value or tax of an earlier outward invoice.
  - `DEBIT_NOTE`: Document issued to increase taxable value or record purchase returns.
- **Ledger (खाता):** A distinct accounting head under the Chart of Accounts representing assets, liabilities, equity, revenues, or expenses. Every journal posting references an account ledger.
- **Chart of Accounts (CoA):** The hierarchical structural classification of all ledgers, grouped into statutory primary categories: *Capital Account, Current Assets, Current Liabilities, Fixed Assets, Investments, Loans, Direct Incomes, Indirect Incomes, Direct Expenses, Indirect Expenses, Suspense*.
- **Double-Entry Invariant:** The fundamental law of accounting: for every posted voucher, the sum of debits must identically equal the sum of credits ($\sum \text{Debit} = \sum \text{Credit}$). In this platform, this invariant is enforced at the database layer via PostgreSQL constraint triggers.
- **Bill-Wise Allocation (Reference Tracking):** Tracking receivables and payables against specific invoice numbers. Types: `New Ref` (new invoice), `Agst Ref` (settling an existing invoice), `Advance` (payment received before invoice), and `On Account` (unallocated payment).
- **Period Lock:** An administrative barrier closing an accounting period (e.g., month or financial year end). Once locked, no transactions can be posted, modified, or reversed within that date range without explicit super-admin override and audit capture.
- **GSTIN (Goods and Services Tax Identification Number):** A 15-character alphanumeric identifier assigned to every registered taxpayer in India (2 chars State Code + 10 chars PAN + 1 char Entity Number + 1 char 'Z' + 1 checksum digit).
- **Place of Supply (POS):** The statutory determination of whether a supply is inter-state or intra-state:
  - *Intra-State Supply* (Supplier State = Place of Supply): Levies **CGST** (Central GST) + **SGST** (State GST) or **UTGST** (Union Territory GST).
  - *Inter-State Supply* (Supplier State $\neq$ Place of Supply): Levies **IGST** (Integrated GST).
- **HSN / SAC (Harmonized System of Nomenclature / Services Accounting Code):** Standardized 2, 4, 6, or 8-digit codes used to classify goods (HSN) and services (SAC) for statutory GST rate determination.
- **ITC (Input Tax Credit):** The GST paid on inward purchases of goods and services that a business can deduct from its output GST liability, subject to Section 16/17(5) of the CGST Act (blocked credits) and invoice presence in GSTR-2B.
- **GSTR-1:** Monthly or quarterly statutory return detailing outward supplies (sales, credit notes, exports).
- **GSTR-2B:** An auto-drafted, static Input Tax Credit (ITC) statement generated by the GST portal on the 14th of each month for inward supplies reported by suppliers.
- **GSTR-3B:** A self-declared summary monthly return of outward supplies, inward supplies liable to reverse charge, eligible ITC claimed, and tax paid.
- **IMS (Invoice Management System):** An interactive portal mechanism introduced to allow recipients to accept, reject, or keep invoices pending before GSTR-2B generation.
- **E-Invoice & IRN (Invoice Reference Number):** Mandatory electronic invoicing system for registered businesses exceeding prescribed turnover thresholds. Requires registering the invoice with the Invoice Registration Portal (IRP), generating a unique 64-character hash (IRN) and a digitally signed QR code.
- **E-Way Bill:** An electronic permit required for physical movement of goods worth over ₹50,000 (inter-state or intra-state depending on state rules), detailing consignor, consignee, and transporter/vehicle data.
- **RCM (Reverse Charge Mechanism):** A statutory provision under Section 9(3) or 9(4) where the recipient of goods or services is liable to pay GST directly to the government instead of the supplier.
- **TDS (Tax Deducted at Source) / TCS (Tax Collected at Source):** Direct tax requirements under the Income Tax Act (and specific GST provisions) where a percentage is deducted at payment time and deposited to the government.
- **Read-Back Verification:** The protocol in integration pipelines where, after submitting a voucher to Tally or an external system, the engine queries the destination system, retrieves the saved record, and byte/field-compares it with the payload to confirm identical state before marking the job completed.
- **Transactional Outbox:** An enterprise architecture pattern where domain events are committed to a relational database table within the same atomic transaction as the business entity changes, guaranteeing reliable event publication to BullMQ workers without dual-write hazards.
- **Maker-Checker:** A segregation-of-duties workflow where one user creates/prepares a transaction (Maker) and a different authorized user reviews and approves it (Checker) before posting to the general ledger.

---

This document represents the baseline domain and structural understanding governing all subsequent architecture and implementation milestones.

