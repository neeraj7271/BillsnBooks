# 🏗️ Three Workstreams — Real Document Vault · Modern Practice Module · Professional Report PDFs

Three independent but related upgrades, all on branch `ux/refresh-v6`. Each is a real feature build, not a polish pass. Hand-written, honest, tested with headless Playwright, logs streamed to one terminal. Honesty rules at the end are absolute.

---

# PART A — Real document storage and a client document vault

## A0. The problem (audit-verified — read before building)

There is currently NO document storage. The upload flow is a stub:
- `apps/web/src/app/practice/documents/upload-client-doc-dialog.tsx` sends a **hardcoded** `fileSizeBytes: 245000` and a **fabricated** `fileUrl: https://storage.antigravity.in/vault/clients/${clientId}/${fileName}` — a domain that does not exist. No file bytes are read or sent.
- `apps/api/.../practice.controller.ts` receives `{ fileName, fileSizeBytes, fileUrl }` as a JSON body and stores the string in `client_document_requests.file_url`. There is no `@UploadedFile`, no multer, no object storage, no disk write.
- Result: nothing is stored, there is no vault, and nothing can be viewed. This must become real.

## A1. Storage backend — swappable driver, S3/MinIO default

Build a `FileStorageService` in `apps/api/src/modules/storage/` with a driver interface:
```ts
interface FileStorageDriver {
  put(key: string, body: Buffer, contentType: string, meta?: Record<string,string>): Promise<{key, size, etag}>;
  get(key: string): Promise<{body: Buffer, contentType: string}>;
  getSignedUrl(key: string, expiresInSec: number): Promise<string>;  // for direct browser download
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
```
- **S3Driver** (default in prod) using the AWS SDK v3, pointed at MinIO locally via `S3_ENDPOINT` / `S3_BUCKET` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` / `S3_REGION`. Bucket `documents`, server-side encryption on, private ACL.
- **LocalDiskDriver** (dev fallback) writing under a gitignored `./storage/` when no S3 config is present — so a dev without MinIO still works.
- The driver is chosen at boot from env; log which driver is active.

## A2. Upload endpoint — receive real bytes

- `POST /v1/practice/documents/:id/upload` becomes a `multipart/form-data` endpoint using `FileInterceptor` (multer, memory storage, 25 MB cap). It:
  - Validates MIME type against an allowlist (pdf, jpg, png, xlsx, docx, csv, zip). Rejects executables, html, svg with a 415.
  - Computes a SHA-256 of the bytes (dedupe + integrity).
  - Stores under a tenant-scoped key: `tenant/<tenantId>/clients/<clientId>/docreq/<requestId>/<uuid>-<safeFileName>`.
  - Writes a `document_files` row (new entity) with: tenantId, clientId, requestId (nullable — vault files aren't always tied to a request), storageKey, fileName, mimeType, sizeBytes, sha256, uploadedByUserId, version, createdAt. Tenant RLS applies.
  - Supports **versioning**: re-uploading to the same request creates version N+1, keeps the prior versions.
- `GET /v1/practice/documents/:id/download` streams the file (or returns a short-lived signed URL for S3) with the correct `Content-Disposition` and content type. Access is RLS/role-checked — a client-portal user can only fetch their own client's files.
- `DELETE /v1/practice/documents/files/:fileId` soft-deletes (keeps the row + audit, removes from active listing) and the object is moved to a `deleted/` prefix (not hard-destroyed, for compliance).
- Every upload / download / delete writes an **audit-log** row (who, what, when, from where) — documents are compliance material.

## A3. The Vault UI — a real document hub (not just a request list)

New route `/practice/clients/[id]/vault` AND a global `/practice/documents` that spans all clients. The vault UI:
- **Folder tree** per client with default folders created on client creation (templates): `GST`, `Income Tax`, `TDS`, `ROC / MCA`, `Audit`, `Bank Statements`, `Agreements`, `Correspondence`, `Misc`. Firm can add/rename folders.
- **File list** per folder: name, type icon, size (formatted), version chip, uploaded-by, date, status. Row actions: Preview, Download, Replace (new version), Move, Rename, Delete (confirm), View history.
- **Drag-and-drop upload** zone + a file-picker button. Multiple files at once. Progress bars. Real upload through A2.
- **Inline preview**: PDF and images render in a side drawer (PDF via an embedded viewer, images inline). Other types show a "Download to view" card.
- **Version history** per file: list of versions with uploaded-by + date, download any version, restore a prior version as the new current.
- **Full-text search** across file names and (stretch) OCR'd text. Start with filename + metadata search; note OCR as a phase-2 item.
- **Document request flow** (upgrade the existing one): firm creates a request ("Upload your Q3 bank statement"), the client-portal user sees it, uploads the real file, firm reviews → Approve / Reject with a note; on approve the file lands in the right folder automatically.
- **Audit trail** panel per file: every view/download/version/delete with user + timestamp.

## A4. Branding storage migration (same driver)

The invoice logo/signature currently live as base64 in `setting_values` (a prior P1 finding). Move them to the same `FileStorageService` (bucket `branding`), storing the storage key in settings instead of the base64 blob. One-time migration script uploads existing base64 blobs to storage and rewrites the setting rows. Fallback to base64 if storage is unavailable.

## A5. Acceptance (Part A)
- Upload a real PDF through the vault UI → it is stored in MinIO (verify via `mc ls`), a `document_files` row exists with the real size + sha256, and the fabricated `storage.antigravity.in` URL appears NOWHERE.
- Download it back → bytes match the sha256.
- Replace it → version 2 created, version 1 still downloadable.
- Delete it → removed from the active list, object moved to `deleted/`, audit row written.
- A client-portal user can see only their client's files; cross-client/cross-tenant fetch → 403/404.
- Upload `evil.html` and a 100 MB file → both rejected with a visible error.
- Grep: `grep -rn "storage.antigravity.in\|fileSizeBytes: 245000" apps` returns 0 hits.
- Screenshots: `vault-folders.png`, `vault-upload.png`, `vault-preview.png`, `vault-versions.png`, `vault-audit.png` (light + dark).

Commits: `feat(storage): FileStorageService with S3/MinIO + local driver`, `feat(docs): real multipart upload/download/versioning endpoints with audit`, `feat(practice): client document vault UI with folders, preview, versions, drag-drop`, `feat(branding): migrate logo/signature from base64 to object storage`.

---

# PART B — Modernize the Practice module into a real practice-management platform

## B0. Current state (audit-verified)

The module today is: clients, tasks (status + comments), a fake document request, and an auto-generated compliance calendar. That is minor task management. Benchmarks (Karbon, TaxDome, SmartVault, Onvio, and India-focused Vyapar TaxOne / Turia) show the expected feature set is far larger. Build toward it in phases; do NOT try to ship all of it at once — but lay the data model and the first, highest-value slices now.

## B1. Jobs & workflow pipeline (the core upgrade)

Replace the flat task list with a **Jobs** concept:
- A **Job** is a unit of client work (e.g., "GSTR-3B — Acme — Nov 2026", "FY25-26 Tax Audit — Bharti Motors"). A job has: client, type, assigned staff, due date, status/stage, checklist of sub-tasks, attached documents (from the vault), time entries, and a comment thread.
- **Workflow templates**: a library of reusable job templates with ordered stages and a checklist per stage. Seed real Indian ones: Monthly GST (GSTR-1 → GSTR-2B recon → GSTR-3B → payment → file), Quarterly TDS (collect → compute → challan → return → certificates), Annual ITR (data collection → books finalization → computation → review → file), Tax Audit (planning → fieldwork → draft → partner review → sign-off → file), ROC Annual (AOC-4, MGT-7).
- **Kanban board** view: columns are the pipeline stages (Backlog / In Progress / Review / Awaiting Client / Filed / Done). Drag a job between stages. Moving to a stage can auto-trigger the next checklist and (phase 2) automations.
- **List + calendar views** of the same jobs, toggle between them.
- **Recurring jobs**: a monthly-GST template auto-spawns next month's job when this month's is filed (or on a schedule). This is where the existing statutory-task auto-generation becomes real recurring workflow.

## B2. Client 360 / CRM

Upgrade the client record into a Client 360 page:
- Header: legal name, PAN, GSTINs, entity type, status, assigned partner + team.
- Tabs: Overview (open jobs, upcoming due dates, recent documents), Jobs, Documents (the vault from Part A), Compliance (their GST/TDS/ROC/IT calendar), Time & Billing, Contacts, Notes & Activity (a timeline of everything — emails, uploads, status changes), Settings.
- Multiple contacts per client with roles (Director, Authorised Signatory, Accountant).

## B3. Time tracking & billing (phase-in)

- **Time entries** on jobs: one-click start/stop timer or manual entry, assigned to staff + job + client. Billable/non-billable flag.
- **Timesheet** view per staff per week.
- **Billing**: turn unbilled time + fixed fees into an invoice for the client (reuse the existing invoicing engine — a practice invoice is still a GST invoice). Draft → send → track payment.
- **Profitability**: per client and per job, time cost vs billed.

## B4. Staff & capacity

- **Staff workload** view: each team member's open jobs, hours assigned vs capacity, overdue count. A simple capacity heatmap so the partner sees who's overloaded.
- **Assignment**: assign/reassign jobs and sub-tasks; the assignee gets a notification.
- Role-based: STAFF sees their jobs; FIRM_PARTNER sees the whole firm.

## B5. Client portal (ties Parts A + B together)

A dedicated, branded client-facing surface (can be the same app with a CLIENT_VIEWER role and a restricted layout):
- Client logs in, sees: documents the firm requested (with upload), their document vault (download their filed returns), their open items ("We need your bank statement"), their invoices from the firm (pay), and a message thread.
- Real-time status: the client sees which stage their work is at ("Your GSTR-3B is in Review").
- E-signature (phase 2): engagement letters / forms signed in the portal with an audit trail.

## B6. Firm dashboard & analytics

A practice dashboard (distinct from the accounting dashboard): jobs by stage, overdue jobs, due-this-week, capacity per staff, revenue/WIP, compliance health per client (who's at risk of a missed deadline). This is the "who's doing what" view every benchmark leads with.

## B7. Phasing (be honest about scope)

- **Phase 1 (build now):** Jobs + workflow templates + Kanban board + recurring jobs; Client 360 page; the document vault (Part A); staff workload view; practice dashboard. These transform the module from task-list to platform.
- **Phase 2 (design the data model now, implement next):** time tracking + billing + profitability; client portal messaging + e-signature; OCR on documents; email integration.
- Write `docs/practice/PRACTICE_ROADMAP.md` documenting both phases, the data model, and what's built vs planned. Do not fake phase-2 features — stub the UI with a clear "Coming soon" only where the roadmap says so, never a fake-working control.

## B8. Acceptance (Part B, Phase 1)
- Create a job from the "Monthly GST" template → it has the right stages + checklist; drag it across the Kanban; file it → next month's job auto-spawns.
- Open a Client 360 page → tabs populated with that client's real jobs, documents, calendar.
- Staff workload view shows real assignment counts.
- Practice dashboard shows jobs-by-stage and overdue counts from real data.
- All driven and verified through headless Playwright with the real UI (data created via the UI, consistent with the user-journeys approach).
- Screenshots: `practice-kanban.png`, `practice-client360.png`, `practice-workload.png`, `practice-dashboard.png`, `practice-job-detail.png` (light + dark).

Commits (one per slice): `feat(practice): jobs + workflow templates + Kanban pipeline`, `feat(practice): recurring job auto-spawn from templates`, `feat(practice): Client 360 page with tabs`, `feat(practice): staff workload + assignment`, `feat(practice): firm practice dashboard`.

---

# PART C — Professional, print-perfect report PDFs

## C0. The problem (audit-verified)

- Financial statements (trial-balance, balance-sheet, p&l, customer-sales) use `window.print()` — they just print the live web page, so the PDF is whatever the screen looks like.
- Other reports download an HTML file from `generateBrandedReportHtml` that contains a `🖨️ Print / Save as PDF` toolbar button the user must click — it's an HTML file, not a PDF.
- There is no real server-side PDF rendering anywhere. The output is inconsistent and unprofessional.

## C1. Server-side PDF rendering — one consistent, branded pipeline

- Add a `PdfRenderService` in the API using **Puppeteer** (headless Chromium) — or `playwright-core`'s chromium, whichever installs cleanly in the Docker image. It renders a purpose-built print HTML template to a real PDF buffer.
- `GET /v1/companies/:companyId/reports/:reportKey/export?format=pdf&from=&to=` returns a real `application/pdf` (not HTML). Every report (all 28) flows through this one pipeline.
- The frontend "Print / PDF" button downloads the PDF from this endpoint for EVERY report — remove `window.print()` as the export path (keep it only as an optional "quick print" if desired, clearly separate).

## C2. The report PDF design (make it look like a CA firm's deliverable)

A shared print template with:
- **Letterhead**: firm/company logo (from the new storage), legal name, full address, GSTIN, PAN, email/phone. Right-aligned report meta: report title, period, generated-on timestamp, page X of Y.
- **Typography**: a clean serif or grotesk for headings, tabular-figure font for all numbers. Consistent sizes.
- **Tables**: zebra rows, bold group subtotals, a bold grand-total row with a double top-border (accounting convention), right-aligned amounts in Indian format (₹ 1,23,45,678.90), negative in parentheses.
- **Financial statements** specifically:
  - Trial Balance: Particulars | Debit | Credit, grouped, with a balanced total row.
  - P&L: proper vertical format (Income less Expenses = Net Profit), schedule references, prior-period column if compare mode is on.
  - Balance Sheet: Liabilities & Equity / Assets (or vertical Schedule III format for Indian companies), with Notes references, "as at" date, A == L+E proven.
- **Footer**: "This is a computer-generated statement", page numbers, firm name, a thin rule.
- **Multi-page**: table headers repeat on every page (`thead { display: table-header-group }`), rows never split (`tr { break-inside: avoid }`), group blocks avoid breaking where possible.
- **A4 portrait**, 15 mm margins, `@page` sized, `print-color-adjust: exact` so brand colors render.
- **Watermark** option (e.g. "DRAFT" / "UNAUDITED") toggled per export.

## C3. Excel exports stay, but align the branding

The existing ExcelJS exports are decent — keep them, but make the letterhead, fonts, number formats and totals styling match the new PDF design so xlsx and pdf of the same report look like siblings.

## C4. Acceptance (Part C)
- Export each of the 28 reports as PDF → each is a real multi-page A4 PDF (verify MIME + page count), with the firm letterhead, real company legal name and real PAN (no placeholder, no ciphertext), Indian number formatting, repeating table headers, and a clean grand-total row.
- Trial Balance PDF: debit total == credit total, shown balanced.
- Balance Sheet PDF: A == L+E, "as at" date correct, equity populated.
- P&L PDF: Net Profit matches the equity delta.
- Open 5 sample PDFs and eyeball them against a real CA firm's output — they must look like a professional deliverable, not a printed web page.
- Grep: no report's "Print / PDF" button calls `window.print()` as its export path.
- Screenshots + the actual PDFs saved to `docs/report-pdfs/` (trial-balance, p&l, balance-sheet, gstr-summary, customer-sales, ageing — at minimum).

Commits: `feat(reports): server-side Puppeteer PDF pipeline for all 28 reports`, `feat(reports): branded A4 print template — letterhead, Schedule III formats, repeating headers`, `fix(reports): route every Print/PDF button to the real PDF endpoint, drop window.print export`, `style(reports): align Excel branding with the new PDF design`.

---

# Global rules (all three parts)

- **Backend additions are allowed here** (unlike the testing campaign) because these are real features — but do not break any existing API contract, test, or the accounting/RLS code. Add new endpoints and entities; migrate carefully with reversible migrations.
- **Design freeze still applies to screens that already work** — only the practice module and report PDFs are being redesigned; don't restyle unrelated pages.
- **Honesty:** no fake storage, no hardcoded URLs, no stubbed "success" for a feature that doesn't work, no downsizing. If a phase-2 feature isn't built, it's labeled "Coming soon" per the roadmap — never a dead control dressed as working.
- **Everything tested** through headless Playwright + API assertions. Real files really stored, really downloaded, really versioned. Real PDFs really rendered.
- **Reports:** `docs/DOCS_VAULT_REPORT.md`, `docs/practice/PRACTICE_ROADMAP.md`, and a PDF-samples folder, plus per-part screenshots.
- **Do not merge to dev** until the user has reviewed the vault, the new practice module, and the sample PDFs.

**Suggested order: Part A (storage is the foundation the vault and branding need) → Part C (PDFs, self-contained, high visible value) → Part B (the big practice build, which uses the vault from A). Stream logs. Build real things.**
