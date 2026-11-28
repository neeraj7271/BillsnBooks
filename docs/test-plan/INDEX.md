# BillsnBooks — Manual Testing Kit Master Index

Source of truth for full-platform manual testing coverage on branch `ux/refresh-v6`.
Every module below is audited directly against its live frontend pages and backend services/controllers.

## Coverage Matrix

| # | Module | Routes Covered | Status | Test File | Happy | Edge | Negative | Total |
|---|--------|----------------|--------|-----------|-------|------|----------|-------|
| 1 | Auth & Onboarding | `/auth/login`, `/auth/signup`, `/auth/accept-invite`, company switcher | DONE | [auth-onboarding.md](./auth-onboarding.md) | 4 | 1 | 5 | 10 |
| 2 | Masters | `/parties`, `/items`, `/settings/ledgers`, `/settings/numbering`, `/settings/invoice-branding`, `/settings/companies`, `/settings/periods`, `/settings/tally` | DONE | [masters.md](./masters.md) | 4 | 0 | 6 | 10 |
| 3 | Sales & Billing | `/invoices`, `/invoices/new`, `/invoices/[id]`, `/collections/recurring`, `/collections/payment-links`, `/collections/ageing` | DONE | [sales-billing.md](./sales-billing.md) | 8 | 1 | 3 | 12 |
| 4 | Money & Banking | `/vouchers`, `/banking`, `/banking/[id]/reconcile`, `/banking/discovery` | DONE | [money-banking.md](./money-banking.md) | 6 | 2 | 6 | 14 |
| 5 | Imports (Bulk Ingestion) | `/imports`, `/imports/new`, `/imports/[id]/review` | DONE | [imports.md](./imports.md) | 5 | 3 | 4 | 12 |
| 6 | Reports | `/reports`, `/reports/*`, `/reports/shared/[token]` | DONE | [reports.md](./reports.md) | 7 | 2 | 2 | 11 |
| 7 | Practice — Core & Delivery | `/practice`, `/practice/clients*`, `/practice/jobs`, `/practice/reviews`, `/practice/tasks`, `/practice/settings/services`, `/practice/settings/workflows` | DONE | [practice-core.md](./practice-core.md) | 6 | 0 | 5 | 11 |
| 8 | Practice — Commercial & Billing | `/practice/proposals*`, `/practice/engagements/[id]`, `/practice/timesheets`, `/practice/billing`, `/practice/capacity` | DONE | [practice-commercial.md](./practice-commercial.md) | 5 | 2 | 4 | 11 |
| 9 | Practice — Compliance, Team & Settings | `/practice/team`, `/practice/notices`, `/practice/calendar`, `/practice/documents`, `/practice/settings*` | DONE | [practice-compliance-team.md](./practice-compliance-team.md) | 7 | 1 | 2 | 10 |
| — | End-to-End User Journeys | Cross-feature flows (6 journeys) | DONE | [USER-JOURNEYS.md](./USER-JOURNEYS.md) | — | — | — | 6 |

**Totals:** 9 modules + 6 end-to-end journeys, **0 PENDING**, **101** structured test cases + **6** multi-step E2E journeys.

## Realistic Test Data Files (`docs/test-plan/data/`)

Generated with valid Mod-36 GSTIN checksums, statutory GST slabs (`0, 0.1, 0.25, 1.5, 3, 5, 12, 18, 28`), `dd/mm/yyyy` dates, and balanced tax/ledger math:
- [sales-register-50.xlsx](./data/sales-register-50.xlsx) (52 realistic B2B/B2C/IGST/CGST+SGST invoices)
- [purchase-register-50.xlsx](./data/purchase-register-50.xlsx) (50 realistic vendor purchase bills)
- [bank-statement-55.xlsx](./data/bank-statement-55.xlsx) (55 realistic NEFT/RTGS/UPI/ACH credits & debits)
- [parties-master-50.xlsx](./data/parties-master-50.xlsx) (50 realistic customers & vendors with Mod-36 GSTINs)
- [items-master-50.xlsx](./data/items-master-50.xlsx) (50 realistic goods & services with HSN/SAC & GST slabs)
- [sales-validation-states.xlsx](./data/sales-validation-states.xlsx) (labeled test-case file covering `GREEN`, `YELLOW`, all 13 `RED` checks, `BLUE` > ₹5,00,000, `RCM`, and Excel-serial dates)
- [purchase-validation-states.xlsx](./data/purchase-validation-states.xlsx) (labeled test-case file covering `GREEN`, `YELLOW`, `RED`, `BLUE`, and `RCM` for Purchase Register)
- [bank-validation-states.xlsx](./data/bank-validation-states.xlsx) (labeled test-case file covering `GREEN` credit/debit, `RED` missing date/narration/zero amount, `BLUE` > ₹5,00,000)
