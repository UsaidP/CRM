'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Video, 
  Share2, 
  Trophy, 
  BarChart3, 
  RefreshCw, 
  Target,
  Download,
  Printer,
  PhoneCall,
  Smartphone,
  Send,
  Flame,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Sparkles
} from 'lucide-react';
import { YoutubeIcon, InstagramIcon } from '@/components/icons/SocialIcons';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';
import { exportAnalyticsToCsv } from '@/lib/export-utils';
import { useFirmName } from '@/lib/client/useFirmName';
import { analyticsApi } from '@/lib/client/analytics';
import { FeedbackAlert } from '@/components/ui/FeedbackAlert';
import { toast } from '@/lib/client/toast';

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
  // Tenant name for the CSV letterhead (falls back to the product name).
  const firmName = useFirmName();
  const [loading, setLoading] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  
  const [contentRoi, setContentRoi] = useState<any[]>(initialRoi);
  const [contentSummary, setContentSummary] = useState<any>(initialRoiSummary);
  const [leaderboard, setLeaderboard] = useState<any[]>(initialLeaderboard);
  const [, setLeaderboardSummary] = useState<any>(initialLeaderboardSummary);
  const [, setFunnel] = useState<any[]>(initialFunnel);
  const [, setFunnelSummary] = useState<any>({});
  const [, setCashFlow] = useState<any>(initialCashFlow);

  // SIM Call Analytics State
  const [callTimeRange, setCallTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [callOverall, setCallOverall] = useState<any>(null);
  const [repCallPerformance, setRepCallPerformance] = useState<any[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [sendingDigest, setSendingDigest] = useState(false);

  const fetchCallAnalytics = async (range: string = callTimeRange) => {
    setLoadingCalls(true);
    try {
      const res = await fetch(`/api/v1/analytics/rep-performance?timeRange=${range}`);
      if (res.ok) {
        const data = await res.json();
        if (data.overall) setCallOverall(data.overall);
        if (data.repPerformance) setRepCallPerformance(data.repPerformance);
      }
    } catch {
      // ignore
    } finally {
      setLoadingCalls(false);
    }
  };

  useEffect(() => {
    fetchCallAnalytics(callTimeRange);
  }, [callTimeRange]);

  const fetchAllAnalytics = async () => {
    setLoading(true);
    setUiError(null);
    try {
      const [resRoi, resLead, resFunnel, resCash] = await Promise.all([
        analyticsApi.contentRoi(),
        analyticsApi.agentLeaderboard(),
        analyticsApi.funnel(),
        analyticsApi.cashFlow(),
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
      await fetchCallAnalytics(callTimeRange);
    } catch (err: any) {
      setUiError(err.message || 'Analytics could not be refreshed. Check your connection, then try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendDigestNow = async () => {
    setSendingDigest(true);
    try {
      const res = await fetch('/api/v1/cron/daily-call-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch WhatsApp digest');
      }
      toast.success('WhatsApp Daily Call Digest Dispatched!', {
        description: `Delivered to: ${data.recipients?.join(', ') || 'Managing Brokers'}`,
      });
    } catch (err: any) {
      toast.error('Failed to send digest', { description: err.message });
    } finally {
      setSendingDigest(false);
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
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-accent-soft text-accent-text border border-accent/20 uppercase tracking-wider flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5 text-accent" /> BUSINESS INTELLIGENCE &amp; ROI
            </span>
            <HallmarkStamp type="ledger" label="From recorded deals" />
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-content font-display">
            Executive Analytics &amp; Call Intelligence
          </h1>
          <p className="text-content-secondary text-xs mt-0.5">
            Campaign attribution, sales advisor revenue production, and real-time physical SIM call analytics.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <button
            type="button"
            onClick={handleSendDigestNow}
            disabled={sendingDigest}
            className="h-9 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/30 text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
            title="Send daily executive call digest via WhatsApp to managers"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sendingDigest ? 'Sending...' : 'WhatsApp Digest'}</span>
          </button>

          <button
            type="button"
            onClick={() => exportAnalyticsToCsv(contentRoi, leaderboard, firmName)}
            className="flex-1 md:flex-initial h-9 px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            title="Export full campaign ROI & broker incentive report to CSV"
          >
            <Download className="w-3.5 h-3.5 text-accent" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="h-9 px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 hidden sm:inline-flex"
            title="Print Executive BI Report"
          >
            <Printer className="w-3.5 h-3.5 text-accent" />
            <span>Print Report</span>
          </button>

          <button
            type="button"
            onClick={fetchAllAnalytics}
            disabled={loading}
            aria-label="Refresh analytics"
            className="h-9 w-9 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-semibold shadow-2xs transition-all flex items-center justify-center cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent' : 'text-content-secondary'}`} />
          </button>
        </div>
      </div>

      {uiError && (
        <FeedbackAlert
          variant="error"
          error={uiError}
          actionLabel="Retry Analytics"
          onAction={fetchAllAnalytics}
          onDismiss={() => setUiError(null)}
        />
      )}

      {/* Top Level BI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs hover:border-border-strong transition-all">
          <div className="text-[10px] text-content-muted font-bold uppercase tracking-wider flex justify-between items-center">
            <span>Organic Content GMV</span>
            <DollarSign className="w-4 h-4 text-accent" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-content mt-1.5">
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
          <div className="text-xl sm:text-2xl font-bold text-status-success mt-1.5">
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
          <div className="text-xl sm:text-2xl font-bold text-content mt-1.5">
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
          <div className="text-xl sm:text-2xl font-bold text-content mt-1.5">
            {formatINR(contentSummary?.instagramPipeline)}
          </div>
          <div className="text-[11px] text-content-muted mt-1">
            {formatShare(contentSummary?.instagramSharePercent)}
          </div>
        </div>
      </div>

      {/* NEW: PHYSICAL SIM CALL INTELLIGENCE & CALLING PERFORMANCE SECTION */}
      <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                <PhoneCall className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-bold text-content tracking-tight">
                Physical SIM Calling Performance &amp; AI Intelligence
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/20">
                Runo-Parity
              </span>
            </div>
            <p className="text-[11px] text-content-muted">
              Live call metrics captured directly from Samsung &amp; Xiaomi companion lines with Gemini Flash analysis.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border p-0.5 bg-surface-subtle text-xs">
              {(['today', 'week', 'month', 'all'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setCallTimeRange(r)}
                  className={`px-2.5 py-1 rounded-md font-semibold text-[11px] capitalize transition-all ${
                    callTimeRange === r
                      ? 'bg-accent text-white shadow-xs'
                      : 'text-content-muted hover:text-content'
                  }`}
                >
                  {r === 'all' ? 'All Time' : r === 'today' ? 'Today' : `This ${r}`}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => fetchCallAnalytics(callTimeRange)}
              disabled={loadingCalls}
              className="p-1.5 rounded-lg border border-border hover:bg-surface-subtle text-content-muted hover:text-content transition-colors cursor-pointer"
              title="Refresh SIM calls"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingCalls ? 'animate-spin text-accent' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4 Mini KPI Cards for Calls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-surface-inset rounded-xl border border-border space-y-1">
            <span className="text-[10px] uppercase font-bold text-content-muted block">Total Calls Logged</span>
            <span className="text-xl font-bold text-content font-mono">{callOverall?.totalCalls ?? 0}</span>
            <span className="text-[10px] text-content-muted block">
              {callOverall?.inboundCalls ?? 0} In / {callOverall?.outboundCalls ?? 0} Out
            </span>
          </div>

          <div className="p-3 bg-surface-inset rounded-xl border border-border space-y-1">
            <span className="text-[10px] uppercase font-bold text-content-muted block">Connected Calls</span>
            <span className="text-xl font-bold text-emerald-600 font-mono">
              {callOverall?.connectedCalls ?? 0}
            </span>
            <span className="text-[10px] text-emerald-600/80 font-bold block">
              {callOverall?.connectionRatePercent ?? 0}% Connection Rate
            </span>
          </div>

          <div className="p-3 bg-surface-inset rounded-xl border border-border space-y-1">
            <span className="text-[10px] uppercase font-bold text-content-muted block">Total Talk Time</span>
            <span className="text-xl font-bold text-content font-mono">{callOverall?.formattedDuration ?? '0s'}</span>
            <span className="text-[10px] text-content-muted block">
              Avg {callOverall?.averageDurationSeconds ?? 0}s per call
            </span>
          </div>

          <div className="p-3 bg-surface-inset rounded-xl border border-border space-y-1">
            <span className="text-[10px] uppercase font-bold text-content-muted block">High-Intent Leads</span>
            <span className="text-xl font-bold text-accent font-mono">
              {(callOverall?.outcomesBreakdown?.INTERESTED ?? 0) + (callOverall?.outcomesBreakdown?.CALLBACK_REQUESTED ?? 0)}
            </span>
            <span className="text-[10px] text-accent/80 font-bold block">
              {callOverall?.outcomesBreakdown?.INTERESTED ?? 0} Interested / {callOverall?.outcomesBreakdown?.CALLBACK_REQUESTED ?? 0} Callback
            </span>
          </div>
        </div>

        {/* Advisor Calling Table */}
        <div className="overflow-x-auto touch-scroll border border-border rounded-xl">
          <table className="w-full text-left text-xs min-w-[620px]">
            <thead className="bg-surface-subtle text-content-secondary uppercase text-[10px] font-bold border-b border-border">
              <tr>
                <th className="p-3 pl-4">Rank / Sales Advisor</th>
                <th className="p-3 text-center">Total Calls</th>
                <th className="p-3 text-center">Connected Rate</th>
                <th className="p-3 text-center">Total Talk Time</th>
                <th className="p-3 text-center">Avg Duration</th>
                <th className="p-3 pr-4 text-right">High-Intent Leads</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-content-secondary">
              {repCallPerformance.map((rep) => (
                <tr key={rep.userId} className="hover:bg-surface-subtle/80 transition-colors">
                  <td className="p-3 pl-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        rep.rank === 1 ? 'bg-accent text-white' : rep.rank === 2 ? 'bg-accent-soft text-accent-text border border-accent/20' : 'bg-surface-subtle text-content-muted border border-border'
                      }`}>
                        {rep.rank}
                      </span>
                      <div>
                        <span className="font-bold text-content text-xs">{rep.fullName}</span>
                        <span className="text-[10px] text-content-muted block">{rep.role}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className="font-bold text-content">{rep.totalCalls}</span>
                    <span className="text-[10px] text-content-muted block">({rep.inboundCalls} in / {rep.outboundCalls} out)</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="font-bold text-emerald-600">{rep.connectionRatePercent}%</span>
                    <span className="text-[10px] text-content-muted block">{rep.connectedCalls} connected</span>
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-content">
                    {rep.formattedDuration}
                  </td>
                  <td className="p-3 text-center font-mono text-content-muted">
                    {rep.averageDurationSeconds}s
                  </td>
                  <td className="p-3 pr-4 text-right">
                    <span className="inline-flex items-center gap-1 font-bold text-accent font-mono">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      {rep.interestedCount + rep.callbackCount}
                    </span>
                    <span className="text-[10px] text-content-muted block">
                      {rep.interestedCount} int / {rep.callbackCount} cb
                    </span>
                  </td>
                </tr>
              ))}

              {repCallPerformance.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-content-muted text-xs">
                    No physical SIM call activity recorded for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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

          <div className="overflow-x-auto touch-scroll">
            <table className="w-full text-left text-xs min-w-[480px]">
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
                {contentRoi.map((item, i) => (
                  <tr key={i} className="hover:bg-surface-subtle/80 transition-colors">
                    <td className="p-3.5 pl-4">
                      <div className="flex items-center gap-2 font-bold text-content">
                        {getChannelIcon(item.channelType)}
                        <span className="truncate max-w-[180px]">{item.campaignName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-content-muted block">{item.customSlug}</span>
                    </td>
                    <td className="p-3.5 text-center font-mono">{item.totalLeads}</td>
                    <td className="p-3.5 text-center font-mono">{item.totalVisits}</td>
                    <td className="p-3.5 text-center font-mono font-bold text-status-success">{item.totalDeals}</td>
                    <td className="p-3.5 text-right font-mono text-content">{formatINR(item.attributedAgreementValue)}</td>
                    <td className="p-3.5 pr-4 text-right font-mono font-bold text-status-success">{formatINR(item.grossBrokerageRupees)}</td>
                  </tr>
                ))}

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
              <h3 className="font-bold text-content text-xs uppercase tracking-wider">Broker Revenue Leaderboard</h3>
            </div>
            <span className="text-[11px] font-mono text-content-muted">{leaderboard.length} Advisors</span>
          </div>

          <div className="overflow-x-auto touch-scroll">
            <table className="w-full text-left text-xs min-w-[380px]">
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
