# Production Go-Live Verification Checklist

Before opening Antigravity Books to real client accounting data, verify every item below.

---

## 1. Security & Identity Safeguards

- [ ] **Restricted Application Role:** PostgreSQL is accessed via `app_user` (unprivileged role). Superuser `postgres` credentials are removed from application runtime environment variables.
- [ ] **Entropy Audit:** Verified that all secrets in `.env.production` were generated using cryptographic randomness (`openssl rand -base64 48`):
  - `JWT_SECRET` (≥ 48 chars)
  - `JWT_REFRESH_SECRET` (≥ 48 chars)
  - `ENCRYPTION_KEY` (≥ 32 chars)
  - `DATABASE_PASSWORD` (≥ 24 chars)
  - `S3_SECRET_KEY` (≥ 24 chars)
  - `PAYMENT_WEBHOOK_SECRET` (≥ 32 chars)
- [ ] **CORS Lock-down:** `CORS_ORIGINS` is configured exclusively to the production origin (`https://app.yourdomain.com`). No wildcard (`*`) or `localhost` entries exist.
- [ ] **Environment Mode:** `NODE_ENV=production` is confirmed in all application containers (`api`, `web`, `worker`).

---

## 2. Row-Level Security (RLS) Cryptographic Proof

- [ ] **RLS Verification SQL Executed:** The following query run as `app_user` returns distinct tenant counts equal to 1 per session:
  ```sql
  SET app.current_tenant_id = 'c1000000-0000-0000-0000-000000000001';
  SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
  FROM pg_tables 
  WHERE schemaname = 'public' 
    AND rowsecurity = true;
  ```
- [ ] **Cross-Tenant Leak Check:** Zero records returned when querying invoices or vouchers belonging to unselected tenants.

---

## 3. Storage & Disaster Recovery

- [ ] **Hourly Backup Active:** Confirmed `postgres-backup` container is running and has written at least one `.sql.gz` snapshot into `/backups`.
- [ ] **Restore Rehearsal:** Executed a test database restore into a temporary container to verify snapshot integrity.
- [ ] **Object Storage Provisioned:** MinIO bucket `accounting-assets` is created with private bucket policies for statements and public-read for invoice logo assets.

---

## 4. Reverse Proxy & Networking

- [ ] **TLS Certificate Verification:** SSL Labs rating A+ on `https://app.yourdomain.com` and `https://api.yourdomain.com`.
- [ ] **Security Headers Enforced:**
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] **Compression Enabled:** Verified `gzip` and `zstd` compression on assets over 1 KB.

---

## 5. Monitoring & Operational Readiness

- [ ] **Healthcheck Endpoint:** `GET https://api.yourdomain.com/v1/health` returns `HTTP 200` with `{"status": "HEALTHY", "database": "UP"}`.
- [ ] **Prometheus Metrics:** `GET https://api.yourdomain.com/v1/metrics` exposes Prometheus counters and gauges.
- [ ] **Grafana Dashboard Live:** Memory, connection pool stats, and HTTP throughput panels rendering green on `http://<server-ip>:3001`.
- [ ] **Error Tracking:** Sentry DSN verified in both Web and API tiers.
- [ ] **Transactional Outbox Worker:** Confirmed `accounting_worker_prod` container is polling and processing background jobs without unhandled rejections.
