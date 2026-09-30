/**
 * Call Analytics & Sales Rep Performance Engine
 * Aggregates physical SIM call telemetry, connection rates, duration, and Gemini AI outcomes.
 */

export interface CallLogItem {
  id: string;
  leadId: string;
  leadName?: string | null;
  leadPhone?: string | null;
  channel: string;
  direction: string;
  callDurationSeconds: number;
  callOutcome?: string | null;
  aiSummary?: string | null;
  aiSentiment?: string | null;
  transcriptText?: string | null;
  callRecordingUrl?: string | null;
  clientCallId?: string | null;
  assignedBrokerId?: string | null;
  assignedBrokerName?: string | null;
  assignedBrokerPhone?: string | null;
  createdAt: Date | string;
  metadataJson?: string | null;
}

export interface RepCallPerformance {
  userId: string;
  fullName: string;
  role: string;
  phoneNumber?: string | null;
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  missedCalls: number;
  connectedCalls: number;
  connectionRatePercent: number;
  totalDurationSeconds: number;
  formattedDuration: string;
  averageDurationSeconds: number;
  interestedCount: number;
  callbackCount: number;
  notInterestedCount: number;
  noAnswerCount: number;
  positiveSentimentCount: number;
  rank: number;
}

export interface CallAnalyticsOverall {
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  missedCalls: number;
  connectedCalls: number;
  connectionRatePercent: number;
  totalDurationSeconds: number;
  formattedDuration: string;
  averageDurationSeconds: number;
  outcomesBreakdown: Record<string, number>;
  sentimentsBreakdown: Record<string, number>;
}

export function formatCallDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0s';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}

/**
 * Computes individual sales rep calling leaderboard & KPIs
 */
export function computeRepCallPerformance(
  users: Array<{ id: string; fullName: string; role: string; email?: string }>,
  calls: CallLogItem[]
): RepCallPerformance[] {
  const repsMap = new Map<string, RepCallPerformance>();

  // Initialize known active users
  for (const user of users) {
    repsMap.set(user.id, {
      userId: user.id,
      fullName: user.fullName,
      role: user.role,
      phoneNumber: null,
      totalCalls: 0,
      inboundCalls: 0,
      outboundCalls: 0,
      missedCalls: 0,
      connectedCalls: 0,
      connectionRatePercent: 0,
      totalDurationSeconds: 0,
      formattedDuration: '0s',
      averageDurationSeconds: 0,
      interestedCount: 0,
      callbackCount: 0,
      notInterestedCount: 0,
      noAnswerCount: 0,
      positiveSentimentCount: 0,
      rank: 1,
    });
  }

  // Also account for unassigned or broker-resolved calls
  for (const call of calls) {
    let repId = call.assignedBrokerId;
    
    // If no brokerId matched directly, try matching by name or metadata
    if (!repId) {
      if (call.assignedBrokerName) {
        const found = users.find((u) => u.fullName.toLowerCase() === call.assignedBrokerName?.toLowerCase());
        if (found) repId = found.id;
      }
    }

    if (!repId) {
      repId = 'unassigned';
      if (!repsMap.has(repId)) {
        repsMap.set(repId, {
          userId: 'unassigned',
          fullName: 'Unassigned Calls',
          role: 'SYSTEM',
          phoneNumber: null,
          totalCalls: 0,
          inboundCalls: 0,
          outboundCalls: 0,
          missedCalls: 0,
          connectedCalls: 0,
          connectionRatePercent: 0,
          totalDurationSeconds: 0,
          formattedDuration: '0s',
          averageDurationSeconds: 0,
          interestedCount: 0,
          callbackCount: 0,
          notInterestedCount: 0,
          noAnswerCount: 0,
          positiveSentimentCount: 0,
          rank: 1,
        });
      }
    }

    const rep = repsMap.get(repId)!;
    rep.totalCalls += 1;

    const isOutgoing = call.direction === 'OUTBOUND' || call.direction === 'OUTGOING';
    if (isOutgoing) {
      rep.outboundCalls += 1;
    } else {
      rep.inboundCalls += 1;
    }

    const isConnected = (call.callDurationSeconds || 0) > 0;
    if (isConnected) {
      rep.connectedCalls += 1;
      rep.totalDurationSeconds += call.callDurationSeconds;
    } else {
      rep.missedCalls += 1;
    }

    if (call.assignedBrokerPhone && !rep.phoneNumber) {
      rep.phoneNumber = call.assignedBrokerPhone;
    }

    // Call Outcomes
    const outcome = (call.callOutcome || '').toUpperCase();
    if (outcome.includes('INTERESTED') && !outcome.includes('NOT')) {
      rep.interestedCount += 1;
    } else if (outcome.includes('CALLBACK')) {
      rep.callbackCount += 1;
    } else if (outcome.includes('NOT_INTERESTED')) {
      rep.notInterestedCount += 1;
    } else if (outcome.includes('NO_ANSWER') || outcome.includes('MISSED') || outcome.includes('BUSY')) {
      rep.noAnswerCount += 1;
    }

    // AI Sentiment
    if (call.aiSentiment === 'POSITIVE') {
      rep.positiveSentimentCount += 1;
    }
  }

  // Calculate percentages and formatting
  const results = Array.from(repsMap.values()).map((rep) => {
    rep.connectionRatePercent = rep.totalCalls > 0
      ? Number(((rep.connectedCalls / rep.totalCalls) * 100).toFixed(1))
      : 0;

    rep.averageDurationSeconds = rep.connectedCalls > 0
      ? Math.round(rep.totalDurationSeconds / rep.connectedCalls)
      : 0;

    rep.formattedDuration = formatCallDuration(rep.totalDurationSeconds);
    return rep;
  });

  // Filter out reps with 0 activity if we have reps with activity, or sort by connected calls descending
  results.sort((a, b) => {
    if (b.connectedCalls !== a.connectedCalls) {
      return b.connectedCalls - a.connectedCalls;
    }
    return b.totalDurationSeconds - a.totalDurationSeconds;
  });

  results.forEach((rep, idx) => {
    rep.rank = idx + 1;
  });

  return results;
}

