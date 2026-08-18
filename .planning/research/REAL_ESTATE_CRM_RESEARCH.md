# Real Estate Broker & Forum CRM: Architecture & Engineering Blueprint
**Specialized for Real Estate Brokerages, Advisory Forums & Social-First Lead Ingestion (YouTube & Instagram)**

---

## 1. Core Paradigm Shift: Broker/Forum Model vs. Builder Model

| Dimension | Builder / Developer CRM | Broker / Advisory Forum CRM (Our Focus) |
|---|---|---|
| **Inventory Authority** | Owns & constructs towers, units, payment slabs | **Multi-Developer Project Catalog & Master Listings** across 100s of builders & resale |
| **Lead Sources** | Property portals (99acres, Magicbricks) & Print | **YouTube Walkthroughs/Reviews, Instagram Reels/DMs, Video bio forms, Forum members** |
| **Lead Attribution** | Campaign / Ad Group level | **Granular Video/Reel ID attribution** (knows exact property featured in the YouTube/Insta video) |
| **Sales Workflow** | Hard selling 1-2 builder projects | **Consultative Requirement Profiling & Multi-Project Matching Engine** |
| **Site Visit Model** | Site sales office check-in | **Broker-Escorted Site Visit** across multiple developer projects in one day |
| **Revenue Model** | Unit Sale Price Collection | **Builder Commission & Brokerage Slab Tracking** (Invoice submission, RERA compliance, co-broker split) |
| **Forum/Network Layer** | None (Closed internal team) | **Broker Community / Sub-Agent Network**: Co-brokering, deal sharing, referral commission splits |

---

## 2. YouTube & Instagram Lead Ingestion Architecture

```
                                    SOCIAL LEAD SOURCES
               ┌──────────────────────────────┬──────────────────────────────┐
               │   YouTube Channel Lead Flow  │  Instagram Channel Lead Flow │
               └──────────────┬───────────────┴──────────────┬───────────────┘
                              │                              │
         ┌────────────────────┼──────────────────────────────┼────────────────────┐
         │                    │                              │                    │
   [Video Link in Bio] [Pinned Comment Link]         [Instagram Lead Ads]   [IG Direct Messages]
   (UTM: video_id,     (UTM: project_id,             (Meta Graph API        (Instagram Messaging API
    timestamp)          wa_trigger)                   Webhook)               Keyword triggers)
         │                    │                              │                    │
         └────────────────────┼──────────────────────────────┼────────────────────┘
                              ▼                              ▼
             ┌─────────────────────────────────────────────────────────────┐
             │       INGESTION GATEWAY (HMAC & Idempotency Filter)         │
             │  • Validates Meta signatures & Webhook Tokens               │
             │  • Parses UTM: video_id, reel_id, utm_source, property_id   │
             │  • Saves raw event to Postgres Webhook Inbox (Durable)      │
             └──────────────────────────────┬──────────────────────────────┘
                                            │
                                            ▼
             ┌─────────────────────────────────────────────────────────────┐
             │             POSTGRES TRANSACTIONAL OUTBOX                   │
             │  • Contact Normalization (E.164 phone, clean name)          │
             │  • Create/Link `Contact` -> Create new `Inquiry/Opportunity`│
             │  • Auto-tag with featured YouTube/Insta property            │
             └──────────────────────────────┬──────────────────────────────┘
                                            │
                                            ▼
             ┌─────────────────────────────────────────────────────────────┐
             │         INSTANT SPEED-TO-LEAD AUTOMATION (<60 SEC)          │
             │  1. Instant WhatsApp Template sent to lead referencing the  │
             │     exact video: "Saw you liked our 3BHK video of Sobha!"   │
             │  2. Round-robin assignment to specialized broker agent       │
             │  3. Agent instant mobile push notification / CTI dialer     │
             └─────────────────────────────────────────────────────────────┘
```

---

