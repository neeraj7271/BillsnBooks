# Antigravity Books — Master Quality Assurance & Test Plan

**Product Name:** Antigravity Books — Enterprise Accounting, Invoicing & Tax Operations Platform  
**Target Architecture:** Next.js 14 (React 18 + TailwindCSS + Radix UI) + NestJS 10 (TypeORM) + PostgreSQL 16 + Redis/BullMQ  
**Base URLs:** Web: `http://localhost:3000` | API: `http://localhost:4000`  
**Execution Standard:** Principal QA Engineer Rigor (Autonomous Human-Mode Real Browser UI Verification)

---

## Master Checklist

### 1. Authentication & Session Management
- [x] T-001 | Auth > Sign-up | Submit empty sign-up form and verify inline field validations
- [x] T-002 | Auth > Sign-up | Enter invalid email format (e.g. "user@invalid") and verify error message
- [x] T-003 | Auth > Sign-up | Enter weak password (< 8 chars) and verify complexity enforcement
- [x] T-004 | Auth > Sign-up | Register new account with valid credentials and verify organization creation
- [x] T-005 | Auth > Sign-up | Attempt duplicate email registration and verify HTTP 409 conflict error toast
- [x] T-006 | Auth > Login | Submit empty login form and verify required field indicators
- [x] T-007 | Auth > Login | Enter invalid credentials and verify unauthorized alert message
- [x] T-008 | Auth > Login | Login with valid credentials and verify redirect to main dashboard
- [x] T-009 | Auth > Session | Verify JWT token stored in localStorage/cookie and persists across page reload
- [x] T-010 | Auth > Logout | Click logout button, verify session destroyed and redirect to /auth/login
- [x] T-011 | Auth > Security | Access protected route (/invoices) while unauthenticated and verify redirect to /auth/login
- [x] T-012 | Auth > Security | Input SQL injection string `' OR '1'='1` in email field and verify safe handling
- [x] T-013 | Auth > Security | Input XSS payload `<script>alert(1)</script>` in name field and verify sanitization

### 2. Company Management & Operating Modes
- [x] T-014 | Settings > Companies | Open Company Dialog and verify all form fields and mode selection options
- [x] T-015 | Settings > Companies | Submit empty company form and verify legal name validation
- [x] T-016 | Settings > Companies | Validate PAN format regex (10 alphanumeric chars e.g. ABCDE1234F)
- [x] T-017 | Settings > Companies | Create new company in "Standalone Cloud Mode" and verify active badge
- [x] T-018 | Settings > Companies | Create new company in "Tally Prime Hybrid Mode" and verify Tally bridge indicator
- [x] T-019 | Settings > Companies | Create new company in "Invoicing Only Mode" and verify mode flag saved
- [x] T-020 | Layout > Sidebar | Switch to "Invoicing Only" company and verify accounting/BRS/journals/practice hidden from sidebar
- [x] T-021 | Layout > Sidebar | Switch to "Standalone Cloud" company and verify full accounting menus visible and Tally hidden
- [x] T-022 | Layout > Sidebar | Switch to "Tally Prime Hybrid" company and verify Tally telemetry visible in footer and sidebar
- [x] T-023 | Settings > Companies | Add secondary branch with Karnataka state code (29) and unique GSTIN
- [x] T-024 | Settings > Companies | Verify branch list displays head office tag and state jurisdiction
- [x] T-025 | Settings > Companies | Open Company Details dialog and verify read-only overview values match DB

