# REQUIREMENTS.md — Milestone 2: Runo-Parity Call Intelligence & Sales Management

**Milestone**: Runo.ai Feature Parity  
**Continues from**: Phase 13 (RERA Plot Threshold Governance)  
**Next phase number**: 14  
**Date**: 2026-09-29  
**Goal**: Bring ZamZam CRM to full feature parity with Runo.ai — every call on a broker's **physical SIM** auto-logs, gets an AI summary, reps have a click-to-call dialer, managers have a WhatsApp-delivered leaderboard, and the whole system stays inside this CRM.

> **Core Decision**: Physical SIM calls are detected by a native **Android companion app** running a Foreground Service on each broker's phone. No virtual SIM. No Exotel. The app fires a webhook to this CRM on every call end. This is architecturally identical to how Runo works.

---

## Business Problem

ZamZam's brokers are currently manually logging every call. Managers have no visibility into rep activity. There is no way to know:
- Did the rep actually call the lead?
- How long did they talk?
- What was the outcome?
- Which rep is performing best this week?

Runo.ai solves this with SIM-based auto-logging. We will build the same thing natively in the CRM.

---

## User Roles Affected

| Role | Impact |
|---|---|
| **AGENT / TELECALLER** | Gets auto-logged calls, AI summaries, click-to-call |
| **MANAGER** | Gets leaderboard, performance dashboard, daily digest emails |
| **ADMIN** | Gets WhatsApp broadcast, CSV import, goal setting |
| **SUPER_ADMIN** | Gets full audit access to all call data |

---

## Scope of This Milestone

### REQ-01: Auto Call Log via Android Companion App — Physical SIM (PHASE 14)
- **What**: Every call made/received on a broker's physical SIM auto-logs as a `CommunicationLog` entry — no manual input from the rep
- **How**: A native Android app (foreground service) listens to `TelephonyManager`/`PhoneStateListener` events. On call end: captures from/to number, duration, direction, and optionally uploads the OEM-recorded audio file. Fires `POST /api/webhooks/android-companion` to this CRM.
- **Android App Tech Stack**:
  - Language: **Kotlin** (native Android)
  - Call detection: `TelephonyManager` + `PhoneStateListener` (API 21+) or `TelephonyCallback` (API 31+)
  - Background persistence: **Foreground Service** with a persistent notification (required by Android 9+)
  - Call recording: Uses **OEM native dialer recording** (Samsung/Xiaomi/Realme built-in) — NOT `MediaRecorder` API (blocked by Google on stock Android 10+). App reads the OEM-saved recording file from storage after the call ends.
  - Offline resilience: **WorkManager** queues the webhook if offline; syncs on reconnect
  - Auth: App stores a `brokerAuthToken` (JWT issued by CRM on first login) and sends it in every webhook header
- **Acceptance Criteria**:
  - [ ] Android app detects OUTBOUND and INBOUND call state transitions correctly
  - [ ] On call end: fires `POST /api/webhooks/android-companion` with `{fromNumber, toNumber, direction, durationSeconds, recordingFilePath, callStartedAt, brokerAuthToken}`
  - [ ] CRM webhook matches `fromNumber`/`toNumber` (E.164) to `BrokerPhoneNumber` + `Lead.phoneE164`
  - [ ] Creates `CommunicationLog` with channel=PHONE_CALL, correct direction and duration
  - [ ] If recording file is present: app uploads MP3/OGG to CRM storage endpoint first, then webhook includes `callRecordingUrl`
  - [ ] If no matching lead found: creates a new lead (source=PHONE_ORGANIC_UNKNOWN) and flags for manual review
  - [ ] Webhook is idempotent (same `callStartedAt` + `fromNumber` + `toNumber` combo = dedup key, no duplicate logs)
  - [ ] Works offline: call logged to local SQLite on app, synced to CRM when connection restored

