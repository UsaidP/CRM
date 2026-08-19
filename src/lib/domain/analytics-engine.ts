/**
 * Phase 7: Organic Social Content ROI, Conversion Analytics & Broker Leaderboard Engine
 */

export interface ContentRoiReport {
  campaignId: string;
  campaignName: string;
  channelType: string;
  contentId: string | null;
  customSlug: string;
  totalClicks: number;
  totalLeads: number;
  totalVisits: number;
  totalDeals: number;
  attributedAgreementValue: number;
  grossBrokerageRupees: number;
  firmNetRupees: number;
  conversionRatePercent: number;
  revenuePerClick: number;
}

export interface ContentRoiSummary {
  totalAttributedGmv: number;
  totalAttributedBrokerage: number;
  youtubePipeline: number;
  instagramPipeline: number;
  youtubeSharePercent: number | null;
  instagramSharePercent: number | null;
}

export interface AgentLeaderboardEntry {
  userId: string;
  fullName: string;
  role: string;
  assignedLeads: number;
  portalsCreated: number;
  visitsConducted: number;
  dealsClosed: number;
  grossBrokerageGenerated: number;
  repIncentiveEarned: number;
  visitConversionRate: number;
  rank?: number;
}

export interface FunnelStageMetric {
  stageId: string;
  stageName: string;
  count: number;
  conversionFromPreviousPercent: number;
  dropOffRatePercent: number;
}

export interface CashFlowForecast {
  totalPipelineGross: number;
  tokenReceivedAmount: number;
  agreementRegisteredAmount: number;
  invoiceSentAmount: number;
  paymentReceivedAmount: number;
  totalRealizedFirmNet: number;
  totalPendingRepPayouts: number;
}

/**
 * Computes exact content ROI per organic social campaign (YouTube Shorts, IG Reels, FB Groups, WA Broadcasts)
 */
export function computeContentRoi(
  campaigns: any[],
  deals: any[],
  leads: any[]
): ContentRoiReport[] {
  return campaigns.map((campaign) => {
    // Find all leads originated from this campaign
    const campaignLeads = leads.filter((l) => l.campaignId === campaign.id);
    const campaignLeadIds = new Set(campaignLeads.map((l) => l.id));

    // Find all closed deals originating from these leads
    const campaignDeals = deals.filter(
      (d) => campaignLeadIds.has(d.leadId) && d.dealStatus !== 'CANCELLED'
    );

    const totalLeads = campaignLeads.length || campaign.totalLeadsGenerated || 0;
    const totalDeals = campaignDeals.length;
    const totalClicks = campaign.totalClicks || 0;

    const grossBrokerageRupees = campaignDeals.reduce(
      (acc, d) => acc + (Number(d.grossBrokerageAmount) || 0),
      0
    );

    const attributedAgreementValue = campaignDeals.reduce(
      (acc, d) => acc + (Number(d.agreementValue) || 0),
      0
    );

    const firmNetRupees = campaignDeals.reduce(
      (acc, d) => acc + (Number(d.firmNetBrokerageAmount) || 0),
      0
    );

    // Conversion rate: Deals / Leads % (or Leads / Clicks if no deals yet)
    const conversionRatePercent = totalLeads > 0
      ? Number(((totalDeals / totalLeads) * 100).toFixed(1))
      : 0;

    const revenuePerClick = totalClicks > 0
      ? Number((grossBrokerageRupees / totalClicks).toFixed(2))
      : 0;

    // Count site visits for these leads
    let totalVisits = 0;
    campaignLeads.forEach((l) => {
      if (l.siteVisits) {
        totalVisits += l.siteVisits.filter((v: any) => v.status === 'COMPLETED').length;
      }
    });

    return {
      campaignId: campaign.id,
      campaignName: campaign.campaignName,
      channelType: campaign.channelType,
      contentId: campaign.contentId || null,
      customSlug: campaign.customSlug,
      totalClicks,
      totalLeads,
      totalVisits,
      totalDeals,
      attributedAgreementValue,
      grossBrokerageRupees,
      firmNetRupees,
      conversionRatePercent,
      revenuePerClick,
    };
  }).sort((a, b) => b.grossBrokerageRupees - a.grossBrokerageRupees);
}

export function summarizeContentRoi(report: ContentRoiReport[]): ContentRoiSummary {
  const channelTotal = (channelMatchers: string[]) => report
    .filter((item) => {
      const channel = item.channelType.toUpperCase();
      return channelMatchers.some((matcher) => channel.includes(matcher));
    })
    .reduce((sum, item) => sum + item.grossBrokerageRupees, 0);

  const totalAttributedGmv = report.reduce((sum, item) => sum + item.attributedAgreementValue, 0);
  const totalAttributedBrokerage = report.reduce((sum, item) => sum + item.grossBrokerageRupees, 0);
  const youtubePipeline = channelTotal(['YOUTUBE']);
  const instagramPipeline = channelTotal(['INSTAGRAM', 'REEL']);

  return {
    totalAttributedGmv,
    totalAttributedBrokerage,
    youtubePipeline,
    instagramPipeline,
    youtubeSharePercent: totalAttributedBrokerage > 0
      ? Number(((youtubePipeline / totalAttributedBrokerage) * 100).toFixed(1))
      : null,
    instagramSharePercent: totalAttributedBrokerage > 0
      ? Number(((instagramPipeline / totalAttributedBrokerage) * 100).toFixed(1))
      : null,
  };
}

