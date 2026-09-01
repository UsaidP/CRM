import Link from 'next/link';
import { Compass, Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-accent-soft text-accent flex items-center justify-center shadow-2xs border border-accent/20">
          <Compass className="w-7 h-7" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-content font-display tracking-tight">
            Page or Record Not Found
          </h1>
          <p className="text-xs text-content-secondary leading-relaxed max-w-sm mx-auto">
            The page, project, or lead record you requested could not be located. It may have been moved, renamed, or archived.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
          <Link
            href="/leads"
            className="w-full sm:w-auto px-5 py-3 bg-surface hover:bg-surface-subtle border border-border text-content text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Search className="w-4 h-4 text-content-secondary" />
            <span>Browse Leads</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
