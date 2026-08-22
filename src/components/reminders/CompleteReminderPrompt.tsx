'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles,
  Phone,
  MessageSquare,
  Car,
  DollarSign,
  XCircle,
} from 'lucide-react';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';

interface CompleteReminderPromptProps {
  open: boolean;
  onClose: () => void;
  reminder: {
    id: string;
    title: string;
    reminderType: string;
    leadId: string;
    lead?: {
      fullName?: string | null;
      phoneE164?: string | null;
      currentStage?: string;
    } | null;
  } | null;
  onCompleted?: (result: any) => void;
}

export function CompleteReminderPrompt({
  open,
  onClose,
  reminder,
  onCompleted,
}: CompleteReminderPromptProps) {
  const [completionNotes, setCompletionNotes] = useState('');
  const [scheduleNextAction, setScheduleNextAction] = useState(true);
  const [nextTitle, setNextTitle] = useState('Follow up on shortlisted options');
  const [nextType, setNextType] = useState('CALL');
  const [nextDueAt, setNextDueAt] = useState('');
  const [nextPriority, setNextPriority] = useState('HIGH');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Apply outcome presets
  const applyOutcomePreset = (outcomeKey: 'CONNECTED_TOMORROW' | 'NO_ANSWER_2H' | 'DECK_SENT_24H' | 'VISIT_FIXED' | 'TOKEN_IN_PROGRESS') => {
    const now = new Date();
    let target = new Date();

    if (outcomeKey === 'NO_ANSWER_2H') {
      target = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      setCompletionNotes('No answer / call not received. Retrying in 2 hours.');
      setNextTitle('2nd Call Attempt (Prior Call Unanswered)');
      setNextType('CALL');
      setNextPriority('URGENT');
    } else if (outcomeKey === 'CONNECTED_TOMORROW') {
      target.setDate(target.getDate() + 1);
      target.setHours(11, 0, 0, 0);
      setCompletionNotes('Call completed. Discussed requirements and scheduled next follow-up.');
      setNextTitle('Review shortlist feedback & schedule tour');
      setNextType('CALL');
      setNextPriority('HIGH');
    } else if (outcomeKey === 'DECK_SENT_24H') {
      target.setDate(target.getDate() + 1);
      target.setHours(16, 0, 0, 0);
      setCompletionNotes('Sent verified property deck & floor plan link on WhatsApp.');
      setNextTitle('Follow up on shared portal presentation');
      setNextType('WHATSAPP');
      setNextPriority('HIGH');
    } else if (outcomeKey === 'VISIT_FIXED') {
      target.setDate(target.getDate() + 2);
      target.setHours(10, 0, 0, 0);
      setCompletionNotes('Client confirmed interest in weekend physical site visit.');
      setNextTitle('Pre-Visit Cab Logistics & Route Confirmation');
      setNextType('CALL');
      setNextPriority('URGENT');
    } else if (outcomeKey === 'TOKEN_IN_PROGRESS') {
      target = new Date(now.getTime() + 12 * 60 * 60 * 1000);
      setCompletionNotes('Price negotiated with developer VP. Awaiting token transfer.');
      setNextTitle('Confirm Token Transfer & Booking Slip Receipt');
      setNextType('CALL');
      setNextPriority('URGENT');
    }

    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    const hours = String(target.getHours()).padStart(2, '0');
    const minutes = String(target.getMinutes()).padStart(2, '0');
    setNextDueAt(`${year}-${month}-${day}T${hours}:${minutes}`);
    setScheduleNextAction(true);
  };

  React.useEffect(() => {
    if (open && reminder) {
      setError(null);
      setSubmitting(false);
      applyOutcomePreset('CONNECTED_TOMORROW');
    }
  }, [open, reminder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminder) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        status: 'COMPLETED',
        completionNotes: completionNotes.trim() || 'Completed action.',
      };

      if (scheduleNextAction && nextDueAt) {
        payload.nextReminder = {
          title: nextTitle.trim() || 'Next Follow-up',
          reminderType: nextType,
          dueAt: new Date(nextDueAt).toISOString(),
          priority: nextPriority,
          notes: `Follow-up following previous completed task: "${reminder.title}"`,
        };
      }

      const res = await fetch(`/api/v1/reminders/${reminder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete reminder');
      }

      if (onCompleted) {
        onCompleted(data);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to complete reminder');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AccessibleDialog
      open={open && Boolean(reminder)}
      onClose={onClose}
      titleId="complete-reminder-title"
      descriptionId="complete-reminder-description"
      size="md"
    >
      {reminder && (
        <div className="space-y-4 text-content font-sans">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 id="complete-reminder-title" className="font-bold text-content text-base font-display flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-status-success" />
                Complete Follow-up &amp; Log Outcome
              </h2>
              <p id="complete-reminder-description" className="mt-0.5 text-xs text-content-secondary">
                Finished: <strong className="text-content font-semibold">&quot;{reminder.title}&quot;</strong>
              </p>
            </div>
            <button
              type="button"
              data-dialog-close
              aria-label="Close complete modal"
              onClick={onClose}
              className="p-1 rounded-lg text-content-muted hover:text-content cursor-pointer"
            >
              ✕
            </button>
          </div>

          {error && (
            <div role="alert" className="rounded-xl border border-status-danger/40 bg-status-danger-surface p-3 text-xs text-status-danger font-semibold">
              {error}
            </div>
          )}

          {/* Quick Outcome Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-content-secondary uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-accent" /> 1-Click Call Outcome Presets:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => applyOutcomePreset('CONNECTED_TOMORROW')}
                className="px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-subtle text-content text-left text-xs font-semibold transition-all cursor-pointer"
              >
                📞 Connected (Next Day)
              </button>
              <button
                type="button"
                onClick={() => applyOutcomePreset('NO_ANSWER_2H')}
                className="px-2.5 py-1.5 rounded-lg bg-status-warning-surface border border-status-warning/30 hover:border-status-warning text-status-warning text-left text-xs font-bold transition-all cursor-pointer"
              >
                ⏳ No Answer (Retry in 2h)
              </button>
              <button
                type="button"
                onClick={() => applyOutcomePreset('DECK_SENT_24H')}
                className="px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-subtle text-content text-left text-xs font-semibold transition-all cursor-pointer"
              >
                📑 Deck Sent (Check in 24h)
              </button>
              <button
                type="button"
                onClick={() => applyOutcomePreset('VISIT_FIXED')}
                className="px-2.5 py-1.5 rounded-lg bg-status-success-surface border border-status-success/30 hover:border-status-success text-status-success text-left text-xs font-bold transition-all cursor-pointer"
              >
                🚗 Site Visit Booked
              </button>
              <button
                type="button"
                onClick={() => applyOutcomePreset('TOKEN_IN_PROGRESS')}
                className="px-2.5 py-1.5 rounded-lg bg-accent-soft border border-accent/30 hover:border-accent text-accent-text text-left text-xs font-bold transition-all cursor-pointer"
              >
                💰 Token Negotiation
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {/* Outcome Notes */}
            <div>
              <label htmlFor="outcome-notes" className="text-content-secondary font-medium block mb-1">
                Touchpoint Outcome Notes:
              </label>
              <textarea
                id="outcome-notes"
                rows={2}
                required
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="e.g. Connected with buyer, interested in 2 BHK Kharghar Sector 35 near metro..."
                className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content focus:outline-none focus:border-accent"
              />
            </div>

            {/* Zero-Orphan Guarantee: Next Reminder Section */}
            <div className="p-3.5 rounded-2xl bg-surface-subtle border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-content text-xs flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-accent" />
                  Schedule Next Follow-Up (Zero-Orphan Rule)
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-content-secondary">
                  <input
                    type="checkbox"
                    checked={scheduleNextAction}
                    onChange={(e) => setScheduleNextAction(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border text-accent focus:ring-accent"
                  />
                  <span>Provision Next Touchpoint</span>
                </label>
              </div>

              {scheduleNextAction && (
                <div className="space-y-2.5 pt-1">
                  <div>
                    <label htmlFor="next-title" className="text-content-secondary font-medium block mb-1 text-[11px]">
                      Next Step Description:
                    </label>
                    <input
                      id="next-title"
                      type="text"
                      required={scheduleNextAction}
                      value={nextTitle}
                      onChange={(e) => setNextTitle(e.target.value)}
                      className="w-full bg-surface-inset border border-border rounded-xl p-2 text-xs text-content focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="next-due" className="text-content-secondary font-medium block mb-1 text-[11px]">
                        Target Date &amp; Time:
                      </label>
                      <input
                        id="next-due"
                        type="datetime-local"
                        required={scheduleNextAction}
                        value={nextDueAt}
                        onChange={(e) => setNextDueAt(e.target.value)}
                        className="w-full bg-surface-inset border border-border rounded-xl p-2 text-xs text-content font-mono font-bold focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label htmlFor="next-type" className="text-content-secondary font-medium block mb-1 text-[11px]">
                        Channel:
                      </label>
                      <select
                        id="next-type"
                        value={nextType}
                        onChange={(e) => setNextType(e.target.value)}
                        className="w-full bg-surface-inset border border-border rounded-xl p-2 text-xs text-content font-bold focus:outline-none focus:border-accent cursor-pointer"
                      >
                        <option value="CALL">📞 Phone Call</option>
                        <option value="WHATSAPP">💬 WhatsApp</option>
                        <option value="SITE_VISIT_FOLLOWUP">🚗 Site Visit</option>
                        <option value="REQUIREMENT_CHECK">📄 Deck Review</option>
                        <option value="TOKEN_FOLLOWUP">💰 Token Check</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
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
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                {submitting ? 'Saving Outcome…' : 'Save & Complete Touchpoint'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AccessibleDialog>
  );
}