### REQ-02: AI Call Summary Generation (PHASE 14)
- **What**: After a call ends, an AI summary is generated and attached to the CommunicationLog
- **How**: Post-call, a Vercel background job fires. If `callRecordingUrl` is present → download audio → transcribe with **Google Cloud Speech-to-Text** (India-region, Hindi + English models) → summarise with **Gemini Flash 1.5**. If no recording → Gemini generates a structured placeholder from call metadata.
- **Acceptance Criteria**:
  - [ ] `CommunicationLog` gains fields: `callOutcome`, `aiSummary`, `aiSentiment`, `transcriptText`
  - [ ] Summary appears on lead timeline within 90 seconds of call end (recording upload + STT + LLM)
  - [ ] Calls < 30 seconds: outcome auto-set to NO_ANSWER or BUSY; no summary generated
  - [ ] Calls ≥ 30 seconds: AI summary (max 3 sentences, in English)
  - [ ] Handles Hindi + English mixed speech (code-switching common in Indian sales calls)
  - [ ] Sentiment tagged: POSITIVE / NEUTRAL / NEGATIVE
  - [ ] If transcription fails: summary still generated from call metadata ("4-minute call — outcome marked Callback Requested")

### REQ-03: Call Disposition UI (PHASE 14)
- **What**: After a call (or at any time), the rep can mark the outcome from the lead card
- **Outcomes**: INTERESTED, CALLBACK_REQUESTED, NOT_INTERESTED, NO_ANSWER, BUSY, WRONG_NUMBER, VOICEMAIL
- **Acceptance Criteria**:
  - [ ] "Log Call" button on every lead card opens a modal
  - [ ] Modal shows outcome picker, duration input (if manual), notes field
  - [ ] Existing `CommunicationLog` entries in lead timeline show outcome as a badge
  - [ ] Manager can see disposition breakdown in analytics

### REQ-04: Click-to-Dial via Android Companion App (PHASE 15)
- **What**: Rep clicks "Call" on a lead card → Android companion app on their physical phone opens the native dialer and initiates the call automatically
- **How**: CRM sends a push notification (Firebase FCM) with action=`INITIATE_CALL` + `phoneNumber` to the broker's registered Android device. The companion app receives it (even in background) and triggers an `Intent.ACTION_CALL` on the native dialer with the lead's number.
- **Acceptance Criteria**:
  - [ ] "📞 Call" button on lead card → FCM push to broker's phone within 2 seconds
  - [ ] Android companion app opens native dialer immediately on receiving FCM
  - [ ] Call auto-logs via the existing Android webhook (REQ-01) when call ends
  - [ ] Lead card shows last-call recency: "Called 2h ago"
  - [ ] If broker phone is offline: CRM queues the call intent and notifies when device reconnects

### REQ-05: Rep Performance Dashboard (PHASE 15)
- **What**: Managers see a ranked leaderboard of reps with call stats, connection rates, and deal conversions
- **API Routes**: `GET /api/analytics/rep-performance`, `GET /api/analytics/leaderboard`
- **Acceptance Criteria**:
  - [ ] New page `/analytics/performance`
  - [ ] Shows: calls made, calls connected (duration > 30s), avg call duration, leads contacted, stages advanced, deals closed — per rep per time period
  - [ ] Time filters: Today / This Week / This Month / Custom Range
  - [ ] Team filter: All / specific Team
  - [ ] Leaderboard ranks by "calls connected" by default, sortable by any metric
  - [ ] Rep cards show trend vs previous period (↑ / ↓)
  - [ ] Manager can click a rep to drill into their individual call log

### REQ-06: Call Activity Heatmap (PHASE 15)
- **What**: Visual heatmap of when reps are making calls (hour of day × day of week)
- **Acceptance Criteria**:
  - [ ] 7×24 grid showing call density
  - [ ] Colour intensity = call volume
  - [ ] Org-wide or per-rep view

### REQ-07: WhatsApp Shared Team Inbox (PHASE 16)
- **What**: All incoming WhatsApp messages across all org phone numbers appear in one unified inbox
- **Schema**: New `WhatsAppMessage` model (stores individual messages with delivery status)
- **Acceptance Criteria**:
  - [ ] New page `/inbox` shows all unread/unassigned WhatsApp messages
  - [ ] Each message shows: sender name (from Contact), preview, time, assigned rep
  - [ ] Clicking opens the full conversation thread
  - [ ] Manager can assign a conversation to a specific rep
  - [ ] Incoming messages stored in `WhatsAppMessage` (wamid deduplication)
  - [ ] Read receipts updated via Meta webhook status updates
  - [ ] Inbox badge count in nav shows unread count

