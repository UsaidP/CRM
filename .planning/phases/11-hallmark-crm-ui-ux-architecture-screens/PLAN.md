# Phase 11: Fresh Anti-AI-Slop UI/UX Architecture & Stitch Screen Suite

## Objective
Establish a ground-up, Hallmark-grade visual design system and interaction architecture for the ZamZam Real Estate Brokerage CRM & Advisory Platform. Replace all legacy dark/monochrome interfaces with the high-authority **Architectural Botanical Ledger** palette (Cypress Forest Green `#1B4332`, Amber Ochre `#D97706`, Tactile Alabaster `#FBFBF9`, and JetBrains Mono tabular figures). Deliver the 8 core operational screens modeled after industry benchmarks (**Leadrat**, **Brixi AI** 4-pillar qualification scorecards, and **CRMThread** speed-to-lead pipelines).

---

## 1. System Design Tokens & Theme Foundation

### 1.1 Color Tokens (`tokens.css`)
```css
:root {
  /* Primary Brand: Deep Cypress Forest Green (Authority, Permanence, Wealth) */
  --color-primary: #1B4332;
  --color-primary-light: #2D6A4F;
  --color-primary-dark: #081C15;
  --color-primary-surface: #E8F5E9;
  --color-primary-border: #A3D9B1;

  /* Accent: Warm Terracotta & Amber Ochre (High-Intent, Callbacks, Prompts) */
  --color-accent: #D97706;
  --color-accent-hover: #B45309;
  --color-accent-subtle: #FEF3C7;
  --color-accent-border: #FCD34D;

  /* Neutral Backgrounds: Tactile Alabaster & Warm Linen */
  --color-bg-canvas: #FBFBF9;
  --color-bg-surface: #FFFFFF;
  --color-bg-muted: #F3EFEA;
  --color-bg-subtle: #EFEAE1;
  --color-bg-inset: #F8F6F0;

  /* High-Contrast Typography */
  --color-text-primary: #111827;
  --color-text-secondary: #4B5563;
  --color-text-muted: #6B7280;
  --color-text-inverse: #FFFFFF;

  /* Architectural Hairlines */
  --color-border: #E5E0D8;
  --color-border-subtle: #F0EBE1;
  --color-border-strong: #D1C7B7;

  /* Semantic Status Indicators */
  --color-status-success: #15803D; /* Verified MahaRERA, Deal Won, Connected */
  --color-status-success-bg: #DCFCE7;
  --color-status-warning: #B45309; /* SLA Expiring, Pending Follow-up */
  --color-status-warning-bg: #FEF3C7;
  --color-status-danger: #B91C1C;  /* Stale Inventory (>14d), Lost Lead */
  --color-status-danger-bg: #FEE2E2;
  --color-status-info: #1D4ED8;    /* Telemetry Trigger, Client Portal Active */
  --color-status-info-bg: #DBEAFE;

  /* Elevation & Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(27, 67, 50, 0.04);
  --shadow-md: 0 4px 6px -1px rgba(27, 67, 50, 0.08), 0 2px 4px -2px rgba(27, 67, 50, 0.04);
  --shadow-lg: 0 10px 15px -3px rgba(27, 67, 50, 0.1), 0 4px 6px -4px rgba(27, 67, 50, 0.05);
}
```

### 1.2 Typography Stack
- **Display & Headings**: `Plus Jakarta Sans` / `Manrope` (700 Bold / 600 SemiBold)
- **Body & Controls**: `Plus Jakarta Sans` / `Inter` (400 Regular / 500 Medium)
- **Tabular Figures, RERA IDs, Pricing & Phone**: `JetBrains Mono` / `Space Grotesk`

---

## 2. Benchmark Integration Architecture

