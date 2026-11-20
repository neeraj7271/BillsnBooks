# Settings Centre, Numbering, Templates, Exports & Notifications — Master Architecture Plan

**Phase:** Architecture & Foundation Specification — Unified Configuration System  
**Author:** Principal Software Architect & Senior Full-Stack Engineer  
**Status:** Awaiting Approval (Step 1 Protocol)  
**Date:** October 31, 2026  
**Document Target:** `docs/phases/settings-plan.md`  

---

## 1. Executive Summary & Architectural Philosophy

This specification unifies **seven core platform capabilities** into **one configuration-driven, layered engine**:
1. **Layered Settings Engine (Registry & Resolver)**
2. **Document Templates & Multi-Format Exporters (PDF, Tally XML, Excel, CSV, JSON)**
3. **Voucher & Document Configuration (Profile, Branding, Bank Coordinates, Display Toggles)**
4. **Foolproof Multi-Channel Notification Matrix & Delivery Tracking (In-App, Email, SMS, WhatsApp)**
5. **Concurrency-Safe Auto & Manual Numbering Series Engine**
6. **Auto-Generated Master Codes & Shared Contextual Auto-Fill Service**
7. **Comprehensive System Configuration Catalogue (Financial, Tax, Governance, Localisation)**

### Core Architectural Axioms
- **No Scattered Config Tables:** A single, typed settings registry with Zod validation. UI forms and APIs are generated from the registry metadata.
- **Hierarchical Precedence:** Resolution order: `Platform Default` $\rightarrow$ `Tenant/Firm` $\rightarrow$ `Company` $\rightarrow$ `Branch` $\rightarrow$ `Document Type` $\rightarrow$ `User`.
- **Issued Immutability via Snapshots:** When an invoice or voucher is finalized, it captures an immutable JSON snapshot of all effective settings, template tokens, and company profile data. Editing settings later **never** mutates historical documents or reprints.
- **Concurreny-Safe & Gap-Free Numbering:** Number assignment occurs atomically at issuance inside a serializable database transaction using row-level pessimistic locks (`SELECT FOR UPDATE`). Drafts never consume sequence numbers.
- **Single Exporter Interface:** Document data is strictly canonical (`@platform/accounting-core`). Exporters are registered adapters (`DocumentExporter`) with zero `if/else` logic branches.
- **Contextual Settings Everywhere:** One reusable `<QuickSettings>` drawer built in `@platform/ui`, embedded contextually across screens (Invoice Editor, Daybook, BRS, Practice Tasks).

---

## 2. Audit of Existing Codebase & Gap Analysis

| Subsystem | Existing Implementation in Codebase | Architectural Gap to Bridge |
| :--- | :--- | :--- |
| **Settings Storage** | Ad-hoc columns on `companies`, `branches`, `tenants`. No generic settings store. | Need generic `setting_values` and `setting_history` tables with typed code registry, caching, and resolution engine. |
| **Numbering Engine** | `VoucherSequenceOrmEntity` (last_sequence counter) with pessimistic lock in `VoucherService`. `InvoiceService` uses simple count prefix (`INV-XXXXX`). | Unify invoice, voucher, and master entity codes under `NumberingService`. Add manual mode, token interpolation (`{FY}`, `{BRANCH}`), series lock after first use, `number_allocations` table, and gap detector. |
| **Document Templates** | Hard-coded React layout in `apps/web/src/app/invoices/[id]/` using standard CSS `@media print`. | Extract into data-driven template engine with section toggles, styling tokens, multi-layout gallery (Classic, Modern, Compact, Thermal, Detailed GST), and PDF worker. |
| **Export Formats** | Browser `window.print()` and Tally XML generation in `TallyGatewayService`. | Formalize `DocumentExporter` adapter interface with Tally XML/JSON round-trip, CSV/Excel column presets, and background bulk export outbox jobs. |
| **Company Profile & Branding** | Basic fields (`name`, `pan`, `currency`, `branches.stateCode`). No logo, signature, or stamp storage. | Add branding assets (light/dark logos, authorized signature, stamp, brand color tokens) in S3/MinIO with signed URLs. |
| **Notifications** | Basic in-app `NotificationOrmEntity` and email/WhatsApp reminder cadences in `CollectionsService`. | Build full Event $\times$ Channel $\times$ Recipient matrix, delivery tracking (`notification_deliveries`), fallback chains (WhatsApp $\rightarrow$ SMS $\rightarrow$ Email), and consent opt-in/opt-out records. |
| **Duplicate / Copy Invoices** | None. Manual creation only. | Implement unified `DuplicateDocument` use-case with copy options (reset number/date/status, refresh prices, revalidate GST rules, duplicate warning). |
| **Master Entity Codes** | Hard-coded or manually typed `code` fields on Ledgers and Items. | Auto-code allocation for Customers (`CUST-0001`), Vendors (`VND-0001`), Items (`SKU-0001`), Ledgers (`LED-0001`), and Tasks (`TSK-0001`). |

