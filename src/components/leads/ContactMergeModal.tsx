'use client';

import React, { useState } from 'react';
import { GitMerge, AlertCircle, Check, X, ShieldAlert } from 'lucide-react';

interface ContactMergeModalProps {
  isOpen: boolean;
  sourceLead: any | null;
  allLeads: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export function ContactMergeModal({
  isOpen,
  sourceLead,
  allLeads,
  onClose,
  onSuccess,
}: ContactMergeModalProps) {
  const [targetContactId, setTargetContactId] = useState<string>('');
  const [reason, setReason] = useState<string>('Duplicate phone/social inquiries from same buyer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !sourceLead) return null;

  const currentContactId = sourceLead.contactId || sourceLead.id;

  // Filter candidate targets
  const candidateLeads = allLeads.filter(
    (l) => (l.contactId || l.id) !== currentContactId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetContactId) {
      setError('Please select a target contact to merge into.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/contacts/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceContactId: currentContactId,
          targetContactId,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Contact merge failed');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error merging contacts');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0e1017] border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800 bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-white">Merge & Deduplicate Contact</h3>
              <p className="text-xs text-zinc-400">Consolidate multiple phone numbers and social handles into one record</p>
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

          {/* Source Contact Summary */}
          <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-1">
            <p className="text-[11px] uppercase font-semibold text-zinc-400">Source Contact (Will be merged and closed):</p>
            <p className="text-sm font-semibold text-white">{sourceLead.fullName || 'Unnamed Prospect'}</p>
            <p className="text-xs font-mono text-zinc-400">{sourceLead.phoneE164 || 'Social Lead'}</p>
          </div>

          {/* Target Contact Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Select Primary Target Contact Record <span className="text-amber-400">*</span>
            </label>
            <select
              required
              value={targetContactId}
              onChange={(e) => setTargetContactId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/60"
            >
              <option value="">-- Choose Canonical Contact --</option>
              {candidateLeads.map((l) => (
                <option key={l.id} value={l.contactId || l.id}>
                  {l.fullName || 'Prospect'} ({l.phoneE164 || l.leadSource}) - ID: {(l.contactId || l.id).substring(0, 8)}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Merge Reason & Audit Justification</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <span>
              All identities (phone numbers, WhatsApp IDs, Instagram IGIDs) and historical communications will be preserved and linked to the target contact. A full audit snapshot is recorded.
            </span>
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
              {isSubmitting ? <span>Merging...</span> : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Execute Contact Merge</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
