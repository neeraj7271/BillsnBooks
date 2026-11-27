# 🏛️ Practice Platform v2 — Configurable Service Master, Client-Work Mapping, and the Firm Operating System

The practice module is currently a task list with a **hardcoded category enum** (`TaskCategory` = GST/TDS/INCOME_TAX/ROC/AUDIT in `packages/shared-types/src/practice.ts`) and 5 seeded workflow templates. Real CA/accounting practice-management systems are built on **firm-owned configurable master data**, not fixed dropdowns, because every firm offers a different mix of services. This prompt rebuilds the module around the model every real system (Karbon, Canopy, TaxDome, Financial Cents, and the ICAI reference design) uses.

Continue on branch `ux/refresh-v6`. Backend changes are expected (this is a real feature build). Do not break existing contracts, the accounting/RLS code, or the document vault just built. Reversible migrations. Hand-written, honest, tested with headless Playwright, logs streamed. Phase honestly — Phase 1 is the core model fix the user asked for; Phase 2 is the lifecycle layer.

---

## 0. The architecture (read before coding)

A practice platform rests on **three pieces of firm-configurable master data** and a mapping:

1. **Client Master** — already exists (`firm_clients`). Extend it (§5).
2. **Service Master / Work Types** — NEW. The firm's own catalog of the services it offers (GSTR-1, GSTR-3B, TDS 24Q, ITR, Tax Audit, ROC AOC-4, Payroll, Advisory, Bookkeeping, or anything the firm invents). Each service owns its frequency, default workflow stages, default checklist, custom statuses, due-date rule, and default assignee role. **This replaces the hardcoded `TaskCategory` enum.**
3. **Client-Work Mapping** — NEW. Which services each client is subscribed to (Client A → GSTR-1 + GSTR-3B; Client B → + TDS; Client C → Tax Audit + ITR). This drives recurring job generation.

Jobs are then **instances** of a service for a client in a period. The service master is the template; the mapping decides who gets it; the recurrence engine spawns the jobs.

---

# PHASE 1 — The configurable core (build now; this is the fix the user asked for)

## 1. Service Master (Work Types) — replace the hardcoded enum