### 3. Parties (Customers & Vendors) Master
- [x] T-026 | Parties > Directory | Open Parties page and verify customer/vendor tabs, search bar, and empty state
- [x] T-027 | Parties > Create | Open Party Dialog and verify Customer radio selected by default
- [x] T-028 | Parties > Create | Submit empty form and verify party name is required
- [x] T-029 | Parties > Create | Enter valid 15-character GSTIN (e.g. 08OVQPS2080P1Z5) and verify state auto-detection
- [x] T-030 | Parties > Create | Select "Unregistered" tax treatment and verify GSTIN field is disabled or optional
- [x] T-031 | Parties > Create | Select "Composition" tax treatment and verify badge indicator
- [x] T-032 | Parties > Create | Fill complete billing address (line, city, state, pincode) and save customer
- [x] T-033 | Parties > Directory | Verify newly created customer appears in list with correct tax badge
- [x] T-034 | Parties > Create | Create a Vendor party with phone number and email address
- [x] T-035 | Parties > Directory | Filter party list by Vendor tab and verify customer records hidden
- [x] T-036 | Parties > Search | Search party by name query and verify real-time search filtering
- [x] T-037 | Parties > Details | Click party card to open Party Details dialog and inspect ledger snapshot
- [x] T-038 | Parties > Edit | Edit party address details, save, and verify updated information persists

### 4. Items & Inventory Catalogue
- [x] T-039 | Items > Catalogue | Open Items page and verify SKU list, search bar, and unit manager trigger
- [x] T-040 | Items > Create | Open Item Dialog and toggle between "Goods" and "Services"
- [x] T-041 | Items > Create | Submit empty item form and verify item name validation error
- [x] T-042 | Items > Create | Enter SKU code, 8-digit HSN code (e.g. 84713010), unit price (₹5,000) and 18% GST
- [x] T-043 | Items > Create | Select UOM unit "NOS - Numbers" from dropdown and save item
- [x] T-044 | Items > Catalogue | Verify created stock item displays formatted price (₹5,000.00) and GST rate
- [x] T-045 | Items > Create | Create a Service item with 6-digit SAC code (e.g. 998311) and 18% GST
- [x] T-046 | Items > Units | Open Unit Manager Dialog and verify default UQC codes (NOS, KGS, PCS, MTR, BOX)
- [x] T-047 | Items > Units | Add custom unit code (e.g. "SET - Sets") and verify in unit list
- [x] T-048 | Items > Units | Edit unit code description and verify update
- [x] T-049 | Items > Units | Delete unit and verify confirmation prompt before deletion
- [x] T-050 | Items > Details | Open Item Details Dialog and verify tax breakdown and price history

### 5. Sales Invoicing Lifecycle & GST Math
- [x] T-051 | Invoices > Directory | Open Invoices page and verify status filters (All, Draft, Approved, Paid, Overdue)
- [x] T-052 | Invoices > Create | Open `/invoices/new` and verify auto-generated invoice numbering format
- [x] T-053 | Invoices > Create | Select customer party and verify billing address snapshot auto-populates
- [x] T-054 | Invoices > Create | Select item, enter quantity 2 @ ₹5,000, verify taxable amount ₹10,000.00
- [x] T-055 | Invoices > Create | Verify Intra-state supply calculates CGST 9% (₹900) + SGST 9% (₹900) = ₹11,800.00
- [x] T-056 | Invoices > Create | Change supply to Inter-state and verify IGST 18% (₹1,800) = ₹11,800.00
- [x] T-057 | Invoices > Create | Add line discount of 10% and verify net taxable value and tax recalculated
- [x] T-058 | Invoices > Create | Add second line item and verify multi-row subtotal and tax schedule
- [x] T-059 | Invoices > Create | Verify Indian Currency Number-to-Words generator matches total amount
- [x] T-060 | Invoices > Create | Save invoice as Draft and verify redirection to invoice detail view
- [x] T-061 | Invoices > Unregistered | Create invoice with Pannalal & Sons (Unregistered) and verify document is "INVOICE • Commercial Invoice"
- [x] T-062 | Invoices > Unregistered | Verify seller GSTIN renders as "GSTIN: Unregistered" with no dummy number
- [x] T-063 | Invoices > Unregistered | Verify seller state renders accurately as "Rajasthan (Code 08)"
- [x] T-064 | Invoices > Detail | Verify invoice status badge displays "Draft"
- [x] T-065 | Invoices > Approval | For invoice > ₹50,000, verify maker-checker quarantine alert banner
- [x] T-066 | Invoices > Approval | Click "Approve Invoice" and verify status transitions to "Approved"
- [x] T-067 | Invoices > Approval | Verify approval event auto-posts double-entry ledger voucher to accounts
- [x] T-068 | Invoices > Reject | Reject quarantine invoice with reason remarks and verify status "Rejected"

