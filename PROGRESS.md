# Quality Assurance Live Execution Progress Log

| Test ID | Category / Screen | Result | Evidence / Screenshot Path | Executed At | Notes |
|:---|:---|:---:|:---|:---|:---|
| T-001 | Auth > Sign-up | PASS | test-results/screenshots/T-001.png | 2026-11-14T08:12:00Z | Inline field required attribute validated |
| T-002 | Auth > Sign-up | PASS | test-results/screenshots/T-002.png | 2026-11-14T08:12:03Z | HTML5 email format validity enforcement |
| T-003 | Auth > Sign-up | PASS | test-results/screenshots/T-003.png | 2026-11-14T08:12:07Z | Password length validation (< 8 chars) |
| T-004 | Auth > Sign-up | PASS | test-results/screenshots/T-004.png | 2026-11-14T08:12:12Z | CA Practitioner account registered with tenant creation |
| T-005 | Auth > Sign-up | PASS | test-results/screenshots/T-005.png | 2026-11-14T08:12:15Z | Duplicate email conflict error handled gracefully |
| T-006 | Auth > Login | PASS | test-results/screenshots/T-006.png | 2026-11-14T08:12:16Z | Required indicator on empty login form |
| T-007 | Auth > Login | PASS | test-results/screenshots/T-007.png | 2026-11-14T08:12:19Z | Unauthorized error banner on invalid credentials |
| T-008 | Auth > Login | PASS | test-results/screenshots/T-008.png | 2026-11-14T08:12:22Z | Valid login redirected to /settings/companies |
| T-009 | Auth > Session | PASS | test-results/screenshots/T-009.png | 2026-11-14T08:12:23Z | JWT token persists in localStorage across refresh |
| T-010 | Auth > Logout | PASS | test-results/screenshots/T-010.png | 2026-11-14T08:12:24Z | Session cleared and redirected to /auth/login |
| T-011 | Auth > Security | PASS | test-results/screenshots/T-011.png | 2026-11-14T08:12:25Z | Unauthenticated protected route access safely captured |
| T-012 | Auth > Security | PASS | test-results/screenshots/T-012.png | 2026-11-14T08:12:31Z | SQL injection payload in email input blocked by input type |
| T-013 | Auth > Security | PASS | test-results/screenshots/T-013.png | 2026-11-14T08:12:33Z | XSS script payload escaped in DOM text |
| T-014 | Settings > Companies | PASS | test-results/screenshots/T-014.png | 2026-11-14T08:18:25Z | Company Dialog verified with all 3 mode options |
| T-015 | Settings > Companies | PASS | test-results/screenshots/T-015.png | 2026-11-14T08:18:27Z | Legal name required field validation confirmed |
| T-016 | Settings > Companies | PASS | test-results/screenshots/T-016.png | 2026-11-14T08:18:30Z | PAN format regex validation caught invalid input |
| T-017 | Settings > Companies | PASS | test-results/screenshots/T-017.png | 2026-11-14T08:18:34Z | Standalone Cloud company created and verified |
| T-018 | Settings > Companies | PASS | test-results/screenshots/T-018.png | 2026-11-14T08:18:37Z | Tally Prime Hybrid company created and verified |
| T-019 | Settings > Companies | PASS | test-results/screenshots/T-019.png | 2026-11-14T08:18:41Z | Invoicing Only company created and verified |
| T-020 | Layout > Sidebar | PASS | test-results/screenshots/T-020.png | 2026-11-14T08:18:44Z | Adaptive sidebar hides accounting/BRS in Invoicing Only mode |
| T-021 | Layout > Sidebar | PASS | test-results/screenshots/T-021.png | 2026-11-14T08:18:46Z | Full accounting menus visible in Standalone Cloud mode |
| T-022 | Layout > Sidebar | PASS | test-results/screenshots/T-022.png | 2026-11-14T08:18:49Z | Tally bridge telemetry active in Tally Sync mode |
| T-023 | Settings > Companies | PASS | test-results/screenshots/T-023.png | 2026-11-14T08:18:52Z | Branch creation form exercised |
| T-024 | Settings > Companies | PASS | test-results/screenshots/T-024.png | 2026-11-14T08:18:54Z | Head Office tag and state code displayed on branches |
| T-025 | Settings > Companies | PASS | test-results/screenshots/T-025.png | 2026-11-14T08:18:56Z | Read-only Company 360 overview inspected |
| T-026 | Parties > Directory | PASS | test-results/screenshots/T-026.png | 2026-11-14T08:22:30Z | Counterparties list, tabs, and search bar verified |
| T-027 | Parties > Create | PASS | test-results/screenshots/T-027.png | 2026-11-14T08:22:33Z | Party dialog opened with Customer classification |
| T-028 | Parties > Create | PASS | test-results/screenshots/T-028.png | 2026-11-14T08:22:35Z | Legal name required field validation confirmed |
| T-029 | Parties > Create | PASS | test-results/screenshots/T-029.png | 2026-11-14T08:22:38Z | GSTIN 15-char input and state detection verified |
| T-030 | Parties > Create | PASS | test-results/screenshots/T-030.png | 2026-11-14T08:22:41Z | Unregistered treatment disables GSTIN field |
| T-031 | Parties > Create | PASS | test-results/screenshots/T-031.png | 2026-11-14T08:22:43Z | Composition dealer option selected |
| T-032 | Parties > Create | PASS | test-results/screenshots/T-032.png | 2026-11-14T08:22:49Z | Full address customer created and saved |
| T-033 | Parties > Directory | PASS | test-results/screenshots/T-033.png | 2026-11-14T08:22:51Z | Newly created customer displayed with tax badge |
| T-034 | Parties > Create | PASS | test-results/screenshots/T-034.png | 2026-11-14T08:23:12Z | Vendor counterparty created with phone & email |
| T-035 | Parties > Directory | PASS | test-results/screenshots/T-035.png | 2026-11-14T08:22:56Z | Filter by Vendors tab hides customers |
| T-036 | Parties > Search | PASS | test-results/screenshots/T-036.png | 2026-11-14T08:22:59Z | Real-time name search query verified |
| T-037 | Parties > Details | PASS | test-results/screenshots/T-037.png | 2026-11-14T08:23:01Z | Party 360 details dialog inspected |
| T-038 | Parties > Edit | PASS | test-results/screenshots/T-038.png | 2026-11-14T08:23:03Z | Edit party dialog inspected and dismissed |
| T-039 | Items > Catalogue | PASS | test-results/screenshots/T-039.png | 2026-11-14T08:24:18Z | Items catalog, SKU search bar, and unit manager button verified |
| T-040 | Items > Create | PASS | test-results/screenshots/T-040.png | 2026-11-14T08:24:21Z | Toggle between Goods and Services classification verified |
| T-041 | Items > Create | PASS | test-results/screenshots/T-041.png | 2026-11-14T08:24:23Z | Name required field validation confirmed |
| T-042 | Items > Create | PASS | test-results/screenshots/T-042.png | 2026-11-14T08:24:27Z | SKU code, HSN 84713010, price and 18% slab entered |
| T-043 | Items > Create | PASS | test-results/screenshots/T-043.png | 2026-11-14T08:24:32Z | Stock item saved with UOM NOS |
| T-044 | Items > Catalogue | PASS | test-results/screenshots/T-044.png | 2026-11-14T08:24:34Z | Created stock item displayed in catalogue grid |
| T-045 | Items > Create | PASS | test-results/screenshots/T-045.png | 2026-11-14T08:24:39Z | Service item created with SAC 998311 |
| T-046 | Items > Units | PASS | test-results/screenshots/T-046.png | 2026-11-14T08:24:42Z | Unit Manager dialog inspected with statutory UQC codes |
| T-047 | Items > Units | PASS | test-results/screenshots/T-047.png | 2026-11-14T08:24:44Z | Custom unit code display verified |
| T-048 | Items > Units | PASS | test-results/screenshots/T-048.png | 2026-11-14T08:24:46Z | Unit description update verified |
| T-049 | Items > Units | PASS | test-results/screenshots/T-049.png | 2026-11-14T08:24:48Z | Unit deletion safety prompt verified |
| T-050 | Items > Details | PASS | test-results/screenshots/T-050.png | 2026-11-14T08:24:50Z | Item 360 details dialog inspected |
| T-051 | Invoices > Directory | PASS | test-results/screenshots/T-051.png | 2026-11-14T08:28:10Z | GST Tax Invoices directory header and document/party search input verified |
| T-052 | Invoices > Create | PASS | test-results/screenshots/T-052.png | 2026-11-14T08:28:13Z | New GST Tax Invoice form and auto-assigned invoice number series verified |
| T-053 | Invoices > Create | PASS | test-results/screenshots/T-053.png | 2026-11-14T08:28:16Z | Customer party select and billing address auto-population verified |
| T-054 | Invoices > Create | PASS | test-results/screenshots/T-054.png | 2026-11-14T08:28:19Z | Item select, quantity 2 @ ₹5,000, taxable subtotal ₹10,000.00 verified |
| T-055 | Invoices > Create | PASS | test-results/screenshots/T-055.png | 2026-11-14T08:28:22Z | Intra-state CGST 9% (₹900) + SGST 9% (₹900) = ₹11,800.00 calculated accurately |
| T-056 | Invoices > Create | PASS | test-results/screenshots/T-056.png | 2026-11-14T08:28:24Z | Inter-state supply switch with IGST 18% (₹1,800) = ₹11,800.00 calculated accurately |
| T-057 | Invoices > Create | PASS | test-results/screenshots/T-057.png | 2026-11-14T08:28:27Z | 10% line discount applied, net taxable ₹9,000.00 and tax recalculated |
| T-058 | Invoices > Create | PASS | test-results/screenshots/T-058.png | 2026-11-14T08:28:30Z | Multi-row line items and multi-row tax schedule computed |
| T-059 | Invoices > Create | PASS | test-results/screenshots/T-059.png | 2026-11-14T08:28:32Z | Indian Currency Number-to-Words generator validated |
| T-060 | Invoices > Create | PASS | test-results/screenshots/T-060.png | 2026-11-14T08:28:35Z | Invoice saved as Draft and redirected to detail view |
| T-061 | Invoices > Unregistered | PASS | test-results/screenshots/T-061.png | 2026-11-14T08:28:38Z | Unregistered firm invoice title renders "INVOICE • Commercial Invoice" |
| T-062 | Invoices > Unregistered | PASS | test-results/screenshots/T-062.png | 2026-11-14T08:28:40Z | Seller GSTIN displays "GSTIN: Unregistered" with no dummy number |
| T-063 | Invoices > Unregistered | PASS | test-results/screenshots/T-063.png | 2026-11-14T08:28:42Z | Seller state code renders accurately as "Rajasthan (Code 08)" |
| T-064 | Invoices > Detail | PASS | test-results/screenshots/T-064.png | 2026-11-14T08:28:45Z | Invoice status badge displays "Draft" in detail view |
| T-065 | Invoices > Approval | PASS | test-results/screenshots/T-065.png | 2026-11-14T08:28:47Z | Maker-checker quarantine alert banner displayed for invoice > ₹50,000 |
| T-066 | Invoices > Approval | PASS | test-results/screenshots/T-066.png | 2026-11-14T08:28:50Z | Invoice approval confirmed and status transitioned to "Approved" |
| T-067 | Invoices > Approval | PASS | test-results/screenshots/T-067.png | 2026-11-14T08:28:53Z | Approval event verified auto-posting double-entry ledger voucher |
| T-068 | Invoices > Reject | PASS | test-results/screenshots/T-068.png | 2026-11-14T08:28:55Z | Quarantine invoice rejected with reason remarks and status verified "Rejected" |
| T-069 | Invoices > Template | PASS | test-results/screenshots/T-069.png | 2026-11-14T09:05:40Z | Tally Classic GST traditional boxed layout selected |
| T-070 | Invoices > Template | PASS | test-results/screenshots/T-070.png | 2026-11-14T09:05:43Z | Modern Corporate hero header and brand accents verified |
| T-071 | Invoices > Template | PASS | test-results/screenshots/T-071.png | 2026-11-14T09:05:45Z | Minimalist Compact 1-page paper-saving layout verified |
| T-072 | Invoices > Customizer | PASS | test-results/screenshots/T-072.png | 2026-11-14T09:06:35Z | Invoice Branding & Output Customizer dialog opened |
| T-073 | Invoices > Customizer | PASS | test-results/screenshots/T-073.png | 2026-11-14T09:06:05Z | Dynamic NPCI-compliant UPI payment QR code toggle verified |
| T-074 | Invoices > Customizer | PASS | test-results/screenshots/T-074.png | 2026-11-14T09:06:08Z | Custom UPI VPA "books@icici" configured and verified |
| T-075 | Invoices > Customizer | PASS | test-results/screenshots/T-075.png | 2026-11-14T09:06:10Z | Digital Signature Certificate (DSC / e-Sign) toggle verified |
| T-076 | Invoices > Customizer | PASS | test-results/screenshots/T-076.png | 2026-11-14T09:06:12Z | Terms & conditions text updated and applied to invoice |
| T-077 | Invoices > PDF/Print | PASS | test-results/screenshots/T-077.png | 2026-11-14T09:06:14Z | A4 WYSIWYG print & download controls verified |
| T-078 | Invoices > PDF/Print | PASS | test-results/screenshots/T-078.png | 2026-11-14T09:06:16Z | Typography contrast and print sheet structure verified |
| T-079 | Invoices > PDF/Print | PASS | test-results/screenshots/T-079.png | 2026-11-14T09:06:18Z | Invoice number single-line non-wrapping formatting verified |
| T-080 | Invoices > PDF/Print | PASS | test-results/screenshots/T-080.png | 2026-11-14T09:06:21Z | Customizer dialog closed safely via Escape key |
| T-081 | Approvals > Inbox | PASS | test-results/screenshots/T-081.png | 2026-11-14T09:07:31Z | Approval Inbox header and Maker-Checker Posting Guarantee banner verified |
| T-082 | Approvals > Inspect | PASS | test-results/screenshots/T-082.png | 2026-11-14T09:07:34Z | Quarantine invoice inspected with line items and Maker-Checker badge |
| T-083 | Approvals > Batch | PASS | test-results/screenshots/T-083.png | 2026-11-14T09:07:36Z | Governance action controls (Approve & Post, Reject) verified enabled |
| T-084 | Approvals > Action | PASS | test-results/screenshots/T-084.png | 2026-11-14T09:07:38Z | Single invoice approved and posted to general ledger |
| T-085 | Approvals > History | PASS | test-results/screenshots/T-085.png | 2026-11-14T09:07:40Z | Queue transitioned cleanly to verified state |
| T-086 | Banking > Accounts | PASS | test-results/screenshots/T-086.png | 2026-11-14T09:11:20Z | Institutional Banking & BRS accounts directory verified |
| T-087 | Banking > Create | PASS | test-results/screenshots/T-087.png | 2026-11-14T09:11:23Z | New bank account registration form filled with IFSC and account number |
| T-088 | Banking > Create | PASS | test-results/screenshots/T-088.png | 2026-11-14T09:11:26Z | Bank account created and verified in active company overview card |
| T-089 | Banking > Upload | PASS | test-results/screenshots/T-089.png | 2026-11-14T09:11:28Z | Upload statement dialog with CSV input and feed ingestion verified |
| T-090 | Banking > Upload | PASS | test-results/screenshots/T-090.png | 2026-11-14T09:11:30Z | Statement transactions count and dual credit/debit totals verified |
| T-091 | Banking > Reconcile | PASS | test-results/screenshots/T-091.png | 2026-11-14T09:11:32Z | BRS interactive workbench with dual-column feed opened |
| T-092 | Banking > Reconcile | PASS | test-results/screenshots/T-092.png | 2026-11-14T09:11:34Z | Match candidates panel inspected against cash book vouchers |
| T-093 | Banking > Reconcile | PASS | test-results/screenshots/T-093.png | 2026-11-14T09:11:37Z | Reconciliation filter tags (ALL, MATCHED, UNMATCHED) verified |
| T-094 | Banking > Discovery | PASS | test-results/screenshots/T-094.png | 2026-11-14T09:11:39Z | Sales Discovery & Unbilled Deposits Cockpit opened |
| T-095 | Banking > Discovery | PASS | test-results/screenshots/T-095.png | 2026-11-14T09:11:42Z | AI narration scan triggered and unbilled credits detected |
| T-096 | Banking > Discovery | PASS | test-results/screenshots/T-096.png | 2026-11-14T09:11:44Z | Discovery conversion workflow and scan controls verified |
| T-097 | Imports > Register | PASS | test-results/screenshots/T-097.png | 2026-11-14T09:12:49Z | Bulk Import Registers dashboard and previous batches verified |
| T-098 | Imports > Wizard | PASS | test-results/screenshots/T-098.png | 2026-11-14T09:12:51Z | New import wizard Step 1 CSV upload verified |
| T-099 | Imports > Mapping | PASS | test-results/screenshots/T-099.png | 2026-11-14T09:12:53Z | Step 2 Auto-column mapping and validation stage verified |
| T-100 | Imports > Review | PASS | test-results/screenshots/T-100.png | 2026-11-14T09:12:55Z | Batch resolution review grid and staged rows verified |
| T-101 | Imports > Review | PASS | test-results/screenshots/T-101.png | 2026-11-14T09:12:58Z | Validation resolution filter tabs and quick-map controls inspected |
| T-102 | Imports > Process | PASS | test-results/screenshots/T-102.png | 2026-11-14T09:13:00Z | Batch approve and post to general ledger process verified |
| T-103 | Vouchers > Journal | PASS | test-results/screenshots/T-103.png | 2026-11-14T09:15:38Z | General Ledger Vouchers page and New Journal Voucher modal opened |
| T-104 | Vouchers > Create | PASS | test-results/screenshots/T-104.png | 2026-11-14T09:15:40Z | JV modal date picker, branch and financial year selectors verified |
| T-105 | Vouchers > Create | PASS | test-results/screenshots/T-105.png | 2026-11-14T09:15:42Z | Debit leg account selection and ₹20,000 amount input verified |
| T-106 | Vouchers > Create | PASS | test-results/screenshots/T-106.png | 2026-11-14T09:15:45Z | Unequal credit (₹15,000) triggers UNBALANCED badge and disables Post button |
| T-107 | Vouchers > Create | PASS | test-results/screenshots/T-107.png | 2026-11-14T09:15:47Z | Balanced credit (₹20,000) activates BALANCED (Δ ₹0.00) and enables Post button |
| T-108 | Vouchers > Create | PASS | test-results/screenshots/T-108.png | 2026-11-14T09:15:51Z | Balanced manual journal voucher successfully posted to general ledger |
| T-109 | Vouchers > Create | PASS | test-results/screenshots/T-109.png | 2026-11-14T09:15:54Z | PAYMENT voucher filter and double-entry vendor/bank register inspected |
| T-110 | Vouchers > Create | PASS | test-results/screenshots/T-110.png | 2026-11-14T09:15:57Z | RECEIPT voucher filter and customer payment settlements verified |
| T-111 | Vouchers > Create | PASS | test-results/screenshots/T-111.png | 2026-11-14T09:15:59Z | CONTRA voucher filter and cash/bank inter-account transfers verified |
- T-112 | PASS | test-results/screenshots/T-112.png | 2026-11-14T03:55:30Z
- T-113 | PASS | test-results/screenshots/T-113.png | 2026-11-14T03:55:33Z
- T-114 | PASS | test-results/screenshots/T-114.png | 2026-11-14T03:55:37Z
- T-115 | PASS | test-results/screenshots/T-115.png | 2026-11-14T03:55:41Z
- T-116 | PASS | test-results/screenshots/T-116.png | 2026-11-14T03:55:44Z
- T-117 | PASS | test-results/screenshots/T-117.png | 2026-11-14T03:55:47Z
- T-118 | PASS | test-results/screenshots/T-118.png | 2026-11-14T03:55:51Z
- T-119 | PASS | test-results/screenshots/T-119.png | 2026-11-14T03:59:35Z
- T-120 | PASS | test-results/screenshots/T-120.png | 2026-11-14T03:59:38Z
- T-121 | PASS | test-results/screenshots/T-121.png | 2026-11-14T03:59:41Z
- T-122 | PASS | test-results/screenshots/T-122.png | 2026-11-14T03:59:44Z
- T-123 | PASS | test-results/screenshots/T-123.png | 2026-11-14T03:59:47Z
- T-124 | PASS | test-results/screenshots/T-124.png | 2026-11-14T03:59:50Z
- T-125 | PASS | test-results/screenshots/T-125.png | 2026-11-14T03:59:52Z
- T-126 | PASS | test-results/screenshots/T-126.png | 2026-11-14T03:59:55Z
- T-127 | PASS | test-results/screenshots/T-127.png | 2026-11-14T03:59:57Z
- T-128 | PASS | test-results/screenshots/T-128.png | 2026-11-14T04:00:00Z
- T-129 | PASS | test-results/screenshots/T-129.png | 2026-11-14T04:00:02Z
- T-130 | PASS | test-results/screenshots/T-130.png | 2026-11-14T04:09:25Z
- T-131 | PASS | test-results/screenshots/T-131.png | 2026-11-14T04:09:28Z
- T-132 | PASS | test-results/screenshots/T-132.png | 2026-11-14T04:09:31Z
- T-133 | PASS | test-results/screenshots/T-133.png | 2026-11-14T04:09:34Z
- T-134 | PASS | test-results/screenshots/T-134.png | 2026-11-14T04:09:37Z
- T-135 | PASS | test-results/screenshots/T-135.png | 2026-11-14T04:09:40Z
- T-136 | PASS | test-results/screenshots/T-136.png | 2026-11-14T04:09:43Z
- T-137 | PASS | test-results/screenshots/T-137.png | 2026-11-14T04:09:46Z
- T-138 | PASS | test-results/screenshots/T-138.png | 2026-11-14T04:09:49Z
- T-139 | PASS | test-results/screenshots/T-139.png | 2026-11-14T04:09:52Z
- T-140 | PASS | test-results/screenshots/T-140.png | 2026-11-14T04:09:56Z
- T-141 | PASS | test-results/screenshots/T-141.png | 2026-11-14T04:21:20Z
- T-142 | PASS | test-results/screenshots/T-142.png | 2026-11-14T04:21:22Z
- T-143 | PASS | test-results/screenshots/T-143.png | 2026-11-14T04:21:25Z
- T-144 | PASS | test-results/screenshots/T-144.png | 2026-11-14T04:21:26Z
- T-145 | PASS | test-results/screenshots/T-145.png | 2026-11-14T04:21:28Z
- T-146 | PASS | test-results/screenshots/T-146.png | 2026-11-14T04:21:29Z
- T-147 | PASS | test-results/screenshots/T-147.png | 2026-11-14T04:21:30Z
- T-148 | PASS | test-results/screenshots/T-148.png | 2026-11-14T04:21:31Z
- T-149 | PASS | test-results/screenshots/T-149.png | 2026-11-14T04:21:32Z
- T-150 | PASS | test-results/screenshots/T-150.png | 2026-11-14T04:21:33Z
- T-151 | PASS | test-results/screenshots/T-151.png | 2026-11-14T04:21:34Z
- T-152 | PASS | test-results/screenshots/T-152.png | 2026-11-14T04:31:45Z
- T-153 | PASS | test-results/screenshots/T-153.png | 2026-11-14T04:31:47Z
- T-154 | PASS | test-results/screenshots/T-154.png | 2026-11-14T04:31:48Z
- T-155 | PASS | test-results/screenshots/T-155.png | 2026-11-14T04:31:49Z
- T-156 | PASS | test-results/screenshots/T-156.png | 2026-11-14T04:31:50Z
- T-157 | PASS | test-results/screenshots/T-157.png | 2026-11-14T04:31:51Z
- T-158 | PASS | test-results/screenshots/T-158.png | 2026-11-14T04:31:52Z
- T-159 | PASS | test-results/screenshots/T-159.png | 2026-11-14T04:31:53Z
- T-160 | PASS | test-results/screenshots/T-160.png | 2026-11-14T04:31:54Z
- T-161 | PASS | test-results/screenshots/T-161.png | 2026-11-14T04:31:55Z
- T-162 | PASS | test-results/screenshots/T-162.png | 2026-11-14T04:31:55Z
- T-163 | PASS | test-results/screenshots/T-163.png | 2026-11-14T04:31:56Z
- T-164 | PASS | test-results/screenshots/T-164.png | 2026-11-14T04:34:15Z
- T-165 | PASS | test-results/screenshots/T-165.png | 2026-11-14T04:34:17Z
- T-166 | PASS | test-results/screenshots/T-166.png | 2026-11-14T04:34:19Z
- T-167 | PASS | test-results/screenshots/T-167.png | 2026-11-14T04:34:21Z
- T-168 | PASS | test-results/screenshots/T-168.png | 2026-11-14T04:34:23Z
- T-169 | PASS | test-results/screenshots/T-169.png | 2026-11-14T04:34:25Z
- T-170 | PASS | test-results/screenshots/T-170.png | 2026-11-14T04:34:26Z

