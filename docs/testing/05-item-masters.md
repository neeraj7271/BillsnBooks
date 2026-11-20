# Test Section 05: Operations — Item, HSN/SAC & Tax Masters

**Test File:** `docs/testing/05-item-masters.md`  
**Target Route:** `http://localhost:3000/items`  
**Shared Data Pack Reference:** `docs/testing/00-data-pack.md` & `docs/testing/data/items.csv`  
**Prerequisites:** Signed in with active company selected (`Acme Global Technologies Pvt Ltd`).

---

## Item & Service Masters: Test Cases & Execution Matrix

| ID | Title | Type | Priority | Expected Result | Result | Notes / Retest Reference |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **ITM-001** | Create Professional IT Service (SAC 998311, 18% GST) | Positive | Critical | Item saved. Appears in table with SKU `SRV-CONSULT-01`, `SERVICES` badge, SAC `998311`, `18%` GST, and rate `₹5,000.00 / HOURS`. | **PASS** | Verified manually by user. |
| **ITM-002** | Create SaaS Cloud Service (SAC 998315, 18% GST, Monthly UOM) | Positive | High | Item saved with SKU `SRV-CLOUD-01`, `SERVICES` badge, SAC `998315`, `18%` GST, rate `₹25,000.00 / MONTH`. | **PASS** | Verified manually by user. |
| **ITM-003** | Create Physical Hardware Goods (HSN 851762, 18% GST, NOS) | Positive | Critical | Item saved with SKU `HW-ROUTER-01`, `GOODS` badge, HSN `851762`, `18%` GST, rate `₹42,000.00 / NOS`. | **PASS** | Verified manually by user. |
| **ITM-004** | Create Concessional Tax Goods (HSN 5208, 5% GST, METERS) | Boundary / Rate | High | Item saved with SKU `FAB-COTTON-01`, `GOODS` badge, HSN `5208`, `5%` GST, rate `₹450.00 / MTR`. | **PASS** | Verified manually by user. |
| **ITM-005** | Create Nil-Rated / Exempt Product (HSN 4901, 0% GST) | Boundary / Rate | High | Item saved with SKU `BK-HANDBOOK-01`, `GOODS` badge, HSN `4901`, `0%` GST, rate `₹1,200.00 / NOS`. | **PASS** | Verified manually by user. |
| **ITM-006** | Validation Negative: Required Fields Missing (Item Code & Name) | Negative | Medium | Browser stops submission; required field alerts appear without submitting empty payload. | **PASS** | Verified HTML5 form validation. |
| **ITM-007** | Filter Tabs & Search Consistency on Item Catalog | Cross-screen | Medium | Switching between `All Items`, `Services`, and `Goods` correctly partitions items. Live search finds by SKU, name, or HSN. | **PASS** | Verified manually by user. |
| **ITM-008** | Standard GST UOM Selection & Custom Unit Creation | Positive | High | Selecting from standard list populates statutory GST UQC code; custom units manage modal allows creation/deletion. | **PASS** | Verified with code-first format & pinned action. |
| **ITM-009** | View Item 360° Profile Details Modal | Positive | High | Eye icon opens modal displaying complete item metadata, HSN/SAC, GST rate, UOM, and selling rate. | **PASS** | Verified manually by user. |
| **ITM-010** | Edit Item Details & Selling Rate | State-transition | High | Pencil icon opens pre-filled modal, allows updating name, rate, or description, and saves updates via API without stale data. | **PASS** | Verified with normalized GST rate prefill. |
| **ITM-011** | Safe Deactivation / Removal of Unbilled Item | State-transition | High | Trash icon opens confirmation warning. On confirm, item without transactions is deactivated and removed from active catalog. | **PASS** | Verified deletion modal. |
| **ITM-012** | Accounting Guard: Deletion of Item Billed on Invoices Blocked | Invariant / Boundary | Critical | If invoice line items reference this item, deletion is blocked with double-entry warning explanation. | **PENDING** | Re-verify after Section 07 invoicing. |

---

## Section 05 Summary:
- Total Cases: 12
- Passed: 11 / 12
- Pending: 1 (`ITM-012` to be tested with active invoice history)
- Open Defects: 0
- Status: **SIGNED OFF**
