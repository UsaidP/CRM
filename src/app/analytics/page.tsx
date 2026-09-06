import { prisma } from '@/lib/db/prisma';
import { AnalyticsClient } from '@/components/analytics/AnalyticsClient';
import {
  computeContentRoi,
  computeAgentLeaderboard,
  summarizeContentRoi,
  type ContentRoiSummary,
} from '@/lib/domain/analytics-engine';
import { getServerSession } from '@/lib/services/server-auth';
import { runWithTenant } from '@/lib/db/tenant-context';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const session = await getServerSession();

  let initialRoi: any[] = [];
  let initialLeaderboard: any[] = [];
  let roiSummary: Partial<ContentRoiSummary> = {};

  try {
    const [campaigns, deals, leads, users, visits, portals] = await runWithTenant(session.organizationId, async () => {
      return Promise.all([
        prisma.inboundCampaign.findMany({
          where: { organizationId: session.organizationId },
          orderBy: { totalClicks: 'desc' },
        }).catch(() => []),
        prisma.dealTransaction.findMany({
          where: { organizationId: session.organizationId, dealStatus: { not: 'CANCELLED' } },
        }).catch(() => []),
        prisma.lead.findMany({
          where: { organizationId: session.organizationId },
          include: { siteVisits: true },
        }).catch(() => []),
        prisma.user.findMany({
          where: { organizationId: session.organizationId, isActive: true },
        }).catch(() => []),
        prisma.siteVisit.findMany({
          where: { organizationId: session.organizationId },
        }).catch(() => []),
        prisma.clientPortal.findMany({
          where: { organizationId: session.organizationId },
        }).catch(() => []),
      ]);
    });

    if (campaigns && deals && leads) {
      initialRoi = computeContentRoi(campaigns, deals, leads);
      roiSummary = summarizeContentRoi(initialRoi);
    }
    if (users && deals && visits && portals && leads) {
      initialLeaderboard = computeAgentLeaderboard(users, deals, visits, portals, leads);
    }
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
