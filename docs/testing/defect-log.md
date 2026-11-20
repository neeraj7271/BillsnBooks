# Antigravity Books — Manual QA Defect Log

**Document Reference:** `docs/testing/defect-log.md`  
**Purpose:** Formal defect tracking repository during guided manual test program execution.  
**Severity Guide:**  
- **Blocker / Critical:** Wrong money, incorrect tax calculation, unbalanced posting, data loss, leak across tenants/companies, unauthorized route access, duplicate voucher generation.  
- **Major:** Statutory or business rule not enforced, wrong error message, broken flow with workaround.  
- **Minor / Cosmetic:** UI layout defect, badge color mismatch, non-critical typography.  

---

## Active Defect Register

| Defect ID | Section | Test ID | Severity | Title | Steps to Reproduce | Expected Result | Actual Result | Evidence | Likely Root Cause | Status | Fix Reference | Retest Result |
| :---: | :---: | :---: | :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `DEF-001` | 04 (Party Masters) | `PTY-002` / `PTY-003` | **Major** | PartyDialog does not reset form state on reopen, showing stale previous input | 1. Open `/parties`.<br>2. Click "+ Add Counterparty".<br>3. Fill details for a party (e.g. Legal Name, GSTIN, Address).<br>4. Submit or close modal.<br>5. Click "+ Add Counterparty" again. | Form fields should open completely blank and reset to initial default state (`Legal Name: ''`, `GSTIN: ''`, `Address: ''`, etc.). | Form opens pre-filled with the exact data entered in the previous session. | User report: *"each time time clicking the add party button the form open but te form is already prefilled with the last data entered"*. | `apps/web/src/app/parties/party-dialog.tsx`: `PartyDialog` maintains state in `useState` without a `resetForm()` call on modal close or `useEffect` resetting state when `open` prop transitions from `false` to `true`. | **Closed** | Reset `formData` via `useEffect(open)` and `INITIAL_FORM_STATE` on open, submit, and cancel. | **PASS** — Verified clean modal on reopen. |
| `DEF-002` | 04 (Party Masters) | `PTY-004` / `PTY-005` / `PTY-007` | **Major** | API Client displays "[object Object]" instead of the actual error message string | 1. Open `/parties`.<br>2. Click "+ Add Counterparty".<br>3. Enter an invalid GSTIN (e.g. `27AAPFU0939F1ZA` in PTY-004) or duplicate GSTIN.<br>4. Click "Create Counterparty". | Error banner displays human-readable statutory failure message: `"Party registration validation failed: Invalid GSTIN: GSTIN checksum verification failed"`. | Red alert banner renders raw string: `"[object Object]"`. | User screenshot (`media_1793464299033_1d3ff584.jpg`) showing `[object Object]` in banner. | `apps/web/src/lib/api-client.ts`: `request()` extracts `json?.error` directly into `errorMsg`. Because the API envelope returns `error: { code, message, details }`, `json.error` is an object. Passing an object to `new Error(errorMsg)` stringifies it to `"[object Object]"`. Needs `json?.error?.message || json?.message || json?.error`. | **Closed** | Updated `api-client.ts` to unwrap `json?.error?.message` and double-safe unwrap in `party-dialog.tsx`. Added regression test. | **PASS** — Proper error message displayed. |
| `DEF-003` | 04 (Party Masters) | `PTY-011` / `PTY-012` | **Major** | Default Credit Limit (₹1,00,000) and Payment Terms (30 Days) injected silently without user input or UI controls | 1. Create a new party without entering credit limit or payment terms.<br>2. Open View Details modal.<br>3. Observe Credit & Payment terms card. | When no commercial terms are entered, it should show `"None (No limit set)"` and `"Immediate / Due on Receipt"`, and user should have input controls to set them. | Hardcoded `creditLimit: '100000'` and `paymentTermsDays: 30` were silently assigned in initial state and backend without user input fields. | User screenshot (`media_1793467337626_25f08919.jpg`) showing `₹1,00,000` and `30 Days Net`. | `apps/web/src/app/parties/party-dialog.tsx` `INITIAL_FORM_STATE` had hardcoded `creditLimit: '100000'` and `paymentTermsDays: 30`. Form lacked input fields. Details dialog assumed unconditional positive values. | **Closed** | Removed hardcoded defaults; added explicit optional input fields in PartyDialog; updated backend default handling to 0; updated details view to render "None (No limit set)" and "Immediate / Due on Receipt". | **PASS** — Verified by user. |
| `DEF-004` | 05 (Item Masters) | `ITM-010` | **Major** | Edit Item modal fails to pre-fill GST Slab Rate and displays standard time unit as unmapped custom unit | 1. Create item with GST 18% and UOM `HOURS`.<br>2. Click Edit (pencil icon).<br>3. Inspect GST Slab Rate and UOM dropdowns. | GST Slab Rate selects `18% (Standard Rate)` and UOM selects `Hours (HRS)`. | GST Slab Rate was completely blank, and UOM selected `+ Custom / Create New Unit...` with `Custom Unit Code: HOURS`. | User screenshot (`media_1793468715250_27647d7a.jpg`). | 1. API serialized GST rate as string with 2 decimal places (`"18.00"`), which strictly failed equality check with select options (`"18"`).<br>2. Statutory UQC uses code `HRS`, while user typed `HOURS`, failing exact code match. | **Closed** | 1. Added `normalizeGstUqc` with statutory aliases (`HOURS -> HRS`).<br>2. Normalized GST rate string parsing with `Math.round(Number(val))` so `"18.00"` maps to `"18"`. | **Ready for retest** |

---

## Defect Summary by Severity

- **Blocker / Critical:** 0
- **Major:** 0 open (4 fixed)
- **Minor / Cosmetic:** 0
- **Total Open Defects:** 0
