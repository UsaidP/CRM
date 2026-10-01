'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlarmClockOff,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  MessageCircle,
  PhoneCall,
  RefreshCw,
} from 'lucide-react';
import { fetchReminders, resolveReminderLeadName, resolveReminderPhone, updateReminder, type ReminderListItem } from '@/lib/client/calendar';
import { CompleteReminderPrompt } from '@/components/reminders/CompleteReminderPrompt';
import { toast } from '@/lib/client/toast';

const POLL_MS = 60_000;

/** "in 25m" / "3h overdue" — the number an agent actually acts on. */
function formatRelative(dueIso: string, now: Date): { text: string; isOverdue: boolean } {
  const diffMin = Math.round((new Date(dueIso).getTime() - now.getTime()) / 60000);
  const abs = Math.abs(diffMin);

  if (diffMin < 0) {
    if (abs < 60) return { text: `${abs}m overdue`, isOverdue: true };
    if (abs < 60 * 24) return { text: `${Math.floor(abs / 60)}h overdue`, isOverdue: true };
    return { text: `${Math.floor(abs / (60 * 24))}d overdue`, isOverdue: true };
  }

  if (diffMin < 1) return { text: 'due now', isOverdue: false };
  if (diffMin < 60) return { text: `in ${diffMin}m`, isOverdue: false };
  if (diffMin < 60 * 24) return { text: `in ${Math.floor(diffMin / 60)}h`, isOverdue: false };
  return { text: `in ${Math.floor(diffMin / (60 * 24))}d`, isOverdue: false };
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const TYPE_ICON: Record<string, typeof PhoneCall> = {
  CALL: PhoneCall,
  WHATSAPP: MessageCircle,
  SITE_VISIT_FOLLOWUP: CalendarDays,
};

function priorityRing(priority: string, isOverdue: boolean): string {
  if (isOverdue || priority === 'URGENT') return 'border-status-danger/50 bg-status-danger-surface/60';
  if (priority === 'HIGH') return 'border-status-warning/40 bg-status-warning-surface/50';
  return 'border-border bg-surface';
}

interface ReminderBellProps {
  /** Compact icon-only trigger for the mobile header. */
  variant?: 'compact' | 'full';
}

export function ReminderBell({ variant = 'compact' }: ReminderBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reminders, setReminders] = useState<ReminderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [completing, setCompleting] = useState<ReminderListItem | null>(null);
  const [now, setNow] = useState(() => new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsLoading(true);
    // Two precise server queries beat one broad fetch + client-side filtering.
    const [overdue, today] = await Promise.all([
      fetchReminders({ timeframe: 'overdue' }),
      fetchReminders({ timeframe: 'today' }),
    ]);
    const byId = new Map<string, ReminderListItem>();
    [...overdue, ...today].forEach((r) => byId.set(r.id, r));
    setReminders(
      Array.from(byId.values()).sort(
        (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
      )
    );
    setNow(new Date());
    setIsLoading(false);
  }, []);

  // Initial load + polling so the desk stays honest even with the tab left open.
  useEffect(() => {
    load();
    const poll = setInterval(() => load(), POLL_MS);
    const tick = setInterval(() => setNow(new Date()), 30_000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [load]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const { overdueItems, dueNowCount } = useMemo(() => {
    const overdue = reminders.filter((r) => new Date(r.dueAt).getTime() < now.getTime());
    return { overdueItems: overdue, dueNowCount: overdue.length };
  }, [reminders, now]);

  const handleComplete = (reminder: ReminderListItem) => {
    setCompleting(reminder);
    setIsOpen(false);
  };

  const handleSnooze = async (reminder: ReminderListItem, minutes: number) => {
    setBusyId(reminder.id);
    try {
      const res = await updateReminder(reminder.id, { snoozeMinutes: minutes });
      if (!res.success) throw new Error(res.error || 'Failed to snooze reminder');
      const label = minutes < 60 ? `${minutes}m` : `${minutes / 60}h`;
      toast.info(`Snoozed ${label}`, {
        description: `${reminder.lead?.fullName || 'Lead'} • ${reminder.title}`,
        duration: 3000,
      });
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to snooze reminder');
    } finally {
      setBusyId(null);
    }
  };

  const badgeCount = dueNowCount;

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) load(true);
        }}
        aria-label={
          badgeCount > 0
            ? `Open reminders — ${badgeCount} overdue`
            : 'Open reminders and follow-ups'
        }
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title={badgeCount > 0 ? `${badgeCount} overdue reminder${badgeCount > 1 ? 's' : ''}` : 'Reminders & follow-ups'}
        className={`relative flex items-center justify-center gap-1.5 bg-surface border rounded-xl text-content-muted hover:text-content hover:bg-surface-subtle transition-colors cursor-pointer shadow-2xs ${
          variant === 'compact' ? 'w-8 h-8 border-border' : 'px-2.5 py-1.5 border-border'
        } ${badgeCount > 0 ? 'border-status-danger/50 text-status-danger' : ''}`}
      >
        <BellRing className={`w-3.5 h-3.5 ${badgeCount > 0 ? 'animate-pulse' : ''}`} aria-hidden="true" />
        {variant === 'full' && (
          <span className="text-xs font-semibold hidden xl:inline">Reminders</span>
        )}
        {badgeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-status-danger text-white text-[10px] font-black flex items-center justify-center ring-2 ring-surface">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </button>

      {/* Backdrop: click-away closes the panel without stealing focus from the page */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[55] bg-black/10"
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
        />
      )}

      {isOpen && (
        <div
          role="dialog"
          aria-label="Reminders and follow-ups due"
          className="fixed z-[60] top-[58px] sm:top-[62px] lg:top-[66px] right-2 sm:right-4 w-[calc(100vw-1rem)] max-w-[23rem] max-h-[70vh] overflow-hidden flex flex-col bg-surface border border-border rounded-2xl shadow-2xl"
        >
          {/* Panel header */}
          <div className="shrink-0 flex items-center justify-between gap-2 px-3.5 py-3 border-b border-border bg-surface-subtle">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-content font-display flex items-center gap-1.5">
                <BellRing className="w-4 h-4 text-accent" aria-hidden="true" />
                Due &amp; Overdue Follow-ups
              </h2>
              <p className="text-[11px] text-content-secondary mt-0.5">
                {overdueItems.length > 0
                  ? `${overdueItems.length} overdue • ${reminders.length} due today`
                  : reminders.length > 0
                    ? `${reminders.length} reminder${reminders.length > 1 ? 's' : ''} due today`
                    : 'Nothing pending — desk is clear'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => load(true)}
              disabled={isLoading}
              aria-label="Refresh reminders"
              className="p-1.5 rounded-lg text-content-muted hover:text-accent hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {isLoading && reminders.length === 0 && (
              <div className="p-6 flex items-center justify-center gap-2 text-xs text-content-muted">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Loading reminders…
              </div>
            )}

            {!isLoading && reminders.length === 0 && (
              <div className="p-6 text-center space-y-1.5">
                <CheckCircle2 className="w-6 h-6 text-status-success mx-auto" aria-hidden="true" />
                <p className="text-xs font-bold text-content">Desk is clear</p>
                <p className="text-[11px] text-content-secondary">
                  No pending or overdue follow-ups for today. New callbacks booked from the log modal appear here.
                </p>
              </div>
            )}

            {/* Reminder rows */}
            {reminders.map((reminder) => {
              const { text: relativeText, isOverdue } = formatRelative(reminder.dueAt, now);
              const TypeIcon = TYPE_ICON[reminder.reminderType] || Clock3;
              const leadName = resolveReminderLeadName(reminder);
              const phone = resolveReminderPhone(reminder);
              const isBusy = busyId === reminder.id;

              return (
                <div key={reminder.id} className={`p-3 space-y-2 border-l-2 ${priorityRing(reminder.priority, isOverdue)}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-content truncate">{reminder.title}</p>
                      <p className="text-[11px] text-content-secondary truncate">
                        {leadName}
                        {phone ? <span className="font-mono"> · {phone}</span> : null}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono border ${
                        isOverdue
                          ? 'bg-status-danger-surface text-status-danger border-status-danger/30'
                          : 'bg-surface-subtle text-content-muted border-border'
                      }`}
                    >
                      {relativeText}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono text-content-muted inline-flex items-center gap-1 mr-auto">
                      <TypeIcon className="w-3 h-3" aria-hidden="true" />
                      {formatClock(reminder.dueAt)}
                      {reminder.status === 'SNOOZED' && ' • snoozed'}
                    </span>

                    {phone && (
                      <a
                        href={`tel:${phone}`}
                        className="px-2 py-1 rounded-lg bg-accent-soft text-accent-text border border-accent/30 text-[11px] font-bold hover:border-accent transition-all cursor-pointer inline-flex items-center gap-1"
                        aria-label={`Call ${leadName}`}
                      >
                        <PhoneCall className="w-3 h-3" aria-hidden="true" />
                        Call
                      </a>
                    )}

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleSnooze(reminder, 15)}
                      className="px-2 py-1 rounded-lg bg-surface text-content border border-border text-[11px] font-semibold hover:bg-surface-subtle transition-all cursor-pointer disabled:opacity-50"
                    >
                      +15m
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleSnooze(reminder, 60)}
                      className="px-2 py-1 rounded-lg bg-surface text-content border border-border text-[11px] font-semibold hover:bg-surface-subtle transition-all cursor-pointer disabled:opacity-50"
                    >
                      +1h
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleComplete(reminder)}
                      className="px-2.5 py-1 rounded-lg bg-status-success-surface text-status-success border border-status-success/30 text-[11px] font-bold hover:border-status-success transition-all cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      {isBusy ? (
                        <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                      )}
                      Done
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Panel footer */}
          <div className="shrink-0 px-3.5 py-2.5 border-t border-border bg-surface-subtle flex items-center justify-between gap-2">
            <Link
              href="/calendar"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-accent-text hover:text-accent inline-flex items-center gap-1"
            >
              <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
              Open full calendar
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
            <span
              className="text-[10px] text-content-muted inline-flex items-center gap-1"
              title="Counts refresh automatically so the desk never drifts"
            >
              <AlarmClockOff className="w-3 h-3" aria-hidden="true" />
              Auto-refreshes every minute
            </span>
          </div>
        </div>
      )}

      {/* Completion dialog — reuses the shared complete-and-schedule-next flow */}
      <CompleteReminderPrompt
        open={Boolean(completing)}
        onClose={() => setCompleting(null)}
        reminder={
          completing
            ? {
                id: completing.id,
                title: completing.title,
                reminderType: completing.reminderType,
                leadId: completing.leadId,
                lead: {
                  fullName: completing.lead?.fullName || completing.lead?.contact?.fullName || null,
                  phoneE164: completing.lead?.phoneE164 || completing.lead?.contact?.phoneE164 || null,
                  currentStage: completing.lead?.currentStage || undefined,
                },
              }
            : null
        }
        onCompleted={() => {
          setCompleting(null);
          load();
        }}
      />
    </div>
  );
}