### 6. Invoice Templates, Customization & A4 PDF
- [x] T-069 | Invoices > Template | Switch template to "Tally Prime Classic" and verify 3-column traditional layout
- [x] T-070 | Invoices > Template | Switch template to "Modern Brand" and verify hero header with primary color accents
- [x] T-071 | Invoices > Template | Switch template to "Minimal Compact" and verify dense 1-page layout
- [x] T-072 | Invoices > Customizer | Open Invoice Customizer Dialog from invoice detail view
- [x] T-073 | Invoices > Customizer | Toggle dynamic UPI payment QR code ON/OFF and verify preview update
- [x] T-074 | Invoices > Customizer | Configure custom UPI ID (e.g. "books@icici") and verify QR data payload
- [x] T-075 | Invoices > Customizer | Toggle Digital Signature Certificate (DSC) stamp ON and verify stamp details
- [x] T-076 | Invoices > Customizer | Edit Terms & Conditions text, save, and verify immediate re-render on invoice
- [x] T-077 | Invoices > PDF/Print | Click "Print / Export PDF" and verify A4 WYSIWYG modal opens
- [x] T-078 | Invoices > PDF/Print | Verify typography contrast (no low-contrast grey text in print preview)
- [x] T-079 | Invoices > PDF/Print | Verify invoice number does not break or wrap awkwardly across lines
- [x] T-080 | Invoices > PDF/Print | Close print modal using Esc key or close button

### 7. Approvals & Maker-Checker Workflow
- [x] T-081 | Approvals > Inbox | Navigate to `/approvals` and verify pending quarantine queue
- [x] T-082 | Approvals > Inspect | Click invoice in quarantine to inspect line items and tax breakdown
- [x] T-083 | Approvals > Batch | Select multiple invoices and verify batch approve action button enabled
- [x] T-084 | Approvals > Action | Approve single invoice and verify row removed from pending queue
- [x] T-085 | Approvals > History | Switch to "Approved History" tab and verify timestamped audit log

### 8. Banking, Bank Statements & BRS
- [x] T-086 | Banking > Accounts | Navigate to `/banking` and verify list of connected bank accounts
- [x] T-087 | Banking > Create | Open "New Bank Account" dialog and fill account name, number, IFSC, opening balance
- [x] T-088 | Banking > Create | Save bank account and verify card appears with formatted currency balance
- [x] T-089 | Banking > Upload | Open "Upload Statement" dialog and drag/drop bank statement CSV
- [x] T-090 | Banking > Upload | Verify statement row count, date range, and debit/credit total preview
- [x] T-091 | Banking > Reconcile | Open `/banking/[id]/reconcile` workspace and verify dual-column layout
- [x] T-092 | Banking > Reconcile | Match statement credit row against pending customer invoice receipt
- [x] T-093 | Banking > Reconcile | Verify matched row updates ledger balance and reconciliation status
- [x] T-094 | Banking > Discovery | Open `/banking/discovery` (AI Narration & Sales Discovery)
- [x] T-095 | Banking > Discovery | Verify raw bank narration tokenized to identify customer counterparty
- [x] T-096 | Banking > Discovery | Click "Convert to Invoice" dialog and verify customer and amount pre-filled

### 9. Bulk Data Import & Validation Pipeline
- [x] T-097 | Imports > Register | Open `/imports` and verify previous import batches and status tags
- [x] T-098 | Imports > Wizard | Navigate to `/imports/new` and upload bulk invoice CSV file
- [x] T-099 | Imports > Mapping | Verify auto-column mapping (Date, Invoice No, Party, Taxable, Tax, Total)
- [x] T-100 | Imports > Review | Open `/imports/[id]/review` grid and inspect rows flagged with validation errors
- [x] T-101 | Imports > Review | Correct invalid party name inline in review grid
- [x] T-102 | Imports > Process | Click "Post All Valid Vouchers" and verify import processing job status

