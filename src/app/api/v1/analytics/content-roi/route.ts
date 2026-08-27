import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import { computeContentRoi, summarizeContentRoi } from '@/lib/domain/analytics-engine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const [campaigns, deals, leads] = await Promise.all([
      prisma.inboundCampaign.findMany({
        orderBy: { totalClicks: 'desc' },
      }),
      prisma.dealTransaction.findMany({
        where: { dealStatus: { not: 'CANCELLED' } },
      }),
      prisma.lead.findMany({
        include: { siteVisits: true },
      }),
    ]);

    const report = computeContentRoi(campaigns, deals, leads);
    const attributionSummary = summarizeContentRoi(report);

    const totalClicks = report.reduce((acc, r) => acc + r.totalClicks, 0);
    const totalLeads = report.reduce((acc, r) => acc + r.totalLeads, 0);
    const totalDeals = report.reduce((acc, r) => acc + r.totalDeals, 0);
    const totalGrossRevenue = report.reduce((acc, r) => acc + r.grossBrokerageRupees, 0);
    const overallRpc = totalClicks > 0 ? Number((totalGrossRevenue / totalClicks).toFixed(2)) : 0;

    return NextResponse.json({
      success: true,
      summary: {
        ...attributionSummary,
        totalClicks,
        totalLeads,
        totalDeals,
        totalGrossRevenue,
        overallRpc,
        totalCampaigns: campaigns.length,
      },
      data: report,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
