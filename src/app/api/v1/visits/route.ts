import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { buildWhatsAppSiteVisitItinerary, ItineraryStopInput } from '@/lib/domain/visit-dispatcher';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [total, visits] = await Promise.all([
      prisma.siteVisit.count({ where }),
      prisma.siteVisit.findMany({
        where,
        skip,
        take: limit,
        include: {
          lead: {
            select: {
              id: true,
              fullName: true,
              phoneE164: true,
              city: true,
            },
          },
          assignedBroker: {
            select: {
              id: true,
              fullName: true,
              phoneE164: true,
              email: true,
            },
          },
        },
        orderBy: { scheduledDate: 'desc' },
      }),
    ]);

    const formattedVisits = visits.map((v) => ({
      ...v,
      itineraryStops: JSON.parse(v.itineraryUnitsJson || '[]'),
    }));

    return NextResponse.json({
      success: true,
      count: formattedVisits.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: formattedVisits,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      leadId,
      unitIds = [],
      scheduledDate,
      timeSlot = 'Saturday 11:00 AM',
      pickupLocation = 'Kharghar Railway Station (East)',
      cabDetails = 'Ertiga MH-46-AZ-1234 (Driver: Ramesh 9820011223)',
      assignedBrokerId,
    } = body;

    if (!leadId) {
      return NextResponse.json({ success: false, error: 'leadId is required' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { assignedBroker: true },
    });

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const units = await prisma.propertyUnit.findMany({
      where: { id: { in: unitIds } },
      include: { project: true },
    });

    if (units.length === 0) {
      return NextResponse.json({ success: false, error: 'At least 1 valid unit is required for itinerary' }, { status: 400 });
    }

    const broker = await prisma.user.findFirst({
      where: { id: assignedBrokerId || lead.assignedBrokerId || undefined },
    }) || await prisma.user.findFirst();

    // Build Stops
    const stops: ItineraryStopInput[] = units.map((u, idx) => {
      const times = ['11:00 AM', '12:15 PM', '01:30 PM', '02:45 PM'];
      return {
        unitId: u.id,
        projectName: u.project.projectName,
        microMarket: u.project.microMarket,
        unitNumber: u.unitNumber,
        bhk: u.bhk,
        expectedTime: times[idx] || `${11 + idx}:00 AM`,
        developerPocName: u.project.developerSalesPocName || 'Sales Desk',
        developerPocPhone: u.project.developerSalesPocPhone || '+919876543210',
        googleMapsQuery: `${u.project.projectName} ${u.project.microMarket} Navi Mumbai`,
      };
    });

    const parsedDate = scheduledDate ? new Date(scheduledDate) : new Date();
    const dateFormatted = parsedDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const waItineraryText = buildWhatsAppSiteVisitItinerary({
      leadName: lead.fullName || 'Client',
      leadPhone: lead.phoneE164,
      scheduledDateFormatted: dateFormatted,
      timeSlot,
      pickupLocation,
      cabDetails,
      assignedBrokerName: broker?.fullName || 'Senior Advisor',
      assignedBrokerPhone: broker?.phoneE164 || '+919820123456',
      stops,
    });

    const visit = await prisma.$transaction(async (tx) => {
      const v = await tx.siteVisit.create({
        data: {
          organizationId: lead.organizationId,
          leadId: lead.id,
          assignedBrokerId: broker?.id || null,
          scheduledDate: parsedDate,
          timeSlot,
          pickupLocation,
          cabDetails,
          status: 'SCHEDULED',
          itineraryUnitsJson: JSON.stringify(stops),
        },
      });

      await tx.lead.update({
        where: { id: lead.id },
        data: { currentStage: 'visit_scheduled' },
      });

      await tx.communicationLog.create({
        data: {
          leadId: lead.id,
          channel: 'WHATSAPP',
          direction: 'OUTBOUND',
          messageContent: `Dispatched Saturday Multi-Project Site Visit Itinerary (${stops.length} stops) for ${dateFormatted}.`,
        },
      });

      return v;
    });

    return NextResponse.json({
      success: true,
      message: 'Site visit scheduled and itinerary built successfully',
      data: {
        visit,
        stops,
        waItineraryText,
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
