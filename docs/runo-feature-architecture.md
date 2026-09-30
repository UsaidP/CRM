# Runo.ai Feature Parity Architecture
> Research date: 2026-09-29 | Architect: Software Architect Agent
> Source: https://runo.ai — AI-Powered SIM Based Call Management CRM

---

## 1. What Runo Is (Product Intelligence)

Runo is a **mobile-first, SIM-based Call Management CRM** targeting field sales teams
(telecallers, inside-sales reps, real-estate agents). Its core thesis:

> *Every sales call from an agent's personal SIM should auto-log itself, get an AI
> summary, update the lead stage, and surface in a manager's dashboard — without the
> rep typing anything.*

Two product SKUs:
| SKU | Description |
|---|---|
| **Call Management App** | SIM-based auto-call logging, AI summaries, power dialer, manager analytics |
| **WhatsApp CRM** | WhatsApp-native inbox, template messaging, broadcast, pipeline |

Compliance claims: GDPR, ISO 27001, AICPA SOC.

---

## 2. Full Feature Inventory (by Category)

### 2.1 Call Intelligence (Core Differentiator)

| Feature | Description |
|---|---|
| **Auto Call Log** | Every call (inbound + outbound) from agent SIM logs automatically — no manual entry |
| **Call Duration Tracking** | Duration, timestamp, direction captured per call |
| **AI Call Summary** | Post-call AI generates a natural language summary of what was discussed |
| **Call Disposition** | Rep marks outcome (interested, callback, not interested, etc.) post-call |
| **Call Notes** | Freeform notes field auto-associated with the lead |
| **Call Recording** | Optional recording stored and linked to lead timeline |
| **Missed Call Alerts** | Manager notified of missed calls on rep SIM |
| **First Call Time SLA** | Tracks time-to-first-call from lead creation |
| **Call Frequency Metrics** | How many calls per lead, per rep, per day |

### 2.2 Power Dialer / Outbound Calling

| Feature | Description |
|---|---|
| **Click-to-Call** | One-tap outbound from lead card |
| **Auto Dialer / Preview Dialer** | Queued calling from lead lists |
| **Dial Plan / Call Queue** | Configurable order of calls |
| **Re-dial Logic** | Automatically retry unanswered/busy numbers |
| **Blacklist / DND Management** | Suppress numbers on national DND registry |
| **Campaign Calling** | Assign a batch of leads to a rep and dial through them |

### 2.3 Lead Management

| Feature | Description |
|---|---|
| **Lead Capture** | Web forms, WhatsApp inbound, Instagram DM, manual |
| **Lead Timeline** | Full chronological activity feed per lead |
| **Lead Stage Pipeline** | Kanban-style or list-based pipeline stages |
| **Lead Assignment** | Manual, round-robin, territory-based assignment |
| **Lead Scoring** | Priority scoring based on engagement signals |
| **Duplicate Detection** | Merge duplicate leads from the same contact |
| **Lead Notes & Tags** | Freeform notes + categorical tags |
| **Lead Reminders** | Schedule follow-up reminders with push/email notifications |
| **Bulk Import** | CSV upload for batch lead ingestion |
| **Lead Export** | Export filtered leads to CSV/Excel |
| **Source Attribution** | Track which campaign/channel generated the lead |
| **Lead Age / Staleness** | Flag leads with no activity for N days |

### 2.4 Manager Analytics & Dashboards

| Feature | Description |
|---|---|
| **Rep Performance Dashboard** | Calls made, connected rate, deals closed per rep |
| **Team Leaderboard** | Ranking reps by calls, follow-ups, conversions |
| **Call Activity Heatmap** | When are reps active vs idle |
| **Lead Funnel Report** | Conversion rates across pipeline stages |
| **Daily/Weekly/Monthly Reports** | Automated summary reports emailed to manager |
| **Export Analytics** | Download reports to Excel/CSV |
| **Goal Tracking** | Set targets (calls/day, deals/month) and track progress |
| **Disposition Breakdown** | What percentage of calls ended in each outcome |
| **Revenue / Commission Ledger** | Track brokerage earned per deal per rep |