## 3. Core System Modules for Real Estate Brokerages

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    BROKER & ADVISORY FORUM CRM PLATFORM                         │
├───────────────────────────────────┬─────────────────────────────────────────────┤
│ 1. SOCIAL INGESTION & ATTRIBUTION │ 2. CONTACTS & OPPORTUNITY PIPELINE          │
│  • YouTube Video/Shorts UTM tracker│  • Split Contact (Identity) vs Opportunity │
│  • Instagram DM & Lead Ads webhook│  • Requirement Profiling (BHK, budget, area)│
│  • WhatsApp click-to-chat router  │  • Multi-stage consultative Kanban pipeline │
├───────────────────────────────────┼─────────────────────────────────────────────┤
│ 3. MULTI-BUILDER PROJECT CATALOG  │ 4. SITE VISIT & DEVELOPER COORDINATION      │
│  • Multi-Developer Project Database│  • Multi-project itinerary builder (Day trip)│
│  • Brochure & Video Link library  │  • Builder sales manager POC directory      │
│  • Instant WhatsApp Project Share │  • Buyer WhatsApp confirmation & map pins   │
├───────────────────────────────────┼─────────────────────────────────────────────┤
│ 5. BROKER FORUM & CO-BROKERING    │ 6. COMMISSION & DEAL CLOSING ENGINE         │
│  • Member / Freelance Broker portal│  • Developer Commission Slabs (2% - 5%)    │
│  • Referral submission & tracking │  • Deal Registration with Developer         │
│  • Co-brokering split agreements  │  • Milestone Invoicing (Booking/Agreement)  │
├───────────────────────────────────┼─────────────────────────────────────────────┤
│ 7. OMNICHANNEL COMMUNICATIONS     │ 8. TEAM GOALS & REVENUE ANALYTICS           │
│  • WhatsApp Cloud API 2-way inbox │  • Content ROI: Leads & Revenue per Video   │
│  • Click-to-Call (Twilio/Exotel)  │  • Sales Agent Conversion Leaderboard       │
│  • Video-tailored quick responses │  • Projected vs Collected Brokerage Revenue │
└───────────────────────────────────┴─────────────────────────────────────────────┘
```

### Module Breakdown:

#### 1. Social Lead Ingestion & Attribution Engine
- **YouTube Ingestion**:
  - Web landing page forms with dynamic parameter capture (`?utm_source=youtube&v={video_id}&project={project_slug}`).
  - Direct WhatsApp links with pre-filled video tags (`https://wa.me/919999999999?text=Hi, I watched your YouTube review of Godrej Woods (ID: GW302)`).
- **Instagram Ingestion**:
  - Meta Lead Ads Webhook integration with automatic signature validation (`X-Hub-Signature-256`).
  - Instagram Messaging API (Direct Message Keyword Automation): If user DMs "PRICE" on a reel, webhook triggers automated catalog response and captures phone number for CRM.
- **Content Performance Tracking**:
  - Track metrics per YouTube Video / Insta Reel: Views, Inquiries generated, Site visits conducted, Deals closed, Commission generated.

#### 2. Requirement Profiling & Consultative Pipeline
- **Contact vs Opportunity Separation**:
  - A `Contact` (Person with E.164 phone & email) can have multiple `Opportunities` (e.g. Inquired for 2BHK in 2024, came back for Commercial Plot in 2026).
- **Comprehensive Property Requirement Profile**:
  - Property Type: Residential (Apartment, Villa, Plot, Penthouse) / Commercial (Office, Retail).
  - Purpose: End Use vs Investment (Expected ROI / Rental Yield).
  - Configurations: 1 BHK / 2 BHK / 3 BHK / 4+ BHK.
  - Budget Range: Min - Max (with Loan Pre-approval status).
  - Target Micro-markets / Localities.
  - Possession Timeline: Ready to Move / Under Construction (6m, 1yr, 2yr+).
- **Consultative Pipeline Stages**:
  1. `New Lead (From YT/Insta)`
  2. `Requirement Discovery Call`
  3. `Project Shortlist Shared`
  4. `Site Visit Scheduled (Single / Multi-Project)`
  5. `Site Visit Completed`
  6. `Developer Negotiation & Unit Selection`
  7. `Booking Token Paid (Deal Registered with Builder)`
  8. `Agreement Signed & Brokerage Invoiced`
  9. `Brokerage Received (Closed Won)`
  10. `Lost / Inactive (Tagged with Objection reason)`

#### 3. Multi-Developer Project Catalog & Collateral Vault
- Brokerages do not maintain individual brick-and-mortar floor-by-floor construction databases; they maintain an **Actionable Project Library**:
  - Developer Name (e.g. Prestige, Sobha, DLF, Emaar, Godrej).
  - Project Details: Location, RERA Number, Possession Date, Price per sqft, Sizes, Master Plan PDF, Approved Banks.
  - Media & Social Assets: Link to your own YouTube Walkthrough Video, Instagram Reel link, High-res Brochure, Cost Sheet Calculator.
  - Commercial Terms: Builder Base Commission % (e.g. 2.5%), Special Slab Incentives (e.g. +0.5% for 3+ bookings), Developer Sales Manager Contact details.
  - 1-Click WhatsApp Collateral Sharing: Agent can instantly share brochure, YouTube review, and sample cost sheet via WhatsApp with 1 click.

#### 4. Site Visit Itinerary Planner
- Multi-project Site Visits: In brokerage workflows, a client often visits 2 to 3 projects from different developers on the same Saturday/Sunday.
- Itinerary Generator: Builds a structured schedule with Google Maps locations, developer sales rep contact numbers, and sends an itinerary link to the buyer via WhatsApp.

