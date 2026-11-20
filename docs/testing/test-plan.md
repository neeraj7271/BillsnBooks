# Antigravity Books — Guided Manual Test Plan

**Document Reference:** `docs/testing/test-plan.md`  
**QA Lead:** Antigravity  
**Execution Mode:** Guided Manual UI Testing (Interactive Batch Execution)  
**Status Audit Source:** Real codebase routes (`apps/web/src/app`), API controllers (`apps/api/src/modules`), and domain packages (`@platform/*`).  

---

## 1. Feature Implementation Audit Matrix

| Section # | Section Name | Implementation Status | Built Features & Code Evidence | Stub / Missing / Not Built Scope |
| :---: | :--- | :---: | :--- | :--- |
| **1** | **Setup and Access** | **BUILT** | `/auth/signup`, `/auth/login`, `CompanyDialog`, tenant isolation, JWT bearer token session, local storage auth guards, company switcher. | MFA (multi-factor SMS/TOTP) is not implemented; password-based auth only. |
| **2** | **Settings Centre** | **BUILT** | `/settings/companies`, `/settings/periods`, Layered settings engine (`SettingService`, `setting_values`, `setting_history`). | Logo/branding image asset upload to S3/CDN (currently textual branding only). |
| **3** | **Chart of Accounts** | **BUILT** | `/settings/ledgers`, `LedgerDialog`, `GroupDialog`, `ChartOfAccountsSeeder`, standard Indian 4-digit codes, protection rules (`is_locked`, `is_system`). | Schedule III statutory auto-reporting is tagged `TODO(verify)`. |
| **4** | **Party Masters** | **BUILT** | `/parties`, `PartyDialog`, `PartyRegistrationPolicy`, Mod-36 checksum, multi-address, registration history, duplicate detection, unreg zero-GSTIN rule. | Automatic GST Portal API live-pulling (falls back to offline verified format). |
| **5** | **Item, HSN/SAC & Tax** | **BUILT** | `/items`, `ItemDialog`, `TaxRateResolver`, goods vs services, 5%/12%/18%/28%/Nil tax rates, HSN validation. | Bulk Excel formula upload for complex item price brackets. |
| **6** | **Numbering & Codes** | **BUILT** | `NumberingService`, `numbering_series`, `number_allocations`, atomic gap-free sequences, FY reset tokens (`{FY}`, `{YYYY}`). | Manual gap reuse override UI toggle. |
| **7** | **Sales and Invoicing** | **BUILT** | `/invoices/new`, `/invoices/[id]`, immutable party snapshots, place-of-supply resolution, line calculation, round-off, maker-checker approval. | Quotation-to-invoice auto-convert button. |
| **8** | **Templates & Exports** | **PARTIAL** | On-screen tax invoice original copy, Tally XML daybook envelope, JSON export. | Downloadable PDF binary rendering engine (HTML print works, headless Puppeteer PDF is stubbed). |
| **9** | **Purchases & Expenses** | **PARTIAL** | Vendor party masters, credit balance tracking, purchase ledger links (`2130`), RCM tax classification. | Dedicated Vendor Bill OCR scan ingestion screen. |
| **10** | **Excel/CSV Import** | **BUILT** | `/imports/new` 4-step wizard: file upload, column mapping, staging validation, post-to-journal. | Real-time AI auto-mapping fallback without header hints. |
| **11** | **Bank Statements** | **BUILT** | `/banking`, `/banking/[id]/reconcile`, statement parser (CSV/TXT), rule-based classification, matching, unbooked credit guard. | Direct Open Banking / Account Aggregator live sync API. |
| **12** | **Native Bookkeeping** | **BUILT** | `/vouchers`, Double-entry balanced voucher engine, Dr/Cr equality, automated sales posting, multi-branch posting. | Manual reversing journal schedule wizard. |
| **13** | **Tally Connector** | **PARTIAL** | `TallyGatewayService`, XML envelope generators for vouchers and party ledgers, read-back verification queries. | Windows background desktop agent service binary (C#/.NET). |
| **14** | **Collections & Recurring**| **BUILT** | `/collections/ageing`, `/collections/recurring`, `/collections/payment-links`, ageing buckets (0-30, 31-60, 61-90, 90+), promise-to-pay, recurring schedules. | WhatsApp / SMS direct gateway API keys (logs and payloads generated). |
| **15** | **Notifications** | **PARTIAL** | `NotificationOrmEntity`, approval request inbox (`/approvals`), user alert badges. | Email SMTP relay / Twilio gateway delivery. |
| **16** | **GST & Compliance** | **PARTIAL** | Place-of-supply engine, statutory rate rules, B2B vs B2C classification. | Direct GSTR-1 / GSTR-3B GSTN portal API filing. |
| **17** | **CA Practice & Portal** | **BUILT** | `/practice/clients`, `/practice/tasks`, `/practice/calendar`, `/practice/documents`, staff assignments, client document requests. | Client mobile native app. |
| **18** | **Mobile & WhatsApp** | **NOT BUILT** | Responsive web view (mobile viewport CSS). | Dedicated native iOS/Android apps or WhatsApp Cloud API webhook. |
| **19** | **Reports & Dashboards** | **BUILT** | `/reports/trial-balance`, `/reports/profit-and-loss`, `/reports/balance-sheet`, `/reports/general-ledger`. Real-time ledger queries. | Scheduled report PDF emailer. |
| **20** | **Cross-Cutting & Security**| **BUILT** | AppShell authentication guards, session expiry, dark/light theme toggle, command palette (`⌘K`), audit logging. | SSO / SAML corporate federated identity. |

---

## 2. Testing Execution Strategy

- **Interactive Execution:** One section at a time.
- **Batch Size:** At most 10 test cases per batch to keep testing agile and actionable.
- **No Self-Marking:** Antigravity designs data, steps, and expected math. The user enters data, verifies the actual screen, and reports `PASS` or `FAIL`.
- **Defect Logging & Fixing:** Every failure is logged in `docs/testing/defect-log.md` with root cause analysis. Application fixes are deferred until the user explicitly commands: `"fix defects"`.

