/**
 * Site Visit Domain Analytics Engine
 *
 * In real estate sales, lead volume is a vanity metric;
 * Site Visits Completed is the primary leading indicator of revenue.
 *
 * This module models the 4-phase site visit conversion funnel:
 * Scheduled ➔ Confirmed ➔ Attended ➔ Token / Closed
 */

export interface VisitFunnelStage {
  id: string;
  label: string;
  count: number;
  displayValue: string;
  percentage: number;
  conversionFromPrev: number;
  color: string;
  gradient: { offset: string; color: string }[];
  description: string;
}

export interface VisitKpis {
  totalVisits: number;
  scheduledCount: number;
  confirmedCount: number;
  inProgressCount: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  confirmationRate: number; // % of active tours that get confirmed
  completionRate: number;   // % of tours that are attended
  noShowRate: number;       // % of tours that miss without notice
  rescheduleCount: number;  // Tours rescheduled >= 1 time
  rescheduleRate: number;   // % of tours that underwent rescheduling
  avgRating: number;        // Average stars on completed visits (0 - 5)
  tokenCount: number;       // Tours resulting in immediate token submission
}

export interface BrokerVisitPerformance {
  brokerId: string;
  brokerName: string;
  brokerEmail?: string | null;
  totalAssigned: number;
  confirmedCount: number;
  completedCount: number;
  noShowCount: number;
  tokenCount: number;
  completionRate: number; // completed / totalAssigned
  tokenConversionRate: number; // token / completed
  avgRating: number;
}