#### 5. Broker Forum & Co-Brokering Sub-Agent Network
- **Member Access / Forum Portal**:
  - Community brokers and freelance agents can submit client leads.
  - **Lead Protection Guarantee**: Lead is locked to the referring broker for 45-60 days.
  - **Commission Split Rules**: Pre-configured split (e.g., 70% to primary closer, 30% to referring forum member).
  - Live Status Tracking: Forum member can see transparent updates ("Site Visit Done", "Booking Token Received", "Commission Invoiced").

#### 6. Brokerage Commission & Developer Invoicing Engine
- Track full commission lifecycle:
  - Total Deal Value (Agreement Value).
  - Expected Commission % & Gross Brokerage amount.
  - Builder Invoice Generation with RERA details & GST calculation.
  - Payout Tranches: Tranche 1 (on Booking/Token), Tranche 2 (on Agreement Registration).
  - Internal Sales Agent Incentive Calculation + External Co-broker Split.

---

## 4. Production Database Entity Schema (PostgreSQL)

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  Organization   │ 1───* │      User       │ 1───* │  AssignmentLog  │
│  (Tenancy Root) │       │ (Admins/Brokers)│       └─────────────────┘
└────────┬────────┘       └────────┬────────┘
         │                         │ 1
         │ 1                       │
         │                         *
         │                ┌─────────────────┐
         ├──────────────* │     Contact     │
         │                │ (Normalized PII)│
         │                └────────┬────────┘
         │                         │ 1
         │                         │
         │                         *
         │                ┌─────────────────┐       ┌─────────────────┐
         ├──────────────* │   Opportunity   │ 1───* │  OpportunityTag │
         │                │ (Inquiry/Deal)  │       └─────────────────┘
         │                └────────┬────────┘
         │                         │ 1
         │                         │
         │         ┌───────────────┼───────────────┬───────────────┐
         │         │ 1             │ 1             │ 1             │ 1
         │         *               *               *               *
         │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
         │  │Requirement │  │ SiteVisit  │  │DealBooking │  │ActivityLog │
         │  │  Profile   │  │ (Itinerary)│  │ & Comm.    │  │(Calls/WA)  │
         │  └────────────┘  └─────┬──────┘  └─────┬──────┘  └────────────┘
         │                        │               │
         │                        *               *
         │                ┌──────────────────────────────┐
         ├──────────────* │      ProjectCatalog          │
         │                │ (Multi-Developer Projects)   │
         │                └──────────────┬───────────────┘
         │                               │ 1
         │                               │
         │                               *
         │                ┌──────────────────────────────┐
         └──────────────* │   ChannelPartner / Member    │
                          │   (Sub-broker & Forum users) │
                          └──────────────────────────────┘
