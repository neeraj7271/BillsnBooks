---
title: "End-to-End Accounting Operations Platform — Master Product Blueprint"
type: "Product vision and requirements blueprint"
status: "Working document"
---

**END-TO-END
ACCOUNTING OPERATIONS PLATFORM**

Master Product Blueprint

Accounting automation • Native cloud bookkeeping • Tally integration
GST and compliance workflows • CA practice management • Mobile controls

*Compiled from the product discussion*


# Document purpose

This document consolidates the product direction, requirements, workflows, architecture recommendations, commercial opportunities and phased roadmap discussed so far. It is intended for the founder, product/design team, engineering team, accounting-domain experts and implementation partners.

The product is broader than a Tally utility or invoice generator. It is an end-to-end accounting operations platform for businesses, individuals, accountants, bookkeepers, finance teams and CA firms. Customers must be able to use it with Tally, without Tally, or in a controlled hybrid arrangement.

This is a product blueprint, not a verified legal, tax or implementation specification. Current GST rates, statutory rules, portal formats, API permissions, pricing and vendor capabilities must be independently researched before release.

## Contents

1. Executive vision and product principles

2. Target customers and use cases

3. Product modes and surfaces

4. Shared Accounting Intelligence Engine

5. Core accounting modules

6. Bank statement to books and sales discovery

7. Billing, collections and recurring invoices

8. GST, tax and compliance readiness

9. Native cloud accounting

10. Tally integration

11. CA practice management

12. Mobile, WhatsApp and notifications

13. Future features and upsells

14. Technical architecture and data model

15. Security, accuracy and auditability

16. Commercial model

17. Roadmap

18. Risks and research requirements

19. Success metrics and final product definition

# 1. Executive product vision

Build an end-to-end Accounting Operations Platform that helps businesses and accounting professionals capture financial information, understand transactions, validate accounting and GST treatment, resolve missing information, approve work, maintain books, prepare compliance data and monitor operations from web, mobile and conversational interfaces.

The platform should save time for CAs, accountants, bookkeepers, finance teams and business owners. It should reduce repetitive data entry, prevent known avoidable errors from reaching the books, make exceptions visible, and give users mobile control over invoices, transactions, approvals, reminders, documents and work status.

## Positioning

An end-to-end Accounting, Bookkeeping, GST Compliance and Practice Management Platform — with native cloud accounting and optional integration with Tally and other systems.

## Product principles

One platform, multiple experiences: web, mobile, WhatsApp, client portal and desktop connector.

One shared accounting intelligence and validation engine across every input channel.

Tally is an integration option, not a mandatory dependency.

Native cloud bookkeeping must be a real double-entry accounting system, not just an invoice and expense tracker.

Do not post uncertain transactions silently. Ask, flag, route for review or block them.

Use deterministic, versioned accounting and GST rules for mandatory checks; AI may extract, classify and suggest but must not override failed rules.

Every posted transaction must be traceable to its source, extraction, validation, approval, posting and verification.

Mobile is a control surface for daily operations, not just a notification viewer.

Build the broad vision through phased releases; do not launch many unreliable modules at once.

## Accuracy promise and limitation

The objective is to drive known preventable errors passing controls as close to zero as possible. No software can honestly guarantee a 100% error-free accounting or tax outcome: source documents can be wrong, users can provide incomplete facts, regulations can change, integrations can fail and professional judgment may be required. The system must expose uncertainty, preserve evidence, support expert review and verify actual postings.

# 2. Target customers and use cases

| Segment | Needs | Product value |
| --- | --- | --- |
| Individual / small business | Invoices, receipts, expenses, customer balances, reminders and basic reports. | Simple operations without learning complex accounting software. |
| Growing SME / trader / wholesaler / manufacturer | Complete books, inventory, bank reconciliation, GST workflows, multi-user controls. | Reliable bookkeeping and visibility. |
| Freelancer / consultant | Invoices, receipts, expenses, customer balances and tax-ready records. | Simple billing and organized records. |
| Accountant / bookkeeper | Bulk imports, bank processing, ledger mapping, voucher preparation and reconciliation. | Less repetitive entry and review time. |
| CA / tax practitioner | Compliance-ready data, GST reconciliation, client documents, reviews and filing preparation. | Higher client capacity and consistent work. |
| CA firm | Multi-client, multi-company, staff, approvals, tasks, compliance calendar and portal. | Manage the practice from one workspace. |
| In-house finance team | Approval hierarchies, branch accounting, transaction controls and reports. | Controlled finance operations. |


## Representative use cases

A shop owner creates and sends a GST invoice from a phone.

An accountant uploads an Excel sales register, resolves mapping and GST exceptions, then posts verified vouchers to Tally.

A bookkeeper uploads a bank statement and matches receipts, payments, advances and transfers.

A CA firm manages hundreds of clients, some using Tally and others maintaining books in the platform.

