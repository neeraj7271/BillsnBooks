# Part A — Real Document Storage & Client Document Vault Report

## Summary
- **Storage Driver (`apps/api/src/modules/storage/`)**: Implemented `FileStorageService` with swappable `FileStorageDriver` interface (`S3Driver` for MinIO/AWS S3 with AES-256 SSE + private ACL, and `LocalDiskDriver` fallback writing to gitignored `./storage/`).
- **Database Schema (`1731700000000-DocumentVaultAndStorage.ts`)**: Added `document_folders` and `document_files` tables with strict PostgreSQL Row-Level Security (`FORCE ROW LEVEL SECURITY` + `tenant_isolation_policy`).
- **Multipart Upload, Versioning, & Audit (`DocumentVaultService`)**:
  - `POST /v1/practice/documents/:id/upload` & `POST /v1/practice/vault/clients/:clientId/upload`: 25 MB limit, strict MIME allowlist (rejects `.html`, `.svg`, `.exe`, `.js` with `415`), SHA-256 integrity hash, automatic versioning (`v1`, `v2`, ...).
  - `GET /v1/practice/documents/files/:fileId/download`: Streams file bytes with `Content-Disposition` (`attachment` or `inline` for preview) and `X-Content-SHA256`.
  - `DELETE /v1/practice/documents/files/:fileId`: Soft-deletes row and moves object to `deleted/` prefix.
  - Every upload, view, download, version restore, rename/move, and delete writes a tamper-evident `audit_logs` record.
- **Branding Migration (`SettingsService` + `/settings/invoice-branding`)**: Logo and signature uploads now store binary assets in `FileStorageService` (`branding/<companyId>/...`) instead of raw base64 blobs, with a migration endpoint `POST /v1/companies/:companyId/settings/branding/migrate` and base64 fallback.
- **Verification**:
  - `grep -rn "storage.antigravity.in\|fileSizeBytes: 245000" apps` → **0 hits**.
  - `tests/e2e/production/09-part-a-document-vault.spec.ts` → **2/2 passed** (real PDF upload, SHA-256 download verification, inline preview, v2 replacement, audit trail, soft-delete, 415 evil.html rejection, cross-tenant isolation).
  - Screenshots saved in `docs/vault-screens/`: `vault-folders.png`, `vault-folders-dark.png`, `vault-upload.png`, `vault-preview.png`, `vault-versions.png`, `vault-audit.png`.