### 2.5 WhatsApp CRM

| Feature | Description |
|---|---|
| **Shared Team Inbox** | All WhatsApp messages across numbers in one inbox |
| **Template Messaging** | Pre-approved WhatsApp Business message templates |
| **Broadcast / Bulk Messaging** | Send one message to a list of leads |
| **Quick Replies** | Canned responses for common questions |
| **Bot / Auto-Reply** | Keyword-triggered auto-responses |
| **Message Assignment** | Route incoming WhatsApp to specific rep |
| **Read Receipts & Seen Status** | Know if lead has read the message |
| **WhatsApp Pipeline** | Stage leads directly from WhatsApp conversation |
| **Media Sharing** | Send images, PDFs, videos from within CRM |
| **Label / Tag Conversations** | Categorise chats |

### 2.6 Team & User Management

| Feature | Description |
|---|---|
| **Role-Based Access Control** | Admin, Manager, Agent, Telecaller roles |
| **Team Creation** | Group reps under managers |
| **Territory / Geo Assignment** | Assign leads by geography to teams |
| **Manager Override** | Manager can re-assign leads from any rep |
| **Audit Trail** | Who did what, when |
| **Multi-SIM Support** | Multiple phone numbers per rep registered |

### 2.7 Integrations

| Category | Integrations |
|---|---|
| **Social** | WhatsApp Business API (Meta Cloud), Instagram Graph API, Facebook Leads |
| **Telephony** | SIM-based (Android companion app), Exotel, Ozonetel, MyOperator |
| **CRM Export** | Salesforce, Zoho, HubSpot (webhook/API) |
| **Google** | Google Sheets, Google Contacts sync |
| **Notifications** | Firebase push, SMS, email |
| **Web Hooks** | Custom inbound webhook for lead ingestion |

### 2.8 Mobile-First Features (Android App)

| Feature | Description |
|---|---|
| **Background Call Listener** | Listens to SIM call events even when app is closed |
| **Offline Mode** | Calls logged even without internet, synced on reconnect |
| **Contact Sync** | Pull phone contacts into CRM |
| **Push Notifications** | New lead alerts, reminder triggers, manager alerts |
| **Rep Check-in / Location** | Optional GPS check-in at site visits |

### 2.9 AI / Automation Features

| Feature | Description |
|---|---|
| **AI Call Summary** | GPT/LLM-powered call recap written for manager |
| **Sentiment Analysis** | Detect if call tone was positive / negative |
| **Next Action Suggestion** | AI recommends next step (follow-up call, send brochure, site visit) |
| **Lead Priority Scoring** | Algorithmic ranking based on engagement |
| **Auto-Stage Advancement** | Move lead to next stage after specific trigger (e.g., call > 3 min) |
| **Follow-up Nudges** | AI flags leads with no contact in 48h |

---

## 3. Gap Analysis: Current CRM vs Runo Features

### Already Built (Lucky CRM Has This)

| Feature | CRM Location |
|---|---|
| Lead management with stages | `Lead.currentStage`, `/leads` routes |
| Multi-source lead capture | `InboundCampaign`, webhook inbox |
| WhatsApp integration (Meta Cloud) | `WebhookEventInbox`, `BrokerPhoneNumber.whatsappPhoneNumberId` |
| Communication log | `CommunicationLog` (WHATSAPP, PHONE_CALL, SMS, INSTAGRAM_DM) |
| Call duration tracking | `CommunicationLog.callDurationSeconds` |
| Call recording URL | `CommunicationLog.callRecordingUrl` |
| Lead assignment (manual + round-robin) | `LeadAssignment.assignmentType` |
| Role-based access control | `RolePermission`, 5 roles |
| Team management | `Team` model |
| Lead reminders | `LeadReminder` with type/priority |
| Site visit scheduling | `SiteVisit` model |
| Deal transaction ledger | `DealTransaction` with brokerage math |
| Source attribution | `sourceCode`, `campaignId`, `leadSource` |
| Duplicate detection | `ContactMergeAudit` |
| Client portal (unique selling point) | `ClientPortal`, `PortalTelemetryLog` |
| Inventory management (RERA-compliant) | `DeveloperProject`, `PropertyUnit` |
| Analytics routes | `/analytics` |
| Calendar | `/calendar` |

