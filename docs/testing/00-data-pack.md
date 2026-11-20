# Antigravity Books — Shared Test Data Pack (Master Reference)

**Document Reference:** `docs/testing/00-data-pack.md`  
**Purpose:** Reusable, realistic, non-confidential test data generated with mathematical checksum integrity for all guided manual QA test cycles.  
**Checksum Script Source:** `tools/test-data/gstin-pan-generator.js`  

---

## 1. Practice & Workspace Setup Data

| Short ID | Entity / User Name | Role / Account Type | Email Address | Password / Auth | Jurisdiction | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `USR-CA-01` | Rajesh Kothari | SuperAdmin / CA Firm Partner | `rajesh@kothari-associates.test` | `Kothari@2026#Secure` | Maharashtra (27) | Primary practitioner account |
| `USR-ACC-01` | Priya Deshmukh | Staff Accountant | `priya.staff@kothari-associates.test` | `Staff@2026#Secure` | Maharashtra (27) | Maker role |
| `USR-REV-01` | Vikram Mehta | Reviewer / Partner Approver | `vikram.partner@kothari-associates.test` | `Partner@2026#Secure` | Maharashtra (27) | Checker role |
| `ORG-TENANT-01` | Kothari & Associates LLP | Multi-Client CA Practice Workspace | `slug: kothari-associates` | N/A | Maharashtra (27) | Primary firm tenant |

---

## 2. Company Master Data Pack

| Short ID | Legal Name | Trade Name | PAN | GSTIN | State Code & Name | Currency | Accounting Mode |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `CO-MH-01` | Acme Global Technologies Pvt Ltd | Acme Cloud Solutions | `AAPFU0939F` | `27AAPFU0939F1ZV` | `27` (Maharashtra) | `INR (₹)` | Cloud-Native |
| `CO-RJ-01` | Pannalal & Sons Traders | P & Sons Enterprises | `OVQPS2080P` | *None (Unregistered)* | `08` (Rajasthan) | `INR (₹)` | Cloud-Native |
| `CO-KA-01` | Deccan Analytics Private Limited | Deccan Analytics | `AABCA1234F` | `29AABCA1234F1Z5` | `29` (Karnataka) | `INR (₹)` | Hybrid |

---

## 3. Party Master Data Pack (Customers & Vendors)

### 3.1 Statutory Valid Counterparties
| Short ID | Legal Name | Party Type | Registration Type | PAN | GSTIN | Address / City | State Code | Phone / Email |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `CUST-REG-01` | Apex Infotech Solutions Pvt Ltd | Customer | `REGULAR` | `AAECR4512D` | `27AAECR4512D1ZQ` | 402 Business Point, Andheri East, Mumbai 400069 | `27` (MH) | `+91 98200 55101`<br>`accounts@apexinfotech.test` |
| `CUST-REG-02` | Bengaluru Cloudworks Pvt Ltd | Customer | `REGULAR` | `AABCA1234F` | `29AABCA1234F1Z5` | 12 Residency Road, MG Road, Bengaluru 560025 | `29` (KA) | `+91 98450 55202`<br>`billing@blrcloud.test` |
| `VEND-REG-01` | Capital Network Equipment Pvt Ltd | Vendor | `REGULAR` | `AACCS6677G` | `07AACCS6677G1Z1` | Plot 18, Okhla Industrial Phase III, New Delhi 110020 | `07` (DL) | `+91 98110 55303`<br>`orders@capitalnet.test` |
| `CUST-SEZ-01` | GIFT Global FinTech SEZ Unit | Customer | `SEZ_UNIT` | `AAGCS9911H` | `24AAGCS9911H1Z8` | Tower 1A, GIFT SEZ, Gandhinagar 382355 | `24` (GJ) | `+91 98790 55404`<br>`tax@giftglobal.test` |
| `CUST-COMP-01`| Jaipur Handicrafts & Textiles | Customer | `COMPOSITION` | `AAHCP1122J` | `08AAHCP1122J1ZK` | 14 Johari Bazaar, Jaipur 302003 | `08` (RJ) | `+91 94140 55505`<br>`sales@jaipurcrafts.test` |
| `CUST-UNREG-01`| Suresh Kumar Sharma (Retail Consumer) | Customer | `UNREGISTERED` | `OVQPS2080P` | *Strictly Forbidden (NULL)* | Flat 301, Sunrise Heights, Malviya Nagar, Jaipur 302017 | `08` (RJ) | `+91 94140 55606`<br>`suresh.sharma@example.com` |
| `CUST-OVS-01` | Pacific Cloud Strategies LLC | Customer | `OVERSEAS` | *None* | *Strictly Forbidden (NULL)* | 500 Howard Street, Suite 400, San Francisco, CA 94105, USA | `96` (OVS) | `+1 555 019 2834`<br>`ap@pacificcloud.test` |

