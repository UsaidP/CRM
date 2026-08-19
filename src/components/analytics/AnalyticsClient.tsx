'use client';

import React, { useState } from 'react';
import { 
  DollarSign, 
  Video, 
  Share2, 
  Trophy, 
  BarChart3, 
  RefreshCw, 
  Target,
} from 'lucide-react';
import { YoutubeIcon, InstagramIcon } from '@/components/icons/SocialIcons';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';

export function AnalyticsClient({
  initialRoi = [],
  initialRoiSummary = {},
  initialLeaderboard = [],
  initialLeaderboardSummary = {},
  initialFunnel = [],
  initialCashFlow = {},
}: {
  initialRoi?: any[];
  initialRoiSummary?: any;
  initialLeaderboard?: any[];
  initialLeaderboardSummary?: any;
  initialFunnel?: any[];
  initialCashFlow?: any;
}) {
  const [loading, setLoading] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  
  const [contentRoi, setContentRoi] = useState<any[]>(initialRoi);
  const [contentSummary, setContentSummary] = useState<any>(initialRoiSummary);
  const [leaderboard, setLeaderboard] = useState<any[]>(initialLeaderboard);
  const [, setLeaderboardSummary] = useState<any>(initialLeaderboardSummary);
  const [, setFunnel] = useState<any[]>(initialFunnel);
  const [, setFunnelSummary] = useState<any>({});
  const [, setCashFlow] = useState<any>(initialCashFlow);

  const fetchAllAnalytics = async () => {
    setLoading(true);
    setUiError(null);
    try {
      const [resRoi, resLead, resFunnel, resCash] = await Promise.all([
        fetch('/api/v1/analytics/content-roi').then((r) => r.json()),
        fetch('/api/v1/analytics/agent-leaderboard').then((r) => r.json()),
        fetch('/api/v1/analytics/funnel').then((r) => r.json()),
        fetch('/api/v1/analytics/cash-flow').then((r) => r.json()),
      ]);

      if (!resRoi.success || !resLead.success || !resFunnel.success || !resCash.success) {
        throw new Error(resRoi.error || resLead.error || resFunnel.error || resCash.error || 'Analytics could not be refreshed.');
      }
      if (resRoi.success) {
        setContentRoi(resRoi.data || []);
        setContentSummary(resRoi.summary || {});
      }
      if (resLead.success) {
        setLeaderboard(resLead.data || []);
        setLeaderboardSummary(resLead.summary || {});
      }
      if (resFunnel.success) {
        setFunnel(resFunnel.data || []);
        setFunnelSummary(resFunnel.summary || {});
      }
      if (resCash.success) {
        setCashFlow(resCash.data || {});
      }
    } catch (err: any) {
      setUiError(err.message || 'Analytics could not be refreshed. Check your connection, then try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatINR = (val: unknown) => {
    if (val === null || val === undefined || !Number.isFinite(Number(val))) return '—';
    const amount = Number(val);
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} Lakh`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatShare = (value: unknown) => value === null || value === undefined
    ? 'Share unavailable'
    : `${Number(value).toLocaleString('en-IN')}% of attributed brokerage`;

  const getChannelIcon = (type?: string) => {
    const t = (type || '').toUpperCase();
    if (t.includes('YOUTUBE')) return <YoutubeIcon className="w-3.5 h-3.5 text-red-500" />;
    if (t.includes('INSTAGRAM') || t.includes('REEL')) return <InstagramIcon className="w-3.5 h-3.5 text-pink-500" />;
    return <Share2 className="w-3.5 h-3.5 text-[#ccb67b]" />;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#b59658]/20">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1b202c] text-[#ccb67b] border border-[#b59658]/40 uppercase tracking-wider flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5 text-[#b59658]" /> BUSINESS INTELLIGENCE &amp; ROI
            </span>
            <HallmarkStamp type="ledger" label="From recorded deals" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-display">
            Content ROI &amp; Revenue Analytics
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Campaign attribution based on recorded leads and non-cancelled deals. Ad spend is not recorded.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAllAnalytics}
            disabled={loading}
            aria-label="Refresh analytics"
            className="min-h-11 min-w-11 px-3 py-2 rounded-lg bg-[#12151f] hover:bg-[#1b202c] text-slate-300 border border-[#b59658]/20 text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {uiError && (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-200">
          <p>{uiError}</p>
          <button type="button" onClick={fetchAllAnalytics} className="mt-1 min-h-11 font-bold text-white underline underline-offset-2">Retry analytics</button>
        </div>
      )}

      {/* Top Level BI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-md">
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex justify-between items-center">
            <span>Organic Content GMV</span>
            <DollarSign className="w-3.5 h-3.5 text-[#ccb67b]" />
          </div>
          <div className="text-2xl font-bold text-white mt-1.5">
            {formatINR(contentSummary?.totalAttributedGmv)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span>{contentSummary?.totalAttributedGmv === undefined ? 'Not recorded' : 'From campaign-linked deals'}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#1b202c]/90 border border-emerald-500/30 shadow-md">
          <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider flex justify-between items-center">
            <span>Customer Acquisition Cost (CAC)</span>
            <Target className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-1.5">
            —
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Campaign spend is not recorded
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#1b202c]/90 border border-red-500/30 shadow-md">
          <div className="text-[10px] text-red-400 font-semibold uppercase tracking-wider flex justify-between items-center">
            <span>YouTube Pipeline Split</span>
            <YoutubeIcon className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1.5">
            {formatINR(contentSummary?.youtubePipeline)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {formatShare(contentSummary?.youtubeSharePercent)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#1b202c]/90 border border-pink-500/30 shadow-md">
          <div className="text-[10px] text-pink-400 font-semibold uppercase tracking-wider flex justify-between items-center">
            <span>Instagram / Reel Split</span>
            <InstagramIcon className="w-3.5 h-3.5 text-pink-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1.5">
            {formatINR(contentSummary?.instagramPipeline)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {formatShare(contentSummary?.instagramSharePercent)}
          </div>
        </div>
      </div>

      {/* 2-Column Working Layout: Content Performance Matrix & Sales Rep Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT: Video Attribution & Content ROI Table */}
        <div className="rounded-2xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-xl overflow-hidden">
          <div className="p-3.5 bg-[#12151f]/90 border-b border-[#b59658]/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-[#ccb67b]" />
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">Top Performing Videos by Attributed Pipeline</h3>
            </div>
            <span className="text-[10px] text-slate-400">{contentRoi.length} Inbound Assets</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#12151f]/60 text-slate-400 uppercase text-[9px] border-b border-[#b59658]/10">
                <tr>
                  <th className="p-3 pl-4">Campaign / Asset</th>
                  <th className="p-3 text-center">Leads</th>
                  <th className="p-3 text-center">Visits</th>
                  <th className="p-3 text-center">Deals</th>
                  <th className="p-3 text-right">Attributed GMV</th>
                  <th className="p-3 pr-4 text-right">Firm Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#b59658]/10 text-slate-300">
                {contentRoi.map((c, i) => {
                  const title = c.campaignName || c.title || c.customSlug || 'Campaign Asset';
                  const leads = c.totalLeads ?? c.leadCount ?? 0;
                  const visits = c.totalVisits ?? c.siteVisitCount ?? 0;
                  const deals = c.totalDeals ?? c.dealsClosed ?? 0;
                  const gmv = c.attributedAgreementValue ?? c.attributedGmv;
                  const rev = c.firmNetRupees ?? c.firmRevenue;

                  return (
                    <tr key={i} className="hover:bg-[#12151f]/70 transition-colors">
                      <td className="p-3 pl-4">
                        <div className="flex items-center gap-1.5">
                          {getChannelIcon(c.channelType || c.campaignType)}
                          <span className="font-bold text-white font-sans text-xs">{title}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block truncate max-w-[160px]">{c.customSlug}</span>
                      </td>
                      <td className="p-3 text-center text-white font-bold">{leads}</td>
                      <td className="p-3 text-center text-slate-300">{visits}</td>
                      <td className="p-3 text-center text-emerald-400 font-bold">{deals}</td>
                      <td className="p-3 text-right font-bold text-slate-200">{formatINR(gmv)}</td>
                      <td className="p-3 pr-4 text-right font-bold text-[#ccb67b]">{formatINR(rev)}</td>
                    </tr>
                  );
                })}

                {contentRoi.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500 text-xs">
                      No organic video performance data recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: Sales Broker Performance Leaderboard */}
        <div className="rounded-2xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-xl overflow-hidden">
          <div className="p-3.5 bg-[#12151f]/90 border-b border-[#b59658]/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">Broker Performance Leaderboard</h3>
            </div>
            <span className="text-[10px] text-slate-400">{leaderboard.length} Advisors</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#12151f]/60 text-slate-400 uppercase text-[9px] border-b border-[#b59658]/10">
                <tr>
                  <th className="p-3 pl-4">Rank / Advisor</th>
                  <th className="p-3 text-center">Tours</th>
                  <th className="p-3 text-center">Deals</th>
                  <th className="p-3 pr-4 text-right">Firm Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#b59658]/10 text-slate-300">
                {leaderboard.map((agent, i) => {
                  const rank = i + 1;
                  const name = agent.fullName || agent.brokerName || 'Real Estate Advisor';
                  const role = agent.role || 'Senior Real Estate Advisor';
                  const tours = agent.visitsConducted ?? agent.completedTours ?? agent.tours ?? 0;
                  const deals = agent.dealsClosed ?? agent.closedDealsCount ?? agent.deals ?? 0;
                  const rev = agent.grossBrokerageGenerated ?? agent.firmBrokerageGenerated ?? agent.revenue ?? 0;

                  return (
                    <tr key={i} className="hover:bg-[#12151f]/70 transition-colors">
                      <td className="p-3 pl-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            rank === 1 ? 'bg-amber-400 text-black' : rank === 2 ? 'bg-slate-300 text-black' : 'bg-[#12151f] text-slate-400 border border-[#b59658]/30'
                          }`}>
                            {rank}
                          </span>
                          <div>
                            <span className="font-bold text-white font-sans text-xs">{name}</span>
                            <span className="text-[10px] text-slate-400 block">{role}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center text-slate-300">{tours}</td>
                      <td className="p-3 text-center text-emerald-400 font-bold">{deals}</td>
                      <td className="p-3 pr-4 text-right font-bold text-emerald-400">{formatINR(rev)}</td>
                    </tr>
                  );
                })}

                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-500 text-xs">
                      No agent performance metrics logged.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
