# Test Section 03: Chart of Accounts & General Ledgers

**Test File:** `docs/testing/03-chart-of-accounts.md`  
**Target Route:** `http://localhost:3000/settings/ledgers`  
**API Target:** `http://localhost:4000/v1/companies/:companyId/ledgers`  
**Prerequisites:** Signed in with active company (`Acme Global Technologies Pvt Ltd`).  

---

## 1. Test Suite Matrix

| ID | Title | Type | Priority | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **COA-001** | Inspect Auto-Provisioned Schedule III Indian Standard COA | Positive | Critical | 5 primary root accounting natures exist: Assets (`1000`), Liabilities (`2000`), Equity, Revenue (`3000`), Expenses (`4000`). | **PENDING** |
| **COA-002** | Verify Statutory GST Control Ledgers (`2141`, `2142`, `2143`) | Statutory Guard | Critical | Output CGST, SGST, IGST and Input CGST, SGST, IGST exist with system lock badge. | **PENDING** |
| **COA-003** | Verify Revenue & Sales Control Accounts (`3100`, `3110`) | Positive | High | Sales Account (`3100`) and Sales Nil-Rated (`3110`) exist under Revenue. | **PENDING** |
| **COA-004** | Create Custom Account Group | Positive | High | Custom sub-group (e.g. `1165 Regional Debtors`) created under parent. | **PENDING** |
| **COA-005** | Create Custom Operational Ledger | Positive | High | Custom ledger (e.g. `3120 Software SaaS Income`) created under Revenue group. | **PENDING** |
| **COA-006** | Switch Views (Hierarchy Tree vs Flat Table List) | UI / Usability | Medium | Seamless toggle between collapsible hierarchical tree and flat paginated table. | **PENDING** |
| **COA-007** | Nature Filtering & Live Search | Search / Filter | Medium | Filter by `ASSET`, `LIABILITY`, etc. isolates groups. Search by `CGST` finds tax ledgers. | **PENDING** |
| **COA-008** | System Lock Protection Guard | Security / Invariant | High | Attempting to delete or alter locked control ledgers (e.g. `2141`) is prohibited. | **PENDING** |

---

## 2. Step-by-Step Execution Guide

### `COA-001`: Inspect Auto-Provisioned COA Hierarchy
1. Open **`http://localhost:3000/settings/ledgers`**
2. Confirm the page displays:
   * Top stats: Total Ledgers count, Total Groups count, Active Company indicator.
   * Root categories: **Assets**, **Liabilities**, **Equity**, **Revenue**, **Expenses**.

---

### `COA-002`: Verify Statutory GST Control Ledgers
1. Expand **Liabilities** $\rightarrow$ **Current Liabilities (`2100`)** $\rightarrow$ **Duties & Taxes (`2140`)**:
   * Confirm **`2141` Output CGST**
   * Confirm **`2142` Output SGST**
   * Confirm **`2143` Output IGST**
2. Expand **Assets** $\rightarrow$ **Current Assets (`1100`)** $\rightarrow$ **Duties & Taxes / Input Tax Credits (`1140`)**:
   * Confirm **`1141` Input CGST**
   * Confirm **`1142` Input SGST**
   * Confirm **`1143` Input IGST**
3. Verify each carries a **System Lock** icon to protect GST ledger balancing.

---

### `COA-003`: Verify Revenue Control Accounts
1. Expand **Revenue (`3000`)** $\rightarrow$ **Direct Incomes / Sales (`3100`)**:
   * Confirm **`3100` Sales Account**
   * Confirm **`3110` Sales Nil-Rated Account** (used by our `BK-HANDBOOK-01` book item)

---

### `COA-004`: Create Custom Account Group
1. Click **`+ Add Group`** (top right)
2. Enter:
   * **Group Name**: `Enterprise Key Accounts`
   * **Parent Group**: Select `Sundry Debtors` (or `Current Assets`)
   * **Category / Nature**: `ASSET`
3. Click **`Save Group`**
4. Confirm the new group appears nested in the tree.

---

### `COA-005`: Create Custom Operational Ledger
1. Click **`+ Add Ledger`**
2. Enter:
   * **Ledger Code**: `3120`
   * **Ledger Name**: `Cloud Advisory Consulting Income`
   * **Parent Group**: Select `Sales Accounts` (or `Direct Incomes`)
   * **Opening Balance**: `0`
3. Click **`Save Ledger`**
4. Confirm ledger is saved and visible under Revenue.

---

### `COA-006` & `COA-007`: Toggle Views & Live Search
1. Click the **`Flat List`** button (next to Hierarchy) $\rightarrow$ confirm table view with sortable columns, current balances, and group tags.
2. In the search box, type `CGST` $\rightarrow$ confirm instant search filtering to Input and Output CGST accounts.
3. Switch filter tabs between `Assets`, `Liabilities`, and `Revenue`.

