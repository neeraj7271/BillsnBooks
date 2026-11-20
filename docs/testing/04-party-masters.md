# Test Section 04: Operations — Party Masters (Customers & Vendors)

**Test File:** `docs/testing/04-party-masters.md`  
**Target Route:** `http://localhost:3000/parties`  
**Shared Data Pack Reference:** `docs/testing/00-data-pack.md`  
**Prerequisites:** User is signed in and has an active company selected (`Acme Global Technologies Pvt Ltd`).

---

## Party Masters: Test Cases & Execution Matrix

| ID | Title | Type | Priority | Expected Result | Result | Notes / Retest Reference |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **PTY-001** | Create Regular Intra-State Customer (B2B) | Positive | Critical | Row created with code `CUST-0001`, `CUSTOMER` badge, `Regular GST` badge, and GSTIN `27AAECR4512D1ZQ`. | **PASS** | Verified manually by user. |
| **PTY-002** | Create Unregistered Retail Consumer (Part A Fix Verification) | Positive | Critical | Row displays `Suresh Kumar Sharma` with `Unregistered / Consumer` badge. `"GSTIN:"` strictly not rendered anywhere. | **PASS** | Verified manually by user. |
| **PTY-003** | Switching from Regular to Unregistered Clears GSTIN | Business-rule | Critical | GSTIN field hides with notice. Switching back reveals fresh blank input. | **PASS** | Verified with DEF-001 fix. |
| **PTY-004** | Validation Negative: Invalid GSTIN Checksum Rejected | Negative | Critical | Form blocks submission with clear statutory error: `"Invalid GSTIN: GSTIN checksum verification failed"`. | **PASS** | Verified with DEF-002 fix. |
| **PTY-005** | Validation Negative: GSTIN State Prefix Mismatch with Address State | Negative | High | Submission blocked: `"State code mismatch: GSTIN starts with '27' but operating state is '08'"`. | **PASS** | Verified manually by user. |
| **PTY-006** | Validation Negative: Required Legal Name Missing | Negative | Medium | Browser validation prompts required name; zero network request sent. | **PASS** | Verified. |
| **PTY-007** | Duplicate Detection: Duplicate GSTIN in Same Company Blocked | Business-rule | High | Submission blocked: `"A counterparty with GSTIN ... already exists in this company"`. | **PASS** | Verified manually by user. |
| **PTY-008** | Create Inter-State Vendor (Supplier) | Positive | Critical | Row displays with amber `VENDOR` badge, `Regular GST` badge, and GSTIN `07AACCS6677G1Z1`. | **PASS** | Verified manually by user. |
| **PTY-009** | Create Overseas / Foreign Client (Zero-Rated Export) | Positive | High | GSTIN hidden, Currency set to `USD`, row displays `Overseas Client` badge. | **PENDING** | Ready to run. |
| **PTY-010** | Filter Tabs & Search Consistency on Party Directory | Cross-screen | Medium | Reactive filtering by Customers, Vendors, and live search box by name/code/GSTIN. | **PENDING** | Ready to run. |
| **PTY-011** | View Counterparty 360° Profile Drawer | Positive | Critical | Eye icon opens comprehensive details modal showing statutory tax identity, billing address, credit limit, contact information, and current balance. | **PENDING** | Ready to run. |
| **PTY-012** | Edit Counterparty Details | Positive | High | Pencil icon opens pre-filled modal, allows updating trade name/terms/address, and saves successfully without re-entering GSTIN. | **PENDING** | Ready to run. |
| **PTY-013** | Safe Deactivation / Removal of Unlinked Counterparty | State-transition | High | Trash icon opens confirmation warning. On confirm, party without transactions is deactivated and removed from active directory. | **PENDING** | Ready to run. |
| **PTY-014** | Accounting Guard: Deletion of Counterparty with Posted Invoices Blocked | Invariant / Boundary | Critical | If invoices exist for party, deletion is safely blocked with double-entry warning explanation. | **PENDING** | Ready to run. |

---

## Section 04 Summary:
- Total Cases: 14
- Passed: 8 / 14
- Pending: 6 (`PTY-011`, `PTY-012`, `PTY-013`, `PTY-009`, `PTY-010`, `PTY-014`)
- Open Defects: 0
- Closed Defects: 2 (`DEF-001`, `DEF-002`)
