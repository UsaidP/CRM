import { prisma } from '@/lib/db/prisma';

export interface StageFallbackConfig {
  dueAt: Date;
  title: string;
  reminderType: string;
  priority: string;
  notes?: string;
}

/**
 * Calculates deterministic next-action fallback cadence based on the lead's current stage
 */
export function calculateStageFallbackCadence(stage: string, now: Date = new Date()): StageFallbackConfig {
  const base = new Date(now);

  switch (stage) {
    case 'new_uncontacted':
      // 15-minute speed-to-lead SLA
      return {
        dueAt: new Date(base.getTime() + 15 * 60 * 1000),
        title: 'Initial Speed-to-Lead Call & Qualification',
        reminderType: 'CALL',
        priority: 'URGENT',
        notes: 'Sub-15m Speed-to-Lead SLA response required for fresh inbound.',
      };

    case 'discovery_call':
      // 24 hours: Send shortlisted property decks
      base.setDate(base.getDate() + 1);
      base.setHours(11, 0, 0, 0);
      return {
        dueAt: base,
        title: 'Send Verified Property Shortlist & Floor Plans',
        reminderType: 'WHATSAPP',
        priority: 'HIGH',
        notes: 'Prepare tailored 2/3 BHK portfolio deck based on client requirements.',
      };

    case 'portal_shared':
      // 24 hours: Follow up on portal telemetry / deck review
      base.setDate(base.getDate() + 1);
      base.setHours(16, 0, 0, 0);
      return {
        dueAt: base,
        title: 'Review Client Portal Telemetry & Discuss Shortlisted Units',
        reminderType: 'CALL',
        priority: 'HIGH',
        notes: 'Check favorite units and schedule escorted physical site tour.',
      };

    case 'visit_scheduled':
      // 2 hours before the scheduled visit (fallback to tomorrow morning 9:30 AM if no visit date)
      base.setDate(base.getDate() + 1);
      base.setHours(9, 30, 0, 0);
      return {
        dueAt: base,
        title: 'Pre-Visit Confirmation & Cab Driver Logistics Check',
        reminderType: 'CALL',
        priority: 'URGENT',
        notes: 'Confirm buyer pickup point and coordinate with project developer sales POC.',
      };

    case 'visit_done':
      // Next morning at 10:30 AM
      base.setDate(base.getDate() + 1);
      base.setHours(10, 30, 0, 0);
      return {
        dueAt: base,
        title: 'Post-Site-Visit Evaluation & Token Offer Discussion',
        reminderType: 'CALL',
        priority: 'URGENT',
        notes: 'Debrief on inspected units, resolve objections, and discuss payment schedule.',
      };

    case 'negotiation_token':
      // 12 hours
      return {
        dueAt: new Date(base.getTime() + 12 * 60 * 60 * 1000),
        title: 'Follow Up on Booking Form & Builder Token Receipt',
        reminderType: 'CALL',
        priority: 'URGENT',
        notes: 'Ensure token amount transfer and verify unit blocking with developer VP.',
      };

    case 'under_registration':
      // 3 days
      base.setDate(base.getDate() + 3);
      base.setHours(11, 0, 0, 0);
      return {
        dueAt: base,
        title: 'Stamp Duty Payment & Agreement Registration Check',
        reminderType: 'GENERAL',
        priority: 'HIGH',
        notes: 'Coordinate registrar appointment and verify legal documentation.',
      };

    case 'on_hold_nurture':
      // 7 days
      base.setDate(base.getDate() + 7);
      base.setHours(12, 0, 0, 0);
      return {
        dueAt: base,
        title: 'Pulse Check on Micro-Market Price Revisions & New Inventory',
        reminderType: 'WHATSAPP',
        priority: 'MEDIUM',
        notes: 'Share fresh market updates or newly launched developer towers.',
      };

    default:
      // Default 48 hours follow-up
      base.setDate(base.getDate() + 2);
      base.setHours(11, 0, 0, 0);
      return {
        dueAt: base,
        title: 'Standard Pipeline Check-in & Follow-up',
        reminderType: 'CALL',
        priority: 'HIGH',
        notes: 'Routine consultative follow-up.',
      };
  }
}

