const https = require('https');

const apiKey = 'AQ.Ab8RN6L66FcnvT4dR7iH7xUsijynkM8cxoXliLXNUwbAyNlOVA';
const projectId = '16278590490276822151';

const additionalScreens = [
  {
    key: '16_mobile_caller_telephony_companion',
    deviceType: 'MOBILE',
    prompt: `Design a hyper-focused Mobile Telecaller & Broker Field Companion Web App for ZamZam Real Estate CRM (Navi Mumbai).
AESTHETIC & THEME: Architectural Botanical Ledger. Deep Cypress Forest Green (#1B4332), Warm Terracotta/Amber Ochre (#D97706), Alabaster background (#FBFBF9), crisp white cards (#FFFFFF). Typography: Plus Jakarta Sans for UI headers, JetBrains Mono for numbers.

LAYOUT & STRUCTURE (Mobile Viewport 390x844):
1. TOP STATUS BAR: Broker profile (Aakash Verma - Senior Closer), Online status badge (Active Line 022-4897-2011), Battery/Signal indicators.
2. INCOMING CALL / ACTIVE CALL HERO CARD:
   - Floating caller HUD: "Dr. Sameer Deshmukh (Orthopedic Surgeon)"
   - Phone: "+91 98201 44521" (JetBrains Mono)
   - Source Tag: [YouTube Short: Kharghar Sec 35 Luxury 3BHK]
   - Speed-to-Lead SLA: "⚡ 00:42s Elapsed" (Amber pulse badge)
   - Brixi AI Score: "94/100 • Hot Prospect" (01 Intent: Immediate • 02 Budget: ₹1.65 Cr • 03 Loc: Sec 35/36 • 04 Time: <30 Days)
3. 1-CLICK CALL ACTIONS (Thumb-friendly row):
   - [Mute] [Speaker] [Hold] [Record Active (02:14)]
4. RAPID DISPOSITION BUTTON GRID (2x2 color-coded grid):
   - [✓ Site Visit Booked] (Forest Green #1B4332)
   - [💬 WhatsApp Floor Plans] (Emerald #10B981)
   - [⏰ Callback in 2h] (Amber #D97706)
   - [✕ Price Objection] (Slate #64748B)
5. LIVE QUICK NOTES & AUDIO MEMO:
   - Voice-to-text note field: "Buyer requires East-facing Vastu compliant unit on 12th+ floor with 2 covered car parkings."
   - Quick tags: #HighBudget #VastuEast #WantsBalcony #SaturdayTour
6. BOTTOM DOCK (Floating bottom bar):
   - [Dialer] [Lead Queue (14)] [My Visits (3)] [Inventory]`,
  },
  {
    key: '17_mobile_client_presentation_portal',
    deviceType: 'MOBILE',
    prompt: `Design a Luxury Mobile Property Presentation Portal for high-net-worth real estate buyers in Navi Mumbai (ZamZam Properties).
AESTHETIC & THEME: Architectural Botanical Ledger. Deep Cypress Forest Green (#1B4332), Warm Terracotta/Amber Ochre (#D97706), Alabaster background (#FBFBF9), crisp white cards (#FFFFFF). Typography: Plus Jakarta Sans for UI headers, JetBrains Mono for prices.

LAYOUT & STRUCTURE (Mobile Viewport 390x844):
1. STICKY TOP BRAND HEADER:
   - ZamZam Properties gold seal logo
   - "Curated Portfolio for Dr. Sameer Deshmukh"
   - Direct Broker Action: [Call Aakash (Closer)] [Chat on WhatsApp]
2. HERO PROPERTY CARD (Swipeable Carousel):
   - Full-bleed 4K Architectural Photography of "Crown Heights - Tower A, Kharghar Sector 35"
   - Live MahaRERA Verified Seal: "P52000028914 (CIDCO Clear)"
   - Status Badge: "Under Construction • Dec 2026 Possession"
   - Key Specs Grid: "3 BHK Premium • 1,180 sq.ft Carpet • 14th Floor • Golf Course Facing"
3. CAPITALIZED STATUTORY COST BREAKDOWN (Clean Accordion Card):
   - Base Agreement Value: "₹1,45,00,000"
   - Stamp Duty (6%): "₹8,70,000"
   - Maha Registration: "₹30,000"
   - GST (5% UC): "₹7,25,000"
   - Society Corpus & Maintenance: "₹3,50,000"
   - All-In Statutory Total: "₹1,64,75,000" (Bold Emerald JetBrains Mono)
4. INTERACTIVE FLOOR PLAN & 4K VIDEO:
   - High-res architectural layout preview with zoom icon
   - "Watch 4K Drone Walkthrough Video" with play thumbnail
5. ESCORTED SITE VISIT SCHEDULER:
   - Date picker chips: [Sat 24 Aug] [Sun 25 Aug] [Mon 26 Aug]
   - Time slot chips: [11:00 AM] [03:30 PM] [05:00 PM]
   - Pickup Service: "Complimentary AC Cab Pickup from Kharghar Station"
   - Primary CTA: [Confirm VIP Site Visit & Request Cab] (Forest Green Button)`,
  },
  {
    key: '18_call_log_waveform_disposition_modal',
    deviceType: 'DESKTOP',
    prompt: `Design a high-density Call Log & Audio Waveform Disposition Modal for ZamZam Real Estate CRM.
AESTHETIC & THEME: Architectural Botanical Ledger. Deep Cypress Forest Green (#1B4332), Warm Terracotta/Amber Ochre (#D97706), Alabaster background (#FBFBF9), crisp white cards (#FFFFFF). Typography: Plus Jakarta Sans for UI headers, JetBrains Mono for numbers.

LAYOUT & STRUCTURE (Centered Desktop Modal 900x700 with dimmed backdrop):
1. MODAL HEADER:
   - "Call Session Log & Intelligence Capture"
   - Lead: "Vikram Malhotra • +91 98200 88712" • Source: "Instagram Reel #KhargharSec35"
   - Telecaller: "Neha Sharma (Line #04)" • Duration: "04m 32s" • Recorded At: "Today 16:45 IST"
2. AUDIO WAVEFORM & AI TRANSCRIPTION PLAYER:
   - Interactive scrubbable waveform visualizer with playback speed (1x, 1.25x, 1.5x)
   - AI Key Moments Chips: [00:45 Budget Stated: ₹1.2 Cr] [02:10 Wants Sec 35] [03:40 Prefers Ready Possession]
   - Live AI Transcript summary: "Client currently renting in Vashi. Looking to buy 2BHK in Kharghar Sector 35 near Metro station with possession before Diwali 2026. Husband & Wife both working in BKC."
3. 1-CLICK CALL DISPOSITION MATRIX:
   - Selected: [✓ Site Visit Scheduled for Sunday 11 AM]
   - Other selectable pills: [Connected - Interested] [Follow Up Needed] [Busy / Callback] [Price Mismatch / Dropped]
4. NEXT CONNECT & REMINDER SCHEDULER:
   - Auto-set reminder: "Send Crown Heights & Paradise Heights brochure pack on WhatsApp"
   - Due Date: "Tomorrow 10:30 AM" • Priority: "HIGH"
5. INSTANT WHATSAPP TEMPLATE DISPATCHER:
   - Template: "Post-Call Verified Brochure + Location Pin"
   - Message Preview: "Dear Vikram ji, Thank you for speaking with ZamZam Properties. As discussed, here is the verified MahaRERA brochure and video link for Crown Heights Kharghar Sec 35..."
6. MODAL FOOTER:
   - [Cancel] [Save & Dispatch WhatsApp (Enter)] (Primary Forest Green #1B4332)`,
  },
  {
    key: '19_site_visit_token_closing_modal',
    deviceType: 'DESKTOP',
    prompt: `Design a VIP Site Visit Completion & Token Booking Modal for ZamZam Real Estate CRM.
AESTHETIC & THEME: Architectural Botanical Ledger. Deep Cypress Forest Green (#1B4332), Warm Terracotta/Amber Ochre (#D97706), Alabaster background (#FBFBF9), crisp white cards (#FFFFFF). Typography: Plus Jakarta Sans for UI headers, JetBrains Mono for numbers.

LAYOUT & STRUCTURE (Centered Desktop Modal 960x720):
1. MODAL HEADER:
   - "Escorted Site Visit Completion & Deal Token Capture"
   - Tour Ref: "#VST-2026-0842" • Client: "Dr. Sameer Deshmukh" • Escort Closer: "Aakash Verma"
2. TOUR FEEDBACK & INTEREST LEVEL:
   - Star Rating: 5/5 Stars [★★★★★]
   - Client Verdict Selector: [✓ Token Advance Submitted] [High Interest - Decision in 48h] [Request Alternative Layouts]
   - Feedback Notes: "Client loved the 14th floor layout and the 24ft wide living room deck. Confirmed booking for Unit A-1402."
3. TOKEN BOOKING PARTICULARS:
   - Selected Unit: "Crown Heights - Unit A-1402 (3BHK 1,180 sq.ft)"
   - Agreed Base Value: "₹1,45,00,000"
   - Token Amount Received: "₹1,00,000" (JetBrains Mono)
   - Payment Mode: [NEFT / IMPS] [Cheque] [UPI] (Ref #TXN-HDFC-99482103)
   - Developer Cheque Payable: "M/s Crown Infra Projects Pvt Ltd"
4. BROKER COMMISSION CALCULATION PREVIEW:
   - Gross Brokerage (2.5%): "₹3,62,500"
   - Rep Incentive Split (50%): "₹1,81,250"
   - Firm Net Realized: "₹1,81,250"
5. COMMISSION INVOICING TRIGGER:
   - Checkbox: [✓ Generate Phase 1 Developer Advance Invoice (18% GST)]
6. MODAL FOOTER:
   - [Save Visit Notes Only] [Confirm Deal & Advance to Stage: Closed Won] (High-contrast Forest Green Button)`,
  },
  {
    key: '20_developer_tax_invoice_voucher',
    deviceType: 'DESKTOP',
    prompt: `Design an Official Maharashtra MahaRERA Brokerage GST Tax Invoice & Commission Voucher for ZamZam Real Estate CRM.
AESTHETIC & THEME: Architectural Botanical Ledger. Deep Cypress Forest Green (#1B4332), Warm Terracotta/Amber Ochre (#D97706), Alabaster background (#FBFBF9), crisp white cards (#FFFFFF). Typography: Plus Jakarta Sans for UI headers, JetBrains Mono for numbers.

LAYOUT & STRUCTURE (Formal A4 Document Preview 800x1050):
1. TAX INVOICE HEADER:
   - Company: "ZAMZAM PROPERTIES ADVISORY LLP"
   - Address: "Office 402, Goodwill Infinity, Sector 18, Kharghar, Navi Mumbai - 410210"
   - GSTIN: "27AAHFZ1234F1Z8" • MahaRERA Agent Reg: "A52000019284"
   - Invoice No: "INV/2026-27/084" • Invoice Date: "22 August 2026"
2. BILL TO (Developer Details):
   - Developer Name: "Crown Infra Developers Pvt Ltd"
   - Project: "Crown Heights, Sector 35, Kharghar, Navi Mumbai"
   - Project MahaRERA: "P52000028914" • Developer GSTIN: "27AABCC5544E1Z1"
3. DEAL TRANSACTION PARTICULARS TABLE:
   - Item #1: "Professional Real Estate Advisory & Brokerage Services for Unit A-1402 (3BHK)"
   - SAC Code: "997222 (Real Estate Agency Services)"
   - Buyer Name: "Dr. Sameer Deshmukh"
   - Registered Agreement Value: "₹1,45,00,000"
   - Commission Rate: "2.50%"
   - Taxable Brokerage Amount: "₹3,62,500.00"
4. STATUTORY TAX CALCULATION:
   - CGST @ 9.0%: "₹32,625.00"
   - SGST @ 9.0%: "₹32,625.00"
   - Total Tax (18.0%): "₹65,250.00"
   - Gross Invoice Total: "₹4,27,750.00" (JetBrains Mono Bold)
   - Amount in Words: "Rupees Four Lakh Twenty-Seven Thousand Seven Hundred Fifty Only"
5. BANKING SETTLEMENT DETAILS:
   - Bank Name: "HDFC Bank Ltd, Kharghar Branch"
   - Current A/c No: "50200018894123" • IFSC: "HDFC0001234"
6. AUTHORIZED SIGNATURE & DIGITAL MAHARERA VERIFIED STAMP:
   - QR Code for GST portal validation
   - Authorized Signatory stamp for ZamZam Properties Advisory`,
  }
];

