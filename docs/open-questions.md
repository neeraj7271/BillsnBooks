# Open Questions & Statutory Verification Registry

This document records all commercial decisions, Indian statutory tax law assumptions, RBI mandate rules, and payment-gateway constraints marked as `TODO(verify)`. In accordance with platform governance, no pricing, plan names, or legal assumptions are hard-coded into application logic without verified reference.

---

## 1. Banking & Payment Gateway Mandates (RBI Regulations)

### OQ-01: RBI Recurring Payment E-Mandates (UPI AutoPay & Cards)
* **Context:** Workstream 2 automated subscription recurring renewals via card e-mandates and UPI AutoPay.
* **Items to Verify:**
  1. **AFA Exemption Limit:** Verify current RBI circular limits for recurring transactions without Additional Factor of Authentication (AFA). (Historically ₹5,000, raised to ₹15,000 for e-mandates, and ₹1,00,000 for mutual funds/insurance/education).
  2. **Pre-Debit Notification:** Verify the mandatory pre-debit SMS/email notification window (minimum 24 hours prior to debit) and customer opt-out/pause mechanism required by RBI.
  3. **Mandate Registration:** Customer AFA requirement during the initial mandate registration transaction (e.g. ₹1 or ₹2 auth debit).
* **Impacted Components:** `PaymentGateway` adapter, BullMQ subscription renewal queue, dunning scheduler.
* **Status:** `TODO(verify)` with designated payment gateway partner integration guidelines.

### OQ-02: Payment Gateway Partner Evaluation
* **Context:** Gateway adapter selection for B2B SaaS in India.
* **Candidates:**
  * **Razorpay:** High UPI AutoPay & card mandate conversion, mature subscriptions API, standard Indian webhooks.
  * **Cashfree:** Strong auto-collect virtual accounts, competitive payout & subscription fees, robust webhook verification.
  * **Stripe India:** Excellent developer SDK, but recurring mandate support on domestic Indian cards faces high decline rates due to RBI e-mandate compliances.
* **Items to Verify:** Domestic corporate credit card recurring support, webhook idempotency guarantees, net settlement timing ($T+1$ vs $T+2$).
* **Status:** `TODO(verify)` pending commercial agreements.

---

## 2. Statutory GST & Tax Invoicing on Platform SaaS

### OQ-03: GST Place of Supply (POS) Determination for Subscriptions
* **Context:** Platform generates statutory tax invoices to tenants for software subscriptions.
* **Items to Verify:**
  1. **B2B Tenants (GST Registered):** POS is the location of the recipient based on verified GSTIN (Section 12(2) of IGST Act). If tenant state equals platform billing branch state $\rightarrow$ CGST + SGST; otherwise $\rightarrow$ IGST.
  2. **B2C / Unregistered Tenants:** POS is the billing address on record. If billing address unavailable, location of supplier applies.
  3. **SAC Code Classification:** Verify whether SAC `997331` (Licensing services for the right to use computer software) or SAC `998313` (Information technology design and development / Cloud SaaS hosting) applies. Default rate: 18%.
* **Status:** `TODO(verify)` with company tax counsel.

### OQ-04: E-Invoicing Applicability to Platform Turnover
* **Context:** Generating IRN (Invoice Reference Number) and signed QR code via GST NIC portal under Rule 48(4).
* **Items to Verify:** Current statutory turnover threshold (₹5 Crore aggregate turnover in any preceding financial year from 2017-18 onward). If platform aggregate turnover exceeds threshold, platform subscription invoices must generate IRN via IRP API.
* **Status:** `TODO(verify)` with platform CFO/finance team.

---

## 3. Data Protection, Privacy & Statutory Retention (DPDP Act 2023)

### OQ-05: Statutory Financial Records Retention vs DPDP Right to Erasure
* **Context:** Tenant offboarding and right to erasure under the Digital Personal Data Protection Act, 2023 (DPDP).
* **Conflict to Resolve:**
  * **DPDP Act 2023:** Data principals have the right to withdrawal of consent and erasure of personal data once the specified purpose is fulfilled.
  * **Section 128(5) of Companies Act, 2013:** Books of account and vouchers must be retained in good order for not less than **8 financial years** immediately preceding a financial year.
  * **Section 36 of CGST Act, 2017:** Registered persons must retain books and accounts until the expiry of **72 months (6 years)** from the due date of furnishing of annual return for the relevant year.
* **Statutory Invariant:** Tax and financial statutory retention overrides general data erasure requests. Personal identity credentials (passwords, phone tokens) can be scrubbed, but general ledger audit trails and tax invoice records must be archived in immutable cold storage for 8 years.
* **Status:** `TODO(verify)` with legal counsel.

### OQ-06: CA Firm as Data Fiduciary vs Data Processor
* **Context:** Practice management portal where CA firms manage multiple SME clients.
* **Items to Verify:**
  * When a CA firm uploads client documents or maintains client books, is the platform a "Data Processor" and the CA firm the "Data Fiduciary", or is the SME tenant the primary Data Fiduciary?
  * Standard Data Processing Addendum (DPA) required between the platform and CA practice users.
* **Status:** `TODO(verify)` with legal counsel.

---

## 4. Commercial & Subscription Models

### OQ-07: CA Firm Client Company Transfer & Billing Model
* **Context:** CA firm initiates an account for a client SME, pays during the engagement, and later transfers billing ownership to the SME.
* **Items to Verify:**
  1. Protocol for transferring a subscription billing account without interrupting active accounting books.
  2. Proration treatment when a client company is unlinked from a CA bulk tier to an independent SME subscription.
* **Status:** `TODO(verify)` with product management.

### OQ-08: Plan Limits & Overage Policies (Placeholder Plans)
* **Context:** Exact pricing and limits must not be hardcoded in code.
* **Items to Verify:** Confirmation that initial seed plans (`STARTER_BILLING`, `BUSINESS`, `ACCOUNTING_PRO`, `CA_PRACTICE`, `ENTERPRISE`) remain pure database-driven seeds with explicit `is_placeholder: true` metadata.
* **Status:** `TODO(verify)` with commercial leadership.
