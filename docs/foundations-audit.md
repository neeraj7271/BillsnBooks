# Foundations Architecture Audit (Hard-to-Retrofit Capabilities)

This document audits the 22 foundational systems identified in the Master Architectural Specification. Each foundation is evaluated against the current codebase state, classified as **DONE**, **PARTIAL**, or **MISSING**, assigned a timeline (**NOW** vs **LATER**), and provided with design notes and extension points.

---

## Foundation Scorecard Overview

| # | Foundation Domain | Current Status | When | Core Reason & Architectural Impact |
|---|---|---|---|---|
| 1 | **Feature Flags (Tenant Overrides)** | **PARTIAL** | **NOW** | Critical for phased rollout & dark launches; integrates directly into `CapabilityResolver`. |
| 2 | **Tenant Lifecycle & Retention** | **PARTIAL** | **NOW** | Legal compliance (DPDP, Companies Act) and subscription billing restricted states depend on it. |
| 3 | **Data Export / Complete Books Portability** | **PARTIAL** | **NOW** | Statutory export (JSON/CSV/ZIP) of full double-entry ledger ensures tenant never loses data. |
| 4 | **Backup, Restore & Disaster Recovery** | **MISSING** | **NOW (Design)<br>LATER (Drills)** | RPO $\le 15\text{m}$, RTO $\le 2\text{h}$; automated pg_dump / WAL-G architecture & per-tenant restore hooks. |
| 5 | **Privacy & Consent (DPDP Act 2023)** | **PARTIAL** | **NOW** | Consent tracking, DPA acceptance, and audit trail of terms acceptance for tenants and CA firms. |
| 6 | **Internal Admin / Back-Office Console** | **MISSING** | **NOW (Basic)** | Operations console for subscription overrides, manual credit adjustments, and audited support impersonation. |
| 7 | **Audit-Log Export & Compliance Retention** | **PARTIAL** | **NOW** | Immutable append-only audit trail exportable for statutory tax/financial auditors. |
| 8 | **Rate Limiting, Quotas & Abuse Protection** | **MISSING** | **NOW** | Redis sliding window rate-limiter per tenant, user, and IP; protects ingestion & OCR endpoints. |
| 9 | **AI Cost & Usage Metering** | **MISSING** | **NOW** | AI token/credit ledger, per-tenant caps, fallback provider chain, PII prompt redaction. |
| 10 | **Public API, Scoped Keys & Webhooks** | **MISSING** | **LATER** | Enterprise external integrations; design extension points and HMAC webhook tables now. |
| 11 | **Environments, Demo / Sandbox Company** | **PARTIAL** | **NOW** | Instant sandbox company provisioner with realistic statutory data for testing and guided demos. |
| 12 | **Observability, Business SLOs & Status** | **PARTIAL** | **NOW (Basics)** | Prometheus metrics, health probes, BullMQ job failure alerts, and service status reporting. |
| 13 | **Email / SMS / WhatsApp Deliverability** | **PARTIAL** | **NOW** | SPF/DKIM/DMARC domain configuration, webhook bounce/suppression list handling, mandatory billing alerts. |
| 14 | **In-App Help, Guided Tours & Checklists** | **MISSING** | **LATER** | Interactive onboarding walkthroughs and contextual help drawers. |
| 15 | **Privacy-Safe Product Analytics** | **MISSING** | **LATER** | Non-PII telemetry tracking feature adoption without financial numbers. |
| 16 | **Internationalisation & Locale Architecture** | **PARTIAL** | **NOW (Infra)<br>LATER (Langs)** | Central string dictionary tokenization and locale-aware number/date formatters. |
| 17 | **Security Hardening & Key Management** | **PARTIAL** | **NOW** | AES-256 field encryption transformer exists; add key rotation hooks, security headers, admin MFA. |
| 18 | **Legal & Compliance Records (ToS/DPA)** | **PARTIAL** | **NOW** | Versioned legal agreement acceptance tracking with user, IP, and timestamp snapshot. |
| 19 | **Partner / Referral & White-Label Model** | **MISSING** | **LATER** | CA partner commissions and custom vanity domains; add tenant data model hooks now. |
| 20 | **Universal Non-Tally Data Migration Tooling** | **PARTIAL** | **LATER** | Universal import wizard exists (`/imports/new`); expand to Zoho/QuickBooks format presets later. |
| 21 | **Offline & Poor-Network Draft Capture** | **MISSING** | **LATER** | IndexedDB offline draft storage and optimistic conflict resolution on mobile web. |
| 22 | **Performance, Scale & Partitioning Plan** | **PARTIAL** | **NOW (Plan)** | Declarative PostgreSQL table partitioning by financial year for ledger entries; read-model projections. |

---

## Detailed Gap Analysis by Foundation

