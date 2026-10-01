'use client';

import React, { useState } from 'react';
import {
  Phone,
  MessageSquare,
  FileText,
  Car,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Edit3,
  Calendar,
  BellRing,
  CalendarClock,
  CalendarPlus,
  Loader2,
  Check,
  XCircle,
} from 'lucide-react';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { FeedbackAlert } from '@/components/ui/FeedbackAlert';
import { CustomSelect, type CustomSelectOption } from '@/components/ui/CustomSelect';
import { createReminder, updateReminder, deleteReminder } from '@/lib/client/calendar';
import { toast } from '@/lib/client/toast';
import {
  NUDGE_PRESETS,
  OUTCOME_TEXT,
  buildNudgeTitle,
  formatClock,
  nudgePriorityFor,
  recommendedPresetFor,
  resolveNudgePresetDate,
  shouldPromptNextAction,
  toDateTimeLocalValue,
  type NudgePresetKey,
} from '@/lib/client/next-action-nudge';

const OUTCOME_OPTIONS: CustomSelectOption[] = [
  { value: 'CONNECTED_INTERESTED', label: '✅ Connected & Interested' },
  { value: 'VISIT_REQUESTED', label: '🚗 Site Visit Requested' },
  { value: 'BUDGET_DISCUSSED', label: '💰 Budget / Price Discussed' },
  { value: 'TOKEN_OFFER', label: '🏷️ Token / Booking Offer' },
  { value: 'RINGING_NO_ANSWER', label: '🔕 Ringing / No Answer' },
  { value: 'BUSY_CALL_LATER', label: '⏳ Busy / Call Back Later' },
  { value: 'NOTE_LOGGED', label: '📝 General Remark / Audit Note' },
  { value: 'NOT_INTERESTED', label: '❌ Not Interested / Dropped' },
];

const STAGE_OPTIONS: CustomSelectOption[] = [
  { value: '', label: 'Keep current stage' },
  { value: 'new_uncontacted', label: '🔴 New Lead (Uncontacted)' },
  { value: 'discovery_call', label: '📞 Discovery & Qualifying' },
  { value: 'portal_shared', label: '📑 Shortlist / Deck Sent' },
  { value: 'visit_scheduled', label: '🚗 Site Visit Scheduled' },
  { value: 'visit_done', label: '🏢 Site Visit Completed' },
  { value: 'negotiation_token', label: '💰 Price Negotiation & Token' },
  { value: 'closed_won', label: '🏆 Booking Done (Closed Won)' },
  { value: 'on_hold_nurture', label: '⏳ Nurture / Follow-Up Later' },
];

interface QuickLogModalProps {
  open: boolean;
  onClose: () => void;
  lead: {
    id: string;
    fullName?: string | null;
    phoneE164?: string | null;
    currentStage?: string;
    notes?: string | null;
  } | null;
  onLogSaved?: () => void;
}

