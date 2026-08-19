'use client';

import React, { useState } from 'react';
import { Phone, PhoneCall, PhoneMissed, PhoneOutgoing, User, Check, X, ShieldAlert, Sparkles } from 'lucide-react';
import { OFFICIAL_BROKER_NUMBERS } from '@/lib/domain/broker-resolver';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0e1017] border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800/80 bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
                Mobile Quick Call Logger
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Broker Desk
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Capture direct calls, missed calls, and buyer source codes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Broker Line Selection */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Contacted Broker Line <span className="text-amber-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setContactedBrokerNumber(OFFICIAL_BROKER_NUMBERS.SAFWAN.e164)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  contactedBrokerNumber === OFFICIAL_BROKER_NUMBERS.SAFWAN.e164
                    ? 'border-amber-500/60 bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/40'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <p className="text-xs font-semibold text-white">Safwan Diwan</p>
                <p className="text-[11px] font-mono text-amber-400/90">{OFFICIAL_BROKER_NUMBERS.SAFWAN.e164}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Kharghar Sector 35/20 Lead</p>
              </button>

              <button
                type="button"
                onClick={() => setContactedBrokerNumber(OFFICIAL_BROKER_NUMBERS.SUHEL.e164)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  contactedBrokerNumber === OFFICIAL_BROKER_NUMBERS.SUHEL.e164
                    ? 'border-amber-500/60 bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/40'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <p className="text-xs font-semibold text-white">Suhel Patel</p>
                <p className="text-[11px] font-mono text-amber-400/90">{OFFICIAL_BROKER_NUMBERS.SUHEL.e164}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Taloja Phase 1/2 Lead</p>
              </button>
            </div>
          </div>

          {/* Caller Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Caller Phone Number <span className="text-amber-400">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. 9820566778"
                value={callerNumber}
                onChange={(e) => setCallerNumber(e.target.value)}
                className="w-full px-3.5 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Caller Full Name</label>
              <input
                type="text"
                placeholder="e.g. Vikram Mehta"
                value={callerName}
                onChange={(e) => setCallerName(e.target.value)}
                className="w-full px-3.5 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
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
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
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
                  ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
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
                  ? 'border-red-500/50 bg-red-500/10 text-red-300'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <PhoneMissed className="w-3.5 h-3.5" />
              Missed
            </button>
          </div>

          {direction !== 'MISSED' && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Call Duration (Seconds)</label>
              <input
                type="number"
                min="1"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/60"
              />
            </div>
          )}

          {/* Stated Campaign Source Code */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Stated Campaign Source Code (Optional)
              </label>
              <span className="text-[10px] text-zinc-400">e.g. TALOJA21, MARVEL35, CROWN12</span>
            </div>
            <input
              type="text"
              placeholder="e.g. MARVEL35 (Leave empty if caller did not state code)"
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-sm text-amber-300 font-mono placeholder-zinc-600 focus:outline-none focus:border-amber-500/60"
            />
            <p className="text-[11px] text-zinc-400 mt-1">
              💡 Direct calls without a valid stated code are strictly marked as{' '}
              <span className="font-mono text-zinc-300">PHONE_ORGANIC_UNKNOWN</span>.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Broker Notes & Discussion</label>
            <textarea
              rows={2}
              placeholder="e.g. Client inquired about ready 2 BHK in Kharghar 35 with OC. Scheduled Saturday visit."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-semibold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
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