async function mcpPost(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request('https://stitch.googleapis.com/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-Goog-Api-Key': apiKey,
      },
    }, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(resBody));
        } catch (e) {
          resolve({ raw: resBody });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log(`Starting Stitch Generation of ${additionalScreens.length} missing end-to-end screens into Project: ${projectId}`);

  for (let i = 0; i < additionalScreens.length; i++) {
    const s = additionalScreens[i];
    console.log(`\nGenerating Screen [${i + 1}/${additionalScreens.length}]: ${s.key} (${s.deviceType})...`);
    
    try {
      const response = await mcpPost({
        jsonrpc: '2.0',
        id: 200 + i,
        method: 'tools/call',
        params: {
          name: 'generate_screen_from_text',
          arguments: {
            projectId: projectId,
            prompt: s.prompt,
            deviceType: s.deviceType,
            modelId: 'GEMINI_3_FLASH',
          },
        },
      });

      console.log(`Result for ${s.key}:`, JSON.stringify(response.result?.content?.[0]?.text || response.result || response).slice(0, 300));
      // Give 3s delay to ensure rate compliance
      await new Promise((r) => setTimeout(r, 3000));
    } catch (err) {
      console.error(`Error generating ${s.key}:`, err.message);
    }
  }

  console.log('\nAll missing end-to-end screens successfully generated in Stitch!');
}

main().catch(console.error);
