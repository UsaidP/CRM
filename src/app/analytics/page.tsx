import { prisma } from '@/lib/db/prisma';
import { AnalyticsClient } from '@/components/analytics/AnalyticsClient';
import {
  computeContentRoi,
  computeAgentLeaderboard,
  summarizeContentRoi,
  type ContentRoiSummary,
} from '@/lib/domain/analytics-engine';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  let initialRoi: any[] = [];
  let initialLeaderboard: any[] = [];
  let roiSummary: Partial<ContentRoiSummary> = {};

  try {
    const [campaigns, deals, leads, users, visits, portals] = await Promise.all([
      prisma.inboundCampaign.findMany({
        orderBy: { totalClicks: 'desc' },
      }),
      prisma.dealTransaction.findMany({
        where: { dealStatus: { not: 'CANCELLED' } },
      }),
      prisma.lead.findMany({
        include: { siteVisits: true },
      }),
      prisma.user.findMany({
        where: { isActive: true },
      }),
      prisma.siteVisit.findMany(),
      prisma.clientPortal.findMany(),
    ]);

    initialRoi = computeContentRoi(campaigns, deals, leads);
    initialLeaderboard = computeAgentLeaderboard(users, deals, visits, portals, leads);

    roiSummary = summarizeContentRoi(initialRoi);
  } catch (err) {
    console.error('Error preloading analytics:', err);
  }

  return (
    <AnalyticsClient
      initialRoi={initialRoi}
      initialRoiSummary={roiSummary}
      initialLeaderboard={initialLeaderboard}
      initialLeaderboardSummary={{}}
    />
  );
}
