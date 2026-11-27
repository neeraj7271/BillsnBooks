# 🏛️ Practice Platform v2 — PHASE 2 (the firm lifecycle: onboarding → billing → portal)

Phase 1 is verified: Service Master, Client-Work Mapping, recurrence, custom statuses/fields, and the encrypted credentials vault are live on `ux/refresh-v6`. Phase 2 builds the revenue-and-delivery lifecycle on top of that model, turning the module from "configurable task engine" into a full practice operating system.

Continue on `ux/refresh-v6`. Build these as REAL features (no "Coming soon" stubs anymore — the roadmap promised Phase 2 would be built, so build it). Reuse what already exists: the Service Master (`service_types`), client-work mapping (`client_services`), `practice_time_entries` entity, the document vault + `FileStorageService`, the invoicing engine, and the new server-side PDF pipeline. Backend changes expected; don't break existing contracts, accounting, RLS, the vault, or Phase 1. Reversible migrations with up→down→up CI tests. Hand-written, honest, headless-Playwright tested, logs streamed. Build in the section order below.

---

## 7. Onboarding → Proposal → Engagement Letter → e-Sign

The front door of the firm: win a client, price the work, get it signed, auto-create the engagements.

### 7.1 Proposals
New entity `practice_proposals` (migration `1732000000000`, FORCE RLS): `id, tenantId, clientId (nullable for prospects), prospectName, status (DRAFT|SENT|VIEWED|ACCEPTED|DECLINED|EXPIRED), validUntil, createdByUserId, acceptedAt, totalValue, currency, notes`.
New entity `practice_proposal_lines`: `id, proposalId, serviceTypeId, description, feeType (FIXED|RECURRING|HOURLY), feeAmount, recurrenceFrequency, estimatedHours, hourlyRate`.
- **Proposal builder UI** at `/practice/proposals/new`: pick/create a client or a prospect, add services from the Service Master (each line pre-fills from the service's defaults, editable), set pricing per line (fixed / recurring / hourly), see the running total (with GST), set validity. Save as draft, then **Generate PDF** (reuse the PDF pipeline) → a branded proposal document.
- **Proposals list** `/practice/proposals` with status pipeline (Draft / Sent / Viewed / Accepted / Declined / Expired), value, client, valid-until.

### 7.2 Engagement letters
New entity `practice_engagements`: `id, tenantId, clientId, proposalId?, status (DRAFT|SENT|SIGNED|COUNTERSIGNED|ACTIVE|TERMINATED), engagementLetterFileId (vault), scopeOfServices (JSON — the service schedule), feeSchedule (JSON), startDate, endDate?, signedByClientAt, signedByFirmAt`.
- **Engagement letter templates** (firm-editable, in `/practice/settings/engagement-templates`): a rich template with merge fields (client name, PAN, services, fees, period, partner name) and the service schedule auto-attached from the accepted proposal.
- Convert an **accepted proposal → engagement letter**: one click generates the letter PDF with the service schedule, stores it in the client's vault, and sets status to SENT.

### 7.3 e-Signature
- A signature capture flow: the client (CLIENT_VIEWER role, via the portal) opens the engagement letter, reviews it, and signs — either typed-name + consent checkbox + IP/timestamp capture, or a drawn-signature canvas. Store the signature image in the vault, stamp the PDF with signature block + audit metadata (signer name, email, IP, timestamp, document SHA-256). Firm counter-signs.
- Every signature event writes an **audit-log** row (full trail: who, when, from where, document hash) — this is a legal artifact.
- **On ACTIVE engagement**: auto-create the `client_services` rows from the engagement's scope and spawn the first jobs. Onboarding flows straight into work with zero re-keying.

### 7.4 Acceptance
- Build a proposal with 3 services + mixed pricing → generate PDF → convert to engagement → client e-signs in the portal → firm counter-signs → `client_services` auto-created → first jobs spawned. All through the real UI.
- Screenshots: `proposal-builder.png`, `proposal-pdf.png`, `engagement-esign.png`, `engagement-active-jobs.png` (light + dark).

Commits: `feat(practice): proposal builder with per-service pricing + branded PDF`, `feat(practice): engagement letters with templates + service schedule`, `feat(practice): e-signature flow with audit trail; auto-create engagements on signature`.

---

## 8. Time & Billing

Turn work into revenue. `practice_time_entries` already exists — build the UI and the billing bridge.

### 8.1 Time tracking
- **Timer + manual entry** on every job and job-stage: start/stop timer (persists if the user navigates away), or add a manual entry (duration, date, note). Each entry: staff, client, job, serviceType, billable flag, hourlyRate (from the client-service or staff default).
- **Timesheet** view `/practice/timesheets`: per staff per week grid, daily totals, billable vs non-billable split, submit-for-approval; partner approves.
- Running "unbilled WIP" per client.

### 8.2 Billing
New entities `practice_bills` + `practice_bill_lines` (or reuse the invoice engine with a practice flag — your call, but a practice bill must become a proper GST invoice):
- **Generate a bill** from a client's unbilled time entries + fixed/recurring fees from their `client_services`. Review lines, adjust, write-off, then **convert to a GST invoice** (reuse the invoicing engine — the firm charges GST on its fees). Draft → send → track payment.
- **Retainer support**: a recurring fixed fee billed on a schedule regardless of time; time entries draw down against it.
- Payment tracking ties into the existing collections/payment-links if present.

### 8.3 Profitability
- Per client and per job: time cost (hours × cost rate) vs billed vs collected. A simple margin view.

### 8.4 Acceptance
- Log time on a job → it appears in the timesheet and as unbilled WIP → generate a bill → convert to a GST invoice → mark paid. Retainer client shows draw-down. Profitability view shows margin.
- Screenshots: `timer-on-job.png`, `timesheet-week.png`, `generate-bill.png`, `profitability.png` (light + dark).

Commits: `feat(practice): time tracking timer + timesheets with approval`, `feat(practice): billing — time+fees to GST invoice, retainers, write-offs`, `feat(practice): client & job profitability`.

---

## 9. Capacity planning

Partner visibility into who can take more work and who's drowning in peak weeks.

- **Staff workload view** `/practice/capacity`: per staff member — open jobs, hours assigned vs weekly capacity, overdue count, upcoming due dates. A **heatmap** across the compliance peak dates (GST 11th/20th, TDS 7th, PF/ESI 15th, Advance Tax installments) showing load per staff per week.
- **Reassign** jobs/stages from the capacity view (drag or action); the new assignee gets a notification.
- Flag overloaded staff (assigned hours > capacity) in red.

Acceptance: the capacity view shows real assignment load from live jobs; reassigning updates the job and notifies. Screenshot: `capacity-heatmap.png` (light + dark).

Commit: `feat(practice): staff capacity planning + heatmap + reassignment`.

---

## 10. Notice management (the Indian differentiator)

Track the 50–200 statutory notices a firm handles a year — most global tools don't do this.

New entity `practice_notices` (FORCE RLS): `id, tenantId, clientId, authority (INCOME_TAX|GST|ROC|PAN|TAN|TDS|OTHER), noticeType, noticeNo, section, receivedDate, responseDueDate, status (NEW|IN_PROGRESS|RESPONDED|CLOSED|ESCALATED), assignedStaffId, amountInvolved?, documents (vault file ids), responseNotes, resolvedAt`.
- **Notices inbox** `/practice/notices`: list + filters (authority, status, due window, client, assignee), overdue highlighting, a Kanban or list view.
- **Notice detail**: full metadata, attached documents (from the vault), response thread, status workflow, link to the client.
- Due-date tracking feeds the practice dashboard and reminders.

Acceptance: create a GST notice for a client with a due date and attached document → it shows in the inbox, overdue highlights work, status transitions, links to the client. Screenshots: `notices-inbox.png`, `notice-detail.png` (light + dark).

Commit: `feat(practice): notice management — IT/GST/ROC notices inbox with due tracking + documents`.

---

## 11. Configurable reminders & notification rules

Firm-editable automation for client-facing and internal nudges.

- **Email/WhatsApp templates** (firm-editable) in `/practice/settings/templates`: due-date reminder, document request, invoice delivery, engagement sign reminder, notice response reminder. Merge fields (client, service, due date, amount, link). WhatsApp is template-text generation + a click-to-send link if no gateway is wired (note the gap honestly).
- **Notification rules**: per event, configure how many days before a due date a reminder fires and to whom (client, assignee, partner). A worker evaluates the rules and dispatches (in-app notification always; email if SMTP configured; WhatsApp link otherwise).
- Reuse the existing notification center for in-app delivery.

Acceptance: configure a "3 days before GST due date" rule → the worker creates the reminder → it appears in the notification center and (if SMTP set) sends an email. Screenshot: `reminder-rules.png` (light + dark).

Commit: `feat(practice): configurable reminder templates + notification rules engine`.

---

## 12. Firm mode vs Business mode (the dual-audience split)

One engine, two presets, chosen at workspace level in Settings.

- **Firm mode** (default): everything above — multi-client Service Master, mapping, staff, proposals, billing, portal for the firm's clients.
- **Business mode**: a simplified preset for a single business doing its own compliance:
  - Hide multi-client machinery (no client selector where there's one entity; the "clients" concept collapses to "my business").
  - Show: my services/compliance calendar, my documents, my jobs, my notices, my due dates. No staff assignment, no proposals/engagements/billing-to-clients, no capacity.
  - Simpler nav: Home, Compliance, Documents, Calendar, Notices.
- A workspace setting `practiceMode: FIRM | BUSINESS` drives which nav items, dashboards, and dialogs render. The underlying data model is identical; Business mode is a filtered, simplified view over the same tables (the single business is modeled as one client of itself).

Acceptance: flip the workspace to Business mode → the nav and dashboards simplify, multi-client controls disappear, the single-entity compliance view works. Flip back to Firm mode → full platform returns. Screenshots: `business-mode-home.png`, `firm-mode-home.png` (light + dark).

Commit: `feat(practice): Firm mode vs Business mode workspace preset`.

---

## 13. Practice dashboard (the command center)

Upgrade the practice hub into the "who's doing what + what's at risk" view.

- **Jobs by stage** (counts across the pipeline), **overdue jobs**, **due this week**.
- **Capacity**: per-staff load summary.
- **Compliance risk**: clients at risk of a missed statutory deadline (a job not started with < N days to due).
- **Notices open** by authority + overdue.
- **Financials**: WIP (unbilled), billed this month, collected, outstanding.
- **Upcoming statutory calendar** strip (next 14 days of due dates across all clients).
- In Business mode, this collapses to the single entity's version.

Acceptance: the dashboard shows real numbers from live Phase-1/Phase-2 data — jobs, capacity, risk, notices, financials. Screenshot: `practice-dashboard-v2.png` (light + dark).

Commit: `feat(practice): practice command-center dashboard — stages, risk, capacity, notices, financials`.

---

## Global rules
- Real features, not stubs. Where an external integration genuinely isn't wired (WhatsApp gateway, SMTP in dev), degrade gracefully (generate the message + a click-to-send link) and note the gap in `PRACTICE_PLATFORM_V2_ROADMAP.md` — never a fake success.
- Reuse: PDF pipeline for proposals/engagements, vault for signed docs, invoicing engine for bills, notification center for reminders, `practice_time_entries` for time.
- Existing contracts, accounting, RLS, the vault, and Phase 1 must not break. Reversible migrations with up→down→up CI tests.
- Everything tested through headless Playwright + API assertions; data created via the real UI.
- Deliverables: updated `docs/practice/PRACTICE_PLATFORM_V2_ROADMAP.md` (Phase 2 now built), per-section screenshots (light + dark), a Playwright trace per journey.
- Do not merge to dev until the user has reviewed the proposal→engagement→e-sign flow, time→bill→invoice flow, notices, and the Business/Firm mode split.

**Build in order: §7 onboarding/proposals/engagement → §8 time & billing → §9 capacity → §10 notices → §11 reminders → §12 Firm/Business mode → §13 dashboard. Stream logs. The next time the user hears from you is when a client can be onboarded via a signed engagement that auto-creates their jobs, and time logged on those jobs can be billed as a GST invoice — with screenshots proving both.**
