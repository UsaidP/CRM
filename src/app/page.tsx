import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { assessUnitFreshness } from '@/lib/domain/verification-engine';
import { evaluateEngagementTier } from '@/lib/domain/portal-generator';
import { 
  Building2,
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  ArrowRight, 
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  Users,
  Share2,
  Globe,
  Flame,
  Zap,
  Calculator,
  Send,
  DollarSign,
  Calendar,
  Phone,
  PhoneCall,
  MessageSquare,
  Car,
  ExternalLink,
  Check,
  ChevronRight,
  Filter,
  Download,
  CalendarDays,
  Plus,
  PlaySquare,
  TrendingDown,
  Layers,
  BarChart3,
  QrCode,
  Compass,
} from 'lucide-react';
import { YoutubeIcon, InstagramIcon } from '@/components/icons/SocialIcons';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';
import { rankFirmLeadsForNextConnect } from '@/lib/domain/prioritization-engine';
import { formatDateTime, formatDateWithWeekday } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

function formatIndianCurrency(amount: number) {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default async function DashboardPage() {
  let projectCount = 0;
  let unitCount = 0;
  let activeMarketableCount = 0;
  let staleCount = 0;
  let leadCount = 0;
  let campaignCount = 0;
  let portalCount = 0;
  let hotLeadsCount = 0;
  let dealsCount = 0;
  let totalGrossBrokerage = 0;
  let totalRealizedNet = 0;
  let units: any[] = [];
  let leads: any[] = [];
  let siteVisits: any[] = [];
  let recentDeals: any[] = [];
  let hotProspects: any[] = [];
  let topConnectNext: any = null;
  let pendingReminders: any[] = [];
  let overdueRemindersCount = 0;
  let rankedLeads: any[] = [];

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
    ] = await Promise.all([
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
    pendingReminders = rawReminders;

    // Evaluate Connect Next Recommendation
    const nonClosed = rawLeads.filter((l) => l.currentStage !== 'closed_lost' && l.currentStage !== 'closed_won');
    rankedLeads = rankFirmLeadsForNextConnect(nonClosed, new Date());
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
        hotLeadsCount++;
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

  const formatINR = (val: number) => {
    if (!val && val !== 0) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  const getChannelIcon = (source: string) => {
    const s = (source || '').toLowerCase();
    if (s.includes('youtube')) return <YoutubeIcon className="w-3.5 h-3.5 text-status-danger" />;
    if (s.includes('instagram') || s.includes('reel')) return <InstagramIcon className="w-3.5 h-3.5 text-pink-500" />;
    return <Share2 className="w-3.5 h-3.5 text-accent-text" />;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Professional System State Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 px-4 rounded-xl bg-surface-subtle border border-border shadow-md text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
            <span className="font-bold text-content uppercase tracking-wider">Ops Hub Online</span>
          </div>

          <span className="text-content-muted hidden sm:inline">•</span>

          <div className="flex items-center gap-1.5 text-content-secondary">
            <Clock className="w-3.5 h-3.5 text-accent" />
            <span>Data: <strong className="text-content">Current database snapshot</strong></span>
          </div>

          <span className="text-content-muted hidden sm:inline">•</span>

          <div className="flex items-center gap-1.5 text-content-secondary">
            <ShieldCheck className="w-3.5 h-3.5 text-status-success" />
            <span>Freshness: <strong className="text-status-success">{activeMarketableCount} current · {staleCount} stale</strong></span>
          </div>

          <span className="text-content-muted hidden sm:inline">•</span>

          <div className="flex items-center gap-1.5 text-content-secondary">
            <Globe className="w-3.5 h-3.5 text-accent" />
            <span>Portals: <strong className="text-content">{portalCount} Active Telemetry Sessions</strong></span>
          </div>
        </div>
      </div>

      {/* Primary Cockpit Header & Action Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-content font-display flex items-center gap-3">
            ZamZam Brokerage Operations Cockpit
          </h1>
          <p className="text-content-muted text-xs mt-1 font-mono">
            Kharghar &amp; Taloja Advisory • Inbound Lead Routing • Inventory Records • Commission Ledger
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2.5">
          <Link
            href="/calendar"
            className="px-3.5 py-2 rounded-lg bg-surface-raised hover:bg-surface-subtle text-content-secondary border border-border text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Calendar className="w-3.5 h-3.5 text-accent" />
            <span>Calendar &amp; Reminders</span>
            {overdueRemindersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-status-danger text-white font-bold text-[10px]">
                {overdueRemindersCount}
              </span>
            )}
          </Link>
          <Link
            href="/visits"
            className="px-3.5 py-2 rounded-lg bg-surface-raised hover:bg-surface-subtle text-content-secondary border border-border text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Car className="w-3.5 h-3.5 text-accent-text" />
            Site Tours
          </Link>
          <Link
            href="/matching"
            className="px-3.5 py-2 rounded-lg bg-surface-raised hover:bg-surface-subtle text-content-secondary border border-border text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            Matchmaker AI
          </Link>
          <Link
            href="/deals"
            className="btn-cobalt px-4 py-2 text-xs font-bold"
          >
            <DollarSign className="w-3.5 h-3.5 text-white" />
            Record Deal
          </Link>
        </div>
      </div>

      {/* 🎯 TARGET CONNECT NEXT HERO CARD */}
      {topConnectNext && (
        <div className="p-5 rounded-2xl bg-surface-subtle border-2 border-accent/60 shadow-2xl shadow-accent/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-accent text-white shadow animate-pulse">
                <Sparkles className="w-3.5 h-3.5 fill-white" />
                CONNECT NEXT (FIRM PRIORITY #1)
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-accent-soft text-accent-text border border-accent/40">
                Score: {topConnectNext.totalScore}/100 • {topConnectNext.urgencyTier} URGENCY
              </span>
              {topConnectNext.sourceCode && (
                <span className="font-mono text-xs font-bold text-accent px-2 py-0.5 rounded bg-accent-soft border border-accent/30">
                  {topConnectNext.sourceCode}
                </span>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold text-content flex items-center gap-2">
                <span>{topConnectNext.leadName}</span>
                {topConnectNext.phoneE164 && (
                  <span className="text-xs font-mono text-content-muted font-normal">
                    ({topConnectNext.phoneE164})
                  </span>
                )}
              </h3>
              <p className="text-xs font-semibold text-accent-text mt-0.5">
                {topConnectNext.primaryReason}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {topConnectNext.phoneE164 && (
              <>
                <a
                  href={`https://wa.me/${topConnectNext.phoneE164.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Hello ${topConnectNext.leadName}, following up from ZamZam Properties regarding your inquiry for ${
                      topConnectNext.sourceCode || 'Navi Mumbai luxury projects'
                    }.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-status-success hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp Client</span>
                </a>

                <a
                  href={`tel:${topConnectNext.phoneE164}`}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-bold text-xs rounded-xl shadow-lg shadow-accent/20 transition-all flex items-center gap-1.5"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call Client</span>
                </a>
              </>
            )}

            <Link
              href="/leads"
              className="px-3.5 py-2 bg-surface-raised hover:bg-surface border border-border text-content-secondary text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
            >
              <Users className="w-4 h-4 text-accent" />
              <span>Open Leads Stream</span>
            </Link>
          </div>
        </div>
      )}

      {/* KPI Row (Dense Operational Tiles with Trend Indicators & Direct Links) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Gross Brokerage Pipeline */}
        <Link
          href="/deals"
          className="p-4 rounded-xl bg-surface-subtle border border-border hover:border-accent transition-all group block shadow-md hover:shadow-lg hover:shadow-accent/5"
        >
          <div className="flex items-center justify-between text-content-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-content-secondary group-hover:text-accent-text transition-colors">
              Gross Brokerage Pipeline
            </span>
            <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-accent-text group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4 text-accent" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold font-mono text-content tracking-tight">
              {formatINR(totalGrossBrokerage)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle text-[11px] font-mono">
              <span className="text-status-success font-semibold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Recorded total
              </span>
              <span className="text-content-muted">
                {dealsCount} Active Deals
              </span>
            </div>
          </div>
        </Link>

        {/* KPI 2: High-Intent Hot Prospects */}
        <Link
          href="/portals"
          className="p-4 rounded-xl bg-surface-subtle border border-border hover:border-accent transition-all group block shadow-md hover:shadow-lg hover:shadow-accent/5"
        >
          <div className="flex items-center justify-between text-content-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent-text group-hover:text-accent transition-colors">
              High-Intent Hot Leads
            </span>
            <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
              <Flame className="w-4 h-4 text-accent" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold font-mono text-accent tracking-tight">
              {hotLeadsCount} HOT
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle text-[11px] font-mono">
              <span className="text-accent font-semibold flex items-center gap-1">
                <Zap className="w-3 h-3" /> Real-time Dwell
              </span>
              <span className="text-content-muted">
                Across {portalCount} Portals
              </span>
            </div>
          </div>
        </Link>

        {/* KPI 3: Verified Marketable Inventory */}
        <Link
          href="/inventory"
          className="p-4 rounded-xl bg-surface-subtle border border-border hover:border-accent transition-all group block shadow-md hover:shadow-lg hover:shadow-accent/5"
        >
          <div className="flex items-center justify-between text-content-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-content-secondary group-hover:text-accent-text transition-colors">
              Marketable Inventory
            </span>
            <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-accent-text group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4 text-status-success" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold font-mono text-content tracking-tight">
              {activeMarketableCount} Units
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle text-[11px] font-mono">
              <span className="text-status-success font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> RERA IDs recorded
              </span>
              <span className="text-content-muted">
                {projectCount} Projects Listed
              </span>
            </div>
          </div>
        </Link>

        {/* KPI 4: Organic Inbound Leads */}
        <Link
          href="/leads"
          className="p-4 rounded-xl bg-surface-subtle border border-border hover:border-accent transition-all group block shadow-md hover:shadow-lg hover:shadow-accent/5"
        >
          <div className="flex items-center justify-between text-content-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent-text group-hover:text-accent transition-colors">
              Organic Social Leads
            </span>
            <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4 text-accent" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold font-mono text-accent-text tracking-tight">
              {leadCount} Inbound
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle text-[11px] font-mono">
              <span className="text-accent font-semibold flex items-center gap-1">
                <Share2 className="w-3 h-3" /> 0 Paid Ads
              </span>
              <span className="text-content-muted">
                YouTube &amp; IG Direct
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* High-Density Two-Column Working Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Needs Attention & Hot Prospects (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-surface-subtle border border-border shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-accent animate-ping" />
                <h3 className="font-bold text-content text-base font-display">
                  Needs Immediate Attention (Speed-to-Lead)
                </h3>
              </div>
              <Link
                href="/leads"
                className="text-[11px] font-mono font-semibold text-accent-text hover:text-content flex items-center gap-1 transition-colors"
              >
                View All Leads ({leadCount}) <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Hot Prospects List */}
            <div className="space-y-3">
              {leads.slice(0, 4).map((lead) => {
                const req = lead.requirements?.[0];
                const bhkList = req ? JSON.parse(req.bhkPreferencesJson || '[]').join(', ') : '2';
                const budgetLakhs = req?.budgetMax ? (req.budgetMax / 100000).toFixed(1) : '75.0';

                return (
                  <div
                    key={lead.id}
                    className="p-3.5 rounded-xl bg-surface border border-border-subtle hover:border-accent/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-content text-sm">{lead.fullName || 'Prospective Buyer'}</span>
                        <span className="px-1.5 py-0.5 rounded bg-surface-subtle text-accent-text font-mono text-[10px] border border-border flex items-center gap-1">
                          {getChannelIcon(lead.leadSource)}
                          {lead.leadSource.replace('_', ' ')}
                        </span>
                        {lead.currentStage === 'new_uncontacted' && (
                          <span className="px-1.5 py-0.5 rounded bg-status-danger-surface text-status-danger font-mono text-[10px] font-bold border border-status-danger/40 animate-pulse">
                            &lt; 5m DUE
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-content-muted font-mono">
                        <span>Tel: <strong className="text-content-secondary">{lead.phoneE164}</strong></span>
                        <span>•</span>
                        <span>Looking for: <strong className="text-accent-text">{bhkList} BHK (₹{budgetLakhs}L)</strong></span>
                        <span>•</span>
                        <span>Advisor: <strong className="text-content-secondary">{lead.assignedBroker?.fullName || 'Unassigned'}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <a
                        href={`https://wa.me/${lead.phoneE164.replace(/\+/g, '')}?text=${encodeURIComponent(`Hi ${lead.fullName || 'Client'}, thank you for connecting with ZamZam Properties regarding Navi Mumbai property options. How can I assist you today?`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-status-success hover:opacity-90 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                      <Link
                        href={`/matching?leadId=${lead.id}`}
                        className="px-2.5 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-subtle text-accent-text border border-border text-xs font-semibold transition-all flex items-center gap-1"
                        title="Run AI Matchmaker for this lead"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-accent" />
                        Match
                      </Link>
                    </div>
                  </div>
                );
              })}

              {leads.length === 0 && (
                <div className="p-8 text-center text-content-muted text-xs font-mono">
                  No pending hot leads requiring attention in the last 24h.
                </div>
              )}
            </div>
          </div>

          {/* Recent Audited Deal Transactions */}
          <div className="p-5 rounded-2xl bg-surface-subtle border border-border shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-accent" />
                <h3 className="font-bold text-content text-base font-display">
                  Live Commission Ledger &amp; Closings
                </h3>
              </div>
              <Link
                href="/deals"
                className="text-[11px] font-mono font-semibold text-accent-text hover:text-content flex items-center gap-1 transition-colors"
              >
                View Full Ledger ({dealsCount}) <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface text-content-muted font-mono uppercase text-[10px] border-b border-border">
                  <tr>
                    <th className="p-2.5 pl-3">Deal / Unit</th>
                    <th className="p-2.5">Client</th>
                    <th className="p-2.5 text-right">Agreement Val</th>
                    <th className="p-2.5 text-right">Gross Brokerage</th>
                    <th className="p-2.5 pr-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle text-content-secondary font-mono">
                  {recentDeals.slice(0, 3).map((deal) => (
                    <tr key={deal.id} className="hover:bg-surface/50 transition-colors">
                      <td className="p-2.5 pl-3">
                        <div className="font-semibold text-content">{deal.developerProject?.projectName}</div>
                        <div className="text-[10px] text-content-muted">{deal.propertyUnit?.unitNumber} ({deal.propertyUnit?.bhk} BHK)</div>
                      </td>
                      <td className="p-2.5">
                        <div className="text-content-secondary">{deal.lead?.fullName}</div>
                        <div className="text-[10px] text-content-muted">{deal.closingBroker?.fullName}</div>
                      </td>
                      <td className="p-2.5 text-right font-bold text-content">
                        {formatINR(deal.agreementValue)}
                      </td>
                      <td className="p-2.5 text-right font-bold text-accent-text">
                        {formatINR(deal.grossBrokerageAmount)}
                      </td>
                      <td className="p-2.5 pr-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          deal.dealStatus === 'PAYMENT_RECEIVED'
                            ? 'bg-status-success-surface text-status-success border border-status-success/30'
                            : 'bg-status-warning-surface text-status-warning border border-status-warning/30'
                        }`}>
                          {deal.dealStatus.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {recentDeals.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-content-muted">
                        No closed deal records in the ledger yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Today's Reminders & Site Visits & Verified Inventory (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Scheduled Client Reminders */}
          <div className="p-5 rounded-2xl bg-surface-subtle border border-border shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" />
                <h3 className="font-bold text-content text-base font-display">
                  Scheduled Reminders ({pendingReminders.length})
                </h3>
              </div>
              <Link
                href="/calendar"
                className="text-[11px] font-mono font-semibold text-accent-text hover:text-content flex items-center gap-1 transition-colors"
              >
                Calendar Hub <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {pendingReminders.slice(0, 3).map((rem) => {
                const isOverdue = new Date(rem.dueAt).getTime() < Date.now();
                return (
                  <div
                    key={rem.id}
                    className={`p-3 rounded-xl bg-surface border transition-all flex items-center justify-between gap-3 text-xs ${
                      isOverdue
                        ? 'border-status-danger/40 hover:border-status-danger shadow-sm'
                        : 'border-border hover:border-accent/40'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-content truncate">{rem.lead?.fullName || 'Client'}</span>
                        {isOverdue && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-status-danger-surface text-status-danger border border-status-danger/40 animate-pulse">
                            OVERDUE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-content-secondary truncate max-w-xs">{rem.title}</p>
                      <p className="text-[10px] font-mono text-content-muted">
                        {formatDateTime(rem.dueAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {rem.lead?.phoneE164 && (
                        <a
                          href={`https://wa.me/${rem.lead.phoneE164.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Hello ${rem.lead.fullName || 'Sir/Ma\'am'}, following up from ZamZam Properties regarding ${rem.title}.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-status-success-surface hover:opacity-90 text-status-success border border-status-success/30"
                          title="1-Click WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <Link
                        href="/calendar"
                        className="p-1.5 rounded-lg bg-surface-raised hover:bg-surface-subtle text-accent border border-border text-xs font-semibold"
                        title="View in Calendar"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}

              {pendingReminders.length === 0 && (
                <div className="p-6 text-center text-content-muted text-xs font-mono">
                  No pending reminders scheduled.
                </div>
              )}
            </div>
          </div>

          {/* Today's Schedule & Site Visits */}
          <div className="p-5 rounded-2xl bg-surface-subtle border border-border shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" />
                <h3 className="font-bold text-content text-base font-display">
                  Scheduled Site Visits &amp; Tours
                </h3>
              </div>
              <Link
                href="/visits"
                className="text-[11px] font-mono font-semibold text-accent-text hover:text-content flex items-center gap-1 transition-colors"
              >
                All Tours <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {siteVisits.slice(0, 2).map((visit) => {
                const stops = JSON.parse(visit.itineraryUnitsJson || '[]');
                const dateStr = formatDateWithWeekday(visit.scheduledDate);

                return (
                  <div
                    key={visit.id}
                    className="p-3.5 rounded-xl bg-surface border border-border space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-content text-sm">{visit.lead?.fullName}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-subtle text-accent-text border border-border">
                          {visit.status}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-semibold text-accent-text">
                        {dateStr} • {visit.timeSlot}
                      </span>
                    </div>

                    <div className="text-xs text-content-secondary font-mono flex items-center gap-2">
                      <Car className="w-3.5 h-3.5 text-accent" />
                      <span className="truncate">{visit.pickupLocation}</span>
                    </div>

                    {/* Itinerary Stops */}
                    <div className="pt-2 border-t border-border-subtle space-y-1.5">
                      <div className="text-[10px] font-mono text-content-muted uppercase tracking-wider">
                        {stops.length} Project Stops:
                      </div>
                      {stops.map((s: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs font-mono bg-surface-inset p-1.5 px-2.5 rounded border border-border-subtle">
                          <span className="font-semibold text-content-secondary">
                            {idx + 1}. {s.projectName} ({s.bhk}BHK)
                          </span>
                          <span className="text-content-muted text-[10px]">{s.expectedTime}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {siteVisits.length === 0 && (
                <div className="p-8 text-center text-content-muted text-xs font-mono">
                  No site visits scheduled for today. Dispatch itineraries via the Tours module.
                </div>
              )}
            </div>
          </div>

          {/* Verified Inventory Quick Status */}
          <div className="p-5 rounded-2xl bg-surface-subtle border border-border shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-status-success" />
                <h3 className="font-bold text-content text-base font-display">
                  Inventory Record Status
                </h3>
              </div>
              <Link
                href="/inventory"
                className="text-[11px] font-mono font-semibold text-accent-text hover:text-content flex items-center gap-1 transition-colors"
              >
                Inventory ({unitCount}) <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {units.slice(0, 3).map((unit) => (
                <div
                  key={unit.id}
                  className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between gap-3 text-xs font-mono"
                >
                  <div>
                    <div className="font-bold text-content">{unit.project?.projectName}</div>
                    <div className="text-[10px] text-content-muted">
                      Unit {unit.unitNumber} • {unit.bhk} BHK ({unit.carpetAreaSqft} sqft) • {unit.project?.microMarket}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="font-bold text-accent-text">{formatINR(unit.allInTotalCost)}</div>
                    <HallmarkStamp type="rera" code={unit.project?.reraNumber} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
