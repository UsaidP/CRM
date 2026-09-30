# ARCHITECTURAL REVIEW: Milestone 2 — Runo-Parity Call Intelligence & Sales Management

**Review Date**: 2026-09-29  
**Reviewers**: 
- `/ask-matt` (Flow, Sizing, Tracer Bullets, Execution Readiness)
- `/agency-software-architect` (Bounded Contexts, ADRs, Trade-offs, Failure Modes)
- `/agency-backend-architect` (Data Engineering, Vercel Serverless Limits, Security, Performance)
**Target Documents**: 
- `REQUIREMENTS.md` (Milestone 2)
- `ROADMAP-milestone2.md` (Phases 14–19)

---

## 1. Executive Summary & Verdict

### Verdict: **APPROVED WITH REQUIRED REVISIONS (NEEDS WORK BEFORE EXECUTION)**

The physical SIM Android companion app strategy is fundamentally sound, highly differentiated, and accurately mimics the market-tested Runo architecture. It directly satisfies the user's hard constraints (no virtual numbers, 100% physical SIM, stays within current CRM).

However, before executing Phase 14, **5 critical architectural and execution flaws** must be resolved in the documentation and design:

1. **Deadly Vercel Payload Limit (4.5MB)**: The current plan proxies multi-megabyte audio recording uploads through `POST /api/uploads/call-recording` on Next.js. Vercel serverless functions strictly fail with `413 Payload Too Large` above 4.5MB.
2. **Vercel Serverless Execution Timeout**: Audio download + Google Cloud STT + Gemini Flash 1.5 cannot run synchronously inside a Vercel serverless route without exceeding execution timeouts (10s Hobby / 60s Pro).
3. **Flawed Idempotency Constraint**: The proposed Prisma index (`@@index([createdAt, channel])`) does not guarantee deduplication; parallel webhook deliveries will create duplicate call logs.
4. **Phase 14 Overload (Ask-Matt / GSD Violation)**: Phase 14 bundles a greenfield Kotlin Android app, foreground service, OEM storage scraper, S3 audio pipeline, Google STT, Gemini LLM, and CRM web UI into a single 4-week monster phase. If Android hits an OS permission blocker, 0 value ships.
5. **Specification Contradiction in REQUIREMENTS.md**: Line 205 explicitly lists *"Android companion app — Exotel replaces this for now"* under Out-of-Scope, directly contradicting REQ-01.

---

## 2. Ask-Matt / GSD Execution Review (Process, Slicing & Tracer Bullets)

### 2.1 The Mega-Phase 14 Problem
Phase 14 as currently scoped is an anti-pattern. It combines:
1. CRM Database Schema Migration (`CommunicationLog`, `DeviceRegistration`)
2. CRM Webhook Ingestion API with security & deduplication
3. Kotlin Android App from scratch (ForegroundService, TelephonyManager, Room DB, WorkManager, Retrofit)
4. OEM Filesystem Scraping across 4 different manufacturer paths
5. Audio Ingestion & Cloud Storage pipeline
6. Google Cloud STT Speech-to-Text integration
7. Gemini Flash 1.5 AI summarization pipeline
8. CRM Lead Timeline UI & Call Disposition modal

If an Android engineer or permission quirk blocks step 4, the CRM team cannot verify steps 5, 6, 7, or 8.

### 2.2 Recommended Slicing: The 3-Wave Tracer Bullet
Split Phase 14 into three independently testable, deliverable sub-phases:

```mermaid
graph LR
    subgraph Phase 14A: CRM Telephony Core
        A1[Schema Migration] --> A2[Idempotent Webhook API]
        A2 --> A3[Disposition UI & Timeline]
        A3 --> A4[Mock Call Generator / UAT]
    end

    subgraph Phase 14B: Android Call Sync
        B1[Kotlin Companion App] --> B2[Telephony State Monitor]
        B2 --> B3[WorkManager Webhook Sync]
        B3 --> B4[Physical SIM Live Logging UAT]
    end

    subgraph Phase 14C: Audio & AI Pipeline
        C1[OEM Storage Scanner] --> C2[Presigned Supabase Upload]
        C2 --> C3[Google STT + Gemini Worker]
        C3 --> C4[Automated Summary UAT]
    end

    Phase 14A --> Phase 14B --> Phase 14C
```