A business without Tally maintains complete cloud books and prepares GST/compliance data.

A finance manager reviews approvals, overdue balances and unreconciled transactions on mobile.

# 3. Product modes and surfaces

| Mode | Books maintained in | Typical user |
| --- | --- | --- |
| Tally-connected | Tally remains authoritative; our platform provides automation, validation, workflow and mobile controls. | Existing Tally users. |
| Cloud-native | Our platform; no Tally required. | Businesses, accountants and CA firms. |
| Hybrid | Controlled combination with explicit source-of-truth rules. | Businesses transitioning or operating multiple environments. |


Hybrid mode requires an explicit authority rule for each company and transaction type. Otherwise duplicate vouchers and conflicting balances can arise.

| Surface | Purpose |
| --- | --- |
| Web application | Full accounting, administration, reporting, configuration and practice management. |
| Mobile application | Invoices, approvals, bank review, notifications, tasks, collections and accounting controls. |
| WhatsApp assistant | Conversational invoice requests, document collection, reminders and status queries. |
| Windows Tally Connector | Secure local bridge to Tally installations. |
| Client portal | Document submission, task visibility, invoice access, approvals and CA-client communication. |
| Accounting Intelligence Engine | Shared transaction understanding, validation and exception handling. |


# 4. Shared Accounting Intelligence Engine

Every input — Excel, CSV, PDF, image, bank statement, WhatsApp message, mobile form, email attachment, API or Tally data — should pass through a common transaction lifecycle. This prevents each module from implementing inconsistent accounting logic.

## 4.1 Document Intelligence

Accept Excel, CSV, PDF, scanned PDF, photos, handwritten documents, WhatsApp/email attachments, bank statements, purchase orders, delivery challans, debit notes and credit notes.

Classify documents and extract parties, dates, numbers, GSTINs, HSN/SAC, items, quantities, values and tax components.

Detect poor quality, missing pages, duplicates and inconsistent fields.

Attach field-level confidence and source evidence where practical.

Allow correction while preserving original and corrected values.

## 4.2 Master Data Intelligence

Maintain companies, branches, customers, suppliers, GST registrations, ledgers, groups, stock items, units, godowns, cost centres, bank accounts, tax ledgers and voucher types.

Perform fuzzy matching and duplicate detection; suggest rather than silently create duplicates.

Validate GSTIN format/checksum and use authorized verification services where available.

Synchronize masters with Tally for connected companies.

Detect conflicting or stale masters and require approval for sensitive changes.

## 4.3 GST Rules Engine

Build a deterministic, version-controlled rules engine. Each rule needs an identifier, source reference, effective date, applicability, required inputs, validation logic, severity, suggested resolution and test cases.

CGST, SGST, IGST and place-of-supply logic.

HSN/SAC classification and rate checks.

Exempt, nil-rated and non-GST supplies.

Reverse charge, composition scheme and relevant special transactions.

SEZ, export and deemed-export workflows.

B2B/B2C classification, credit notes, debit notes and advances.

Taxable value, discounts, cess, rounding and tax calculations.

E-invoice and e-way bill applicability checks.

GST registration status and return-period context.

Do not infer IGST versus CGST/SGST only by comparing supplier and customer states. Place of supply, supply type and statutory exceptions matter. Current rates and rules must be sourced from official material and reviewed by qualified professionals.

## 4.4 Accounting Validation

Balanced debit/credit postings.

Ledger and voucher classification.

Voucher date, financial year and period controls.

Voucher numbering and duplicate detection.

Bill-wise allocation and outstanding references.

Inventory, units, quantities, godowns and stock effects.

Cost-centre allocation, narration and supporting references.

Currency, round-off, TDS/TCS and other applicable treatments.

Opening balance and reconciliation checks.

## 4.5 Risk and approval states

| Status | Meaning | Action |
| --- | --- | --- |
| Green — validated | All required checks passed. | Proceed according to company policy. |
| Yellow — clarification | Information missing or ambiguous. | Ask user/client or request evidence. |
| Red — blocked | Mandatory rule or control failed. | Do not post until resolved. |
| Blue — approval | Checks passed but authorization is required. | Route to authorized approver. |


AI confidence is not a substitute for a mandatory rule. A high-confidence prediction must not override a failed GST or accounting control.

## 4.6 Posting and verification

Prepare the voucher from validated transaction data.

Check company, masters, period, voucher type and duplicate risk.

Apply approval policy.

Submit to the selected accounting destination.

Capture response and connector state.

Read the voucher back from the destination.

Compare the saved voucher with the intended transaction.

Mark verified only after successful comparison.

If response is uncertain, reconcile before retrying to avoid duplicate postings.

Preserve source, rule versions, validation, approver, request/response and final voucher reference.

# 5. Core accounting modules

## 5.1 Excel / CSV / PDF to accounting

Bulk upload and reusable import templates; automatic column detection and mapping.

