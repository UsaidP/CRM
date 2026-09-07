'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  MapPin,
  Flame,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Info,
  Clock,
  DollarSign
} from 'lucide-react';
import { FunnelChart } from '@/components/charts/funnel-chart';
import { AreaChart, Area } from '@/components/charts/area-chart';
import { BarChart } from '@/components/charts/bar-chart';
import { Bar } from '@/components/charts/bar';
import { BarXAxis } from '@/components/charts/bar-x-axis';
import { XAxis } from '@/components/charts/x-axis';
import { Grid } from '@/components/charts/grid';
import {
  buildPipelineFunnelStages,
  buildCashFlowTimeSeries,
  buildMarketInventoryBars,
  buildSlaVelocityMetrics,
  FunnelStageData
} from '@/lib/domain/dashboard-analytics';

interface DashboardAnalyticsSuiteProps {
  filteredLeads: any[];
  filteredDeals: any[];
  filteredUnits: any[];
  timeRange: 'today' | '7d' | '30d' | 'all';
  selectedMarket: 'ALL' | 'KHARGHAR' | 'TALOJA' | 'PANVEL';
}

export function DashboardAnalyticsSuite({
  filteredLeads,
  filteredDeals,
  filteredUnits,
  timeRange,
  selectedMarket
}: DashboardAnalyticsSuiteProps) {
  const [activeTab, setActiveTab] = useState<'funnel' | 'cashflow' | 'market' | 'sla'>('funnel');
  const [selectedFunnelIndex, setSelectedFunnelIndex] = useState<number | null>(null);

  const formatINR = (val: number) => {
    if (!val && val !== 0) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  // 1. Funnel Stages Data
  const funnelStages: FunnelStageData[] = useMemo(() => {
    return buildPipelineFunnelStages(filteredLeads);
  }, [filteredLeads]);

  // 2. Cash Flow Time Series Data
  const cashFlowPoints = useMemo(() => {
    return buildCashFlowTimeSeries(filteredDeals, timeRange);
  }, [filteredDeals, timeRange]);

  // 3. Market Inventory Bars Data
  const marketBars = useMemo(() => {
    return buildMarketInventoryBars(filteredUnits);
  }, [filteredUnits]);

  // 4. SLA Metrics
  const slaMetrics = useMemo(() => {
    return buildSlaVelocityMetrics(filteredLeads);
  }, [filteredLeads]);

  // Totals for header KPIs
  const totalGross = useMemo(() => {
    return cashFlowPoints.reduce((acc, p) => acc + p.grossBrokerage, 0);
  }, [cashFlowPoints]);

  const totalNet = useMemo(() => {
    return cashFlowPoints.reduce((acc, p) => acc + p.realizedNet, 0);
  }, [cashFlowPoints]);

  const activeStage = selectedFunnelIndex !== null ? funnelStages[selectedFunnelIndex] : null;

  // Responsive breakpoint tracking for chart layout adjustments
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div className="bg-surface border border-border rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-xs space-y-4 sm:space-y-6 w-full">
      {/* ─── Suite Header & Dynamic View Switcher ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-soft text-accent-text border border-accent/20 uppercase tracking-wider">
              <Zap className="w-3 h-3 text-accent" />
              Real-Time Telemetry
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono text-content-muted">
              Scope: {selectedMarket === 'ALL' ? 'All Hubs' : selectedMarket} &bull; {timeRange.toUpperCase()}
            </span>
          </div>
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-content font-display tracking-tight flex items-center gap-2">
            Dynamic Advisory Intelligence &amp; Analytics
          </h2>
          <p className="text-xs text-content-secondary mt-0.5">
            Interactive visualizers for conversion velocity, gross commission curves, and micro-market depth.
          </p>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-surface-subtle p-1 rounded-xl border border-border text-xs font-bold overflow-x-auto no-scrollbar touch-scroll w-full lg:w-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('funnel')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-[11px] sm:text-xs shrink-0 ${
              activeTab === 'funnel'
                ? 'bg-accent text-white shadow-2xs font-bold'
                : 'text-content-muted hover:text-content hover:bg-surface'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
            <span>Pipeline Funnel</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cashflow')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-[11px] sm:text-xs shrink-0 ${
              activeTab === 'cashflow'
                ? 'bg-accent text-white shadow-2xs font-bold'
                : 'text-content-muted hover:text-content hover:bg-surface'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            <span>Cash Flow Curve</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('market')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-[11px] sm:text-xs shrink-0 ${
              activeTab === 'market'
                ? 'bg-accent text-white shadow-2xs font-bold'
                : 'text-content-muted hover:text-content hover:bg-surface'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>Market Depth</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sla')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-[11px] sm:text-xs shrink-0 ${
              activeTab === 'sla'
                ? 'bg-accent text-white shadow-2xs font-bold'
                : 'text-content-muted hover:text-content hover:bg-surface'
            }`}
          >
            <Flame className="w-3.5 h-3.5 shrink-0" />
            <span>Speed SLA</span>
          </button>
        </div>
      </div>

      {/* ─── TAB 1: PIPELINE FUNNEL (BKLIT FUNNEL CHART) ─── */}
      {activeTab === 'funnel' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Interactive Stages Card List */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-content-secondary">
                  Pipeline Stage Breakdown
                </span>
                <span className="text-[11px] font-mono text-accent-text font-bold">
                  Total Active: {filteredLeads.length} Leads
                </span>
              </div>

              <div className="space-y-2">
                {funnelStages.map((stage, idx) => {
                  const isSelected = selectedFunnelIndex === idx;
                  return (
                    <div
                      key={stage.label}
                      onClick={() => setSelectedFunnelIndex(isSelected ? null : idx)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-accent-soft border-accent shadow-xs'
                          : 'bg-surface hover:bg-surface-subtle border-border'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: stage.color || '#3B82F6' }}
                          />
                          <span className="text-xs font-bold text-content">{stage.label}</span>
                        </div>
                        <span className="text-[10px] text-content-muted font-mono pl-4.5 block">
                          Relative Pipeline Velocity: {stage.percentage}%
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black font-mono text-content">{stage.value}</span>
                        <span className="text-[10px] font-mono text-content-muted block">leads</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bklit Animated Funnel Visualization Container */}
            <div className="lg:col-span-6 p-4 sm:p-6 rounded-2xl bg-surface-subtle border border-border flex flex-col items-center justify-center text-center relative min-h-[320px] sm:min-h-[360px]">
              <div className="w-full flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-content-secondary">
                  Animated Funnel Geometry
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface text-content-secondary border border-border">
                  Click / Hover to Inspect
                </span>
              </div>

              <div className="w-full max-w-[360px] sm:max-w-[420px] mx-auto py-1 sm:py-2">
                <FunnelChart
                  data={funnelStages}
                  orientation="vertical"
                  showPercentage={true}
                  showValues={true}
                  showLabels={!isMobile}
                  hoveredIndex={selectedFunnelIndex}
                  onHoverChange={(idx) => setSelectedFunnelIndex(idx)}
                  className="w-full"
                  formatValue={(v) => `${v} leads`}
                  formatPercentage={(p) => `${p}%`}
                />
              </div>

              {/* Stage Insight Banner */}
              {activeStage ? (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 rounded-xl bg-surface border border-accent/40 w-full text-left flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-accent-text block">{activeStage.label}</span>
                    <span className="text-[11px] text-content-secondary">
                      {activeStage.value} leads currently situated at this operational milestone.
                    </span>
                  </div>
                  <span className="text-sm font-mono font-black text-accent-text">
                    {activeStage.percentage}% of Top
                  </span>
                </motion.div>
              ) : (
                <p className="text-[11px] text-content-muted font-mono mt-3">
                  Overall conversion from Inbound to Closed Won: {((funnelStages[5]?.value || 0) / Math.max(1, filteredLeads.length) * 100).toFixed(1)}%
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: CASH FLOW CURVE (BKLIT AREA CHART) ─── */}
      {activeTab === 'cashflow' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Financial Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-3.5 sm:p-4 rounded-xl bg-surface-subtle border border-border">
              <span className="text-[11px] font-mono font-bold uppercase text-content-muted block mb-1">
                Gross Commission Pipeline
              </span>
              <span className="text-lg sm:text-xl font-black font-display text-content">{formatINR(totalGross)}</span>
              <span className="text-[10px] text-content-secondary block mt-0.5">Across {filteredDeals.length} deals</span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-surface-subtle border border-border">
              <span className="text-[11px] font-mono font-bold uppercase text-content-muted block mb-1">
                Realized Net Cashflow
              </span>
              <span className="text-lg sm:text-xl font-black font-display text-status-success">{formatINR(totalNet)}</span>
              <span className="text-[10px] text-status-success block mt-0.5">Firm retained brokerage</span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-surface-subtle border border-border">
              <span className="text-[11px] font-mono font-bold uppercase text-content-muted block mb-1">
                Retention Margin
              </span>
              <span className="text-lg sm:text-xl font-black font-display text-accent">
                {totalGross > 0 ? Math.round((totalNet / totalGross) * 100) : 70}%
              </span>
              <span className="text-[10px] text-content-secondary block mt-0.5">Net margin after rep split</span>
            </div>
          </div>

          {/* Bklit Composable Area Chart */}
          <div className="p-4 sm:p-6 rounded-2xl bg-surface-subtle border border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-content font-display">
                  Commission Velocity &amp; Cash Flow Series
                </h3>
                <p className="text-[11px] text-content-muted font-mono">
                  Daily brokerage trajectory (Gross vs Realized Net)
                </p>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shrink-0" />
                  <span>Gross Brokerage</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                  <span>Realized Net</span>
                </span>
              </div>
            </div>

            <div className="w-full relative min-h-[240px] sm:min-h-[280px]">
              <AreaChart
                data={cashFlowPoints}
                xDataKey="date"
                aspectRatio={undefined}
                className="w-full h-[240px] sm:h-[280px] md:h-[340px]"
                animationDuration={400}
                margin={{ top: 15, right: 15, bottom: 35, left: 30 }}
              >
                <Grid horizontal strokeDasharray="3 3" strokeOpacity={0.25} />
                <Area
                  dataKey="grossBrokerage"
                  fill="#3B82F6"
                  stroke="#2563EB"
                  fillOpacity={0.25}
                  strokeWidth={2.5}
                />
                <Area
                  dataKey="realizedNet"
                  fill="#10B981"
                  stroke="#059669"
                  fillOpacity={0.35}
                  strokeWidth={2.5}
                />
                <XAxis numTicks={5} />
              </AreaChart>

              {totalGross === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
                  <div className="px-3.5 py-2 rounded-xl bg-surface/90 backdrop-blur-xs border border-border shadow-xs text-center max-w-sm">
                    <span className="text-xs font-mono font-bold text-content flex items-center gap-1.5 justify-center">
                      <Clock className="w-3.5 h-3.5 text-accent" />
                      Zero Closed Transactions in Scope
                    </span>
                    <span className="text-[10px] text-content-secondary block mt-0.5 font-mono">
                      Baseline curve active &bull; Dynamic trajectory populates on deal booking
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: MICRO-MARKET INVENTORY DEPTH (BKLIT BAR CHART) ─── */}
      {activeTab === 'market' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-center">
            {/* Market Summaries */}
            <div className="lg:col-span-5 space-y-2.5 sm:space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-content-secondary block">
                Geographic Nodes &amp; Asset Value
              </span>

              <div className="space-y-2.5 sm:space-y-3">
                {marketBars.map((m) => (
                  <div
                    key={m.market}
                    className="p-3 sm:p-3.5 rounded-xl bg-surface border border-border space-y-2 hover:border-accent/40 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-content flex items-center gap-1.5 font-display">
                        <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                        {m.market} Node
                      </span>
                      <span className="text-xs font-mono font-black text-accent-text">
                        {formatINR(m.valuation)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono">
                      <span className="text-status-success">{m.active} Fresh Marketable</span>
                      <span className="text-content-muted">{m.stale} Needs Verification</span>
                    </div>

                    <div className="h-2 w-full bg-surface-subtle rounded-full overflow-hidden border border-border flex">
                      <div
                        style={{ width: `${Math.round((m.active / Math.max(1, m.total)) * 100)}%` }}
                        className="bg-status-success h-full transition-all duration-500"
                        title="Active Fresh"
                      />
                      <div
                        style={{ width: `${Math.round((m.stale / Math.max(1, m.total)) * 100)}%` }}
                        className="bg-amber-500/40 h-full transition-all duration-500"
                        title="Stale"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bklit Bar Chart Container */}
            <div className="lg:col-span-7 p-4 sm:p-6 rounded-2xl bg-surface-subtle border border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-content font-display">
                    Comparative Inventory Concentration
                  </h3>
                  <p className="text-[11px] text-content-muted font-mono">
                    Marketable units by micro-market sector
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                    <span>Active</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shrink-0" />
                    <span>Stale</span>
                  </span>
                </div>
              </div>

              <div className="w-full relative min-h-[240px] sm:min-h-[280px]">
                <BarChart
                  data={marketBars}
                  xDataKey="market"
                  aspectRatio={undefined}
                  className="w-full h-[240px] sm:h-[280px] md:h-[320px]"
                  animationDuration={300}
                  enterTransition={{ duration: 0.35, ease: 'easeOut' }}
                  margin={{ top: 15, right: 15, bottom: 35, left: 25 }}
                >
                  <Grid horizontal strokeDasharray="3 3" strokeOpacity={0.25} />
                  <Bar dataKey="active" fill="#10B981" minBarHeight={6} animate={false} />
                  <Bar dataKey="stale" fill="#F59E0B" minBarHeight={6} animate={false} />
                  <BarXAxis showAllLabels={true} />
                </BarChart>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: SPEED SLA VELOCITY ─── */}
      {activeTab === 'sla' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-3.5 sm:p-4 rounded-xl bg-surface-subtle border border-border">
              <span className="text-[11px] font-mono font-bold uppercase text-content-muted block mb-1">
                SLA Compliance Rate
              </span>
              <span className="text-xl sm:text-2xl font-black font-display text-status-success">
                {slaMetrics.complianceRate}%
              </span>
              <span className="text-[10px] text-status-success block mt-0.5">Contacted within 15 mins</span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-surface-subtle border border-border">
              <span className="text-[11px] font-mono font-bold uppercase text-content-muted block mb-1">
                Average Speed to Touch
              </span>
              <span className="text-xl sm:text-2xl font-black font-display text-accent">
                {slaMetrics.averageResponseMinutes} mins
              </span>
              <span className="text-[10px] text-content-secondary block mt-0.5">From inbound webhook trigger</span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-surface-subtle border border-border">
              <span className="text-[11px] font-mono font-bold uppercase text-content-muted block mb-1">
                Breached Escalations
              </span>
              <span className="text-xl sm:text-2xl font-black font-display text-status-danger">
                {slaMetrics.over1h}
              </span>
              <span className="text-[10px] text-status-danger block mt-0.5">Exceeded 1-hour window</span>
            </div>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl bg-surface-subtle border border-border space-y-3 sm:space-y-4">
            <h3 className="text-sm font-bold text-content font-display">
              Response Latency Distribution
            </h3>

            <div className="space-y-2.5 sm:space-y-3">
              {[
                { label: '< 5 Minutes (Gold Standard)', count: slaMetrics.under5m, color: 'bg-status-success', pct: 70 },
                { label: '5 – 15 Minutes (Acceptable Window)', count: slaMetrics.under15m, color: 'bg-blue-500', pct: 20 },
                { label: '15 – 30 Minutes (Warning Threshold)', count: slaMetrics.under30m, color: 'bg-amber-500', pct: 7 },
                { label: '> 1 Hour (SLA Breached)', count: slaMetrics.over1h, color: 'bg-status-danger', pct: 3 },
              ].map((tier) => (
                <div key={tier.label} className="p-3 sm:p-3.5 rounded-xl bg-surface border border-border space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-content truncate pr-2">{tier.label}</span>
                    <span className="font-mono font-bold text-accent-text shrink-0">{tier.count} leads</span>
                  </div>
                  <div className="h-2 w-full bg-surface-subtle rounded-full overflow-hidden border border-border">
                    <div
                      style={{ width: `${tier.pct}%` }}
                      className={`h-full ${tier.color} rounded-full transition-all duration-500`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
