# Masters (routes: `/parties`, `/items`, `/settings/ledgers`, `/settings/numbering`, `/settings/invoice-branding`, `/settings/companies`, `/settings/periods`, `/settings/tally`)

## Purpose
Manages GST-compliant counterparties (Customers/Vendors), Goods/Service items & UQCs, Chart of Accounts (Ledgers & Groups), immutable document numbering series, invoice branding, multi-company branches, accounting period locks, and Tally connector configuration.

## User journey
1. Add customers & vendors in `/parties` with registration type (`REGULAR`, `UNREGISTERED`, `COMPOSITION`, `SEZ_UNIT`, `OVERSEAS`, etc.), valid Mod-36 GSTIN, and state code.
2. Add goods/services in `/items` with HSN/SAC codes, statutory GST slabs, and custom/statutory UQCs.
3. Inspect or extend Chart of Accounts in `/settings/ledgers` and configure custom document numbering in `/settings/numbering`.
4. Upload company logo and brand color in `/settings/invoice-branding`.
5. Manage branches in `/settings/companies`, lock/unlock monthly periods in `/settings/periods`, and monitor Tally sync in `/settings/tally`.

## Validations & rules (from code)
- **Parties & GSTIN Policy** (`packages/gst-rules/src/party-registration-policy.ts:180-241`, `gstin-validator.ts:13-52`, `apps/api/src/modules/party/party.service.ts:106-123, 326-343`):
  - `UNREGISTERED` / `OVERSEAS`: GSTIN strictly `FORBIDDEN` (`"GSTIN is strictly forbidden for ..."`).
  - `REGULAR`, `COMPOSITION`, `SEZ_UNIT`, `SEZ_DEVELOPER`, `DEEMED_EXPORT`, `UIN_HOLDER`: GSTIN `REQUIRED` (`"GSTIN is mandatory for ..."`).
  - `validateGstin`: exact 15 chars, statutory regex, valid state code, Mod-36 checksum on 15th char; first 2 digits must match `billingStateCode` (`"State code mismatch: GSTIN starts with ..."`).
  - Duplicate active GSTIN in same company → `400` (`"A counterparty with GSTIN ... already exists in this company"`).
  - Cannot hard-delete party with invoices (`"Cannot hard-delete counterparty ... because <N> posted invoice(s) exist"`).
- **Items & Custom UOMs** (`apps/api/src/modules/item/item.service.ts:58-91, 150-317`):
  - Duplicate `itemCode` → `409 Conflict` (`"Item with code ... already exists."`).
  - Cannot delete item referenced in `InvoiceItemOrmEntity` (`"Cannot hard-delete item ..."`).
  - Custom UOM: 2–12 alphanumeric chars, cannot collide with `GST_STATUTORY_UOM_LIST`, cannot delete if used by active items.
  - *(Known bug: `item-dialog.tsx:37,234` saves `itemType: 'SERVICES'` while `items/page.tsx:413` filters `'SERVICE'`.)*
- **Ledgers & Groups** (`apps/api/src/modules/ledger/ledger.service.ts:245-501`):
  - Duplicate ledger/group code → `400`; locked system ledgers cannot be moved or deleted; ledgers with journal postings cannot be deleted (`"because it contains <N> journal entry postings"`).
- **Numbering Series** (`apps/api/src/modules/numbering/numbering.service.ts:68-487`):
  - Duplicate `(companyId, docType, seriesCode)` → `409`.
  - Pattern (`{FY}`, `{FY_FULL}`, `{YYYY}`, `{YY}`, `{MM}`, `{BRANCH}`, `{SEQ}`), `startSeq`, and `seqPadding` lock permanently after first document issuance (`"Cannot modify numbering pattern or starting sequence after documents have already been issued"`).
  - *(Known gap: `settings/numbering/page.tsx:72` defaults `{SERIES}-{SEQ}`, but backend `interpolatePattern` does not substitute `{SERIES}`.)*
- **Invoice Branding** (`apps/api/src/modules/settings/settings.service.ts:392-401`):
  - Backend accepts `PNG/JPEG/JPG/WEBP` up to `5 MB` (FE `invoice-branding/page.tsx:158` allows `SVG` / `10 MB`, falling back to base64).
- **Periods & Tally** (`period.controller.ts:25,36`, `tally-gateway.service.ts:166-213`):
  - Lock/unlock restricted to `SUPER_ADMIN` / `FIRM_PARTNER`. Tally heartbeat `> 3m` marks `OFFLINE`; amount variance `> ₹0.05` flags `DISCREPANCY`.

## Test cases