Customer/vendor/ledger/item matching; missing-master and duplicate detection.

Voucher type, date, financial-year, bill-reference and inventory checks.

GSTIN, HSN/SAC, tax rate, place-of-supply and tax-math validation.

Preview, error report, suggested corrections and bulk resolution.

Test import, approval, controlled posting, import history and re-import protection.

Multiple files, companies and voucher types with per-company controls.

The pre-import report should show total, valid, blocked and clarification records; duplicates, missing masters, GST/accounting errors and proposed corrections.

## 5.2 Purchase management

Purchase invoice upload and extraction; vendor matching; purchase-order and goods-receipt matching.

Purchase voucher preparation, ledger/tax validation and duplicate supplier invoice detection.

Purchase returns, debit notes, vendor outstanding, purchase register and ITC review workflow.

## 5.3 Sales management

Sales register, quotations, estimates, sales orders, delivery challans and invoice conversion.

Sales returns, credit notes, customer outstanding, sales-versus-receipt reconciliation and missing-invoice detection.

## 5.4 Expense management

Receipt capture, expense classification, vendor identification and bank matching.

Employee expense claims, approvals, reimbursements and recurring expenses.

GST input eligibility review as a qualified review workflow, not an unsupported automatic legal conclusion.

## 5.5 Ledger health and accounting quality

Suspense balances, unusual negative balances and incorrect ledger groups.

Duplicate ledgers, unallocated receipts/payments and old outstanding balances.

Missing bill references, unusual tax ledger balances, unexpected journals and opening-balance differences.

Transaction anomaly patterns and accounting-quality dashboards.

# 6. Bank statement to books and sales discovery

Bank statement processing is a first-class module. It must do more than import transactions or reconcile balances: it should identify what each bank movement represents and prepare the correct accounting workflow.

## 6.1 Inputs and transaction categories

PDF, Excel, CSV, scanned PDF, images and multi-page statements; support common Indian bank layouts first, then expand based on evidence.

Customer receipts, sales collections, vendor payments, purchase settlements, bank charges, interest, EMI, loans, capital, withdrawals, transfers, UPI, NEFT, RTGS, IMPS, cash deposits, refunds, gateway settlements, TDS deductions and unidentified items.

Future bank feeds, Account Aggregator and payment-provider integrations only where access, consent and eligibility allow.

## 6.2 Matching and allocation

One payment against one invoice; full or partial settlement.

One payment against multiple invoices; multiple payments against one invoice.

Advance payment, payment on account, short/excess payment, deductions and TDS.

Customer identity using narration, UPI ID, bank details, UTR, invoice reference, Tally ledger and history.

Unidentified receipts and unmatched payments in a review queue.

## 6.3 Missing invoice / sales discovery

Detect a credit with no obvious matching invoice.

Search customer and ledger masters, outstanding invoices, historical payments and references.

Determine whether it may be an invoice settlement, advance, unbilled sale, loan, transfer, refund or other receipt.

If unclear, ask the client/accountant for details and evidence.

If an actual sale needs an invoice, collect supply details, items/services, quantity, value, date, GSTIN, place of supply and other required information.

Run GST and accounting validation, including relevant timing and documentation context.

Generate the appropriate invoice/voucher workflow, obtain approval, post and verify.

If it is an advance or another receipt, apply the appropriate accounting/GST workflow after validation.

Critical control: a bank credit is evidence of money received, not automatically proof of a taxable sale. Never classify every credit as revenue.

## 6.4 Reconciliation

Bank balance versus books; matched/unmatched entries; missing bank/book entries; duplicates.

Outstanding deposits/payments, charges and timing differences.

Historical and period-wise reconciliation with ownership and resolution status.

Payment gateway settlement reconciliation: gross collections, fees, taxes, refunds and net credit.

Measure bank matching precision and recall. Incorrect automatic matches can clear the wrong customer balances; ambiguous matches must route to review.

# 7. Billing, collections and recurring transactions

## 7.1 Invoice generation

Web, mobile and WhatsApp invoice creation.

GST/non-GST invoices, proforma invoices, quotations, estimates, credit/debit notes and delivery challans.

Text, voice, handwritten image, forwarded order and PDF purchase-order inputs.

Customer/item lookup, approved prices, multiple tax rates, discounts, shipping and additional charges.

Invoice numbering, PDF templates, branding, multi-branch and multi-GST registration support.

Preview, confirmation, validation, approval, posting and read-back verification.

E-invoice/IRN and QR handling through authorized integrations where applicable; cancellation and amendment controls.

The assistant should look up masters, draft an invoice, ask for missing information, validate and show a preview. It must not silently guess tax treatment or post an ambiguous transaction.

## 7.2 Collections and outstanding

Bill-wise outstanding, ageing, due dates and payment terms.

Partial payments, promises to pay, disputes and customer payment history.