export function QuickLogModal({
  open,
  onClose,
  lead,
  onLogSaved,
}: QuickLogModalProps) {
  const [channel, setChannel] = useState<'PHONE_CALL' | 'WHATSAPP' | 'NOTE' | 'SITE_VISIT' | 'MEETING'>('PHONE_CALL');
  const [outcome, setOutcome] = useState('CONNECTED_INTERESTED');
  const [notes, setNotes] = useState('');
  const [callDuration, setCallDuration] = useState('3');
  const [stageUpdate, setStageUpdate] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phase 1: Post-call "Next Action" nudge — fires when a call is logged without a follow-up.
  const [step, setStep] = useState<'FORM' | 'NUDGE'>('FORM');
  const [nudgePreset, setNudgePreset] = useState<NudgePresetKey>('TOMORROW_1030');
  const [nudgeCustomAt, setNudgeCustomAt] = useState('');
  const [nudgeSaving, setNudgeSaving] = useState(false);
  const [nudgeError, setNudgeError] = useState<string | null>(null);
  const [autoReminder, setAutoReminder] = useState<{ id: string; dueAt: string } | null>(null);

  // Outcome Quick Snippet Presets
  const applyPresetSnippet = (snippetText: string, presetOutcome: string, presetChannel?: 'PHONE_CALL' | 'WHATSAPP' | 'NOTE' | 'SITE_VISIT' | 'MEETING') => {
    setNotes(snippetText);
    setOutcome(presetOutcome);
    if (presetChannel) setChannel(presetChannel);
  };

  React.useEffect(() => {
    if (open && lead) {
      setError(null);
      setSubmitting(false);
      setNotes('');
      setStageUpdate(lead.currentStage || '');
      setChannel('PHONE_CALL');
      setOutcome('CONNECTED_INTERESTED');
      // Reset the post-call nudge so a fresh log always starts on the form
      setStep('FORM');
      setAutoReminder(null);
      setNudgeError(null);
      setNudgeSaving(false);
      setNudgeCustomAt('');
      setCallDuration('3');
      setFollowUpDate('');
    }
  }, [open, lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !notes.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        channel: channel === 'NOTE' ? 'NOTE' : channel,
        direction: 'OUTBOUND',
        messageContent: notes.trim(),
        outcome,
        callDurationSeconds: channel === 'PHONE_CALL' ? parseInt(callDuration, 10) * 60 : 0,
        callerName: 'Broker Operations',
        stageUpdate: stageUpdate || undefined,
        followUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined,
      };

      const res = await fetch(`/api/v1/leads/${lead.id}/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record communication log');
      }

      if (onLogSaved) {
        onLogSaved();
      }

      // Phase 1 — "Don't let the lead go cold" guard:
      // When a real interaction is logged with no follow-up, do not close silently.
      // Surface a one-tap Next Action card with a pre-decided time instead.
      if (shouldPromptNextAction({ channel, outcome, hasFollowUpDate: Boolean(followUpDate) })) {
        const recommended = recommendedPresetFor(outcome);
        setAutoReminder(data.autoReminder || null);
        setNudgePreset(recommended);
        setNudgeCustomAt(toDateTimeLocalValue(resolveNudgePresetDate(recommended)));
        setStep('NUDGE');
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save communication log');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Schedule (or reschedule) the follow-up straight from the post-call card.
   * Reuses the server-side auto-reminder when the backend already created one,
   * so an agent who taps fast never ends up with duplicate reminders.
   */
  const handleNudgeSchedule = async (presetKey?: NudgePresetKey) => {
    if (!lead) return;
    const key = presetKey || nudgePreset;
    const dueAt = presetKey
      ? resolveNudgePresetDate(key)
      : nudgeCustomAt
        ? new Date(nudgeCustomAt)
        : resolveNudgePresetDate(key);

    if (Number.isNaN(dueAt.getTime())) {
      setNudgeError('Please pick a valid date and time for the follow-up.');
      return;
    }
    if (dueAt.getTime() <= Date.now()) {
      setNudgeError('The follow-up time must be in the future.');
      return;
    }

    setNudgeSaving(true);
    setNudgeError(null);

    try {
      const priority = nudgePriorityFor(outcome);
      const title = buildNudgeTitle(outcome, channel);

      const result = autoReminder
        ? await updateReminder(autoReminder.id, {
            dueAt: dueAt.toISOString(),
            status: 'PENDING',
            priority,
            title,
          })
        : await createReminder({
            leadId: lead.id,
            title,
            reminderType: channel === 'WHATSAPP' ? 'WHATSAPP' : 'CALL',
            dueAt: dueAt.toISOString(),
            priority,
            notes: notes.trim().slice(0, 500),
          });

      if (!result.success) {
        throw new Error(result.error || 'Failed to schedule follow-up');
      }

      toast.success('Follow-up scheduled', {
        description: `${lead.fullName || 'Lead'} • ${formatClock(dueAt)}`,
        duration: 3500,
      });
      onClose();
    } catch (err: any) {
      setNudgeError(err.message || 'Failed to schedule follow-up');
    } finally {
      setNudgeSaving(false);
    }
  };

  /** Accept the server-side retry reminder as-is (no extra taps, no duplicate). */
  const handleNudgeKeep = () => {
    if (autoReminder) {
      toast.info('Retry reminder kept', {
        description: `Auto-scheduled for ${formatClock(new Date(autoReminder.dueAt))}.`,
        duration: 3500,
      });
    }
    onClose();
  };

  /** Explicit "no follow-up needed" — also removes a server-side auto reminder. */
  const handleNudgeSkip = async () => {
    if (autoReminder) {
      setNudgeSaving(true);
      try {
        const result = await deleteReminder(autoReminder.id);
        if (!result.success) {
          setNudgeError(result.error || 'Failed to clear reminder');
          return;
        }
      } catch (err) {
        console.error('Failed to cancel auto reminder:', err);
        setNudgeError('Failed to clear reminder');
        return;
      } finally {
        setNudgeSaving(false);
      }
    }
    onClose();
  };

  /** Post-call Next Action card: pre-decided time, one tap, never a dead end. */
  const renderNudgeCard = () => (
    <div className="space-y-3.5">
      {/* Saved confirmation — reassure the agent the log is safe before asking for the next action */}
      <div className="p-3 rounded-2xl bg-status-success-surface border border-status-success/30 flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 text-status-success shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-xs">
          <p className="font-bold text-status-success">Touchpoint saved</p>
          <p className="text-content-secondary mt-0.5">
            Logged for <strong className="text-content">{lead?.fullName || 'Lead'}</strong>. One last thing — lock the
            next action so this lead doesn&apos;t go cold.
          </p>
        </div>
      </div>

      {/* Next Action card */}
      <div className="p-4 rounded-2xl bg-surface-subtle border border-border space-y-3">
        <div className="flex items-start gap-2">
          <BellRing className="w-4 h-4 text-accent shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-content font-display">
              {autoReminder ? 'Retry reminder auto-scheduled' : 'Remember to call back'}
            </p>
            <p className="text-xs text-content-secondary mt-0.5">
              {autoReminder ? (
                <>
                  Because this call ended as &ldquo;{OUTCOME_TEXT[outcome] || outcome}&rdquo;, a callback was booked for{' '}
                  <strong className="text-content font-mono">{formatClock(new Date(autoReminder.dueAt))}</strong>. Keep
                  it, move it, or clear it.
                </>
              ) : (
                <>
                  Call ended as &ldquo;{OUTCOME_TEXT[outcome] || outcome}&rdquo;. Tap a time to schedule the follow-up —
                  or pick an exact time below.
                </>
              )}
            </p>
          </div>
        </div>
        {/* One-tap time presets — the suggested one is pre-decided for the agent */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-content-secondary uppercase tracking-wider flex items-center gap-1">
            <CalendarClock className="w-3.5 h-3.5 text-accent" aria-hidden="true" /> Schedule next call:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {NUDGE_PRESETS.map((preset) => {
              const isSuggested = preset.key === recommendedPresetFor(outcome);
              return (
                <button
                  type="button"
                  key={preset.key}
                  disabled={nudgeSaving}
                  onClick={() => handleNudgeSchedule(preset.key)}
                  title={preset.label}
                  className={`relative px-2 py-2.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50 ${
                    isSuggested
                      ? 'bg-accent-soft text-accent-text border-accent/40 hover:border-accent'
                      : 'bg-surface text-content border-border hover:bg-surface-subtle'
                  }`}
                >
                  {preset.shortLabel}
                  {isSuggested && (
                    <span className="absolute -top-1.5 -right-1 px-1 rounded-md text-[9px] font-black bg-accent text-white shadow-xs">
                      SUGGESTED
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom time escape hatch */}
        <div className="flex flex-wrap items-end gap-2 pt-2.5 border-t border-border">
          <div className="flex-1 min-w-[170px]">
            <label htmlFor="nudge-custom-at" className="text-[11px] text-content-secondary font-medium block mb-1">
              Or pick an exact time:
            </label>
            <input
              id="nudge-custom-at"
              type="datetime-local"
              value={nudgeCustomAt}
              disabled={nudgeSaving}
              onChange={(e) => setNudgeCustomAt(e.target.value)}
              className="w-full bg-surface-inset border border-border rounded-xl p-2 text-xs text-content font-mono font-bold focus:outline-none focus:border-accent"
            />
          </div>
          <button
            type="button"
            disabled={nudgeSaving || !nudgeCustomAt}
            onClick={() => handleNudgeSchedule()}
            className="px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {nudgeSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{autoReminder ? 'Move Reminder' : 'Schedule'}</span>
          </button>
        </div>

        {nudgeError && (
          <FeedbackAlert variant="error" error={nudgeError} onDismiss={() => setNudgeError(null)} />
        )}

        {/* Secondary actions — keep or decline, never a dead end */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={handleNudgeSkip}
            disabled={nudgeSaving}
            className="text-[11px] font-semibold text-content-muted hover:text-status-danger transition-colors cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
            {autoReminder ? 'Clear reminder — no follow-up needed' : 'Skip — no follow-up needed'}
          </button>
          {autoReminder && (
            <button
              type="button"
              onClick={handleNudgeKeep}
              disabled={nudgeSaving}
              className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 text-status-success" aria-hidden="true" />
              Keep {formatClock(new Date(autoReminder.dueAt))}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <AccessibleDialog
      open={open && Boolean(lead)}
      onClose={onClose}
      titleId="quick-log-title"
      descriptionId="quick-log-desc"
      size="md"
    >
      {lead && (
        <div className="space-y-4 text-content font-sans">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 id="quick-log-title" className="font-bold text-content text-base font-display flex items-center gap-2">
                {step === 'NUDGE' ? (
                  <>
                    <BellRing className="w-4 h-4 text-accent" />
                    Next Action — Don&apos;t Let This Lead Go Cold
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4 text-accent" />
                    Log Call / Remark &amp; Audit Trail
                  </>
                )}
              </h2>
              <p id="quick-log-desc" className="mt-0.5 text-xs text-content-secondary">
                For <strong className="text-content">{lead.fullName || 'Lead'}</strong> {lead.phoneE164 && <span className="font-mono text-accent-text font-bold">({lead.phoneE164})</span>}
              </p>
            </div>
            <button
              type="button"
              data-dialog-close
              aria-label="Close log modal"
              onClick={onClose}
              className="p-1 rounded-lg text-content-muted hover:text-content cursor-pointer"
            >
              ✕
            </button>
          </div>

          {error && (
            <FeedbackAlert
              variant="error"
              error={error}
              onDismiss={() => setError(null)}
            />
          )}

          {step === 'NUDGE' ? (
            renderNudgeCard()
          ) : (
            <>
          {/* Quick Snippet Chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-content-secondary uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-accent" /> 1-Click Remark Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  applyPresetSnippet(
                    'Connected with buyer. Discussed 2 BHK options in Kharghar Sector 35. Requested floor plans on WhatsApp.',
                    'CONNECTED_INTERESTED',
                    'PHONE_CALL'
                  )
                }
                className="px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-subtle text-content text-xs font-semibold transition-all cursor-pointer"
              >
                📞 Discussed Kharghar 2BHK
              </button>
              <button
                type="button"
                onClick={() =>
                  applyPresetSnippet(
                    'Shared verified property brochure and pricing breakdown sheet via WhatsApp.',
                    'CONNECTED_INTERESTED',
                    'WHATSAPP'
                  )
                }
                className="px-2.5 py-1.5 rounded-lg bg-status-success-surface border border-status-success/30 hover:border-status-success text-status-success text-xs font-bold transition-all cursor-pointer"
              >
                💬 Sent WhatsApp Brochure
              </button>
              <button
                type="button"
                onClick={() =>
                  applyPresetSnippet(
                    'Ringing, no answer. Sent follow-up WhatsApp message and scheduled retry.',
                    'RINGING_NO_ANSWER',
                    'PHONE_CALL'
                  )
                }
                className="px-2.5 py-1.5 rounded-lg bg-status-warning-surface border border-status-warning/30 hover:border-status-warning text-status-warning text-xs font-bold transition-all cursor-pointer"
              >
                🔕 Ringing / No Answer
              </button>
              <button
                type="button"
                onClick={() =>
                  applyPresetSnippet(
                    'Buyer confirmed weekend physical site visit for shortlisted G+14 project.',
                    'VISIT_REQUESTED',
                    'SITE_VISIT'
                  )
                }
                className="px-2.5 py-1.5 rounded-lg bg-accent-soft border border-accent/30 hover:border-accent text-accent-text text-xs font-bold transition-all cursor-pointer"
              >
                🚗 Site Visit Fixed
              </button>
              <button
                type="button"
                onClick={() =>
                  applyPresetSnippet(
                    'Internal Note: Client is an NRI investor looking for high rental yield property near upcoming Metro.',
                    'NOTE_LOGGED',
                    'NOTE'
                  )
                }
                className="px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-subtle text-content text-xs font-semibold transition-all cursor-pointer"
              >
                📝 Investor Profile Remark
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {/* Channel / Touchpoint Type */}
            <fieldset>
              <legend className="text-content-secondary font-medium block mb-1.5">
                Interaction Channel:
              </legend>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {[
                  { id: 'PHONE_CALL', label: 'Phone Call', icon: Phone },
                  { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare },
                  { id: 'NOTE', label: 'Quick Remark', icon: FileText },
                  { id: 'SITE_VISIT', label: 'Site Visit', icon: Car },
                  { id: 'MEETING', label: 'Meeting', icon: Users },
                ].map((c) => {
                  const Icon = c.icon;
                  const isSelected = channel === c.id;
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setChannel(c.id as any)}
                      aria-pressed={isSelected}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-accent text-white border-accent shadow-xs'
                          : 'bg-surface text-content-secondary border-border hover:bg-surface-subtle'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Outcome & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-content-secondary font-medium block mb-1 text-xs">
                  Outcome / Status:
                </label>
                <CustomSelect
                  options={OUTCOME_OPTIONS}
                  value={outcome}
                  onChange={(val) => setOutcome(val)}
                  className="w-full"
                  triggerClassName="bg-surface-inset border-border rounded-xl text-xs font-bold"
                />
              </div>

              {channel === 'PHONE_CALL' ? (
                <div>
                  <label htmlFor="log-duration" className="text-content-secondary font-medium block mb-1">
                    Call Duration (Minutes):
                  </label>
                  <input
                    id="log-duration"
                    type="number"
                    min="0"
                    max="180"
                    value={callDuration}
                    onChange={(e) => setCallDuration(e.target.value)}
                    className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content font-mono font-bold focus:outline-none focus:border-accent"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-content-secondary font-medium block mb-1 text-xs">
                    Update Pipeline Stage:
                  </label>
                  <CustomSelect
                    options={STAGE_OPTIONS}
                    value={stageUpdate}
                    onChange={(val) => setStageUpdate(val)}
                    placeholder={`Keep current stage (${lead.currentStage || 'new'})`}
                    className="w-full"
                    triggerClassName="bg-surface-inset border-border rounded-xl text-xs font-bold"
                  />
                </div>
              )}
            </div>

            {/* Note & Remarks Textarea */}
            <div>
              <label htmlFor="log-notes" className="text-content-secondary font-medium block mb-1">
                Touchpoint Notes / Remark Description: <span className="text-status-danger">*</span>
              </label>
              <textarea
                id="log-notes"
                rows={3}
                required
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter client remarks, key requirements, questions raised, or next action context..."
                className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content focus:outline-none focus:border-accent"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-semibold shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !notes.trim()}
                className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? 'Saving Log…' : 'Save Communication Log'}
              </button>
            </div>
          </form>
            </>
          )}
        </div>
      )}
    </AccessibleDialog>
  );
}
