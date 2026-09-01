'use client';

import React from 'react';
import { LucideIcon, Inbox, Search, Plus, RotateCcw } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  type?: 'general' | 'search' | 'filter' | 'error';
}

export function EmptyState({
  icon: CustomIcon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
  type = 'general',
}: EmptyStateProps) {
  // Default icon based on state type
  const Icon =
    CustomIcon ||
    (type === 'search' || type === 'filter' ? Search : Inbox);

  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-3xl border border-dashed border-border bg-surface/50 transition-all ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-surface-subtle border border-border flex items-center justify-center text-content-secondary mb-4 shadow-2xs">
        <Icon className="w-6 h-6 text-content-muted" aria-hidden="true" />
      </div>

      <h3 className="text-base font-bold text-content font-display mb-1.5">{title}</h3>
      <p className="text-xs text-content-secondary max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {(onAction || onSecondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {onAction && actionLabel && (
            <button
              type="button"
              onClick={onAction}
              className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer min-h-[40px]"
            >
              {type === 'filter' || type === 'search' ? (
                <RotateCcw className="w-3.5 h-3.5" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>{actionLabel}</span>
            </button>
          )}

          {onSecondaryAction && secondaryActionLabel && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="px-4 py-2.5 bg-surface hover:bg-surface-subtle border border-border text-content text-xs font-semibold rounded-xl transition-all shadow-2xs flex items-center gap-2 cursor-pointer min-h-[40px]"
            >
              <span>{secondaryActionLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
