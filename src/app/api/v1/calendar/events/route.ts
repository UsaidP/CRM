import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const eventType = searchParams.get('eventType'); // ALL, REMINDER, SITE_VISIT
    const status = searchParams.get('status'); // ALL, PENDING, COMPLETED

    const now = new Date();
    const startDate = startDateParam ? new Date(startDateParam) : new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endDate = endDateParam ? new Date(endDateParam) : new Date(now.getFullYear(), now.getMonth() + 2, 0);

    const events: any[] = [];

    // 1. Fetch Lead Reminders
    if (!eventType || eventType === 'ALL' || eventType.startsWith('REMINDER')) {
      const reminderWhere: any = {
        dueAt: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (status && status !== 'ALL') {
        reminderWhere.status = status;
      }

      const reminders = await prisma.leadReminder.findMany({
        where: reminderWhere,
        include: {
          lead: {
            include: {
              contact: true,
              campaign: true,
            },
          },
        },
        orderBy: { dueAt: 'asc' },
      });

      for (const r of reminders) {
        const isPastDue = new Date(r.dueAt).getTime() < now.getTime() && r.status === 'PENDING';
        events.push({
          id: `reminder-${r.id}`,
          rawId: r.id,
          sourceType: 'REMINDER',
          reminderType: r.reminderType,
          title: r.title,
          start: r.dueAt,
          end: new Date(new Date(r.dueAt).getTime() + 30 * 60 * 1000), // 30 min duration
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
    }

    // 2. Fetch Escorted Site Visits
    if (!eventType || eventType === 'ALL' || eventType === 'SITE_VISIT') {
      const visitWhere: any = {
        scheduledDate: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (status && status !== 'ALL') {
        visitWhere.status = status;
      }

      const siteVisits = await prisma.siteVisit.findMany({
        where: visitWhere,
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
      });

      for (const v of siteVisits) {
        let itinerary: any[] = [];
        try {
          itinerary = JSON.parse(v.itineraryUnitsJson || '[]');
        } catch {}

        events.push({
          id: `visit-${v.id}`,
          rawId: v.id,
          sourceType: 'SITE_VISIT',
          reminderType: 'SITE_VISIT',
          title: `🚗 Site Tour: ${v.lead?.fullName || 'Client'} (${itinerary.length} Projects)`,
          start: v.scheduledDate,
          end: new Date(new Date(v.scheduledDate).getTime() + 120 * 60 * 1000), // 2 hr tour
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
    }

    // Sort all events chronologically
    events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return NextResponse.json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error: any) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}
