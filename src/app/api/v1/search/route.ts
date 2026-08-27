import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q || q.length < 1) {
      return NextResponse.json({
        success: true,
        query: '',
        results: {
          leads: [],
          projects: [],
          units: [],
          visits: [],
          deals: [],
        },
      });
    }

    const queryDigits = q.replace(/\D/g, '');

    // 1. Search Leads
    const leadOrConditions: any[] = [
      { fullName: { contains: q } },
      { email: { contains: q } },
      { sourceCode: { contains: q } },
      { city: { contains: q } },
      { notes: { contains: q } },
    ];
    if (queryDigits.length >= 3) {
      leadOrConditions.push({ phoneE164: { contains: queryDigits } });
    }

    const rawLeads = await prisma.lead.findMany({
      where: { OR: leadOrConditions },
      take: 6,
      include: {
        requirements: {
          take: 1,
          where: { isActive: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const leads = rawLeads.map((l) => ({
      id: l.id,
      fullName: l.fullName,
      phoneE164: l.phoneE164,
      email: l.email,
      currentStage: l.currentStage,
      sourceCode: l.sourceCode,
      preferredMicroMarket: l.requirements?.[0]?.targetLocationsJson
        ? JSON.parse(l.requirements[0].targetLocationsJson || '[]')[0] || l.city
        : l.city,
      preferredBhk: l.requirements?.[0]?.bhkPreferencesJson
        ? JSON.parse(l.requirements[0].bhkPreferencesJson || '[]')[0]
        : null,
      budgetCeiling: l.requirements?.[0]?.budgetMax || null,
      leadSource: l.leadSource,
      createdAt: l.createdAt,
    }));

    // 2. Search Developer Projects
    const projectOrConditions: any[] = [
      { projectName: { contains: q } },
      { developerName: { contains: q } },
      { reraNumber: { contains: q } },
      { microMarket: { contains: q } },
      { subLocality: { contains: q } },
    ];

    const projects = await prisma.developerProject.findMany({
      where: { OR: projectOrConditions },
      take: 6,
      select: {
        id: true,
        projectName: true,
        developerName: true,
        reraNumber: true,
        microMarket: true,
        subLocality: true,
        totalFloors: true,
        basePricePerSqft: true,
        hasOccupancyCertificate: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // 3. Search Property Units
    const units = await prisma.propertyUnit.findMany({
      where: {
        OR: [
          { unitNumber: { contains: q } },
          { description: { contains: q } },
        ],
      },
      take: 4,
      include: {
        project: {
          select: {
            projectName: true,
            microMarket: true,
            developerName: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // 4. Search Site Visits
    const visitOrConditions: any[] = [
      { pickupLocation: { contains: q } },
      { timeSlot: { contains: q } },
      { feedbackNotes: { contains: q } },
      {
        lead: {
          fullName: { contains: q },
        },
      },
    ];
    if (queryDigits.length >= 3) {
      visitOrConditions.push({
        lead: {
          phoneE164: { contains: queryDigits },
        },
      });
    }

    const rawVisits = await prisma.siteVisit.findMany({
      where: { OR: visitOrConditions },
      take: 4,
      include: {
        lead: {
          select: {
            fullName: true,
            phoneE164: true,
          },
        },
        assignedBroker: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { scheduledDate: 'desc' },
    });

    const visits = rawVisits.map((v) => ({
      id: v.id,
      clientName: v.lead?.fullName || 'Client',
      clientPhone: v.lead?.phoneE164 || '',
      visitDate: v.scheduledDate,
      microMarket: v.pickupLocation || 'Navi Mumbai',
      status: v.status,
      escortAgent: v.assignedBroker?.fullName || 'Assigned Agent',
    }));

    // 5. Search Deals
    const dealOrConditions: any[] = [
      { developerInvoiceNumber: { contains: q } },
      { notes: { contains: q } },
      {
        lead: {
          fullName: { contains: q },
        },
      },
      {
        developerProject: {
          projectName: { contains: q },
        },
      },
      {
        propertyUnit: {
          unitNumber: { contains: q },
        },
      },
    ];
    if (queryDigits.length >= 3) {
      dealOrConditions.push({
        lead: {
          phoneE164: { contains: queryDigits },
        },
      });
    }

    const rawDeals = await prisma.dealTransaction.findMany({
      where: { OR: dealOrConditions },
      take: 4,
      include: {
        lead: {
          select: {
            fullName: true,
            phoneE164: true,
          },
        },
        developerProject: {
          select: {
            projectName: true,
            developerName: true,
          },
        },
        propertyUnit: {
          select: {
            unitNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const deals = rawDeals.map((d) => ({
      id: d.id,
      clientName: d.lead?.fullName || 'Client',
      clientPhone: d.lead?.phoneE164 || '',
      developerName: d.developerProject?.projectName || 'Project',
      unitNumber: d.propertyUnit?.unitNumber || '',
      agreementValue: d.agreementValue,
      dealStage: d.dealStatus,
      brokerageAmount: d.grossBrokerageAmount,
    }));

    const totalCount = leads.length + projects.length + units.length + visits.length + deals.length;

    return NextResponse.json({
      success: true,
      query: q,
      totalCount,
      results: {
        leads,
        projects,
        units,
        visits,
        deals,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Search query failed' },
      { status: 500 }
    );
  }
}
