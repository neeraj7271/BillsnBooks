# UI User Journeys & Developer Sandbox Operations

## Overview
This platform employs a strictly UI-first data population strategy. No raw seed scripts (`pnpm seed:*`), raw database insertions, or direct API payload synthesizers are used. Instead, realistic business data is populated through automated Playwright journeys that interact with the application frontend identically to human users (via `page.click`, `page.fill`, file pickers, typeahead searches, multi-tab concurrency, and Maker-Checker approval flows).

## Executing User Journeys

### Running the Entire Journey Suite
To run all Playwright user journeys against a running local environment (`api` on port `4000`, `web` on port `3005`):

```bash
pnpm test:journeys
```
Or directly with Playwright:
```bash
npx playwright test tests/e2e/journeys --reporter=list
```

### Individual Journey Modules
- **Practice Management (`tests/e2e/journeys/practice.spec.ts`)**: Populates 30 Indian firm clients, 200 compliance tasks (GSTR-1, 3B, TDS, Advance Tax), 80 document requests, and statutory calendar items.
- **Masters - Parties & Items (`tests/e2e/journeys/masters.spec.ts`)**: Creates 200 counterparties and 500 items via UI dialogs and bulk CSV import wizards.
- **Invoices, Credit/Debit Notes & Approvals (`tests/e2e/journeys/invoices.spec.ts`)**: Creates 50+ tax invoices and credit notes, triggers Maker-Checker quarantine, and tests partner approvals.
- **Banking & Reconciliation (`tests/e2e/journeys/banking.spec.ts`)**: Creates bank accounts, uploads statement CSVs via file input, and verifies auto-reconciliation.
- **Payment Links (`tests/e2e/journeys/payment-links.spec.ts`)**: Creates UPI/gateway payment links from open invoices and simulates payment callbacks.
- **Recurring Invoices (`tests/e2e/journeys/recurring.spec.ts`)**: Configures recurring subscription schedules through the 2-step setup dialog.
- **Branding & File Uploads (`tests/e2e/journeys/branding.spec.ts`)**: Uploads real logos and signatures, tests replacements, and verifies file-type validations.
- **Notifications (`tests/e2e/journeys/notifications.spec.ts`)**: Validates bell badge counters, category grouping, and mark-as-read interactions.

## Settings Developer Controls

When running in development (`NODE_ENV !== 'production'` or `NEXT_PUBLIC_DEV_TOOLS=true`), the `/settings` page renders the **Developer Operations & Journey Runner** panel.

### Actions Available
1. **Replay demo journeys (`POST /v1/dev/replay-journeys`)**
   - Triggers the execution of automated UI journeys against the local sandbox.
   - Refuses execution if called in production (`NODE_ENV === 'production'`).

2. **Clear my tenant (`POST /v1/dev/clear-tenant`)**
   - Purges all operational rows (invoices, items, vouchers, banking transactions, compliance tasks, payment links, and notifications) for the active tenant.
   - Retains the tenant organization record, company profile, and user credentials so the session remains authenticated.
   - Prompts for confirmation via a themed modal before triggering.

## Safety & Security Invariants
- Dev endpoints (`/v1/dev/*`) are strictly guarded by `process.env.NODE_ENV !== 'production'`. In any production deployment, these endpoints immediately return `403 Forbidden`.
- Client buttons are guarded by `process.env.NEXT_PUBLIC_DEV_TOOLS === 'true'`.
