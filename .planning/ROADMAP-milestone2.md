# ROADMAP — Milestone 2: Runo-Parity Call Intelligence & Sales Management

**Milestone**: Runo.ai Feature Parity  
**Starts at**: Phase 14  
**Estimated total**: 12–15 weeks  
**Stack**: Next.js 14 App Router · Prisma · PostgreSQL (Supabase) · **Kotlin Android App** · Google Cloud STT · Gemini Flash 1.5 · Meta Cloud API · Firebase FCM · Vercel Cron

---

## How Physical SIM Call Recording Detection Works (The Real Architecture)

This is the exact same approach Runo uses. No virtual SIM. No cloud telephony middleman.

### End-to-End Flow Diagram

```
BROKER'S ANDROID PHONE                    YOUR CRM BACKEND (Next.js)
──────────────────────                    ────────────────────────────
ZamZam Companion App (Kotlin)
  └─ ForegroundService [always running]

Step 1: CALL STARTS
  TelephonyManager fires                  (CRM is idle — no action yet)
  CALL_STATE_OFFHOOK event
  App records: callStartedAt, direction,
               fromNumber, toNumber

Step 2: CALL IN PROGRESS
  Call happens on PHYSICAL SIM             (CRM is idle — no action yet)
  OEM native dialer records the call
  (Samsung/Xiaomi/Realme built-in
   saves recording to /storage/
   automatically — user must have
   call recording enabled in dialer)

Step 3: CALL ENDS
  TelephonyManager fires
  CALL_STATE_IDLE event
  App reads callDuration
  
  WorkManager task queues:
    1. Find OEM recording file in         
       /storage/Recordings/Call/ (±3s)    
    2. Request signed upload URL:
       POST /api/calls/upload-url        ──►  Generates Supabase S3 presigned URL
       ← returns { signedUrl, publicUrl }◄──  (Zero audio through Vercel serverless)
    3. Upload binary stream directly:
       PUT binary audio to signedUrl     ──►  Stored directly in Supabase Storage
    4. Fire call sync webhook:
       POST /api/webhooks/android         
       {                                 ──►  Webhook received (<300ms response):
         clientCallId: "uuid-v4-from-app"      • Idempotency verified via unique key
         fromNumber: "+917977552011"           • Matches BrokerPhoneNumber
         toNumber: "+919833012345"             • Matches Lead.phoneE164
         direction: "OUTBOUND"                 • Creates CommunicationLog
         durationSeconds: 247                  • Dispatches async AI worker job
         callStartedAt: "2026-09-29T..."       
         recordingUrl: "https://..."
         brokerAuthToken: "eyJ..."      
       }

Step 4: AI PIPELINE (async, CRM backend)
                                          BACKGROUND JOB fires:
                                          1. Download recording from storage
                                          2. POST to Google Cloud STT
                                             (hi-IN + en-IN multilingual)
                                          3. Receive transcript text
                                          4. POST to Gemini Flash 1.5:
                                             "Summarise this sales call in
                                              3 sentences. Caller is a real
                                              estate broker..."
                                          5. Store aiSummary + aiSentiment
                                             in CommunicationLog
                                          6. Trigger lead score recompute
                                          7. Evaluate auto-stage rules

Step 5: VISIBLE IN CRM (≤90 seconds after call)
                                          Lead timeline shows:
                                          📞 Outbound Call — 4m 07s
                                          🟢 POSITIVE sentiment
                                          Outcome: INTERESTED
                                          "Lead asked about 2BHK floor plans
                                          in Kharghar Sec 35. Interested in
                                          ready-to-move. Requested brochure."
                                          [Listen to Recording ▶]
```

### Call Recording: OEM Reality Check

| Phone Model | Recording Method | Both Sides? | Notes |
|---|---|---|---|
| **Samsung Galaxy** | Native Samsung Dialer built-in | ✅ Yes | India CSC (`INS`) region firmware — works out of box |
| **Xiaomi/Redmi/POCO** | MIUI/HyperOS built-in recorder | ✅ Yes | Must use Xiaomi Dialer, not Google Phone |
| **Realme/OPPO/Vivo** | ColorOS/FunTouchOS built-in | ✅ Yes | Enable in dialer settings |
| **OnePlus (OxygenOS)** | Built-in recorder | ✅ Yes | Available in India firmware |
| **Google Pixel** | Google Phone app | ⚠️ Partial | Records with audible announcement ("This call is being recorded") |
| **Stock Android** | None via third-party | ❌ No | Must use Exotel/cloud telephony as fallback |

