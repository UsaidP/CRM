'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Users,
  ShieldCheck,
  TrendingUp,
  Car,
  Calendar,
  Sparkles,
  Calculator,
  DollarSign,
  Phone,
  MessageSquare,
  Globe,
  Clock,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  Building2,
  MapPin
} from 'lucide-react';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { formatDateTime } from '@/lib/date-utils';
import { DashboardAnalyticsSuite } from './DashboardAnalyticsSuite';

interface DashboardProps {
  initialData: {
    projectCount: number;
    unitCount: number;
    activeMarketableCount: number;
    staleCount: number;
    leadCount: number;
    campaignCount: number;
    portalCount: number;
    dealsCount: number;
    totalGrossBrokerage: number;
    totalRealizedNet: number;
    overdueRemindersCount: number;
    topConnectNext: any;
    recentDeals: any[];
    hotProspects: any[];
    units: any[];
    leads: any[];
    siteVisits: any[];
  };
}

export function DashboardCockpitClient({ initialData }: DashboardProps) {
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'all'>('all');
  const [selectedMarket, setSelectedMarket] = useState<'ALL' | 'KHARGHAR' | 'TALOJA' | 'PANVEL'>('ALL');

  const {
    overdueRemindersCount,
    topConnectNext,
    recentDeals = [],
    hotProspects = [],
    leads = [],
    units = [],
    siteVisits = [],
  } = initialData;

  const formatINR = (val: number) => {
    if (!val && val !== 0) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  // Helper to match micro-market reliably across all attributes
  const matchesMarket = (marketStr?: string | null, subLoc?: string | null) => {
    if (selectedMarket === 'ALL') return true;
    const combined = `${marketStr || ''} ${subLoc || ''}`.toUpperCase();
    if (selectedMarket === 'KHARGHAR') return combined.includes('KHARGHAR');
    if (selectedMarket === 'TALOJA') return combined.includes('TALOJA');
    if (selectedMarket === 'PANVEL')
      return combined.includes('PANVEL') || combined.includes('UPPER KHARGHAR') || combined.includes('RAIGAD') || combined.includes('RAIGARH');
    return true;
  };

  // Dynamic Multi-Dimensional Filtering (TimeRange + Micro-Market)
  const {
    filteredLeads,
    filteredDeals,
    filteredVisits,
    filteredUnits,
    activeMarketableCount,
    staleCount,
  } = useMemo(() => {
    const now = Date.now();
    let cutoffMs = 0;
    if (timeRange === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      cutoffMs = today.getTime();
    } else if (timeRange === '7d') {
      cutoffMs = now - 7 * 24 * 60 * 60 * 1000;
    } else if (timeRange === '30d') {
      cutoffMs = now - 30 * 24 * 60 * 60 * 1000;
    }

    // Filter Leads
    const fLeads = leads.filter((l) => {
      if (timeRange !== 'all' && l.createdAt) {
        const t = new Date(l.createdAt).getTime();
        if (!isNaN(t) && t < cutoffMs) return false;
      }
      if (selectedMarket !== 'ALL') {
        const reqLoc = l.requirements?.[0]?.preferredLocationsJson;
        let locStr = `${l.preferredLocation || ''} ${l.notes || ''} ${l.sourceCode || ''} ${l.campaign?.campaignName || ''} ${l.campaign?.utmCampaign || ''}`;
        if (typeof reqLoc === 'string') {
          locStr += ` ${reqLoc}`;
        } else if (Array.isArray(reqLoc)) {
          locStr += ` ${reqLoc.join(' ')}`;
        }
        const hasPortalMatch = l.portals?.some((p: any) =>
          p.portalUnits?.some((pu: any) =>
            matchesMarket(pu.propertyUnit?.project?.microMarket, pu.propertyUnit?.project?.subLocality)
          )
        );
        if (!matchesMarket(locStr) && !hasPortalMatch) return false;
      }
      return true;
    });

    // Filter Units
    const fUnits = units.filter((u) => {
      return matchesMarket(u.project?.microMarket, u.project?.subLocality);
    });

    // Calculate Active & Stale units for filtered set
    let activeUnits = 0;
    let staleUnits = 0;
    fUnits.forEach((u) => {
      const status = u.freshness?.effectiveMarketableStatus || u.verificationStatus;
      if (status === 'ACTIVE_MARKETABLE' || status === 'VERIFIED_FRESH') {
        activeUnits++;
      } else {
        staleUnits++;
      }
    });

    // Filter Deals
    const fDeals = recentDeals.filter((d) => {
      if (timeRange !== 'all' && (d.createdAt || d.bookingDate)) {
        const t = new Date(d.createdAt || d.bookingDate).getTime();
        if (!isNaN(t) && t < cutoffMs) return false;
      }
      if (selectedMarket !== 'ALL') {
        const mkt = d.propertyUnit?.project?.microMarket;
        const sub = d.propertyUnit?.project?.subLocality;
        if (!matchesMarket(mkt, sub)) return false;
      }
      return true;
    });

    // Filter Visits
    const fVisits = siteVisits.filter((v) => {
      if (timeRange !== 'all' && (v.scheduledDate || v.createdAt)) {
        const t = new Date(v.scheduledDate || v.createdAt).getTime();
        if (!isNaN(t) && t < cutoffMs) return false;
      }
      if (selectedMarket !== 'ALL') {
        const loc = `${v.pickupLocation || ''} ${v.pickupAddress || ''} ${v.feedbackNotes || ''} ${v.lead?.fullName || ''}`;
        if (!matchesMarket(loc)) return false;
      }
      return true;
    });

    return {
      filteredLeads: fLeads,
      filteredDeals: fDeals,
      filteredVisits: fVisits,
      filteredUnits: fUnits,
      activeMarketableCount: activeUnits,
      staleCount: staleUnits,
    };
  }, [timeRange, selectedMarket, leads, recentDeals, siteVisits, units]);

  // Dynamic Metrics
  const currentGrossBrokerage = filteredDeals.reduce(
    (acc, d) =>
      acc + (d.grossBrokerageAmount || d.grossCommissionAmount || (d.agreementValue ? d.agreementValue * 0.025 : 0)),
    0
  );
  const currentRealizedNet = filteredDeals.reduce(
    (acc, d) =>
      acc +
      (d.firmNetBrokerageAmount || d.netCommissionPayable || (d.grossBrokerageAmount ? d.grossBrokerageAmount * 0.7 : 0)),
    0
  );

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
      {/* ─── 1. TOP INTERACTIVE EXECUTIVE CONTROL BAR ─── */}
      <div className="p-2.5 sm:p-4 rounded-2xl bg-surface border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
        {/* Market Filter */}
        <div className="w-full md:w-auto flex items-center">
          <div className="w-full md:w-auto flex items-center justify-between sm:justify-start gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl bg-surface-subtle border border-border text-xs font-semibold">
            <div className="flex items-center gap-1.5 shrink-0">
              <Filter className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="text-content-muted text-[11px] sm:text-xs">Market Node:</span>
            </div>
            <CustomSelect
              value={selectedMarket}
              onChange={(val) => setSelectedMarket(val as any)}
              options={[
                { value: 'ALL', label: 'All Navi Mumbai Hubs' },
                { value: 'KHARGHAR', label: 'Kharghar Node (Sectors 1–36)' },
                { value: 'TALOJA', label: 'Taloja Industrial & CIDCO' },
                { value: 'PANVEL', label: 'Panvel & Upper Kharghar' },
              ]}
              className="font-bold text-accent-text bg-transparent border-none p-0 focus:ring-0 cursor-pointer text-xs"
            />
          </div>
        </div>

        {/* Time Window Filter Pills */}
        <div className="w-full md:w-auto flex items-center gap-1 bg-surface-subtle p-1 rounded-xl border border-border text-xs font-semibold overflow-x-auto no-scrollbar">
          {[
            { key: 'today', label: 'Today' },
            { key: '7d', label: 'Last 7D' },
            { key: '30d', label: 'Last 30D' },
            { key: 'all', label: 'All Time' },
          ].map((range) => (
            <button
              key={range.key}
              type="button"
              onClick={() => setTimeRange(range.key as any)}
              className={`flex-1 md:flex-initial text-center px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap text-[11px] sm:text-xs ${
                timeRange === range.key
                  ? 'bg-accent text-white shadow-2xs font-bold'
                  : 'text-content-muted hover:text-content hover:bg-surface'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 2. MAIN COCKPIT HEADER & ACTION LAUNCHPAD ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-soft text-accent-text border border-accent/20 uppercase tracking-wider">
              {selectedMarket === 'ALL' ? 'Kharghar & Taloja Advisory Network' : `${selectedMarket} Node Hub`}
            </span>
            <HallmarkStamp type="rera" label="RERA Compliant Ledger" />
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-content font-display">
            Executive Brokerage Cockpit
          </h1>
          <p className="text-content-secondary text-xs mt-0.5">
            Real-time advisory pipeline, active project inventory, and commission cashflow tracking.
          </p>
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap md:flex-nowrap items-center gap-2 w-full lg:w-auto">
          <Link
            href="/calendar"
            className="px-3 py-2.5 sm:py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content-secondary hover:text-content border border-border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:border-accent/40 active:scale-95"
          >
            <Calendar className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>Reminders</span>
            {overdueRemindersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-status-danger text-white font-bold text-[10px]">
                {overdueRemindersCount}
              </span>
            )}
          </Link>
          <Link
            href="/matching"
            className="px-3 py-2.5 sm:py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content-secondary hover:text-content border border-border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:border-accent/40 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>Matchmaker</span>
          </Link>
          <Link
            href="/calculator"
            className="px-3 py-2.5 sm:py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content-secondary hover:text-content border border-border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:border-accent/40 active:scale-95"
          >
            <Calculator className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>Calculator</span>
          </Link>
          <Link
            href="/deals"
            className="px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs hover:shadow-sm active:scale-95"
          >
            <DollarSign className="w-3.5 h-3.5 shrink-0" />
            <span>Record Deal</span>
          </Link>
        </div>
      </div>

      {/* ─── 3. TARGET CONNECT NEXT #1 PRIORITY CARD ─── */}
      {topConnectNext && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-r from-accent/10 via-surface to-surface border-2 border-accent/40 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4 hover:border-accent transition-all duration-300"
        >
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-accent text-white shadow-2xs">
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white" />
                #1 Priority Action: Connect Next
              </span>
              <span className="text-[11px] sm:text-xs font-mono font-bold text-accent-text bg-accent-soft px-2.5 py-0.5 rounded-lg border border-accent/20">
                Score: {topConnectNext.totalScore ?? topConnectNext.priorityScore ?? 95}/100
              </span>
              {topConnectNext.urgencyTier && (
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-status-danger/10 text-status-danger border border-status-danger/20">
                  {topConnectNext.urgencyTier}
                </span>
              )}
            </div>
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-content font-display break-words">
              {topConnectNext.leadName || topConnectNext.lead?.fullName || 'Lead Profile'}{' '}
              <span className="font-normal text-content-secondary font-mono text-xs sm:text-sm">
                &bull; {topConnectNext.phoneE164 || topConnectNext.lead?.phoneE164 || 'No Phone'}
              </span>
            </h2>
            <p className="text-xs text-content-secondary max-w-2xl leading-relaxed">
              <strong className="text-content">Recommended Move:</strong>{' '}
              {topConnectNext.primaryReason ||
                topConnectNext.actionDetails ||
                topConnectNext.reason ||
                'Follow up on active advisory requirements in Kharghar / Taloja.'}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0">
            {(topConnectNext.phoneE164 || topConnectNext.lead?.phoneE164) && (
              <>
                <a
                  href={`tel:${topConnectNext.phoneE164 || topConnectNext.lead?.phoneE164}`}
                  className="flex-1 sm:flex-initial justify-center px-3.5 sm:px-4 py-2.5 rounded-xl bg-status-success hover:bg-status-success-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-xs hover:shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>Call Lead</span>
                </a>
                <a
                  href={`https://wa.me/${(topConnectNext.phoneE164 || topConnectNext.lead?.phoneE164 || '').replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 sm:flex-initial justify-center px-3.5 sm:px-4 py-2.5 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border hover:border-emerald-500 text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-status-success shrink-0" />
                  <span>WhatsApp</span>
                </a>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* ─── 4. CORE KPI METRIC TILES ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Total Leads */}
        <motion.div
          whileHover={{ y: -3 }}
          className="p-4 rounded-2xl bg-surface border border-border shadow-xs hover:border-accent/50 hover:shadow-md transition-all duration-300 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-content-secondary uppercase tracking-wider font-mono">
              Leads ({timeRange.toUpperCase()})
            </span>
            <div className="w-8 h-8 rounded-xl bg-accent-soft text-accent flex items-center justify-center shadow-2xs">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-content font-display">{filteredLeads.length}</span>
            <span className="text-xs font-mono text-status-success font-bold flex items-center">
              <ArrowUpRight className="w-3 h-3" /> Live
            </span>
          </div>
          <p className="text-[11px] text-content-muted mt-1">Inbound advisory pipeline</p>
        </motion.div>

        {/* Metric 2: Marketable Inventory */}
        <motion.div
          whileHover={{ y: -3 }}
          className="p-4 rounded-2xl bg-surface border border-border shadow-xs hover:border-accent/50 hover:shadow-md transition-all duration-300 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-content-secondary uppercase tracking-wider font-mono">
              Marketable Units
            </span>
            <div className="w-8 h-8 rounded-xl bg-status-success/10 text-status-success flex items-center justify-center shadow-2xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-content font-display">{activeMarketableCount}</span>
            <span className="text-xs font-mono text-content-muted">/ {filteredUnits.length} total</span>
          </div>
          <p className="text-[11px] text-content-muted mt-1">
            {staleCount > 0 ? `${staleCount} units need re-verification` : 'All inventory RERA verified'}
          </p>
        </motion.div>

        {/* Metric 3: Site Visits */}
        <motion.div
          whileHover={{ y: -3 }}
          className="p-4 rounded-2xl bg-surface border border-border shadow-xs hover:border-accent/50 hover:shadow-md transition-all duration-300 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-content-secondary uppercase tracking-wider font-mono">
              Site Tours
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-content font-display">{filteredVisits.length}</span>
            <span className="text-xs font-mono text-status-success font-bold">Scheduled</span>
          </div>
          <p className="text-[11px] text-content-muted mt-1">Navi Mumbai physical itineraries</p>
        </motion.div>

        {/* Metric 4: Commission Ledger */}
        <motion.div
          whileHover={{ y: -3 }}
          className="p-4 rounded-2xl bg-surface border border-border shadow-xs hover:border-accent/50 hover:shadow-md transition-all duration-300 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-content-secondary uppercase tracking-wider font-mono">
              Commission Ledger
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-2xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-wrap items-baseline gap-1 sm:gap-2">
            <span className="text-xl sm:text-2xl font-black text-content font-display">
              {formatINR(currentRealizedNet || currentGrossBrokerage * 0.7)}
            </span>
            <span className="text-xs font-mono text-accent-text font-bold">
              ({formatINR(currentGrossBrokerage)} gross)
            </span>
          </div>
          <p className="text-[11px] text-status-success font-medium mt-1">100% compliant payout structure</p>
        </motion.div>
      </div>

      {/* ─── 5. ANIMATED BKLIT VISUALIZATION SUITE ─── */}
      <DashboardAnalyticsSuite
        filteredLeads={filteredLeads}
        filteredDeals={filteredDeals}
        filteredUnits={filteredUnits}
        timeRange={timeRange}
        selectedMarket={selectedMarket}
      />

      {/* ─── 6. OPERATIONAL WORKBENCHES & RECENT ACTIVITY ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Hot Telemetry Sessions */}
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 hover:border-accent/30 transition-all duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-xs sm:text-sm font-bold text-content font-display flex items-center gap-1.5 sm:gap-2 truncate">
              <Globe className="w-4 h-4 text-accent shrink-0" />
              <span className="truncate">Live Client Portal Telemetry ({initialData.portalCount} active)</span>
            </h2>
            <Link href="/portals" className="text-xs font-bold text-accent-text hover:underline flex items-center gap-1 shrink-0">
              <span>View all</span> <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {hotProspects && hotProspects.length > 0 ? (
              hotProspects.slice(0, 4).map((hp, i) => (
                <div
                  key={i}
                  className="p-2.5 sm:p-3 rounded-xl bg-surface-subtle border border-border flex items-center justify-between gap-2.5 text-xs hover:border-accent/40 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-content block truncate">{hp.lead?.fullName || 'Client'}</span>
                    <span className="text-[11px] text-content-muted block truncate">
                      Viewed {hp.portal?.portalUnits?.length || 1} units
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-accent-soft text-accent-text border border-accent/20 shrink-0">
                    {hp.engagement?.engagementTier || 'WARM'}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-content-muted text-xs">
                No telemetry sessions currently active. Create client portals via Matchmaker.
              </div>
            )}
          </div>
        </div>

        {/* Site Tours & Upcoming Calendar */}
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 hover:border-accent/30 transition-all duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-xs sm:text-sm font-bold text-content font-display flex items-center gap-1.5 sm:gap-2 truncate">
              <Car className="w-4 h-4 text-accent shrink-0" />
              <span className="truncate">Scheduled Site Visits ({filteredVisits.length})</span>
            </h2>
            <Link href="/visits" className="text-xs font-bold text-accent-text hover:underline flex items-center gap-1 shrink-0">
              <span>Schedule</span> <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {filteredVisits && filteredVisits.length > 0 ? (
              filteredVisits.slice(0, 4).map((v, i) => (
                <div
                  key={i}
                  className="p-2.5 sm:p-3 rounded-xl bg-surface-subtle border border-border flex items-center justify-between gap-2.5 text-xs hover:border-accent/40 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-content block truncate">{v.lead?.fullName || 'Client Tour'}</span>
                    <span className="text-[11px] text-content-muted flex items-center gap-1 mt-0.5 truncate">
                      <Clock className="w-3 h-3 text-accent shrink-0" />
                      <span className="truncate">{formatDateTime(v.scheduledDate)}</span>
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                    {v.status || 'CONFIRMED'}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-content-muted text-xs">
                No site visits currently scheduled for this window.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