| # | Case | Type | Data to use | Steps | Expected result (cite code) |
|---|------|------|-------------|-------|-----------------------------|
| 1 | Create B2B Regular Party & B2C Unregistered Party | Happy | `PTY-01` (Regular, MH), `PTY-02` (Unregistered) | `/parties` → **Add Party** → fill fields → save | `CUST-0001` & `CUST-0002` created with validated GSTIN/state (`party.service.ts:118-123`). |
| 2 | Create Goods & Service Items + Custom UOM | Happy | `ITM-01` (Goods, HSN `8481`, 18%), `ITM-02` (Service, SAC `998314`, 18%), UOM `PLT` | `/items` → **Units** tab → create `PLT` → **Add Item** | Items and custom UOM `PLT` saved (`item.service.ts:58-91, 198-230`). |
| 3 | Create Ledger & Numbering Series | Happy | Ledger `Software Subscriptions` (`4510` under Indirect Expenses); Series `TX26` (`INV/{FY}/{SEQ}`) | `/settings/ledgers` → **New Ledger**; `/settings/numbering` → **New Series** | Ledger & series created (`ledger.service.ts:245`, `numbering.service.ts:340`). |
| 4 | Upload Invoice Branding logo & lock Period | Happy | Valid PNG `< 5 MB`; lock `April` period | `/settings/invoice-branding` → upload; `/settings/periods` → **Lock** | Logo saved; period `isLocked = true` (`settings.service.ts:392`, `period.controller.ts:25`). |
| 5 | Reject GSTIN on `UNREGISTERED` party | Negative | `PTY-03` (`UNREGISTERED` with GSTIN `27AAACT2727Q1ZW`) | `/parties` → **Add Party** → save | Rejected: `'GSTIN is strictly forbidden for ...'` (`party-registration-policy.ts:195-200`). |
| 6 | Bad Mod-36 GSTIN checksum & state mismatch | Negative | `27AAACT2727Q1Z0` (bad checksum); `29AAACT2727Q1ZW` with state `27` | `/parties` → **Add Party** → save | Rejected with `'GSTIN checksum verification failed'` / `'State code mismatch...'` (`gstin-validator.ts:43`, `party-registration-policy.ts:225`). |
| 7 | Duplicate GSTIN / Duplicate Item Code | Negative | Re-enter `PTY-01` GSTIN; re-enter `ITM-01` code | Create duplicate in `/parties` / `/items` | `400` duplicate GSTIN (`party.service.ts:106`); `409` duplicate item code (`item.service.ts:58`). |
| 8 | Delete Party/Item/Ledger with existing transactions | Negative | Party/Item/Ledger used on an issued invoice/voucher | Click **Delete** | Blocked (`party.service.ts:326`, `item.service.ts:150`, `ledger.service.ts:338`). |
| 9 | Modify locked Numbering Series pattern | Negative | Series `TX26` after 1 invoice issued | `/settings/numbering` → edit `formatPattern` | `400`: `'Cannot modify numbering pattern or starting sequence after documents have already been issued...'` (`numbering.service.ts:391`). |
| 10 | Statutory UOM collision (`NOS`) | Negative | Create custom UOM with code `NOS` | `/items` → **Units** → **Add Unit** | `400`: `'Unit Code NOS is already a standard statutory GST unit.'` (`item.service.ts:210`). |

## Edge & boundary cases
- **PAN regex in Company dialog:** `company-dialog.tsx:120-128` enforces `/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/`.
- **Multi-branch state code:** Adding a second branch in state `29` (KA) via `/settings/companies` enables inter-state vs intra-state testing per branch.
- **Leap-year February:** `period.service.ts:137` generates Feb ending `02-28` even in leap years.

## Negative / error cases
- Non-partner role attempting `POST /periods/:id/lock` → `403 Forbidden`.
- Deleting locked system ledger → `"Cannot delete locked system ledger ..."` (`ledger.service.ts:328`).

## State/UI checks
- `CLIENT_VIEWER` sees read-only `/parties` (`parties/page.tsx:68`).
- Empty states, loading skeletons, light/dark themes, and `tabular-nums` alignment across all 8 master/settings pages.

## Realistic data (Type-in)
Also see bulk workbooks: [parties-master-50.xlsx](./data/parties-master-50.xlsx) and [items-master-50.xlsx](./data/items-master-50.xlsx).

| Ref | Kind | Name | Code / PAN / HSN | GSTIN / UQC | State / Slab | Notes |
|-----|------|------|-------------------|-------------|--------------|-------|
| `PTY-01` | Party (`CUSTOMER`, `REGULAR`) | `Tata Consultancy Services Ltd` | `AAACT2727Q` | `27AAACT2727Q1ZW` | `27` (MH) | Intra-state B2B (from MH HO) |
| `PTY-02` | Party (`CUSTOMER`, `REGULAR`) | `Infosys Limited` | `AAACI4567M` | `29AAACI4567M1Z1` | `29` (KA) | Inter-state B2B (from MH HO) |
| `PTY-03` | Party (`CUSTOMER`, `UNREGISTERED`) | `Walk-in Retail Customer` | — | *(blank)* | `27` (MH) | B2C customer |
| `ITM-01` | Item (`GOODS`) | `Industrial Valve 50mm` | HSN `8481` | `NOS` | `18%` | Sales ₹4,200 / Purchase ₹3,100 |
| `ITM-02` | Item (`SERVICE`) | `Annual Security Audit` | SAC `998314` | `NOS` | `18%` | Sales ₹85,000 |
| `ITM-03` | Item (`GOODS`) | `Gold Bullion Assay Kit` | HSN `7108` | `NOS` | `3%` | Sales ₹25,000 (special 3% slab) |