- **Phase 14A (CRM Call Core & Manual Flow - 1 week)**: 
  - Add schema fields, write `/api/webhooks/android-companion` with full idempotency, create the Call Disposition Modal, and update Lead Timeline.
  - *Ship Criteria*: Can simulate calls via cURL or manual modal, see them in the UI with correct metrics.
- **Phase 14B (Android Physical SIM Monitor - 1.5 weeks)**: 
  - Build the Kotlin Companion App with Foreground Service, `TelephonyCallback`, Room DB offline queue, and Webhook dispatch (metadata only: numbers, timestamp, direction, duration).
  - *Ship Criteria*: Real phone call on broker's Samsung/Xiaomi phone auto-logs into the CRM within 5 seconds of hanging up.
- **Phase 14C (Audio Extraction & AI Intelligence - 1.5 weeks)**:
  - Add OEM audio file detection, direct presigned upload to Supabase Storage, Google Cloud STT transcription, and Gemini Flash 1.5 summarization.
  - *Ship Criteria*: End-to-end call generates recording player and 3-sentence AI summary on the lead timeline within 90 seconds.

---

## 3. Backend Architect Deep Dive (`/agency-backend-architect`)

### 3.1 Critical Issue: Audio Upload Bypass for Vercel 4.5MB Payload Limit
- **Failure Mode**: The roadmap specifies `POST /api/uploads/call-recording` on the Next.js server. Vercel serverless functions have a hard limit of **4.5MB** on request bodies. A 10-minute call recorded in WAV/AMR/MP3 format will frequently exceed 5MB to 15MB. The request will fail at the edge gateway before touching application code.
- **Solution: Presigned S3/Supabase Storage Uploads**:
  ```mermaid
  sequenceDiagram
      autonumber
      participant App as Android Companion
      participant API as Next.js API (/api/calls/upload-url)
      participant Storage as Supabase Storage (S3)
      participant Hook as Next.js Webhook (/api/webhooks/android)

      App->>API: POST /api/calls/upload-url (fileName, callDuration, brokerAuth)
      API-->>App: 200 OK { signedUrl, publicUrl, recordingId }
      App->>Storage: PUT binary audio stream directly to signedUrl
      Storage-->>App: 200 OK (Uploaded)
      App->>Hook: POST /api/webhooks/android { recordingUrl: publicUrl, ...metadata }
      Hook-->>App: 200 OK { success: true }
  ```
  *Benefit*: Zero audio bytes flow through Next.js/Vercel serverless memory. 100% compliant with Vercel infrastructure constraints.

### 3.2 Critical Issue: Serverless Timeout on Transcription & AI Pipeline
- **Failure Mode**: When the webhook receives a call with a recording, downloading the audio + sending to Google Cloud STT (30-60s processing for long audio) + calling Gemini Flash (2-5s) will blow past Vercel's execution limits (10s on Hobby, 60s on Pro) and fail.
- **Solution: Asynchronous Decoupled Worker**:
  1. The webhook creates `CommunicationLog` with `status: PENDING_AI_SUMMARY` and returns HTTP 200 immediately (< 300ms).
  2. Webhook triggers an asynchronous job:
     - **Option 1 (Recommended for Next.js/Supabase)**: Upstash QStash or Inngest background function that invokes `/api/jobs/process-call-audio` with a 300s timeout ceiling.
     - **Option 2 (Supabase Native)**: Supabase Database Webhook on `CommunicationLog` insert where `recordingUrl IS NOT NULL`, firing an Edge Function.