### Missing / Not Yet Built (Runo-Exclusive Gaps)

| Priority | Feature | Complexity | Notes |
|---|---|---|---|
| HIGH | **AI Call Summary** | M | Gemini API call post-call; store in `CommunicationLog.metadataJson` |
| HIGH | **Auto Call Log (SIM-based)** | H | Android companion app or Exotel webhook auto-creates `CommunicationLog` |
| HIGH | **Call Disposition / Outcome** | L | Add `callOutcome` field to `CommunicationLog` |
| HIGH | **Rep Performance Dashboard** | M | Aggregate `CommunicationLog` + `Lead` by `assignedBrokerId` |
| MED | **Power Dialer / Click-to-Call** | M | WebRTC or Exotel outbound API triggered from lead card |
| MED | **Team Leaderboard** | L | Extend `/analytics` to show ranked rep scorecards |
| MED | **Lead Staleness / Age Flags** | L | `Lead.lastInboundMessageAt` already exists; add "stale > 48h" flag |
| MED | **WhatsApp Shared Team Inbox** | M | Group messages across all org `BrokerPhoneNumber`s into unified inbox |
| MED | **Broadcast / Bulk WhatsApp** | M | Queue a template message to a filtered lead list |
| MED | **Next-Action AI Suggestions** | M | LLM call per lead: recommend next touch based on stage + last comm |
| MED | **Lead Scoring** | M | Score = f(call count, WhatsApp replies, portal views, lead age) |
| LOW | **CSV Bulk Import** | L | Parse CSV, create Leads/Contacts in bulk |
| LOW | **Automated Daily Reports (Email)** | L | Cron job, aggregate metrics, send email digest to managers |
| LOW | **Goal Tracking (Calls/Day target)** | L | Add `UserGoal` model; track progress on `/analytics` |
| LOW | **Sentiment Analysis on Calls** | H | Requires call transcript, LLM sentiment; needs recording + STT pipeline |
| LOW | **Auto-Stage Advancement Rules** | M | Rule engine: "if call duration > 3 min, advance stage" |
| LOW | **WhatsApp Bot / Auto-Reply** | M | Keyword-match inbound messages, send template reply |
| LOW | **GPS Check-in at Site Visits** | M | Add `SiteVisit.checkinLat/Lon` + mobile browser geolocation |

---

## 4. Architecture Decision

### ADR-001: Modular Monolith Strategy

**Status**: Proposed

**Context**: Existing Lucky CRM is a well-structured Next.js + Prisma + PostgreSQL
monolith with 634 lines of schema covering real-estate workflows. Runo features
map well onto existing bounded contexts.

**Decision**: Add Runo features as new modules within the existing codebase, not
separate services. Small team, clear domain partitions, and no independent
scaling requirement makes a modular monolith the correct choice.

**Consequences**: Easier local dev; any future scaling can extract hot modules
(e.g., dialer, AI pipeline) later as microservices.

---

## 5. Phased Implementation Roadmap

### Phase A — Call Intelligence Layer (Highest ROI)
*Estimated: 2–3 weeks*

**Goal**: Every call auto-creates a CommunicationLog entry with AI summary.

**Schema additions:**
```prisma
// Add to CommunicationLog:
callOutcome     String?  // INTERESTED, CALLBACK, NOT_INTERESTED, NO_ANSWER, BUSY
aiSummary       String?  // LLM-generated summary
aiSentiment     String?  // POSITIVE, NEUTRAL, NEGATIVE
transcriptText  String?  // STT transcript
```

