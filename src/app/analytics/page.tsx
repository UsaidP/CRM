'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Video, 
  Share2, 
  Calendar, 
  Trophy, 
  ArrowUpRight, 
  BarChart3, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Award,
  Zap,
  Target
} from 'lucide-react';
import { YoutubeIcon, InstagramIcon } from '@/components/icons/SocialIcons';

export default function AnalyticsCommandCenterPage() {
  const [activeTab, setActiveTab] = useState<'content' | 'leaderboard' | 'funnel' | 'cashflow'>('content');
  const [loading, setLoading] = useState(true);
  
  const [contentRoi, setContentRoi] = useState<any[]>([]);
  const [contentSummary, setContentSummary] = useState<any>({});
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardSummary, setLeaderboardSummary] = useState<any>({});
  const [funnel, setFunnel] = useState<any[]>([]);
  const [funnelSummary, setFunnelSummary] = useState<any>({});
  const [cashFlow, setCashFlow] = useState<any>({});

  const fetchAllAnalytics = async () => {
    setLoading(true);
    try {
      const [resRoi, resLead, resFunnel, resCash] = await Promise.all([
        fetch('/api/v1/analytics/content-roi').then((r) => r.json()),
        fetch('/api/v1/analytics/agent-leaderboard').then((r) => r.json()),
        fetch('/api/v1/analytics/funnel').then((r) => r.json()),
        fetch('/api/v1/analytics/cash-flow').then((r) => r.json()),
      ]);

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
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAnalytics();
  }, []);

  const formatINR = (val: number) => {
    if (!val && val !== 0) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  const getChannelIcon = (type: string) => {
    if (type.includes('YOUTUBE')) return <YoutubeIcon className="w-4 h-4 text-red-500" />;
    if (type.includes('INSTAGRAM')) return <InstagramIcon className="w-4 h-4 text-pink-500" />;
    return <Share2 className="w-4 h-4 text-[#ccb67b]" />;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#b59658]/20">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#b59658]/20 text-[#ccb67b] border border-[#b59658]/40 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#b59658]" /> Phase 7 • Business Intelligence
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30">
              100% Organic Attribution
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight font-display">
            Content ROI &amp; Revenue Analytics
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Deterministic revenue attribution per YouTube walkthrough, Instagram Reel, broker conversion leaderboard, and cash flow forecast.
          </p>
        </div>

        <button
          onClick={fetchAllAnalytics}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1b202c] hover:bg-[#2a3040] text-slate-200 border border-[#b59658]/30 transition-all font-medium text-xs shadow-md"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#ccb67b] ${loading ? 'animate-spin' : ''}`} />
          Refresh Analytics
        </button>
      </div>

      {/* Top Executive KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Brokerage Pipeline</span>
            <div className="w-8 h-8 rounded-lg bg-[#b59658]/20 flex items-center justify-center border border-[#b59658]/40">
              <DollarSign className="w-4 h-4 text-[#ccb67b]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-white">
              {formatINR(cashFlow.totalPipelineGross || contentSummary.totalGrossRevenue || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-semibold">{contentSummary.totalDeals || 0} Deals</span> across organic channels
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bank Cleared Realized</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {formatINR(cashFlow.paymentReceivedAmount || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Firm Net Profit: <span className="font-mono text-white">{formatINR(cashFlow.totalRealizedFirmNet || 0)}</span>
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Revenue / Click</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/40">
              <Zap className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-indigo-300">
              ₹{contentSummary.overallRpc || 0}<span className="text-xs text-slate-400 font-sans font-normal"> / click</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {contentSummary.totalClicks || 0} clicks from bio/short links
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Funnel Conversion</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/40">
              <Target className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-amber-300">
              {funnelSummary.overallConversionPercent || 0}%
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {funnelSummary.totalWonDeals || 0} won out of {funnelSummary.totalLeads || 0} leads
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Tabs Bar */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[#12151f] border border-[#b59658]/20 w-fit">
        <button
          onClick={() => setActiveTab('content')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'content'
              ? 'bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] text-[#12151f] shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          Content ROI Matrix
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'leaderboard'
              ? 'bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] text-[#12151f] shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          Broker Leaderboard
        </button>

        <button
          onClick={() => setActiveTab('funnel')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'funnel'
              ? 'bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] text-[#12151f] shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Conversion Funnel
        </button>

        <button
          onClick={() => setActiveTab('cashflow')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'cashflow'
              ? 'bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] text-[#12151f] shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          Cash Flow Forecast
        </button>
      </div>

      {/* TAB 1: Content ROI Matrix */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-[#b59658]/20 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base font-display">Social Content Performance &amp; Revenue Yield</h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Granular breakdown of clicks, inquiries, site visits, and gross brokerage per YouTube video / Instagram Reel.
                </p>
              </div>
              <span className="text-xs text-[#ccb67b] font-mono font-semibold">
                {contentRoi.length} Tracked Content Assets
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#12151f]/80 text-slate-400 font-mono uppercase text-[10px] border-b border-[#b59658]/20">
                  <tr>
                    <th className="p-3.5 pl-5">Campaign / Content Asset</th>
                    <th className="p-3.5">Channel</th>
                    <th className="p-3.5 text-center">Clicks</th>
                    <th className="p-3.5 text-center">Leads</th>
                    <th className="p-3.5 text-center">Visits</th>
                    <th className="p-3.5 text-center">Deals</th>
                    <th className="p-3.5 text-right">Gross Revenue</th>
                    <th className="p-3.5 text-right">Revenue / Click</th>
                    <th className="p-3.5 pr-5 text-right">Firm Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#b59658]/10 text-slate-300">
                  {contentRoi.map((item) => (
                    <tr key={item.campaignId} className="hover:bg-[#12151f]/50 transition-colors">
                      <td className="p-3.5 pl-5">
                        <div className="font-semibold text-white">{item.campaignName}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">Slug: {item.customSlug}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          {getChannelIcon(item.channelType)}
                          <span className="text-[11px] font-medium">{item.channelType.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-mono font-semibold text-slate-300">
                        {item.totalClicks}
                      </td>
                      <td className="p-3.5 text-center font-mono font-semibold text-emerald-400">
                        {item.totalLeads}
                      </td>
                      <td className="p-3.5 text-center font-mono text-amber-300">
                        {item.totalVisits}
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-[#ccb67b]">
                        {item.totalDeals}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-white">
                        {formatINR(item.grossBrokerageRupees)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-semibold text-indigo-400">
                        ₹{item.revenuePerClick}
                      </td>
                      <td className="p-3.5 pr-5 text-right font-mono font-bold text-emerald-400">
                        {formatINR(item.firmNetRupees)}
                      </td>
                    </tr>
                  ))}
                  {contentRoi.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No content ROI campaigns found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Broker Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {leaderboard.slice(0, 3).map((agent, idx) => (
              <div
                key={agent.userId}
                className={`p-6 rounded-2xl border shadow-xl relative overflow-hidden ${
                  idx === 0
                    ? 'bg-gradient-to-b from-[#1b202c] to-[#252014] border-[#b59658] shadow-[#b59658]/10'
                    : 'bg-[#1b202c]/90 border-[#b59658]/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#12151f] text-[#ccb67b] border border-[#b59658]/30 font-bold uppercase">
                    Rank #{idx + 1}
                  </span>
                </div>

                <div className="mt-4">
                  <h4 className="font-bold text-lg text-white font-display">{agent.fullName}</h4>
                  <p className="text-[11px] text-slate-400 font-mono">{agent.role.replace('_', ' ')}</p>
                </div>

                <div className="mt-5 space-y-2 border-t border-[#b59658]/20 pt-4 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Deals Closed:</span>
                    <span className="font-bold text-emerald-400">{agent.dealsClosed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Site Visits:</span>
                    <span className="text-white">{agent.visitsConducted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Visit-to-Deal:</span>
                    <span className="text-amber-300">{agent.visitConversionRate}%</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-[#b59658]/10">
                    <span className="text-slate-300 font-semibold">Gross Brokerage:</span>
                    <span className="font-bold text-[#ccb67b]">{formatINR(agent.grossBrokerageGenerated)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rep Earned Incentive:</span>
                    <span className="font-bold text-emerald-400">{formatINR(agent.repIncentiveEarned)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-[#b59658]/20 font-bold text-white text-sm font-display">
              All Sales Executives &amp; Advisors
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-[#12151f]/80 text-slate-400 font-mono uppercase text-[10px] border-b border-[#b59658]/20">
                <tr>
                  <th className="p-3.5 pl-5">Rank</th>
                  <th className="p-3.5">Broker Name</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5 text-center">Assigned Leads</th>
                  <th className="p-3.5 text-center">Portals</th>
                  <th className="p-3.5 text-center">Visits</th>
                  <th className="p-3.5 text-center">Deals</th>
                  <th className="p-3.5 text-right">Gross Brokerage</th>
                  <th className="p-3.5 pr-5 text-right">Incentive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#b59658]/10 text-slate-300">
                {leaderboard.map((broker) => (
                  <tr key={broker.userId} className="hover:bg-[#12151f]/50 transition-colors">
                    <td className="p-3.5 pl-5 font-mono font-bold text-[#ccb67b]">#{broker.rank}</td>
                    <td className="p-3.5 font-semibold text-white">{broker.fullName}</td>
                    <td className="p-3.5 text-[11px] text-slate-400">{broker.role}</td>
                    <td className="p-3.5 text-center font-mono">{broker.assignedLeads}</td>
                    <td className="p-3.5 text-center font-mono">{broker.portalsCreated}</td>
                    <td className="p-3.5 text-center font-mono text-amber-300">{broker.visitsConducted}</td>
                    <td className="p-3.5 text-center font-mono font-bold text-emerald-400">{broker.dealsClosed}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-white">{formatINR(broker.grossBrokerageGenerated)}</td>
                    <td className="p-3.5 pr-5 text-right font-mono font-bold text-emerald-400">{formatINR(broker.repIncentiveEarned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Conversion Funnel */}
      {activeTab === 'funnel' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#1b202c]/90 border border-[#b59658]/30 p-6 shadow-xl space-y-6">
            <div>
              <h3 className="font-bold text-white text-base font-display">Customer Conversion Funnel Velocity</h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Tracks lead progression from initial organic social capture to verified closing.
              </p>
            </div>

            <div className="space-y-4">
              {funnel.map((stage, idx) => (
                <div key={stage.stageId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{stage.stageName}</span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="font-bold text-[#ccb67b]">{stage.count} Leads</span>
                      {idx > 0 && (
                        <span className="text-[11px] text-slate-400">
                          ({stage.conversionFromPreviousPercent}% retained • {stage.dropOffRatePercent}% drop-off)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full h-4 rounded-full bg-[#12151f] border border-[#b59658]/20 overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] transition-all duration-500"
                      style={{
                        width: `${Math.max(8, funnel[0]?.count ? (stage.count / funnel[0].count) * 100 : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Cash Flow Forecast */}
      {activeTab === 'cashflow' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#1b202c]/90 border border-amber-500/30">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">1. Token Received</div>
              <div className="text-xl font-bold font-mono text-amber-300 mt-2">
                {formatINR(cashFlow.tokenReceivedAmount || 0)}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Pending developer deal registration</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#1b202c]/90 border border-blue-500/30">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">2. Agreement Registered</div>
              <div className="text-xl font-bold font-mono text-blue-300 mt-2">
                {formatINR(cashFlow.agreementRegisteredAmount || 0)}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Ready for GST invoice generation</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#1b202c]/90 border border-purple-500/30">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">3. Invoice Dispatched</div>
              <div className="text-xl font-bold font-mono text-purple-300 mt-2">
                {formatINR(cashFlow.invoiceSentAmount || 0)}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Awaiting developer RTGS payment</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#1b202c]/90 border border-emerald-500/30">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">4. Payment Received</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-2">
                {formatINR(cashFlow.paymentReceivedAmount || 0)}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Bank cleared brokerage collections</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-lg text-xs font-mono space-y-2">
            <div className="flex justify-between text-sm font-bold text-white font-display border-b border-[#b59658]/20 pb-2">
              <span>Receivables &amp; Liability Summary</span>
              <span>Amount (INR)</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Total Cumulative Brokerage Value:</span>
              <span className="font-bold text-white">{formatINR(cashFlow.totalPipelineGross || 0)}</span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>Realized Firm Net Collections:</span>
              <span className="font-bold">{formatINR(cashFlow.totalRealizedFirmNet || 0)}</span>
            </div>
            <div className="flex justify-between text-amber-300">
              <span>Pending Rep Commission Liabilities:</span>
              <span className="font-bold">{formatINR(cashFlow.totalPendingRepPayouts || 0)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
