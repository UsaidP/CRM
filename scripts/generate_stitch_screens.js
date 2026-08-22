const https = require("https");

const apiKey = "AQ.Ab8RN6L66FcnvT4dR7iH7xUsijynkM8cxoXliLXNUwbAyNlOVA";
const projectId = "16278590490276822151";

async function mcpPost(body, timeoutMs = 240000) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request("https://stitch.googleapis.com/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        "X-Goog-Api-Key": apiKey
      },
      timeout: timeoutMs
    }, (res) => {
      let resBody = "";
      res.on("data", chunk => resBody += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(resBody));
        } catch (e) {
          resolve({ raw: resBody, statusCode: res.statusCode });
        }
      });
    });
    req.on("timeout", () => {
      req.destroy(new Error("Request timed out"));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

const screens = [
  {
    name: "01_telecaller_lead_console",
    deviceType: "DESKTOP",
    prompt: `A production-grade, highly polished real estate telecaller speed-dialing console and high-density lead management interface with a tactile warm alabaster background (#FBFBF9) and deep cypress green (#1B4332) accents.

Visual Style & Palette:
- Brand: Deep Cypress Green (#1B4332, #2D6A4F) for headers, primary actions, and badges.
- Accent: Warm Terracotta & Amber Ochre (#D97706) for callback alerts and SLA timers.
- Backgrounds: Alabaster Linen canvas (#FBFBF9), clean white panels (#FFFFFF), soft sandstone borders (#E5E0D8).
- Typography: Plus Jakarta Sans for UI headers/labels, JetBrains Mono for phone numbers (+91 98201 44521) and budgets (₹65L - ₹1.2Cr).

Layout:
- Top Header Bar: ZamZam Realty telecaller control bar with live SLA timer badge "🔥 3 Fresh Inbounds (<5m SLA)", Daily Quota Progress "42/100 Calls Completed (42%)", Exotel virtual line status "🟢 Connected / Agent Online", and Quick Filter Pills (All, Fresh Inbound, Scheduled Callback, High Intent).
- Left Pane (60% width): Dense spreadsheet-speed lead table with fixed 40px row height.
  - Columns: Checkbox, Lead Name & Avatar, Attribution Source Badge (YouTube Shorts, Instagram Reel, WhatsApp QR), Inbound Time, Speed-to-Lead Timer (02:45 remaining), Intent Tag, Phone (+91 98201 XXXXX), 1-Click Call Icon button.
  - Selected Row: Highlighting Lead #104 Dr. Sameer Deshmukh with a subtle green border and accent indicator.
- Right Pane (40% width): Persistent Brixi AI 4-Pillar Qualification Scorecard & Action Drawer:
  - Header: Lead Profile (Dr. Sameer Deshmukh, Inbound from YouTube Kharghar Sector 20 Review).
  - 01 INTENT: Active toggle chips [Exploring] [Comparing] [Ready to Buy (Hot)]
  - 02 BUDGET: Selectable chips [₹40L-₹65L Taloja] [₹85L-₹1.75Cr Kharghar] [Stretch]
  - 03 LOCATION: Selectable chips [Kharghar Sec 1-20] [Kharghar Sec 34-36] [Taloja P1/P2]
  - 04 TIMELINE: [0-30 Days (Assign Broker)] [31-90 Days (Nurture)] [90+ Days]
  - 1-Click Call Disposition Bar:
    * Green button: "Connected - High Intent"
    * Amber buttons: "Visit Booked", "WhatsApp Shared"
    * Slate buttons: "No Answer", "Busy", "Callback"
    * Red buttons: "Price Objection", "Drop"
  - Quick Notes Area: "Buyer interested in 2 BHK near Sector 20 Metro station. Budget ₹1.10 Cr. Requested Sunday 11 AM site visit."
  - Save & Next Lead button in solid Cypress Green.`
  },
  {
    name: "02_master_crm_pipeline_board",
    deviceType: "DESKTOP",
    prompt: `An executive real estate CRM pipeline and multi-channel lead tracking board in deep cypress green (#1B4332), warm terracotta (#D97706), and crisp white card containers on an alabaster linen canvas (#FBFBF9).

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
- Card Elements: Client name, normalized phone (+91), budget range, source attribution icon, assigned broker avatar, speed-to-lead SLA badge, and quick WhatsApp action icon.`
  },
  {
    name: "03_maharera_verified_inventory_cost_engine",
    deviceType: "DESKTOP",
    prompt: `A comprehensive MahaRERA-verified real estate inventory catalogue and statutory all-in property cost calculation engine for Kharghar and Taloja micro-markets.

Layout:
- Header & Filter Strip: Micro-market tabs [All] [Kharghar Sectors 1-20] [Kharghar Sectors 34-36] [Taloja Phase 1 & 2], BHK filter (1 BHK, 2 BHK, 3 BHK), Possession filter (Ready OC vs Dec 2026).
- Main Area: 2-Column responsive layout.
  - Left Column (65%): Project inventory cards featuring Project Name, Developer, MahaRERA Registration ID badge (e.g. P52000031245), 14-day freshness badge "Verified 2d ago", Carpet Area (sq.ft), Base Agreement Value (₹85.00 Lakhs), High-res floor plan preview thumbnail.
  - Right Column (35%): Sticky Maharashtra Statutory Cost Calculator breakdown card:
    - Base Agreement Value: ₹85,00,000
    - Stamp Duty (6%): ₹5,10,000
    - Registration Charges: ₹30,000
    - Statutory GST (5%): ₹4,25,000
    - Floor Rise & Covered Parking: ₹3,50,000
    - Society Development / Corpus: ₹1,50,000
    - Capitalized All-In Total: ₹99,65,000 (Highlighted in JetBrains Mono, Cypress Green banner)
    - 1-Click "Generate PDF Cost Sheet" & "Send to Buyer via WhatsApp".`
  },
  {
    name: "04_requirement_matchmaker_console",
    deviceType: "DESKTOP",
    prompt: `An intelligent real estate consultative requirement matchmaker and 5-factor weighted property scoring console for sales executives.

Layout:
- Left Column (35%): Buyer Profile & Requirement Form:
  - Client Name: "Dr. Sameer Deshmukh"
  - Hard Budget Ceiling: "₹1.10 Cr (+5% Max Limit)"
  - Preferred BHK: "2 BHK Large Carpet"
  - Preferred Sectors: "Kharghar Sector 19, 20, 35"
  - Transit Requirement: "< 10 mins to Metro / Highway"
  - Possession Preference: "Ready Possession with OC"
- Right Column (65%): Ranked Matched Properties scored from 0% to 100%:
  - Card 1: 94% Match — "Paradise Sai Symphony, Sector 20" (Score breakdown: Budget 30/30, Location 25/25, Transit 18/20, OC 15/15, Carpet 6/10). All-in cost ₹1.05 Cr.
  - Card 2: 88% Match — "Crown Greens, Sector 35". All-in cost ₹98 Lakhs.
  - Card 3: 79% Match — "Gami Aster, Taloja Phase 1".
  - Actions on each match: "Add to Tour Itinerary", "Generate Client Portal Link", "WhatsApp Instant Comparison".`
  },
  {
    name: "05_luxury_client_presentation_portal",
    deviceType: "DESKTOP",
    prompt: `A luxury personalized client property presentation web portal with live broker telemetry alerts for a premium real estate brokerage.

Buyer View:
- Hero: Curated advisory presentation for "Dr. Sameer Deshmukh" prepared by "ZamZam Properties".
- Project Showcase: Interactive tabbed view of 2 recommended properties with verified floor plans, 4K walkthrough video player embed, Google Maps transit distance widget, and MahaRERA QR verification seal.
- All-In Cost Sheet: Transparent statutory breakdown table (Stamp duty, GST, Reg, Society fees).
- Sticky Floating Action Bar: "Request Private Site Visit", "WhatsApp Senior Advisor", "Download Verified Brochure".

Broker Live Telemetry Overlay:
- Live activity feed showing buyer engagement: "Dr. Sameer spent 3m 45s viewing Floor Plan B", "Downloaded Cost Sheet PDF", "Engagement Intent: HOT PROSPECT (92/100)".`
  },
  {
    name: "06_escorted_site_visit_itinerary_planner",
    deviceType: "DESKTOP",
    prompt: `An escorted multi-project site visit tour builder and logistics dispatch planner for real estate brokers.

Layout:
- Day Itinerary Timeline Builder:
  - 10:00 AM: Pickup at Kharghar Railway Station (Cab #MH-46-AZ-1234, Driver: Ramesh)
  - 10:30 AM: Stop 1 — Sai Symphony, Sector 20 (Sample flat 2 BHK viewing, Sales Manager: Amit)
  - 11:45 AM: Stop 2 — Crown Greens, Sector 35 (Construction site walkthrough)
  - 01:00 PM: Stop 3 — Gami Aster, Taloja Phase 1
  - 02:15 PM: Drop-off at Client Residence
- Route Map: Embedded interactive map with numbered stop pins and transit route.
- Action Bar: 1-Click "Dispatch WhatsApp Itinerary with Live Google Maps Links to Client & Driver".
- Post-Visit Feedback & Objection Drawer: 5-Star rating picker, objection tags [Price too high] [Balcony size small] [Delivery timeline delayed] [Vastu mismatch], Next Action [Second Visit with Family] [Token Negotiation].`
  },
  {
    name: "07_deal_closing_commission_ledger",
    deviceType: "DESKTOP",
    prompt: `A financial deal closing ledger, brokerage commission split tracker, and statutory 18% GST developer invoicing dashboard in deep cypress green and crisp ivory cards.

Layout:
- Top Metrics: Closed Deals Value (₹18.4 Cr), Gross Brokerage Due (₹46.0 Lakhs), Realized Cash (₹28.5 Lakhs), Pending Developer Invoices (₹17.5 Lakhs).
- Deal Lifecycle Table:
  - Deal #1042: Unit 1402, Sai Symphony | Client: Mr. Verma | Total Value: ₹1,20,00,000 | 2.5% Brokerage: ₹3,00,000 | Milestone: [Token ₹1L Paid] -> [Agreement 10% Done] -> [Bank Loan Sanctioned] -> [Disbursed]
  - Split Breakdown: Firm Net Share 60% (₹1,80,000), Sales Rep Incentive 40% (₹1,20,000).
- Developer Tax Invoice Generator Panel:
  - Formatted Tax Invoice preview with ZamZam GSTIN, Developer GSTIN, MahaRERA Broker ID, Taxable Value, CGST 9% (₹27,000), SGST 9% (₹27,000), Total ₹3,54,000.
  - Buttons: "Download Signed Tax Invoice PDF", "Log Payment Receipt".`
  },
  {
    name: "08_super_admin_rbac_telephony_manager",
    deviceType: "DESKTOP",
    prompt: `A super-admin security, role-based access control (RBAC) matrix, and cloud telephony line management console for a real estate agency.

Layout:
- Tab Navigation: [Role Permissions Matrix] [Cloud Telephony & WhatsApp API] [Security & Audit Trail].
- Role Matrix Grid: Rows of permissions (Export Lead Data, Unmask Client Phone Numbers, Reassign Leads, Edit Commission Splits, View Company P&L) vs Columns (Super Admin, Broker Manager, Sales Executive, Telecaller). Checked chips in cypress green and amber.
- Cloud Telephony & Number Pool:
  - Virtual Lines (Exotel / Twilio / WhatsApp Cloud API): Number (+91 98200 11223), Assigned Queue ("Instagram Inbound Kharghar"), Assigned Callers (4 Active Telecallers), Daily Call Recording Storage toggle.
- Real-time Security Audit Log: Timestamp, User, Action ("Unmasked Phone for Lead #4092", "Exported 50 Leads to CSV"), IP Address, Risk Score.`
  }
];

async function generateScreen(screen, index) {
  console.log(`\n======================================================`);
  console.log(`[${index + 1}/${screens.length}] Generating: ${screen.name}...`);
  console.log(`======================================================`);
  
  const startTime = Date.now();
  const res = await mcpPost({
    jsonrpc: "2.0",
    id: index + 1,
    method: "tools/call",
    params: {
      name: "generate_screen_from_text",
      arguments: {
        projectId: projectId,
        prompt: screen.prompt,
        deviceType: screen.deviceType,
        modelId: "GEMINI_3_FLASH"
      }
    }
  });

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log(`Completed in ${durationSec}s. Result:`);
  if (res.result?.isError) {
    console.error("Error generating screen:", JSON.stringify(res.result));
  } else {
    console.log("Success! Screen output generated.");
  }
  return res;
}

async function run() {
  console.log("Starting generation of 8 production-grade screens for project " + projectId);
  for (let i = 0; i < screens.length; i++) {
    try {
      await generateScreen(screens[i], i);
    } catch (err) {
      console.error(`Failed to generate ${screens[i].name}:`, err.message);
    }
  }
  console.log("\nAll screens process completed. Fetching current project screens list...");
  const listRes = await mcpPost({
    jsonrpc: "2.0",
    id: 99,
    method: "tools/call",
    params: {
      name: "list_screens",
      arguments: { projectId: projectId }
    }
  });
  console.log("Current screens in project:", JSON.stringify(listRes.result, null, 2));
}

run().catch(console.error);