### 3.2 Deliberately Invalid Test Vectors (For Negative & Validation Checks)
| Short ID | Tested Field | Test Value | Expected Rejection Reason |
| :--- | :--- | :--- | :--- |
| `INV-GST-01` | GSTIN Checksum | `27AAPFU0939F1ZA` | Mod-36 checksum character mismatch (expected `V`, got `A`). |
| `INV-GST-02` | GSTIN State Code Mismatch | `27AAPFU0939F1ZV` entered for a Rajasthan (`08`) address | GSTIN state prefix `27` mismatches operating address state `08`. |
| `INV-GST-03` | GSTIN Length | `27AAPFU0939F1Z` (14 chars) | Incomplete GSTIN; exactly 15 characters required. |
| `INV-GST-04` | Unregistered with GSTIN | Entering any GSTIN when `UNREGISTERED` is selected | GSTIN is strictly forbidden for Unregistered / Consumer entities. |
| `INV-PAN-01` | PAN Syntax | `AAPFUO939F` (Letter `O` instead of digit `0`) | 4th to 8th characters must be numeric digits. |

---

## 4. Item, HSN & Tax Master Data Pack

| Short ID | Item Code | Item Name | HSN/SAC | Item Type | UOM | Unit Price (₹) | Default GST % | Applicable Ledgers |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ITM-SRV-18` | `SRV-CLOUD-01` | Enterprise Cloud SaaS Subscription | `998315` | `SERVICES` | `MONTH` | 25,000.00 | 18.00% | Sales A/c (`3100`) |
| `ITM-SRV-18B`| `SRV-CONSULT-01`| Architecture Consulting Services | `998311` | `SERVICES` | `HOURS` | 5,000.00 | 18.00% | Sales A/c (`3100`) |
| `ITM-GDS-18` | `HW-ROUTER-01` | Enterprise Dual-WAN Core Router | `851762` | `GOODS` | `NOS` | 42,000.00 | 18.00% | Sales A/c (`3100`) |
| `ITM-GDS-05` | `FAB-COTTON-01` | Organic Cotton Twill Fabric (Roll) | `5208` | `GOODS` | `METERS`| 450.00 | 5.00% | Sales A/c (`3100`) |
| `ITM-NIL-00` | `BK-HANDBOOK-01`| Indian Statutory Accounts Compendium | `4901` | `GOODS` | `NOS` | 1,200.00 | 0.00% (Nil) | Sales Nil-Rated A/c (`3110`) |

---

## 5. Bank Accounts & Opening Balances

| Short ID | Bank Name | Account Number | IFSC Code | Branch | Nature | Opening Dr Balance (₹) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `BNK-HDFC-01`| HDFC Bank Limited | `50200012345678` | `HDFC0000060` | Nariman Point, Mumbai | Current Account | ₹ 5,00,000.00 |
| `BNK-ICICI-01`| ICICI Bank Limited | `001105012345` | `ICIC0000011` | Bandra Kurla Complex | Current Account | ₹ 2,50,000.00 |

---

## 6. Pre-Calculated Invoice Math Test Cases (Script-Verified)

### Case 1: Intra-State B2B Tax Invoice (Maharashtra → Maharashtra)
- **Supplier:** `CO-MH-01` (`27`)
- **Recipient:** `CUST-REG-01` (`27`)
- **Item:** `ITM-SRV-18` (Qty: 2, Rate: ₹25,000.00, Discount: 10%)
- **Calculations:**
  - Gross Amount: $2 \times 25,000.00 = ₹50,000.00$
  - Discount (10%): $₹5,000.00$
  - Taxable Amount: $₹45,000.00$
  - Supply Type: `INTRA_STATE`
  - CGST (9%): $45,000 \times 0.09 = ₹4,050.00$
  - SGST (9%): $45,000 \times 0.09 = ₹4,050.00$
  - IGST: $₹0.00$
  - Round Off: $₹0.00$
  - **Invoice Total:** **₹53,100.00**
- **Ledger Impact:**
  - `Dr` Apex Infotech Solutions (`1160`): **₹53,100.00**
  - `Cr` Sales Account (`3100`): **₹45,000.00**
  - `Cr` Output CGST (`2141`): **₹4,050.00**
  - `Cr` Output SGST (`2142`): **₹4,050.00**

### Case 2: Inter-State B2B Tax Invoice (Maharashtra → Karnataka)
- **Supplier:** `CO-MH-01` (`27`)
- **Recipient:** `CUST-REG-02` (`29`)
- **Item:** `ITM-GDS-18` (Qty: 1, Rate: ₹42,000.00, Discount: 0%)
- **Calculations:**
  - Taxable Amount: $₹42,000.00$
  - Supply Type: `INTER_STATE`
  - CGST: $₹0.00$ | SGST: $₹0.00$
  - IGST (18%): $42,000 \times 0.18 = ₹7,560.00$
  - **Invoice Total:** **₹49,560.00**

### Case 3: B2C Retail Invoice to Unregistered Party with Round-Off
- **Supplier:** `CO-MH-01` (`27`)
- **Recipient:** `CUST-UNREG-01` (Unregistered Consumer, POS: `08`)
- **Item:** `ITM-GDS-05` (Qty: 7, Rate: ₹450.00, Discount: 3.5%)
- **Calculations:**
  - Gross Amount: $7 \times 450.00 = ₹3,150.00$
  - Discount (3.5%): $₹110.25$
  - Taxable Amount: $₹3,039.75$
  - Inter-state IGST (5%): $3,039.75 \times 0.05 = ₹151.9875$
  - Total Before Rounding: $3,039.75 + 151.9875 = ₹3,191.7375$
  - Round-Off Amount: $+₹0.26$
  - **Invoice Total:** **₹3,192.00**