/**
 * Ensures every lead has an active pending reminder scheduled.
 * If none exists, creates a stage-appropriate fallback reminder.
 */
export async function ensureLeadFallbackReminder(
  leadId: string,
  options: {
    force?: boolean;
    preferredDueAt?: Date;
    preferredTitle?: string;
    preferredType?: string;
    organizationId?: string;
  } = {}
) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        reminders: {
          where: {
            status: { in: ['PENDING', 'SNOOZED'] },
          },
          orderBy: { dueAt: 'asc' },
        },
      },
    });

    if (!lead) return null;

    // If an active reminder already exists and force is false, do nothing
    if (lead.reminders.length > 0 && !options.force) {
      return lead.reminders[0];
    }

    const orgId = options.organizationId || lead.organizationId;
    const cadence = calculateStageFallbackCadence(lead.currentStage || 'new_uncontacted');

    const reminder = await prisma.leadReminder.create({
      data: {
        organizationId: orgId,
        leadId: lead.id,
        title: options.preferredTitle || cadence.title,
        reminderType: options.preferredType || cadence.reminderType,
        dueAt: options.preferredDueAt || cadence.dueAt,
        priority: cadence.priority,
        status: 'PENDING',
        notes: cadence.notes || `Automated fallback cadence for ${lead.currentStage} stage.`,
      },
    });

    return reminder;
  } catch (error) {
    console.error(`[ensureLeadFallbackReminder] Failed for lead ${leadId}:`, error);
    return null;
  }
}

/**
 * Atomically marks a reminder as COMPLETED and provisions the next scheduled touchpoint
 */
export async function completeReminderAndScheduleNext(params: {
  reminderId: string;
  completionNotes?: string;
  nextReminder?: {
    title: string;
    reminderType: string;
    dueAt: Date | string;
    priority?: string;
    notes?: string;
  };
}) {
  const existing = await prisma.leadReminder.findUnique({
    where: { id: params.reminderId },
    include: { lead: true },
  });

  if (!existing) {
    throw new Error('Reminder not found');
  }

  // 1. Mark current reminder complete
  const completedReminder = await prisma.leadReminder.update({
    where: { id: params.reminderId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      notes: params.completionNotes
        ? `${existing.notes ? existing.notes + '\n\n' : ''}[Outcome]: ${params.completionNotes}`
        : existing.notes,
    },
  });

  // 2. Schedule next reminder (custom or stage fallback)
  let nextReminder = null;
  if (params.nextReminder && params.nextReminder.dueAt) {
    nextReminder = await prisma.leadReminder.create({
      data: {
        organizationId: existing.organizationId,
        leadId: existing.leadId,
        title: params.nextReminder.title,
        reminderType: params.nextReminder.reminderType || 'CALL',
        dueAt: new Date(params.nextReminder.dueAt),
        priority: params.nextReminder.priority || 'HIGH',
        status: 'PENDING',
        notes: params.nextReminder.notes || undefined,
      },
    });
  } else {
    // Auto-seed next stage fallback if lead is active
    if (existing.lead && existing.lead.currentStage !== 'closed_won' && existing.lead.currentStage !== 'closed_lost') {
      nextReminder = await ensureLeadFallbackReminder(existing.leadId, {
        organizationId: existing.organizationId,
      });
    }
  }

  return {
    completedReminder,
    nextReminder,
  };
}

/**
 * Creates an instant high-intent callback reminder when a buyer interacts heavily with their portal
 */