**Recommendation for brokers**: Samsung or Xiaomi phones. Already common in the Navi Mumbai market.

### Android App: Where Recording File Is Found

```kotlin
// After call ends, WorkManager reads from standard OEM paths
val recordingPaths = listOf(
    "/storage/emulated/0/MIUI/sound_recorder/call_rec/",     // Xiaomi
    "/storage/emulated/0/Recordings/Call recordings/",        // Samsung
    "/storage/emulated/0/PhoneRecord/",                       // Realme/Oppo
    "/storage/emulated/0/Record/",                            // Vivo
)
// Find the most-recently-modified .mp3 or .ogg file
// within ±10 seconds of callEndedAt
```

---

## Phase 14: Physical SIM Call Sync & Audio AI Pipeline (3 Waves)
**Priority**: 🔴 HIGHEST | **Effort**: H (two repos: Android + CRM) | **Est**: 3–4 weeks

### Phase 14A: CRM Telephony Core & Manual Disposition UI (Week 1)
**Goal**: Build database schema, idempotent webhook receiver, manual call disposition modal, and lead timeline integration. Fully testable without requiring the Android app.

**Schema migration:**
```prisma
model CommunicationLog {
  // Existing fields stay. New additions:
  clientCallId     String?   @unique // Deterministic UUIDv4 deduplication key from Android
  callOutcome      String?   // INTERESTED | CALLBACK_REQUESTED | NOT_INTERESTED | NO_ANSWER | BUSY | WRONG_NUMBER | VOICEMAIL
  aiSummary        String?   // Gemini-generated 3-sentence summary
  aiSentiment      String?   // POSITIVE | NEUTRAL | NEGATIVE  
  transcriptText   String?   // Google Cloud STT raw transcript
  processingStatus String    @default("COMPLETED") // PENDING | PROCESSING | COMPLETED | FAILED
  
  @@index([organizationId, createdAt])
  @@index([leadId, createdAt])
}

model DeviceRegistration {
  id             String   @id @default(uuid())
  organizationId String
  userId         String   @unique
  user           User     @relation(...)
  fcmToken       String   // Firebase FCM device token
  deviceModel    String?  // e.g. "Samsung Galaxy A54"
  androidVersion String?  // e.g. "14"
  appVersion     String?  // Companion app version
  deviceSecret   String   // Hashed long-lived token for companion authentication
  lastSeenAt     DateTime @default(now())
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId])
}
```

**New API Routes:**
| Route | Method | Auth | Description |
|---|---|---|---|
| `POST /api/webhooks/android-companion` | POST | Bearer DeviceSecret | Idempotent webhook receiving call metadata |
| `POST /api/calls/upload-url` | POST | Bearer DeviceSecret | Returns presigned Supabase S3 upload URL |
| `POST /api/calls/manual` | POST | Session | Manually log call with outcome |
| `PATCH /api/calls/[id]/outcome` | PATCH | Session | Update callOutcome from lead card |
| `GET /api/leads/[id]/calls` | GET | Session | Paginated call history for lead |
| `PUT /api/devices/register` | PUT | Session | Register/update FCM token & issue deviceSecret |

**UI Changes:**
- Lead timeline: Call cards with duration pill, outcome badge, sentiment dot, AI summary accordion
- Lead card: "Log Call" modal with outcome picker & notes for calls outside the app
- Lead card badge: "Last called: 2h ago" recency chip
- Settings page: `/settings/companion-app` for APK direct download & device pairing QR code

**UAT Criteria (Phase 14A):**
- [ ] Simulate call via cURL to `/api/webhooks/android-companion` → appears on lead timeline in <1s
- [ ] Send same `clientCallId` twice → second request returns 200 OK without creating duplicate log
- [ ] Log manual call from lead modal → timeline updates with outcome badge immediately

---

### Phase 14B: Android Companion App — SIM Call Monitor (Week 2)
**Goal**: Native Kotlin companion app that runs 24/7, listens to physical SIM call state changes, and syncs call metadata to CRM.

