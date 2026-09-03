'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  X,
  Search,
  Building2,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Info,
} from 'lucide-react';
import { ReraVerificationBadge } from './ReraVerificationBadge';

interface QuickReraLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRera?: string;
}

export function QuickReraLookupModal({
  isOpen,
  onClose,
  initialRera = '',
}: QuickReraLookupModalProps) {
  const [reraInput, setReraInput] = useState(initialRera);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rera-lookup-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface-raised">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="rera-lookup-modal-title" className="text-base font-bold text-content flex items-center gap-2">
                MahaRERA &amp; Statutory Registration Verifier
              </h2>
              <p className="text-xs text-content-secondary">
                Verify official government registration format, district codes, and CRM duplication.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-content-muted hover:text-content hover:bg-surface-subtle transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Input Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-content block uppercase tracking-wider font-mono">
              Enter RERA Registration Number
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="e.g. P52000028714 or A52000029381"
                value={reraInput}
                onChange={(e) => setReraInput(e.target.value.toUpperCase())}
                className="input w-full pl-10 pr-4 py-2.5 font-mono text-sm font-bold tracking-wider text-accent uppercase"
              />
              <Search className="w-4 h-4 text-content-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Live Validation Card */}
          <ReraVerificationBadge
            reraNumber={reraInput}
            showDuplicateCheck={true}
            showPortalLink={true}
            showCopyButton={true}
          />
          {/* Statutory Guide Note */}
          <div className="p-3.5 rounded-xl border border-border-subtle bg-surface-raised/50 text-xs text-content-muted space-y-1">
            <div className="font-semibold text-content flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-accent" />
              <span>MahaRERA Registration Structure</span>
            </div>
            <p className="leading-relaxed">
              MahaRERA project IDs use a 12-character format beginning with <strong>P</strong> followed by a 3-digit district code (e.g. <strong>520</strong> for Raigad/Navi Mumbai, <strong>518</strong> for Mumbai Suburban, <strong>517</strong> for Thane) and an 8-digit sequence. Real estate broker licenses begin with <strong>A</strong>.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-surface-raised flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
