# Stitch MCP Screen Generation Payload Suite
**Target Stitch Project**: `https://stitch.withgoogle.com/u/1/projects/16278590490276822151` (`projects/16278590490276822151`)  
**Design System Theme**: Architectural Botanical Ledger (Cypress Green `#1B4332`, Amber Ochre `#D97706`, Tactile Alabaster `#FBFBF9`)

---

## Screen 1: Telecaller Lead Calling Console
- **Route**: `/leads/caller-console`
- **Device**: Desktop (1440x900)
- **Stitch MCP Prompt**:
```text
A professional real estate telecaller speed-dialing console and high-density lead management interface with a tactile warm alabaster background (#FBFBF9) and deep cypress green (#1B4332) accents. 

Layout:
- Top Header: ZamZam Realty telecaller bar with live SLA timer '🔥 3 Fresh Social Leads (<5m SLA)', Caller Quota meter '42/100 Calls Completed Today', and Exotel line status 'Active / Connected'.
- Left Pane (60% width): Dense spreadsheet-speed lead table with fixed 40px row height, JetBrains Mono typography for phone numbers (+91 98201 XXXXX) and budgets (₹65L - ₹1.2Cr). Columns: Lead Name, Social Attribution Tag (YouTube Shorts / Instagram Reel / WhatsApp QR), Inbound Time, Speed-to-Lead Timer, Status Pill, Quick Call Button.
- Right Pane (40% width): Persistent Brixi AI 4-Pillar Qualification Scorecard and instant caller action drawer.
  - 01 INTENT: Active toggle chips [Exploring] [Comparing] [Ready to Buy (Hot)]
  - 02 BUDGET: Toggle chips [₹40L-₹65L Taloja] [₹85L-₹1.75Cr Kharghar] [Stretch]
  - 03 LOCATION: Selectable chips [Kharghar Sec 1-20] [Kharghar Sec 34-36] [Taloja P1/P2]
  - 04 TIMELINE: [0-30 Days (Assign Broker)] [31-90 Days (Nurture)] [90+ Days]
  - 1-Click Call Disposition Bar: Green 'Connected - High Intent', Amber 'Visit Booked', 'WhatsApp Shared', Slate 'No Answer', 'Busy', Red 'Price Objection', 'Drop'.
  - Quick Notes text area with timestamped auto-save.
```

---

## Screen 2: Master CRM Pipeline & Leads Board
- **Route**: `/leads`
- **Device**: Desktop (1440x900)
- **Stitch MCP Prompt**:
```text
An executive real estate CRM pipeline and multi-channel lead tracking board in deep cypress green (#1B4332), warm terracotta (#D97706), and crisp white card containers on an alabaster linen canvas (#FBFBF9).

Layout:
- Top Navigation: Breadcrumb, Search bar, Filter by Micro-market (Kharghar / Taloja), Date range picker, View Switcher [Kanban Board | Dense Spreadsheet Grid].
- Summary Metric Bar: Total Inbound Leads (1,248), Qualified Brixi Leads (412), Site Visits Scheduled (86), Deals in Negotiation (19), Won Revenue (₹42.5L Brokerage).
- 7-Stage Kanban Columns:
  1. New Inbound (Attribution badges: YouTube, Instagram, WhatsApp)
  2. Contacted & Qualified (Brixi score >= 75%)
  3. Requirement Matched (2+ RERA projects linked)
  4. Client Portal Active (Live telemetry badge)
  5. Site Visit Scheduled (Cab & broker assigned)
  6. Token / Negotiation (Token amount in JetBrains Mono)
  7. Deal Closed Won (Commission split status)
- Card Elements: Client name, normalized phone (+91), budget range, source attribution icon, assigned broker avatar, speed-to-lead SLA badge, and quick WhatsApp action icon.
```

---