**Deliverables (Kotlin Repo: `zamzam-companion-android`):**
```
zamzam-companion-android/
├── app/
│   ├── service/
│   │   └── CallMonitorService.kt      ← Foreground Service with sticky notification
│   ├── receiver/
│   │   ├── CallStateReceiver.kt       ← Tracks RINGING, OFFHOOK, IDLE
│   │   └── BootReceiver.kt            ← Auto-start service after device reboot
│   ├── worker/
│   │   └── CallSyncWorker.kt          ← WorkManager: offline queue + exponential retry
│   ├── data/
│   │   ├── LocalCallLog.kt            ← Room DB for offline resilience
│   │   └── CrmApiService.kt           ← Retrofit HTTP client with token authenticator
│   ├── fcm/
│   │   └── FcmService.kt              ← Prepares click-to-dial handler
│   └── ui/
│       ├── LoginActivity.kt           ← Scan CRM QR or enter credentials to pair
│       └── StatusActivity.kt          ← Shows sync status, battery whitelist guide
```

**UAT Criteria (Phase 14B):**
- [ ] Make outgoing call on physical SIM → call ends → webhook fires within 3 seconds
- [ ] Receive incoming call on physical SIM → call ends → auto-logs as INBOUND
- [ ] Put phone in airplane mode → make call → reconnect → WorkManager syncs buffered call
- [ ] Kill app process → phone rebooted → service automatically resumes via BootReceiver

---

### Phase 14C: Audio Recording Pipeline & AI Intelligence (Week 3–4)
**Goal**: Automated detection of OEM recording files, direct presigned upload to Supabase Storage, Google Cloud STT transcription, and Gemini Flash 1.5 summarization.

**Deliverables:**
- Android OEM storage scanner (`Storage Access Framework` persistent URI or `MANAGE_EXTERNAL_STORAGE` for enterprise build)
- Direct binary PUT upload from Android app to signed Supabase Storage URL
- Async worker route `/api/jobs/process-call-audio` (invoked via QStash / queue with extended timeout)
- Google Cloud STT integration (India region multilingual `hi-IN` + `en-IN`)
- Gemini Flash 1.5 structured summary prompt (outcome, summary, sentiment)
- Audio playback widget on lead timeline card

**UAT Criteria (Phase 14C):**
- [ ] 4-minute call on Samsung Galaxy → app finds OEM recording file → uploads directly to Supabase Storage
- [ ] CRM timeline shows audio player widget and accurate 3-sentence summary in <90 seconds
- [ ] Short call (<30s) auto-categorized as NO_ANSWER or BUSY without wasting STT tokens
- [ ] Mixed Hindi-English call transcribed and summarized accurately in English

---

## Phase 15: Click-to-Dial + Rep Performance Dashboard
**Priority**: 🔴 HIGH | **Effort**: M | **Est**: 2 weeks

### Click-to-Dial Architecture (FCM Push)
```
Web CRM (browser)              CRM Backend                 Android Companion App
─────────────────              ────────────                ─────────────────────
Rep clicks "📞 Call"    ──►   POST /api/calls/initiate
on lead card                   - Looks up broker's FCM
                               token from DeviceRegistration
                               - Sends FCM data message:   ──►  FcmService.onMessageReceived()
                                 { action: "DIAL",               - Receives FCM push
                                   number: "+91983..." }          - Even if app in background
                                                                  - Fires Intent.ACTION_CALL
                                                                    on native dialer
                                                                  
                               ◄──────────────────────────      Native dialer opens,
                                                                  call starts on physical SIM
                                                                  
                               Call ends → WorkManager fires
                               → auto-logs via Phase 14 webhook
```

### New API Routes
| Route | Method | Description |
|---|---|---|
| `POST /api/calls/initiate` | POST | Sends FCM click-to-dial to broker's device |
| `GET /api/analytics/rep-performance` | GET | Calls, connection rate, deals per rep |
| `GET /api/analytics/leaderboard` | GET | Ranked reps by metric + time filter |
| `GET /api/analytics/funnel` | GET | Stage-by-stage conversion rates |
| `GET /api/analytics/heatmap` | GET | Call volume by hour×day |

### UI: `/analytics/performance` page
- **Leaderboard table**: rank, avatar, rep name, calls made, connected rate, avg duration, leads touched, deals
- **Time filter**: Today / This Week / This Month / Custom Range
- **Team filter**: All / per Team
- **Drill-down**: Click rep → shows their individual call log
- **Call heatmap**: 7×24 grid (hour of day × day of week), colour intensity = call density
- **KPI cards on main dashboard**: "Calls today", "Connected rate this week", "Stale leads"

### UAT Criteria
- [ ] Click "Call" on lead → broker's Samsung phone opens dialer within 3 seconds
- [ ] Leaderboard correctly ranks by "calls connected (duration > 30s)"
- [ ] Heatmap shows no calls on Sunday (office closed) — visual sanity check

---

