# Practice Management Platform Roadmap

This document defines the phased evolution of the Antigravity Books Practice Module (benchmarked against Karbon, TaxDome, SmartVault, Onvio, and Vyapar TaxOne / Turia).

---

## Phase 1 — Built & Shipped (Branch `ux/refresh-v6`)

### 1. Jobs & Workflow Pipeline (`/practice/jobs`)
- **Database Schema (`1731800000000-PracticeJobsWorkflowAndClient360.ts`)**:
  - `workflow_templates`: Reusable Indian CA templates seeded automatically (`Monthly GST`, `Quarterly TDS`, `Annual ITR`, `Tax Audit (44AB)`, `ROC Annual (AOC-4 & MGT-7)`), each with ordered stages and stage-mapped checklists.
  - `practice_jobs`: Engagement work units with `stage` (`BACKLOG`, `IN_PROGRESS`, `REVIEW`, `AWAITING_CLIENT`, `FILED`, `DONE`), `due_date`, `assigned_to_user_id`, `checklist`, `filing_ack_number`, and `next_spawned_job_id`.
  - `practice_job_comments`: Threaded team notes per job.
- **UI**:
  - Drag-and-drop Kanban board + accessible stage move buttons.
  - List view & Due Dates view.
  - Job Detail drawer with interactive checklist toggling, staff assignment, and comment threads.
- **Recurring Job Auto-Spawn**:
  - Moving a recurring job (e.g., Monthly GST) to `FILED` or `DONE` automatically spawns the next period's job with the next due date and a fresh unchecked checklist.

### 2. Client 360 / CRM (`/practice/clients/[id]`)
- Unified client record with Legal Name, PAN, GSTINs, engagement tier, and health status.
- Tabs: **Overview**, **Jobs**, **Documents Vault** (embedded `DocumentVaultView`), **Compliance Calendar**, **Contacts** (CRUD via `client_contacts`), **Notes & Activity**, and **Time & Billing** (Phase 2 preview).

### 3. Client Document Vault (`/practice/clients/[id]/vault` & `/practice/documents`)
- Built on `FileStorageService` (S3/MinIO + local disk fallback).
- Default 9-folder hierarchy (`GST`, `Income Tax`, `TDS`, `ROC / MCA`, `Audit`, `Bank Statements`, `Agreements`, `Correspondence`, `Misc`), versioning, SHA-256 verification, inline PDF/image preview, soft-delete to `deleted/`, and immutable `audit_logs`.

### 4. Staff Workload & Capacity (`/practice/workload`)
- Per-staff open jobs, overdue counts, filed counts, and weekly capacity utilization heatmap.

### 5. Firm Practice Dashboard (`/practice`)
- Real-time KPIs: Active Clients, Open Jobs, Overdue Jobs, Due This Week, Pending Client Docs, Jobs by Stage, Team Capacity, and Client Compliance Risk summary.

---

## Phase 2 — Data Model Provisioned, Next Implementation Sprint

1. **Time Tracking, WIP & Engagement Billing**
   - *Data model already provisioned*: `practice_time_entries` (`client_id`, `job_id`, `user_id`, `minutes`, `is_billable`, `notes`).
   - *Next*: Live start/stop timer widget on job cards, weekly staff timesheets, and one-click conversion of unbilled time + fixed retainer fees into GST invoices via the existing `InvoiceModule`.
2. **Client Portal Messaging & E-Signature**
   - Dedicated `CLIENT_VIEWER` portal home showing active job stage progress ("Your GSTR-3B is in Review"), direct document request uploads, and engagement letter e-signature with audit trail.
3. **Document OCR & Full-Text Search**
   - Background BullMQ worker extraction of PDF/image text for full-text search across vault contents.
4. **Email Integration (IMAP/SMTP Sync)**
   - Threading client emails directly into Client 360 Notes & Activity timeline.
