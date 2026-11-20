# Phase 4 Implementation Plan: Invoicing, Master Data & Maker-Checker Approvals

**Phase:** 4 — GST Invoicing, Master Data Management & Maker-Checker Workflows  
**Author:** Principal Software Architect & Senior Full-Stack Engineer  
**Status:** Implemented & Verified in Codebase  
**Date:** October 2026  

---

## 1. Executive Summary & Commercial Objective

Phase 4 operationalizes **Day-to-Day Business Billing & Compliance Controls**. It provides an intuitive invoicing engine capable of generating compliant Indian B2B and B2C tax invoices, managing items/services with HSN/SAC codes and tiered GST tax rates, maintaining party masters (customers and suppliers with verified GSTIN checksums), enforcing a strict **Maker-Checker Approval Threshold ($\ge ₹50,000$)**, and alerting team members via an in-app notification center.

The module bridges client-facing commerce with back-office accounting, ensuring every generated invoice directly feeds the double-entry general ledger upon final approval.

---

## 2. Core Functional Pillars

```
[ Customer / Item Master Registry ] ──► [ Interactive Tax Invoice Builder ]
                                                        │
[ In-App Notifications ] ◄── [ Maker-Checker Gate (Threshold >= ₹50,000) ]
            │                                           │
            ▼                                           ▼
[ General Ledger Auto-Posting ] ◄── [ Final Approval & Invoice PDF Delivery ]
```

1. **GST Tax Invoice Generator:**
   - Compliant B2B and B2C invoice generation.
   - Dynamic place of supply determination: automatic splitting between intra-state (CGST + SGST) and inter-state (IGST).
   - Itemized lines with HSN/SAC, quantity, unit price, trade discounts, cess, and rounded net payable.
   - Reverse charge mechanism (RCM) and export flags.

2. **Master Data Registry (Parties & Stock/Service Items):**
   - **Party Registry:** Customer and vendor profiles with PAN, validated 15-character GSTIN checksums, state codes, and billing/shipping addresses.
   - **Item & Service Catalog:** HSN/SAC master with default tax brackets (0%, 5%, 12%, 18%, 28%), unit of measurement (UOM), and standard selling rates.
   - Deduplication guard: Warns or blocks creation of duplicate parties sharing the same GSTIN or PAN.

3. **Maker-Checker Approval Governance:**
   - Tiered transaction controls: Invoices or payments exceeding the configurable threshold (default: ₹50,000) are placed in `PENDING_APPROVAL` status.
   - Role separation: The user who drafts the invoice (Maker) cannot approve the invoice (Checker) if high-value risk flags are present.
   - Audit trail stamping: Every approval records the approver user ID, timestamp, approval notes, and digital fingerprint.

4. **In-App Notification & Exception Dispatcher:**
   - Real-time notification feed in top navigation header:
     - Approval requests for high-value vouchers.
     - Low-confidence OCR document import alerts.
     - Bank reconciliation discrepancy notifications.
   - Mark as read, filter by severity (`INFO`, `WARNING`, `CRITICAL`), and quick-action links directly to exception resolution screens.

5. **Responsive Mobile Control Surface:**
   - Adaptive drawer and sheet menus for mobile phones and tablets.
   - Mobile-optimized invoice preview and quick approval/rejection actions.

---

## 3. Architecture & Data Model

### Database Entities
- `invoices`: Invoice header (companyId, partyId, invoiceNumber, issueDate, dueDate, status, taxableAmount, cgstAmount, sgstAmount, igstAmount, totalAmount, approvalStatus, approvedBy).
- `invoice_items`: Line items with itemId, hsnCode, quantity, rate, discount, taxRate, and calculated tax amounts.
- `parties`: Customer and supplier master records with GSTIN, PAN, stateCode, and credit terms.
- `items`: Goods and service definitions with HSN/SAC codes and tax rates.
- `notifications`: User notification queue with type, title, body, status, and target links.

### Services & API Endpoints
- `InvoiceService` (`apps/api/src/modules/billing/invoice.service.ts`):
  - `POST /v1/companies/:companyId/invoices`: Create draft invoice with automatic GST tax calculation.
  - `POST /v1/companies/:companyId/invoices/:id/submit`: Submit for approval or direct post.
  - `POST /v1/companies/:companyId/invoices/:id/approve`: Maker-checker sign-off and automatic general ledger voucher posting.
- `PartiesService` & `ItemsService`:
  - CRUD operations with GSTIN checksum verification and duplicate checking.
- `NotificationsService` (`apps/api/src/modules/notifications/notifications.service.ts`):
  - `GET /v1/notifications`: Paginated alerts for current user.
  - `PATCH /v1/notifications/:id/read`: Mark notification acknowledged.

---

## 4. UI / UX Implementation

- **Invoicing Hub:** `/invoices` — Data-dense table showing invoice status (`DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `PAID`, `CANCELLED`), party name, tax breakdown, and action menus.
- **Invoice Editor Modal / Page:** `/invoices/new` — Dynamic line item editor with autocomplete for parties and items, real-time GST computation badge, and preview drawer.
- **Parties & Items Settings:** `/settings/parties` and `/settings/items` — Master data directories with search, filter, and quick modal edit.
- **Notification Dropdown:** Top header bell icon with unread count badge and interactive popover.

---

## 5. Verification & Automated Tests

- `packages/gst-rules/test/tax-calculator.spec.ts`: Tests multi-line GST calculations across 0%, 5%, 12%, 18%, and 28% brackets.
- `packages/gst-rules/test/gstin.spec.ts`: Tests ISO 7064 Mod 11, 10 checksum algorithm on valid and invalid GSTIN formats.
- `apps/api/test/invoice.service.spec.ts`: Tests invoice creation, tax allocation, maker-checker status transitions ($\ge ₹50,000$ threshold checks), and general ledger posting integration.

