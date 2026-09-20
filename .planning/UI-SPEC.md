# UI-SPEC: Enterprise Real Estate CRM Landing Page & Firm Onboarding
**Document Type**: GSD UI Design Contract (`/gsd-ui-phase` & `/agency-ux-researcher`)  
**Product**: ZamZam Real Estate CRM & Brokerage Operating System  
**Audience**: Real Estate Brokerage Firm Owners, Principal Brokers, Senior Sales Advisors, Telecallers  
**Target Conversion Flow**: Public Visitor → Product Value Discovery → Interactive ROI Calculator → Self-Serve Multi-Tenant Registration (`/register`) → Instant Dashboard Cockpit

---

## 1. Executive Summary & UX Research Findings

### 1.1 Core Research Objectives
1. **Identify High-Stakes Friction in Real Estate SaaS**: Why do brokerage owners and brokers abandon generic CRMs (Salesforce, HubSpot, LeadSquared) for unstructured spreadsheets and WhatsApp groups?
2. **Determine Cognitive Buying Triggers**: What specific proof points convert a skeptical brokerage principal into adopting a specialized vertical OS?
3. **Design Zero-Friction Multi-Tenant Onboarding**: How do we register complex multi-user firms with statutory MahaRERA compliance, custom squads, and channel credentials in under 90 seconds?

---

### 1.2 User Personas & Behavioral Mindsets

| Dimension | Persona 1: Principal Broker / Firm Owner (Decision Maker) | Persona 2: Senior Closing Broker (Power User) | Persona 3: Inside Sales / Telecaller (Velocity User) |
| :--- | :--- | :--- | :--- |
| **Primary Goal** | Stop lead leakage, verify team deal splits, ensure MahaRERA compliance, track firm net gross brokerage. | Send high-impact client portals with live unit availability; close high-ticket deals without manual PDF collating. | Call 80–120 fresh digital leads/day within 5 minutes; 1-click dispositioning; clear follow-up SLA alarms. |
| **Top Frustrations** | *"Leads get stolen or forgotten in agent WhatsApp chats; no visibility on actual commission splits or team pipeline."* | *"Sending outdated brochures or unverified unit rates ruins buyer trust during site visits."* | *"Clunky CRM forms with 20 mandatory fields force me to keep a side Excel sheet."* |
| **Decision Trigger on Landing Page** | Multi-tenant database isolation guarantees, live commission split calculator, MahaRERA statutory guardrails, sub-50ms speed. | Interactive private client presentation portals preview with viewer telemetry heatmaps. | 1-click disposition flow & automated speed-to-lead queue demo. |

---

### 1.3 Behavioral Heuristics & Conversion Triggers

```
[ Visitor Lands ]
       │
       ▼
1. Loss Aversion Anchor ────────► "Average Brokerage Loses 34% of Revenue to Lead Bleed & Stale Rates"
       │
       ▼
2. Concrete Proof Visuals ──────► Interactive Multi-Tenant Architecture & Omnichannel Inbound Routing
       │
       ▼
3. Interactive Micro-Tool ──────► Live Brokerage Commission & ROI Retention Calculator
       │
       ▼
4. Regulatory Trust Seal ───────► MahaRERA Statutory Verification Engine & Sub-50ms Postgres Tenant Guard
       │
       ▼
5. Instant Action CTA ──────────► "Register Your Firm" (90s Setup with Zero Credit Card Friction)
```

---

## 2. Information Architecture & Page Layout

### 2.1 Visual Section Rhythm

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. HEADER: Brand Logo + Navigation Links + Theme Toggle + Sign In / CTA│
├────────────────────────────────────────────────────────────────────────┤
│ 2. HERO SECTION:                                                       │
│    - Eyebrow Badge: "Enterprise Multi-Tenant Real Estate OS"           │
│    - H1: The High-Precision CRM for Modern Real Estate Brokerages      │
│    - Subtitle: Omnichannel Attribution • Verified Inventory • Portals │
│    - Dual CTAs: [ Register Your Firm ] [ Live Interactive Demo ]       │
│    - Key Trust Badges: ₹500Cr+ Pipeline • 100% MahaRERA • Sub-50ms     │
│    - Interactive Floating Cockpit Window Showcase                      │
├────────────────────────────────────────────────────────────────────────┤
│ 3. LIVE MULTI-TENANT ARCHITECTURE VISUALIZER:                          │
│    - Visual Flow: WhatsApp Meta / Instagram Ads / Telephony DID        │
│      ──► Tenant Guard Isolation ──► Custom Squads ──► Client Portal    │
├────────────────────────────────────────────────────────────────────────┤
│ 4. THE 6 CORE PILLARS OF HIGH-VELOCITY BROKERAGE:                      │
│    [1. Omnichannel Attribution]    [2. MahaRERA Inventory Engine]     │
│    [3. Private Client Portals]     [4. Deal & Commission Splits]      │
│    [5. Custom Squads & RBAC]       [6. Next-Connect Priority Queue]   │
├────────────────────────────────────────────────────────────────────────┤
│ 5. INTERACTIVE BROKERAGE ROI & NET COMMISSION CALCULATOR:              │
│    - Interactive Slider 1: Average Property Ticket Size (₹50L – ₹15Cr) │
│    - Interactive Slider 2: Monthly Deals Closed (1 – 50)               │
│    - Interactive Slider 3: Commission Percentage (1% – 4%)             │
│    - Live Outputs: Projected Gross Brokerage & Firm Net Retention     │
├────────────────────────────────────────────────────────────────────────┤
│ 6. ENTERPRISE SECURITY & REGULATORY GOVERNANCE:                        │
│    - Row-Level Tenant Isolation • Read-Only QA Role • Audit Trails     │
├────────────────────────────────────────────────────────────────────────┤
│ 7. MULTI-TENANT ONBOARDING CTA BANNER:                                 │
│    - 4-Step Visual Roadmap: Register Firm → Create Squads → Invite    │
├────────────────────────────────────────────────────────────────────────┤
│ 8. FOOTER: Navigation Links + Statutory MahaRERA Disclaimer + Status   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Design System Tokens & Typography Contract

