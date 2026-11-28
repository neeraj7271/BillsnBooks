# Practice — Compliance, Team & Settings (routes: `/practice/team`, `/practice/notices`, `/practice/calendar`, `/practice/documents`, `/practice/settings*`)

## Purpose
Manages CA firm colleagues & RBAC permission/job roles, statutory tax notices (`GST`, `INCOME_TAX`, `TDS`, `ROC`), monthly compliance calendar, client document requests & vault intake, review gate settings, reminder rules with WhatsApp/in-app alerts, engagement templates, and custom fields/labels.

## User journey
1. Invite a colleague in `/practice/team` (`STAFF_ACCOUNTANT`, `MANAGER`, `FIRM_ADMIN`, `FIRM_PARTNER`) and configure Permission Roles & Job Roles in `/practice/settings/roles`.
2. Track statutory due dates in `/practice/calendar` (Month grid & Timeline views) and log/resolve department notices in `/practice/notices`.
3. Send a document request in `/practice/documents`, upload the client file (`<= 25 MB`), and **Accept** or **Reject** it (accepted files auto-place into the client's Vault folder).
4. Configure Review Mode (`ENFORCED`, `SELF_SIGNOFF`, `OFF`) in `/practice/settings`, Reminder Rules in `/practice/settings/templates`, Engagement Templates in `/practice/settings/engagement-templates`, and Custom Fields/Labels in `/practice/settings/custom-fields`.

## Validations & rules (from code)
- **Team & Invitations** (`apps/api/src/modules/team/team.service.ts:107-370`):
  - Only `FIRM_PARTNER`, `FIRM_ADMIN`, `SUPER_ADMIN` can manage team (`403`: `'Only Firm Partners or Admins can manage team members.'`).
  - Invite token = 48-char hex, 7-day expiry; duplicate email → `409 Conflict`: `'A user with email <email> already exists.'`.
  - Deactivating a colleague optionally bulk-reassigns open `practice_jobs` (`361-367`).
- **Permission & Job Roles** (`team.service.ts:24-98, 374-447`):
  - Seeds 4 system roles (`FIRM_PARTNER`, `FIRM_ADMIN`, `MANAGER`, `STAFF_ACCOUNTANT`) and 5 job roles (`PREPARER`, `REVIEWER`, `PARTNER_SIGNATORY`, `BOOKKEEPER`, `ACCOUNT_MANAGER`). System roles cannot be deactivated (`419`).
- **Notices** (`practice-operations.service.ts:132-222`):
  - Requires `clientId`, `noticeType`, `noticeNo` (`400`: `'clientId, noticeType, and noticeNo are required.'`).
  - `isOverdue = status !== 'CLOSED' && status !== 'RESPONDED' && responseDueDate < today`; `CLOSED`/`RESPONDED` sets `resolvedAt`.
- **Documents Portal** (`practice.service.ts:367-538`, `document-vault.service.ts:348-453`):
  - States: `REQUESTED` → `UPLOADED` → `ACCEPTED` | `REJECTED`.
  - Upload limit `25 MB`; `REJECTED` defaults reason to `'Document illegible or incomplete'`; `ACCEPTED` auto-places file into mapped Vault folder (`Bank Statements`, `GST`, `TDS`, `Audit`, or `Misc`).
- **Review Gate Settings** (`practice-review.service.ts:30-61`):
  - Modes `ENFORCED | SELF_SIGNOFF | OFF`; restricted to `FIRM_PARTNER | FIRM_ADMIN | SUPER_ADMIN`.
- **Reminder Rules & Templates** (`practice-operations.service.ts:226-377`):
  - Auto-seeds 2 templates (`DUE_DATE` `EMAIL`, `NOTICE_RESPONSE` `WHATSAPP`).
  - `runNotificationRules` creates `NotificationOrmEntity` alerts and up to 10 `https://wa.me/...` links for open jobs/notices within `daysBefore`.
- **Custom Fields & Labels** (`practice-v2.service.ts:1384-1489`):
  - Field types: `text | number | date | dropdown | checkbox`; scopes: `CLIENT | JOB` (Labels also support `ALL`).

## Test cases

| # | Case | Type | Data to use | Steps | Expected result (cite code) |
|---|------|------|-------------|-------|-----------------------------|
| 1 | Invite colleague & verify 7-day token + role assignment | Happy | `siddharth@mehtaassociates.in` (`STAFF_ACCOUNTANT`) | `/practice/team` → **Invite Member** → copy `/auth/accept-invite?token=...` | `PENDING` invite with 48-char hex token created; colleague joins on accept (`team.service.ts:221-254`). |
| 2 | Deactivate colleague with open-job reassignment | Happy | Colleague with 1 open job | `/practice/team` → deactivate → select target colleague | `isActive = false` and open jobs reassigned (`team.service.ts:361-367`). |
| 3 | Log statutory notice & mark `RESPONDED` | Happy | `PR-NOT-01` (`GST`, `DRC-01A/2026/009`) | `/practice/notices` → **Add Notice** → update status to `RESPONDED` | Notice created `NEW`, then `RESPONDED` with `resolvedAt` set (`practice-operations.service.ts:176-215`). |
| 4 | Compliance Calendar Month vs Timeline views | Happy | Tasks for current month (`GSTR-1`, `GSTR-3B`) | `/practice/calendar` → switch Month / Timeline | Counts (`totalTasks`, `pendingCount`, `filedCount`, `overdueCount`) match (`practice.service.ts:544-601`). |
| 5 | Document Request → Upload → Accept into Vault | Happy | `Sales Register` request for `ZEN-01` + PDF `< 25 MB` | `/practice/documents` → **Request** → **Upload** → **Accept** | Transitions `REQUESTED` → `UPLOADED` → `ACCEPTED`; file placed in `GST` folder (`document-vault.service.ts:348-453`). |
| 6 | Reject uploaded document & re-upload | Edge | Same request → **Reject** → re-upload PDF | **Reject** → re-upload | Sets `REJECTED` (`'Document illegible or incomplete'`); re-upload increments `version` & clears `rejectionReason`. |
| 7 | Run Reminder Rules & inspect generated WhatsApp links | Happy | Active `DUE_DATE` rule (`daysBefore: 30`) | `/practice/settings/templates` → **Run Rules Now** | Creates in-app notifications and returns `https://wa.me/...` links (`practice-operations.service.ts:289-376`). |
| 8 | Create Custom Field (`dropdown`) & Label | Happy | `GST Filing Frequency` (`dropdown`, `CLIENT`), Label `VIP` (`brand`) | `/practice/settings/custom-fields` → create field & label | `fieldKey` auto-slugged; available on Client/Job (`practice-v2.service.ts:1408-1489`). |
| 9 | Duplicate team invite / non-admin team access | Negative | Invite existing email; `STAFF_ACCOUNTANT` opens `/practice/team` | Invite existing email / call `POST /team/invite` as staff | `409 Conflict` duplicate email; `403 Forbidden` for non-partner/admin (`team.service.ts:108,218`). |
| 10 | Missing required fields on Notice / Role / Custom Field | Negative | Blank `noticeNo`; blank role name; blank field label | Submit empty form | `400 BadRequestException` with exact field error (`practice-operations.service.ts:176`, `team.service.ts:386`, `practice-v2.service.ts:1407`). |

## Edge & boundary cases
- **System permission role protection:** Toggling `isActive` on `FIRM_PARTNER` / `STAFF_ACCOUNTANT` is blocked (`team.service.ts:419`).
- **Legacy `uploadClientDocument` defect:** `practice.service.ts:471` references undefined `status` in legacy method; UI routes through `vaultService.uploadToRequest`.

## Negative / error cases
- Non-partner/admin attempting to change `reviewMode` in `/practice/settings` → `403`: `'Only Firm Partners or Admins can change review settings.'`.
- Uploading `> 25 MB` document in `/practice/documents` → `'File exceeds 25 MB limit'`.

## State/UI checks
- Empty states, loading states, light/dark themes, and settings sub-page links from `/practice/settings`.

## Realistic data (Type-in)

| Ref | Entity | Key Fields |
|-----|--------|------------|
| `PR-TEAM-01` | Invite | Email `siddharth@mehtaassociates.in`, Role `STAFF_ACCOUNTANT`, Capacity `40` hrs/wk, Cost Rate `₹500/hr` |
| `PR-NOT-01` | Notice | Client `ZEN-01`, Authority `GST`, Type `ASMT-10 Scrutiny`, Notice No `DRC-01A/2026/009`, Due `25/05/2026` |
| `PR-DOC-01` | Doc Request | Client `ZEN-01`, Title `April 2026 Sales Register`, Type `SALES_REGISTER`, Due `08/05/2026` |