WhatsApp, SMS, email and in-app reminders with configurable tone, cadence and escalation.

UPI QR/payment links where supported; verified payment matching and receipt creation.

Customer statements, collection reports and follow-up history.

A payment screenshot alone should not mark an invoice paid. Verify settlement through reliable bank/payment data or an authorized confirmation mechanism.

## 7.3 Recurring invoices

Weekly, monthly, quarterly, annual and custom schedules for rent, retainers, AMC, subscriptions, coaching, maintenance, society charges, leasing and professional fees.

Create/edit/pause/resume/cancel, rate changes, approval, automatic sending and payment tracking.

Revalidate GST treatment, rates, dates, financial year, registration and documentation on every generated invoice.

## 7.4 Future payment automation

UPI AutoPay/mandates where eligible and authorized.

Payment gateway integrations, settlement matching, failed-payment handling and refunds.

Collection forecasting and customer payment behaviour indicators.

# 8. GST, tax and compliance readiness

## 8.1 GST reconciliation

GSTR-1 versus sales register.

GSTR-2B versus purchase register and ITC review.

GSTR-3B liability and ITC summary checks.

IMS-related workflows where supported.

Missing/duplicate invoices, GSTIN/rate/credit-note/debit-note/period mismatches.

Resolution tracking linked to source documents and vouchers.

Distinguish reconciliation from a legal determination of ITC eligibility. Filing summaries and recommendations must be reviewable by a qualified professional.

## 8.2 Compliance exports and filing integrations

Exports: Excel, CSV, JSON, XML where applicable, supported portal/offline utility formats, PDF reports and structured audit data.

Direct filing: only where officially supported, authorized and technically available through relevant government systems or approved service-provider arrangements.

Versioned export adapters and regression tests because official schemas can change.

Do not promise direct filing for every return until API availability, authorization, eligibility and current portal requirements are verified.

## 8.3 Additional tax workflows

TDS payable/receivable registers, reconciliation and transaction data.

Form 26AS/AIS workflows, advance tax tracking and tax computation support.

ITR preparation data, tax audit information and notice document management.

E-invoice, e-way bill, GST notice and audit workflows where authorized and validated.

## 8.4 Financial statements

Trial balance, profit and loss, balance sheet, cash flow and trading account.

Receivables/payables ageing, stock valuation, fixed asset and depreciation schedules.

Bank reconciliation statement, ledger, group-wise and branch-wise reports.

Comparative financial statements and management reporting.

# 9. Native cloud accounting and bookkeeping

The platform must be a complete accounting system without Tally. This is a central requirement, not a later bolt-on. Native books must support double-entry accounting, financial statements and structured compliance data.

## 9.1 Core bookkeeping

Chart of accounts, groups and ledgers.

Journal entries and core voucher types: sales, purchase, receipt, payment, contra and journal.

Credit/debit notes and controlled adjustments.

Opening balances, financial years, accounting periods and period locking.

Bill-wise accounting, outstanding references, cost centres, branches, departments and projects.

Cash book, bank book, general ledger and trial balance.

Multi-currency workflows where supported.

Immutable posted-entry history with reversal/correction workflows rather than silent edits.

## 9.2 Inventory

Stock groups/categories/items, units and alternate units.

Godowns/warehouses, stock transfers and adjustments.

Opening stock, purchase/sales stock effects and valuation.

Batch, serial number and expiry tracking.

Inventory ageing, reorder levels and stock movement.

Future manufacturing, bill of materials and production costing.

## 9.3 Native controls

Balanced journal enforcement at database and application layers.

Unique voucher identifiers and controlled numbering.

Period locks and authorized reopening.

Posting idempotency and concurrency controls.

Reversal/credit/debit adjustment trail.

Ledger balance and trial balance consistency checks.

Source-document linkage and complete audit history.

Complete books export and data portability.

## 9.4 Tally migration

Import groups, ledgers, stock items, opening balances, vouchers, bill-wise outstanding, cost centres and inventory balances.

Map source data to the native accounting model.

Compare trial balance, ledger balances, outstanding reports, inventory and financial statements.

Produce migration differences and require sign-off before cutover.

Retain original exports and migration logs.

Migration is complete only when critical balances and reports reconcile; successful voucher import alone is insufficient.

# 10. Tally integration and Windows connector

For customers choosing Tally, build a lightweight Windows connector on the machine where Tally is accessible. The cloud service should not require Tally to be exposed directly to the public internet. Prefer secure outbound communication initiated by the connector.

## Connector responsibilities

Discover Tally companies and supported versions.

Read masters, vouchers, balances, outstanding and stock data as supported.

Receive authorized posting jobs from the cloud.

Submit supported XML/JSON or documented requests; use TDL only where needed and verified.

Read back vouchers and report actual saved state.

Maintain local operation journal, queue, retries, health and diagnostics.

Handle internet outages and Tally unavailability safely.