### 10. General Ledger & Double-Entry Journals
- [x] T-103 | Vouchers > Journal | Navigate to `/vouchers` and click "New Voucher"
- [x] T-104 | Vouchers > Create | Select voucher type "Journal" and enter transaction date
- [x] T-105 | Vouchers > Create | Add Debit line (e.g. Rent Expense ₹20,000)
- [x] T-106 | Vouchers > Create | Add Credit line with unequal amount (₹15,000) and verify "Save" disabled due to unbalance
- [x] T-107 | Vouchers > Create | Correct Credit line to ₹20,000 (Difference: ₹0.00) and verify save enabled
- [x] T-108 | Vouchers > Create | Save balanced voucher and verify in journal register
- [x] T-109 | Vouchers > Create | Create a "Payment" voucher (Debit Vendor, Credit Bank) and verify ledger balances
- [x] T-110 | Vouchers > Create | Create a "Receipt" voucher (Debit Bank, Credit Customer) and verify invoice settlement
- [x] T-111 | Vouchers > Create | Create a "Contra" voucher (Cash to Bank transfer)

### 11. Chart of Accounts (COA) Hierarchy
- [x] T-112 | Settings > Ledgers | Open `/settings/ledgers` and inspect 4-level canonical group tree
- [x] T-113 | Settings > Ledgers | Expand "Current Assets" group and verify child groups (Bank, Cash, Debtors)
- [x] T-114 | Settings > Ledgers | Open "Create Ledger" dialog and enter ledger name
- [x] T-115 | Settings > Ledgers | Select parent group "Direct Expenses" and enter opening balance
- [x] T-116 | Settings > Ledgers | In Tally Hybrid mode, verify "Tally Alias / Sync Name" input is visible
- [x] T-117 | Settings > Ledgers | In Standalone mode, verify "Tally Alias" input is hidden
- [x] T-118 | Settings > Ledgers | Open "Create Group" dialog, select Nature "Asset", and save new group

### 12. Financial Statements & Statutory Reports
- [x] T-119 | Reports > Trial Balance | Navigate to `/reports/trial-balance` and verify zero-variance audit
- [x] T-120 | Reports > Trial Balance | Verify Total Debits equals Total Credits exactly (Difference = ₹0.00)
- [x] T-121 | Reports > Trial Balance | Change "As of Date" filter and verify real-time balance recalculation
- [x] T-122 | Reports > Trial Balance | Click on a ledger row to drill down into General Ledger audit
- [x] T-123 | Reports > P&L | Navigate to `/reports/profit-and-loss` and verify Revenue section
- [x] T-124 | Reports > P&L | Verify Cost of Goods Sold (COGS) and Gross Profit margin calculation
- [x] T-125 | Reports > P&L | Verify Operating Expenses and Net Profit computation
- [x] T-126 | Reports > Balance Sheet | Navigate to `/reports/balance-sheet` and verify Assets vs Liabilities & Equity
- [x] T-127 | Reports > Balance Sheet | Verify accounting balance equation: Assets = Liabilities + Owner's Equity
- [x] T-128 | Reports > General Ledger | Navigate to `/reports/general-ledger` and select specific account
- [x] T-129 | Reports > General Ledger | Verify date range filtering and running balance column integrity

### 13. Accounts Receivable, Ageing & Payment Links
- [x] T-130 | Collections > Ageing | Navigate to `/collections/ageing` and inspect ageing summary cards
- [x] T-131 | Collections > Ageing | Verify overdue invoices sorted into 0-30, 31-60, 61-90, 90+ day buckets
- [x] T-132 | Collections > Ageing | Verify Days Sales Outstanding (DSO) metric computation
- [x] T-133 | Collections > Ageing | Click "Send Reminder" button on overdue invoice and verify modal options
- [x] T-134 | Collections > Ageing | Open "Promise to Pay" dialog, log promised date, and verify reminder tag
- [x] T-135 | Collections > Links | Navigate to `/collections/payment-links` and click "Create Payment Link"
- [x] T-136 | Collections > Links | Fill customer, invoice ref, amount, expiry date and generate instant link
- [x] T-137 | Collections > Links | Open "View UPI QR" dialog and verify scanable QR code rendering
- [x] T-138 | Collections > Recurring | Navigate to `/collections/recurring` and click "New Recurring Schedule"
- [x] T-139 | Collections > Recurring | Configure Monthly frequency, start date, max runs (12), item line, and save
- [x] T-140 | Collections > Recurring | Click "Pause Schedule" and verify status toggles to "Paused"

