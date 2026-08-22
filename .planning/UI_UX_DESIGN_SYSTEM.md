# Architectural Botanical Ledger: Master UI/UX Design System
**Project**: ZamZam Real Estate Brokerage CRM & Advisory Platform  
**Version**: 2.0.0 (Fresh Build — Anti-AI-Slop Hallmark Architectural Baseline)  
**Methodologies Applied**: `/agency-ux-architect`, `/agency-ui-designer`, `/hallmark`, `/agent-reach`  
**Operational Benchmarks**: Leadrat (Speed & Disposition), Brixi AI (4-Pillar Qualification Scorecard), CRMThread (Pipeline Visibility & Speed-to-Lead)

---

## 1. Design Philosophy & Mental Model

### 1.1 The "Spreadsheet-Speed" Interaction Model
Real estate telecallers and sales brokers handle high volume (80–150 touches/day). Traditional bloated SaaS CRMs fail because modal dialogs, multi-step forms, and slow transitions force brokers back into Excel sheets.

Our UX architecture establishes the **Spreadsheet-Speed Hybrid Console**:
1. **Fixed 40px Row Density**: View 20+ leads at a glance without scrolling.
2. **Persistent Dual-Pane Action Drawer**: Clicking a lead instantly reveals the Brixi AI qualification scorecard, call log, and requirement profiler on the right without closing the grid or reloading the page.
3. **1-Click Color-Coded Disposition Bar**: Immediate single-keystroke or single-click dispositioning (*Connected - High Intent*, *Visit Booked*, *WhatsApp Shared*, *No Answer*, *Busy*, *Price Objection*, *Drop*).
4. **Speed-to-Lead SLA Countdown**: Prominent live badge (< 5 mins target) for fresh inbound leads from YouTube, Instagram, and WhatsApp.

---

## 2. Hallmark-Grade Design Tokens (`css/design-system.css`)