---

## 3. Database Schema & Migration Specification

A single forward/reversible migration: `1731000000000-UnifiedSettingsAndNumberingSystem.ts`.

```
                                    ┌──────────────────────┐
                                    │  setting_definitions │ (Registry in code)
                                    └──────────┬───────────┘
                                               │
                                               ▼
┌───────────────────────────┐       ┌──────────────────────┐
│       setting_history     │◄──────┤    setting_values    │
└───────────────────────────┘       └──────────────────────┘

┌───────────────────────────┐       ┌──────────────────────┐
│     number_allocations    │◄──────┤   numbering_series   │
└───────────────────────────┘       └──────────────────────┘

┌───────────────────────────┐       ┌──────────────────────┐
│     document_snapshots    │◄──────┤  document_templates  │
└───────────────────────────┘       └──────────────────────┘

┌───────────────────────────┐       ┌──────────────────────┐
│  notification_deliveries  │◄──────┤  notification_rules  │
└───────────────────────────┘       └──────────────────────┘
```

### Table Definitions

#### 1. `setting_values` & `setting_history`
```sql
CREATE TABLE setting_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  scope VARCHAR(32) NOT NULL, -- 'PLATFORM', 'TENANT', 'COMPANY', 'BRANCH', 'DOC_TYPE', 'USER'
  scope_id UUID NOT NULL,     -- Points to tenant_id, company_id, branch_id, or user_id
  key VARCHAR(128) NOT NULL,
  value JSONB NOT NULL,
  version INT NOT NULL DEFAULT 1,
  updated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_setting_scope_key UNIQUE (tenant_id, scope, scope_id, key)
);

CREATE TABLE setting_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  setting_value_id UUID NOT NULL REFERENCES setting_values(id) ON DELETE CASCADE,
  scope VARCHAR(32) NOT NULL,
  scope_id UUID NOT NULL,
  key VARCHAR(128) NOT NULL,
  old_value JSONB NULL,
  new_value JSONB NOT NULL,
  version INT NOT NULL,
  change_reason TEXT NULL,
  changed_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### 2. `numbering_series` & `number_allocations`
```sql
CREATE TABLE numbering_series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID NULL REFERENCES branches(id) ON DELETE SET NULL,
  entity_type VARCHAR(64) NOT NULL, -- 'INVOICE', 'VOUCHER_SALES', 'CUSTOMER', 'ITEM', 'TASK'
  series_code VARCHAR(32) NOT NULL DEFAULT 'DEFAULT',
  name VARCHAR(128) NOT NULL,
  prefix VARCHAR(32) NOT NULL DEFAULT '',
  suffix VARCHAR(32) NOT NULL DEFAULT '',
  separator VARCHAR(8) NOT NULL DEFAULT '/',
  padding INT NOT NULL DEFAULT 5,
  start_number BIGINT NOT NULL DEFAULT 1,
  current_number BIGINT NOT NULL DEFAULT 0,
  reset_policy VARCHAR(32) NOT NULL DEFAULT 'FINANCIAL_YEAR', -- 'FINANCIAL_YEAR', 'CALENDAR_YEAR', 'MONTHLY', 'NEVER'
  mode VARCHAR(16) NOT NULL DEFAULT 'AUTO', -- 'AUTO', 'MANUAL', 'AUTO_WITH_OVERRIDE'
  reuse_policy VARCHAR(16) NOT NULL DEFAULT 'NEVER_REUSE', -- 'NEVER_REUSE', 'REUSE_UNPOSTED_ONLY'
  is_locked BOOLEAN NOT NULL DEFAULT FALSE, -- Locked once first document issued
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_series_company_entity UNIQUE (company_id, entity_type, series_code)
);

