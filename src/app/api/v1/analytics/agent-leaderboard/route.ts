import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import { computeAgentLeaderboard } from '@/lib/domain/analytics-engine';
import { handleApiError } from '@/lib/services/api-handler';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const [users, deals, visits, portals, leads] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true },
      }),
      prisma.dealTransaction.findMany(),
      prisma.siteVisit.findMany(),
      prisma.clientPortal.findMany(),
      prisma.lead.findMany(),
    ]);

    const leaderboard = computeAgentLeaderboard(users, deals, visits, portals, leads);

    const totalBrokerage = leaderboard.reduce((acc, u) => acc + u.grossBrokerageGenerated, 0);
    const totalIncentives = leaderboard.reduce((acc, u) => acc + u.repIncentiveEarned, 0);
    const totalDeals = leaderboard.reduce((acc, u) => acc + u.dealsClosed, 0);

    return NextResponse.json({
      success: true,
      summary: {
        totalAgents: users.length,
        totalDeals,
        totalBrokerage,
        totalIncentives,
      },
      data: leaderboard,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to compute agent leaderboard');
  }
}