## Screen 3: MahaRERA Verified Inventory & Cost Engine
- **Route**: `/inventory`
- **Device**: Desktop (1440x900)
- **Stitch MCP Prompt**:
```text
A comprehensive MahaRERA-verified real estate inventory catalogue and statutory all-in property cost calculation engine for Kharghar and Taloja micro-markets.

Layout:
- Header & Filter Strip: Micro-market tabs [All] [Kharghar Sectors 1-20] [Kharghar Sectors 34-36] [Taloja Phase 1 & 2], BHK filter (1 BHK, 2 BHK, 3 BHK), Possession filter (Ready OC vs Dec 2026).
- Main Area: 2-Column responsive layout.
  - Left Column (65%): Project inventory cards featuring Project Name, Developer, MahaRERA Registration ID badge (e.g. P52000031245), 14-day freshness badge 'Verified 2d ago', Carpet Area (sq.ft), Base Agreement Value (₹85.00 Lakhs), High-res floor plan preview thumbnail.
  - Right Column (35%): Sticky Maharashtra Statutory Cost Calculator breakdown card:
    - Base Agreement Value: ₹85,00,000
    - Stamp Duty (6%): ₹5,10,000
    - Registration Charges: ₹30,000
    - Statutory GST (5%): ₹4,25,000
    - Floor Rise & Covered Parking: ₹3,50,000
    - Society Development / Corpus: ₹1,50,000
    - Capitalized All-In Total: ₹99,65,000 (Highlighted in JetBrains Mono, Cypress Green banner)
    - 1-Click 'Generate PDF Cost Sheet' & 'Send to Buyer via WhatsApp'.
```

---

## Screen 4: Consultative Requirement Matchmaker
- **Route**: `/matching`
- **Device**: Desktop (1440x900)
- **Stitch MCP Prompt**:
```text
An intelligent real estate consultative requirement matchmaker and 5-factor weighted property scoring console for sales executives.

Layout:
- Left Column (35%): Buyer Profile & Requirement Form:
  - Client Name: 'Dr. Sameer Deshmukh'
  - Hard Budget Ceiling: '₹1.10 Cr (+5% Max Limit)'
  - Preferred BHK: '2 BHK Large Carpet'
  - Preferred Sectors: 'Kharghar Sector 19, 20, 35'
  - Transit Requirement: '< 10 mins to Metro / Highway'
  - Possession Preference: 'Ready Possession with OC'
- Right Column (65%): Ranked Matched Properties scored from 0% to 100%:
  - Card 1: 94% Match — 'Paradise Sai Symphony, Sector 20' (Score breakdown: Budget 30/30, Location 25/25, Transit 18/20, OC 15/15, Carpet 6/10). All-in cost ₹1.05 Cr.
  - Card 2: 88% Match — 'Crown Greens, Sector 35'. All-in cost ₹98 Lakhs.
  - Card 3: 79% Match — 'Gami Aster, Taloja Phase 1'.
  - Actions on each match: 'Add to Tour Itinerary', 'Generate Client Portal Link', 'WhatsApp Instant Comparison'.
```

---

## Screen 5: Luxury Client Property Presentation Portal & Telemetry
- **Route**: `/p/[token]` & `/portals/analytics`
- **Device**: Desktop & Mobile Responsive (1440x900)
- **Stitch MCP Prompt**:
```text
A luxury personalized client property presentation web portal with live broker telemetry alerts for a premium real estate brokerage.

Buyer View:
- Hero: Curated advisory presentation for 'Dr. Sameer Deshmukh' prepared by 'ZamZam Properties'.
- Project Showcase: Interactive tabbed view of 2 recommended properties with verified floor plans, 4K walkthrough video player embed, Google Maps transit distance widget, and MahaRERA QR verification seal.
- All-In Cost Sheet: Transparent statutory breakdown table (Stamp duty, GST, Reg, Society fees).
- Sticky Floating Action Bar: 'Request Private Site Visit', 'WhatsApp Senior Advisor', 'Download Verified Brochure'.

Broker Live Telemetry Overlay:
- Live activity feed showing buyer engagement: 'Dr. Sameer spent 3m 45s viewing Floor Plan B', 'Downloaded Cost Sheet PDF', 'Engagement Intent: HOT PROSPECT (92/100)'.
```