/**
 * Computes Sales Agent Performance Leaderboard with Commission Incentives
 */
export function computeAgentLeaderboard(
  users: any[],
  deals: any[],
  visits: any[],
  portals: any[],
  leads: any[]
): AgentLeaderboardEntry[] {
  const entries: AgentLeaderboardEntry[] = users.map((user) => {
    const userLeads = leads.filter((l) => l.assignedBrokerId === user.id);
    const userPortals = portals.filter((p) => p.createdById === user.id);
    const userVisits = visits.filter(
      (v) => v.assignedBrokerId === user.id && v.status === 'COMPLETED'
    );
    const userDeals = deals.filter(
      (d) => d.closingBrokerId === user.id && d.dealStatus !== 'CANCELLED'
    );

    const grossBrokerageGenerated = userDeals.reduce(
      (acc, d) => acc + (Number(d.grossBrokerageAmount) || 0),
      0
    );

    const repIncentiveEarned = userDeals.reduce(
      (acc, d) => acc + (Number(d.repCommissionAmount) || 0),
      0
    );

    const visitConversionRate = userVisits.length > 0
      ? Number(((userDeals.length / userVisits.length) * 100).toFixed(1))
      : 0;

    return {
      userId: user.id,
      fullName: user.fullName,
      role: user.role,
      assignedLeads: userLeads.length,
      portalsCreated: userPortals.length,
      visitsConducted: userVisits.length,
      dealsClosed: userDeals.length,
      grossBrokerageGenerated,
      repIncentiveEarned,
      visitConversionRate,
    };
  });

  // Sort by gross brokerage generated descending and assign ranks
  entries.sort((a, b) => b.grossBrokerageGenerated - a.grossBrokerageGenerated);
  entries.forEach((e, idx) => {
    e.rank = idx + 1;
  });

  return entries;
}

/**
 * Computes Conversion Funnel across all customer lifecycle steps
 */
export function computeFunnelMetrics(
  leads: any[],
  portals: any[],
  visits: any[],
  deals: any[]
): FunnelStageMetric[] {
  const totalLeads = leads.length;
  const openedPortals = portals.filter((p) => (p.totalViews || 0) > 0).length;
  const completedVisits = visits.filter((v) => v.status === 'COMPLETED').length;
  const tokenSubmittedVisits = visits.filter(
    (v) => v.feedbackOutcome === 'TOKEN_SUBMITTED' || v.status === 'COMPLETED'
  ).length;
  const closedDeals = deals.filter((d) => d.dealStatus !== 'CANCELLED').length;

  const rawStages = [
    { stageId: 'inbound_leads', stageName: '1. Inbound Leads Captured', count: totalLeads },
    { stageId: 'portals_opened', stageName: '2. Client Portals Engaged', count: openedPortals },
    { stageId: 'visits_conducted', stageName: '3. Physical Site Visits Done', count: completedVisits },
    { stageId: 'tokens_submitted', stageName: '4. Booking Tokens Issued', count: Math.max(tokenSubmittedVisits, closedDeals) },
    { stageId: 'deals_won', stageName: '5. Brokerage Realized (Won)', count: closedDeals },
  ];

  return rawStages.map((stage, idx) => {
    let conversionFromPreviousPercent = 100;
    let dropOffRatePercent = 0;

    if (idx > 0) {
      const prevCount = rawStages[idx - 1].count;
      if (prevCount > 0) {
        conversionFromPreviousPercent = Number(((stage.count / prevCount) * 100).toFixed(1));
        dropOffRatePercent = Number((100 - conversionFromPreviousPercent).toFixed(1));
      } else {
        conversionFromPreviousPercent = 0;
        dropOffRatePercent = 100;
      }
    }

    return {
      ...stage,
      conversionFromPreviousPercent,
      dropOffRatePercent,
    };
  });
}

/**
 * Computes Cash Flow & Receivables Forecast across deal milestones
 */
export function computeCashFlowForecast(deals: any[]): CashFlowForecast {
  let totalPipelineGross = 0;
  let tokenReceivedAmount = 0;
  let agreementRegisteredAmount = 0;
  let invoiceSentAmount = 0;
  let paymentReceivedAmount = 0;
  let totalRealizedFirmNet = 0;
  let totalPendingRepPayouts = 0;

  deals.forEach((deal) => {
    if (deal.dealStatus === 'CANCELLED') return;

    const gross = Number(deal.grossBrokerageAmount) || 0;
    const firmNet = Number(deal.firmNetBrokerageAmount) || 0;
    const repSplit = Number(deal.repCommissionAmount) || 0;

    totalPipelineGross += gross;

    switch (deal.dealStatus) {
      case 'TOKEN_RECEIVED':
        tokenReceivedAmount += gross;
        break;
      case 'AGREEMENT_REGISTERED':
        agreementRegisteredAmount += gross;
        break;
      case 'INVOICE_SENT':
        invoiceSentAmount += gross;
        break;
      case 'PAYMENT_RECEIVED':
        paymentReceivedAmount += gross;
        totalRealizedFirmNet += firmNet;
        break;
    }

    if (deal.dealStatus !== 'PAYMENT_RECEIVED') {
      totalPendingRepPayouts += repSplit;
    }
  });

  return {
    totalPipelineGross,
    tokenReceivedAmount,
    agreementRegisteredAmount,
    invoiceSentAmount,
    paymentReceivedAmount,
    totalRealizedFirmNet,
    totalPendingRepPayouts,
  };
}