**New API routes:**
- `POST /api/calls/log` — webhook from Exotel/Android companion
- `POST /api/calls/[id]/summarize` — trigger AI summary
- `GET /api/calls/[leadId]` — call history

**UI changes:**
- Lead timeline: call cards with duration, outcome badge, AI summary
- Quick "Log Call" modal with outcome picker on every lead card

---

### Phase B — Rep Performance & Manager Analytics
*Estimated: 1–2 weeks*

**Goal**: Manager sees ranked rep scorecards and funnel conversion rates.

**New API routes:**
- `GET /api/analytics/rep-performance?from=&to=&teamId=`
- `GET /api/analytics/leaderboard`
- `GET /api/analytics/funnel`

**UI changes:**
- New `/analytics/performance` page with leaderboard + rep cards
- "Call Activity" section in existing `/analytics` dashboard

---

### Phase C — WhatsApp Shared Inbox + Broadcast
*Estimated: 2–3 weeks*

**Schema additions:**
```prisma
model WhatsAppMessage {
  id                  String   @id @default(uuid())
  organizationId      String
  brokerPhoneNumberId String
  leadId              String?
  wamid               String   @unique
  direction           String   // INBOUND, OUTBOUND
  messageType         String   // TEXT, IMAGE, DOCUMENT, AUDIO, TEMPLATE
  bodyText            String?
  mediaUrl            String?
  templateName        String?
  status              String   @default("SENT")
  sentAt              DateTime @default(now())
  deliveredAt         DateTime?
  readAt              DateTime?
  assignedToId        String?
  createdAt           DateTime @default(now())
}

model BroadcastCampaign {
  id             String    @id @default(uuid())
  organizationId String
  name           String
  templateName   String
  targetFilter   String    @default("{}")
  totalTargeted  Int       @default(0)
  totalSent      Int       @default(0)
  totalDelivered Int       @default(0)
  status         String    @default("DRAFT")
  scheduledAt    DateTime?
  completedAt    DateTime?
  createdAt      DateTime  @default(now())
}
```

---

### Phase D — Lead Intelligence (Scoring + AI Suggestions)
*Estimated: 1–2 weeks*

**Schema additions:**
```prisma
model LeadScore {
  id              String   @id @default(uuid())
  leadId          String   @unique
  lead            Lead     @relation(fields: [leadId], references: [id])
  score           Int      @default(0)    // 0–100
  breakdown       String   @default("{}")
  suggestedAction String?
  computedAt      DateTime @default(now())
}
```

**Score formula (v1):**
```
score = min(100,
  (callCount * 10) +
  (callDurationAvgMin * 5) +
  (portalViews * 3) +
  (whatsappReplies * 5) +
  (siteVisitDone * 20) -
  (daysSinceLastContact * 2)
)
```

---

### Phase E — Power Dialer / Click-to-Call
*Estimated: 2–4 weeks*

**Architecture options:**

| Option | How | Complexity | Cost |
|---|---|---|---|
| Exotel Click-to-Call API | Backend calls `/click2call` endpoint | Low | ~₹1–2/call |
| WebRTC + Twilio | In-browser calling, no phone needed | High | $0.015/min |
| Android Companion App | Native app detects SIM calls, webhooks to backend | Medium | Free |

**Recommended for v1**: Exotel click-to-call. Fastest to integrate, works on
existing phone numbers, auto-records, webhook on call-end creates CommunicationLog.

---

### Phase F — Bulk CSV Import + Automated Reports
*Estimated: 1 week*

- CSV parser → validate → upsert `Contact` + `Lead` in transaction
- Cron job → send weekly digest email to all managers with call stats

---

## 6. Technology Decisions

| Concern | Decision | Rationale |
|---|---|---|
| AI Summaries | Google Gemini Flash 1.5 | Cost-efficient; ecosystem fit |
| Speech-to-Text | Deepgram Nova-2 or Google Cloud STT | If recordings available |
| Telephony Webhooks | Exotel (India-first) | Best TRAI compliance |
| WhatsApp | Meta Cloud API (already in schema) | Already integrated |
| Background Jobs | Vercel Cron + pg-cron | Already on stack |
| Email | Resend.com | Simple API, great deliverability |
| Lead Scoring | Server-side computed, stored in `LeadScore` | Avoids client computation |

