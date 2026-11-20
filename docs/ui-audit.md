# Comprehensive Frontend UI & Codebase Audit Report

**Date:** 2026-10-31  
**Project:** End-to-End Accounting Operations Platform (`@platform/web`, `@platform/ui`)  
**Scope:** Frontend Architecture, UI Design System, Accessibility (WCAG 2.2 AA), Component Reusability & Backend UI Contracts.

---

## 1. Component Inventory

A total of **22 feature routes** and **6 component files** in `apps/web` were catalogued alongside the current component set in `packages/ui`.

| Concept | Location in `packages/ui` | Ad-Hoc Instances in Feature Code (`apps/web`) | Total Usage Count | Description & Scope |
|---|---|---|---|---|
| **Button** | `packages/ui/src/button.tsx` | 65 raw `<button>` elements across 18 pages | 74 total | Inconsistent padding (`px-2` to `px-5`), inconsistent height (`h-7` to `h-10`), mixed border-radii (`rounded-lg`, `rounded-xl`, `rounded-full`). |
| **Input / Text** | `packages/ui/src/input.tsx` | 54 raw `<input>` elements across 14 pages | 58 total | Ad-hoc text/number/date fields, missing input masks for GSTIN/PAN/IFSC/Dates, varying border colors. |
| **Select / Dropdown** | None in `packages/ui` | 16 native `<select>` elements in pages | 16 total | Native HTML selects without search, async-loading, or keyboard navigation; trigger height inconsistent with inputs. |
| **Table / Data Grid** | `packages/ui/src/table.tsx` | 12 custom `<table>` implementations in pages | 16 total | Ad-hoc table layouts without shared sorting, column pinning, virtualization, responsive card fallback, or pagination. |
| **Card / Container** | `packages/ui/src/card.tsx` | ~45 ad-hoc `div` cards (`rounded-2xl border bg-white p-5`) | ~52 total | Inconsistent shadow depths (`shadow-xs`, `shadow-md`, `shadow-2xl`) and padding scales (`p-2.5` to `p-8`). |
| **Badge / Status Pill** | `packages/ui/src/badge.tsx` | ~38 inline status `<span>` badges | ~45 total | Inconsistent color mappings for statuses (e.g. `ISSUED` uses `bg-emerald-100` vs `bg-green-100`; `POSTED` vs `ISSUED` vs `MATCHED`). |
| **Modal / Dialog** | None in `packages/ui` | 5 custom modal implementations (Parties, Items, Companies, Ledgers, Periods) | 5 total | Built with custom `fixed inset-0` `div`s. No focus trapping, no `role="dialog"`, no ARIA labelling, no Radix primitive. |
| **Alert / Confirm** | `packages/ui/src/alert.tsx` | 15 native browser `alert()` and `prompt()` calls | 15 total | Native blocking browser dialogs used for critical destructive actions (approvals, rejections, posting, error alerts). |
| **Tabs / Filters** | None in `packages/ui` | 8 custom status/tab bars (`filterType === t ? 'bg-blue-600' : ...`) | 8 total | Inconsistent button-based tabs with varying active pill styling. |
| **Command Palette** | `apps/web/src/components/command-palette.tsx` | 0 in `packages/ui` | 1 total | Implemented locally in `apps/web`; functional but not part of canonical design system package. |
| **Sidebar / AppShell** | `apps/web/src/components/sidebar.tsx` | 0 in `packages/ui` | 1 total | Collapsible sidebar with section accordions; local to `apps/web`. |
| **Header / TopBar** | `apps/web/src/components/top-header.tsx` | 0 in `packages/ui` | 1 total | Top bar with notifications, profile menu, theme toggle; local to `apps/web`. |
| **Dead / Unused UI** | None | `apps/web/src/components/navigation.tsx` (524 lines) | 0 active usages | Legacy top navigation component left in tree after AppShell migration. |

---

## 2. Duplication & Inconsistency Report

### 2.1 Ad-Hoc Re-implementation vs. `@platform/ui` Adoption
- Only **6 out of 22 page routes** currently import any component from `@platform/ui`.
- 16 pages re-implement buttons, inputs, selects, and tables from scratch using raw Tailwind utility strings.
- Example: A primary action button is implemented differently in 5 separate screens:
  - `/invoices/new`: `rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20`
  - `/imports/new`: `inline-flex items-center justify-center font-medium ... bg-indigo-600 text-white rounded-md h-10 px-4 text-sm`
  - `/parties`: `inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white`
  - `/approvals`: `rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white`
  - `/reports/trial-balance`: `rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3.5 py-1.5 text-xs font-bold`