| T-171 | PASSED | test-results/screenshots/E2E-TMPL-01.png | 2026-11-17 12:52:45 |
| T-172 | PASSED | test-results/screenshots/E2E-TMPL-02.png | 2026-11-17 12:52:47 |
| T-173 | PASSED | test-results/screenshots/E2E-MASTERS-03.png | 2026-11-17 12:52:54 |
| T-174 | PASSED | test-results/screenshots/E2E-GST-04.png | 2026-11-17 12:52:55 |

| T-175 | PASSED | test-results/screenshots/E2E-NOTIF-01.png | 2026-11-17 14:52:41 |
| T-176 | PASSED | test-results/screenshots/E2E-NOTIF-02.png | 2026-11-17 14:52:44 |
| T-177 | PASSED | test-results/screenshots/E2E-NOTIF-03.png | 2026-11-17 14:52:46 |
| T-178 | PASSED | test-results/screenshots/E2E-NOTIF-04.png | 2026-11-17 14:52:49 |

| T-179 | PASSED | test-results/screenshots/E2E-REP-01.png | 2026-11-17 15:39:48 |
| T-180 | PASSED | test-results/screenshots/E2E-REP-02.png | 2026-11-17 15:39:51 |
| T-181 | PASSED | test-results/screenshots/E2E-REP-03.png | 2026-11-17 15:39:53 |
| T-182 | PASSED | test-results/screenshots/E2E-REP-04.png | 2026-11-17 15:39:54 |
| T-183 | PASSED | test-results/screenshots/E2E-REP-05.png | 2026-11-17 15:39:56 |
| T-184 | PASSED | test-results/screenshots/E2E-REP-06-shared.png | 2026-11-17 15:39:58 |

| T-185 | PASSED | test-results/screenshots/E2E-AUDIT-01.png | 2026-11-17 16:00:45 |
| T-186 | PASSED | test-results/screenshots/E2E-AUDIT-02.png | 2026-11-17 16:00:47 |
| T-187 | PASSED | test-results/screenshots/E2E-AUDIT-03.png | 2026-11-17 16:00:49 |
| T-188 | PASSED | test-results/screenshots/E2E-AUDIT-04.png | 2026-11-17 16:00:51 |
| T-189 | PASSED | test-results/screenshots/E2E-AUDIT-05.png | 2026-11-17 16:00:53 |
| T-190 | PASSED | test-results/screenshots/E2E-AUDIT-06.png | 2026-11-17 16:00:54 |
| T-191 | PASSED | test-results/screenshots/E2E-AUDIT-07.png | 2026-11-17 16:00:56 |
| T-192 | PASSED | test-results/screenshots/E2E-REP-07-pdf.png | 2026-11-17 17:16:48 |
