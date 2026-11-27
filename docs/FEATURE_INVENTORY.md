# BillsnBooks / Antigravity Books — Feature Inventory & User-Flow Map
_Generated for the production-readiness testing campaign. Every route, control, dialog, report, and the API behind it._

## Top bar (global, every authenticated page)
| Control | Action | API | Must verify |
|---|---|---|---|
| Hamburger (mobile) | Opens nav drawer | — | Opens/closes; focus trap |
| Company switcher | Switch active company (⌘⇧C) | listCompanies | Whole UI re-renders to new company's data; no stale rows |
| ⌘K Search | Command palette | — | Opens, fuzzy search, jump-to, Esc closes |
| Bell | Notifications dropdown + full page | listNotifications, markNotificationRead, markAllRead | Badge count, grouping, mark read, navigate on click |
| Theme toggle | Light/dark | — | Persists; no invisible text in either |
| Profile menu | Settings, Sign Out | logout | Sign out clears tokens + redirects to /auth/login |

## Routes, their primary actions, and backing APIs
| Route | Purpose | Key buttons / dropdowns | APIs |
|---|---|---|---|
| `/` | Dashboard | KPI cards, ageing, recent, approvals inline | multiple read endpoints |
| `/auth/login` | Login | Submit, link to signup | auth/login, auth/refresh |
| `/auth/signup` | Register tenant | Submit | auth/register |
| `/invoices` | Invoice list | New, Search, row actions (view/edit/duplicate/cancel), pagination | invoices (list, get) |
| `/invoices/new` | Create invoice | Edit/Split/Preview toggle, template switch, Add line, Save Draft, Submit, Series Settings | invoices create, next-number, parties, items, branches |
| `/invoices/[id]` | Invoice detail | Edit, Duplicate, Print, Download, Share, Cancel, Approve/Reject, template switch | invoices get/approve/reject/cancel/convert |
| `/approvals` | Approval inbox | Approve, Reject | approvals list/approve/reject |
| `/parties` | Party list | New, Import, Search, row edit/delete, pagination | parties CRUD, import |
| `/items` | Item list | New, Import, Unit manager, row edit/delete, pagination | items CRUD, units, import |
| `/vouchers` | Voucher list | New JV (dropdown types), reverse, filter dropdowns | vouchers list/create/reverse |
| `/banking` | Bank accounts | Add account, upload statement | banking accounts |
| `/banking/[id]/reconcile` | Reconcile | Match, unmatch, create voucher, suggestions | banking txns/match/suggestions |
| `/banking/discovery` | Sales discovery | Scan, convert | discovery tickets |
| `/imports` | Import register | New import, view batch | imports list |
| `/imports/new` | Import wizard | Upload, map, validate, confirm | imports upload/map/approve |
| `/imports/[id]/review` | Row review | Fix row, bulk fix, resolve masters, post | imports rows/bulk-fix/post |
| `/collections/ageing` | AR ageing | Promise to pay, send reminder | collections ageing |
| `/collections/payment-links` | Payment links | New link, UPI QR, reconcile settlement, callback | collections payment-links |
| `/collections/recurring` | Recurring schedules | New schedule (dialog), pause/resume/run | collections recurring |
| `/practice/clients` | Clients | New client | practice clients |
| `/practice/tasks` | Compliance tasks | New task, status change, comment | practice tasks |
| `/practice/calendar` | Statutory calendar | Month nav | practice calendar |
| `/practice/documents` | Doc requests | Request, upload, review | practice documents |
| `/reports` | Report catalog | Favorite toggle, category filter, search, open | reports catalog/favorites |
| `/reports/*` (10 pages) | Individual reports | Date range, export (xlsx/pdf/html), share, drill-down | per-report endpoints + export + share |
| `/reports/shared/[token]` | Public shared report | View, export | reports shared/:token (public) |
| `/settings` | Settings hub | Section cards | — |
| `/settings/companies` | Companies/branches | Company dialog, branch dialog, details | companies CRUD, branches |
| `/settings/ledgers` | Chart of accounts | Group dialog, ledger dialog, seed, delete | ledgers CRUD, groups, seed |
| `/settings/numbering` | Doc numbering | New series, configure, edit | numbering-series |
| `/settings/notifications` | Notif settings | Toggles, test, trigger-scan | notifications settings/test |
| `/settings/periods` | Period locks | Lock/unlock | periods lock/unlock |
| `/settings/invoice-branding` | Branding | Logo/signature/DSC upload, template pick | settings (branding keys) |
| `/settings/tally` | Tally bridge | Token regen, preview envelope, heartbeat | tally connector |

## 33 dialogs that must each be tested (open/fill/validate/save/cancel/esc)
banking: conversion, new-account, upload-statement · collections: promise-to-pay, send-reminder, create-link, reconcile-settlement, upi-qr, recurring-schedule · imports: missing-masters · invoices: customizer, settings · items: delete-unit, edit-unit, import-items, item-details, item, unit-details, unit-manager · parties: import-parties, party-details, party · practice: client, request-document, upload-client-doc, task, task-status · reports: share · settings: branch, company-details, company, group, ledger

## 28 reports (each: load → range change → reconcile → export xlsx/pdf/html → share)
CUSTOMER_SALES, ITEM_SALES, AR_AGEING, TRIAL_BALANCE, PROFIT_LOSS, BALANCE_SHEET, GENERAL_LEDGER, BRS_STATEMENT, EXPENSES_MONTHLY, EXPENSES_VENDOR, EXPENSES_CATEGORY, EXPENSES_REGISTER, PURCHASES_ITEM, CASH_NEGATIVE, BANK_NEGATIVE, INTER_BANK, CASH_WITHDRAWALS, CASH_DEPOSITS, CASH_EXPENSES, CASH_PAYMENTS_OVER_10K, CASH_RECEIPTS_OVER_2L, PAYABLES_SUMMARY, PAYABLES_AGEING, ADVANCE_TO_VENDORS, LEDGERS_MISSING_PAN, LEDGERS_MISSING_GSTIN, LEDGERS_SQUARED_OFF, LEDGERS_STAGNANT

## Known production red flags (fix before launch)
- 32 files contain console.error/log/warn (route through a logger or strip).
- Report pages use raw onClick buttons (not the Button primitive) — styling + a11y inconsistency.
- 49 backend routes are not exercised by the web client — confirm each is intentional or wire a UI.