## Phase 16: WhatsApp Shared Team Inbox
**Priority**: 🟡 MEDIUM | **Effort**: M | **Est**: 2–3 weeks

### Schema Addition
```prisma
model WhatsAppMessage {
  id                  String            @id @default(uuid())
  organizationId      String
  organization        Organization      @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  brokerPhoneNumberId String
  brokerPhoneNumber   BrokerPhoneNumber @relation(fields: [brokerPhoneNumberId], references: [id])
  leadId              String?
  lead                Lead?             @relation(fields: [leadId], references: [id])
  wamid               String            @unique   // Meta WhatsApp message ID (dedup)
  direction           String            // INBOUND | OUTBOUND
  messageType         String            // TEXT | IMAGE | DOCUMENT | AUDIO | TEMPLATE | STICKER
  bodyText            String?
  mediaUrl            String?
  templateName        String?
  status              String            @default("SENT") // SENT | DELIVERED | READ | FAILED
  sentAt              DateTime          @default(now())
  deliveredAt         DateTime?
  readAt              DateTime?
  assignedToId        String?
  assignedTo          User?             @relation(fields: [assignedToId], references: [id])
  createdAt           DateTime          @default(now())

  @@index([organizationId, direction, createdAt])
  @@index([leadId])
  @@index([wamid])
  @@index([organizationId, status])
}
```

### UI: `/inbox` page
- **Split-pane layout**: Conversation list (left) + Thread view (right)
- Conversation list shows: contact name, preview text, time, assigned rep avatar, unread badge
- Thread view shows: full message history, compose box, template picker, attachment
- **Nav badge**: unread count badge on "Inbox" nav item (SSE/polling for real-time)
- **Assign button**: route conversation to specific rep

### UAT Criteria
- [ ] WhatsApp sent to broker number → appears in `/inbox` within 5 seconds
- [ ] Reply from CRM inbox → lead receives on WhatsApp within 10 seconds
- [ ] "Read" status updates when lead opens the message (status webhook from Meta)

---

## Phase 17: Lead Intelligence — Scoring, AI Suggestions & Auto-Stage Rules
**Priority**: 🟡 MEDIUM | **Effort**: M | **Est**: 2 weeks

### Schema Additions
```prisma
model LeadScore {
  id              String   @id @default(uuid())
  leadId          String   @unique
  lead            Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  score           Int      @default(0)
  tier            String   @default("COLD")   // COLD | WARM | HOT
  breakdown       String   @default("{}")     // { callCount, callDurationAvg, portalViews, ... }
  suggestedAction String?                     // Gemini recommendation
  computedAt      DateTime @default(now())

  @@index([score])
  @@index([tier])
}

model StageChangeLog {
  id          String   @id @default(uuid())
  leadId      String
  lead        Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  fromStage   String
  toStage     String
  triggeredBy String   // MANUAL | AUTO_RULE
  ruleId      String?
  userId      String?
  note        String?
  createdAt   DateTime @default(now())

  @@index([leadId, createdAt])
}
```

### Score Formula
```typescript
score = clamp(0, 100,
  (callCount * 10) +
  (avgCallDurationMin * 5) +
  (portalViews * 3) +
  (whatsappRepliesReceived * 5) +
  (siteVisitCompleted ? 20 : 0) -
  (daysSinceLastContact * 2)
)
// COLD: 0-33 | WARM: 34-66 | HOT: 67-100
```

### Auto-Stage Rules (built-in v1)
```
RULE_01: callDuration ≥ 180s AND callOutcome = INTERESTED
         → new_uncontacted → discovery_call

RULE_02: ClientPortal created for this lead  
         → any stage → portal_shared

RULE_03: SiteVisit.status = COMPLETED
         → any stage → visit_done

RULE_04: DealTransaction created
         → any stage → closed_won
```

### UI Changes
- Lead card: coloured score badge (COLD=slate, WARM=amber, HOT=red) + number
- Leads list: sort by score, filter by HOT/WARM/COLD tab
- Score breakdown tooltip on hover
- AI suggestion chip: "💡 Send brochure — they asked for floor plans"

---

## Phase 18: WhatsApp Broadcast + CSV Import + WhatsApp Digest
**Priority**: 🟡 MEDIUM | **Effort**: M | **Est**: 2 weeks

