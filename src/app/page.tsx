import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { assessUnitFreshness } from '@/lib/domain/verification-engine';
import { evaluateEngagementTier } from '@/lib/domain/portal-generator';
import { 
  Building, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  ArrowRight, 
  CheckCircle,
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
  Calendar
} from 'lucide-react';

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
  let units: any[] = [];
  let recentLeads: any[] = [];
  let recentPortals: any[] = [];

  try {
    const [pCount, uCount, lCount, cCount, portCount, dCount, rawDeals, rawUnits, rawLeads, rawPortals] = await Promise.all([
      prisma.developerProject.count(),
      prisma.propertyUnit.count(),
      prisma.lead.count(),
      prisma.inboundCampaign.count(),
      prisma.clientPortal.count(),
      prisma.dealTransaction.count(),
      prisma.dealTransaction.findMany({ select: { grossBrokerageAmount: true } }),
      prisma.propertyUnit.findMany({
        include: { project: true },
        orderBy: { createdAt: 'desc' },
        take: 4,
      }),
      prisma.lead.findMany({
        include: { campaign: true },
        orderBy: { createdAt: 'desc' },
        take: 4,
      }),
      prisma.clientPortal.findMany({
        include: { lead: true, telemetryLogs: true },
        orderBy: { createdAt: 'desc' },
        take: 4,
      }),
    ]);

    projectCount = pCount;
    unitCount = uCount;
    leadCount = lCount;
    campaignCount = cCount;
    portalCount = portCount;
    dealsCount = dCount;
    totalGrossBrokerage = rawDeals.reduce((acc, d) => acc + (d.grossBrokerageAmount || 0), 0);
    units = rawUnits;
    recentLeads = rawLeads;

    rawUnits.forEach((u) => {
      const f = assessUnitFreshness(u.verificationStatus, u.lastVerifiedAt);
      if (f.effectiveMarketableStatus === 'ACTIVE_MARKETABLE') {
        activeMarketableCount++;
      } else if (f.effectiveMarketableStatus === 'STALE_EXPIRED') {
        staleCount++;
      }
    });

    recentPortals = rawPortals.map((p) => {
      const eng = evaluateEngagementTier(p.telemetryLogs);
      if (eng.engagementTier === 'HOT_PROSPECT') hotLeadsCount++;
      return { ...p, engagement: eng };
    });
  } catch (err) {
    console.error('Prisma connection during build:', err);
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#b59658]/20">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1b202c] border border-[#b59658]/40 text-[#ccb67b] text-xs font-semibold mb-3 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#b59658] animate-pulse" />
            Hallmark Gold Engine Active • All 5 Phases Live
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-display">
            ZamZam Properties Operations Hub
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Navi Mumbai Social-First Brokerage • Organic Attribution • RERA Anti-Staleness • Deal Ledger
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/visits"
            className="px-4 py-2.5 rounded-xl bg-[#1b202c] hover:bg-[#2a3040] text-[#ccb67b] border border-[#b59658]/40 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <Calendar className="w-4 h-4 text-[#b59658]" />
            Site Visit Tours
          </Link>
          <Link
            href="/deals"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] hover:opacity-95 text-[#12151f] text-xs font-extrabold transition-all flex items-center gap-2 shadow-lg shadow-[#b59658]/20 border border-[#ccb67b]/60"
          >
            <DollarSign className="w-4 h-4 text-[#12151f]" />
            Revenue Ledger
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Gross Brokerage */}
        <div className="glass-panel p-5 rounded-3xl border border-[#b59658]/30 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#ccb67b]">Gross Brokerage</span>
            <span className="p-2 rounded-xl bg-[#1b202c] border border-[#b59658]/30">
              <DollarSign className="w-4 h-4 text-[#ccb67b]" />
            </span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white font-display">
              ₹{(totalGrossBrokerage / 100000).toFixed(2)}L
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#ccb67b] mt-1 font-mono">
              <CheckCircle className="w-3.5 h-3.5 text-[#b59658]" />
              <span>{dealsCount} Closed Transactions</span>
            </div>
          </div>
        </div>

        {/* Card 2: Hot Telemetry Leads */}
        <div className="glass-panel p-5 rounded-3xl border border-amber-900/40 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Hot Telemetry Leads</span>
            <span className="p-2 rounded-xl bg-[#1b202c] border border-amber-800/40">
              <Flame className="w-4 h-4 text-amber-400" />
            </span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-amber-400 font-display">
              {hotLeadsCount} HOT
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-300/80 mt-1 font-mono">
              <Globe className="w-3.5 h-3.5" />
              <span>Across {portalCount} Shared Portals</span>
            </div>
          </div>
        </div>

        {/* Card 3: Verified Inventory */}
        <div className="glass-panel p-5 rounded-3xl border border-[#b59658]/30 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#ccb67b]">Verified Inventory</span>
            <span className="p-2 rounded-xl bg-[#1b202c] border border-[#b59658]/30">
              <ShieldCheck className="w-4 h-4 text-[#ccb67b]" />
            </span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white font-display">
              {activeMarketableCount} Units
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#ccb67b] mt-1 font-mono">
              <CheckCircle className="w-3.5 h-3.5 text-[#b59658]" />
              <span>MahaRERA &amp; &lt;14d Audited</span>
            </div>
          </div>
        </div>

        {/* Card 4: Total Inquiries */}
        <div className="glass-panel p-5 rounded-3xl border border-blue-900/40 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Organic Inquiries</span>
            <span className="p-2 rounded-xl bg-[#1b202c] border border-blue-800/40">
              <Users className="w-4 h-4 text-blue-400" />
            </span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white font-display">
              {leadCount} Leads
            </div>
            <div className="flex items-center gap-1.5 text-xs text-blue-300/80 mt-1 font-mono">
              <Share2 className="w-3.5 h-3.5" />
              <span>YouTube Shorts &amp; Reels</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rule-gold" />

      {/* Operations Quick-Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Module 1: Property Matchmaker */}
        <Link
          href="/matching"
          className="glass-panel p-6 rounded-3xl border border-[#b59658]/20 hover:border-[#b59658]/60 transition-all group space-y-3 block"
        >
          <div className="w-10 h-10 rounded-2xl bg-[#1b202c] border border-[#b59658]/40 flex items-center justify-center text-[#ccb67b] group-hover:scale-110 transition-transform">
            <Sparkles className="w-5 h-5 text-[#b59658]" />
          </div>
          <h3 className="font-bold text-white text-lg font-display group-hover:text-[#ccb67b] transition-colors">
            Property Matchmaker AI
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Multi-factor weighted scoring (0%–100%) against Kharghar &amp; Taloja inventory with +5% budget ceiling protection.
          </p>
          <span className="text-xs text-[#ccb67b] font-bold flex items-center gap-1 pt-2 font-mono">
            Launch Matchmaker <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>

        {/* Module 2: Client Portals */}
        <Link
          href="/portals"
          className="glass-panel p-6 rounded-3xl border border-[#b59658]/20 hover:border-[#b59658]/60 transition-all group space-y-3 block"
        >
          <div className="w-10 h-10 rounded-2xl bg-[#1b202c] border border-[#b59658]/40 flex items-center justify-center text-[#ccb67b] group-hover:scale-110 transition-transform">
            <Globe className="w-5 h-5 text-[#ccb67b]" />
          </div>
          <h3 className="font-bold text-white text-lg font-display group-hover:text-[#ccb67b] transition-colors">
            Client Portals &amp; Telemetry
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Track real-time client engagement, photo dwell time, and automatic HOT PROSPECT alerts on WhatsApp.
          </p>
          <span className="text-xs text-[#ccb67b] font-bold flex items-center gap-1 pt-2 font-mono">
            View Live Telemetry <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>

        {/* Module 3: Site Visit Tours */}
        <Link
          href="/visits"
          className="glass-panel p-6 rounded-3xl border border-[#b59658]/20 hover:border-[#b59658]/60 transition-all group space-y-3 block"
        >
          <div className="w-10 h-10 rounded-2xl bg-[#1b202c] border border-[#b59658]/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <Calendar className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="font-bold text-white text-lg font-display group-hover:text-[#ccb67b] transition-colors">
            Site Visit Itinerary Dispatcher
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Multi-stop Saturday tours across Kharghar &amp; Taloja with cab coordination, Google Maps links, and feedback logging.
          </p>
          <span className="text-xs text-[#ccb67b] font-bold flex items-center gap-1 pt-2 font-mono">
            Plan Tours <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>
      </div>
    </div>
  );
}