---

## Screen 6: Escorted Site Visit Itinerary Planner
- **Route**: `/visits`
- **Device**: Desktop (1440x900)
- **Stitch MCP Prompt**:
```text
An escorted multi-project site visit tour builder and logistics dispatch planner for real estate brokers.

Layout:
- Day Itinerary Timeline Builder:
  - 10:00 AM: Pickup at Kharghar Railway Station (Cab #MH-46-AZ-1234, Driver: Ramesh)
  - 10:30 AM: Stop 1 — Sai Symphony, Sector 20 (Sample flat 2 BHK viewing, Sales Manager: Amit)
  - 11:45 AM: Stop 2 — Crown Greens, Sector 35 (Construction site walkthrough)
  - 01:00 PM: Stop 3 — Gami Aster, Taloja Phase 1
  - 02:15 PM: Drop-off at Client Residence
- Route Map: Embedded interactive map with numbered stop pins and transit route.
- Action Bar: 1-Click 'Dispatch WhatsApp Itinerary with Live Google Maps Links to Client & Driver'.
- Post-Visit Feedback & Objection Drawer: 5-Star rating picker, objection tags [Price too high] [Balcony size small] [Delivery timeline delayed] [Vastu mismatch], Next Action [Second Visit with Family] [Token Negotiation].
```

---

## Screen 7: Deal Closing Ledger & GST Invoicing
- **Route**: `/deals`
- **Device**: Desktop (1440x900)
- **Stitch MCP Prompt**:
```text
A financial deal closing ledger, brokerage commission split tracker, and statutory 18% GST developer invoicing dashboard in deep cypress green and crisp ivory cards.

Layout:
- Top Metrics: Closed Deals Value (₹18.4 Cr), Gross Brokerage Due (₹46.0 Lakhs), Realized Cash (₹28.5 Lakhs), Pending Developer Invoices (₹17.5 Lakhs).
- Deal Lifecycle Table:
  - Deal #1042: Unit 1402, Sai Symphony | Client: Mr. Verma | Total Value: ₹1,20,00,000 | 2.5% Brokerage: ₹3,00,000 | Milestone: [Token ₹1L Paid] -> [Agreement 10% Done] -> [Bank Loan Sanctioned] -> [Disbursed]
  - Split Breakdown: Firm Net Share 60% (₹1,80,000), Sales Rep Incentive 40% (₹1,20,000).
- Developer Tax Invoice Generator Panel:
  - Formatted Tax Invoice preview with ZamZam GSTIN, Developer GSTIN, MahaRERA Broker ID, Taxable Value, CGST 9% (₹27,000), SGST 9% (₹27,000), Total ₹3,54,000.
  - Buttons: 'Download Signed Tax Invoice PDF', 'Log Payment Receipt'.
```

---

## Screen 8: Super Admin RBAC & Phone Line Manager
- **Route**: `/admin/roles-permissions`
- **Device**: Desktop (1440x900)
- **Stitch MCP Prompt**:
```text
A super-admin security, role-based access control (RBAC) matrix, and cloud telephony line management console for a real estate agency.

Layout:
- Tab Navigation: [Role Permissions Matrix] [Cloud Telephony & WhatsApp API] [Security & Audit Trail].
- Role Matrix Grid: Rows of permissions (Export Lead Data, Unmask Client Phone Numbers, Reassign Leads, Edit Commission Splits, View Company P&L) vs Columns (Super Admin, Broker Manager, Sales Executive, Telecaller). Checked chips in cypress green and amber.
- Cloud Telephony & Number Pool:
  - Virtual Lines (Exotel / Twilio / WhatsApp Cloud API): Number (+91 98200 11223), Assigned Queue ('Instagram Inbound Kharghar'), Assigned Callers (4 Active Telecallers), Daily Call Recording Storage toggle.
- Real-time Security Audit Log: Timestamp, User, Action ('Unmasked Phone for Lead #4092', 'Exported 50 Leads to CSV'), IP Address, Risk Score.
```