CREATE TABLE number_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  series_id UUID NOT NULL REFERENCES numbering_series(id) ON DELETE RESTRICT,
  allocated_number VARCHAR(128) NOT NULL,
  sequence_value BIGINT NOT NULL,
  financial_year_id UUID NULL REFERENCES financial_years(id),
  document_id UUID NULL, -- Reference to invoice or voucher ID
  status VARCHAR(32) NOT NULL DEFAULT 'ISSUED', -- 'ISSUED', 'CANCELLED', 'RELEASED'
  release_reason TEXT NULL,
  allocated_by UUID NOT NULL REFERENCES users(id),
  allocated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_series_allocated_number UNIQUE (series_id, allocated_number)
);
```

#### 3. `document_templates` & `document_snapshots`
```sql
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id UUID NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,
  document_type VARCHAR(64) NOT NULL, -- 'TAX_INVOICE', 'PROFORMA', 'DELIVERY_CHALLAN', 'RECEIPT'
  layout_type VARCHAR(32) NOT NULL DEFAULT 'MODERN', -- 'CLASSIC', 'MODERN', 'COMPACT', 'THERMAL', 'DETAILED_GST'
  layout_config JSONB NOT NULL, -- Sections toggle, order, column visibility, font, colors
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE document_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_id UUID NOT NULL UNIQUE,
  document_type VARCHAR(64) NOT NULL,
  template_version INT NOT NULL,
  settings_snapshot JSONB NOT NULL,   -- Profile, branding, bank details, tax settings at issue time
  document_snapshot JSONB NOT NULL,   -- Complete canonical document structure
  snapshot_hash VARCHAR(64) NOT NULL, -- SHA-256 for audit immutability
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### 4. `notification_rules` & `notification_deliveries`
```sql
CREATE TABLE notification_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL, -- 'INVOICE_ISSUED', 'PAYMENT_RECEIVED', 'TASK_DUE', 'APPROVAL_REQUESTED'
  channels JSONB NOT NULL,         -- ['IN_APP', 'EMAIL', 'WHATSAPP', 'SMS']
  recipient_roles JSONB NOT NULL,  -- ['CLIENT_APPROVER', 'STAFF_ACCOUNTANT', 'CUSTOMER']
  recipient_emails JSONB NOT NULL DEFAULT '[]',
  template_id VARCHAR(64) NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_start TIME NULL,
  quiet_hours_end TIME NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE notification_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  channel VARCHAR(32) NOT NULL,
  recipient VARCHAR(256) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL, -- 'QUEUED', 'SENT', 'DELIVERED', 'BLOCKED', 'FAILED'
  blocked_reason TEXT NULL,
  provider_reference VARCHAR(128) NULL,
  attempts INT NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  delivered_at TIMESTAMPTZ NULL
);
```

---

## 4. Layered Settings Architecture & Registry Design

### Hierarchy Resolution Engine
When retrieving `resolve(key, context: { tenantId, companyId, branchId, docType, userId })`:
1. Check **User Override** (if setting definition `allowUserOverride: true`).
2. Check **Document Type** override (`docType`).
3. Check **Branch** override (`branchId`).
4. Check **Company** override (`companyId`).
5. Check **Tenant / Firm** default (`tenantId`).
6. Fallback to **Platform Default** defined in code registry.

