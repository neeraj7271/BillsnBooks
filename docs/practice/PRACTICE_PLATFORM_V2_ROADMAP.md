# Practice Platform v2 — Architecture & Phased Roadmap

## Phase 1: Configurable Master Data & Core Operating System (Implemented on `ux/refresh-v6`)

Phase 1 replaced the hardcoded `TaskCategory` enum and static template-only workflow with firm-owned configurable master data:

1. **Service Master (`service_types`)** — `/practice/settings/services` (21 seeded Indian CA services, free-form categories, due-date rules, custom stages & checklists, clone/disable/delete protection, inline `+ Add custom service`).
2. **Editable Workflow Templates & Custom Statuses (`workflow_templates` + `practice_jobs.stages`)** — `/practice/settings/workflows` & dynamic Kanban columns.
3. **Client-Work Mapping (`client_services`)** — Client 360 → *Services* tab with per-client fee/due-rule/staff overrides.
4. **Recurrence Engine (`POST /v1/practice/jobs/spawn-due`)** — Idempotent job spawning per `(tenantId, clientId, serviceTypeId, period)`.
5. **Client Master Extensions & Encrypted Credentials Vault (`firm_clients`, `client_credentials`)** — AES-256-GCM encrypted portal logins, masked list, audited reveal, `CLIENT_VIEWER` 403 block.
6. **Custom Fields & Labels (`practice_custom_fields`, `practice_labels`)** — `/practice/settings/custom-fields`.

---

## Phase 2: Firm Lifecycle, Billing, Capacity, Notices & Dual-Mode OS (Implemented on `ux/refresh-v6`)

7. **Onboarding → Proposal → Engagement Letter → e-Sign**
   - **Proposals (`/practice/proposals`, `/practice/proposals/new`)**: Multi-service proposals from Service Master with `FIXED | RECURRING | HOURLY` pricing, live 18% GST calculation, and branded A4 PDF generation (`PdfRenderService`).
   - **Engagement Letters (`/practice/settings/engagement-templates`, `/practice/engagements/[id]`)**: Firm-editable merge-field templates; one-click conversion from accepted proposal generates the Engagement Letter PDF and stores it in the client's `Agreements` vault folder.
   - **e-Signature & Auto-Provisioning**: Client typed-name + consent + drawn-signature canvas stamps a SHA-256 certificate onto the PDF and records `ENGAGEMENT_CLIENT_SIGNED` in `audit_logs`. Firm counter-sign (`ACTIVE`) automatically provisions `client_services` and spawns the first `practice_jobs`.

8. **Time Tracking, Billing & Profitability**
   - **Time Tracking (`/practice/jobs` timer + manual entry, `/practice/timesheets`)**: Persistent job timer (`localStorage`), manual logging, billable vs non-billable split, and partner approval.
   - **Practice Billing (`/practice/billing`)**: Pulls unbilled WIP + active `client_services` retainers/fixed fees, supports retainer draw-down & fee write-offs, and converts bills into real GST Invoices (`InvoiceService.createInvoice`, SAC `998221`).
   - **Profitability**: Per-client and per-job margin report comparing staff `hourlyCostRate` time cost vs billed vs collected.

9. **Capacity Planning (`/practice/capacity`)**
   - Weekly staff capacity vs assigned compliance hours, peak-week heatmap (`W1 TDS 7th`, `W2 GST-1/PF`, `W3 GSTR-3B`, `W4 Close`), overloaded alerts, and one-click job reassignment with in-app notification.

10. **Notice Management (`/practice/notices`)**
    - Tracks `GST`, `INCOME_TAX`, `TDS`, `ROC`, `PAN`, `TAN` notices, DIN/notice numbers, sections, disputed amounts, overdue highlights, and response workflow.

11. **Configurable Reminders & Notification Rules (`/practice/settings/templates`)**
    - Firm-editable email/WhatsApp templates and due-date/notice notification rules.
    - **Integration Gaps (Honest Degradation):**
      - *WhatsApp*: No external WhatsApp Business API gateway is wired; `runNotificationRules` generates pre-filled `https://wa.me/...` click-to-send links alongside in-app notifications.
      - *SMTP*: In-app notifications (`notifications` table) are always dispatched; email delivery activates automatically when `SMTP_HOST` is configured.

12. **Firm Mode vs Business Mode (`tenants.practice_mode`)**
    - Workspace switcher between `FIRM` (full multi-client CA operating system) and `BUSINESS` (simplified single-entity compliance hub hiding multi-client, proposals, billing, and capacity).

13. **Command-Center Dashboard (`/practice`)**
    - Live jobs by stage, overdue & due-this-week counts, at-risk clients, open notices by authority, unbilled WIP / billed / collected financials, staff capacity summary, and 14-day statutory calendar.

---

## Team Management & Maker-Checker Review Engine (Implemented on `ux/refresh-v6`)

- **Colleague Management & Invite-to-Firm (`/practice/team`, `/auth/accept-invite`)**:
  - `user_kind` separates `FIRM_COLLEAGUE` from `CLIENT_USER`.
  - Invitations (`team_invitations`) join the existing firm (`tenant_id`) instead of creating a new tenant.
  - Editable `weekly_capacity_hours` and `hourly_cost_rate` on each colleague feed §9 Capacity Heatmap and §8 Profitability.
- **Two Role Systems & Client-Team Membership (`/practice/settings/roles`, Client 360 → *Team*)**:
  - Custom `permission_roles` matrix enforced by `RolesGuard` (`@RequirePermission`), separate from `job_roles` (`Preparer`, `Reviewer`, `Partner / Signatory`, etc.) and `client_team_members`.
- **Enforced Review / Sign-off Engine (`/practice/jobs`, `/practice/reviews`, `/practice/settings`)**:
  - Separation of duties: in `ENFORCED` mode, preparers cannot approve or advance a gated job to `FILED`/`DONE` (UI buttons disabled + API `403 Forbidden`).
  - Supports **Submit for Review**, **Return for Rework** (required notes), **Approve / Partner Sign-off** with tamper-evident `audit_logs` + `practice_job_reviews` timeline, and **Solo vs Team** `reviewMode` (`OFF | SELF_SIGNOFF | ENFORCED`).