## Reliability requirements

Idempotency keys and duplicate detection.

Posting state machine: queued, sent, response received, read-back pending, verified, failed or uncertain.

Never blindly retry an uncertain posting.

Dead-letter queue and operator recovery tools.

Version compatibility matrix and controlled connector updates.

Secure authentication, secret rotation and least privilege.

Local diagnostics and audit logs.

Exact TallyPrime/ERP capabilities, protocol behaviour, licensing constraints and supported operations must be confirmed against current official documentation and real version testing.

# 11. CA firm practice management

## 11.1 Client and company management

Client onboarding, profiles, statutory identifiers and registrations.

Multiple companies, branches, contacts and Tally connections per client.

Assigned CA, accountant, reviewer and service package.

Document repository, service details and communication history.

## 11.2 Tasks and compliance calendar

Create, assign, prioritize, schedule and recur tasks.

Dependencies, comments, attachments, status, escalation and activity history.

GST, TDS, income tax, ROC, audit and other applicable deadlines.

Versioned calendar with statutory deadlines, extensions and applicability; avoid unverified hard-coded dates.

## 11.3 Staff and approvals

Role-based permissions and client/company scoping.

Staff workload and task completion visibility.

Maker-checker and reviewer approval workflows.

Bulk task assignment, client-wise productivity and overdue escalation.

## 11.4 Client portal

Upload requested documents and view missing items.

View tasks, invoices, outstanding, reports and accounting status.

Respond to queries, approve work and download deliverables.

Secure client communication and history.

## 11.5 Mixed client environments

A CA firm must manage Tally-connected, cloud-native and hybrid clients from one dashboard. Each client record should clearly show accounting mode and authoritative system.

# 12. Mobile, WhatsApp and notifications

## 12.1 Mobile application

Home dashboard: tasks, approvals, bank exceptions, GST alerts, outstanding, documents and connector health.

Invoice creation, editing drafts, preview, approval, sending, PDF download and payment status.

Bank statement upload, transaction review, invoice matching, customer confirmation and approval of proposed entries.

Approval inbox for vouchers, invoices, ledger creation, reconciliation and recurring invoices.

Document scanning/upload, expense recording, customer/vendor creation and payment reminders.

Business dashboard: sales, receipts, outstanding, cash/bank position and accounting health.

CA dashboard: client tasks, missing documents, deadlines, staff review and filing status.

Biometric lock, role permissions, device/session management, sensitive-action confirmation and session revocation.

## 12.2 Conversational accounting assistant

Answer questions about money received, overdue customers, unmatched bank items, approvals and clients missing documents.

Create invoice drafts, initiate reminders and request documents.

Use only authorized company context and current records; show source/date for financial answers.

Route complex or sensitive actions to secure approval screens.

## 12.3 WhatsApp workflows

Invoice requests from text, voice, image and forwarded documents.

Customer payment reminders and invoice sharing.

Client document collection and task updates.

Clarification of unidentified bank transactions.

Accounting status queries and notifications.

WhatsApp must follow current consent, template, messaging, data handling and platform policies. Sensitive actions should use secure authenticated approval, not uncontrolled chat commands.

## 12.4 Notification engine

| Category | Examples |
| --- | --- |
| Accounting | Voucher failed, duplicate, GST mismatch, missing ledger, unmatched bank entry, connector offline. |
| Business | Payment received, invoice overdue, invoice generated, reminder sent, customer dispute. |
| CA practice | Client upload, task assignment, deadline approaching, review submitted, approval pending. |
| System | Sync failed, integration error, subscription failure, storage limit. |


Push, WhatsApp, email, SMS and in-app channels.

User preferences, role-aware routing, priority, quiet hours, delivery status, retries and duplicate prevention.

Each notification should deep-link to the relevant invoice, transaction, task or approval.

# 13. Future features and upsell opportunities

## Business billing suite

Advanced templates, multiple GST registrations, product catalogue, quotations, sales orders, delivery challans, customer management, price lists, payment links, recurring invoices, statements, reports, multi-user and branch management.

## Accounting automation suite

Bulk imports, bank reconciliation, automated ledger mapping, purchase/expense automation, voucher validation, Tally synchronization, GST checks and accounting-quality reports.

## GST compliance suite

GSTR-1/2B/3B reconciliation, IMS workflows, e-invoice/e-way integrations, GST discrepancy reports, GSTIN checks, HSN/SAC validation, ITC review and compliance calendar.

## CA practice suite

Multi-client management, staff allocation, workflow automation, client portal, document collection, compliance calendar, approvals, communication, workload analytics and client profitability.

## AI accounting assistant

Conversational assistant, voice invoice creation, accounting Q&A, transaction classification, ledger suggestions, document understanding, anomaly detection, client communication and natural-language reporting.

## Collections and enterprise

