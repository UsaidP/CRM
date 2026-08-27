import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import { rankFirmLeadsForNextConnect } from '@/lib/domain/prioritization-engine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const rawLeads = await prisma.lead.findMany({
      where: {
        currentStage: {
          notIn: ['closed_lost'],
        },
      },
      include: {
        contact: {
          include: {
            identities: true,
          },
        },
        campaign: true,
        assignedBroker: true,
        requirements: true,
        communications: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        portals: {
          include: {
            telemetryLogs: {
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
        },
        reminders: {
          where: {
            status: { in: ['PENDING', 'SNOOZED'] },
          },
          orderBy: { dueAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const now = new Date();
    const rankedScores = rankFirmLeadsForNextConnect(rawLeads, now);

    // Map lead details for top items
    const leadMap = new Map(rawLeads.map((l) => [l.id, l]));

    const enrichedQueue = rankedScores.slice(0, limit).map((score) => {
      const fullLead = leadMap.get(score.leadId);
      return {
        ...score,
        lead: fullLead,
      };
    });

    const topRecommendation = enrichedQueue.length > 0 ? enrichedQueue[0] : null;

    // Summary metrics
    const overdueCount = rankedScores.filter((s) => s.isOverdue).length;
    const dueTodayCount = rankedScores.filter((s) => s.isDueToday).length;
    const freshInboundCount = rankedScores.filter((s) => s.isFreshInbound).length;
    const livePortalCount = rankedScores.filter((s) => s.isLivePortalActive).length;

    return NextResponse.json({
      success: true,
      topRecommendation,
      queue: enrichedQueue,
      totalActiveLeads: rawLeads.length,
      metrics: {
        overdueCount,
        dueTodayCount,
        freshInboundCount,
        livePortalCount,
      },
    });
  } catch (error: any) {
    console.error('Error computing next-connect leads:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to compute next-connect leads' },
      { status: 500 }
    );
  }
}