```css
:root {
  /* ==========================================================================
     1. COLOR SYSTEM (Architectural Botanical Ledger)
     ========================================================================== */
  
  /* Primary Brand: Deep Cypress Forest Green (Authority, Wealth, Land) */
  --color-primary: #1B4332;
  --color-primary-light: #2D6A4F;
  --color-primary-dark: #081C15;
  --color-primary-surface: #E8F5E9;
  --color-primary-border: #A3D9B1;

  /* Accent: Warm Terracotta & Amber Ochre (High-Intent, Callbacks, Action Prompts) */
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

  /* Semantic Status Palette */
  --color-status-success: #15803D; /* Verified MahaRERA, Deal Won, Connected */
  --color-status-success-bg: #DCFCE7;
  --color-status-warning: #B45309; /* SLA Expiring, Pending Follow-up */
  --color-status-warning-bg: #FEF3C7;
  --color-status-danger: #B91C1C;  /* Stale Inventory (>14d), Lost Lead */
  --color-status-danger-bg: #FEE2E2;
  --color-status-info: #1D4ED8;    /* Telemetry Trigger, Client Portal Active */
  --color-status-info-bg: #DBEAFE;

  /* ==========================================================================
     2. TYPOGRAPHY HIERARCHY
     ========================================================================== */
  --font-family-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Space Grotesk', ui-monospace, SFMono-Regular, monospace;

  --text-xs: 0.6875rem; /* 11px - Micro labels, uppercase tags */
  --text-sm: 0.8125rem; /* 13px - Dense table rows, secondary metadata */
  --text-base: 0.875rem;/* 14px - Primary UI text, buttons, form inputs */
  --text-md: 1rem;      /* 16px - Section cards, key data headers */
  --text-lg: 1.125rem;  /* 18px - Subheaders, drawer titles */
  --text-xl: 1.375rem;  /* 22px - Section headings */
  --text-2xl: 1.75rem;  /* 28px - Dashboard stat displays */

  /* ==========================================================================
     3. SPACING & LAYOUT (4px Rhythm)
     ========================================================================== */
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-5: 1.25rem;  /* 20px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-12: 3rem;    /* 48px */

  /* ==========================================================================
     4. ELEVATIONS, BORDERS & SHADOWS
     ========================================================================== */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-pill: 9999px;

  --shadow-sm: 0 1px 2px 0 rgba(27, 67, 50, 0.04);
  --shadow-md: 0 4px 6px -1px rgba(27, 67, 50, 0.08), 0 2px 4px -2px rgba(27, 67, 50, 0.04);
  --shadow-lg: 0 10px 15px -3px rgba(27, 67, 50, 0.1), 0 4px 6px -4px rgba(27, 67, 50, 0.05);

  --transition-fast: 120ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 3. The 8 Core Screen Architectures

### Screen 1: Telecaller Lead Calling Console (`/leads/caller-console`)
- **Persona**: `TELECALLER`
- **Layout**: Dual-pane grid (60% lead queue table, 40% persistent caller drawer).
- **Key Modules**:
  - Top SLA speed-to-lead status banner (e.g. `🔥 3 Fresh Social Inbounds (< 5m SLA)`).
  - 40px row table with keyboard navigation (Up/Down arrows, Space to call, Enter to save).
  - Brixi AI 4-Pillar Scorecard:
    - `01 INTENT`: [Exploring] [Comparing] [Ready to Buy (Hot)]
    - `02 BUDGET`: [₹40L-₹65L (Taloja)] [₹85L-₹1.75Cr (Kharghar)] [Stretch] [Mismatch]
    - `03 LOCATION`: [Kharghar 1-20] [Kharghar 34-36] [Taloja P1/P2]
    - `04 TIMELINE`: [0-30 Days (Assign Broker)] [31-90 Days (Nurture)] [90+ Days]
  - 1-Click Call Disposition bar:
    - Green: `Connected - High Intent`
    - Amber: `Visit Booked`, `WhatsApp Shared`
    - Slate: `No Answer`, `Busy`, `Callback Scheduled`
    - Red: `Price Objection`, `Lost / Drop`

### Screen 2: Master CRM Pipeline & Leads Board (`/leads`)
- **Persona**: `SALES_EXECUTIVE`, `BROKER_MANAGER`
- **Layout**: 7-Stage Kanban Board with instant Table-View toggle.
- **Stages**:
  1. `NEW_INBOUND` (Attribution source badge: YouTube Review, Instagram Reel, WA QR)
  2. `CONTACTED_QUALIFIED` (Brixi Score >= 75%)
  3. `REQUIREMENT_MATCHED` (Matched with >= 2 RERA properties)
  4. `PORTAL_ACTIVE` (Client Portal viewed, live telemetry pulse)
  5. `SITE_VISIT_SCHEDULED` (Cab & driver assigned)
  6. `NEGOTIATION_TOKEN` (Token amount logged)
  7. `DEAL_CLOSED_WON` (Commission milestone active)

### Screen 3: MahaRERA Verified Inventory & Statutory Cost Engine (`/inventory`)
- **Persona**: `SALES_EXECUTIVE`, `SUPER_ADMIN`
- **Layout**: Micro-market tab switcher (Kharghar Sectors 1–20, Sectors 34–36, Taloja Phase 1 & 2) + Live Cost Calculator side-card.
- **Key Modules**:
  - 14-Day Anti-Staleness Verification Badge (`✅ Verified 3d ago` vs `⚠️ Stale - Verification Required`).
  - Statutory Cost Engine ($C_{\text{all-in}}$):
    - Base Agreement Value
    - Maharashtra Stamp Duty (6%)
    - Fixed Registration Charges (₹30,000)
    - Statutory GST (5% Under Construction / 0% Ready OC)
    - Floor Rise & Covered Parking
    - Society Development / Corpus Fund
    - Instant Net All-In Capitalized Total in `JetBrains Mono`

### Screen 4: Consultative Requirement Matchmaker (`/matching`)
- **Persona**: `SALES_EXECUTIVE`
- **Layout**: Split comparison screen — Left: Buyer Wishlist Profiler, Right: 5-Factor Weighted Ranked Matches.
- **Scoring Weight Breakdown**:
  - Budget Tolerance (30%) — Disqualify if > +5%
  - Location & Sector Fit (25%)
  - Transit & Metro Distance (20%) — Kharghar Metro / Highway accessibility
  - Possession & OC Status (15%)
  - Configuration & Carpet Area (10%)
- **Action**: 1-Click "Generate Client Portal" or "Share WhatsApp Comparison Card".

### Screen 5: Client Property Presentation Portal & Broker Telemetry (`/p/[token]`)
- **Persona**: `BUYER` (Client view) & `SALES_EXECUTIVE` (Telemetry console)
- **Buyer View**: Clean, branded presentation with verified floor plans, 3D walkthrough video embeds, MahaRERA QR code, and interactive statutory cost breakdown.
- **Broker Live Telemetry Drawer**:
  - Real-time event notifications (`"Client opened Floor Plan B"`, `"Dwell time: 4m 12s on Cost Sheet"`).
  - Intent classification (`HOT_PROSPECT` triggered after 3+ interactions).

### Screen 6: Escorted Site Visit Itinerary Planner (`/visits`)
- **Persona**: `SALES_EXECUTIVE`, `BROKER_MANAGER`
- **Layout**: Interactive day itinerary builder with Google Maps route optimization.
- **Key Modules**:
  - Multi-project stop sequencing (e.g. Stop 1: Sector 35 Project A $\rightarrow$ Stop 2: Sector 20 Project B).
  - Logistics dispatcher (Driver assignment, Station pickup point, AC Cab details).
  - 1-Click "Send WhatsApp Tour Card" with live Google Maps navigation links.
  - Post-visit 5-star rating & objection logger (Price, Layout, Distance, Vastu).

### Screen 7: Deal Closing Commission Ledger & GST Invoicing (`/deals`)
- **Persona**: `SUPER_ADMIN`, `BROKER_MANAGER`
- **Layout**: 4-Stage deal milestone tracker + Developer Invoicing Generator.
- **Key Modules**:
  - Milestone progression: Token (₹1 Lakh) $\rightarrow$ Agreement 10% $\rightarrow$ Bank Loan Sanction $\rightarrow$ Full Brokerage Disbursed.
  - 2.5% Gross Commission Split Matrix:
    - Developer Gross Payout (e.g. ₹2,50,000 on ₹1 Cr deal)
    - Firm Net Retention vs Sales Rep Share (e.g. 60% / 40%)
    - Referral / Co-Broker split deduction
  - MahaRERA & 18% GST Compliant Tax Invoice Generator with downloadable PDF preview.

### Screen 8: Super Admin RBAC & Phone Line Manager (`/admin/roles-permissions`)
- **Persona**: `SUPER_ADMIN`
- **Layout**: Multi-tenant RBAC permissions grid + Cloud Telephony pool management.
- **Key Modules**:
  - Granular RBAC Matrix: Super Admin, Broker Manager, Sales Executive, Telecaller.
  - WhatsApp Cloud API & Exotel Phone Pool mapping (assign virtual numbers to caller queues).
  - Real-time audit logs of lead exports, phone number unmasking, and commission edits.