### 2.2 Form Controls Height & Alignment Inconsistencies
- Native `<input>` elements use `px-2 py-1.5 text-xs` in some forms, `p-2 text-slate-900` in others, and `px-3 py-2 text-xs` in others.
- Native `<select>` elements do not align in height or baseline with adjacent `<input>` elements when placed in multi-column grids (e.g. in `/invoices/new` and `/parties`).

### 2.3 Status Color Discrepancies
- **Green / Success**: Mixed usage of Tailwind `emerald-*` (`text-emerald-700 bg-emerald-100`) and `green-*` (`text-green-600`).
- **Amber / Warning**: Mixed usage of `amber-*` and `yellow-*` for clarification and pending approvals.
- **Blue / Informational**: Mixed usage of `blue-*`, `indigo-*`, and `violet-*` for badges.
- **Red / Blocked**: Mixed usage of `rose-*` and `red-*`.

### 2.4 Tables and Financial Figures Alignment
- 12 ad-hoc tables have varying column header paddings (`py-2 px-2`, `py-3 px-4`, `py-2.5 px-3`).
- Many amount cells use `font-mono` without `tabular-nums`, resulting in misaligned decimal columns across rows.
- Formatting varies between `toFixed(2)`, `toLocaleString('en-IN')`, and raw number outputs.

### 2.5 Destructive / Escalation Confirmations
- Rejections and errors use synchronous, unstyled browser `prompt()` and `alert()` dialogs (e.g., `prompt('Please enter reason for rejection:')` in `/approvals/page.tsx:56` and `/invoices/[id]/page.tsx:59`).

---

## 3. Accessibility Gaps (WCAG 2.2 AA)

1. **Form Labels Association**:
   - In multiple forms (`/parties/page.tsx`, `/items/page.tsx`, `/invoices/new/page.tsx`), inputs are preceded by `<label className="...">Name</label>` without `htmlFor` matching an input `id`. Screen readers fail to announce the label when the input receives focus.
2. **Missing Accessible Names on Icon-Only Buttons**:
   - Several icon-only buttons (such as line item removal trash buttons, modal close `X` buttons) lack `aria-label` attributes.
