# Practice — Core & Delivery (routes: `/practice`, `/practice/clients*`, `/practice/jobs`, `/practice/reviews`, `/practice/tasks`, `/practice/settings/services`, `/practice/settings/workflows`)

## Purpose
Runs the CA-firm command center (`FIRM` vs `BUSINESS` mode), client onboarding & Client 360 (with encrypted Credentials Vault and 25 MB Document Vault), Service Master (21 Indian CA defaults), Workflow Templates, Jobs Kanban/List/Calendar with recurring auto-spawn, and the Practice Review/Sign-off engine (distinct from removed invoice approvals).

## User journey
1. Open `/practice` in `FIRM` mode, follow the 6-step Getting Started checklist, or toggle `FIRM` ↔ `BUSINESS` mode.
2. Add a client in `/practice/clients` → auto-seeds 9 default vault folders and 3 current-month compliance tasks (`GSTR-1`, `GSTR-3B`, `Monthly Bank Reconciliation`).
3. Open `/practice/clients/[id]` to inspect all 11 tabs (`OVERVIEW`, `SERVICES`, `TEAM`, `JOBS`, `DOCUMENTS`, `CREDENTIALS`, `COMPLIANCE`, `CONTACTS`, `PROFILE`, `ACTIVITY`, `BILLING`) and upload files to `/practice/clients/[id]/vault`.
4. Configure Services in `/practice/settings/services` and Workflows in `/practice/settings/workflows` (including `requiresApproval` review stages).
5. Manage jobs in `/practice/jobs`, run the timer, submit a job for Partner Review, and approve/sign off or return for rework in `/practice/jobs?tab=review` (`/practice/reviews`).

## Validations & rules (from code)
- **Workspace Mode** (`apps/api/src/modules/practice/practice-operations.service.ts:381-492`):
  - `practiceMode`: `'FIRM' | 'BUSINESS'` (default `'FIRM'`); invalid → `400`: `'practiceMode must be FIRM or BUSINESS'`.
  - Risk rule: client `AT_RISK` if `overdue > 0` or `BACKLOG`/`PLANNING` job due `<= +7d`.
- **Clients & Auto-Seeding** (`practice.service.ts:40-178`):
  - Creates 9 vault folders (`GST`, `Income Tax`, `TDS`, `ROC / MCA`, `Audit`, `Bank Statements`, `Agreements`, `Correspondence`, `Misc`) and 3 monthly tasks (`11th`, `20th`, `25th`).
- **Document Vault** (`document-vault.service.ts:33-90, 148-160, 798-805`):
  - Max `25 MB`; allowed MIME: PDF, JPG, PNG, XLSX/XLS, DOCX/DOC, CSV, ZIP; forbidden extensions: `.html`, `.htm`, `.svg`, `.exe`, `.sh`, `.bat`, `.cmd`, `.js`, `.mjs`, `.cjs`, `.php`, `.py`.
  - `CLIENT_VIEWER` cross-client access → `403`: `'You do not have access to another client vault.'`.
- **Credentials Vault** (`practice-v2.service.ts:1175-1380`):
  - AES-encrypted via `EncryptionTransformer`; masked `'••••••••'` on list; `REVEAL_CREDENTIAL` writes SHA-256 `AuditLogOrmEntity`; `CLIENT_VIEWER` blocked with `403`.
- **Services & Workflows** (`practice-v2.service.ts:58-840`):
  - Seeds 21 CA services (`pg_advisory_xact_lock`) & 5 workflow templates (`Monthly GST`, `Quarterly TDS`, `Annual ITR`, `Tax Audit (44AB)`, `ROC Annual`).
  - Cannot delete service with active subscriptions or jobs (`400`); UI enforces `>= 2` workflow stages (`workflows/page.tsx:330`).
- **Jobs & Recurrence** (`practice-workflow.service.ts:27-34, 411-476`):
  - Moving a `isRecurring` job to `FILED`/`DONE` auto-spawns next period (`+1m`, `+3m`, `+12m`) with unchecked checklist.
  - Preparer cannot skip a `requiresApproval` stage (`403`: `"Awaiting review by <role>: preparer cannot advance or file a gated job."`).
- **Practice Review / Sign-Off Engine** (`practice-review.service.ts:30-410`):
  - `reviewMode`: `'OFF' | 'SELF_SIGNOFF' | 'ENFORCED'` (default `'ENFORCED'`).
  - In `ENFORCED`, preparer cannot approve/sign off own work (`403`: `'Separation of duties: the preparer cannot approve or sign off their own work.'`).
  - Return for rework requires notes (`400`: `'Actionable rework notes are required when returning a job.'`).

## Test cases