### Schema Additions
```prisma
model BroadcastCampaign {
  id             String    @id @default(uuid())
  organizationId String
  organization   Organization @relation(...)
  name           String
  templateName   String
  templateParams String    @default("[]")    // JSON variable values
  targetFilter   String    @default("{}")    // JSON filter criteria
  totalTargeted  Int       @default(0)
  totalSent      Int       @default(0)
  totalDelivered Int       @default(0)
  totalRead      Int       @default(0)
  totalFailed    Int       @default(0)
  status         String    @default("DRAFT") // DRAFT | SENDING | COMPLETED | FAILED
  scheduledAt    DateTime?
  completedAt    DateTime?
  createdById    String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@index([organizationId, status])
}
```

### WhatsApp Weekly Digest (replaces email)
```
Every Monday 8:00 AM IST (Vercel Cron: "0 2:30 * * 1" UTC+5:30)

Template: weekly_performance_digest
Variables:
  {{1}} = "ZamZam Properties"
  {{2}} = "Week of Sep 22 – Sep 28"
  {{3}} = "Safwan Diwan (47 calls)"       ← top rep
  {{4}} = "23 new leads"
  {{5}} = "2 deals closed (₹48L revenue)"
  {{6}} = "7 stale leads"

Message sent via Meta Cloud API to each manager's WhatsApp number
(BrokerPhoneNumber.e164 for users with role=MANAGER or ADMIN)
```

### Deliverables
- [ ] Broadcast wizard: `/broadcasts/new` — 4 steps
- [ ] Rate-limited bulk send queue (80 WA messages/minute per Meta limits)
- [ ] CSV import with column mapper + deduplication + preview
- [ ] Lead CSV export (with current filters)
- [ ] Vercel Cron Monday digest via Meta Cloud API WhatsApp template
- [ ] Stale alert WhatsApp: fires if > 10 leads with > 5 days no contact

---

## Phase 19: Polish — Staleness, Goals & Quick-Win UX
**Priority**: 🟢 LOWER | **Effort**: L | **Est**: 1 week

### Schema Addition
```prisma
model UserGoal {
  id             String   @id @default(uuid())
  organizationId String
  userId         String
  user           User     @relation(...)
  goalType       String   // CALLS_PER_DAY | DEALS_PER_MONTH
  targetValue    Int
  periodStart    DateTime
  periodEnd      DateTime?
  createdAt      DateTime @default(now())
}
```

### Deliverables
- [ ] Staleness chip on all lead cards: "3d" / "7d" / "14d" since last contact
- [ ] "Stale" filter tab on leads list
- [ ] Stale leads KPI card on manager dashboard
- [ ] In-app notification when assigned lead crosses 48h no-contact threshold
- [ ] First Response SLA ⚠️ badge (> 60 min breach)
- [ ] Goal progress rings on rep dashboard cards
- [ ] Source attribution pie chart (existing `Lead.leadSource` data)

---

## Full Timeline

```
Wk 1-4  : Phase 14 — Android companion app + CRM webhook + AI summary
Wk 5-6  : Phase 15 — Click-to-dial (FCM) + rep performance dashboard
Wk 7-9  : Phase 16 — WhatsApp shared inbox
Wk 10-11: Phase 17 — Lead scoring + AI suggestions + auto-stage rules
Wk 12-13: Phase 18 — Broadcast + CSV import + WhatsApp Monday digest
Wk 14   : Phase 19 — Staleness + goals + polish
──────────────────────────────────────────────────────────────────────
Total   : ~14 weeks to full Runo parity with physical SIM architecture
```

---

## Risk Register (Updated)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| OEM call recording path varies per phone model | High | Med | Build adaptive file finder for 10+ known OEM paths; fallback to "no recording" gracefully |
| Broker uses Pixel / stock Android (no OEM recorder) | Med | Med | Recording upload is optional; call still logs via duration+direction. Coach brokers to use Samsung/Xiaomi |
| WorkManager killed by aggressive battery optimization (Xiaomi/Oppo) | High | High | Show in-app setup guide: add app to battery whitelist (doze exemption) on first launch |
| FCM click-to-dial delivery delay (>5s) | Low | Med | Use FCM high-priority data messages; fallback: show phone number to dial manually |
| WhatsApp template approval rejected by Meta | Med | Med | Submit `weekly_performance_digest` template early (2–3 week Meta review process) |
| Recording upload size (large MP3 files, 3G network) | Med | Low | Compress to OGG Vorbis on device before upload; max 25MB per file |
| Google Cloud STT cost on long calls | Low | Med | STT only on calls > 2 min; cache transcript; set budget alert at $50/month |

---

*GSD Milestone 2 Roadmap — ZamZam Real Estate CRM — 2026-09-29*  
*Physical SIM architecture — No virtual telephony — All in-house*
