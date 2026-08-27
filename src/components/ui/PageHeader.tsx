'use client';

import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  badgeType?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  badgeType = 'accent',
  actions,
  className = '',
}: PageHeaderProps) {
  const badgeClasses = {
    default: 'bg-surface-subtle text-content-muted border-border',
    accent: 'bg-accent-soft text-accent-text border-accent/25',
    success: 'bg-status-success-surface text-status-success border-status-success/30',
    warning: 'bg-status-warning-surface text-status-warning border-status-warning/30',
    danger: 'bg-status-danger-surface text-status-danger border-status-danger/30',
  }[badgeType];

  return (
    <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/80 ${className}`}>
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl md:text-2xl font-black text-content font-display tracking-tight truncate">
            {title}
          </h1>
          {badge && (
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border uppercase tracking-wider ${badgeClasses}`}>
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs md:text-sm text-content-secondary max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actions && <div className="flex items-center gap-3 shrink-0 flex-wrap">{actions}</div>}
    </div>
  );
}
