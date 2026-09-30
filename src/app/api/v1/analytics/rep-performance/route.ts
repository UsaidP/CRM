import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import {
  computeRepCallPerformance,
  computeCallAnalyticsOverall,
  type CallLogItem,
} from '@/lib/domain/call-analytics-engine';
import { getIstDayRange } from '@/lib/services/whatsapp-digest-service';
import { handleApiError } from '@/lib/services/api-handler';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const timeRange = (url.searchParams.get('timeRange') || 'week').toLowerCase();

    // Determine timestamp lower bound
    let dateFilter: { gte?: Date; lte?: Date } | undefined = undefined;
    const now = new Date();

    if (timeRange === 'today') {
      const { startOfDay, endOfDay } = getIstDayRange(now);
      dateFilter = { gte: startOfDay, lte: endOfDay };
    } else if (timeRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { gte: weekAgo };
    } else if (timeRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = { gte: monthAgo };
    }
    // 'all' leaves dateFilter undefined

    const whereClause: any = {
      channel: 'PHONE_CALL',
      lead: {
        organizationId: auth.session.organizationId,
      },
    };

    if (dateFilter) {
      whereClause.createdAt = dateFilter;
    }

    // Parallel fetch: calls + organization users
    const [logs, users] = await Promise.all([
      prisma.communicationLog.findMany({
        where: whereClause,
        include: {
          lead: {
            select: {
              id: true,
              fullName: true,
              phoneE164: true,
              assignedBrokerId: true,
              assignedBroker: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.findMany({
        where: {
          organizationId: auth.session.organizationId,
          isActive: true,
        },
        select: {
          id: true,
          fullName: true,
          role: true,
          email: true,
        },
      }),
    ]);

    // Map logs to CallLogItem domain models
    const callItems: CallLogItem[] = logs.map((log) => {
      let brokerName = log.lead?.assignedBroker?.fullName;
      let brokerPhone = null;

      if (log.metadataJson) {
        try {
          const meta = JSON.parse(log.metadataJson);
          if (!brokerName && meta.brokerAssigned) brokerName = meta.brokerAssigned;
          if (meta.contactedBrokerNumber) brokerPhone = meta.contactedBrokerNumber;
        } catch {
          // ignore
        }
      }

      return {
        id: log.id,
        leadId: log.leadId,
        leadName: log.lead?.fullName,
        leadPhone: log.lead?.phoneE164,
        channel: log.channel,
        direction: log.direction,
        callDurationSeconds: log.callDurationSeconds,
        callOutcome: log.callOutcome,
        aiSummary: log.aiSummary,
        aiSentiment: log.aiSentiment,
        transcriptText: log.transcriptText,
        callRecordingUrl: log.callRecordingUrl,
        clientCallId: log.clientCallId,
        assignedBrokerId: log.lead?.assignedBrokerId,
        assignedBrokerName: brokerName,
        assignedBrokerPhone: brokerPhone,
        createdAt: log.createdAt,
        metadataJson: log.metadataJson,
      };
    });

    const overall = computeCallAnalyticsOverall(callItems);
    const repPerformance = computeRepCallPerformance(users, callItems);

    // Recent calls feed (top 30)
    const recentCalls = logs.slice(0, 30).map((log) => {
      let repName = log.lead?.assignedBroker?.fullName;
      if (!repName && log.metadataJson) {
        try {
          const meta = JSON.parse(log.metadataJson);
          repName = meta.brokerAssigned;
        } catch {
          // ignore
        }
      }

      return {
        id: log.id,
        leadId: log.leadId,
        leadName: log.lead?.fullName || 'Prospect',
        leadPhone: log.lead?.phoneE164 || '—',
        repName: repName || 'Assigned Advisor',
        direction: log.direction,
        durationSeconds: log.callDurationSeconds,
        callOutcome: log.callOutcome || 'INTERESTED',
        aiSummary: log.aiSummary,
        aiSentiment: log.aiSentiment,
        transcriptText: log.transcriptText,
        callRecordingUrl: log.callRecordingUrl,
        createdAt: log.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      timeRange,
      overall,
      repPerformance,
      recentCalls,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to compute sales rep call performance analytics');
  }
}