### 3.3 Schema & Idempotency Engineering
- **Current Roadmap proposal**: `callStartedAt + fromNumber + toNumber (composite unique index)` commented out, with only `@@index([createdAt, channel])`.
- **Flaw**: Network fluctuations, Android WorkManager retries, or rapid UI triggers will result in duplicate `CommunicationLog` records.
- **Backend Architect Fix**:
  Introduce a deterministic client-side Call UUID generated by the Android app at `CALL_STATE_OFFHOOK`:
  ```prisma
  model CommunicationLog {
    id              String    @id @default(uuid())
    organizationId  String
    organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
    
    // Idempotency: Unique Client Call Key
    clientCallId    String?   @unique // Generated by Android App (UUIDv4)
    
    // Telephony Metadata
    channel         CommunicationChannel // PHONE_CALL
    direction       CallDirection        // INBOUND | OUTBOUND
    fromNumber      String               // Normalized E.164 (+91...)
    toNumber        String               // Normalized E.164 (+91...)
    durationSeconds Int                  @default(0)
    startedAt       DateTime
    endedAt         DateTime?
    
    // Call Intelligence
    callOutcome     CallOutcome?         // Enum: INTERESTED, CALLBACK, NO_ANSWER, etc.
    recordingUrl    String?
    transcriptText  String?              @db.Text
    aiSummary       String?              @db.Text
    aiSentiment     Sentiment?           // Enum: POSITIVE | NEUTRAL | NEGATIVE
    processingStatus ProcessingStatus    @default(COMPLETED) // PENDING | PROCESSING | COMPLETED | FAILED
    
    // Relations
    leadId          String?
    lead            Lead?                @relation(fields: [leadId], references: [id])
    brokerPhoneId   String?
    brokerPhone     BrokerPhoneNumber?   @relation(fields: [brokerPhoneId], references: [id])
    createdById     String?
    createdBy       User?                @relation(fields: [createdById], references: [id])

    createdAt       DateTime             @default(now())
    updatedAt       DateTime             @updatedAt

    @@index([organizationId, createdAt])
    @@index([leadId, createdAt])
    @@index([fromNumber, toNumber])
  }
  ```

### 3.4 Phone Number Normalization (Indian Telephony Seam)
Indian Android devices report numbers in various formats:
- Inbound: `+919833012345` or `09833012345` or `9833012345`
- Outbound: Whatever the user dialed or tapped (could be `022...` landline, `9833012345`, `+91...`)

**Requirement**: Every incoming payload must pass through a strict `normalizeIndianPhoneToE164(raw)` utility before any database lookup against `BrokerPhoneNumber` or `Lead.phoneE164`.
- Strip spaces, hyphens, and leading zeros.
- If 10 digits starting with [6-9], prepend `+91`.
- If 11 digits starting with `0`, replace `0` with `+91`.
- If 12 digits starting with `91`, prepend `+`.

### 3.5 Android Companion App Authentication Lifecycle
- **Risk**: Standard user session tokens expire in 24 hours. The Android companion service runs 24/7 in the background. If a token expires, call sync stops silently.
- **Solution**:
  - Broker logs into Android app once using CRM credentials.
  - CRM issues a pair:
    1. Short-lived Access Token (JWT, 1 hour)
    2. Long-lived Device Refresh Token (`deviceSecret` stored hashed in `DeviceRegistration`, valid for 180 days with auto-rotation).
  - The Android app's `Retrofit` client uses an `Authenticator` to silently refresh the access token on HTTP 401 without disrupting the background monitor.

---

## 4. Software Architect Deep Dive (`/agency-software-architect`)

### 4.1 Bounded Contexts & Context Mapping
Telephony is an external I/O domain that intersects with the CRM core:
- **Telephony Ingestion Context**: Devices, call events, raw recordings, WebRTC/FCM signals.
- **Sales Intelligence Context**: Speech-to-text, LLM extraction, lead scoring, sentiment.
- **Lead Management Core**: Contacts, stages, timelines, assignment.

```
┌─────────────────────────────────┐
│   Telephony Ingestion Context   │
│  (DeviceRegistration, Raw Calls)│
└───────────────┬─────────────────┘
                │ Domain Event: CallCompletedEvent
                ▼
┌─────────────────────────────────┐
│    Lead Management Core         │
│ (CommunicationLog, Timeline UI) │
└───────────────┬─────────────────┘
                │ Async Event
                ▼
┌─────────────────────────────────┐
│   Sales Intelligence Context    │
│  (Google STT, Gemini Summary,   │
│   Lead Scoring, Auto-Stage)     │
└─────────────────────────────────┘
```
*Architectural Guideline*: Do not mix STT/LLM vendor specifics inside the webhook controller. The webhook controller's sole responsibility is accepting the event, authenticating the device, normalizing phone numbers, creating the initial `CommunicationLog`, and publishing the `CallCompleted` event to the background processor.

### 4.2 Architectural Decision Records (ADRs) to Formalize

#### ADR-001: Physical SIM Android Companion vs Virtual Cloud Telephony
- **Status**: ACCEPTED
- **Context**: Real estate brokers in India resist virtual dialers due to caller-ID distrust, spam flags, and latency. Physical SIMs provide authentic caller ID and free unlimited calling plans.
- **Decision**: Develop a dedicated Kotlin Android Companion app leveraging `TelephonyManager` and OEM call recording storage.
- **Consequences**: Zero call-routing costs; 100% authentic caller ID. Trade-off: Dependent on Android OS permissions, OEM manufacturer dialers (Samsung/Xiaomi), and requires Android device management.

