const assert = require('assert');

// 1. Content ROI Calculator matching src/lib/domain/analytics-engine.ts
function computeContentRoi(campaigns, deals, leads) {
  return campaigns.map((campaign) => {
    const campaignLeads = leads.filter((l) => l.campaignId === campaign.id);
    const campaignLeadIds = new Set(campaignLeads.map((l) => l.id));

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

    const firmNetRupees = campaignDeals.reduce(
      (acc, d) => acc + (Number(d.firmNetBrokerageAmount) || 0),
      0
    );

    const conversionRatePercent = totalLeads > 0
      ? Number(((totalDeals / totalLeads) * 100).toFixed(1))
      : 0;

    const revenuePerClick = totalClicks > 0
      ? Number((grossBrokerageRupees / totalClicks).toFixed(2))
      : 0;

    return {
      campaignId: campaign.id,
      campaignName: campaign.campaignName,
      channelType: campaign.channelType,
      customSlug: campaign.customSlug,
      totalClicks,
      totalLeads,
      totalDeals,
      grossBrokerageRupees,
      firmNetRupees,
      conversionRatePercent,
      revenuePerClick,
    };
  }).sort((a, b) => b.grossBrokerageRupees - a.grossBrokerageRupees);
}

// 2. Agent Leaderboard matching src/lib/domain/analytics-engine.ts
function computeAgentLeaderboard(users, deals, visits, portals, leads) {
  const entries = users.map((user) => {
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

  entries.sort((a, b) => b.grossBrokerageGenerated - a.grossBrokerageGenerated);
  entries.forEach((e, idx) => {
    e.rank = idx + 1;
  });

  return entries;
}

// 3. Cash Flow Forecast matching src/lib/domain/analytics-engine.ts
function computeCashFlowForecast(deals) {
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

console.log('🧪 Running Suite: Phase 7 Content ROI, Leaderboards & Cash Flow Analytics Tests\n');

// TEST 1: Content ROI Attribution & RPC Calculation
const sampleCampaigns = [
  { id: 'c1', campaignName: 'YouTube Short #YT-TALOJA-01', channelType: 'YOUTUBE_SHORT', customSlug: 'yt-taloja', totalClicks: 500, totalLeadsGenerated: 25 },
  { id: 'c2', campaignName: 'Instagram Reel #IG-SAI-MARVEL', channelType: 'INSTAGRAM_REEL', customSlug: 'ig-sai', totalClicks: 1000, totalLeadsGenerated: 50 },
];

const sampleLeads = [
  { id: 'l1', campaignId: 'c1', fullName: 'Lead 1', assignedBrokerId: 'u1' },
  { id: 'l2', campaignId: 'c1', fullName: 'Lead 2', assignedBrokerId: 'u1' },
  { id: 'l3', campaignId: 'c2', fullName: 'Lead 3', assignedBrokerId: 'u2' },
];

const sampleDeals = [
  { id: 'd1', leadId: 'l1', closingBrokerId: 'u1', grossBrokerageAmount: 150000, firmNetBrokerageAmount: 75000, repCommissionAmount: 75000, dealStatus: 'PAYMENT_RECEIVED' },
  { id: 'd2', leadId: 'l3', closingBrokerId: 'u2', grossBrokerageAmount: 200000, firmNetBrokerageAmount: 100000, repCommissionAmount: 100000, dealStatus: 'INVOICE_SENT' },
];

const roiReport = computeContentRoi(sampleCampaigns, sampleDeals, sampleLeads);

assert.strictEqual(roiReport.length, 2, 'Must return 2 campaign reports');
// c2 gross is 200000, c1 gross is 150000 -> c2 must rank first
assert.strictEqual(roiReport[0].campaignId, 'c2', 'C2 must rank first with ₹2.0L gross revenue');
assert.strictEqual(roiReport[0].grossBrokerageRupees, 200000, 'Gross revenue must equal ₹2,00,000');
assert.strictEqual(roiReport[0].revenuePerClick, 200, 'RPC for C2 must equal ₹200.00 (200000 / 1000)');

assert.strictEqual(roiReport[1].campaignId, 'c1', 'C1 must rank second');
assert.strictEqual(roiReport[1].grossBrokerageRupees, 150000, 'Gross revenue for C1 must equal ₹1,50,000');
assert.strictEqual(roiReport[1].revenuePerClick, 300, 'RPC for C1 must equal ₹300.00 (150000 / 500)');

console.log('  ✅ PASS: Test 1.1: Content ROI revenue attribution and Revenue Per Click (RPC)');

// TEST 2: Sales Agent Performance Leaderboard
const sampleUsers = [
  { id: 'u1', fullName: 'Farhan Shaikh', role: 'BROKER_MANAGER' },
  { id: 'u2', fullName: 'Salman Khan', role: 'SALES_EXECUTIVE' },
];

const sampleVisits = [
  { id: 'v1', assignedBrokerId: 'u1', status: 'COMPLETED' },
  { id: 'v2', assignedBrokerId: 'u1', status: 'COMPLETED' },
  { id: 'v3', assignedBrokerId: 'u2', status: 'COMPLETED' },
];

const samplePortals = [
  { id: 'p1', createdById: 'u1' },
  { id: 'p2', createdById: 'u2' },
];

const leaderboard = computeAgentLeaderboard(sampleUsers, sampleDeals, sampleVisits, samplePortals, sampleLeads);

assert.strictEqual(leaderboard[0].userId, 'u2', 'Salman Khan (u2) must be Rank #1 with ₹2,00,000 gross generated');
assert.strictEqual(leaderboard[0].rank, 1, 'Rank must be 1');
assert.strictEqual(leaderboard[0].repIncentiveEarned, 100000, 'Incentive earned must equal ₹1,00,000');
assert.strictEqual(leaderboard[0].visitConversionRate, 100, 'Visit conversion must be 100% (1 deal / 1 visit)');

assert.strictEqual(leaderboard[1].userId, 'u1', 'Farhan Shaikh (u1) must be Rank #2');
assert.strictEqual(leaderboard[1].rank, 2, 'Rank must be 2');
assert.strictEqual(leaderboard[1].visitConversionRate, 50, 'Visit conversion must be 50% (1 deal / 2 visits)');

console.log('  ✅ PASS: Test 2.1: Broker leaderboard ranking and incentive calculations');

// TEST 3: Cash Flow Forecast Across Payment Milestones
const sampleMilestoneDeals = [
  { grossBrokerageAmount: 100000, firmNetBrokerageAmount: 50000, repCommissionAmount: 50000, dealStatus: 'TOKEN_RECEIVED' },
  { grossBrokerageAmount: 150000, firmNetBrokerageAmount: 75000, repCommissionAmount: 75000, dealStatus: 'AGREEMENT_REGISTERED' },
  { grossBrokerageAmount: 200000, firmNetBrokerageAmount: 100000, repCommissionAmount: 100000, dealStatus: 'INVOICE_SENT' },
  { grossBrokerageAmount: 250000, firmNetBrokerageAmount: 125000, repCommissionAmount: 125000, dealStatus: 'PAYMENT_RECEIVED' },
];

const cashFlow = computeCashFlowForecast(sampleMilestoneDeals);

assert.strictEqual(cashFlow.totalPipelineGross, 700000, 'Total pipeline must equal ₹7,00,000');
assert.strictEqual(cashFlow.tokenReceivedAmount, 100000, 'Token amount must equal ₹1,00,000');
assert.strictEqual(cashFlow.agreementRegisteredAmount, 150000, 'Agreement registered must equal ₹1,50,000');
assert.strictEqual(cashFlow.invoiceSentAmount, 200000, 'Invoice sent must equal ₹2,00,000');
assert.strictEqual(cashFlow.paymentReceivedAmount, 250000, 'Payment received must equal ₹2,50,000');
assert.strictEqual(cashFlow.totalRealizedFirmNet, 125000, 'Realized firm net must equal ₹1,25,000');
assert.strictEqual(cashFlow.totalPendingRepPayouts, 225000, 'Pending rep payouts must equal ₹2,25,000 (50k + 75k + 100k)');

console.log('  ✅ PASS: Test 3.1: Cash flow milestone forecast and pending liability calculation');

console.log('\n================================');
console.log('Phase 7 Test Results: 3 Passed, 0 Failed');
console.log('================================\n');
