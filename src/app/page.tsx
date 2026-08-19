import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { assessUnitFreshness } from '@/lib/domain/verification-engine';
import { evaluateEngagementTier } from '@/lib/domain/portal-generator';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';
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
  MessageSquare,
  Car,
  ExternalLink,
  Check,
  ChevronRight,
  Filter
} from 'lucide-react';
import { YoutubeIcon, InstagramIcon } from '@/components/icons/SocialIcons';

export const dynamic = 'force-dynamic';

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
      rawVisits
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
        include: { campaign: true, assignedBroker: true, requirements: true, portals: { include: { telemetryLogs: true } } },
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
    if (s.includes('youtube')) return <YoutubeIcon className="w-3.5 h-3.5 text-red-500" />;
    if (s.includes('instagram') || s.includes('reel')) return <InstagramIcon className="w-3.5 h-3.5 text-pink-500" />;
    return <Share2 className="w-3.5 h-3.5 text-[#ccb67b]" />;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Professional System State Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 px-4 rounded-xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-md text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white uppercase tracking-wider">Ops Hub Online</span>
          </div>

          <span className="text-slate-600 hidden sm:inline">•</span>

          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-[#ccb67b]" />
            <span>Data: <strong className="text-white">Current database snapshot</strong></span>
          </div>

          <span className="text-slate-600 hidden sm:inline">•</span>

          <div className="flex items-center gap-1.5 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Freshness: <strong className="text-emerald-400">{activeMarketableCount} current · {staleCount} stale</strong></span>
          </div>

          <span className="text-slate-600 hidden sm:inline">•</span>

          <div className="flex items-center gap-1.5 text-slate-300">
            <Globe className="w-3.5 h-3.5 text-[#ccb67b]" />
            <span>Portals: <strong className="text-white">{portalCount} Active Telemetry Sessions</strong></span>
          </div>
        </div>

      </div>

      {/* Primary Cockpit Header & Action Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#b59658]/20">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-display flex items-center gap-3">
            ZamZam Brokerage Operations Cockpit
          </h1>
          <p className="text-slate-400 text-xs mt-1 font-mono">
            Kharghar &amp; Taloja Advisory • Inbound Lead Routing • Inventory Records • Commission Ledger
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2.5">
          <Link
            href="/visits"
            className="px-3.5 py-2 rounded-lg bg-[#1b202c] hover:bg-[#2a3040] text-slate-200 border border-[#b59658]/30 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Calendar className="w-3.5 h-3.5 text-[#ccb67b]" />
            Today&apos;s Tours
          </Link>
          <Link
            href="/matching"
            className="px-3.5 py-2 rounded-lg bg-[#1b202c] hover:bg-[#2a3040] text-slate-200 border border-[#b59658]/30 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#b59658]" />
            Matchmaker AI
          </Link>
          <Link
            href="/deals"
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] hover:opacity-95 text-[#12151f] text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-[#b59658]/20 border border-[#ccb67b]/60"
          >
            <DollarSign className="w-3.5 h-3.5 text-[#12151f]" />
            Record Deal
          </Link>
        </div>
      </div>

      {/* KPI Row (Dense Operational Tiles with Trend Indicators & Direct Links) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Gross Brokerage Pipeline */}
        <Link
          href="/deals"
          className="p-4 rounded-xl bg-[#1b202c]/90 border border-[#b59658]/30 hover:border-[#b59658] transition-all group block shadow-md hover:shadow-lg hover:shadow-[#b59658]/5"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 group-hover:text-[#ccb67b] transition-colors">
              Gross Brokerage Pipeline
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#12151f] border border-[#b59658]/30 flex items-center justify-center text-[#ccb67b] group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4 text-[#ccb67b]" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold font-mono text-white tracking-tight">
              {formatINR(totalGrossBrokerage)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#b59658]/10 text-[11px] font-mono">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Recorded total
              </span>
              <span className="text-slate-400">
                {dealsCount} Active Deals
              </span>
            </div>
          </div>
        </Link>

        {/* KPI 2: High-Intent Hot Prospects */}
        <Link
          href="/portals"
          className="p-4 rounded-xl bg-[#1b202c]/90 border border-amber-500/30 hover:border-amber-500 transition-all group block shadow-md hover:shadow-lg hover:shadow-amber-500/5"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300 group-hover:text-amber-200 transition-colors">
              High-Intent Hot Leads
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#12151f] border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold font-mono text-amber-300 tracking-tight">
              {hotLeadsCount} HOT
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-500/10 text-[11px] font-mono">
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <Zap className="w-3 h-3" /> Real-time Dwell
              </span>
              <span className="text-slate-400">
                Across {portalCount} Portals
              </span>
            </div>
          </div>
        </Link>

        {/* KPI 3: Verified Marketable Inventory */}
        <Link
          href="/inventory"
          className="p-4 rounded-xl bg-[#1b202c]/90 border border-[#b59658]/30 hover:border-[#b59658] transition-all group block shadow-md hover:shadow-lg hover:shadow-[#b59658]/5"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 group-hover:text-[#ccb67b] transition-colors">
              Marketable Inventory
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#12151f] border border-[#b59658]/30 flex items-center justify-center text-[#ccb67b] group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold font-mono text-white tracking-tight">
              {activeMarketableCount} Units
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#b59658]/10 text-[11px] font-mono">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> RERA IDs recorded
              </span>
              <span className="text-slate-400">
                {projectCount} Projects Listed
              </span>
            </div>
          </div>
        </Link>

        {/* KPI 4: Organic Inbound Leads */}
        <Link
          href="/leads"
          className="p-4 rounded-xl bg-[#1b202c]/90 border border-blue-500/30 hover:border-blue-500 transition-all group block shadow-md hover:shadow-lg hover:shadow-blue-500/5"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-300 group-hover:text-blue-200 transition-colors">
              Organic Social Leads
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#12151f] border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold font-mono text-blue-300 tracking-tight">
              {leadCount} Inbound
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-500/10 text-[11px] font-mono">
              <span className="text-blue-400 font-semibold flex items-center gap-1">
                <Share2 className="w-3 h-3" /> 0 Paid Ads
              </span>
              <span className="text-slate-400">
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
          <div className="p-5 rounded-2xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#b59658]/20">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <h3 className="font-bold text-white text-base font-display">
                  Needs Immediate Attention (Speed-to-Lead)
                </h3>
              </div>
              <Link
                href="/leads"
                className="text-[11px] font-mono font-semibold text-[#ccb67b] hover:text-white flex items-center gap-1 transition-colors"
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
                    className="p-3.5 rounded-xl bg-[#12151f]/90 border border-[#b59658]/20 hover:border-[#b59658]/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{lead.fullName || 'Prospective Buyer'}</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#1b202c] text-[#ccb67b] font-mono text-[10px] border border-[#b59658]/30 flex items-center gap-1">
                          {getChannelIcon(lead.leadSource)}
                          {lead.leadSource.replace('_', ' ')}
                        </span>
                        {lead.currentStage === 'new_uncontacted' && (
                          <span className="px-1.5 py-0.5 rounded bg-red-950/60 text-red-400 font-mono text-[10px] font-bold border border-red-500/40 animate-pulse">
                            &lt; 5m DUE
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                        <span>Tel: <strong className="text-slate-200">{lead.phoneE164}</strong></span>
                        <span>•</span>
                        <span>Looking for: <strong className="text-amber-300">{bhkList} BHK (₹{budgetLakhs}L)</strong></span>
                        <span>•</span>
                        <span>Advisor: <strong className="text-slate-300">{lead.assignedBroker?.fullName || 'Unassigned'}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <a
                        href={`https://wa.me/${lead.phoneE164.replace(/\+/g, '')}?text=${encodeURIComponent(`Hi ${lead.fullName || 'Client'}, thank you for connecting with ZamZam Properties regarding Navi Mumbai property options. How can I assist you today?`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/30"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                      <Link
                        href={`/matching?leadId=${lead.id}`}
                        className="px-2.5 py-1.5 rounded-lg bg-[#1b202c] hover:bg-[#2a3040] text-[#ccb67b] border border-[#b59658]/30 text-xs font-semibold transition-all flex items-center gap-1"
                        title="Run AI Matchmaker for this lead"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#b59658]" />
                        Match
                      </Link>
                    </div>
                  </div>
                );
              })}

              {leads.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs font-mono">
                  No pending hot leads requiring attention in the last 24h.
                </div>
              )}
            </div>
          </div>

          {/* Recent Audited Deal Transactions */}
          <div className="p-5 rounded-2xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#b59658]/20">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#ccb67b]" />
                <h3 className="font-bold text-white text-base font-display">
                  Live Commission Ledger &amp; Closings
                </h3>
              </div>
              <Link
                href="/deals"
                className="text-[11px] font-mono font-semibold text-[#ccb67b] hover:text-white flex items-center gap-1 transition-colors"
              >
                View Full Ledger ({dealsCount}) <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#12151f]/80 text-slate-400 font-mono uppercase text-[10px] border-b border-[#b59658]/20">
                  <tr>
                    <th className="p-2.5 pl-3">Deal / Unit</th>
                    <th className="p-2.5">Client</th>
                    <th className="p-2.5 text-right">Agreement Val</th>
                    <th className="p-2.5 text-right">Gross Brokerage</th>
                    <th className="p-2.5 pr-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#b59658]/10 text-slate-300 font-mono">
                  {recentDeals.slice(0, 3).map((deal) => (
                    <tr key={deal.id} className="hover:bg-[#12151f]/50 transition-colors">
                      <td className="p-2.5 pl-3">
                        <div className="font-semibold text-white">{deal.developerProject?.projectName}</div>
                        <div className="text-[10px] text-slate-400">{deal.propertyUnit?.unitNumber} ({deal.propertyUnit?.bhk} BHK)</div>
                      </td>
                      <td className="p-2.5">
                        <div className="text-slate-200">{deal.lead?.fullName}</div>
                        <div className="text-[10px] text-slate-400">{deal.closingBroker?.fullName}</div>
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-200">
                        {formatINR(deal.agreementValue)}
                      </td>
                      <td className="p-2.5 text-right font-bold text-[#ccb67b]">
                        {formatINR(deal.grossBrokerageAmount)}
                      </td>
                      <td className="p-2.5 pr-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          deal.dealStatus === 'PAYMENT_RECEIVED'
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                        }`}>
                          {deal.dealStatus.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {recentDeals.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        No closed deal records in the ledger yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Today's Site Visits & Verified Inventory (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Today's Schedule & Site Visits */}
          <div className="p-5 rounded-2xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#b59658]/20">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-base font-display">
                  Scheduled Site Visits &amp; Tours
                </h3>
              </div>
              <Link
                href="/visits"
                className="text-[11px] font-mono font-semibold text-[#ccb67b] hover:text-white flex items-center gap-1 transition-colors"
              >
                All Tours <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {siteVisits.slice(0, 2).map((visit) => {
                const stops = JSON.parse(visit.itineraryUnitsJson || '[]');
                const dateStr = new Date(visit.scheduledDate).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                });

                return (
                  <div
                    key={visit.id}
                    className="p-3.5 rounded-xl bg-[#12151f]/90 border border-[#b59658]/20 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{visit.lead?.fullName}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1b202c] text-amber-300 border border-amber-500/30">
                          {visit.status}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-semibold text-[#ccb67b]">
                        {dateStr} • {visit.timeSlot}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 font-mono flex items-center gap-2">
                      <Car className="w-3.5 h-3.5 text-[#ccb67b]" />
                      <span className="truncate">{visit.pickupLocation}</span>
                    </div>

                    {/* Itinerary Stops */}
                    <div className="pt-2 border-t border-[#b59658]/10 space-y-1.5">
                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                        {stops.length} Project Stops:
                      </div>
                      {stops.map((s: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs font-mono bg-[#1b202c]/50 p-1.5 px-2.5 rounded">
                          <span className="font-semibold text-slate-200">
                            {idx + 1}. {s.projectName} ({s.bhk}BHK)
                          </span>
                          <span className="text-slate-400 text-[10px]">{s.expectedTime}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {siteVisits.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs font-mono">
                  No site visits scheduled for today. Dispatch itineraries via the Tours module.
                </div>
              )}
            </div>
          </div>

          {/* Verified Inventory Quick Status */}
          <div className="p-5 rounded-2xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#b59658]/20">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-base font-display">
                  Inventory Record Status
                </h3>
              </div>
              <Link
                href="/inventory"
                className="text-[11px] font-mono font-semibold text-[#ccb67b] hover:text-white flex items-center gap-1 transition-colors"
              >
                Inventory ({unitCount}) <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {units.slice(0, 3).map((unit) => (
                <div
                  key={unit.id}
                  className="p-3 rounded-xl bg-[#12151f]/90 border border-[#b59658]/20 flex items-center justify-between gap-3 text-xs font-mono"
                >
                  <div>
                    <div className="font-bold text-white">{unit.project?.projectName}</div>
                    <div className="text-[10px] text-slate-400">
                      Unit {unit.unitNumber} • {unit.bhk} BHK ({unit.carpetAreaSqft} sqft) • {unit.project?.microMarket}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="font-bold text-[#ccb67b]">{formatINR(unit.allInTotalCost)}</div>
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