### 14. CA Practice Management & Client Portfolio
- [x] T-141 | Practice > Clients | Navigate to `/practice/clients` and inspect CA client cards
- [x] T-142 | Practice > Clients | Open "Onboard Client" dialog, fill client name, PAN, tier, and contact
- [x] T-143 | Practice > Clients | Save client and verify card shows engagement health status
- [x] T-144 | Practice > Tasks | Navigate to `/practice/tasks` and inspect compliance board (GSTR-1, 3B, TDS)
- [x] T-145 | Practice > Tasks | Open "New Task" dialog, set title "GSTR-1 Q3 Filing", due date, assignee
- [x] T-146 | Practice > Tasks | Save task and verify appearance under "Pending" column
- [x] T-147 | Practice > Tasks | Drag or update task status to "Filed" and verify audit timestamp
- [x] T-148 | Practice > Calendar | Navigate to `/practice/calendar` and verify statutory tax due dates
- [x] T-149 | Practice > Documents | Navigate to `/practice/documents` and click "Request Document"
- [x] T-150 | Practice > Documents | Fill request details for "Form 26AS" and submit request to client
- [x] T-151 | Practice > Documents | Open "Upload Client Document" dialog and upload sample file

### 15. Settings, Document Numbering, Period Locks & Branding
- [x] T-152 | Settings > Overview | Navigate to `/settings` and verify quick setting configuration cards
- [x] T-153 | Settings > Numbering | Navigate to `/settings/numbering` and inspect current invoice sequence
- [x] T-154 | Settings > Numbering | Update invoice prefix to `INV-26-27-`, padding to 4 digits, sequence to 101
- [x] T-155 | Settings > Numbering | Save numbering configuration and verify settings updated toast
- [x] T-156 | Settings > Branding | Navigate to `/settings/invoice-branding` and inspect branding form
- [x] T-157 | Settings > Branding | Upload company logo (verify max canvas limit and base64 handling)
- [x] T-158 | Settings > Branding | Configure DSC Authorised Signatory name, designation, and certificate details
- [x] T-159 | Settings > Branding | Configure default UPI payment VPA handle and default terms
- [x] T-160 | Settings > Periods | Navigate to `/settings/periods` and inspect financial year lock date
- [x] T-161 | Settings > Periods | Set backdated period lock date to `2026-03-31` and save lock
- [x] T-162 | Settings > Periods | Attempt to post voucher dated `2026-02-15` and verify rejection with error
- [x] T-163 | Settings > Raw | Open Raw Settings Inspector and verify all key-value overrides persist in DB

### 16. Responsive Viewports & Accessibility
- [x] T-164 | Responsive > Mobile | Switch viewport to iPhone (375x667) and verify mobile hamburger menu opens
- [x] T-165 | Responsive > Mobile | Verify invoice table switches to responsive stacked card layout
- [x] T-166 | Responsive > Tablet | Switch viewport to iPad (768x1024) and verify multi-column grid alignment
- [x] T-167 | Responsive > Desktop | Switch viewport to Large Desktop (1920x1080) and verify container max-width
- [x] T-168 | A11y > Keyboard | Navigate through invoice creation form using exclusively Tab and Enter keys
- [x] T-169 | A11y > Modals | Open any modal dialog and press `Escape` key to verify accessible dismissal
- [x] T-170 | A11y > Contrast | Audit invoice preview color contrast to ensure zero invisible/faded text