### 2.1 Brixi AI Lead Qualification Scorecard
Integrated directly into the Telecaller Console:
1. **01 INTENT**: Exploring (Warm) vs Comparing (Warm) vs Ready to Buy (Hot).
2. **02 BUDGET**: ₹40L–₹65L (Taloja) vs ₹85L–₹1.75Cr (Kharghar) vs Mismatch.
3. **03 LOCATION**: Sector 1–20 vs Sector 34–36 vs Taloja Phase 1/2.
4. **04 TIMELINE**: 0–30 Days (Hot $\rightarrow$ Assign Broker) vs 31–90 Days (Nurture) vs 90+ Days (Future Alert).

### 2.2 Leadrat Telecalling & Speed-to-Lead Mechanics
- **Zero-Modal Spreadsheet Grid**: 40px row height, arrow key traversal, instant right-side action drawer.
- **1-Click Call Dispositions**: *Connected - High Intent*, *Visit Booked*, *WhatsApp Shared*, *No Answer*, *Busy*, *Price Objection*, *Drop*.
- **Auto-Advancing Queue**: Speed-to-lead countdown clock (e.g. `< 5 mins` for fresh Instagram/YouTube inbounds).

### 2.3 CRMThread Visibility & Deal Journey
- Full visibility from Lead Inbound $\rightarrow$ First Telecall $\rightarrow$ Requirement Match $\rightarrow$ Escorted Site Visit $\rightarrow$ Deal Negotiation $\rightarrow$ Commission Invoicing.

---

## 3. Screen Generation Matrix for Stitch MCP

| # | Screen Name | Route | Role Focus | Core UI Sections |
|---|---|---|---|---|
| **01** | **Telecaller Lead Calling Console** | `/leads/caller-console` | `TELECALLER` | Dual-pane high-density grid (40px rows), persistent action drawer, Brixi 4-pillar scorecard, 1-click disposition bar, SLA timers. |
| **02** | **Master CRM Pipeline & Leads Board** | `/leads` | `SALES_EXECUTIVE`, `BROKER_MANAGER` | Kanban & Dense Table switcher, 7-stage pipeline, social attribution tags (YouTube/Insta/WA), quick filter bar. |
| **03** | **MahaRERA Verified Inventory & Cost Engine** | `/inventory` | `SALES_EXECUTIVE`, `SUPER_ADMIN` | Sector filter chips (Kharghar 1–20, 34–36, Taloja 1–2), 14-day freshness badge, live statutory all-in cost calculator. |
| **04** | **Consultative Requirement Matchmaker** | `/matching` | `SALES_EXECUTIVE` | Buyer wish-list profiler vs 5-factor weighted property scoring console (0–100%), 1-click comparison card generator. |
| **05** | **Client Property Presentation & Telemetry** | `/p/[token]` & `/portals/analytics` | `BUYER` & `SALES_EXECUTIVE` | Luxury client web portal with floor plans/video tours + Broker live event feed (dwell time, brochure download, hot intent score). |
| **06** | **Escorted Site Visit Itinerary Planner** | `/visits` | `SALES_EXECUTIVE`, `BROKER_MANAGER` | Multi-stop day tour builder, cab/driver dispatch details, WhatsApp itinerary generator, post-visit 5-star objection logger. |
| **07** | **Deal Closing Ledger & GST Invoicing** | `/deals` | `SUPER_ADMIN`, `BROKER_MANAGER` | 4-Stage deal milestone tracker, 2.5% brokerage split breakdown (rep share vs firm net), 18% GST developer invoice preview. |
| **08** | **Super Admin RBAC & Phone Line Manager** | `/admin/roles-permissions` | `SUPER_ADMIN` | Role permission matrix (Super Admin, Manager, Broker, Caller), WhatsApp Cloud API & Exotel phone pool management. |

---

## 4. Verification & Testing Criteria
1. **Visual Anti-Slop Audit**: All screens strictly use token variables (`var(--color-primary)`, `var(--color-accent)`), no generic gray/blue palettes.
2. **Tabular Typography**: All budgets, phone numbers, and RERA IDs formatted in `JetBrains Mono`.
3. **Responsive Breakpoints**: 320px, 375px, 414px, 768px, 1024px, 1440px with `overflow-x: clip`.
4. **Interactive States**: 8-state discipline (default, hover, active, focus-visible, disabled, loading, error, success).