/**
 * Computes overall company call stats
 */
export function computeCallAnalyticsOverall(calls: CallLogItem[]): CallAnalyticsOverall {
  const totalCalls = calls.length;
  let inboundCalls = 0;
  let outboundCalls = 0;
  let missedCalls = 0;
  let connectedCalls = 0;
  let totalDurationSeconds = 0;

  const outcomesBreakdown: Record<string, number> = {};
  const sentimentsBreakdown: Record<string, number> = {};

  for (const call of calls) {
    const isOutgoing = call.direction === 'OUTBOUND' || call.direction === 'OUTGOING';
    if (isOutgoing) outboundCalls += 1;
    else inboundCalls += 1;

    const duration = call.callDurationSeconds || 0;
    if (duration > 0) {
      connectedCalls += 1;
      totalDurationSeconds += duration;
    } else {
      missedCalls += 1;
    }

    const outcome = call.callOutcome || (duration === 0 ? 'NO_ANSWER' : 'INTERESTED');
    outcomesBreakdown[outcome] = (outcomesBreakdown[outcome] || 0) + 1;

    const sentiment = call.aiSentiment || 'NEUTRAL';
    sentimentsBreakdown[sentiment] = (sentimentsBreakdown[sentiment] || 0) + 1;
  }

  const connectionRatePercent = totalCalls > 0
    ? Number(((connectedCalls / totalCalls) * 100).toFixed(1))
    : 0;

  const averageDurationSeconds = connectedCalls > 0
    ? Math.round(totalDurationSeconds / connectedCalls)
    : 0;

  return {
    totalCalls,
    inboundCalls,
    outboundCalls,
    missedCalls,
    connectedCalls,
    connectionRatePercent,
    totalDurationSeconds,
    formattedDuration: formatCallDuration(totalDurationSeconds),
    averageDurationSeconds,
    outcomesBreakdown,
    sentimentsBreakdown,
  };
}
