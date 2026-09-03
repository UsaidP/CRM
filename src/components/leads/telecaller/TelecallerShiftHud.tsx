'use client';

import React from 'react';
import {
  Zap,
  PhoneCall,
  Clock,
  Car,
  TrendingUp,
  RotateCcw,
  Flame,
  Pause,
  Play,
  FastForward,
  CheckCircle2
} from 'lucide-react';

export interface ShiftStats {
  callsMade: number;
  totalDurationSec: number;
  visitsBooked: number;
  connectedCalls: number;
  targetVisits: number;
}

interface TelecallerShiftHudProps {
  stats: ShiftStats;
  autoAdvanceEnabled: boolean;
  onToggleAutoAdvance: () => void;
  countdown: number | null; // e.g. 5, 4, 3, 2, 1, 0 or null if not counting
  onCancelCountdown: () => void;
  onSkipCountdownNow: () => void;
  onEndDutyAndBackup: () => void;
}

export function TelecallerShiftHud({
  stats,
  autoAdvanceEnabled,
  onToggleAutoAdvance,
  countdown,
  onCancelCountdown,
  onSkipCountdownNow,
  onEndDutyAndBackup,
}: TelecallerShiftHudProps) {
  // Format total seconds into mm:ss or hh:mm:ss
  const formatDuration = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  const avgTalkTimeSec = stats.callsMade > 0 ? Math.round(stats.totalDurationSec / stats.callsMade) : 0;
  const connectRatePercent = stats.callsMade > 0 ? Math.round((stats.connectedCalls / stats.callsMade) * 100) : 0;

  return (
    <div className="rounded-2xl bg-surface border border-border shadow-xs overflow-hidden transition-all">
      {/* Top Header & Metrics Bar */}
      <div className="p-3.5 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 sm:gap-4">
        {/* Title & Speed Tag */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-accent text-white shadow-xs shrink-0">
            <Zap className="w-4 sm:w-5 h-4 sm:h-5 fill-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-content font-display flex items-center gap-2 truncate">
              <span className="truncate">High-Velocity Telecaller Console</span>
              <span className="hidden sm:inline text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-status-success-surface text-status-success border border-status-success/30 shrink-0">
                ⚡ Super Desk
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-content-secondary truncate">
              Sub-15m speed-to-lead queue • Auto-advance power mode • Live inventory pitching
            </p>
          </div>
        </div>

        {/* Live Shift Metrics Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 flex-wrap">
          {/* Metric 1: Calls Made */}
          <div className="px-3 py-1.5 rounded-xl bg-surface-subtle border border-border flex items-center gap-2">
            <div className="p-1 rounded-lg bg-accent-soft text-accent shrink-0">
              <PhoneCall className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-content-muted font-medium uppercase tracking-wider">Calls Today</div>
              <div className="text-xs sm:text-sm font-bold font-mono text-content">{stats.callsMade}</div>
            </div>
          </div>

          {/* Metric 2: Talk Time */}
          <div className="px-3 py-1.5 rounded-xl bg-surface-subtle border border-border flex items-center gap-2">
            <div className="p-1 rounded-lg bg-status-info-surface text-status-info shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-content-muted font-medium uppercase tracking-wider">Total Time</div>
              <div className="text-xs sm:text-sm font-bold font-mono text-content">{formatDuration(stats.totalDurationSec)}</div>
            </div>
          </div>

          {/* Metric 3: Connect Rate */}
          <div className="px-3 py-1.5 rounded-xl bg-surface-subtle border border-border flex items-center gap-2">
            <div className="p-1 rounded-lg bg-status-success-surface text-status-success shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-content-muted font-medium uppercase tracking-wider">Connect Rate</div>
              <div className="text-xs sm:text-sm font-bold font-mono text-content">{connectRatePercent}%</div>
            </div>
          </div>

          {/* Metric 4: Site Visits Booked */}
          <div className="px-3 py-1.5 rounded-xl bg-surface-subtle border border-border flex items-center gap-2">
            <div className="p-1 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
              <Car className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-content-muted font-medium uppercase tracking-wider">Visits Booked</div>
              <div className="text-xs sm:text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
                {stats.visitsBooked} <span className="text-[10px] font-normal text-content-muted">/ {stats.targetVisits}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls: Auto-Advance Toggle & End Duty */}
        <div className="flex items-center gap-2 shrink-0 pt-1 xl:pt-0">
          {/* Auto-Advance Mode Toggle */}
          <button
            type="button"
            onClick={onToggleAutoAdvance}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              autoAdvanceEnabled
                ? 'bg-accent text-white border-accent shadow-xs'
                : 'bg-surface-subtle text-content-secondary hover:text-content border-border'
            }`}
            title="When ON, completing a call automatically loads the next lead in 5 seconds"
          >
            <Zap className={`w-3.5 h-3.5 ${autoAdvanceEnabled ? 'fill-white' : ''}`} />
            <span>Auto-Advance: {autoAdvanceEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* End of Duty & Backup */}
          <button
            type="button"
            onClick={onEndDutyAndBackup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-xs transition-all active:scale-98 cursor-pointer"
            title="End calling shift & backup leads"
          >
            <Flame className="w-3.5 h-3.5 text-amber-200" />
            <span className="hidden sm:inline">End Duty &amp; Backup</span>
            <span className="sm:hidden">Backup</span>
          </button>
        </div>
      </div>

      {/* Auto-Advance Active Countdown Progress Bar */}
      {countdown !== null && (
        <div className="bg-accent-soft/80 border-t border-accent/20 px-4 py-2 flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-ping shrink-0" />
            <span className="text-xs font-bold text-accent-text truncate">
              Auto-advancing to next prospect in <span className="font-mono text-sm underline">{countdown}s</span>...
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onSkipCountdownNow}
              className="px-2.5 py-1 rounded-lg bg-accent text-white text-xs font-bold flex items-center gap-1 hover:opacity-90 transition-all cursor-pointer shadow-2xs"
            >
              <FastForward className="w-3 h-3" />
              <span>Next Now</span>
            </button>
            <button
              type="button"
              onClick={onCancelCountdown}
              className="px-2.5 py-1 rounded-lg bg-surface text-content text-xs font-medium border border-border hover:bg-surface-subtle transition-all cursor-pointer"
            >
              <Pause className="w-3 h-3" />
              <span>Hold</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
