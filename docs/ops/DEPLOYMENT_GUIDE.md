# Antigravity Books - Production Deployment Guide

**Target Audience:** DevOps Engineers, System Administrators, Cloud Architects  
**Infrastructure Requirements:** Linux Server (Ubuntu 22.04+ LTS), 4 vCPU, 8 GB RAM, 50 GB NVMe Storage  

---

## 1. Domain Registration & DNS Configuration

Before launching the cluster, provision a public domain name and create three DNS `A` records pointing to your server's public IPv4 address:

| Subdomain | Type | Target | Purpose |
|---|---|---|---|
| `app.yourdomain.com` | `A` | `203.0.113.10` | Web Frontend & Dashboard |
| `api.yourdomain.com` | `A` | `203.0.113.10` | REST API Engine & OAuth |
| `storage.yourdomain.com` | `A` | `203.0.113.10` | MinIO Object Storage (Logos, Statements) |

> [!IMPORTANT]
> Ensure port 80 (HTTP) and 443 (HTTPS) are open in your cloud firewall (e.g. AWS Security Group, DigitalOcean Firewall, or Hetzner Firewall). Caddy requires port 80 to solve ACME HTTP-01 challenges for automatic Let's Encrypt SSL.

---

## 2. Server Provisioning & Initial Setup

SSH into your fresh production server:

```bash
ssh root@203.0.113.10
```

Clone the repository into `/opt/antigravity/books`:

```bash
mkdir -p /opt/antigravity
cd /opt/antigravity
git clone https://github.com/your-org/accounting-platform.git books
cd books
```

---

## 3. One-Command Cluster Bootstrap

Run the automated bootstrap script:

```bash
chmod +x scripts/deploy/bootstrap.sh scripts/deploy/rollout.sh
./scripts/deploy/bootstrap.sh
```

### What Bootstrap Does Automatically:
1. Installs Docker CE and Docker Compose v2 if absent.
2. Generates high-entropy production secrets (JWT secrets, DB user passwords, MinIO keys) in `.env.production` with strict `600` permissions.
3. Initializes PostgreSQL 16 with required extensions (`uuid-ossp`, `pgcrypto`) and provisions the restricted non-root `app_user`.
4. Starts Redis with AOF persistence enabled.
5. Runs schema migrations and initializes tenant RLS policies.
6. Builds multi-stage production Docker containers.
7. Launches Caddy 2 with automatic Let's Encrypt TLS generation.

---

## 4. Verification & First-Run Flow

Open your browser and navigate to:
`https://app.yourdomain.com`

```
  ┌────────────────────────────────────────────────────────┐
  │                                                        │
  │   Antigravity Books - Production Setup                 │
  │   ───────────────────────────────────                  │
  │                                                        │
  │   [ Create First Workspace ]                           │
  │   Company Name: Acme Technologies Pvt Ltd              │
  │   GSTIN: 27AABCU9603R1ZM                               │
  │   Admin Email: admin@yourdomain.com                    │
  │   Password: ••••••••••••••••                           │
  │                                                        │
  │   [ Initialize Platform → ]                            │
  │                                                        │
  └────────────────────────────────────────────────────────┘
```

1. Fill out the initial partner registration.
2. The system provisions the first tenant partition with isolated PostgreSQL RLS boundaries.
3. Test creating a sample GST invoice and export a PDF to verify font and currency formatting.

---

## 5. Ongoing Zero-Downtime Updates

To deploy new code commits without interrupting active user sessions:

```bash
# Push to main triggers automated GitHub Actions rollout, or manually:
./scripts/deploy/rollout.sh latest
```

The rollout script performs:
1. Pre-deployment database migrations in an isolated container.
2. Rolling recreation of API nodes.
3. Synthetic health checks against `/v1/health`.
4. Rolling recreation of Web nodes.
5. Automatic rollback if any node fails its healthcheck within 30 seconds.

---

## 6. Disaster Recovery & Backup Restoration

Backups are executed hourly and stored in the Docker `backups` volume.

### To restore the database:
```bash
# List available backups
docker compose -f docker/docker-compose.prod.yml exec postgres-backup ls -lh /backups

# Restore specific snapshot
docker compose -f docker/docker-compose.prod.yml exec -T postgres-backup \
  /bin/sh -c 'gunzip < /backups/accounting_platform_2026-11-26_120000.sql.gz | psql -U postgres accounting_platform'
```