### 1. Feature Flags with Staged Rollout (`NOW`)
* **Current Codebase State:** `PARTIAL`. The layered settings engine (`SettingValueOrmEntity`) supports key-value storage at `SYSTEM`, `TENANT`, and `COMPANY` tiers, but there is no dedicated evaluation engine for percentage rollouts or tenant overrides.
* **Gaps:** Feature flags are not integrated with capability resolution. No frontend hook `useFeatureFlag(key)`.
* **Action for Phase Implementation:** 
  * Register feature flags under a reserved namespace `flag.*` in the layered settings engine.
  * Evaluate flags as Layer 4 in the 5-layer `CapabilityResolver`.
  * Support targeted tenant IDs, company IDs, and percentage rollouts.

### 2. Tenant Lifecycle: Onboarding, Suspension, Offboarding & Retention (`NOW`)
* **Current Codebase State:** `PARTIAL`. Tenants and companies have `is_active` boolean flags.
* **Gaps:** No formal lifecycle state machine (`ONBOARDING`, `ACTIVE`, `PAST_DUE`, `RESTRICTED`, `OFFBOARDING`, `ARCHIVED`, `PURGED`). No scheduled retention worker for offboarded tenants.
* **Action for Phase Implementation:**
  * Add explicit tenant status enum and transition validators.
  * Implement `RESTRICTED` state: read-only access, full data export permitted, write/post operations blocked by `@TenantStatusGuard()`.
  * Implement automated retention lock preventing data deletion within the statutory 8-year Companies Act retention window.

### 3. Data Export / Portability for Complete Books (`NOW`)
* **Current Codebase State:** `PARTIAL`. We have CSV export on Trial Balance and JSON export on Layered Settings, but no single-click export of an entire company's accounting books.
* **Gaps:** A tenant leaving the platform cannot export an authoritative, self-contained ZIP archive containing their Chart of Accounts, General Ledger, Parties, Items, Invoices, Vouchers, and PDF invoices.
* **Action for Phase Implementation:**
  * Build `GET /v1/companies/:id/export/complete-books` worker generating a streaming ZIP bundle containing:
    1. `chart_of_accounts.json`
    2. `general_ledger_journal.csv` (all posted debit/credit legs)
    3. `sales_register.csv` & `purchase_register.csv`
    4. `party_directory.csv`
    5. `statutory_audit_manifest.json` with cryptographic SHA-256 checksums of all exported tables.

### 4. Backup, Restore & Disaster Recovery (`NOW (Design), LATER (Drills)`)
* **Current Codebase State:** `MISSING`. The application relies entirely on host database persistence without documented RPO/RTO parameters or tenant-scoped extraction scripts.
* **Target Parameters:**
  * **RPO (Recovery Point Objective):** $\le 15\text{ minutes}$ (via Continuous PostgreSQL WAL archiving).
  * **RTO (Recovery Time Objective):** $\le 2\text{ hours}$ (via automated cloud container redeploy + base backup restore).
* **Action for Phase Implementation:**
  * Document standard WAL-G / AWS S3 backup script architecture.
  * Author per-tenant SQL extract and restore utility script (`tools/db/tenant-extract.sql`) enabling isolated recovery of a corrupted company without restoring the entire cluster.

### 5. Privacy and Consent (DPDP Act 2023) (`NOW`)
* **Current Codebase State:** `PARTIAL`. PAN numbers are encrypted at rest using AES-256 via `EncryptionTransformer`.
* **Gaps:** No explicit table recording user consent to terms of service, privacy policy, or Data Processing Addendums (DPAs).
* **Action for Phase Implementation:**
  * Create `ConsentRecordOrmEntity` (`tenant_id`, `user_id`, `consent_type`, `version`, `ip_address`, `user_agent`, `consented_at`).
  * Implement consent checkpoint in the signup flow and CA firm client invitation flow.

### 6. Internal Admin / Back-Office Console (`NOW (Basic)`)
* **Current Codebase State:** `MISSING`. No administrative UI exists for internal support staff to inspect tenant health, issue trial extensions, or adjust plan entitlements.
* **Action for Phase Implementation:**
  * Provide an internal admin module (`/v1/admin/*`) guarded by `SuperAdminGuard` and RBAC privilege `admin.backoffice`.
  * Support manual subscription overrides with mandatory logged reason and expiration timestamp.
  * Implement read-only support impersonation mode (`impersonatedBy: adminUserId`) with visual banner in UI and zero ability to post journal entries.

### 7. Audit-Log Export & Compliance Retention (`NOW`)
* **Current Codebase State:** `PARTIAL`. `AuditLogOrmEntity` exists and records mutations across accounting modules.
* **Gaps:** No customer-facing UI to filter, inspect, and export audit trails for statutory tax auditors under Companies (Accounts) Rules, 2014 (Audit Trail / Edit Log rule).
* **Action for Phase Implementation:**
  * Add `/v1/companies/:id/audit-trail` query and CSV export endpoint.
  * Ensure every change to numbering series, vouchers, period locks, and company settings logs old value, new value, user ID, and timestamp.

