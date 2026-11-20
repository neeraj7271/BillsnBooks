# Test Section 07: Operations — Sales Invoicing & GST Tax Engine

**Document Reference:** `docs/testing/07-sales-invoicing.md`  
**Target Route:** `http://localhost:3000/invoices` and `http://localhost:3000/invoices/new`  
**Shared Data Pack Reference:** `docs/testing/00-data-pack.md`  
**Prerequisites:** Signed in with active company (`Acme Global Technologies Pvt Ltd` - State `27`).

---

## 1. Test Suite Matrix

| ID | Title | Scenario | Place of Supply | Math Verifications | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **INV-001** | Intra-State B2B Tax Invoice (MH $\rightarrow$ MH) | Regular Customer with 10% Line Discount | `27 - Maharashtra` | Taxable: ₹45,000<br>CGST (9%): ₹4,050<br>SGST (9%): ₹4,050<br>Total: **₹53,100.00** | **READY TO TEST** |
| **INV-002** | Inter-State B2B Tax Invoice (MH $\rightarrow$ KA) | Regular Out-of-State Customer | `29 - Karnataka` | Taxable: ₹42,000<br>IGST (18%): ₹7,560<br>Total: **₹49,560.00** | **READY TO TEST** |
| **INV-003** | Multi-Rate Line Invoice (18% + 5% + Nil) | Mixed Slabs (Services + Goods + Nil) | `27 - Maharashtra` | Differential tax rate line bifurcation | **READY TO TEST** |
| **INV-004** | Table Icon Actions & Legend Bar | View, Copy, Cancel Icon Buttons & Legend | N/A | Icon buttons with tooltips, Quick Actions legend bar | **READY TO TEST** |
| **INV-005** | Invoice Duplication & In-Place Draft Edit | Clone invoice & edit draft in-place | N/A | Form auto-populates; PUT update succeeds | **READY TO TEST** |
| **INV-006** | Double-Entry General Ledger Impact | Ledger Audit | N/A | Balanced journal postings to `1160`, `3100`, `2141`, `2142` | **READY TO TEST** |

---

## 2. Step-by-Step Test Guide

### `INV-001`: Intra-State B2B Tax Invoice (Maharashtra $\rightarrow$ Maharashtra)
* **URL:** `http://localhost:3000/invoices/new`
* **Header Inputs:**
  * **Customer / Party:** Select `Apex Infotech Solutions Pvt Ltd` (`27AAECR4512D1ZQ`)
  * **Branch:** `Head Office` (`27 - Maharashtra`)
  * **Place of Supply:** `27 - Maharashtra` *(Auto-synced from customer)*
  * **Document Type:** `TAX_INVOICE`
  * **Tax Classification:** `TAXABLE`
* **Line Item 1:**
  * **Select Item:** `Enterprise Cloud SaaS Subscription` (`SRV-CLOUD-01`)
  * **Quantity:** `2`
  * **Unit Rate (₹):** `25000` *(Auto-populated)*
  * **Discount (%):** `10`
  * **GST Slab:** `18%`
* **Script-Verified Math Check:**
  * Gross Total: $2 \times ₹25,000 = ₹50,000.00$
  * Line Discount (10%): $-₹5,000.00$
  * Taxable Subtotal: **₹45,000.00**
  * Supply Type: **Intra-State (MH $\rightarrow$ MH)**
  * CGST (9.00%): **₹4,050.00**
  * SGST (9.00%): **₹4,050.00**
  * IGST: **₹0.00**
  * Round Off: **₹0.00**
  * **Grand Total:** **₹53,100.00**
* **Action:** Click **`Create Invoice`**
* **Expected Result:**
  * Invoice created with sequential number (e.g. `INV/26-27/0001`).
  * Redirects to Invoice Details screen displaying the calculated tax breakdown.

---

