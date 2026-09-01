'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home, ShieldCheck } from 'lucide-react';
import { toUserMessage } from '@/lib/client/user-feedback';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep internal error logging for dev telemetry
    console.error('Unhandled View Error:', error);
  }, [error]);

  const userMsg = toUserMessage(
    error,
    'Temporary View Interruption',
    'We encountered an unexpected issue while preparing this view. All your pipeline records and client details remain completely safe.'
  );

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-status-danger-surface border border-status-danger/20 flex items-center justify-center text-status-danger shadow-2xs">
          <AlertCircle className="w-7 h-7" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-content font-display tracking-tight">
            {userMsg.title}
          </h1>
          <p className="text-xs text-content-secondary leading-relaxed max-w-sm mx-auto">
            {userMsg.description}
          </p>
        </div>

        <div className="p-3 bg-surface-subtle border border-border/80 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-semibold text-content-secondary">
          <ShieldCheck className="w-4 h-4 text-status-success shrink-0" />
          <span>All database records and lead telemetry are fully preserved.</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto px-5 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload View</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-3 bg-surface hover:bg-surface-subtle border border-border text-content text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Home className="w-4 h-4 text-content-secondary" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
