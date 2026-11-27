# Practice Platform v2 — Architecture & Phased Roadmap

## Phase 1: Configurable Master Data & Core Operating System (Implemented on `ux/refresh-v6`)

Phase 1 replaces the hardcoded `TaskCategory` enum and static template-only workflow with firm-owned configurable master data:

1. **Service Master (`service_types`)** — `/practice/settings/services`
   - Seeds 21 Indian CA services (`GSTR-1`, `GSTR-3B`, `GSTR-9/9C`, `TDS 24Q`, `TDS 26Q`, `TCS 27EQ`, `Advance Tax`, `ITR Filing`, `Tax Audit 44AB`, `Statutory Audit`, `ROC AOC-4`, `ROC MGT-7`, `DIR-3 KYC`, `PF ECR`, `ESI`, `Professional Tax`, `Payroll`, `Bookkeeping`, `GST 2B Recon`, `Advisory`, `Project / One-off`).
   - Free firm-editable categories (autocomplete from existing categories, no fixed enum).
   - Configurable frequency (`ONE_TIME`, `WEEKLY`, `MONTHLY`, `QUARTERLY`, `HALF_YEARLY`, `ANNUAL`, `CUSTOM`), due-date rules (`period_end`, `period_start`, `fixed_date`), default workflow stages, and default checklists.
   - Clone, disable/enable, and delete protection (blocks delete when client subscriptions or jobs reference the service).
   - Inline `+ Add custom service` in job and task creation dialogs.

2. **Editable Workflow Templates & Custom Statuses (`workflow_templates` + `practice_jobs.stages`)** — `/practice/settings/workflows`
   - Full CRUD for workflow templates with custom stage labels, order, assignee role, SLA offset days, and approval gates.
   - Jobs copy their stage list at creation/spawn time; Kanban dynamically renders custom stages when filtering by a service or when jobs use custom stages.

3. **Client-Work Mapping (`client_services`)** — Client 360 → *Services* tab
   - Subscribe any active firm service to a client with per-client overrides: start/end dates, fee amount & fee type (`recurring`, `fixed`, `hourly`), assigned staff, custom due-date rule, and custom stages.

4. **Recurrence Engine (`POST /v1/practice/jobs/spawn-due`)**
   - Idempotently spawns `practice_jobs` per `(tenant_id, client_id, service_type_id, period)` from active `client_services`, copying stages and checklists and computing due dates from per-client or service rules.
   - Auto-spawns next period's job when a recurring job reaches `FILED` or `DONE`.

5. **Client Master Extensions & Encrypted Credentials Vault (`firm_clients`, `client_credentials`)** — Client 360 → *Credentials* & *Profile* tabs
   - Extended Indian entity fields: `entityType`, `incorporationDate`, `cin`, `tan`, `aadhaarMasked` (auto-masked `XXXX-XXXX-1234`), `registeredAddress`, `gstins[]`, `fyPreference`, `isVip`, `assignedPartnerId`.
   - AES-256-GCM encrypted portal credentials (`EncryptionTransformer`) for GST, Income Tax, TRACES, MCA, EPFO, ESIC, Bank.
   - Passwords are always masked (`••••••••`) in list responses; explicit `POST /v1/practice/credentials/:id/reveal` writes a tamper-evident `REVEAL_CREDENTIAL` row to `audit_logs` and blocks `CLIENT_VIEWER` (`403`).

6. **Custom Fields & Labels (`practice_custom_fields`, `practice_labels`)** — `/practice/settings/custom-fields`
   - Firm-defined fields (`text`, `number`, `date`, `dropdown`, `checkbox`) for `CLIENT` and `JOB`, plus color-coded labels rendered and filterable on Client 360 and Jobs Pipeline.

---

## Phase 2: Lifecycle, Billing & Automation Layer (Planned — *Coming soon* in UI)

Phase 2 builds on the Phase 1 master data foundation after Phase 1 review:

- **§7 Proposals, Engagement Letters & E-Sign**: Proposal builder from Service Master items, fee schedule, PDF generation, client portal acceptance/e-sign, auto-provisioning of `client_services` on acceptance.
- **§8 Time Tracking, WIP & Practice Billing**: Live timers on jobs, weekly timesheets, billable vs non-billable hours, WIP unbilled report, one-click GST invoice generation from `practice_time_entries` + `client_services` retainer fees.
- **§9 Capacity & Workload Heatmaps**: Weekly hours-available vs hours-assigned heatmap across staff, SLA breach alerts, bulk reassignment.
- **§10 Notice & Scrutiny Management**: Dedicated `tax_notices` module for GST/IT/TDS notices, DIN/reply-due tracking, linked vault documents and jobs.
- **§11 Automated Reminder Rules**: Configurable T-7 / T-3 / T-1 / overdue notifications via email/WhatsApp/in-app to clients and staff.
- **§12 Firm Mode vs Business Mode Toggle**: Clean workspace mode switcher hiding CA practice modules for single-business accounting tenants.
