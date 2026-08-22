import { prisma } from '@/lib/db/prisma';
import { CalendarViewClient } from '@/components/calendar/CalendarViewClient';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  let initialEvents: any[] = [];
  let initialLeads: any[] = [];

  try {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    const [reminders, siteVisits, leads] = await Promise.all([
      prisma.leadReminder.findMany({
        where: {
          dueAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          lead: {
            include: {
              contact: {
                include: {
                  identities: true,
                },
              },
              campaign: true,
            },
          },
        },
        orderBy: { dueAt: 'asc' },
      }),
      prisma.siteVisit.findMany({
        where: {
          scheduledDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          lead: {
            include: {
              contact: true,
              campaign: true,
            },
          },
          assignedBroker: true,
        },
        orderBy: { scheduledDate: 'asc' },
      }),
      prisma.lead.findMany({
        select: {
          id: true,
          fullName: true,
          phoneE164: true,
          sourceCode: true,
          currentStage: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    initialLeads = leads;

    // Map reminders to calendar events
    for (const r of reminders) {
      const isPastDue = new Date(r.dueAt).getTime() < now.getTime() && r.status === 'PENDING';
      initialEvents.push({
        id: `reminder-${r.id}`,
        rawId: r.id,
        sourceType: 'REMINDER',
        reminderType: r.reminderType,
        title: r.title,
        start: r.dueAt.toISOString(),
        end: new Date(r.dueAt.getTime() + 30 * 60 * 1000).toISOString(),
        priority: r.priority,
        status: r.status,
        isPastDue,
        notes: r.notes,
        leadId: r.leadId,
        leadName: r.lead?.fullName || 'Navi Mumbai Client',
        phoneE164: r.lead?.phoneE164,
        sourceCode: r.lead?.sourceCode,
        leadStage: r.lead?.currentStage,
        lead: r.lead,
      });
    }

    // Map site visits to calendar events
    for (const v of siteVisits) {
      let itinerary: any[] = [];
      try {
        itinerary = JSON.parse(v.itineraryUnitsJson || '[]');
      } catch {}

      initialEvents.push({
        id: `visit-${v.id}`,
        rawId: v.id,
        sourceType: 'SITE_VISIT',
        reminderType: 'SITE_VISIT',
        title: `🚗 Site Tour: ${v.lead?.fullName || 'Client'} (${itinerary.length} Projects)`,
        start: v.scheduledDate.toISOString(),
        end: new Date(v.scheduledDate.getTime() + 120 * 60 * 1000).toISOString(),
        priority: 'URGENT',
        status: v.status,
        timeSlot: v.timeSlot,
        pickupLocation: v.pickupLocation,
        cabDetails: v.cabDetails,
        notes: v.feedbackNotes || `Pickup: ${v.pickupLocation}`,
        leadId: v.leadId,
        leadName: v.lead?.fullName || 'Navi Mumbai Client',
        phoneE164: v.lead?.phoneE164,
        leadStage: v.lead?.currentStage,
        itinerary,
        assignedBroker: v.assignedBroker?.fullName || 'Firm Advisory Escort',
        lead: v.lead,
      });
    }

    // Sort chronologically
    initialEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  } catch (err) {
    console.error('Error loading calendar data:', err);
  }

  return <CalendarViewClient initialEvents={initialEvents} initialLeads={initialLeads} />;
}