### 17. Excel Templates, Bank Multi-Format Parsing & Missing Masters Reconciliation
- [x] T-171 | Bulk Ingestion > Templates | Download Excel Templates from `/imports/new` dropdown (Sales Invoices, Purchase Bills, Bank Statement, Parties Master, Items Master)
- [x] T-172 | Banking > Templates | Download Bank Statement Template directly from Banking upload modal
- [x] T-173 | Bulk Ingestion > Pre-Flight | Scan missing parties and items from uploaded Excel, open Missing Masters modal, and 1-click create all with statutory defaults
- [x] T-174 | Bulk Ingestion > Statutory GST | Validate GSTIN checksum, POS intra vs inter-state tax splits, and 1-click Auto-Fix Tax Splits


### 18. Notification Architecture, Configurable Offsets & Scheduler
- [x] T-175 | Settings > Notifications | Navigate to `/settings/notifications` and inspect global delivery window, quiet hours, and 3 rule categories
- [x] T-176 | Settings > Notifications | Customize notification offsets ("5, 2, 1" days before), dispatch time ("10:00 AM"), delivery channels, and verify persistence
- [x] T-177 | Notifications > Real-time | Send Test Notification across channel and verify live receipt in top navbar bell popover
- [x] T-178 | Notifications > Scheduler | Run automated scheduler scan and verify deduplication prevents duplicate alerts on same day

## 19. Enterprise Reports, Branded Exports & Client Sharing
- [x] T-179 | Reports > Catalog Hub | View master catalog with category filters and Starred/Favorites top shelf
- [x] T-180 | Reports > Starred Hub | Star / unstar reports with optimistic UI and persistent database sync
- [x] T-181 | Reports > Customer Sales | View customer-wise sales analysis with date range, KPI cards, and party breakdown
- [x] T-182 | Reports > Item Sales | View product and SKU-wise sales analysis with quantity velocity and tax breakout
- [x] T-183 | Reports > Excel Export | Download branded corporate Excel spreadsheet with frozen panes and dynamic `=SUM(...)` formulas
- [x] T-184 | Reports > Client Sharing | Share report via WhatsApp pre-formatted text, Email dispatch, and secure tokenized link `/reports/shared/:token`

## 20. Statutory Audit, Expenses, Cash/Bank & Payables Hygiene Reports Suite
- [x] T-185 | Reports > Expenses Suite | Navigate to `/reports/expenses` and verify tab bar (Purchase Dashboard, Expenses Monthly, Expenses VendorWise, Expenses CategoryWise, Expenses Register, Purchases ItemWise) with Remarks & Action guidance banner
- [x] T-186 | Reports > Expenses Suite | Verify More Reports dropdown on `/reports/expenses` containing Expenses VoucherTypeWise and Ledgers-Negative Balance
- [x] T-187 | Reports > Cash/Bank Governance | Navigate to `/reports/cash-bank-audit` and verify tabs (Cash - Negative Balance, Bank - Negative Balance, Inter Bank Transfers, Cash Withdrawals, Cash Deposits, Cash Expenses, Cash Income) with Cash Balance Sanity banner
- [x] T-188 | Reports > Statutory Audit | Verify More Reports dropdown on `/reports/cash-bank-audit` with Sec 40A(3) (> ₹10,000 cash payment) and Sec 269ST (>= ₹2 Lakh cash receipt) statutory tax audit checks
- [x] T-189 | Reports > Payables & Dues | Navigate to `/reports/payables` and verify tabs (Payables Summary, Payables Ageing - Tally, Payables Ageing - FIFO, Advance to Vendors, Receipts from Vendors, Vendors booked through non-Purchase vouchers) with Recovery Follow-up banner
- [x] T-190 | Reports > Master Hygiene | Verify More Reports dropdown on `/reports/payables` with Ledgers - Squared Off, Stagnant, Not Used, and TDS Sec 206AA / GSTIN missing audit lists
- [x] T-191 | Reports > Branded Export | Trigger Branded Excel export (.xlsx) across all new audit suites with frozen navy header panes, alternating zebra rows, and currency formatting
- [x] T-192 | Reports > PDF / Print View | Verify high-fidelity branded PDF printable view with interactive toolbar, repeating table headers, ICAI double-underline totals, and correct column alignment