| # | Case | Type | Data to use | Steps | Expected result (cite code) |
|---|------|------|-------------|-------|-----------------------------|
| 1 | Toggle `FIRM` ↔ `BUSINESS` mode on `/practice` | Happy | Seeded tenant | `/practice` → toggle `Business` → verify links → toggle `Firm` | `PATCH /v1/practice/workspace-mode`; Business hides multi-client panels (`practice/page.tsx:289-418`). |
| 2 | Onboard CA client & inspect 9 vault folders + 3 tasks | Happy | `PR-CLI-01` (`Zenith Precision Exports Pvt Ltd`) | `/practice/clients` → **New Client** → open Client 360 → check `DOCUMENTS` & `COMPLIANCE` | 9 default folders & 3 tasks (`GSTR-1`, `GSTR-3B`, `Bank Recon`) created (`practice.service.ts:115-157`). |
| 3 | Add, reveal & audit-log a GST portal credential | Happy | `GST Portal`, `zenith_gst`, `ZenithGst@2026` | Client 360 → `CREDENTIALS` → **Add** → **Reveal** | Masked in list (`'••••••••'`), revealed on demand, `REVEAL_CREDENTIAL` logged (`practice-v2.service.ts:1175-1380`). |
| 4 | Upload PDF to Vault & replace version | Happy | Any `< 25 MB` PDF | `/practice/clients/[id]/vault` → **Upload** → **Upload New Version** | Version increments; old version preserved (`document-vault.service.ts:495-540`). |
| 5 | Job pipeline, timer & recurring next-period spawn | Happy | Recurring Monthly GST job | `/practice/jobs` → start/stop timer → move to `FILED` | Time logged at `1500/hr` (`jobs/page.tsx:953`); next month's job auto-spawned (`practice-workflow.service.ts:440-476`). |
| 6 | Review Engine: Submit → Return for Rework → Approve & Sign Off | Happy | Job at `requiresApproval` stage; Partner user ≠ Preparer | Preparer submits → Reviewer returns with notes → Preparer resubmits → Partner signs off | `IN_REVIEW` → `CHANGES_REQUESTED` → `SIGNED_OFF` with SHA-256 `deliverableHash` (`practice-review.service.ts:63-360`). |
| 7 | Separation of duties enforced in `ENFORCED` mode | Negative | Same user who submitted job clicks **Approve / Sign Off** | Submit job as User A → attempt sign-off as User A | `403 Forbidden`: `'Separation of duties: the preparer cannot approve or sign off their own work.'` (`practice-review.service.ts:187-191`). |
| 8 | Preparer tries to bypass gated review stage | Negative | Drag job past `requiresApproval` stage directly to `FILED` | `/practice/jobs` → move stage | `403 Forbidden`: `"Awaiting review by ..."` (`practice-workflow.service.ts:430`). |
| 9 | Return for rework with empty notes | Negative | Empty rework notes | Click **Return for Rework** with blank textarea | `400`: `'Actionable rework notes are required when returning a job.'` (`practice-review.service.ts:296`). |
| 10 | Upload `> 25 MB` or `.exe`/`.svg` file to Vault | Negative | `26 MB` file or `malware.exe` / `icon.svg` | `/practice/clients/[id]/vault` → upload | `400` (`> 25 MB`) or `415 UnsupportedMediaTypeException` (`document-vault.service.ts:81-90`). |
| 11 | Delete Service with active client subscription | Negative | Subscribed `GSTR-1` service | `/practice/settings/services` → **Delete** | `400`: `'Cannot delete ... because N client subscription(s) ... reference it.'` (`practice-v2.service.ts:727`). |

## Edge & boundary cases
- **Aadhaar masking:** Entering a 12-digit Aadhaar in Client Profile masks to `XXXX-XXXX-<last4>` (`practice-v2.service.ts:1156-1160`).
- **Redirects:** `/practice/reviews` redirects to `/practice/jobs?tab=review`; `/practice/tasks` redirects to `/practice/jobs?tab=tasks`.

## Negative / error cases
- `CLIENT_VIEWER` accessing `/practice/clients/:otherId/vault` or `CREDENTIALS` → `403 Forbidden`.
- Setting `practiceMode` to invalid string → `400`.

## State/UI checks
- Getting Started checklist updates dynamically as Clients/Services/Team/Jobs/Time/Bills are added.
- Light & dark themes, Kanban/List/Calendar views on `/practice/jobs`.

## Realistic data (Type-in)

| Ref | Entity | Key Fields |
|-----|--------|------------|
| `PR-CLI-01` | Practice Client | Code `ZEN-01`, Legal Name `Zenith Precision Exports Pvt Ltd`, PAN `AABCZ9012K`, State `27` (MH), Contact `Vikram Desai`, Email `vikram@zenithexports.in`, Type `RETAINER`, Tier `ENTERPRISE` |
| `PR-SVC-01` | Service | `Monthly GST Return (GSTR-1 & 3B)`, Category `GST`, Frequency `MONTHLY`, Default Fee `₹12,000`, Workflow `Monthly GST` |
| `PR-JOB-01` | Job | Client `ZEN-01`, Service `Monthly GST Return`, Period `Apr 2026`, Due `20/05/2026`, Recurring `true` |
