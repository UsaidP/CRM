# Phase 9 Plan: Unified Firm-Wide Lead Reminders, Interactive Calendar & Intelligent "Connect Next" Prioritization Engine

**Phase**: 09  
**Name**: Unified Firm-Wide Lead Reminders, Interactive Calendar & Intelligent "Connect Next" Prioritization Engine  
**Agents**: `/agency-software-architect`, `/agency-ux-researcher`, `/agency-ux-architect`, `/agency-frontend-developer`  
**Status**: Ready for Execution  

---

## 1. Architectural Scope & Operational Reality (Firm-Wide Ownership)

All inbound leads, contacts, and opportunities belong strictly to the **Firm (ZamZam Properties)** as a single unified pool. Leads are firm assets rather than isolated broker-siloed accounts. Both Safwan Diwan and Suhel Patel operate as the firm's unified advisory force.

Accordingly:
* **No Broker Silo Filters**: Calendar views, lead streams, reminder queues, and next-connect recommendations operate seamlessly at the firm level without fragmenting leads by agent.
* **Consolidated Firm Pipeline**: All scheduled reminders and escorted site visits appear in a single unified calendar timeline for the brokerage.

---

## 2. Multi-Factor Prioritization Formula ($S_{\text{connect}}$)

$$S_{\text{connect}}(\text{lead}) = S_{\text{reminder}} + S_{\text{freshness}} + S_{\text{portal\_telemetry}} + S_{\text{stage\_velocity}}$$

* **$S_{\text{reminder}}$ (Max 45 pts)**: Overdue reminders ($+45$), Due $<60$m ($+35$), Due today ($+25$)
* **$S_{\text{freshness}}$ (Max 35 pts)**: Uncontacted inbound $<15$m ($+35$), $<2$h ($+25$)
* **$S_{\text{portal\_telemetry}}$ (Max 25 pts)**: Active portal activity $<3$h ($+25$), $<24$h ($+15$)
* **$S_{\text{stage\_velocity}}$ (Max 15 pts)**: `visit_scheduled` / `negotiation_token` ($+15$), `discovery_call` ($+10$)

---

## 3. Database Schema Extensions (Prisma)

```prisma
model LeadReminder {
  id               String        @id @default(uuid())
  organizationId   String
  organization     Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  leadId           String
  lead             Lead          @relation(fields: [leadId], references: [id], onDelete: Cascade)
  createdById      String?
  
  title            String        // e.g. "Follow up on Kharghar Sec 35 2BHK floor plans"
  reminderType     String        // CALL, WHATSAPP, SITE_VISIT_FOLLOWUP, REQUIREMENT_CHECK, TOKEN_FOLLOWUP, GENERAL
  dueAt            DateTime      // Exact reminder trigger time
  priority         String        @default("HIGH") // URGENT, HIGH, MEDIUM, LOW
  status           String        @default("PENDING") // PENDING, COMPLETED, SNOOZED, CANCELLED
  notes            String?
  snoozedUntil     DateTime?
  completedAt      DateTime?
  
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  @@index([organizationId, status, dueAt])
  @@index([leadId])
  @@index([dueAt])
}
```

---

## 4. Deliverables Checklist

- [ ] **Prisma Model & Migration**: Add `LeadReminder` with relations to `Organization`, `Lead`.
- [ ] **Prioritization Logic**: `src/lib/domain/prioritization-engine.ts`.
- [ ] **REST Endpoints**:
  - `GET/POST /api/v1/reminders`
  - `PATCH/DELETE /api/v1/reminders/[id]`
  - `GET /api/v1/leads/next-connect`
  - `GET /api/v1/calendar/events`
- [ ] **Unified Calendar Page**: `/calendar` with Month, Week, Day, Agenda views (firm-wide).
- [ ] **Leads Matrix Enhancements**: "Connect Next" banner, row highlights, 1-click reminders, firm unified summary stats.
- [ ] **Lead Drawer & Call Log Modal Sync**: Seamless reminder presets & real-time updates.
- [ ] **Navigation & Dashboard integration**: Add Calendar to `AppShell` and Next-Up widgets to `DashboardPage`.
