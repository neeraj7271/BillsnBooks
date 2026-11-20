# Frontend UI Guidelines & Design System Enforcement

> **MANDATORY POLICY**: Every frontend task, feature, component, and screen must adhere strictly to these principles and rules. Any deviation constitutes a failed Definition of Done (DoD).

---

## 1. Core UI Principles

1. **One Source of Truth**: All visual values (colors, spacing, radius, elevation, typography, transitions) originate strictly from design tokens defined in `packages/ui`. Hard-coded hex colors, pixel values, and magic numbers in feature code are strictly prohibited.
2. **Consistency Over Novelty**: The same problem is solved the same way across all screens. Re-use existing patterns; if a pattern is missing, add it to `packages/ui` first.
3. **Reuse, Never Re-Implement**: Feature code may never build custom buttons, inputs, selects, modals, tables, toggles, or cards. Everything must be imported from `@platform/ui`.
4. **Clarity First**: Single primary action per view. High contrast, clear visual hierarchy, plain-language labels, and explicit user-facing error messages explaining cause and resolution.
5. **Progressive Disclosure**: Surface the primary workflow clearly; tuck advanced options into drawers, sheets, or expandable sections. Support density settings (`comfortable` vs `compact`).
6. **Explicit Feedback & Irreversible Guardrails**: Hover, focus-visible, active, disabled, loading, success, and error states on every interactive element. Destructive or irreversible operations (posting vouchers, period locking, reversals) require modal confirmation stating the consequence.
7. **Forgiveness & Draft Preservation**: Warn before discarding dirty form state. Prefer reversible workflows over rigid blocks.
8. **Error Prevention**: Inline validation on blur/change via React Hook Form + Zod. Input masks for statutory identifiers (GSTIN, PAN, IFSC, dates, currency). Actions are disabled-with-reason rather than hidden.
9. **Accessibility First (WCAG 2.2 AA)**: Complete keyboard navigation, visible focus rings, ARIA roles/labels, 4.5:1 text contrast, 44px touch targets on mobile, respect `prefers-reduced-motion`, and dual-encoding (never rely on color alone).
10. **Predictable Anatomy**: Consistent page layout: Page Header (title, breadcrumbs, primary action) $\rightarrow$ Toolbar/Filters $\rightarrow$ Content/Table $\rightarrow$ Pagination/Footer. Actions in dialogs always follow: Primary on Right, Dismiss/Cancel on Left.
11. **First-Class Numbers & Dates**:
    - Currency: Right-aligned, `tabular-nums`, Indian grouping (₹1,23,456.00), consistent 2/4 decimals.
    - Dates: Standard format `DD/MM/YYYY`.
    - Distinct debit vs. credit indicators.
12. **Mobile-First for Operational Views**: Invoices, approvals, banking alerts, and collections are fully responsive on mobile (card views or sticky-first-column scroll).
13. **Performance as UX**: Skeletons over spinners, no layout shift (CLS = 0), minimal client-side JavaScript, server state cached via TanStack Query.
14. **Light & Dark Theme Parity**: Every component supports both themes through CSS semantic tokens only.
15. **Restrained Modernism**: Clean surfaces, soft radii, subtle borders, 150–250ms ease-out transitions, universal Command Palette (`Cmd+K`), and keyboard shortcuts.

---

## 2. Component Contract (`packages/ui`)

- **Radix UI Primitives**: Built on headless accessible primitives (`@radix-ui/react-*`).
- **Styling**: `class-variance-authority` (CVA) + `tailwind-merge` + design tokens.
- **Uniform Component Props**: `variant`, `size`, `tone/intent`, `disabled`, `loading`, `className`, ref forwarding, and `asChild` composition.
- **Zero Business Logic**: Components in `packages/ui` are pure presentation. No data fetching, no domain business rules.

---

## 3. Architecture & Code Structure

- **Feature-Based Packaging**: `apps/web/src/features/<feature>/` containing `{ components, hooks, api, schemas, types }`.
- **Smart/Dumb Separation**: Page components handle routing and layout; container components handle query orchestration; presentational components receive props only.
- **Server State**: Managed via TanStack Query with central query-key factories. No raw `useEffect` promise chains for data loading.
- **Form Architecture**: React Hook Form + Zod schemas (shared with domain/backend where feasible).
- **Component File Size**: Target under ~150 lines per component; extract sub-components and custom hooks for complex logic.
- **Strict TypeScript**: Zero `any`. All API responses and form inputs are strictly typed.

