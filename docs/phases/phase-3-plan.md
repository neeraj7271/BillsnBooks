# Phase 3 Implementation Plan: Native Cloud Bookkeeping & Financial Reporting Engine

**Phase:** 3 — Native Cloud Bookkeeping, General Ledger & Financial Reporting  
**Author:** Principal Software Architect & Senior Full-Stack Engineer  
**Status:** Implemented & Verified in Codebase  
**Date:** October 2026  

---

## 1. Executive Summary & Commercial Objective

Phase 3 establishes the **Native Cloud Bookkeeping Engine**, eliminating reliance on external legacy desktop accounting software while maintaining dual-mode parity. It provides a real double-entry general ledger, canonical journal posting engine with strict mathematical balance invariants ($\sum \text{Debits} = \sum \text{Credits}$), period locks, and real-time generation of standard statutory financial statements: **Trial Balance, Profit & Loss Statement (P&L), and Balance Sheet**.

The module caters to growing SMEs, startups, and CA firms seeking a fast, multi-tenant cloud general ledger with audit-grade immutability and instant financial visibility.

---

## 2. Core Functional Pillars

```
[ Voucher Posting Engine ] ──► [ Double-Entry Invariant Guard (Debits = Credits) ]
                                             │
[ Financial Period Locks ] ◄── [ General Ledger & Sub-Ledger Posting ]
            │
            ▼
[ Real-Time Trial Balance ] ──► [ Profit & Loss (P&L) ] ──► [ Balance Sheet ]
```

1. **Double-Entry Journal & Voucher Engine:**
   - Supports 6 primary Indian voucher types: `SALES`, `PURCHASE`, `PAYMENT`, `RECEIPT`, `CONTRA`, and `JOURNAL`.
   - Domain-level and database-level enforcement of debit-credit equality:
     $$\sum_{i=1}^n \text{debit}_i - \sum_{j=1}^m \text{credit}_j = 0$$
   - Optimistic concurrency control via entity version columns to prevent race conditions during concurrent postings.
   - Immutable posted vouchers: direct updates to posted vouchers are rejected; corrections require formal Contra or Reversal vouchers.

2. **Hierarchical Chart of Accounts & General Ledger:**
   - 4 Top-level accounting groups: `ASSETS`, `LIABILITIES`, `EQUITY`, `REVENUE`, and `EXPENSES`.
   - Ledger balance computation with running balances, opening balances, and debit/credit turnover tracking.
   - Real-time drill-down from financial statement line items directly to underlying voucher line entries.

3. **Financial Year & Period Closing Locks:**
   - Multi-period controls: `OPEN`, `SOFT_CLOSED` (Maker-Checker required), and `HARD_LOCKED` (Read-only, audited unlock required).
   - Backdating prevention: Transactions attempted in locked accounting periods are rejected with a deterministic violation error.

4. **Real-Time Financial Statement Generation:**
   - **Trial Balance:** Generates gross debit, gross credit, net debit, and net credit columns across all active ledgers, asserting zero trial balance difference.
   - **Profit & Loss:** Computes Gross Profit (Operating Revenue vs Cost of Goods Sold) and Net Operating Income (Operating Profit vs Indirect Expenses).
   - **Balance Sheet:** Verifies the fundamental accounting equation:
     $$\text{Assets} = \text{Liabilities} + \text{Equity} + \text{Retained Earnings}$$

---

## 3. Architecture & Data Model

### Database Entities
- `vouchers`: Canonical voucher header (companyId, voucherType, voucherNumber, date, status, narration, currency, totalAmount, lockStatus).
- `voucher_lines`: Detailed debits and credits with ledgerId, partyId, amount, tax details, and cost center scoping.
- `ledgers`: Account definitions mapped to accounting groups with opening balance and active status.
- `financial_periods`: Financial year definitions, start/end dates, lock status, and closure audit stamps.

### Services & API Endpoints
- `AccountingService` (`apps/api/src/modules/accounting/accounting.service.ts`):
  - `POST /v1/companies/:companyId/vouchers`: Create & post voucher with invariant validation.
  - `GET /v1/companies/:companyId/vouchers`: Paginated voucher search with filters.
  - `GET /v1/companies/:companyId/vouchers/:id`: Retrieve voucher details with debit/credit lines.
- `ReportsService` (`apps/api/src/modules/accounting/reports.service.ts`):
  - `GET /v1/companies/:companyId/reports/trial-balance`: Real-time balanced trial balance.
  - `GET /v1/companies/:companyId/reports/profit-and-loss`: Dynamic P&L statement.
  - `GET /v1/companies/:companyId/reports/balance-sheet`: Balanced balance sheet.
  - `GET /v1/companies/:companyId/reports/general-ledger`: Detailed ledger account statements.

---

## 4. UI / UX Implementation

- **General Ledger Explorer:** `/general-ledger` — Fast, searchable ledger statement with running balance badges and transaction drill-down.
- **Daybook / Vouchers View:** `/vouchers` — Status pill badges (`DRAFT`, `POSTED`, `CANCELLED`), date range filters, and quick creation modals.
- **Financial Reports Hub:** `/reports/trial-balance`, `/reports/profit-and-loss`, `/reports/balance-sheet` with export controls and interactive tree view.
- **Period Locks Settings:** `/settings/periods` — CA admin controls to lock months or quarters.

---

## 5. Verification & Automated Tests

- `packages/accounting-core/test/voucher.spec.ts`: Validates voucher creation, debit/credit balance checks, and immutability invariants.
- `packages/accounting-core/test/voucher-property.spec.ts`: Fast-check property-based testing of arbitrary journal line combinations.
- `packages/accounting-core/test/ledger.spec.ts`: Tests balance calculation, normal balances (debit vs credit), and running balance integrity.
- `apps/api/test/reports.spec.ts`: Validates trial balance equality, P&L aggregation, and balance sheet equation accuracy.

