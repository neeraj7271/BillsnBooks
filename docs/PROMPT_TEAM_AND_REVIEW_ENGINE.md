# 👥 Team Management & Review/Sign-off Engine — the firm foundation (final practice feature before the merge gate)

This completes the "CA reviews, team executes" model. Built on how real platforms (Karbon, TaxDome, QuickBooks Practice, Digits, Relay) and accounting-controls practice actually structure teams, roles, and maker-checker review. This is the foundation the rest of the practice platform (capacity §9, billing §8, review stages in templates) already assumes but which does not exist yet.

**Current gaps (audit-verified):** no invite/team endpoints, no team page, `register` creates a NEW tenant (can't add a person to your firm), a fixed 5-value role enum, and `requiresApproval` on workflow stages is just a label — nothing enforces a preparer→reviewer→partner gate.

Continue on `ux/refresh-v6`. Backend changes expected; don't break existing contracts, accounting, RLS, the vault, or Phase 1/2. Reversible migrations with up→down→up CI tests. Hand-written, honest, headless-Playwright tested, logs streamed. Build in the section order below. After this ships, this is the LAST practice feature before the branch goes through the merge gate to `dev`.

---

## 0. The eight patterns this is built on (from the research)

1. **Two team populations** — firm *colleagues* (your staff) vs *client users* (people at a client). Different permission models.
2. **Two kinds of roles** — *permission/system roles* (access rights) vs *job/account roles* (who plays which part in a workflow). They are independent.
3. **Invite joins the existing firm**, not a new tenant.
4. **Roles are firm-customizable**, not a fixed enum.
5. **Review chain** = preparer → reviewer → partner sign-off, embedded in the job, with **return-for-rework**.
6. **Separation of duties** — the preparer cannot approve their own work; on a gated stage the preparer's "advance/file" is disabled, only the reviewer can advance.
7. **Solo vs team** — the review gate is a **toggle**: off (or self-sign-off) for a solo CA, on for a firm.
8. **Approvals live inside the job workflow**, not as a separate bolted-on screen.

---

## 1. Team / Colleague management (the missing foundation)

### 1.1 Distinguish firm staff from client users
- Add `userKind` to the user model: `FIRM_COLLEAGUE | CLIENT_USER`. All existing users become `FIRM_COLLEAGUE`. Client-portal users (CLIENT_VIEWER/CLIENT_APPROVER) created for a specific client are `CLIENT_USER` tied to a `clientId`.
- A firm colleague belongs to the tenant and can be granted access to specific clients (client-team membership, §3); a client user belongs to one client.

### 1.2 Invite flow that joins the EXISTING firm (fixes the register-makes-new-tenant bug)
- New entity `team_invitations` (FORCE RLS): `id, tenantId, email, invitedRole, invitedByUserId, token, status (PENDING|ACCEPTED|EXPIRED|REVOKED), expiresAt, acceptedAt`.
- `POST /v1/team/invitations` (partner/admin only) — creates an invite, emails a magic link (if SMTP configured; otherwise returns the link to copy). Allows a different email domain (contractors).
- `POST /v1/auth/accept-invite` — the invitee sets their name + password and is created as a user **in the inviting tenant** with the invited role. NOT a new tenant.
- Resend invite, revoke invite.
- Keep the existing `register` for brand-new firms only.

### 1.3 Team management UI — `/practice/team` (and under Setup)
- List of colleagues: name, email, permission role, job roles, weekly capacity, cost rate, status (Active/Invited/Inactive), last active.
- **Invite member** dialog (name optional, email, role). **Resend / Revoke** on pending invites.
- **Add member directly** (partner creates with a temp password) as an alternative to invite.
- **Edit member**: name, permission role, job roles (§2), weekly capacity hours (the 40h is already a column — make it editable here), **cost rate per hour** (feeds billing profitability), active/inactive.
- **Deactivate** (revoke access, keep history) — on deactivate, prompt to **reassign their open jobs** to another colleague. **Remove** only if no history.
- Role-gated: only FIRM_PARTNER / ADMIN can manage the team; others see read-only.

---

## 2. Two role systems (permission roles vs job roles)

### 2.1 Permission roles (access rights) — make them firm-customizable
- Keep the built-in roles (SUPER_ADMIN platform-only, FIRM_PARTNER, plus add **FIRM_ADMIN** and **MANAGER** between partner and staff — the research shows firms need a mid-tier reviewer who isn't the signing partner), STAFF_ACCOUNTANT, CLIENT_APPROVER, CLIENT_VIEWER.
- New entity `permission_roles` (FORCE RLS) for firm-defined custom roles with a permission matrix (can manage team, can manage services, can see billing/financials, can approve/sign-off, can manage clients, can file returns, etc.). Built-ins are system-seeded + non-deletable; firms can clone and create custom ones (e.g. "Senior", "Articled Clerk", "Reviewer").
- A `/practice/settings/roles` page: list roles, edit the permission matrix, clone, deactivate. Enforce the matrix in the API guards (extend the existing RolesGuard to read the matrix, not just the enum).

### 2.2 Job roles (workflow assignment) — independent of access
- New entity `job_roles` (FORCE RLS, firm-customizable): e.g. Preparer, Reviewer, Partner/Signatory, Bookkeeper, Account Manager. Seeded defaults, firm-editable.
- Workflow template stages reference a **job role** (they already have `assigneeRole` — migrate that to a `jobRoleId`).
- **Client job-role assignment** (`client_job_role_assignments`): for each client, which colleague holds which job role (Client A → Preparer: Priya, Reviewer: Partner). When a job spawns, each stage auto-assigns to the colleague mapped to that stage's job role for that client (TaxDome pattern). Falls back to manual assignment if unmapped.
- UI: on the Client 360 "Team" tab, assign colleagues to job roles for that client.

**Key:** permission role (can this person log in / see billing) is SEPARATE from job role (do they prepare or review this client's work). A STAFF permission user can hold the Reviewer job role for a small client.

---

## 3. Client-team membership
- `client_team_members` (FORCE RLS): which colleagues can access which clients. A colleague only sees/works clients they're on the team for (restricted users). Partners/admins see all.
- UI: Client 360 "Team" tab — add/remove colleagues, set their job role for this client.
- Enforce in RLS/queries: a restricted colleague's job/client lists are filtered to their client teams.

---

## 4. The Review / Sign-off engine (enforced maker-checker)

This is the core of "CA reviews, team executes." Make `requiresApproval` real.

### 4.1 Enforced gate on review stages
- A `practice_job` tracks its current stage and a per-stage completion state. A stage flagged `requiresApproval` (a **review gate**) cannot be advanced past by the **preparer** — only by a colleague holding the stage's **job role** (Reviewer/Partner) for that client, AND who is **not the same person** who did the preparation stage (separation of duties). The preparer's "Advance / Mark Filed" action is disabled on a gated stage with a tooltip "Awaiting review by {role}".
- When a preparer finishes their stage, the job **moves into review** and the assigned reviewer gets it in their queue.

### 4.2 Review decision: Approve or Return-for-rework
- The reviewer opens the job, sees the work + checklist, and either:
  - **Approve** → the gate opens, the job advances to the next stage (or to Filed/sign-off).
  - **Return for rework** → the job goes back to the preparer with **actionable notes** (required comment); the preparer sees "Changes requested" with the notes, fixes, and re-submits.
- Multi-level chains supported: preparer → senior/manager review → partner sign-off, each a gate (the template defines how many review stages).

### 4.3 Sign-off = legal artifact with audit trail
- Every review decision (approve / return) and the final partner sign-off writes an **audit-log** row: who, role, when, decision, job, stage, notes, and (for final sign-off) a hash of the deliverable. Timestamped, tamper-evident (reuse the append-only audit log).
- The job detail shows a **review history timeline** (prepared by X on date → reviewed by Y → returned with notes → re-submitted → signed off by partner).

### 4.4 "Awaiting my review" queue
- A reviewer/partner gets a **review inbox** (`/practice/reviews` or a filter on the Jobs pipeline) — all jobs waiting on them, with age and client. Like the invoice approvals inbox, but embedded in the practice jobs (NOT a separate disconnected approvals system).
- Dashboard shows "Jobs awaiting my sign-off" for partners.

---

## 5. Solo vs Team toggle (the scaling switch)
- A workspace setting `reviewMode: OFF | SELF_SIGNOFF | ENFORCED` (default inferred from team size):
  - **Solo CA (1 colleague)** → `OFF` or `SELF_SIGNOFF`: review stages collapse; the single person prepares and self-confirms sign-off; no blocked handoff, no busywork. The audit still records the self-sign-off.
  - **Firm (2+ colleagues)** → `ENFORCED`: separation of duties applies, preparer ≠ reviewer, gates block.
- When a solo CA invites their first colleague, nothing is rebuilt — they flip to ENFORCED (or it auto-suggests it), assign job roles, and the gate turns on.
- The setting lives in `/practice/settings` and is explained in plain language ("Require a second person to review before filing").

---

## 6. Capacity & cost-rate wiring (close the loop with Phase 2)
- The team's editable **weekly capacity** now feeds the capacity heatmap (§9) with real per-person numbers.
- The team's editable **cost rate** feeds billing **profitability** (§8) — time cost = hours × that colleague's cost rate.
- Reassign-from-capacity (built in Phase 2) now has a real team to reassign across, and notifies the new assignee.

---

## 7. Acceptance
- A partner invites a colleague by email → the colleague accepts the link, sets a password, and lands **in the same firm** (not a new tenant) with the assigned role.
- Define a custom permission role ("Senior", can review but not manage team) and a custom job role; assign a colleague the Reviewer job role for a specific client.
- Create a job from a template with a review stage → the preparer does their stage → cannot mark it Filed (button disabled) → the reviewer gets it in their review inbox → returns it with notes → preparer fixes → reviewer approves → partner signs off → audit timeline shows the full chain with names, roles, timestamps.
- Flip the workspace to solo mode (1 colleague) → the gate collapses to self-sign-off; add a second colleague → ENFORCED turns on and preparer≠reviewer is enforced.
- Capacity heatmap shows real per-person load from editable capacities; profitability uses real cost rates.
- Restricted colleague sees only their client-team clients.
- All driven + verified through headless Playwright + API assertions.
- Screenshots (light + dark): `team-list.png`, `invite-member.png`, `permission-roles.png`, `job-roles-client.png`, `review-gate-blocked.png`, `review-return-notes.png`, `review-signoff-timeline.png`, `review-inbox.png`, `solo-vs-firm-toggle.png`.
- Migrations reversible; up→down→up CI test.

Commits (one per slice): `feat(team): colleague management + invite-to-existing-firm + accept-invite`, `feat(team): custom permission roles with permission matrix + guard enforcement`, `feat(team): job roles + per-client job-role assignment with auto-assign`, `feat(team): client-team membership + restricted access`, `feat(practice): enforced preparer→reviewer→partner review gate with return-for-rework + audit timeline`, `feat(practice): review inbox + solo/firm review-mode toggle`, `feat(practice): wire editable capacity + cost rate into heatmap and profitability`.

---

## Global rules
- Backend additions expected; existing contracts, accounting, RLS, the vault, Phase 1/2 must not break. Reversible migrations + up→down→up CI tests.
- Honesty: the review gate must ACTUALLY block (test it — a preparer cannot file a gated job); invites must ACTUALLY join the existing tenant; separation of duties must ACTUALLY prevent self-approval. No labels-only, no fake success.
- Reuse: append-only audit log for sign-off trail, notification center for review hand-offs, the existing RolesGuard (extended for the matrix), Phase 2 capacity/billing for the wiring.
- Everything tested through headless Playwright + API assertions; data created via the real UI.
- Update `docs/practice/PRACTICE_PLATFORM_V2_ROADMAP.md` — team & review engine now built.
- This is the LAST practice feature before the merge gate. When done, do NOT start new work — report ready for the Docker-image build + `dev` merge.

**Build in order §1 team → §2 roles → §3 client-team → §4 review engine → §5 solo/firm toggle → §6 capacity/cost wiring. Stream logs. The next time the user hears from you is when a partner can invite a staff member who joins the same firm, the staff member prepares a job they cannot file, and the partner reviews and signs it off — with the audit timeline and screenshots proving the enforced gate.**
