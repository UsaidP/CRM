'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="p-4 rounded-full bg-status-danger-surface text-status-danger mb-4">
        <span className="font-mono text-2xl font-bold">500</span>
      </div>
      <h1 className="text-2xl font-bold text-content mb-2 font-display">System Error</h1>
      <p className="text-sm text-content-secondary max-w-md mb-6">
        An unexpected error occurred in this view. Your records and telemetry remain intact.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
        >
          Retry Operation
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 bg-surface hover:bg-surface-subtle border border-border text-content text-xs font-semibold rounded-xl transition-all shadow-2xs"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