### REQ-08: WhatsApp Quick Replies & Templates (PHASE 16)
- **What**: Reps can send pre-approved WhatsApp templates and quick reply canned responses from the inbox
- **Acceptance Criteria**:
  - [ ] Template picker in compose box (lists org's approved Meta templates)
  - [ ] Canned responses library: admin creates, reps use
  - [ ] Template variables auto-filled from lead data (name, property name, etc.)

### REQ-09: Lead Scoring Engine (PHASE 17)
- **What**: Every lead gets a 0–100 score based on engagement signals, recalculated on every interaction
- **Formula**: `score = (callCount×10) + (callDurationAvgMin×5) + (portalViews×3) + (whatsappReplies×5) + (siteVisitDone×20) - (daysSinceLastContact×2)`
- **Schema**: New `LeadScore` model
- **Acceptance Criteria**:
  - [ ] Score shown as a coloured badge on every lead card (0-33 = COLD, 34-66 = WARM, 67-100 = HOT)
  - [ ] Score recomputed within 30 seconds of any new interaction
  - [ ] Leads list sortable by score
  - [ ] Score breakdown tooltip shows each factor's contribution

### REQ-10: AI Next-Action Suggestions (PHASE 17)
- **What**: For each lead, Gemini suggests the single best next action
- **Acceptance Criteria**:
  - [ ] Suggestion shown on lead card and detail page: e.g. "Call back — they asked for floor plans on the last call"
  - [ ] Suggestion generated from: last comm summary, current stage, requirements, last reminder
  - [ ] Re-generated every 24h or on-demand

### REQ-11: Auto-Stage Advancement Rules (PHASE 17)
- **What**: Configurable rules that automatically advance a lead's stage based on triggers
- **Example Rules**:
  - Call > 3 min → advance from `new_uncontacted` to `discovery_call`
  - Portal shared → advance to `portal_shared`
  - Site visit completed → advance to `visit_done`
- **Acceptance Criteria**:
  - [ ] Rules engine evaluates after every event (call end, portal share, visit update)
  - [ ] Stage changes logged in `LeadAssignment` or a new `StageChangeLog`
  - [ ] Admin can configure rule thresholds (call duration threshold, etc.)

### REQ-12: WhatsApp Broadcast / Bulk Messaging (PHASE 18)
- **What**: Admin creates a broadcast campaign: pick a template, pick a lead segment, schedule
- **Schema**: New `BroadcastCampaign` model
- **Acceptance Criteria**:
  - [ ] `/broadcasts/new` wizard: name → template → filter leads → review → schedule/send
  - [ ] Lead filter: by stage, source, assigned rep, tag, last-contact date
  - [ ] Shows preview of message with sample variable fill
  - [ ] Sends up to 1000 messages per campaign in batches (rate-limit-safe)
  - [ ] Tracks: sent / delivered / read / failed per recipient

### REQ-13: CSV Bulk Lead Import (PHASE 18)
- **What**: Admin uploads a CSV → leads created in bulk
- **Acceptance Criteria**:
  - [ ] `/leads/import` page with CSV template download
  - [ ] Validates: required fields, E.164 phone format, stage values
  - [ ] Preview table showing parsed rows with error highlights before import
  - [ ] Deduplicates against existing `Contact.identities` (same phone → merge)
  - [ ] Import report: X created, Y merged, Z failed

### REQ-14: Automated Weekly WhatsApp Digest (PHASE 18)
- **What**: Every Monday morning, managers receive a formatted weekly performance digest via **WhatsApp message** (not email)
- **Content**: Top rep by calls, new leads this week, deals closed, stale leads count (> 5 days no contact)
- **How**: Vercel Cron → aggregate stats → send via Meta Cloud API using a pre-approved WhatsApp template to manager's registered `BrokerPhoneNumber.e164`
- **Acceptance Criteria**:
  - [ ] Vercel Cron fires every Monday 8:00 AM IST
  - [ ] Uses Meta Cloud API with an approved template (e.g., `weekly_performance_digest`)
  - [ ] WhatsApp message formatted clearly with stats (template variables filled with real data)
  - [ ] Manager can opt-out from settings (flag on User model)
  - [ ] Also sends a same-day alert WhatsApp if > 10 leads have had no contact in 5 days

### REQ-15: Lead Staleness System (PHASE 19 — Quick Win Polish)
- **What**: Visual system-wide staleness indicators
- **Acceptance Criteria**:
  - [ ] Lead cards show a staleness badge: "5d no contact" / "12d no contact"
  - [ ] Leads list has a "Stale" filter showing only leads with no contact in > 3 days
  - [ ] Manager dashboard shows "Stale Leads Count" as a KPI card
  - [ ] Push-style in-app notification if assigned lead goes stale (> 48h)

### REQ-16: Goal Tracking (PHASE 19)
- **What**: Managers set daily call targets for reps; progress shown in real time
- **Schema**: New `UserGoal` model
- **Acceptance Criteria**:
  - [ ] Manager sets: calls/day target, deals/month target per rep or team
  - [ ] Rep sees their daily progress bar on the dashboard
  - [ ] Manager sees % attainment per rep in the leaderboard

---

## Out of Scope (This Milestone)

- Virtual SIM / Cloud telephony numbers (Exotel, Twilio) — strictly rejected in favor of physical SIM companion app
- iOS call recording — technically impossible due to Apple sandbox restrictions; all brokers use Android
- Salesforce / Zoho CRM export integration
- GPS check-in at site visits
- WhatsApp bot / automated interactive menu flows
- Facebook Leads webhook integration (handled in subsequent milestone)

---

## Technical Constraints

| Constraint | Detail |
|---|---|
| **Physical SIM only** | No virtual/cloud SIM numbers. All calls go through the broker's actual physical SIM card on their Android phone |
| **Android companion app required** | Each broker must install the companion app and grant: `READ_PHONE_STATE`, `PROCESS_OUTGOING_CALLS`, `READ_CALL_LOG`, `RECORD_AUDIO` (OEM), `FOREGROUND_SERVICE` permissions |
| **Call recording (OEM-dependent)** | Full two-sided recording only works on Samsung/Xiaomi/Realme/Oppo with built-in OEM recorder. Google Pixel + stock Android = one-side or announcement-based only. App reads OEM-saved file from `/storage/` post-call |
| **WhatsApp 24h window** | Only templates can be sent outside the 24h conversation window |
| **Gemini token limit** | AI summary prompt must fit within 8,192 output tokens; call transcript max 30 min |
| **Vercel timeout** | API routes time out at 10s on Hobby, 60s on Pro — AI summary must be async background job |
| **Existing schema** | All new models must coexist with existing 634-line schema; no breaking migrations |
| **Multi-tenancy** | All new models must include `organizationId` with cascade delete |
| **Hindi + English STT** | Google Cloud STT India region supports Hinglish (hi-IN + en-IN multilingual models) |
| **FCM push** | Firebase Cloud Messaging (free tier) used to send click-to-dial commands to Android app |

---

## Schema Summary (New Additions This Milestone)

```prisma
// Phase 14: Add to CommunicationLog
callOutcome    String?   // INTERESTED, CALLBACK, NOT_INTERESTED, NO_ANSWER, BUSY, WRONG_NUMBER, VOICEMAIL
aiSummary      String?   // Gemini-generated summary
aiSentiment    String?   // POSITIVE, NEUTRAL, NEGATIVE
transcriptText String?   // STT transcript (Phase 2 of recording pipeline)

// Phase 16
model WhatsAppMessage { ... }   // Individual WA messages with delivery tracking

// Phase 17
model LeadScore { ... }          // Computed 0-100 engagement score

// Phase 18
model BroadcastCampaign { ... }  // Bulk WA template campaigns

// Phase 19
model UserGoal { ... }           // Daily/monthly targets per rep
model StageChangeLog { ... }     // Audit log for stage transitions
```
