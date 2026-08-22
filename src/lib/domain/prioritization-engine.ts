/**
 * Prioritization Engine - Firm-Wide "Connect Next" Algorithm
 * Computes deterministic priority scores (0-100) across all firm leads to identify
 * the single most critical next action for the advisory team.
 */

export interface LeadReminderInfo {
  id: string;
  title: string;
  reminderType: string;
  dueAt: string | Date;
  priority: string;
  status: string;
  notes?: string | null;
}

export interface PrioritizedLeadScore {
  leadId: string;
  leadName: string;
  phoneE164: string | null;
  currentStage: string;
  leadSource: string;
  sourceCode: string | null;
  totalScore: number; // 0 - 100
  urgencyTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  primaryReason: string;
  secondaryReasons: string[];
  nextRecommendedAction: 'CALL' | 'WHATSAPP' | 'SCHEDULE_VISIT' | 'PREPARE_DECK' | 'FOLLOW_UP';
  actionDetails: string;
  dueReminder?: LeadReminderInfo | null;
  isOverdue: boolean;
  isDueToday: boolean;
  isFreshInbound: boolean;
  isLivePortalActive: boolean;
  lastActivityAt?: Date | string | null;
}

/**
 * Evaluates a single lead against multi-factor real-time criteria
 */
export function evaluateLeadConnectPriority(lead: any, now: Date = new Date()): PrioritizedLeadScore {
  let score = 0;
  const secondaryReasons: string[] = [];
  let primaryReason = 'General firm pipeline follow-up';
  let urgencyTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  let nextAction: 'CALL' | 'WHATSAPP' | 'SCHEDULE_VISIT' | 'PREPARE_DECK' | 'FOLLOW_UP' = 'CALL';
  let actionDetails = 'Initiate consultative inquiry call';

  let isOverdue = false;
  let isDueToday = false;
  let isFreshInbound = false;
  let isLivePortalActive = false;
  let topReminder: LeadReminderInfo | null = null;

  const nowMs = now.getTime();

  // 1. EVALUATE SCHEDULED REMINDERS (Up to 45 pts)
  const pendingReminders: any[] = (lead.reminders || [])
    .filter((r: any) => r.status === 'PENDING' || r.status === 'SNOOZED')
    .sort((a: any, b: any) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

  if (pendingReminders.length > 0) {
    const r = pendingReminders[0];
    topReminder = r;
    const dueTime = new Date(r.dueAt).getTime();
    const diffMs = dueTime - nowMs;
    const diffMinutes = Math.round(diffMs / (1000 * 60));

    if (diffMs < 0) {
      // Overdue
      isOverdue = true;
      const overdueMins = Math.abs(diffMinutes);
      const overdueHours = Math.round(overdueMins / 60);
      const overdueStr = overdueMins < 60 ? `${overdueMins}m ago` : `${overdueHours}h ago`;
      
      score += 45;
      primaryReason = `🔔 Overdue Reminder: "${r.title}" was due ${overdueStr}`;
      secondaryReasons.push(`Scheduled for ${new Date(r.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      urgencyTier = 'CRITICAL';
      nextAction = r.reminderType === 'WHATSAPP' ? 'WHATSAPP' : 'CALL';
      actionDetails = `Complete overdue ${r.reminderType.toLowerCase()} reminder: ${r.title}`;
    } else if (diffMinutes <= 60) {
      // Due in next 60 minutes
      isDueToday = true;
      score += 35;
      primaryReason = `⏰ Due in ${diffMinutes} min: "${r.title}"`;
      secondaryReasons.push(`Target time: ${new Date(r.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      urgencyTier = 'HIGH';
      nextAction = r.reminderType === 'WHATSAPP' ? 'WHATSAPP' : 'CALL';
      actionDetails = `Upcoming ${r.reminderType.toLowerCase()}: ${r.title}`;
    } else if (new Date(r.dueAt).toDateString() === now.toDateString()) {
      // Due later today
      isDueToday = true;
      score += 25;
      primaryReason = `📅 Due Today at ${new Date(r.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: "${r.title}"`;
      secondaryReasons.push(`Scheduled task for today`);
      urgencyTier = 'HIGH';
      nextAction = r.reminderType === 'WHATSAPP' ? 'WHATSAPP' : 'CALL';
      actionDetails = `Today's schedule: ${r.title}`;
    } else {
      score += 10;
      secondaryReasons.push(`Upcoming reminder on ${new Date(r.dueAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}`);
    }
  }

  // 2. SPEED-TO-LEAD & FRESH INBOUNDS (Up to 35 pts)
  const createdAtMs = new Date(lead.createdAt || now).getTime();
  const inboundAgeMinutes = Math.max(0, Math.round((nowMs - createdAtMs) / (1000 * 60)));

  if (lead.currentStage === 'new_uncontacted') {
    if (inboundAgeMinutes <= 15) {
      score += 35;
      isFreshInbound = true;
      if (!isOverdue) {
        primaryReason = `⚡ Speed-to-Lead Critical: Inbounded ${inboundAgeMinutes}m ago via ${lead.leadSource || 'Organic Stream'}`;
        urgencyTier = 'CRITICAL';
        nextAction = 'CALL';
        actionDetails = `Sub-15m speed-to-lead SLA response`;
      } else {
        secondaryReasons.push(`Fresh inbound (${inboundAgeMinutes}m old) awaiting first touch`);
      }
    } else if (inboundAgeMinutes <= 120) {
      score += 25;
      isFreshInbound = true;
      if (!isOverdue && !isDueToday) {
        primaryReason = `🔴 New Uncontacted Lead: Inbounded ${inboundAgeMinutes}m ago`;
        urgencyTier = 'HIGH';
        nextAction = 'CALL';
        actionDetails = `Initial qualification & discovery call`;
      } else {
        secondaryReasons.push(`New uncontacted lead (${inboundAgeMinutes}m old)`);
      }
    } else if (inboundAgeMinutes <= 1440) {
      // < 24 hours
      score += 15;
      secondaryReasons.push(`Uncontacted lead received within last 24h`);
    }
  }

  // 3. LIVE PORTAL TELEMETRY & INTENT (Up to 25 pts)
  const portals: any[] = lead.portals || [];
  let mostRecentTelemetryDate: Date | null = null;
  let totalRecentActions = 0;

  for (const p of portals) {
    for (const log of (p.telemetryLogs || [])) {
      const logTime = new Date(log.createdAt);
      if (!mostRecentTelemetryDate || logTime > mostRecentTelemetryDate) {
        mostRecentTelemetryDate = logTime;
      }
      if (nowMs - logTime.getTime() <= 24 * 60 * 60 * 1000) {
        totalRecentActions++;
      }
    }
  }

  if (mostRecentTelemetryDate) {
    const portalMinsAgo = Math.round((nowMs - mostRecentTelemetryDate.getTime()) / (1000 * 60));
    if (portalMinsAgo <= 180) {
      // Active in last 3 hours
      score += 25;
      isLivePortalActive = true;
      if (!isOverdue && !isFreshInbound) {
        primaryReason = `🔥 Live Portal Engagement: Active ${portalMinsAgo}m ago (${totalRecentActions} interactions)`;
        urgencyTier = 'HIGH';
        nextAction = 'WHATSAPP';
        actionDetails = `Strike while hot: Client actively inspecting presentation deck`;
      } else {
        secondaryReasons.push(`Live portal activity ${portalMinsAgo}m ago`);
      }
    } else if (portalMinsAgo <= 1440) {
      score += 15;
      secondaryReasons.push(`Client visited presentation portal in last 24h`);
    }
  }

  // 4. PIPELINE STAGE VELOCITY & INACTIVITY DECAY (Up to 20 pts)
  switch (lead.currentStage) {
    case 'visit_scheduled':
      score += 15;
      secondaryReasons.push(`Site visit scheduled — escort logistics required`);
      break;
    case 'negotiation_token':
      score += 15;
      secondaryReasons.push(`Active price negotiation & token phase`);
      break;
    case 'discovery_call':
      score += 10;
      secondaryReasons.push(`Discovery call in progress`);
      break;
    case 'portal_shared':
      score += 8;
      secondaryReasons.push(`Presentation portal shared — awaiting feedback`);
      break;
    case 'revisit_scheduled':
      score += 12;
      secondaryReasons.push(`Family revisit scheduled`);
      break;
  }

  // 5. INACTIVITY RISK ON ACTIVE LEADS
  const lastComms = (lead.communications || [])[0];
  const lastContactDate = lastComms?.createdAt ? new Date(lastComms.createdAt) : new Date(lead.updatedAt || lead.createdAt);
  const daysSinceLastContact = Math.round((nowMs - lastContactDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceLastContact >= 3 && ['discovery_call', 'portal_shared', 'visit_done'].includes(lead.currentStage)) {
    score += 15;
    if (score < 40) {
      primaryReason = `⏳ Inactivity Risk: No broker touchpoint in ${daysSinceLastContact} days`;
      urgencyTier = 'MEDIUM';
      nextAction = 'WHATSAPP';
      actionDetails = `Send check-in / new inventory shortlist to re-engage buyer`;
    } else {
      secondaryReasons.push(`No touchpoint in ${daysSinceLastContact} days`);
    }
  }

  // Calculate final score cap & tier
  const finalScore = Math.min(100, Math.max(5, score));
  if (finalScore >= 80) urgencyTier = 'CRITICAL';
  else if (finalScore >= 55) urgencyTier = 'HIGH';
  else if (finalScore >= 30) urgencyTier = 'MEDIUM';
  else urgencyTier = 'LOW';

  return {
    leadId: lead.id,
    leadName: lead.fullName || 'Navi Mumbai Prospect',
    phoneE164: lead.phoneE164,
    currentStage: lead.currentStage,
    leadSource: lead.leadSource,
    sourceCode: lead.sourceCode,
    totalScore: finalScore,
    urgencyTier,
    primaryReason,
    secondaryReasons,
    nextRecommendedAction: nextAction,
    actionDetails,
    dueReminder: topReminder,
    isOverdue,
    isDueToday,
    isFreshInbound,
    isLivePortalActive,
    lastActivityAt: mostRecentTelemetryDate || lastContactDate,
  };
}

/**
 * Computes ranked firm-wide priority queue for all leads
 */
export function rankFirmLeadsForNextConnect(leads: any[], now: Date = new Date()): PrioritizedLeadScore[] {
  const scored = leads.map((lead) => evaluateLeadConnectPriority(lead, now));

  return scored.sort((a, b) => {
    // 1. Sort by totalScore descending
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    // 2. Overdue first
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    // 3. Due today
    if (a.isDueToday && !b.isDueToday) return -1;
    if (!a.isDueToday && b.isDueToday) return 1;
    return 0;
  });
}
