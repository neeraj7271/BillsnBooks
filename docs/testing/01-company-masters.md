# Antigravity Books — Guided Manual Test Log: Section 01 (Company Masters & Directory)

**Document Reference:** `docs/testing/01-company-masters.md`  
**Execution Target:** `http://localhost:3000/settings/companies`  
**API Target:** `http://localhost:4000/v1/companies`  
**Status:** In Progress  

---

## 1. Test Suite Summary

| Test ID | Test Scenario | Target Entity | Core Test Focus | Status |
| :--- | :--- | :--- | :--- | :---: |
| `CMP-001` | Register Regular GST Company | `CO-MH-01` | Statutory auto-provisioning (COA, FY, Head Office, Sequence) | **PENDING** |
| `CMP-002` | Register Unregistered Enterprise | `CO-RJ-01` | Unregistered entity without GSTIN (PAN only) | **PENDING** |
| `CMP-003` | View 360° Company Profile | `CO-MH-01` | Audit view of PAN, GSTINs, branches, and periods | **PENDING** |
| `CMP-004` | Edit Company Credentials | `CO-MH-01` | Update trade name, address, and head office details | **PENDING** |
| `CMP-005` | Multi-State Branch Expansion | `CO-MH-01` | Add Karnataka (29) GSTIN operating branch node | **PENDING** |
| `CMP-006` | Workspace Context Switching | `CO-RJ-01` | Active working company switch & global isolation | **PENDING** |
| `CMP-007` | Validation Negatives | Invalid Vectors | Invalid PAN syntax rejection & mandatory validations | **PENDING** |

---

## 2. Step-by-Step Test Vectors

### `CMP-001`: Register Regular GST Company (`CO-MH-01`)
* **URL:** `http://localhost:3000/settings/companies`
* **Click:** `Register Company`
* **Inputs:**
  * **Legal Name:** `Acme Global Technologies Pvt Ltd`
  * **Trade Name:** `Acme Cloud Solutions`
  * **PAN:** `AAPFU0939F`
  * **GSTIN:** `27AAPFU0939F1ZV`
  * **Operating State:** `27 - Maharashtra`
  * **Base Currency:** `INR`
  * **Head Office Address:** `402 Business Point, Andheri East`
  * **PIN Code:** `400069`
* **Expected Result:**
  * Company is registered and appears in Directory with `INR` currency badge.
  * Head Office branch with GSTIN `27AAPFU0939F1ZV` is automatically generated.
  * Standard 4-digit Indian Chart of Accounts (Assets, Liabilities, Equity, Revenue, Expense) is seeded in atomic transaction.
  * Default Financial Year (`FY 2026-27`) and Sales Voucher Sequence (`INV/....`) are allocated.

---

### `CMP-002`: Register Unregistered Enterprise (`CO-RJ-01`)
* **Click:** `Register Company`
* **Inputs:**
  * **Legal Name:** `Pannalal & Sons Traders`
  * **Trade Name:** `P & Sons Enterprises`
  * **PAN:** `OVQPS2080P`
  * **GSTIN:** *Leave Empty*
  * **Operating State:** `08 - Rajasthan`
  * **Base Currency:** `INR`
  * **Head Office Address:** `14 Johari Bazaar, Jaipur`
  * **PIN Code:** `302003`
* **Expected Result:**
  * Company registers successfully with status "Unregistered" for GSTIN.
  * Head Office branch is created in Rajasthan jurisdiction (Code `08`).

---

### `CMP-003`: View 360° Company Profile
* **Action:** Click the **Details** (Eye icon) on `Acme Global Technologies Pvt Ltd`.
* **Expected Result:**
  * Opens `CompanyDetailsDialog`.
  * Displays PAN (`AAPFU0939F`), Operating Currency (`INR`), Multi-Tenant Isolation badge.
  * Displays Head Office Branch: `27AAPFU0939F1ZV`, `Maharashtra (Code 27)`, address & pincode.
  * Displays Active Accounting Period: `FY 2026-27` (`2026-04-01` → `2027-03-31`).

---

### `CMP-004`: Edit Company Credentials
* **Action:** Click the **Edit** (Pencil icon) on `Acme Global Technologies Pvt Ltd`.
* **Form Pre-fill Check:** All previous values (Legal name, Trade name, PAN, GSTIN, Address) must be correctly pre-filled with zero blanking.
* **Update Inputs:**
  * **Trade Name:** Change to `Acme Cloud & DevOps Solutions`
  * **Head Office Address:** Change to `402-404 Business Point, Andheri East, Mumbai`
* **Click:** `Save Changes`
* **Expected Result:**
  * Success toast confirms update.
  * Card and Details modal reflect the new trade name and address immediately.

---

### `CMP-005`: Multi-State Branch Expansion
* **Action:** Click **Add Branch** on `Acme Global Technologies Pvt Ltd`.
* **Inputs:**
  * **Branch Name:** `Bengaluru Development Center`
  * **Operating State:** `29 - Karnataka`
  * **GSTIN:** `29AAPFU0939F1ZT`
  * **Address:** `12 Residency Road, MG Road`
  * **PIN Code:** `560025`
  * **Head Office:** `No` (Unchecked)
* **Click:** `Save Branch`
* **Expected Result:**
  * Branch count increases to 2.
  * Karnataka state node appears under branches with GSTIN `29AAPFU0939F1ZT`.

---

### `CMP-006`: Active Workspace Context Switching
* **Action:** On `Pannalal & Sons Traders`, click **Make Active** (or switch via top navbar dropdown).
* **Expected Result:**
  * Green badge "Active Working Entity" moves to `Pannalal & Sons Traders`.
  * Top navigation header updates to show `Pannalal & Sons Traders`.
  * Navigating to `/parties` or `/items` scopes all queries to this active company.

---

### `CMP-007`: Validation Negatives
* **Click:** `Register Company`
* **Inputs:**
  * **Legal Name:** `Faulty Enterprise Pvt Ltd`
  * **PAN:** `AAPFUO939F` *(Letter 'O' instead of digit '0')*
* **Click:** `Register Company`
* **Expected Result:**
  * Form stops submission with clear error: `Invalid PAN format 'AAPFUO939F'. PAN must be 10 characters (e.g. AABCA1234F: 5 letters, 4 digits, 1 letter).`