Escalation, payment links, UPI QR, promise-to-pay, collection forecasting, customer behaviour, gateway reconciliation and receipt matching.

Multi-branch, custom workflows, advanced permissions, API access, SSO, audit exports, dedicated connector management, integrations, white-label CA portal and partner marketplace.

## Additional future domains

Cash-flow forecasting, budgeting, profitability, month-end/year-end close.

Procurement, vendor quotation comparison, GRN, inventory ageing, manufacturing and BOM.

TDS, income tax, AIS/26AS workflows, tax audit and notice tracking.

Audit planning, evidence, working papers, sampling and observations.

Payroll, employee expenses and reimbursements.

Banking, Account Aggregator, payment gateway, POS, e-commerce, CRM, payroll and ERP integrations where permitted.

Other accounting software connectors and multi-country tax configuration.

## Upsell packaging

| Package | Target | Potential value |
| --- | --- | --- |
| Starter billing | Individual/micro business | Invoices, customer records and basic reminders. |
| Business | Growing business | Billing, expenses, bank imports and reconciliation. |
| Accounting Pro | Accountants | Bulk imports, bank automation, voucher validation and Tally connector. |
| CA Practice | CA firms | Multi-client, staff, tasks, portal and workflows. |
| GST Compliance | Businesses and CAs | Reconciliation, return preparation and filing workflows. |
| Inventory / Manufacturing Pro | Traders and manufacturers | Stock, warehouse, batch, BOM and costing. |
| Collections Pro | Businesses | Advanced reminders, payment links and reconciliation. |
| AI credits | Eligible users | Document, voice and assistant usage. |
| Enterprise / White-label | Large firms | Advanced controls, integrations, branding and support. |


Potential pricing dimensions: companies, users, branches, vouchers, bank transactions, documents, AI credits, WhatsApp usage, storage, Tally connectors, compliance modules and integrations. Final prices require competitor research and paid-customer validation.

# 14. Technical architecture and data foundations

| Layer | Recommended direction |
| --- | --- |
| Web | Next.js + TypeScript; responsive role-based application. |
| Mobile | React Native + Expo + TypeScript. |
| Backend | NestJS or Express with TypeScript; modular services and documented APIs. |
| Core database | PostgreSQL for accounting, relational integrity and transactions. |
| Flexible metadata | PostgreSQL JSONB for source-document and integration payload metadata. |
| Queue/cache | Redis and BullMQ or equivalent reliable job processing. |
| Documents | Encrypted object storage with lifecycle and access controls. |
| Realtime | WebSockets or managed realtime delivery for status and notifications. |
| AI/document | OCR, extraction, speech-to-text and LLM-assisted classification with deterministic validation. |
| Tally | Windows connector with secure outbound communication. |
| Observability | Central logs, metrics, tracing, error tracking and alerting. |


MongoDB may still be useful for selected document/event workloads, but the core ledger, journal postings and reconciliation model benefit from relational constraints and transactions. Avoid splitting the accounting source of truth across databases without a strong consistency design.

## Canonical accounting model

Tenant, firm, client, company, branch, financial year and accounting period.

Chart of accounts, ledger/group masters and tax configuration.

Voucher header, voucher lines, journal postings and tax components.

Customer/vendor, item, unit, inventory movement and cost centre.

Bank account, bank transaction, allocation and reconciliation record.

Bill reference, outstanding item and settlement allocation.

Source document, extraction result, validation result and rule version.

Approval, posting request, destination reference, read-back verification and audit event.

## Accounting invariants

Posted journals balance; debit and credit totals reconcile.

Posted entries are immutable in history; corrections use controlled reversal/adjustment.

Voucher identifiers and numbering are unique within defined scopes.

Period locks prevent unauthorized backdated changes.

Posting is idempotent and concurrency-safe.

Balances and reports can be reconciled from ledger postings.

Each transaction retains traceable source and lifecycle history.

## Integration architecture

Use adapters for Tally, native cloud ledger, payment providers, GST service providers and other systems. The shared transaction model should not be a direct copy of Tally's voucher schema. Each adapter maps to/from the canonical accounting model and reports capability differences.

# 15. Security, accuracy and auditability

Tenant isolation and company-level access enforcement.

Role-based permissions and least privilege.

Encryption in transit and at rest; secure secret management.

Device/session management, revocation and sensitive-action confirmation.

Immutable audit events and approval history.

Backups, disaster recovery, retention, export and deletion workflows.

Consent and lawful handling of GSTIN, bank, customer and employee data.

Secure connector communication and monitoring.

Incident response, vulnerability management and security testing.

Data processing agreements and professional review of regulatory obligations.

## Non-negotiable accuracy rules

Never let an LLM independently decide mandatory GST treatment.

Never automatically book an unidentified bank credit as sales.

Never blindly retry an uncertain voucher posting.

Never treat a payment screenshot alone as proof of settlement.

Never silently alter an approved invoice or posted voucher.

