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

const additionalScreens = [
  {
    name: "09_followup_calendar_next_connect",
    deviceType: "DESKTOP",
    prompt: `A production-grade, highly polished real estate broker schedule, follow-up calendar, and Next Connect Priority engine in Cypress Green (#1B4332), Warm Ochre (#D97706), and Alabaster linen (#FBFBF9).

Layout:
- Top Header: Date picker, View toggles [Day Agenda | Weekly Grid | Overdue Follow-ups (7)], Quick Add Reminder button in Cypress Green.
- Left Column (65% width): Interactive multi-day calendar & time-blocked agenda.
  - 10:00 AM: Site Visit — Dr. Sameer Deshmukh (Kharghar Sec 20) [Confirmed, Cab Dispatched]
  - 11:30 AM: Urgent Telecaller Escalation — Mr. Verma (Budget ₹1.5 Cr, High Intent)
  - 02:00 PM: Token Document Collection — Sai Symphony #1402
  - 04:30 PM: Scheduled WhatsApp Brochure Dispatch — 4 Taloja Leads
- Right Column (35% width): "Next Connect" Intelligent Lead Scoring Radar:
  - Ranked cards sorted by urgency:
    * Card 1: Sameer Deshmukh (Score 96/100, Last touch 2h ago, Viewed Cost Sheet 3x) -> 1-Click Call, WhatsApp, Reschedule.
    * Card 2: Rajesh Nair (Score 88/100, Callback requested for 3 PM)
    * Card 3: Ananya Patel (Score 82/100, Inbound from YouTube Kharghar Video 4)
  - Quick Reminder Form with quick tags [Call Back] [Send Cost Sheet] [Arrange Site Visit].`
  },
  {
    name: "10_statutory_cost_calculator_engine",
    deviceType: "DESKTOP",
    prompt: `A dedicated Maharashtra statutory all-in property cost calculation engine and investor comparison sheet for Kharghar and Taloja real estate.

Visual Style: Deep Cypress Green (#1B4332), Terracotta (#D97706), Alabaster white card panels (#FFFFFF) with crisp hairline borders (#E5E0D8), tabular figures in JetBrains Mono.

Layout:
- Left Column: Interactive Capitalized Cost Input Form:
  - Property: 'Crown Greens, Kharghar Sector 35'
  - Unit: '2 BHK Premium Carpet (740 sq.ft)'
  - Base Agreement Rate: '₹11,500 / sq.ft' (Agreement Value: ₹85,10,000)
  - Floor Rise: '₹50/sq.ft per floor above 5th' (Floor 14 = ₹3,33,000)
  - Parking: '1 Covered Stilt' (₹4,00,000)
  - Development Charges: '₹2,50,000'
  - Construction Stage: [Under Construction (5% GST)] [Ready with OC (0% GST)]
- Right Column: Comprehensive Capitalized Statutory Breakdown Table:
  - 1. Base Property Cost: ₹85,10,000
  - 2. Floor Rise & Covered Parking: ₹7,33,000
  - 3. Taxable Agreement Value: ₹92,43,000
  - 4. Maharashtra Stamp Duty (6%): ₹5,54,580
  - 5. Fixed Registration Fee: ₹30,000
  - 6. Statutory GST (5%): ₹4,62,150
  - 7. Society Formation & Legal: ₹1,50,000
  - GRAND ALL-IN NET TOTAL: ₹1,04,39,730 (Large green banner in JetBrains Mono)
- Action Toolbar: 'Export PDF Cost Sheet with MahaRERA Stamp', 'Send to WhatsApp Client', 'Save to Lead Profile'.`
  },
  {
    name: "11_campaign_attribution_manager",
    deviceType: "DESKTOP",
    prompt: `An advanced organic social media attribution management console and wa.me QR link generator for real estate brokerage marketing.

Visual Style: Cypress Green (#1B4332), Ochre (#D97706), Crisp Alabaster (#FBFBF9).

Layout:
- Top Analytics: Total Tracked Links (48), Total Clicks (14,200), WhatsApp Chats Initiated (1,420 - 10% Conversion), Closed Deals (18 - ₹45L Revenue).
- Left Pane (45%): Zero-Collision Link & QR Code Generator:
  - Channel Picker: [YouTube Shorts] [Instagram Reel] [WhatsApp Community] [Property Portal]
  - Campaign / Content Title: 'Kharghar Sector 20 Metro Walkthrough Episode 4'
  - Target Landing / Action: Pre-filled WhatsApp message 'Hi ZamZam Realty, saw your Kharghar Sec 20 Reel, send details for 2 BHK.'
  - Generated wa.me deep link with UTM parameters.
  - High-res QR code preview with 1-click 'Download PNG for Video Overlay'.
- Right Pane (55%): Live Attribution Performance Table:
  - Columns: Content Title, Channel Icon, Leads Generated, Brixi Qualified %, Visits Booked, Revenue Yield.
  - Top Performing Row: 'Taloja Phase 1 vs 2 Price Comparison (YouTube)' — 412 Leads, 12 Site Visits, ₹18L Brokerage.`
  },
  {
    name: "12_analytics_velocity_leaderboard",
    deviceType: "DESKTOP",
    prompt: `An executive real estate sales velocity, content ROI analytics, and gamified broker leaderboard dashboard.

Layout:
- KPI Summary Cards:
  * Monthly Gross Brokerage: ₹38.5 Lakhs (+24% vs Target)
  * Average Speed-to-Lead SLA: 3m 42s (94% Compliance)
  * Site Visit to Token Conversion: 28.4%
  * Cost per Qualified Inbound Lead: ₹0 (100% Organic Social)
- Main Section (2 Columns):
  - Left Chart Card: Full-Funnel Conversion Velocity Waterfall: Social Inbound (1,248) -> Telecaller Qualified (412) -> Requirement Matched (310) -> Client Portal Viewed (245) -> Escorted Site Visit (86) -> Token Paid (24) -> Deal Won (19).
  - Right Card: Sales Agent Leaderboard:
    1. Farhan Qureshi — ₹14.5L Commission (10 Deals Closed, 98% SLA) [Gold Crown]
    2. Rohit Sharma — ₹11.2L Commission (7 Deals Closed, 92% SLA) [Silver]
    3. Sneha Patil — ₹8.4L Commission (6 Deals Closed, 95% SLA) [Bronze]
- Bottom Table: Content Revenue Yield Breakdown (Which YouTube Video / Reel generated which closed deals).`
  },
  {
    name: "13_client_portals_telemetry_hub",
    deviceType: "DESKTOP",
    prompt: `A real-time broker command center for monitoring client property presentation portals (/p/[token]) and live buyer engagement telemetry.

Visual Style: Cypress Green (#1B4332), Ochre (#D97706), Alabaster (#FBFBF9).

Layout:
- Live Activity Stream (Real-Time WebSocket Feed):
  * '🟢 JUST NOW: Dr. Sameer Deshmukh opened Floor Plan 2BHK - Sai Symphony (Dwell Time: 3m 12s)'
  * '🟡 4m ago: Mr. Amit Verma downloaded Statutory Cost Sheet PDF'
  * '🔥 12m ago: Rajesh Nair shared Portal link with 2 secondary viewers (Spouse/Family)'
- Active Portals Management Table:
  - Columns: Client Name, Matched Projects, Portal Created Date, Total Views, Avg Dwell Time, Intent Status Badge [HOT PROSPECT (94)] [WARM (72)] [EXPIRED], 1-Click WhatsApp Reminder.
- Right Analytics Sidebar: Top viewed floor plans, Most debated objections (Price vs Location), 1-Click 'Refresh Portal Token' & 'Expire Link'.`
  },
  {
    name: "14_inventory_scraper_media_vault",
    deviceType: "DESKTOP",
    prompt: `A technical real estate inventory management modal and scraping operations console for MahaRERA verified project ingestion in Kharghar and Taloja.

Layout:
- Scraper Ops Panel:
  - Target Registry: 'MahaRERA Navi Mumbai Database (Kharghar & Taloja)'
  - Status: '✅ Live - 6,038 Units Synchronized (Last crawl 4h ago)'
  - Filter by Verification: [Verified MahaRERA ID] [Pending Floor Plan] [Missing Cost Sheet]
- Media Vault Uploader:
  - Drag-and-drop zone for 4K Walkthrough Videos, High-Res Floor Plans (PDF/PNG), Project Brochures.
  - File tags: [Master Layout] [Unit Floor Plan] [Legal RERA Certificate] [Sample Flat Video].
  - 14-Day Freshness Circuit Breaker toggle: Automatically flag properties inactive if price unverified for 14 days.`
  },
  {
    name: "15_lead_merge_deduplication_drawer",
    deviceType: "DESKTOP",
    prompt: `A high-precision lead deduplication, phone normalization (+91 E.164), and contact merge resolution drawer for real estate operations.

Layout:
- Duplicate Alert Banner: '⚠️ Potential Duplicate Detected: Lead +91 98201 44521 matched 2 records across YouTube and WhatsApp.'
- Side-by-Side Merge Comparison:
  - Record A (Inbound from YouTube 3 days ago): Name 'Dr. Sameer', Budget '₹1 Cr', Stage 'Contacted'.
  - Record B (Inbound from WhatsApp today): Name 'Sameer Deshmukh', Budget '₹1.10 Cr', Stage 'New Inbound'.
- Field Selection Radio Buttons: Select primary Name, Primary Budget, Merge Notes, and retain full attribution history.
- Merge Actions: 'Merge Into Single Master Lead (Retain Multi-Touch History)', 'Keep As Separate Co-Buyers', 'Discard Duplicate'.`
  }
];

async function generateScreen(screen, index) {
  console.log(`\n======================================================`);
  console.log(`[${index + 1}/${additionalScreens.length}] Generating: ${screen.name}...`);
  console.log(`======================================================`);
  
  const startTime = Date.now();
  const res = await mcpPost({
    jsonrpc: "2.0",
    id: index + 10,
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
    console.error("Error:", JSON.stringify(res.result));
  } else {
    console.log("Success! Screen generated.");
  }
  return res;
}

async function run() {
  console.log("Generating remaining 7 specialized CRM components in Stitch project " + projectId);
  for (let i = 0; i < additionalScreens.length; i++) {
    try {
      await generateScreen(additionalScreens[i], i);
    } catch (err) {
      console.error(`Failed ${additionalScreens[i].name}:`, err.message);
    }
  }
  console.log("\nAll additional components generated successfully!");
}

run().catch(console.error);
