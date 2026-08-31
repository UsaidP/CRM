'use client';

import React, { useState } from 'react';
import {
  Clock,
  Calendar,
  Phone,
  MessageSquare,
  Car,
  FileText,
  DollarSign,
  AlertCircle,
  Sparkles,
  Check,
} from 'lucide-react';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { CustomSelect, type CustomSelectOption } from '@/components/ui/CustomSelect';
import { createReminder } from '@/lib/client/calendar';

const URGENCY_OPTIONS: CustomSelectOption[] = [
  { value: 'URGENT', label: '🔴 URGENT (Immediate Connect Next)', dotColor: 'bg-red-500' },
  { value: 'HIGH', label: '🟡 HIGH (Standard Pipeline)', dotColor: 'bg-amber-500' },
  { value: 'MEDIUM', label: '🔵 MEDIUM (Nurture Task)', dotColor: 'bg-blue-500' },
  { value: 'LOW', label: '⚪ LOW (General)', dotColor: 'bg-emerald-500' },
];

interface QuickReminderModalProps {
  open: boolean;
  onClose: () => void;
  lead: {
    id: string;
    fullName?: string | null;
    phoneE164?: string | null;
    currentStage?: string;
  } | null;
  onReminderSaved?: (newReminder: any) => void;
}

export function QuickReminderModal({
  open,
  onClose,
  lead,
  onReminderSaved,
}: QuickReminderModalProps) {
  const [title, setTitle] = useState('');
  const [reminderType, setReminderType] = useState('CALL');
  const [priority, setPriority] = useState('HIGH');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Apply quick presets
  const applyPreset = (preset: '15M' | 'TODAY_4PM' | 'TOMORROW_10AM' | 'IN_3DAYS' | 'IN_7DAYS') => {
    const now = new Date();
    let target = new Date();

    if (preset === '15M') {
      target = new Date(now.getTime() + 15 * 60 * 1000);
      setTitle('Sub-15m Speed-to-Lead Follow-up Call');
      setReminderType('CALL');
      setPriority('URGENT');
    } else if (preset === 'TODAY_4PM') {
      target.setHours(16, 0, 0, 0);
      if (target.getTime() <= now.getTime()) {
        target = new Date(now.getTime() + 60 * 60 * 1000);
      }
      setTitle('Evening Follow-up on Shortlisted Projects');
      setReminderType('CALL');
      setPriority('HIGH');
    } else if (preset === 'TOMORROW_10AM') {
      target.setDate(target.getDate() + 1);
      target.setHours(10, 30, 0, 0);
      setTitle('Morning Follow-up Call & Requirement Deep Dive');
      setReminderType('CALL');
      setPriority('HIGH');
    } else if (preset === 'IN_3DAYS') {
      target.setDate(target.getDate() + 3);
      target.setHours(11, 0, 0, 0);
      setTitle('Shortlist Review & Site Tour Scheduling');
      setReminderType('WHATSAPP');
      setPriority('MEDIUM');
    } else if (preset === 'IN_7DAYS') {
      target.setDate(target.getDate() + 7);
      target.setHours(12, 0, 0, 0);
      setTitle('Weekly Market Nurture & Price Revision Update');
      setReminderType('WHATSAPP');
      setPriority('MEDIUM');
    }

    // Format to datetime-local input string YYYY-MM-DDTHH:mm
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    const hours = String(target.getHours()).padStart(2, '0');
    const minutes = String(target.getMinutes()).padStart(2, '0');
    setDueAt(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  // Initialize defaults on open
  React.useEffect(() => {
    if (open && lead) {
      setError(null);
      setSubmitting(false);
      applyPreset('TODAY_4PM');
    }
  }, [open, lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !dueAt || !title.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await createReminder({
          leadId: lead.id,
          title: title.trim(),
          reminderType,
          dueAt: new Date(dueAt).toISOString(),
          priority,
          notes: notes.trim() || undefined,
        });

      if (onReminderSaved) {
        onReminderSaved(result);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule reminder');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AccessibleDialog
      open={open && Boolean(lead)}
      onClose={onClose}
      titleId="quick-reminder-title"
      descriptionId="quick-reminder-description"
      size="md"
    >
      {lead && (
        <div className="space-y-4 text-content font-sans">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 id="quick-reminder-title" className="font-bold text-content text-base font-display flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" />
                Schedule Follow-up Reminder
              </h2>
              <p id="quick-reminder-description" className="mt-0.5 text-xs text-content-secondary">
                For <strong className="text-content">{lead.fullName || 'Lead'}</strong> {lead.phoneE164 && <span className="font-mono text-accent-text font-bold">({lead.phoneE164})</span>}
              </p>
            </div>
            <button
              type="button"
              data-dialog-close
              aria-label="Close reminder modal"
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

          {/* Quick Date Preset Chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-content-secondary uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-accent" /> 1-Click Quick Cadence Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset('15M')}
                className="px-2.5 py-1.5 rounded-lg bg-status-danger-surface border border-status-danger/30 hover:border-status-danger text-status-danger text-xs font-bold transition-all cursor-pointer"
              >
                ⚡ In 15m (SLA Speed-to-Lead)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('TODAY_4PM')}
                className="px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-subtle text-content text-xs font-semibold transition-all cursor-pointer"
              >
                ⏰ Today 4:00 PM
              </button>
              <button
                type="button"
                onClick={() => applyPreset('TOMORROW_10AM')}
                className="px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-subtle text-content text-xs font-semibold transition-all cursor-pointer"
              >
                🌅 Tomorrow 10:30 AM
              </button>
              <button
                type="button"
                onClick={() => applyPreset('IN_3DAYS')}
                className="px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-subtle text-content text-xs font-semibold transition-all cursor-pointer"
              >
                🏖️ In 3 Days
              </button>
              <button
                type="button"
                onClick={() => applyPreset('IN_7DAYS')}
                className="px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-subtle text-content text-xs font-semibold transition-all cursor-pointer"
              >
                🔄 In 7 Days
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {/* Title */}
            <div>
              <label htmlFor="reminder-title" className="text-content-secondary font-medium block mb-1">
                Reminder / Action Description:
              </label>
              <input
                id="reminder-title"
                name="title"
                required
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Call to discuss 2 BHK Kharghar Sec 35 floor plans"
                className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content font-medium focus:outline-none focus:border-accent"
              />
            </div>

            {/* Reminder Type Pills */}
            <fieldset>
              <legend className="text-content-secondary font-medium block mb-1.5">
                Channel / Interaction Type:
              </legend>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {[
                  { id: 'CALL', label: 'Phone Call', icon: Phone },
                  { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare },
                  { id: 'SITE_VISIT_FOLLOWUP', label: 'Site Visit', icon: Car },
                  { id: 'REQUIREMENT_CHECK', label: 'Shortlist', icon: FileText },
                  { id: 'TOKEN_FOLLOWUP', label: 'Token', icon: DollarSign },
                ].map((t) => {
                  const Icon = t.icon;
                  const isSelected = reminderType === t.id;
                  return (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setReminderType(t.id)}
                      aria-pressed={isSelected}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-accent text-white border-accent shadow-xs'
                          : 'bg-surface text-content-secondary border-border hover:bg-surface-subtle'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Date Time Picker & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="reminder-due" className="text-content-secondary font-medium block mb-1">
                  Due Date &amp; Time:
                </label>
                <input
                  id="reminder-due"
                  name="dueAt"
                  required
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content font-mono font-bold focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-content-secondary font-medium block mb-1 text-xs">
                  Urgency Tier:
                </label>
                <CustomSelect
                  options={URGENCY_OPTIONS}
                  value={priority}
                  onChange={(val) => setPriority(val)}
                  className="w-full"
                  triggerClassName="bg-surface-inset border-border rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="reminder-notes" className="text-content-secondary font-medium block mb-1">
                Context / Script Notes (Optional):
              </label>
              <textarea
                id="reminder-notes"
                name="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Buyer inquired about ready-to-move options with metro connectivity..."
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
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                {submitting ? 'Scheduling…' : 'Schedule Reminder'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AccessibleDialog>
  );
}
