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
} from 'lucide-react';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { CustomSelect, type CustomSelectOption } from '@/components/ui/CustomSelect';

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
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save communication log');
    } finally {
      setSubmitting(false);
    }
  };

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
                <Edit3 className="w-4 h-4 text-accent" />
                Log Call / Remark &amp; Audit Trail
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
            <div role="alert" className="rounded-xl border border-status-danger/40 bg-status-danger-surface p-3 text-xs text-status-danger font-semibold">
              {error}
            </div>
          )}

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
        </div>
      )}
    </AccessibleDialog>
  );
}
