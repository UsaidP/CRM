'use client';

import React, { useState } from 'react';
import { Phone, PhoneCall, PhoneMissed, PhoneOutgoing, User, Check, X, ShieldAlert, Sparkles } from 'lucide-react';
import { OFFICIAL_BROKER_NUMBERS } from '@/lib/constants/broker-constants';

interface CallLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CallLogModal({ isOpen, onClose, onSuccess }: CallLogModalProps) {
  const [callerNumber, setCallerNumber] = useState('');
  const [callerName, setCallerName] = useState('');
  const [contactedBrokerNumber, setContactedBrokerNumber] = useState<string>(OFFICIAL_BROKER_NUMBERS.SAFWAN.e164);
  const [direction, setDirection] = useState<'INCOMING' | 'OUTGOING' | 'MISSED'>('INCOMING');
  const [durationSeconds, setDurationSeconds] = useState(60);
  const [sourceCode, setSourceCode] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/mobile/call-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerNumber,
          callerName: callerName.trim() || undefined,
          contactedBrokerNumber,
          direction,
          durationSeconds: direction === 'MISSED' ? 0 : Number(durationSeconds),
          sourceCode: sourceCode.trim() ? sourceCode.trim().toUpperCase() : undefined,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to log call event');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error logging call');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-surface border border-border rounded-2xl shadow-2xl text-content">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-border bg-surface-subtle flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-accent-soft border border-accent/20 rounded-xl text-accent">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold tracking-tight text-content flex items-center gap-2">
                Mobile Quick Call Logger
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-accent-soft text-accent-text border border-accent/20">
                  Broker Desk
                </span>
              </h3>
              <p className="text-xs text-content-muted">Capture direct calls, missed calls, and buyer source codes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-content-muted hover:text-content hover:bg-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-status-danger-surface border border-status-danger/30 rounded-xl text-status-danger text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-status-danger" />
              <span>{error}</span>
            </div>
          )}

          {/* Broker Line Selection */}
          <div>
            <label className="block text-xs font-medium text-content mb-1.5">
              Contacted Broker Line <span className="text-accent">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setContactedBrokerNumber(OFFICIAL_BROKER_NUMBERS.SAFWAN.e164)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  contactedBrokerNumber === OFFICIAL_BROKER_NUMBERS.SAFWAN.e164
                    ? 'border-accent bg-accent-soft text-accent-text ring-1 ring-accent/30'
                    : 'border-border bg-surface-inset text-content-muted hover:border-border-strong hover:text-content'
                }`}
              >
                <p className="text-xs font-semibold text-content">Safwan Diwan</p>
                <p className="text-[11px] font-mono text-accent-text">{OFFICIAL_BROKER_NUMBERS.SAFWAN.e164}</p>
                <p className="text-[10px] text-content-muted mt-0.5">Kharghar Sector 35/20 Lead</p>
              </button>

              <button
                type="button"
                onClick={() => setContactedBrokerNumber(OFFICIAL_BROKER_NUMBERS.SUHEL.e164)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  contactedBrokerNumber === OFFICIAL_BROKER_NUMBERS.SUHEL.e164
                    ? 'border-accent bg-accent-soft text-accent-text ring-1 ring-accent/30'
                    : 'border-border bg-surface-inset text-content-muted hover:border-border-strong hover:text-content'
                }`}
              >
                <p className="text-xs font-semibold text-content">Suhel Patel</p>
                <p className="text-[11px] font-mono text-accent-text">{OFFICIAL_BROKER_NUMBERS.SUHEL.e164}</p>
                <p className="text-[10px] text-content-muted mt-0.5">Taloja Phase 1/2 Lead</p>
              </button>
            </div>
          </div>

          {/* Caller Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-content mb-1">
                Caller Phone Number <span className="text-accent">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. 9820566778"
                value={callerNumber}
                onChange={(e) => setCallerNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-inset border border-border rounded-xl text-sm text-content placeholder:text-content-muted focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content mb-1">Caller Full Name</label>
              <input
                type="text"
                placeholder="e.g. Vikram Mehta"
                value={callerName}
                onChange={(e) => setCallerName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-inset border border-border rounded-xl text-sm text-content placeholder:text-content-muted focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Call Direction & Duration */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setDirection('INCOMING')}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-medium transition-all ${
                direction === 'INCOMING'
                  ? 'border-status-success/50 bg-status-success-surface text-status-success font-semibold'
                  : 'border-border bg-surface-inset text-content-muted hover:border-border-strong hover:text-content'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Incoming
            </button>
            <button
              type="button"
              onClick={() => setDirection('OUTGOING')}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-medium transition-all ${
                direction === 'OUTGOING'
                  ? 'border-accent/50 bg-accent-soft text-accent-text font-semibold'
                  : 'border-border bg-surface-inset text-content-muted hover:border-border-strong hover:text-content'
              }`}
            >
              <PhoneOutgoing className="w-3.5 h-3.5" />
              Outgoing
            </button>
            <button
              type="button"
              onClick={() => setDirection('MISSED')}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-medium transition-all ${
                direction === 'MISSED'
                  ? 'border-status-danger/50 bg-status-danger-surface text-status-danger font-semibold'
                  : 'border-border bg-surface-inset text-content-muted hover:border-border-strong hover:text-content'
              }`}
            >
              <PhoneMissed className="w-3.5 h-3.5" />
              Missed
            </button>
          </div>

          {direction !== 'MISSED' && (
            <div>
              <label className="block text-xs font-medium text-content mb-1">Call Duration (Seconds)</label>
              <input
                type="number"
                min="1"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-surface-inset border border-border rounded-xl text-sm text-content focus:outline-none focus:border-accent"
              />
            </div>
          )}

          {/* Stated Campaign Source Code */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-content flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                Stated Campaign Source Code (Optional)
              </label>
              <span className="text-[10px] text-content-muted">e.g. TALOJA21, MARVEL35, CROWN12</span>
            </div>
            <input
              type="text"
              placeholder="e.g. MARVEL35 (Leave empty if caller did not state code)"
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 bg-surface-inset border border-border rounded-xl text-sm text-accent-text font-mono placeholder:text-content-muted focus:outline-none focus:border-accent"
            />
            <p className="text-[11px] text-content-muted mt-1">
              💡 Direct calls without a valid stated code are strictly marked as{' '}
              <span className="font-mono text-content-secondary">PHONE_ORGANIC_UNKNOWN</span>.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-content mb-1">Broker Notes &amp; Discussion</label>
            <textarea
              rows={2}
              placeholder="e.g. Client inquired about ready 2 BHK in Kharghar 35 with OC. Scheduled Saturday visit."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-inset border border-border rounded-xl text-sm text-content placeholder:text-content-muted focus:outline-none focus:border-accent"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-content-secondary hover:text-content transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Logging Call...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Call Event</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
