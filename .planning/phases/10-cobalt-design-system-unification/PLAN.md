# Phase 10 Plan: Cobalt Modern-Minimal Design System Unification

**Phase**: 10  
**Name**: Cobalt Modern-Minimal Design System Unification & Legacy Theme Deprecation  
**Agents**: `/agency-frontend-developer`, `/agency-ui-designer`, `/agency-ux-architect`  
**Status**: Ready for Execution  

---

## 1. Executive Summary & Design System Scope

Phase 10 establishes the **Cobalt Modern-Minimal Design System** as the unified, single-source-of-truth visual language for the entire ZamZam Properties CRM & Client Portal suite. It completely purges the legacy multi-theme engine (removing `gold-ink` and `monochrome` themes) and elevates the high-precision, developer-grade **Dark Workbench** aesthetic with an **Electric Cobalt signal accent** (`oklch(60% 0.18 256)`), **Space Grotesk** display typography, **Inter** body UI, **JetBrains Mono** telemetry/financial data, and **1px ruler-drawn hairlines**.

---

## 2. Design System Architecture & Token Specifications

### 2.1 Color Palette & OKLCH Tokens
* **Neutral Canvas & Surfaces (Dark Workbench)**:
  * `--color-canvas`: `oklch(18% 0.014 258)` (`#121722`) — Main app canvas
  * `--color-surface`: `oklch(22% 0.016 258)` (`#181e2b`) — Sidebar, headers, secondary backgrounds
  * `--color-surface-subtle`: `oklch(25% 0.017 258)` (`#1e2536`) — Cards, table panels, dialogs
  * `--color-surface-raised`: `oklch(27% 0.018 258)` (`#242c3f`) — Elevated controls, active cards, hover surfaces
  * `--color-surface-inset`: `oklch(15% 0.014 258)` (`#0c1017`) — Input fields, inner dense code blocks
  * `--color-surface-muted`: `oklch(29% 0.018 258)` (`#2b344a`) — Secondary container badges
* **Foreground & Text Scale**:
  * `--color-text-primary`: `oklch(96% 0.006 250)` (`#f1f5f9`) — Primary headings, key metrics
  * `--color-text-secondary`: `oklch(87% 0.009 250)` (`#cbd5e1`) — Body text, readable table data
  * `--color-text-muted`: `oklch(70% 0.012 252)` (`#94a3b8`) — Helper text, timestamps, labels
  * `--color-text-disabled`: `oklch(53% 0.012 254)` (`#64748b`) — Disabled elements
  * `--color-text-inverse`: `oklch(18% 0.025 258)` (`#0f172a`) — Text on solid electric cobalt fills
* **Electric Cobalt Signal Accent (Discipline: <5% Viewport Area)**:
  * `--color-accent` / `--color-action-primary`: `oklch(60% 0.18 256)` (`#2563eb`)
  * `--color-accent-hover`: `oklch(66% 0.16 256)` (`#3b82f6`)
  * `--color-accent-active`: `oklch(56% 0.17 256)` (`#1d4ed8`)
  * `--color-accent-soft`: `oklch(29% 0.055 256)` / `rgba(37, 99, 235, 0.16)`
  * `--color-accent-text`: `oklch(82% 0.1 256)` (`#93c5fd`)
  * `--color-focus-ring`: `oklch(60% 0.18 256)` (2px visible ring, 2px offset)
* **Borders & Dividers**:
  * `--color-border-default`: `oklch(34% 0.018 258)` / `rgba(148, 163, 184, 0.18)`
  * `--color-border-subtle`: `oklch(34% 0.018 258 / 0.5)` / `rgba(148, 163, 184, 0.10)`
  * `--color-border-strong`: `oklch(44% 0.02 258)` / `rgba(59, 130, 246, 0.45)`
* **Semantic Status Scale**:
  * Success: `oklch(50% 0.13 150)` (`#10b981`) / Surface: `oklch(27% 0.045 150 / 0.35)`
  * Warning: `oklch(64% 0.15 72)` (`#f59e0b`) / Surface: `oklch(29% 0.045 72 / 0.35)`
  * Danger: `oklch(54% 0.19 25)` (`#ef4444`) / Surface: `oklch(28% 0.05 25 / 0.35)`
  * Info: `oklch(58% 0.13 225)` (`#0ea5e9`) / Surface: `oklch(28% 0.04 225 / 0.35)`

### 2.2 Typography & Spacing System
* **Display / Headings**: Space Grotesk (400, 600, 700) — upright roman only.
* **Body UI**: Inter / Plus Jakarta Sans (400, 500, 600, 700).
* **Data / Monospace**: JetBrains Mono / Geist Mono (400, 500, 600, 700).
* **Spacing**: 4px rhythm (`4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`, `40px`, `48px`).
* **Radii**: 6px (`0.375rem`) for buttons, inputs, pills; 10-12px (`0.625-0.75rem`) for panels & cards.

---

## 3. Work Breakdown & Refactoring Steps

1. **Step 1: CSS Token Unification (`src/app/globals.css`)**
   - Place Cobalt tokens directly into `:root` and `.theme-cobalt`.
   - Remove legacy `.theme-gold-ink` and `.theme-monochrome` rules, `.rule-gold`, `.rule-mono`, `.btn-gold`, `.badge-gold`.
   - Implement new utility classes: `.btn-cobalt`, `.badge-cobalt`, `.rule-cobalt`, `.card-cobalt`, `.input-cobalt`.
2. **Step 2: Tailwind Extended Tokens (`tailwind.config.js`)**
   - Expose canvas, surface, accent, text, border, status, and channel tokens.
   - Configure typography font stacks.
3. **Step 3: Layout & Theme Simplification**
   - Update `src/app/layout.tsx` to set `className="theme-cobalt dark"` and `data-theme="cobalt"`.
   - Streamline `ThemeProvider.tsx` and deprecate multi-theme toggle in `AppShell.tsx`.
4. **Step 4: UI Primitives & Stamps**
   - Update `HallmarkStamp.tsx` and `AccessibleDialog.tsx`.
5. **Step 5: Full Component Refactoring Across All CRM Modules**
   - Operations Cockpit (`src/app/page.tsx`).
   - Verified Inventory (`InventoryClient.tsx`, `ProjectDetailsModal.tsx`, `CsvImportModal.tsx`, `ScraperControlModal.tsx`, `MediaUploader.tsx`).
   - Leads Management (`LeadsMatrixClient.tsx`, `LeadCsvImportModal.tsx`, `CallLogModal.tsx`, `ContactMergeModal.tsx`, `SourceEvidenceDrawer.tsx`).
   - Campaign Attribution (`CampaignAttributionManager.tsx`, `campaign-attribution.ts`).
   - Portals, Deals, Visits, Matching, Calendar & Analytics (`ClientPortalView.tsx`, `DealsLedgerClient.tsx`, `CalendarViewClient.tsx`, `AnalyticsClient.tsx`, and route pages).
6. **Step 6: Documentation Update**
   - Overhaul `.planning/UI_UX_DESIGN_SYSTEM.md` with complete Cobalt specs.
7. **Step 7: Verification & Build Validation**
   - Run `bun test` and `bun run build`.