### Typed Registry Entry Structure (`SettingsRegistry`)
```typescript
export interface SettingDefinition<T> {
  key: string;
  category: 'FINANCIAL' | 'TAX' | 'BRANDING' | 'NUMBERING' | 'WORKFLOW' | 'PAYMENTS' | 'DOCUMENTS' | 'LOCALISATION';
  label: string;
  description: string;
  schema: z.ZodSchema<T>;
  defaultValue: T;
  allowedScopes: Array<'PLATFORM' | 'TENANT' | 'COMPANY' | 'BRANCH' | 'DOC_TYPE' | 'USER'>;
  isSensitive: boolean;          // Requires elevated role (FIRM_PARTNER / SUPER_ADMIN)
  isLockedAfterFirstUse: boolean; // Locked once first transaction is posted
  affectsExistingDocuments: boolean; // false = applies only to new documents
  renderType: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'COLOR' | 'IMAGE_UPLOAD' | 'MATRIX';
  options?: Array<{ label: string; value: any }>;
  complianceNote?: string;
}
```

---

## 5. Document Exporter & Template Architecture

```
[ Canonical Voucher / Invoice ] ──► [ DocumentExporter Registry ]
                                             │
      ┌──────────────────────┬───────────────┴───────────────┬──────────────────────┐
      ▼                      ▼                               ▼                      ▼
[ PDF Layout Engine ]  [ Tally Daybook XML ]          [ Excel / CSV Export ]  [ JSON Statutory ]
(Classic/Modern/Thermal) (TallyPrime 2/3/4/5)         (Configurable Columns)   (GSTR/E-Invoice)
```

### Exporter Interface
```typescript
export interface DocumentExporter<TDoc = any, TOptions = any> {
  readonly formatId: 'PDF' | 'TALLY_XML' | 'EXCEL' | 'CSV' | 'JSON';
  supports(docType: string): boolean;
  export(doc: TDoc, options: TOptions): Promise<{
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    metadata: Record<string, any>;
  }>;
}
```

### Built-in PDF Templates
1. **Classic Corporate:** Traditional Indian boxed invoice with prominent GSTIN and Rule 46 declarations.
2. **Modern Minimalist:** Clean typography, brand accent lines, optimized for professional tech and service consulting.
3. **Detailed GST Schedule:** Full multi-rate HSN breakdown table (Taxable, CGST, SGST, IGST, Cess, Reverse charge notices).
4. **Compact / Logistics:** 1-page condensed layout for Delivery Challans and warehouse dispatch notes.
5. **Thermal 80mm Receipt:** POS receipt layout for retail cash payments and instant collections.

---

## 6. Numbering Engine: Concurrency, Series & Lifecycle

### Concurrency & Invariant Rules
- **Drafts Never Consume Numbers:** A draft invoice is referenced by its immutable UUID and a provisional draft token (`DRAFT-...`). Final numbering occurs inside the commit transaction.
- **Pessimistic Lock Invariant:**
  ```sql
  SELECT current_number FROM numbering_series 
  WHERE company_id = $1 AND entity_type = $2 AND series_code = $3 
  FOR UPDATE;
  ```
- **Token Interpolation Engine:**
  - `{FY}`: `24-25`
  - `{YYYY}`: `2024`
  - `{MM}`: `10`
  - `{BRANCH}`: `MUM`
  - `{SEQ}`: `00001` (padded per series config)
  - Result: `INV/24-25/MUM/00001`
- **Deleting vs. Cancelling:**
  - Unposted drafts: Hard-deletable.
  - Issued documents: Hard-delete prohibited by DB trigger `trg_prevent_issued_doc_delete`. State transitions to `CANCELLED`; number remains in `number_allocations` marked `CANCELLED`.
  - Number reuse: Default is `NEVER_REUSE`. If reuse is permitted for un-transmitted numbers, release reason is required and audited in `setting_history`.
- **Numbering Gap Integrity Check:**
  $$\text{Expected Sequences} \setminus \text{Allocated Sequences} = \text{Detected Gaps}$$
  Surfaced in the CA governance dashboard.

---

## 7. Contextual `<QuickSettings>` & Settings Centre UI

