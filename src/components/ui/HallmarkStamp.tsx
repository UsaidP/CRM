import React from 'react';
import { formatDateFull } from '@/lib/date-utils';

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
      : formatDateFull(date)
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
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono transition-all duration-200 select-none group cursor-help ${
        type === 'rera'
          ? 'bg-surface-subtle text-accent-text border border-accent/40 hover:border-accent shadow-[0_0_8px_rgba(37,99,235,0.15)]'
          : type === 'audit'
          ? 'bg-status-success-surface text-status-success border border-status-success/40 hover:border-status-success'
          : type === 'ledger'
          ? 'bg-status-info-surface text-status-info border border-status-info/40 hover:border-status-info'
          : 'bg-surface-subtle text-content-secondary border border-border'
      } ${size === 'sm' ? 'text-[10px] leading-tight' : 'text-xs py-1 px-2.5'} ${className}`}
    >
      {/* Hallmark Assay Seal Glyph */}
      <span className="relative flex items-center justify-center">
        <span className="w-3.5 h-3.5 rounded-sm border border-current flex items-center justify-center rotate-45 group-hover:rotate-0 transition-transform duration-200">
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