#### ADR-002: Direct-to-Storage Presigned Upload Pattern
- **Status**: ACCEPTED
- **Context**: Vercel serverless has a 4.5MB request body ceiling. Call recordings average 5MB–25MB.
- **Decision**: Android companion app requests a Supabase Storage signed upload URL from the CRM backend, then streams audio directly to S3 storage.
- **Consequences**: Bypasses Vercel payload limits; reduces server compute load and bandwidth costs.

#### ADR-003: App Distribution Outside Google Play Store
- **Status**: ACCEPTED
- **Context**: Google Play Developer Policy strictly restricts `READ_CALL_LOG` and `MANAGE_EXTERNAL_STORAGE` for non-default-dialer applications, routinely rejecting enterprise companion tools.
- **Decision**: Distribute the Android companion APK via direct enterprise download from within the ZamZam CRM web portal (`/settings/companion-app`).
- **Consequences**: Circumvents Google Play review rejections and permission bans. Requires brokers to enable "Install unknown apps" on their devices.

---

## 5. Risk Audit & Mitigations Matrix

| Risk / Gap Identified | Severity | Likelihood | Impacted Phase | Mitigation Required |
|---|---|---|---|---|
| **Android 13/14 Scoped Storage Access** | 🔴 HIGH | HIGH | Phase 14 / 14C | Android 13+ restricts broad storage access. App must use Storage Access Framework (SAF) `ACTION_OPEN_DOCUMENT_TREE` on initial setup to grant persistent URI access to the OEM recording folder, or request `MANAGE_EXTERNAL_STORAGE` in sideloaded enterprise build. |
| **Aggressive OS Battery Optimization (MIUI / OneUI)** | 🔴 HIGH | HIGH | Phase 14 / 14B | Android app must display a mandatory first-run onboarding screen prompting user to disable battery optimization (`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`) and lock app in memory. |
| **Meta WhatsApp Template Approval Delay** | 🟡 MEDIUM | MED | Phase 16 / 18 | `weekly_performance_digest` and broadcast templates take 24–72h for Meta review. Submit templates during Phase 16 setup rather than waiting for Phase 18. |
| **Lead Phone Number Mismatch** | 🟡 MEDIUM | HIGH | Phase 14A / 14B | Call comes in from a lead's secondary number or an unformatted number. If no match is found, auto-create a `Lead` with `status: UNVERIFIED_INBOUND` and source `PHONE_INBOUND` so no call log is lost. |
| **Storage Cost Runaway on Long Audio** | 🟢 LOW | MED | Phase 14C | Implement a 90-day audio retention policy in Supabase Storage. After 90 days, archive audio file to cold storage or purge binary while retaining transcript and AI summary. |

---

## 6. Required Edits to Requirements & Roadmap Before Execution

Before kicking off Phase 14 implementation, the following documentation fixes must be committed:

1. **Delete Out-of-Scope Contradiction**: In `REQUIREMENTS.md` (lines 205–206), remove *"Android companion app — Exotel replaces this for now"* and *"Deepgram STT... placeholder text only"*. Replace with explicit In-Scope verification.
2. **Adopt the 3-Wave Phase 14 Split**:
   - `Phase 14A`: CRM Call Core, Webhook API, Idempotency & Disposition UI
   - `Phase 14B`: Android Companion App (Kotlin) — SIM Call Detection & Webhook Sync
   - `Phase 14C`: OEM Recording Storage Scanner, Presigned Supabase Upload & AI Summarizer
3. **Update API Contracts**:
   - Add `POST /api/calls/upload-url` (presigned S3 upload URL generator).
   - Update `POST /api/webhooks/android-companion` payload to accept `clientCallId` (UUID) for idempotency.
4. **Document Enterprise APK Distribution**:
   - Add `/settings/companion-app` page to the roadmap for APK direct download and broker device pairing QR code.

---

## 7. Final Recommendation & Next Steps

1. **Execute Document Cleanup**: Update `.planning/REQUIREMENTS.md` and `.planning/ROADMAP-milestone2.md` with the 3-wave Phase 14 structure and Vercel payload/timeout fixes.
2. **Create Phase 14A Plan (`/gsd-plan-phase 14A`)**: Begin immediate execution on the CRM web core, which requires zero Android dependencies and unblocks the database schema and call disposition UI.
