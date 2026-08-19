'use client';

import React from 'react';

interface HallmarkStampProps {
  type?: 'rera' | 'audit' | 'ledger' | 'source' | 'verified';
  label?: string;
  code?: string;
  date?: string | Date;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function HallmarkStamp({
  type = 'rera',
  label,
  code,
  date,
  size = 'sm',
  className = '',
}: HallmarkStampProps) {
  const formattedDate = date
    ? typeof date === 'string'
      ? date
      : new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : undefined;

  const defaultLabels = {
    rera: 'RERA ID recorded',
    audit: 'Broker review recorded',
    ledger: 'Ledger calculated',
    source: 'Source recorded',
    verified: 'Record checked',
  };

  const displayLabel = label || defaultLabels[type];

  return (
    <div
      title={`${displayLabel} ${code ? `[${code}]` : ''} ${formattedDate ? `• Recorded on ${formattedDate}` : ''}`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono transition-all duration-300 select-none group cursor-help ${
        type === 'rera'
          ? 'bg-[#1b202c] text-[#ccb67b] border border-[#b59658]/40 hover:border-[#b59658] shadow-[0_0_8px_rgba(181,150,88,0.15)]'
          : type === 'audit'
          ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/40 hover:border-emerald-400'
          : type === 'ledger'
          ? 'bg-blue-950/40 text-blue-300 border border-blue-500/40 hover:border-blue-400'
          : 'bg-[#1b202c] text-slate-300 border border-slate-700'
      } ${size === 'sm' ? 'text-[10px] leading-tight' : 'text-xs py-1 px-2.5'} ${className}`}
    >
      {/* Hallmark Assay Seal Glyph */}
      <span className="relative flex items-center justify-center">
        <span className="w-3.5 h-3.5 rounded-sm border border-current flex items-center justify-center rotate-45 group-hover:rotate-0 transition-transform duration-300">
          <span className="w-1.5 h-1.5 bg-current rounded-full" />
        </span>
      </span>

      <span className="font-semibold tracking-wider uppercase flex items-center gap-1">
        {displayLabel}
        {code && <span className="opacity-80 font-normal">#{code}</span>}
      </span>

      {formattedDate && (
        <span className="text-[9px] opacity-70 border-l border-current/30 pl-1 ml-0.5 hidden sm:inline">
          {formattedDate}
        </span>
      )}
    </div>
  );
}
