import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="p-4 rounded-full bg-accent-soft text-accent-text mb-4">
        <span className="font-mono text-2xl font-bold">404</span>
      </div>
      <h1 className="text-2xl font-bold text-content mb-2 font-display">Page Not Found</h1>
      <p className="text-sm text-content-secondary max-w-md mb-6">
        The requested operations view or record could not be found. Please check the URL or return to the main dashboard.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all shadow-xs"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