Never mark a voucher verified without read-back comparison.

Never pass low-confidence extraction through a mandatory field check.

Never apply a tax rule without effective-date and transaction-context checks.

Never hide unresolved exceptions.

Never lose the original document, evidence or audit trail.

# 16. Commercial model and go-to-market

Subscription tiers by audience and feature set.

Per-company, per-user or per-branch pricing.

Usage-based voucher, bank transaction and document processing.

AI credits and voice processing.

WhatsApp messaging allowance or pass-through charges.

Paid onboarding and Tally-to-cloud migration.

GST/compliance add-ons.

Inventory, payroll, audit and enterprise add-ons.

White-label CA portal and partner/API plans.

## Beachheads to validate

Tally-using accountants and CA firms with recurring Excel import and bank statement workloads.

Small businesses needing invoices, customer collections and basic cloud books.

CA firms managing mixed client environments and wanting a unified client/task/accounting dashboard.

Validate urgency, workaround, frequency, cost of errors, decision maker, willingness to pay and sales cycle through interviews and paid pilots. Do not assume which segment pays most.

# 17. Phased roadmap

| Phase | Scope | Objective |
| --- | --- | --- |
| 0 — Foundation | Canonical accounting model, multi-tenancy, permissions, audit, GST rules foundation, connector prototype. | Safe foundation for native books and Tally adapters. |
| 1 — Tally entry integrity | Connector, Excel/CSV imports, master sync, validation, preview, approval, posting and read-back. | First commercial workflow for Tally users. |
| 2 — Bank intelligence | Statement ingestion, classification, matching, allocation, missing-invoice investigation, reconciliation and posting. | Automate bank-to-books workflows. |
| 3 — Native cloud bookkeeping | Double-entry ledger, core vouchers, periods, trial balance, ledgers, bank and financial reports. | Maintain books without Tally. |
| 4 — Billing and mobile | Invoice generator, customer/item masters, PDF, mobile dashboard, approval inbox and notifications. | Serve individual businesses and mobile users. |
| 5 — CA practice management | Multi-client, staff, tasks, compliance calendar, client portal, document collection and review. | Serve CA firms. |
| 6 — Collections and recurring | Reminders, payment links, reconciliation, recurring invoice workflows and promise-to-pay. | Improve collections and reduce follow-up. |
| 7 — GST and tax compliance | GSTR reconciliations, return preparation, TDS workflows, authorized e-invoice/e-way integrations. | Make books compliance-ready. |
| 8 — Advanced platform | Inventory, manufacturing, payroll, audit, analytics, forecasting and external integrations. | Expand into business operations. |


The native cloud accounting model must be designed in Phase 0 even if the complete customer-facing cloud bookkeeping experience launches in Phase 3.

## Release gates

Do not release bulk posting until duplicate prevention, idempotency and read-back work reliably.

Do not release autonomous bank matching without measured precision and a review path.

Do not release native books until trial balance, ledger balances, period locks and reversal workflows are tested.

Do not release compliance filing until authorization and portal/API requirements are verified.

Do not market absolute zero-error guarantees.

# 18. Risks and research requirements

## Key risks

Accounting and GST edge cases are numerous and change over time.

Incorrect source data can produce incorrect books even if software rules are correct.

Some transactions require professional judgment and additional documents.

Tally versions, local environments, connector access and licensing may vary.

Government portal formats, APIs, permissions and service-provider rules may change.

Bank statement layouts and narration quality vary widely.

WhatsApp pricing, templates, opt-in and policy restrictions affect unit economics.

Native accounting creates responsibility for integrity, backups, migration and support.

Businesses and CA firms require different UX, permissions and pricing.

## Research to complete

Official TallyPrime/ERP integration capabilities, XML/JSON/ODBC/TDL details, version matrix and licensing constraints.

Current GST rules, rates, thresholds, place-of-supply cases, return schemas, e-invoice/e-way applicability and official sources.

GSTIN verification providers, GSP/ASP options, API costs and authorization requirements.

Current WhatsApp Business Platform policies, India pricing, templates, opt-in, provider comparison and media constraints.

Bank statement formats, available bank feeds, Account Aggregator access and payment gateway APIs.

Competitor teardown: Tally-native tools, Suvit, Refrens, Vyapar, Zoho Books, BUSY, Marg, ClearTax, Masters India, Biz Analyst, Khatabook, myBillBook, Swipe and newer products.

Competitor pricing, customer reviews, support complaints, gaps and real CA/accountant workflows.

Bottom-up market sizing for Tally users, GST filers, CA firms, bookkeepers and SME segments.

DPDP and other applicable privacy/security obligations; retention, consent, localization and professional liability.

Willingness-to-pay interviews and paid pilots across relevant Indian business clusters.

## Evidence standards

Every current regulation, price, API capability, competitor claim and market number should have a dated source URL.