export async function triggerTelemetryIntentReminder(params: {
  portalId: string;
  unitId?: string;
  actionType: string;
  dwellTimeSec?: number;
}) {
  try {
    const portal = await prisma.clientPortal.findUnique({
      where: { id: params.portalId },
      include: {
        lead: {
          include: {
            reminders: {
              where: { status: { in: ['PENDING', 'SNOOZED'] } },
              orderBy: { dueAt: 'asc' },
            },
          },
        },
      },
    });

    if (!portal || !portal.lead) return null;

    const lead = portal.lead;
    const now = new Date();
    const actionLabel = params.actionType.replace(/_/g, ' ').toLowerCase();

    // High intent actions: Video play, brochure download, visit booking click, long dwell (>60s)
    const isHighIntent =
      params.actionType === 'VISIT_BOOKING_CLICK' ||
      params.actionType === 'VIDEO_PLAY' ||
      params.actionType === 'BROCHURE_DOWNLOAD' ||
      params.actionType === 'WHATSAPP_CLICK' ||
      (params.dwellTimeSec && params.dwellTimeSec >= 60);

    if (!isHighIntent) return null;

    // Check if an urgent reminder already exists in the next 30 minutes
    const hasRecentPending = lead.reminders.some((r) => {
      const diff = new Date(r.dueAt).getTime() - now.getTime();
      return diff >= 0 && diff <= 30 * 60 * 1000;
    });

    if (hasRecentPending) return null;

    // Provision an instant 10-minute follow-up reminder
    const urgentReminder = await prisma.leadReminder.create({
      data: {
        organizationId: portal.organizationId,
        leadId: lead.id,
        title: `🔥 High Buyer Intent: Active on Portal (${actionLabel})`,
        reminderType: 'WHATSAPP',
        dueAt: new Date(now.getTime() + 10 * 60 * 1000), // +10 mins
        priority: 'URGENT',
        status: 'PENDING',
        notes: `Client is actively interacting with the curated portal right now (${actionLabel}${params.dwellTimeSec ? `, ${params.dwellTimeSec}s dwell` : ''}). Follow up immediately while hot!`,
      },
    });

    return urgentReminder;
  } catch (error) {
    console.error('[triggerTelemetryIntentReminder] Error:', error);
    return null;
  }
}

/**
 * Background batch healing: Finds all active pipeline leads with 0 pending reminders and seeds fallback cadences
 */
export async function syncAllLeadFallbacks(organizationId?: string) {
  const activeStages = [
    'new_uncontacted',
    'discovery_call',
    'portal_shared',
    'visit_scheduled',
    'visit_done',
    'revisit_scheduled',
    'negotiation_token',
    'under_registration',
    'on_hold_nurture',
  ];

  const whereClause: any = {
    currentStage: { in: activeStages },
  };
  if (organizationId) {
    whereClause.organizationId = organizationId;
  }

  const leads = await prisma.lead.findMany({
    where: whereClause,
    include: {
      reminders: {
        where: { status: { in: ['PENDING', 'SNOOZED'] } },
      },
    },
  });

  const orphanLeads = leads.filter((l) => l.reminders.length === 0);
  let createdCount = 0;

  for (const lead of orphanLeads) {
    const reminder = await ensureLeadFallbackReminder(lead.id, {
      organizationId: lead.organizationId,
    });
    if (reminder) createdCount++;
  }

  return {
    totalChecked: leads.length,
    orphanCount: orphanLeads.length,
    createdCount,
  };
}

/**
 * Auto-escalates reminders that have been overdue for > 2 hours to URGENT priority
 */
export async function escalateOverdueReminders(organizationId?: string) {
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const whereClause: any = {
    status: 'PENDING',
    dueAt: { lte: twoHoursAgo },
    priority: { not: 'URGENT' },
  };
  if (organizationId) {
    whereClause.organizationId = organizationId;
  }

  const result = await prisma.leadReminder.updateMany({
    where: whereClause,
    data: {
      priority: 'URGENT',
    },
  });

  return {
    escalatedCount: result.count,
  };
}