### 1.1 Data model
New entity `service_types` (migration `1731900000000`), tenant-scoped with FORCE RLS:
- `id, tenantId, name, code, category` (category is now a free, firm-editable label, not an enum — e.g. "GST", "Direct Tax", "ROC", "Advisory", or a custom one), `description`
- `frequency` enum: `ONE_TIME | WEEKLY | MONTHLY | QUARTERLY | HALF_YEARLY | ANNUAL | CUSTOM` + `customRecurrenceRule` (RRULE-style string for CUSTOM)
- `defaultDueDateRule` — a rule like "11th of the month after the period", "20th of the month", "Sep 30 of the AY", encoded as `{ basis: 'period_end'|'period_start'|'fixed_date', offsetDays?: number, fixedMonth?: number, fixedDay?: number }`
- `defaultStages` — ordered JSON array of stage objects `{ key, label, order }`
- `defaultChecklist` — JSON array of checklist items per stage
- `defaultAssigneeRole`, `defaultPriority`, `estimatedHours`
- `isActive`, `isSystemSeeded` (so firm can't delete the base ones but can clone/edit), `sortOrder`
- `statutoryFormRef` (e.g. "GSTR-1", "Form 3CD") for the India layer

### 1.2 Seed the common Indian services (as editable system defaults, not an enum)
On tenant creation, seed these `service_types` the firm can then edit/clone/disable: GSTR-1, GSTR-3B, GSTR-9/9C, TDS Return 24Q, TDS Return 26Q, TCS Return 27EQ, Advance Tax, ITR Filing, Tax Audit (44AB), Statutory Audit, ROC AOC-4, ROC MGT-7, DIR-3 KYC, PF ECR, ESI, Professional Tax, Payroll Processing, Bookkeeping / Monthly Close, GST Reconciliation (2B), Advisory / Consulting, Project / One-off. Each pre-filled with a sensible frequency, due-date rule, stages and checklist (use the real statutory dates).

### 1.3 Full CRUD UI — `/practice/settings/services`
A settings page where the firm manages its Service Master:
- List of services with category, frequency, status (Active/Disabled), # clients subscribed.
- **Create / Edit a service** dialog/drawer with every field: name, category (free text with autocomplete of existing categories), frequency (incl. Custom with a recurrence builder), due-date rule builder, a **stage editor** (add/reorder/remove stages), a **checklist editor** per stage, default assignee role, priority, estimated hours, statutory form ref.
- **Clone** a service (start from an existing one). **Disable** (not delete, if jobs exist) / **Delete** (if unused).
- "Add Custom Service" is first-class — the firm can invent "Drafting Reply to GST Notice", "Virtual CFO Retainer", "ESOP Valuation", whatever.

### 1.4 Migrate the hardcoded enum
- Keep `TaskCategory` values as seed data for the new `category` field, then deprecate the enum in new code paths. Existing `compliance_tasks` / `practice_jobs` rows get backfilled to reference a `serviceTypeId` where one matches, else a generic "Legacy Task" service.
- The Jobs "category" dropdown the user complained about now reads from `service_types` (live, firm-editable) with an inline "+ Add custom service" option that opens the create-service drawer — never a fixed list again.

## 2. Workflow templates — make them fully editable (not 5 hardcoded)

The existing `workflow_templates` + the 5 seeded ones (`practice-workflow.service.ts`) become **editable, firm-owned, and linked to a service type**:
- Each service type has a default workflow (stages + checklist); a firm can also save multiple named template variants per service.
- `/practice/settings/workflows` — CRUD on templates: stage editor, checklist editor, per-stage assignee role, per-stage SLA/internal-deadline offset, approval step toggle (maker-checker).
- **Custom workflow statuses** — a firm-editable status set per service/template (not one global Kanban). Default "Not Started / In Progress / In Review / Awaiting Client / Filed / Done" but the firm can add "Waiting for GST Portal", "Sent for DSC", "Partner Review", etc. (Karbon-style custom statuses).
- A small **template library**: the seeded Indian ones a firm can import and then adapt, so they never start from a blank canvas.

## 3. Client-Work Mapping — which services each client gets

New entity `client_services` (tenant-scoped, FORCE RLS): `id, tenantId, clientId, serviceTypeId, startDate, endDate?, feeAmount?, feeType (fixed|recurring|hourly), assignedStaffId?, customStages?/customDueRule? (per-client overrides), isActive`.

UI on the **Client 360** page, a "Services" / "Engagements" tab:
- Add services to a client from the Service Master (multi-select). Each becomes a `client_services` row.
- Per-client overrides: a client may need GSTR-1 but on a custom due date, or assigned to a specific staffer — allow override of due-date rule, assignee, fee.
- Shows, per service: next due date, assigned staff, fee, status.

## 4. Recurrence engine — jobs spawn from the mapping

- A scheduled job (worker) reads active `client_services`, and for each, generates the next `practice_job` when due, using the service's frequency + due-date rule + the client's overrides. Idempotent (one job per client+service+period).
- When a recurring job reaches Filed/Done, the next period's job is ensured (already partially built — wire it to the service master).
- Jobs carry: client, serviceType, period, stages (copied from template at spawn time so later template edits don't mutate history), checklist, assignee, due date, status.
- The Kanban / list / calendar views now filter by service, category, assignee, client, status, due window — all from real configurable data.

## 5. Client Master extensions + Credentials Vault (India table-stakes)

Extend `firm_clients` and add a secure credentials store:
- Client fields: entity type (Individual / Proprietorship / Partnership / LLP / Pvt Ltd / Public Ltd / HUF / Trust / Society / AOP), incorporation date, CIN, TAN, Aadhaar (masked), registered address, multiple GSTINs (one per state), financial year preference, risk/VIP flag, assigned partner + team.
- **Credentials Vault** (new entity `client_credentials`, encrypted at rest with the existing `EncryptionTransformer`, FORCE RLS, audit-logged on every read): GST portal login, Income Tax portal login, TRACES, MCA/ROC, EPFO, ESIC, bank portals — each `{ label, username, passwordEncrypted, url, notes, lastUpdated }`. Only partners/authorized roles can reveal; every reveal writes an audit row. Never log plaintext.
- A "Credentials" tab on Client 360 with reveal-on-click (re-auth or confirm), copy-to-clipboard, and an audit trail.

## 6. Custom fields + labels (configurability everywhere)
- Firm-defined **custom fields** on clients and jobs (text / number / date / dropdown / checkbox), managed in `/practice/settings/custom-fields`, rendered on the respective forms.
- Firm-defined **labels/tags** on jobs and clients for flexible filtering (e.g. "Retainer", "High-Value", "Litigation", "New Client").

## Phase 1 acceptance
- The Jobs category dropdown is gone as a fixed enum — it reads from the firm's live Service Master, with "+ Add custom service" inline.
- A firm can create a brand-new custom service ("Drafting GST Notice Reply", quarterly, custom stages) and it immediately appears everywhere a service is chosen.
- A client can be subscribed to a specific set of services; recurring jobs spawn from that mapping on schedule.
- Custom workflow statuses per service render on the Kanban.
- Credentials vault stores/reveals encrypted logins with an audit trail; cross-tenant/cross-role access blocked.
- All driven + verified through headless Playwright with the real UI.
- Screenshots: `service-master-list.png`, `service-create-custom.png`, `client-services-mapping.png`, `kanban-custom-statuses.png`, `credentials-vault.png` (light + dark).
- Migrations reversible; up→down→up CI test.

Commits (one per slice): `feat(practice): Service Master (configurable work types) replacing hardcoded category enum`, `feat(practice): editable workflow templates + custom statuses per service`, `feat(practice): client-work mapping (client_services) with per-client overrides`, `feat(practice): recurrence engine spawns jobs from client-service mapping`, `feat(practice): client master extensions + encrypted credentials vault with audit`, `feat(practice): firm-defined custom fields and labels`.

---

# PHASE 2 — The firm lifecycle (design the model now, build next; label unbuilt UI "Coming soon" honestly)

## 7. Onboarding → Proposal → Engagement Letter → e-Sign
- A **proposal** builder: pick the client, select services from the Service Master, set pricing per service (fixed / recurring / hourly), generate a branded proposal PDF (reuse the new PDF pipeline).
- Convert an accepted proposal into an **engagement letter** (templated, with the service schedule auto-attached), sent to the client to **e-sign** in the portal (reuse the document vault + a signature capture). On acceptance, auto-create the `client_services` rows and the first jobs — onboarding flows straight into work.

## 8. Time & Billing
- **Time entries** already have an entity (`practice_time_entries`) — build the UI: start/stop timer + manual entry, against job + client, billable flag.
- **Timesheets** per staff per week; approval.
- **Billing**: turn unbilled time + fixed/recurring fees into a GST invoice (reuse the invoicing engine), track payment. Retainer support.
- **Profitability**: time cost vs billed, per client and per job.

## 9. Capacity planning
- Staff workload view with hours assigned vs capacity, overdue counts, a heatmap of who's overloaded across the compliance peak weeks (GST 11th/20th, TDS 7th, etc.).

## 10. Notice management (distinctly Indian)
- Track Income Tax / GST / ROC / PAN / TAN notices per client: `{ client, authority, noticeType, noticeNo, receivedDate, dueDate, status, assignee, documents, response }`. A notices inbox with due-date tracking and document attachments. Most global tools lack this; it's a differentiator for the Indian market.

## 11. Configurable reminders & notification rules
- Firm-editable email/WhatsApp templates (due-date reminder, document request, invoice delivery) and notification rules (how many days before a due date, to whom).

## 12. Firm mode vs Business mode (the dual-audience split)
- **Firm mode** (default): the full multi-client Service Master + mapping + staff + portal for the firm's clients.
- **Business mode**: a simplified preset for a single business doing its own compliance — their own services/calendar/documents, no multi-client machinery, no staff assignment. Same engine, fewer dimensions exposed. A workspace-level setting chooses the mode; the UI adapts (hide client-selection where there's only one entity, simpler nav).

## 13. Practice dashboard (upgrade)
- Firm health: jobs by stage, overdue, due-this-week, capacity per staff, WIP/revenue, compliance-risk clients (at risk of a missed statutory deadline), notices open. The "who's doing what" + "what's at risk" view every benchmark leads with.

## Phase 2 handling
- Write `docs/practice/PRACTICE_PLATFORM_V2_ROADMAP.md` documenting the full model, what's built in Phase 1, and the Phase 2 plan. Where a Phase 2 surface is stubbed, label it clearly "Coming soon" — never a fake-working control.

---

# Global rules
- Backend additions expected; existing contracts, accounting, RLS, and the document vault must not break. Reversible migrations with up→down→up CI tests.
- Design freeze on screens that already work and weren't in scope; only the practice module is being rebuilt here.
- Honesty: no hardcoded enums where the firm should configure; no fake data; no stubbed success. Credentials are really encrypted; recurrence really spawns; custom services really flow everywhere.
- Everything tested through headless Playwright + API assertions.
- Deliverables: the roadmap doc, per-slice screenshots (light + dark), and a Playwright trace per journey.
- Do not merge to dev until the user has reviewed the Service Master, client-work mapping, custom services on the Kanban, and the credentials vault.

**Build Phase 1 in order (§1 Service Master → §2 templates → §3 mapping → §4 recurrence → §5 client master + vault → §6 custom fields). Phase 2 after Phase 1 is reviewed. Stream logs. The next time the user hears from you is when a firm can create a fully custom service and map it to a client, with screenshots proving the hardcoded category dropdown is gone.**