---

## 7. Bounded Context Map (After All Phases)

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Lucky CRM (Modular Monolith)                     │
├────────────────┬──────────────────┬──────────────────┬──────────────┤
│  CONTACT &     │  LEAD &          │  COMMUNICATION   │  ANALYTICS   │
│  IDENTITY      │  PIPELINE        │  HUB             │  & AI        │
│                │                  │                  │              │
│ Contact        │ Lead             │ CommunicationLog │ LeadScore    │
│ ContactIdentity│ LeadStage        │ WhatsAppMessage* │ RepPerf*     │
│ MergeAudit     │ LeadAssignment   │ BroadcastCampaign│ AISummary*   │
│                │ LeadReminder     │ CallDisposition* │ Leaderboard* │
│                │ LeadScore (NEW)* │ AutoDialer (NEW)*│              │
├────────────────┼──────────────────┼──────────────────┼──────────────┤
│  INVENTORY     │  DEALS &         │  PORTALS &       │  ADMIN &     │
│  (RERA)        │  COMMISSION      │  VISITS          │  RBAC        │
│                │                  │                  │              │
│ DeveloperProj  │ DealTransaction  │ ClientPortal     │ Organization │
│ PropertyUnit   │ CommissionLedger │ PortalTelemetry  │ User / Team  │
│ AuditLog       │ CobrokerMgmt     │ SiteVisit        │ RolePermission│
└────────────────┴──────────────────┴──────────────────┴──────────────┘
* = New additions from Runo feature parity
```

---

## 8. Quick Wins (Zero Schema Changes — Ship This Week)

1. **Call Staleness Badge** — On lead card, show "No contact in 5+ days" using
   `Lead.lastInboundMessageAt`. Already in schema. UI-only.

2. **Call Duration Stats on Lead** — Aggregate `CommunicationLog` by `leadId` to
   show "Total call time: 47 min across 12 calls". Already in DB.

3. **Team Leaderboard (v1)** — Sort reps by count of `CommunicationLog` rows in
   the last 7 days. Already in DB.

4. **Lead Source Attribution Report** — Pie chart of `Lead.leadSource` distribution.
   Already in DB.

5. **First Response SLA Tracker** — `Lead.firstResponseSlaMinutes` already in schema.
   Show warning on leads where SLA was breached (> 60 min).

---

## 9. Implementation Priority Scoring

| Phase | Business Impact | Dev Effort | Priority Score |
|---|---|---|---|
| Quick Wins (week 1) | Med | Very Low | **9/10** |
| A — AI Call Summary + Disposition | High | Medium | **9/10** |
| B — Rep Performance Dashboard | High | Low | **9/10** |
| E — Power Dialer (Exotel) | High | Medium | **8/10** |
| C — WhatsApp Shared Inbox | Med | Medium | **7/10** |
| D — Lead Scoring + AI Suggestions | Med | Medium | **7/10** |
| F — CSV Import + Email Reports | Low | Low | **5/10** |
| Broadcast Campaigns | Low | High | **4/10** |

---

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| TRAI DND compliance for outbound | Med | High | Use Exotel (TRAI-registered), honour DND registry |
| WhatsApp 24h messaging window | High | Med | Use approved templates; track conversation window in `WhatsAppMessage` |
| AI summary quality on short calls | Med | Low | Only summarise calls > 60 seconds |
| Recording storage costs | Low | Med | Supabase Storage; lifecycle rule to S3 Glacier after 90 days |
| LLM API latency on call end | Med | Low | Fire-and-forget background job; summary appears asynchronously |

---

*Produced by: Software Architect Agent | Lucky CRM | 2026-09-29*
*Research source: https://runo.ai (live crawl) + existing Prisma schema analysis*
