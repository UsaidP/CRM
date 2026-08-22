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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-surface border border-border rounded-2xl shadow-2xl text-content">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-border bg-surface-subtle flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-accent-soft border border-accent/20 rounded-xl text-accent">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold tracking-tight text-content">Merge &amp; Deduplicate Contact</h3>
              <p className="text-xs text-content-muted">Consolidate multiple phone numbers and social handles into one record</p>
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

          {/* Source Contact Summary */}
          <div className="p-3.5 bg-surface-inset border border-border rounded-xl space-y-1">
            <p className="text-[11px] uppercase font-semibold text-content-muted">Source Contact (Will be merged and closed):</p>
            <p className="text-sm font-semibold text-content">{sourceLead.fullName || 'Unnamed Prospect'}</p>
            <p className="text-xs font-mono text-content-muted">{sourceLead.phoneE164 || 'Social Lead'}</p>
          </div>

          {/* Target Contact Selector */}
          <div>
            <label className="block text-xs font-medium text-content mb-1.5">
              Select Primary Target Contact Record <span className="text-accent">*</span>
            </label>
            <select
              required
              value={targetContactId}
              onChange={(e) => setTargetContactId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-inset border border-border rounded-xl text-sm text-content focus:outline-none focus:border-accent"
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
            <label className="block text-xs font-medium text-content mb-1">Merge Reason &amp; Audit Justification</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-inset border border-border rounded-xl text-sm text-content focus:outline-none focus:border-accent"
            />
          </div>

          <div className="p-3 bg-accent-soft border border-accent/20 rounded-xl text-xs text-accent-text flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-accent mt-0.5" />
            <span>
              All identities (phone numbers, WhatsApp IDs, Instagram IGIDs) and historical communications will be preserved and linked to the target contact. A full audit snapshot is recorded.
            </span>
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
