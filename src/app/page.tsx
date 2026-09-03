import { prisma } from '@/lib/db/prisma';
import { withDbRetry } from '@/lib/db/db-retry';
import { assessUnitFreshness } from '@/lib/domain/verification-engine';
import { evaluateEngagementTier } from '@/lib/domain/portal-generator';
import { rankFirmLeadsForNextConnect } from '@/lib/domain/prioritization-engine';
import { DashboardCockpitClient } from '@/components/dashboard/DashboardCockpitClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let projectCount = 0;
  let unitCount = 0;
  let activeMarketableCount = 0;
  let staleCount = 0;
  let leadCount = 0;
  let campaignCount = 0;
  let portalCount = 0;
  let dealsCount = 0;
  let totalGrossBrokerage = 0;
  let totalRealizedNet = 0;
  let units: any[] = [];
  let leads: any[] = [];
  let siteVisits: any[] = [];
  let recentDeals: any[] = [];
  let hotProspects: any[] = [];
  let topConnectNext: any = null;
  let overdueRemindersCount = 0;

  try {
    const [
      pCount,
      uCount,
      lCount,
      cCount,
      portCount,
      dCount,
      rawDeals,
      rawUnits,
      rawLeads,
      rawPortals,
      rawVisits,
      rawReminders
    ] = await withDbRetry(async () => {
      return Promise.all([
        prisma.developerProject.count(),
        prisma.propertyUnit.count(),
        prisma.lead.count(),
        prisma.inboundCampaign.count(),
        prisma.clientPortal.count(),
        prisma.dealTransaction.count(),
        prisma.dealTransaction.findMany({
          include: {
            lead: true,
            propertyUnit: { include: { project: true } },
            closingBroker: true,
          },
          orderBy: { bookingDate: 'desc' },
        }),
        prisma.propertyUnit.findMany({
          include: { project: true, verifiedBy: true },
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.lead.findMany({
          include: {
            campaign: true,
            assignedBroker: true,
            requirements: true,
            portals: { include: { telemetryLogs: true } },
            reminders: {
              where: { status: { in: ['PENDING', 'SNOOZED'] } },
              orderBy: { dueAt: 'asc' },
            },
            communications: {
              orderBy: { createdAt: 'desc' },
              take: 3,
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.clientPortal.findMany({
          include: { lead: true, telemetryLogs: true, portalUnits: { include: { propertyUnit: { include: { project: true } } } } },
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.siteVisit.findMany({
          include: { lead: true, assignedBroker: true },
          orderBy: { scheduledDate: 'asc' },
        }),
        prisma.leadReminder.findMany({
          where: { status: { in: ['PENDING', 'SNOOZED'] } },
          include: {
            lead: true,
          },
          orderBy: { dueAt: 'asc' },
        }),
      ]);
    });

    projectCount = pCount;
    unitCount = uCount;
    leadCount = lCount;
    campaignCount = cCount;
    portalCount = portCount;
    dealsCount = dCount;
    units = rawUnits;
    leads = rawLeads;
    recentDeals = rawDeals;
    siteVisits = rawVisits;

    // Evaluate Connect Next Recommendation
    const nonClosed = rawLeads.filter((l) => l.currentStage !== 'closed_lost' && l.currentStage !== 'closed_won');
    const rankedLeads = rankFirmLeadsForNextConnect(nonClosed, new Date());
    if (rankedLeads.length > 0) {
      topConnectNext = rankedLeads[0];
    }

    overdueRemindersCount = rawReminders.filter((r) => new Date(r.dueAt).getTime() < Date.now()).length;

    totalGrossBrokerage = rawDeals.reduce((acc, d) => acc + (d.grossBrokerageAmount || 0), 0);
    totalRealizedNet = rawDeals
      .filter((d) => d.dealStatus === 'PAYMENT_RECEIVED')
      .reduce((acc, d) => acc + (d.firmNetBrokerageAmount || 0), 0);

    rawUnits.forEach((u) => {
      const f = assessUnitFreshness(u.verificationStatus, u.lastVerifiedAt);
      if (f.effectiveMarketableStatus === 'ACTIVE_MARKETABLE') {
        activeMarketableCount++;
      } else if (f.effectiveMarketableStatus === 'STALE_EXPIRED') {
        staleCount++;
      }
    });

    // Evaluate hot prospects from portals & telemetry
    rawPortals.forEach((p) => {
      const eng = evaluateEngagementTier(p.telemetryLogs);
      if (eng.engagementTier === 'HOT_PROSPECT' || eng.engagementTier === 'WARM_INTEREST') {
        hotProspects.push({
          portal: p,
          lead: p.lead,
          engagement: eng,
        });
      }
    });
  } catch (err) {
    console.error('Prisma connection error on dashboard:', err);
  }

  return (
    <DashboardCockpitClient
      initialData={{
        projectCount,
        unitCount,
        activeMarketableCount,
        staleCount,
        leadCount,
        campaignCount,
        portalCount,
        dealsCount,
        totalGrossBrokerage,
        totalRealizedNet,
        overdueRemindersCount,
        topConnectNext,
        recentDeals,
        hotProspects,
        units,
        leads,
        siteVisits,
      }}
    />
  );
}
