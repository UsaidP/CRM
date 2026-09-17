'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Car,
  TrendingUp,
  UserCheck,
  Star,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Target
} from 'lucide-react';
import { FunnelChart } from '@/components/charts/funnel-chart';
import {
  calculateVisitKpis,
  buildVisitConversionFunnel,
  buildBrokerVisitLeaderboard,
  buildOutcomeDistribution,
  VisitFunnelStage
} from '@/lib/domain/visit-analytics';

interface SiteVisitAnalyticsPanelProps {
  filteredVisits: any[];
  filteredDeals?: any[];
  timeRange?: 'today' | '7d' | '30d' | 'all';
}

export function SiteVisitAnalyticsPanel({
  filteredVisits,
  filteredDeals = [],
  timeRange = 'all'
}: SiteVisitAnalyticsPanelProps) {
  const [selectedStageIndex, setSelectedStageIndex] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Compute Domain Metrics
  const kpis = useMemo(() => calculateVisitKpis(filteredVisits), [filteredVisits]);
  const funnelStages = useMemo(
    () => buildVisitConversionFunnel(filteredVisits, filteredDeals),
    [filteredVisits, filteredDeals]
  );
  const brokerLeaderboard = useMemo(
    () => buildBrokerVisitLeaderboard(filteredVisits),
    [filteredVisits]
  );
  const outcomeDistribution = useMemo(
    () => buildOutcomeDistribution(filteredVisits),
    [filteredVisits]
  );

  // Map to FunnelChart format
  const chartData = useMemo(() => {
    return funnelStages.map((s) => ({
      label: s.label,
      value: s.count,
      displayValue: `${s.count} tours`,
      percentage: s.percentage,
      color: s.color,
      gradient: s.gradient,
    }));
  }, [funnelStages]);

  const activeStage = selectedStageIndex !== null ? funnelStages[selectedStageIndex] : null;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ─── 1. EXECUTIVE KPI STRIP (SITE VISIT AS PRIMARY METRIC) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Scheduled */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-surface-subtle border border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase text-content-muted">
              Total Tours
            </span>
            <Calendar className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <span className="text-xl sm:text-2xl font-black font-display text-content block">
            {kpis.totalVisits}
          </span>
          <span className="text-[10px] text-content-secondary block mt-0.5">
            {kpis.scheduledCount} upcoming • {kpis.completedCount} attended
          </span>
        </div>

        {/* Confirmation Rate */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-surface-subtle border border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase text-content-muted">
              Confirmation Rate
            </span>
            <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <span className="text-xl sm:text-2xl font-black font-display text-indigo-500 block">
            {kpis.confirmationRate}%
          </span>
          <span className="text-[10px] text-content-secondary block mt-0.5">
            {kpis.confirmedCount} buyer-confirmed slots
          </span>
        </div>

        {/* Attended / Completed */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-surface-subtle border border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase text-content-muted">
              Completion Rate
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
          </div>
          <span className="text-xl sm:text-2xl font-black font-display text-status-success block">
            {kpis.completionRate}%
          </span>
          <span className="text-[10px] text-content-secondary block mt-0.5">
            {kpis.completedCount} tours physically completed
          </span>
        </div>

        {/* No-Show Rate */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-surface-subtle border border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase text-content-muted">
              No-Show Rate
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <span className={`text-xl sm:text-2xl font-black font-display block ${kpis.noShowRate > 25 ? 'text-rose-500' : 'text-content'}`}>
            {kpis.noShowRate}%
          </span>
          <span className="text-[10px] text-content-secondary block mt-0.5">
            {kpis.noShowCount} missed appointments
          </span>
        </div>

        {/* Token Submissions */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-surface-subtle border border-border col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase text-content-muted">
              Instant Tokens
            </span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black font-display text-amber-500">
              {kpis.tokenCount}
            </span>
            {kpis.completedCount > 0 && (
              <span className="text-[10px] font-mono font-bold text-content-muted">
                ({Math.round((kpis.tokenCount / kpis.completedCount) * 100)}% close rate)
              </span>
            )}
          </div>
          <span className="text-[10px] text-content-secondary block mt-0.5">
            {kpis.avgRating > 0 ? `★ ${kpis.avgRating}/5 avg rating` : 'Awaiting tour ratings'}
          </span>
        </div>
      </div>

      {/* ─── 2. SITE VISIT CONVERSION FUNNEL (SYMMETRICAL DUAL-COLUMN) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
        {/* Left: Interactive Funnel Stages */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-content-secondary flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-accent" />
              Visit Lifecycle Funnel
            </span>
            <span className="text-[11px] font-mono text-accent-text font-bold bg-accent-soft px-2.5 py-0.5 rounded-md border border-accent/20">
              {kpis.totalVisits} Total Tours
            </span>
          </div>

          <div className="space-y-2 flex-1 flex flex-col justify-between">
            {funnelStages.map((stage, idx) => {
              const isSelected = selectedStageIndex === idx;

              return (
                <div
                  key={stage.id}
                  onClick={() => setSelectedStageIndex(isSelected ? null : idx)}
                  onMouseEnter={() => setSelectedStageIndex(idx)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? 'bg-accent-soft/70 border-accent shadow-xs ring-1 ring-accent/30'
                      : 'bg-surface hover:bg-surface-subtle border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="text-xs font-bold text-content truncate font-display">
                        {stage.label}
                      </span>
                    </div>

                    <div className="text-right shrink-0 flex items-baseline gap-1.5">
                      <span className="text-sm font-black font-mono text-content tabular-nums">{stage.count}</span>
                      <span className="text-[10px] font-mono text-content-muted">tours</span>
                      {idx > 0 && (
                        <span className="text-[10px] font-mono font-bold text-accent-text bg-accent-soft px-1.5 py-0.5 rounded">
                          {stage.conversionFromPrev}% gate
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Micro Progress Bar */}
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                    <div className="h-1.5 flex-1 bg-surface-subtle rounded-full overflow-hidden border border-border/40">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(stage.percentage, stage.count > 0 ? 8 : 0)}%`,
                          backgroundColor: stage.color,
                        }}
                      />
                    </div>
                    <span className="text-content-muted shrink-0 tabular-nums">
                      {stage.percentage}% of scheduled
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Animated Bklit Funnel Geometry + Stage Inspector */}
        <div className="lg:col-span-6 p-4 sm:p-5 rounded-2xl bg-surface-subtle border border-border flex flex-col justify-between">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-content-secondary flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-accent" />
              Funnel Drop-Off Dynamics
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface text-content-secondary border border-border shadow-2xs">
              Hover / Click to Inspect
            </span>
          </div>

          {/* Proportional Vertical Funnel Chart */}
          <div className="w-full max-w-[380px] sm:max-w-[420px] mx-auto py-2 flex-1 flex items-center justify-center">
            <FunnelChart
              data={chartData}
              orientation="vertical"
              showPercentage={true}
              showValues={true}
              showLabels={!isMobile}
              hoveredIndex={selectedStageIndex}
              onHoverChange={(idx) => setSelectedStageIndex(idx)}
              className="w-full"
            />
          </div>

          {/* Live Stage Inspector Card */}
          <div className="mt-3 p-3 rounded-xl bg-surface border border-border text-xs space-y-1.5">
            {activeStage ? (
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold font-display text-content flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeStage.color }} />
                    {activeStage.label}
                  </span>
                  <span className="font-mono font-bold text-accent-text">
                    {activeStage.count} Tours ({activeStage.percentage}%)
                  </span>
                </div>
                <p className="text-[11px] text-content-secondary mt-1">
                  {activeStage.description}
                </p>
                <div className="mt-1 text-[10px] text-content-muted font-mono flex items-center gap-2">
                  <span>Step-to-step retention: <strong>{activeStage.conversionFromPrev}%</strong></span>
                  <span>•</span>
                  <span>Reschedules recorded: <strong>{kpis.rescheduleCount}</strong></span>
                </div>
              </div>
            ) : (
              <div className="text-center text-content-muted py-1">
                Hover over or select any gate to inspect drop-off rates and sales recommendations.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 3. OPERATIONAL WORKBENCHES: BROKER LEADERBOARD & OUTCOMES ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Escort Broker Leaderboard */}
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="text-xs sm:text-sm font-bold text-content font-display flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Escort Broker Tour Performance
            </h3>
            <span className="text-[10px] font-mono text-content-secondary">
              Ranked by Completed Tours
            </span>
          </div>

          {brokerLeaderboard.length === 0 ? (
            <div className="py-8 text-center text-content-muted text-xs">
              No site visits assigned to brokers yet.
            </div>
          ) : (
            <div className="space-y-2">
              {brokerLeaderboard.slice(0, 5).map((broker, idx) => (
                <div
                  key={broker.brokerId}
                  className="p-3 rounded-xl bg-surface-subtle border border-border flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-accent-soft text-accent-text font-bold text-xs flex items-center justify-center font-mono shrink-0">
                      #{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <strong className="text-content block truncate font-sans">{broker.brokerName}</strong>
                      <span className="text-[10px] text-content-muted block truncate">
                        {broker.totalAssigned} tours • {broker.completionRate}% completion rate
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 font-mono text-right">
                    <div>
                      <span className="text-xs font-bold text-content block">
                        {broker.completedCount} done
                      </span>
                      <span className="text-[10px] text-content-muted">
                        {broker.noShowCount > 0 ? `${broker.noShowCount} no-shows` : '0 no-shows'}
                      </span>
                    </div>

                    {broker.tokenCount > 0 && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px] border border-amber-500/20">
                        {broker.tokenCount} {broker.tokenCount === 1 ? 'token' : 'tokens'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Post-Tour Outcomes & Objections Breakdown */}
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="text-xs sm:text-sm font-bold text-content font-display flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-accent" />
              Post-Tour Outcome Telemetry
            </h3>
            <span className="text-[10px] font-mono text-content-secondary">
              Logged Buyer Feedback
            </span>
          </div>

          <div className="space-y-2.5">
            {outcomeDistribution.map((item) => (
              <div key={item.outcome} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-content font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                  <span className="font-mono text-content-secondary text-[11px]">
                    <strong>{item.count}</strong> tours ({item.percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-surface-subtle rounded-full overflow-hidden border border-border/40">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-content-secondary">
            <span className="flex items-center gap-1">
              <RotateCcw className="w-3 h-3 text-accent" />
              Reschedules: <strong className="text-content">{kpis.rescheduleCount}</strong> ({kpis.rescheduleRate}%)
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-500" />
              Avg Buyer Rating: <strong className="text-content">{kpis.avgRating > 0 ? `${kpis.avgRating}/5` : 'N/A'}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
