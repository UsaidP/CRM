import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { computeFunnelMetrics } from '@/lib/domain/analytics-engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [leads, portals, visits, deals] = await Promise.all([
      prisma.lead.findMany(),
      prisma.clientPortal.findMany(),
      prisma.siteVisit.findMany(),
      prisma.dealTransaction.findMany(),
    ]);

    const stages = computeFunnelMetrics(leads, portals, visits, deals);

    const overallConversionPercent = leads.length > 0
      ? Number(((deals.filter((d) => d.dealStatus !== 'CANCELLED').length / leads.length) * 100).toFixed(1))
      : 0;

    return NextResponse.json({
      success: true,
      summary: {
        totalLeads: leads.length,
        totalWonDeals: deals.filter((d) => d.dealStatus !== 'CANCELLED').length,
        overallConversionPercent,
      },
      data: stages,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
