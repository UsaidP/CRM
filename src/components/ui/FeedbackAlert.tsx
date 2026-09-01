'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X, RefreshCw } from 'lucide-react';
import { toUserMessage, UserMessage } from '@/lib/client/user-feedback';

export type AlertVariant = 'error' | 'success' | 'warning' | 'info';

export interface FeedbackAlertProps {
  variant?: AlertVariant;
  title?: string;
  description?: React.ReactNode;
  /**
   * If an unknown or raw error object/string is passed, FeedbackAlert will automatically
   * normalize it into plain, user-friendly language.
   */
  error?: unknown;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
}

export function FeedbackAlert({
  variant = 'error',
  title,
  description,
  error,
  actionLabel,
  onAction,
  onDismiss,
  className = '',
  size = 'md',
  id,
}: FeedbackAlertProps) {
  // If raw error is passed, resolve it through our user-first normalizer
  let resolvedTitle = title;
  let resolvedDesc = description;
  let resolvedActionLabel = actionLabel;

  if (error) {
    const normalized: UserMessage = toUserMessage(error);
    if (!resolvedTitle) resolvedTitle = normalized.title;
    if (!resolvedDesc) resolvedDesc = normalized.description;
    if (!resolvedActionLabel && onAction && normalized.actionLabel) {
      resolvedActionLabel = normalized.actionLabel;
    }
  }

  if (!resolvedTitle && !resolvedDesc) {
    return null;
  }

  const isAlert = variant === 'error' || variant === 'warning';
  const role = isAlert ? 'alert' : 'status';

  // Styling based on design tokens
  const variantStyles = {
    error: {
      container: 'bg-status-danger-surface border-status-danger/30 text-status-danger',
      iconColor: 'text-status-danger',
      btnBg: 'bg-status-danger hover:bg-status-danger/90 text-white',
      closeHover: 'hover:bg-status-danger/10 text-status-danger',
      Icon: AlertCircle,
    },
    warning: {
      container: 'bg-status-warning-surface border-status-warning/40 text-status-warning',
      iconColor: 'text-status-warning',
      btnBg: 'bg-status-warning hover:bg-status-warning/90 text-white',
      closeHover: 'hover:bg-status-warning/10 text-status-warning',
      Icon: AlertTriangle,
    },
    success: {
      container: 'bg-status-success-surface border-status-success/30 text-status-success',
      iconColor: 'text-status-success',
      btnBg: 'bg-status-success hover:bg-status-success/90 text-white',
      closeHover: 'hover:bg-status-success/10 text-status-success',
      Icon: CheckCircle2,
    },
    info: {
      container: 'bg-status-info-surface border-status-info/30 text-status-info',
      iconColor: 'text-status-info',
      btnBg: 'bg-status-info hover:bg-status-info/90 text-white',
      closeHover: 'hover:bg-status-info/10 text-status-info',
      Icon: Info,
    },
  }[variant];

  const { Icon } = variantStyles;

  const sizeClasses = {
    sm: 'p-2.5 text-xs gap-2',
    md: 'p-3.5 text-xs gap-3',
    lg: 'p-4 text-sm gap-3.5',
  }[size];

  return (
    <div
      id={id}
      role={role}
      aria-live={isAlert ? 'assertive' : 'polite'}
      className={`rounded-2xl border flex items-start justify-between shadow-2xs transition-all duration-200 animate-in fade-in-50 slide-in-from-top-1 ${variantStyles.container} ${sizeClasses} ${className}`}
    >
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${variantStyles.iconColor}`} aria-hidden="true" />
        <div className="space-y-0.5 flex-1 min-w-0">
          {resolvedTitle && (
            <h4 className="font-bold leading-tight tracking-tight text-content font-display">
              {resolvedTitle}
            </h4>
          )}
          {resolvedDesc && (
            <div className="text-content-secondary font-medium leading-relaxed break-words">
              {resolvedDesc}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-2">
        {onAction && resolvedActionLabel && (
          <button
            type="button"
            onClick={onAction}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer min-h-[32px] ${variantStyles.btnBg}`}
          >
            <RefreshCw className="w-3 h-3" />
            <span>{resolvedActionLabel}</span>
          </button>
        )}

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss message"
            className={`p-1 rounded-lg transition-colors cursor-pointer min-h-[28px] min-w-[28px] flex items-center justify-center ${variantStyles.closeHover}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default FeedbackAlert;