```
┌────────────────────────────────────────────────────────────────────────┐
│ Invoice Editor  (#INV-00042)                           [Quick Settings]│
└────────────────────────────────────────────────────────────────────────┘
                                                         │ (Click opens drawer)
                                                         ▼
                                ┌────────────────────────────────────────┐
                                │ Quick Settings: Invoicing & Display    │
                                ├────────────────────────────────────────┤
                                │ Company: Acme Solutions India Pvt Ltd  │
                                │ Scope: [ Company ] [ Branch: Mumbai ]  │
                                ├────────────────────────────────────────┤
                                │ Numbering Series                       │
                                │  • Format: INV/{FY}/{SEQ}              │
                                │  • Next: INV/24-25/00043               │
                                │                                        │
                                │ Template: Detailed GST Schedule        │
                                │  • Inherited from Company (Override)   │
                                │                                        │
                                │ Default Payment Terms                  │
                                │  • 30 Days (Net 30)                    │
                                │                                        │
                                │ Reverse Charge Default: OFF            │
                                ├────────────────────────────────────────┤
                                │ [ Reset to Default ]  [ Save Changes ] │
                                │                                        │
                                │ 🔗 Open Full Settings Centre           │
                                └────────────────────────────────────────┘
```

- Built once in `packages/ui/src/quick-settings.tsx`.
- Displays which settings are **Inherited** vs **Overridden**.
- Changes apply live to new drafts; warns if changing sensitive parameters.

---

## 8. Verification, Testing & Risk Governance

### Mandatory Test Plan
1. **Layered Resolution Unit Tests:** Verify precedence order (`USER` > `BRANCH` > `COMPANY` > `TENANT` > `DEFAULT`).
2. **Concurrency Property Tests:** 50 concurrent parallel issue requests against `NumberingService` using Jest to assert 0 duplicate numbers and 0 sequence gaps.
3. **Snapshot Immutability Tests:** Modify company legal name, logo, and GST rate settings; re-render historical invoice snapshot to prove 100% pixel and data immutability.
4. **Tally Round-Trip Verification:** Export canonical voucher to Tally XML $\rightarrow$ validate against TallyPrime Daybook schema $\rightarrow$ read-back comparison.
5. **Notification Reliability & Block Tests:** Assert that messages violating quiet hours, lacking WhatsApp template approval, or lacking user consent are flagged `BLOCKED` with explicit reasons and never silently lost.

### Regulatory & Legal Checks (`TODO(verify)`)
- **TODO(verify) GST Rule 46:** Verify 16 mandatory fields (Supplier name, address, GSTIN, consecutive serial number $\le 16$ characters containing only alphanumeric and `/` or `-`, date of issue, recipient name/address/GSTIN/state code, HSN code, description, quantity, total value, taxable value, tax rate, tax amounts, place of supply, delivery address, reverse charge flag, digital signature).
- **TODO(verify) Numbering Sequence Rules:** Rule 46(b) mandates consecutive serial numbers unique for a Financial Year. Confirm whether mid-year series changes comply with GST circulars.
- **TODO(verify) DLT SMS & Meta WhatsApp:** Verify Telemarketer Registration (DLT) template registration requirements in India and Meta WhatsApp 24-hour business-initiated conversation pricing.

---

## 9. Phased Vertical Slices for Implementation

```
Slice 1: Layered Settings Engine & Registry (Foundation)
Slice 2: Numbering Series Engine & Concurrency Locks
Slice 3: Document Exporter & PDF Template Engine
Slice 4: Reusable <QuickSettings> Drawer & Settings Centre UI
Slice 5: Copy/Duplicate Document Use-Case & Traceability
Slice 6: Notification Matrix, Delivery Log & Consent Engine
Slice 7: Master Auto-Codes & Shared Auto-Fill Service
```

---

### Step 1 Protocol Checkpoint
This architecture blueprint is complete and documented at `docs/phases/settings-plan.md`.

**STOPPING for your approval before proceeding to build Slice 1.** Please review the scope, data model, and verification rules above and provide your confirmation to proceed.