Prefer official documentation for technical and legal claims.

Separate observed pain, willingness-to-pay evidence and product inference.

Mark unverifiable claims as unverified; do not use them to justify core decisions.

Use reviews and practitioner discussions as qualitative evidence, not automatically verified facts.

Maintain a source log and update it when regulations, APIs or prices change.

# 19. Success metrics and validation

## Product outcomes

Reduce time to process invoices, bank statements and bulk imports.

Reduce manual corrections and repeated data entry.

Reduce preventable GST/accounting errors passing validation.

Increase verified voucher posting rate.

Reduce unmatched bank items and aged exceptions.

Increase on-time document collection and compliance task completion.

Improve accountant capacity per client without lowering review quality.

| Metric | Target direction |
| --- | --- |
| Mandatory validation failures reaching posting | Drive toward zero through blocking controls and test coverage. |
| Duplicate voucher escape | Drive toward zero through idempotency and reconciliation. |
| Unapproved high-risk posting | Zero by policy enforcement. |
| Posted voucher verification | 100% read-back attempt and recorded status; uncertain cases remain visibly uncertain. |
| Audit coverage | Every transaction lifecycle event traceable. |
| Bank auto-match | Set thresholds only after labeled pilot data; ambiguous cases route to review. |
| Time saved | Measure baseline versus pilot by workflow and role. |


## Validation plan

Interview business owners, accountants, bookkeepers and CA firms about workflows and error costs.

Collect anonymized, permissioned sample Excel files, bank statements, invoices and real exception cases.

Build labeled test corpora for GST, ledger mapping, bank classification and voucher posting.

Run shadow mode against existing processes before automatic posting.

Compare proposed entries with accountant-approved outcomes and actual books.

Run controlled pilots with approval and reconciliation procedures.

Track false/missed matches, corrections, blocked transactions and time saved.

Expand supported formats and rules only when test coverage and observed performance justify it.

# 20. Final product definition

We are building an end-to-end Accounting Operations Platform for individuals, businesses, accountants, bookkeepers, finance teams and CA firms.

It supports customers who use Tally, customers who do not want Tally and customers who need a controlled hybrid setup. It combines native cloud bookkeeping, Tally integration, document and bank automation, GST/accounting validation, invoicing, collections, recurring transactions, mobile controls, notifications, compliance preparation and CA practice management.

**CAPTURE → UNDERSTAND → IDENTIFY → CLASSIFY → VALIDATE
RESOLVE → APPROVE → POST → VERIFY → RECONCILE → MONITOR → REPORT**

The long-term differentiator is the quality of accounting understanding, validation rules, exception resolution, integration reliability, mobile experience and evidence trail. The first release must establish trust in the accounting engine; subsequent releases expand it into a complete cloud accounting and business operations ecosystem.

# Appendix A — Initial transaction case library

| Scenario | Expected control |
| --- | --- |
| Excel invoice has no matching ledger | Suggest match or create-master request; validate before posting. |
| Same invoice uploaded twice | Detect using company, party, number, date, amount and document evidence. |
| Different GST rates on invoice lines | Validate line-level classification and tax calculation. |
| Place-of-supply ambiguity | Block or request missing facts; do not infer solely from party states. |
| Customer pays part of invoice | Allocate partial receipt and retain outstanding. |
| One transfer pays multiple invoices | Split allocation with reviewable references. |
| Bank credit has no invoice | Investigate advance, unbilled sale, loan, transfer or other receipt; never auto-book as sales. |
| Payment gateway net settlement | Reconcile gross collections, fees, taxes, refunds and net bank credit. |
| Tally times out after submission | Mark uncertain; read back/reconcile before retry. |
| Recurring invoice crosses FY or rule change | Revalidate current customer, item, rate, date and statutory context. |
| Client uploads incomplete documents | Request missing items and keep task pending. |
| Cloud company closes accounting period | Prevent unauthorized posting/backdating; controlled reopen with audit. |
| Tally migration has different opening stock | Show migration difference; do not mark cutover complete until resolved. |
| Customer sends payment screenshot | Treat as supporting evidence only; independently verify payment. |
| Two users approve/post simultaneously | Use concurrency controls, authorization and idempotent posting. |


# Appendix B — Key terminology

Accounting system of record: the system designated as authoritative for a company's books.

Canonical accounting model: the platform's internal transaction representation independent of an external accounting product.

Voucher: a business/accounting document that results in one or more accounting postings.

Journal posting: the balanced debit/credit impact recorded in the ledger.

Validation: checks against accounting rules, GST rules, master data, periods and company policy.

Reconciliation: comparison and resolution between two record sets, such as bank and books.

Read-back verification: retrieving the saved destination record and comparing it with the intended transaction.

Compliance-ready export: structured data prepared for a filing workflow; not the same as successful statutory filing.

Direct filing integration: a permitted, authenticated integration with relevant filing infrastructure.