```

### Detailed Table Specifications:

1. **`Organization`**: Multi-tenant container (Brokerage name, branding, RERA number, country/currency settings).
2. **`User`**: Internal staff (`SUPER_ADMIN`, `BROKER_MANAGER`, `SALES_EXECUTIVE`, `TELECALLER`).
3. **`Contact`**: Centralized person record (`first_name`, `last_name`, `phone_e164`, `email`, `whatsapp_number`, `consent_given_at`).
4. **`Opportunity`**: Specific buying cycle (`contact_id`, `assigned_to_user_id`, `stage`, `source_type`: YOUTUBE / INSTAGRAM_AD / INSTAGRAM_DM / FORUM_MEMBER, `source_video_id`, `source_reel_id`, `utm_campaign`, `budget_min`, `budget_max`, `estimated_deal_value`, `status`: ACTIVE / WON / LOST).
5. **`RequirementProfile`**: Structured client wish list (`property_types`, `bhk_types`, `target_localities`, `purpose`: INVESTMENT / END_USE, `possession_timeline`).
6. **`ProjectCatalog`**: Developer project master list (`developer_name`, `project_name`, `location`, `rera_id`, `price_range_min`, `price_range_max`, `bhk_options`, `brochure_url`, `youtube_review_url`, `developer_contact_name`, `developer_contact_phone`, `commission_percent_standard`).
7. **`SiteVisit`**: (`opportunity_id`, `project_id`, `scheduled_at`, `status`: SCHEDULED / COMPLETED / CANCELLED / NO_SHOW, `executive_user_id`, `pickup_required`, `notes`, `rating_score`).
8. **`DealBooking`**: (`opportunity_id`, `project_id`, `unit_number`, `agreement_value`, `developer_commission_percent`, `gross_brokerage_amount`, `co_broker_member_id`, `co_broker_split_amount`, `agent_incentive_amount`, `invoice_status`: DRAFT / SENT / PAID, `booking_date`).
9. **`ActivityLog`**: Immutable activity stream (`opportunity_id`, `user_id`, `activity_type`: CALL / WHATSAPP / NOTE / STAGE_CHANGE / SITE_VISIT, `content`, `recording_url`, `metadata_json`).
10. **`ChannelPartnerMember`**: Forum & sub-broker directory (`user_id`, `agency_name`, `rera_number`, `commission_split_default`, `total_deals_referred`, `payout_bank_details`).
11. **`WebhookInbox`**: Raw payload store with unique event hash for guaranteed idempotency (`source`: META / YOUTUBE / WEBPAGE, `event_hash`, `payload_json`, `processed_at`, `status`).

---

## 5. Technical Architecture & Stack

| Layer | Chosen Technology | Rationale for Broker / Forum CRM |
|---|---|---|
| **Frontend UI** | **Next.js 15 (App Router) + TypeScript + Tailwind CSS** | Server-rendered fast load times for project catalogs, high-performance interactive CRM pipeline |
| **Component System** | **Shadcn UI + Radix UI + Lucide Icons + Framer Motion** | Professional, polished SaaS aesthetics with responsive layouts for desktop & mobile |
| **Data Grid & Kanban** | **TanStack Table v8 + TanStack Virtual + @hello-pangea/dnd** | Smooth drag-and-drop lead kanban, virtualized high-volume lead tables |
| **Backend & APIs** | **Next.js API Route Handlers + Modular Service Layer** | Strongly typed, clean separation between ingestion webhooks, lead services, and reporting |
| **Database & ORM** | **PostgreSQL + Prisma ORM** | Relational consistency, robust migration history, type-safe queries |
| **Queue / Background Jobs**| **Redis + BullMQ** | Handles Instagram/Meta webhook bursts, instant speed-to-lead WhatsApp triggers, SLA escalation timers |
| **WhatsApp Integration** | **Official Meta WhatsApp Business Cloud API** | Verified business messaging, 2-way live chat inbox, 1-click video/brochure PDF sharing |
| **Telephony / CTI** | **Twilio / Exotel Click-to-Call** | Outbound calling directly from the lead card with automatic call recording storage |
| **Storage** | **Cloudflare R2 / AWS S3 / Supabase Storage** | Fast and cost-effective brochure PDFs, floor plans, and call audio recordings |

---

## 6. Implementation Roadmap for Real Estate Broker CRM

### Phase 1: Foundation, Multi-Tenant Auth & Role Permissions
- Tenant creation (Brokerage organization), RBAC (`Admin`, `Sales Executive`, `Telecaller`, `Forum Partner`).
- Base layout, dark/light theme, modern navigation system.

### Phase 2: Social Lead Ingestion & Attribution Engine (YouTube & Instagram)
- Webhook endpoints for Meta Lead Ads & Instagram Graph API with HMAC validation.
- YouTube video URL parameter parser & UTM tracker.
- Idempotent Webhook Inbox in Postgres & BullMQ worker.
- Contact normalization & auto-creation of Opportunities linked to specific YouTube/Insta content.

### Phase 3: Consultative Pipeline (Kanban), Activity Timeline & Communication Hub
- Drag-and-drop Real Estate Kanban stages with quick filters (by Video Source, Budget, Locality, Agent).
- Lead Detail View with full Requirement Profiling.
- 2-way WhatsApp Cloud API messaging with pre-configured project templates.
- Click-to-call dialer with activity logging.

### Phase 4: Multi-Developer Project Catalog & Collateral Vault
- Developer & Project management CRUD (RERA numbers, price slabs, amenities, brochure uploads).
- Embedded YouTube review links & Instagram reel previews inside the project catalog.
- 1-Click WhatsApp project brochure & video sharing to prospects.

### Phase 5: Site Visit Coordination & Itinerary Generator
- Multi-project site visit scheduler (client + executive + developer sales office).
- Shareable client itinerary with Google Maps pins & developer POC contact details.
- Post-visit feedback & objection logger.

### Phase 6: Forum Sub-Broker / Co-Brokering Portal & Commission Ledger
- Dedicated portal for freelance brokers / forum members to submit leads & track status.
- Lead protection lock system (45-day anti-collision window).
- Deal closing recorder, developer commission invoicing, and sub-broker split calculator.

### Phase 7: Content ROI Analytics, Leaderboards & Conversion Reports
- Content ROI Dashboard: Revenue & Inquiries generated per YouTube Video and Instagram Reel.
- Agent Conversion Funnel & Speed-to-Call SLA metrics.
- Projected vs Collected Brokerage revenue charts.