### `INV-002`: Inter-State B2B Tax Invoice (Maharashtra $\rightarrow$ Karnataka)
* **URL:** `http://localhost:3000/invoices/new`
* **Header Inputs:**
  * **Customer / Party:** Select `Bengaluru Cloudworks Pvt Ltd` (`29AABCA1234F1Z5`)
  * **Branch:** `Head Office` (`27 - Maharashtra`)
  * **Place of Supply:** `29 - Karnataka` *(Auto-detected from party's GSTIN/address)*
  * **Document Type:** `TAX_INVOICE`
  * **Tax Classification:** `TAXABLE`
* **Line Item 1:**
  * **Select Item:** `Enterprise Dual-WAN Core Router` (`HW-ROUTER-01`)
  * **Quantity:** `1`
  * **Unit Rate (₹):** `42000` *(Auto-populated)*
  * **Discount (%):** `0`
  * **GST Slab:** `18%`
* **Script-Verified Math Check:**
  * Taxable Subtotal: **₹42,000.00**
  * Supply Type: **Inter-State (MH $\rightarrow$ KA)**
  * CGST: **₹0.00** | SGST: **₹0.00**
  * IGST (18.00%): $42,000 \times 0.18 = $ **₹7,560.00**
  * Round Off: **₹0.00**
  * **Grand Total:** **₹49,560.00**
* **Action:** Click **`Create Invoice`**
* **Expected Result:**
  * Single IGST line item computed; CGST and SGST remain ₹0.00.
  * Success notification and redirect to Invoice Details.

---

### `INV-003`: Multi-Rate Line Invoice (18% + 5% + Nil)
* **URL:** `http://localhost:3000/invoices/new`
* **Header Inputs:**
  * **Customer / Party:** Select `Apex Infotech Solutions Pvt Ltd` (`27AAECR4512D1ZQ`)
  * **Branch:** `Head Office` (`27 - Maharashtra`)
  * **Place of Supply:** `27 - Maharashtra`
* **Line Item 1 (18% Services):**
  * **Select Item:** `Architecture Consulting Services` (`SRV-CONSULT-01`)
  * **Quantity:** `2` | **Rate:** `5000` | **GST:** `18%` $\rightarrow$ Taxable: ₹10,000 | CGST: ₹900 | SGST: ₹900
* **Line Item 2 (5% Goods):**
  * **Select Item:** `Organic Cotton Twill Fabric (Roll)` (`FAB-COTTON-01`)
  * **Quantity:** `10` | **Rate:** `450` | **GST:** `5%` $\rightarrow$ Taxable: ₹4,500 | CGST: ₹112.50 | SGST: ₹112.50
* **Line Item 3 (0% Nil-Rated Goods):**
  * **Select Item:** `Indian Statutory Accounts Compendium` (`BK-HANDBOOK-01`)
  * **Quantity:** `1` | **Rate:** `1200` | **GST:** `0% (Nil)` $\rightarrow$ Taxable: ₹1,200 | Tax: ₹0.00
* **Script-Verified Math Check:**
  * Total Taxable Subtotal: ₹10,000 + ₹4,500 + ₹1,200 = **₹15,700.00**
  * Total CGST: ₹900 + ₹112.50 = **₹1,012.50**
  * Total SGST: ₹900 + ₹112.50 = **₹1,012.50**
  * **Grand Total:** ₹15,700 + ₹2,025 = **₹17,725.00**
* **Action:** Click **`Create Invoice`**
* **Expected Result:**
  * Proper multi-slab bifurcation saved without rounding loss.

---

### `INV-004`: Table Icon Actions & Legend Bar Verification
* **URL:** `http://localhost:3000/invoices`
* **Verifications:**
  1. **Quick Actions Legend:** Verify that below the table, the **Quick Actions** bar displays:
     - `[Eye Icon] View / Print PDF`
     - `[Copy Icon] Duplicate to New`
     - `[Ban Icon] Cancel (Rule 46)`
  2. **Action Buttons:** In the `Actions` column of any invoice row:
     - Verify clean icon buttons with no text wrapping:
       - **Eye icon** (`View & Print Invoice`)
       - **Copy icon** (`Duplicate / Copy to New`)
       - **Ban icon** (`Cancel Invoice (Rule 46)`) on issued invoices
     - Hover over each icon to verify descriptive tooltip appears.

---

### `INV-005`: Invoice Duplication & In-Place Draft Edit
* **URL:** `http://localhost:3000/invoices`
* **Step 1 — Duplicate:**
  * On any invoice row, click the **Copy icon** (`Duplicate / Copy to New`).
  * Expected: Navigates to `/invoices/new?cloneFrom=<id>`, with Customer, Place of Supply, and all Line Items pre-filled, ready for any modifications.
* **Step 2 — Save as Draft:**
  * In the document header or actions, save or create as draft (or save without issuing).
* **Step 3 — In-Place Edit:**
  * On the draft invoice, navigate to `/invoices/new?edit=<id>`.
  * Modify a quantity or description.
  * Click **`Update Invoice`**.
  * Expected: Invokes `PUT /v1/companies/:companyId/invoices/:id` and updates the record in-place without generating a duplicate voucher.