3. **Modal Focus Management**:
   - Custom modals (Parties, Items, Companies, Ledgers) lack focus traps. Pressing `Tab` cycles focus into the hidden background page elements.
   - Modals lack `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.
4. **Color Contrast Failures**:
   - Text rendered with `text-slate-400` on white or light gray backgrounds has a contrast ratio of ~2.8:1, failing the WCAG AA minimum threshold of 4.5:1 for normal text.
5. **Keyboard Escape Handling**:
   - Custom modals in `/parties` and `/items` do not dismiss on pressing the `Escape` key.

---

## 4. Architecture Smells

1. **Massive Component File Sizes (Violation of <150 line rule)**:
   - `apps/web/src/app/imports/new/page.tsx`: **815 lines**
   - `apps/web/src/app/invoices/new/page.tsx`: **705 lines**
   - `apps/web/src/app/banking/page.tsx`: **614 lines**
   - `apps/web/src/components/navigation.tsx`: **524 lines** (dead code)
   - `apps/web/src/app/parties/page.tsx`: **491 lines**
   - `apps/web/src/app/invoices/[id]/page.tsx`: **481 lines**
   - `apps/web/src/app/settings/ledgers/page.tsx`: **465 lines**
   - `apps/web/src/app/settings/companies/page.tsx`: **458 lines**
   - `apps/web/src/app/items/page.tsx`: **429 lines**
   - `apps/web/src/app/banking/discovery/page.tsx`: **403 lines**
   - `apps/web/src/app/banking/[id]/reconcile/page.tsx`: **407 lines**
2. **Server State via Raw `useEffect` Promises**:
   - **42 instances of `useEffect` fetching** directly via raw promises (`.then().catch()`) rather than TanStack Query.
   - Missing request deduplication, optimistic updates, background caching, and automatic refetch on window focus.
3. **Extensive Use of `any` Types**:
   - **70 instances of `: any`** in `apps/web/src/`, including API client return values (`request<any>`), entity parameters, and state variables.
4. **Dead / Orphaned Code**:
   - `apps/web/src/components/navigation.tsx` (524 lines) is fully superseded by `AppShell`, `Sidebar`, and `TopHeader`, but remains unreferenced in the bundle.
5. **Business Calculation in Presentational Code**:
   - Place of Supply tax math, discount calculations, and pre-round sum aggregations are calculated directly within JSX components rather than pure shared domain helpers or custom hooks.

---

## 5. Backend Contract Issues Affecting the UI

1. **Inconsistent Response Wrapping**:
   - `HealthController` returns `{ success: true, data: { status, database } }`.
   - Feature controllers (`InvoiceController`, `PartyController`, `ItemController`, `VoucherController`) return direct DTO arrays or entity objects.
   - The web `apiClient` contains an ad-hoc unwrap fallback (`return json?.data ?? json;`).
2. **Hardcoded Context Defaults**:
   - `apps/web/src/lib/api-client.ts` hardcodes `DEFAULT_COMPANY_ID = 'c0000000-0000-4000-8000-000000000001'` across all API methods rather than reading active company context dynamically.
3. **Lack of Standard Pagination & Sorting Metadata**:
   - Lists (`parties`, `items`, `invoices`, `vouchers`) return unpaginated or raw arrays without total count, page size, hasNextPage, or sort direction in envelope metadata.
4. **Ad-hoc Error Structures**:
   - When validations fail, the backend returns NestJS `BadRequestException` with string or string array (`message: string[]`). The frontend handles this with fragile ternary parsing.

---

## 6. Baseline Metrics

| Metric | Current State | Target / Threshold |
|---|---|---|
| **Raw `<button>` Elements in Pages** | 65 | 0 (100% `@platform/ui`) |
| **Raw `<input>` Elements in Pages** | 54 | 0 (100% `@platform/ui`) |
| **Raw `<select>` Elements in Pages** | 16 | 0 (100% canonical Select) |
| **Ad-Hoc `<table>` Implementations** | 12 | 0 (100% canonical DataTable) |
| **Browser `alert()` / `prompt()` calls** | 15 | 0 (100% accessible Modal/Toast) |
| **`useEffect` Data Fetching Chains** | 42 | 0 (100% TanStack Query hooks) |
| **`any` Types in Frontend (`apps/web`)** | 70 | 0 (Strict TypeScript strict mode) |
| **Dead Code (`navigation.tsx`)** | 524 lines | 0 lines (deleted) |
| **Oversized Components (>150 lines)** | 14 files | 0 files |
| **Radix UI Primitives Installed** | 0 | Installed & encapsulated in `packages/ui` |
| **CVA (`class-variance-authority`)** | Not installed | Installed for all component variants |
| **Storybook / Component Visual Tests** | 0 | Configured in `packages/ui` |
| **Next.js Production Build JS Size** | 113 kB First Load JS | < 120 kB First Load JS |

---

## 7. Prioritised Findings & Effort Estimates

| Severity | Finding | Impact | Effort Estimate |
|---|---|---|---|
| **CRITICAL** | **Browser `alert()` and `prompt()` usage** for accounting operations (voucher posting, approval rejection, batch errors) | Blocks user workflow, non-accessible, breaks dark theme, no auditability | 4 hours |
| **CRITICAL** | **Unencapsulated Radix Primitives & Focus Traps** in custom modals | Severe WCAG violation; screen readers and keyboard users cannot escape dialogs | 8 hours |
| **HIGH** | **Token & Design System Fragmentation**: 65 buttons, 54 inputs, 16 selects, 12 tables bypassing `packages/ui` | Visual drift, inconsistent heights, unmaintainable styling, dark mode glitches | 16 hours |
| **HIGH** | **Server State Architecture**: 42 raw `useEffect` promise chains instead of TanStack Query | No caching, duplicate API roundtrips, race conditions, memory leaks on unmount | 12 hours |
| **MEDIUM** | **Component Monoliths (>150 lines)** in 14 files (up to 815 lines) | High cognitive load, un-testable presentation, mixed domain & render logic | 12 hours |
| **MEDIUM** | **70 `any` Types & Untyped `apiClient` Contracts** | Type safety holes, unexpected runtime null/undefined errors | 6 hours |
| **LOW** | **Dead Code**: `navigation.tsx` (524 lines) remaining in bundle | Repository bloat, confusion regarding source of truth | 1 hour |

---

> **Audit Status:** COMPLETE. All findings documented without modifying feature code.  
> **Awaiting User Approval** to proceed to Step B (Refactor Plan).

