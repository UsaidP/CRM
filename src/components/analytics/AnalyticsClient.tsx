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
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-content font-sans text-xs">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-soft text-accent-text border border-accent/20 uppercase tracking-wider flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5 text-accent" /> BUSINESS INTELLIGENCE &amp; ROI
            </span>
            <HallmarkStamp type="ledger" label="From recorded deals" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-content font-display">
            Content ROI &amp; Revenue Analytics
          </h1>
          <p className="text-content-secondary text-xs mt-0.5">
            Campaign attribution based on recorded leads and non-cancelled deals. Ad spend is not recorded.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAllAnalytics}
            disabled={loading}
            aria-label="Refresh analytics"
            className="min-h-10 min-w-10 px-3 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-semibold shadow-xs transition-all flex items-center justify-center"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent' : 'text-content-secondary'}`} />
          </button>
        </div>
      </div>

      {uiError && (
        <div role="alert" className="rounded-xl border border-status-danger/40 bg-status-danger-surface p-3.5 text-xs text-status-danger font-semibold shadow-xs">
          <p>{uiError}</p>
          <button type="button" onClick={fetchAllAnalytics} className="mt-1 font-bold text-status-danger underline underline-offset-2">Retry analytics</button>
        </div>
      )}

      {/* Top Level BI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs hover:border-border-strong transition-all">
          <div className="text-[10px] text-content-muted font-bold uppercase tracking-wider flex justify-between items-center">
            <span>Organic Content GMV</span>
            <DollarSign className="w-4 h-4 text-accent" />
          </div>
          <div className="text-2xl font-bold text-content mt-1.5">
            {formatINR(contentSummary?.totalAttributedGmv)}
          </div>
          <div className="text-[11px] text-content-muted mt-1 flex items-center gap-1">
            <span>{contentSummary?.totalAttributedGmv === undefined ? 'Not recorded' : 'From campaign-linked deals'}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-status-success/30 shadow-xs hover:border-status-success/50 transition-all">
          <div className="text-[10px] text-status-success font-bold uppercase tracking-wider flex justify-between items-center">
            <span>Customer Acquisition Cost (CAC)</span>
            <Target className="w-4 h-4 text-status-success" />
          </div>
          <div className="text-2xl font-bold text-status-success mt-1.5">
            —
          </div>
          <div className="text-[11px] text-content-muted mt-1">
            Campaign spend is not recorded
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-red-500/30 shadow-xs hover:border-red-500/50 transition-all">
          <div className="text-[10px] text-red-500 font-bold uppercase tracking-wider flex justify-between items-center">
            <span>YouTube Pipeline Split</span>
            <YoutubeIcon className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-content mt-1.5">
            {formatINR(contentSummary?.youtubePipeline)}
          </div>
          <div className="text-[11px] text-content-muted mt-1">
            {formatShare(contentSummary?.youtubeSharePercent)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-pink-500/30 shadow-xs hover:border-pink-500/50 transition-all">
          <div className="text-[10px] text-pink-500 font-bold uppercase tracking-wider flex justify-between items-center">
            <span>Instagram / Reel Split</span>
            <InstagramIcon className="w-4 h-4 text-pink-500" />
          </div>
          <div className="text-2xl font-bold text-content mt-1.5">
            {formatINR(contentSummary?.instagramPipeline)}
          </div>
          <div className="text-[11px] text-content-muted mt-1">
            {formatShare(contentSummary?.instagramSharePercent)}
          </div>
        </div>
      </div>

      {/* 2-Column Working Layout: Content Performance Matrix & Sales Rep Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT: Video Attribution & Content ROI Table */}
        <div className="rounded-2xl bg-surface border border-border shadow-xs overflow-hidden">
          <div className="p-4 bg-surface-subtle border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-accent" />
              <h3 className="font-bold text-content text-xs uppercase tracking-wider">Top Performing Videos by Attributed Pipeline</h3>
            </div>
            <span className="text-[11px] font-mono text-content-muted">{contentRoi.length} Inbound Assets</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-subtle text-content-secondary uppercase text-[10px] font-bold border-b border-border">
                <tr>
                  <th className="p-3.5 pl-4">Campaign / Asset</th>
                  <th className="p-3.5 text-center">Leads</th>
                  <th className="p-3.5 text-center">Visits</th>
                  <th className="p-3.5 text-center">Deals</th>
                  <th className="p-3.5 text-right">Attributed GMV</th>
                  <th className="p-3.5 pr-4 text-right">Firm Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-content-secondary">
                {contentRoi.map((c, i) => {
                  const title = c.campaignName || c.title || c.customSlug || 'Campaign Asset';
                  const leads = c.totalLeads ?? c.leadCount ?? 0;
                  const visits = c.totalVisits ?? c.siteVisitCount ?? 0;
                  const deals = c.totalDeals ?? c.dealsClosed ?? 0;
                  const gmv = c.attributedAgreementValue ?? c.attributedGmv;
                  const rev = c.firmNetRupees ?? c.firmRevenue;

                  return (
                    <tr key={i} className="hover:bg-surface-subtle/80 transition-colors">
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-2">
                          {getChannelIcon(c.channelType || c.campaignType)}
                          <span className="font-bold text-content text-xs">{title}</span>
                        </div>
                        <span className="text-[11px] font-mono text-content-muted block truncate max-w-[160px]">{c.customSlug}</span>
                      </td>
                      <td className="p-3.5 text-center text-content font-bold">{leads}</td>
                      <td className="p-3.5 text-center text-content-secondary">{visits}</td>
                      <td className="p-3.5 text-center text-status-success font-bold">{deals}</td>
                      <td className="p-3.5 text-right font-bold text-content font-mono">{formatINR(gmv)}</td>
                      <td className="p-3.5 pr-4 text-right font-bold text-accent-text font-mono">{formatINR(rev)}</td>
                    </tr>
                  );
                })}

                {contentRoi.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-content-muted text-xs">
                      No organic video performance data recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: Sales Broker Performance Leaderboard */}
        <div className="rounded-2xl bg-surface border border-border shadow-xs overflow-hidden">
          <div className="p-4 bg-surface-subtle border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-accent" />
              <h3 className="font-bold text-content text-xs uppercase tracking-wider">Broker Performance Leaderboard</h3>
            </div>
            <span className="text-[11px] font-mono text-content-muted">{leaderboard.length} Advisors</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-subtle text-content-secondary uppercase text-[10px] font-bold border-b border-border">
                <tr>
                  <th className="p-3.5 pl-4">Rank / Advisor</th>
                  <th className="p-3.5 text-center">Tours</th>
                  <th className="p-3.5 text-center">Deals</th>
                  <th className="p-3.5 pr-4 text-right">Firm Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-content-secondary">
                {leaderboard.map((agent, i) => {
                  const rank = i + 1;
                  const name = agent.fullName || agent.brokerName || 'Real Estate Advisor';
                  const role = agent.role || 'Senior Real Estate Advisor';
                  const tours = agent.visitsConducted ?? agent.completedTours ?? agent.tours ?? 0;
                  const deals = agent.dealsClosed ?? agent.closedDealsCount ?? agent.deals ?? 0;
                  const rev = agent.grossBrokerageGenerated ?? agent.firmBrokerageGenerated ?? agent.revenue ?? 0;

                  return (
                    <tr key={i} className="hover:bg-surface-subtle/80 transition-colors">
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            rank === 1 ? 'bg-accent text-white' : rank === 2 ? 'bg-accent-soft text-accent-text border border-accent/20' : 'bg-surface-subtle text-content-muted border border-border'
                          }`}>
                            {rank}
                          </span>
                          <div>
                            <span className="font-bold text-content text-xs">{name}</span>
                            <span className="text-[11px] text-content-muted block">{role}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-center text-content-secondary">{tours}</td>
                      <td className="p-3.5 text-center text-status-success font-bold">{deals}</td>
                      <td className="p-3.5 pr-4 text-right font-bold text-status-success font-mono">{formatINR(rev)}</td>
                    </tr>
                  );
                })}

                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-content-muted text-xs">
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