### 3.1 Typography
- **Display / Headings**: `Plus Jakarta Sans` (Bold/Extrabold, 800) with subtle letter-spacing (`tracking-tight`).
- **Editorial Accents / Subheaders**: `Playfair Display` (Serif, 700) for luxury real estate warmth and prestige.
- **Numbers / Metrics / Telemetry**: `JetBrains Mono` for tabular precision.
- **Body / Descriptive Text**: `Plus Jakarta Sans` (Medium/Regular, 400/500).

### 3.2 Color System & Contrast
- **Canvas / Background**: `bg-canvas` (`#FBFBF9` light / `#0A0F1D` dark).
- **Surfaces**: `bg-surface` (`#FFFFFF` light / `#111827` dark) with refined border hairlines (`border-border`).
- **Primary Brand Accent**: `#2563EB` (Electric Blue) and `#1B4332` (Deep Cypress Green) for stability and trust.
- **Status Accents**:
  - Success: `#15803D` (Emerald - Verified RERA / Deal Won)
  - Warning: `#D97706` (Amber - SLA Priority)
  - Danger: `#DC2626` (Red - Stale Inventory / Leakage Alert)
- **Contrast Guarantee**: Minimum 4.5:1 text-to-background contrast across both Light and Dark themes (WCAG AA).

---

## 4. Interactive Components & Micro-Interactions

### 4.1 Live Interactive Hero Showcase
- Floating glassmorphic CRM cockpit mockup demonstrating:
  - Fresh lead notification with Speed-to-Lead countdown timer (`03:42` remaining).
  - Live client portal engagement alert: *"Buyer Vivek Mehta viewed 3 BHK floor plan 4 times in Worli"*.
  - Token Deal transaction pipeline counter.

### 4.2 Interactive ROI & Brokerage Commission Calculator
- **Mathematical Formula**:
  $$\text{Gross Brokerage} = \text{Ticket Size} \times \text{Deals/Month} \times \left(\frac{\text{Brokerage \%}}{100}\right)$$
  $$\text{Recovered Leakage (Est. 18\%)} = \text{Gross Brokerage} \times 0.18$$
- Dynamic formatted Indian Currency representation (`₹ Cr` / `₹ Lakh`).

### 4.3 Smooth Tabbed Feature Showcase
- Users can click through the 6 pillars with smooth animated tab transitions (Framer Motion / Tailwind transitions).

---

## 5. Accessibility & Performance Requirements (WCAG 2.1 AA)

1. **Semantic HTML**: `<header>`, `<main>`, `<section>`, `<nav>`, `<footer>` with descriptive `aria-label`s.
2. **Keyboard Navigation**: All interactive elements (sliders, buttons, tabs) have visible `:focus-visible` outlines.
3. **Reduced Motion**: All animations respect `prefers-reduced-motion: reduce`.
4. **Zero-Layout Shift**: Explicit dimensions on illustrations, icons, and hero cockpit containers.

---

## 6. Implementation Verification Plan

| Phase | Milestone | Acceptance Criteria |
| :--- | :--- | :--- |
| **Phase 1** | Route & Shell Configuration | `/landing` and unauthenticated `/` render without sidebar layout; `proxy.ts` allows public access. |
| **Phase 2** | Landing Component Implementation | Build [`LandingClient.tsx`](file:///Users/usaidpatel/Desktop/CRM/src/components/landing/LandingClient.tsx) with Hero, Visualizer, 6 Pillars, ROI Calculator, and CTAs. |
| **Phase 3** | Self-Serve Registration Flow | Build [`RegisterClient.tsx`](file:///Users/usaidpatel/Desktop/CRM/src/components/auth/RegisterClient.tsx) and `POST /api/v1/auth/register` API. |
| **Phase 4** | Verification & Test Suite | Execute `bun test` and run browser verification across Light/Dark modes and mobile viewports. |