### 8. Rate Limiting, Quotas & Abuse Protection (`NOW`)
* **Current Codebase State:** `MISSING`. Endpoints are currently unthrottled, creating vulnerability to volumetric abuse on OCR and bulk import endpoints.
* **Action for Phase Implementation:**
  * Implement `@nestjs/throttler` with Redis storage provider.
  * Enforce tiered limits:
    * Public / Auth: 10 requests / minute per IP.
    * Standard Tenant API: 120 requests / minute per user.
    * Bulk Import & Bank Upload: 10 operations / minute per tenant.

### 9. AI Cost & Usage Controls (`NOW`)
* **Current Codebase State:** `MISSING`. No token counting or quota tracking for LLM-assisted narration tagging or document extraction.
* **Action for Phase Implementation:**
  * Create `AiCreditLedgerOrmEntity` tracking consumed input/output tokens per company.
  * Gate AI capabilities behind entitlement key `ai.credits` with hard-limit cutoff when balance reaches zero.
  * Enforce regex PII sanitizer (stripping PAN, Aadhaar, account numbers) prior to upstream LLM prompt transmission.

### 10. Public API, Scoped Keys & Webhooks (`LATER`)
* **Current Codebase State:** `MISSING`.
* **Extension Points to Design NOW:**
  * Reserve database schema for `ApiKeyOrmEntity` (`key_hash`, `scopes`, `expires_at`, `rate_limit`).
  * Define outbound webhook event dispatcher contract (`OutboundWebhookOrmEntity`).

### 11. Environments & Demo / Sandbox Company (`NOW`)
* **Current Codebase State:** `PARTIAL`. Seeder script populates static test data.
* **Action for Phase Implementation:**
  * Add "Create Demo Company" button during onboarding.
  * Provisions an isolated sandbox company tagged with `is_demo: true` pre-loaded with sample parties, items, bank transactions, and statutory invoices.
  * 1-click "Reset Demo Data" capability.

### 12. Observability, Business SLOs & Status Reporting (`NOW (Basics)`)
* **Current Codebase State:** `PARTIAL`. Prometheus metrics controller exists at `/metrics`.
* **Action for Phase Implementation:**
  * Track business failure metrics: `accounting_voucher_post_failures_total`, `bank_reconciliation_drift_total`, `subscription_renewal_failures_total`.
  * Expose `/v1/health` with deep checks on Postgres connection pool and Redis latency.

### 13. Email / SMS / WhatsApp Deliverability Setup (`NOW`)
* **Current Codebase State:** `PARTIAL`. Notification engine creates in-app notifications.
* **Action for Phase Implementation:**
  * Add webhook receiver for SES / SendGrid bounce and complaint events.
  * Maintain global suppression list per tenant to prevent sending to invalid addresses.
  * Tag transactional billing alerts as `mandatory: true` (bypassing user marketing opt-outs).

### 16. Internationalisation (i18n) Foundation (`NOW (Infra)`)
* **Current Codebase State:** `PARTIAL`. Currency formatting is modularized in `@platform/ui`.
* **Action for Phase Implementation:**
  * Separate UI strings into typed key dictionary (`packages/shared-types/src/i18n/`).
  * Ensure number-to-words (`numberToIndianWords`) is abstracted behind an interface so non-INR currencies (USD, AED, EUR) can be supported seamlessly later.

### 17. Security Hardening & Key Management (`NOW`)
* **Current Codebase State:** `PARTIAL`. Sensitive columns use `EncryptionTransformer`.
* **Action for Phase Implementation:**
  * Support key versioning prefix on encrypted payloads (`v1:iv:ciphertext:tag`).
  * Add HTTP security headers (Helmet: CSP, HSTS, X-Content-Type-Options) in NestJS and Next.js configs.

### 18. Legal & Compliance Records (ToS / DPA Acceptance) (`NOW`)
* **Action for Phase Implementation:**
  * Integrate versioned acceptance tracking for Terms of Service (v1.0), Privacy Policy (v1.0), and CA Firm DPA (v1.0).

### 22. Performance, Scale & Table Partitioning Plan (`NOW (Plan)`)
* **Current Codebase State:** `PARTIAL`. Standard composite indexes exist on tenant/company columns.
* **Action for Phase Implementation:**
  * Document PostgreSQL declarative range partitioning strategy for `journal_entries` and `audit_logs` partitioned by `financial_year_id` or `created_at` year.
  * Plan read-model materialized views for General Ledger running balance calculation to support high-volume tenants ($> 1,000,000$ transactions).

