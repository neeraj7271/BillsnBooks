# Bug Log & Defect Remediation Register

This register documents all bugs identified, investigated, and remediated during the end-to-end verification and visual testing lifecycle of Antigravity Books.

---

### Bug Index

| Bug ID | Title | Severity | Root Cause | Fix Summary | Status |
|:---|:---|:---:|:---|:---|:---:|
| **BUG-001** | High-Resolution Base64 Logo Upload Rejection (`HTTP 413: request entity too large`) | Major | Default Express 100KB body parser in NestJS rejected base64 image strings > 100KB. | Configured `app.use(json({ limit: '25mb' }))` & `urlencoded({ limit: '25mb' })` in `main.ts`. Added client-side canvas optimizer capping max dimension at 1200px. | Fixed |
| **BUG-002** | Database Error on Null Setting Overrides (`null value in column "value" violates not-null constraint`) | Major | `setting_values` table has `NOT NULL` constraint on `value`. Overriding to null threw DB error. | Updated `settings.service.ts` so `set(key, null)` removes the override row and falls back to default safely. | Fixed |
| **BUG-003** | Modern Template Invoice Reference Number Wrapping Across Lines (`INV-00006-26-` \n `27`) | Minor | Missing `whitespace-nowrap` on invoice number element in header. | Added `whitespace-nowrap shrink-0 font-mono font-black text-2xl` to prevent hyphen wrapping. | Fixed |
| **BUG-004** | Table Column Cramping Wrapped Item Descriptions into 4 Lines | Major | Table lacked min-width and column allocation, allowing numeric columns to take 80% width. | Combined `Qty & Unit` into one compact column and gave Item Description flexible `w-auto` (>250px). | Fixed |
| **BUG-005** | Unregistered Seller Printed Fake Dummy GSTIN (`27AABCA1234F1Z5`) | Critical | Templates had fallback `branch?.gstin || '27AABCA1234F1Z5'`. Unregistered seller has `gstin: null`. | Replaced fallback with `isCompanyGstRegistered = Boolean(branch?.gstin)`. Displays `GSTIN: Unregistered` for unregistered entities. | Fixed |
| **BUG-006** | State Name Mismatched State Code (`State Name: Maharashtra, Code: 08`) | Major | `branches` table stores `stateCode: '08'` without raw `state` column, causing fallback to `'Maharashtra'`. | Dynamically resolve state name from `@platform/shared-types` (`INDIAN_GST_STATES['08']` -> `Rajasthan`). | Fixed |
| **BUG-007** | Low Contrast / Light-Grey Text on PDF Download | Minor | CSS classes used `text-slate-400` without explicit `print:text-black` overrides. | Added solid dark `print:text-black` and `text-slate-900` across all templates. | Fixed |
| **BUG-008** | Invoicing-Only Mode Showed Complex Accounting & Tally Sidebar Items | Major | Sidebar lacked conditional section filtering when `portal.invoicing_only` was true. | Added dynamic sidebar section filtering: hides journals, BRS, practice, and reports for invoicing users. | Fixed |
| **BUG-009** | Tally Connector Polling Ran Even When Tally Was Disabled | Minor | Sidebar ran `getTallyConnector()` regardless of company Tally integration setting. | Added early guard in `useEffect`: disables background polling when `tallyEnabled` is false. | Fixed |
| **BUG-010** | Minimalist Compact Template Wrapped Quantity & UOM onto Next Line | Minor | Missing `whitespace-nowrap` on quantity string. | Added `whitespace-nowrap` to ensure `2 MONTH` stays on a single line. | Fixed |