export interface OutcomeDistributionItem {
  outcome: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

/**
 * Calculates core visit KPIs and health ratios from site visit records
 */
export function calculateVisitKpis(visits: any[] = []): VisitKpis {
  if (!visits || visits.length === 0) {
    return {
      totalVisits: 0,
      scheduledCount: 0,
      confirmedCount: 0,
      inProgressCount: 0,
      completedCount: 0,
      cancelledCount: 0,
      noShowCount: 0,
      confirmationRate: 0,
      completionRate: 0,
      noShowRate: 0,
      rescheduleCount: 0,
      rescheduleRate: 0,
      avgRating: 0,
      tokenCount: 0,
    };
  }

  let scheduled = 0;
  let confirmed = 0;
  let inProgress = 0;
  let completed = 0;
  let cancelled = 0;
  let noShow = 0;
  let rescheduled = 0;
  let totalRating = 0;
  let ratingCount = 0;
  let tokenCount = 0;

  visits.forEach((v) => {
    const status = (v.status || 'SCHEDULED').toUpperCase();
    if (status === 'SCHEDULED') scheduled++;
    else if (status === 'CONFIRMED') confirmed++;
    else if (status === 'IN_PROGRESS') inProgress++;
    else if (status === 'COMPLETED') completed++;
    else if (status === 'CANCELLED') cancelled++;
    else if (status === 'NO_SHOW') noShow++;

    if ((v.rescheduleCount && v.rescheduleCount > 0) || v.rescheduledAt) {
      rescheduled++;
    }

    if (v.feedbackRating && Number(v.feedbackRating) > 0) {
      totalRating += Number(v.feedbackRating);
      ratingCount++;
    }

    if (v.feedbackOutcome === 'TOKEN_SUBMITTED') {
      tokenCount++;
    }
  });

  const total = visits.length;
  // Confirmed tours includes already confirmed and those that proceeded to attended/completed
  const totalEngagedOrConfirmed = confirmed + completed + tokenCount;
  const activeDenominator = scheduled + confirmed + inProgress + completed + noShow;

  const confirmationRate = activeDenominator > 0
    ? Math.round((totalEngagedOrConfirmed / activeDenominator) * 100)
    : 0;

  const completionRate = activeDenominator > 0
    ? Math.round((completed / activeDenominator) * 100)
    : 0;

  const noShowRate = activeDenominator > 0
    ? Math.round((noShow / activeDenominator) * 100)
    : 0;

  const rescheduleRate = total > 0
    ? Math.round((rescheduled / total) * 100)
    : 0;

  const avgRating = ratingCount > 0
    ? Math.round((totalRating / ratingCount) * 10) / 10
    : 0;

  return {
    totalVisits: total,
    scheduledCount: scheduled,
    confirmedCount: confirmed,
    inProgressCount: inProgress,
    completedCount: completed,
    cancelledCount: cancelled,
    noShowCount: noShow,
    confirmationRate,
    completionRate,
    noShowRate,
    rescheduleCount: rescheduled,
    rescheduleRate,
    avgRating,
    tokenCount,
  };
}

/**
 * Builds the 5-stage real estate site visit conversion funnel
 * Scheduled ➔ Confirmed ➔ Attended ➔ Token / High Interest ➔ Closed Deal
 */
export function buildVisitConversionFunnel(
  visits: any[] = [],
  deals: any[] = []
): VisitFunnelStage[] {
  const totalScheduled = visits.length;

  // Confirmed: either explicitly CONFIRMED, or reached COMPLETED/IN_PROGRESS
  const confirmedCount = visits.filter((v) =>
    ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(v.status) || v.confirmedAt
  ).length;

  // Attended: reached COMPLETED
  const attendedCount = visits.filter((v) => v.status === 'COMPLETED').length;

  // Token or High Interest outcome
  const tokenOrHighInterest = visits.filter(
    (v) => v.feedbackOutcome === 'TOKEN_SUBMITTED' || v.feedbackOutcome === 'HIGH_INTEREST'
  ).length;

  // Closed Deals from visits or deal transactions
  const tokenReceivedDeals = deals.filter(
    (d) => d.dealStatus && d.dealStatus !== 'CANCELLED'
  ).length;
  const closedDealCount = Math.max(
    visits.filter((v) => v.feedbackOutcome === 'TOKEN_SUBMITTED').length,
    tokenReceivedDeals
  );

  const baseDenominator = Math.max(1, totalScheduled);

  const stages: {
    id: string;
    label: string;
    count: number;
    color: string;
    gradient: { offset: string; color: string }[];
    description: string;
  }[] = [
    {
      id: 'scheduled',
      label: '1. Tour Scheduled',
      count: totalScheduled,
      color: '#0EA5E9',
      gradient: [
        { offset: '0%', color: '#38BDF8' },
        { offset: '100%', color: '#0284C7' },
      ],
      description: 'Cab logistics & developer appointment fixed',
    },
    {
      id: 'confirmed',
      label: '2. Buyer Confirmed',
      count: confirmedCount,
      color: '#6366F1',
      gradient: [
        { offset: '0%', color: '#818CF8' },
        { offset: '100%', color: '#4F46E5' },
      ],
      description: 'Buyer attendance verified before dispatch',
    },
    {
      id: 'attended',
      label: '3. Site Tour Attended',
      count: attendedCount,
      color: '#10B981',
      gradient: [
        { offset: '0%', color: '#34D399' },
        { offset: '100%', color: '#059669' },
      ],
      description: 'Physical walkthrough with escort broker completed',
    },
    {
      id: 'offer_token',
      label: '4. High Interest / Offer',
      count: tokenOrHighInterest,
      color: '#F59E0B',
      gradient: [
        { offset: '0%', color: '#FBBF24' },
        { offset: '100%', color: '#D97706' },
      ],
      description: 'Buyer submitted token or requested final costing',
    },
    {
      id: 'closed',
      label: '5. Booking Done',
      count: closedDealCount,
      color: '#8B5CF6',
      gradient: [
        { offset: '0%', color: '#A78BFA' },
        { offset: '100%', color: '#7C3AED' },
      ],
      description: 'Agreement signed & brokerage commission booked',
    },
  ];

  let prevCount = totalScheduled;

  return stages.map((s, idx) => {
    const percentage = Math.round((s.count / baseDenominator) * 100);
    const conversionFromPrev = idx === 0
      ? 100
      : prevCount > 0
        ? Math.round((s.count / prevCount) * 100)
        : 0;
    prevCount = s.count;

    return {
      id: s.id,
      label: s.label,
      count: s.count,
      displayValue: `${s.count} tours`,
      percentage,
      conversionFromPrev,
      color: s.color,
      gradient: s.gradient,
      description: s.description,
    };
  });
}

/**
 * Aggregates visit performance by assigned escort broker
 */
export function buildBrokerVisitLeaderboard(visits: any[] = []): BrokerVisitPerformance[] {
  const map: Record<string, {
    brokerId: string;
    brokerName: string;
    brokerEmail?: string | null;
    total: number;
    confirmed: number;
    completed: number;
    noShow: number;
    token: number;
    ratings: number[];
  }> = {};

  visits.forEach((v) => {
    const broker = v.assignedBroker;
    const brokerId = v.assignedBrokerId || broker?.id || 'unassigned';
    const brokerName = broker?.fullName || (brokerId === 'unassigned' ? 'Unassigned Broker' : 'Sales Advisor');
    const brokerEmail = broker?.email || null;

    if (!map[brokerId]) {
      map[brokerId] = {
        brokerId,
        brokerName,
        brokerEmail,
        total: 0,
        confirmed: 0,
        completed: 0,
        noShow: 0,
        token: 0,
        ratings: [],
      };
    }

    const item = map[brokerId];
    item.total++;

    const status = (v.status || '').toUpperCase();
    if (status === 'CONFIRMED' || status === 'COMPLETED' || v.confirmedAt) {
      item.confirmed++;
    }
    if (status === 'COMPLETED') {
      item.completed++;
    }
    if (status === 'NO_SHOW') {
      item.noShow++;
    }
    if (v.feedbackOutcome === 'TOKEN_SUBMITTED') {
      item.token++;
    }
    if (v.feedbackRating && Number(v.feedbackRating) > 0) {
      item.ratings.push(Number(v.feedbackRating));
    }
  });

  return Object.values(map)
    .map((b) => {
      const avgRating = b.ratings.length > 0
        ? Math.round((b.ratings.reduce((acc, r) => acc + r, 0) / b.ratings.length) * 10) / 10
        : 0;

      return {
        brokerId: b.brokerId,
        brokerName: b.brokerName,
        brokerEmail: b.brokerEmail,
        totalAssigned: b.total,
        confirmedCount: b.confirmed,
        completedCount: b.completed,
        noShowCount: b.noShow,
        tokenCount: b.token,
        completionRate: b.total > 0 ? Math.round((b.completed / b.total) * 100) : 0,
        tokenConversionRate: b.completed > 0 ? Math.round((b.token / b.completed) * 100) : 0,
        avgRating,
      };
    })
    .sort((a, b) => b.completedCount - a.completedCount || b.tokenCount - a.tokenCount);
}

/**
 * Builds distribution of post-visit feedback outcomes
 */
export function buildOutcomeDistribution(visits: any[] = []): OutcomeDistributionItem[] {
  const outcomes: Record<string, { label: string; count: number; color: string }> = {
    TOKEN_SUBMITTED: { label: 'Token Submitted', count: 0, color: '#10B981' },
    HIGH_INTEREST: { label: 'High Interest (Re-Visit)', count: 0, color: '#3B82F6' },
    PRICE_OBJECTION: { label: 'Price Objection', count: 0, color: '#F59E0B' },
    LAYOUT_OBJECTION: { label: 'Layout Objection', count: 0, color: '#EC4899' },
    NEEDS_MORE_OPTIONS: { label: 'Needs More Options', count: 0, color: '#8B5CF6' },
    PENDING_OUTCOME: { label: 'Pending Tour Outcome', count: 0, color: '#64748B' },
  };

  visits.forEach((v) => {
    const outcome = v.feedbackOutcome;
    if (outcome && outcomes[outcome]) {
      outcomes[outcome].count++;
    } else {
      outcomes.PENDING_OUTCOME.count++;
    }
  });

  const total = Math.max(1, visits.length);

  return Object.entries(outcomes).map(([outcome, item]) => ({
    outcome,
    label: item.label,
    count: item.count,
    percentage: Math.round((item.count / total) * 100),
    color: item.color,
  }));
}
