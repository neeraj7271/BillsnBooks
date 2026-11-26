# UI Redesign Log — Antigravity Books / BillsnBooks (`ux/refresh-v2`)

**Branch:** `ux/refresh-v2` (branched off `dev`)
**Rule:** Backend (`apps/api/**`, `packages/accounting-core/**`, `packages/gst-rules/**`, migrations, seeds) frozen — UI refresh only.

| Section | Summary of Changes | Before / After Screenshots | Commit SHA |
|---|---|---|---|
| 1. Design System & Codemod | Inter + JetBrains Mono (`next/font/google`), explicit type scale (`display`..`mono`), semantic tokens (`--color-text-strong`, `--color-row-hover`, `--color-row-stripe`, `--color-focus-ring`, `--color-skeleton`), `compact`/`comfortable` density modes, hardened `MoneyText`/`DateText`, `packages/ui/src/__docs__/primitives.docs.tsx`, `lint:tokens` CI gate, and 6,232-token codemod across 119 files. | `tests/e2e/baselines/before/` | Pending commit |
