import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { 
  Building2, 
  Calculator, 
  Layers, 
  ShieldCheck, 
  Sparkles, 
  Share2, 
  Users, 
  CheckCircle2,
  Globe,
  Calendar,
  DollarSign,
  BarChart3
} from 'lucide-react';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export const metadata: Metadata = {
  title: 'ZamZam Properties | Real Estate CRM & Operations Suite',
  description: 'Organic Social-First Real Estate CRM with MahaRERA Invariant Verification, All-In Cost Intelligence, Dynamic Matching, Tokenized Portals, Site Visits, and Deal Ledger.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="theme-gold-ink dark">
      <body className="antialiased selection:bg-[#b59658] selection:text-[#12151f]">
        <ThemeProvider>
          <div className="flex min-h-screen">
            {/* Sidebar Navigation */}
            <aside className="w-64 border-r border-[#b59658]/20 bg-[#12151f]/95 backdrop-blur-md flex flex-col fixed inset-y-0 z-50 shadow-2xl">
              {/* Brand Header */}
              <div className="p-5 border-b border-[#b59658]/20 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8a6f3c] via-[#b59658] to-[#ccb67b] flex items-center justify-center shadow-lg shadow-[#b59658]/20 border border-[#ccb67b]/50">
                  <Building2 className="w-5 h-5 text-[#12151f]" />
                </div>
                <div>
                  <h1 className="font-bold text-base tracking-tight text-white font-display flex items-center gap-1.5">
                    ZamZam <span className="text-[#ccb67b] text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#1b202c] border border-[#b59658]/40">CRM</span>
                  </h1>
                  <p className="text-[10px] text-[#ccb67b]/80 font-medium tracking-wider uppercase">Navi Mumbai Advisory</p>
                </div>
              </div>

              {/* Theme Switcher Widget */}
              <div className="px-3 pt-3 pb-1">
                <ThemeToggle />
              </div>

              <div className="rule-gold mx-3 my-2" />

              {/* Navigation Menu */}
              <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto text-sm">
                <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Core Operations
                </div>
                
                <Link
                  href="/"
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-[#1b202c] border border-transparent hover:border-[#b59658]/30 transition-all group font-medium text-xs"
                >
                  <Layers className="w-4 h-4 text-[#ccb67b] group-hover:scale-110 transition-transform" />
                  Dashboard Hub
                </Link>

                <Link
                  href="/analytics"
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-[#1b202c] border border-transparent hover:border-[#b59658]/30 transition-all group font-medium text-xs"
                >
                  <BarChart3 className="w-4 h-4 text-[#ccb67b] group-hover:scale-110 transition-transform" />
                  Analytics &amp; ROI
                  <span className="ml-auto text-[9px] bg-gradient-to-r from-[#8a6f3c] to-[#ccb67b] text-[#12151f] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm">
                    P7
                  </span>
                </Link>

                <Link
                  href="/portals"
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-[#1b202c] border border-transparent hover:border-[#b59658]/30 transition-all group font-medium text-xs"
                >
                  <Globe className="w-4 h-4 text-[#ccb67b] group-hover:scale-110 transition-transform" />
                  Client Portals
                  <span className="ml-auto text-[9px] bg-[#b59658]/20 text-[#ccb67b] font-mono font-bold px-1.5 py-0.5 rounded border border-[#b59658]/40">
                    Telemetry
                  </span>
                </Link>

                <Link
                  href="/matching"
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-[#1b202c] border border-transparent hover:border-[#b59658]/30 transition-all group font-medium text-xs"
                >
                  <Sparkles className="w-4 h-4 text-[#b59658] group-hover:scale-110 transition-transform" />
                  Property Matchmaker
                  <span className="ml-auto text-[9px] bg-[#1b202c] text-[#ccb67b] font-mono font-semibold px-1.5 py-0.5 rounded border border-[#b59658]/30">
                    AI
                  </span>
                </Link>

                <Link
                  href="/visits"
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-[#1b202c] border border-transparent hover:border-[#b59658]/30 transition-all group font-medium text-xs"
                >
                  <Calendar className="w-4 h-4 text-[#ccb67b] group-hover:scale-110 transition-transform" />
                  Site Visits &amp; Tours
                  <span className="ml-auto text-[9px] bg-[#1b202c] text-[#ccb67b] font-mono font-semibold px-1.5 py-0.5 rounded border border-[#b59658]/30">
                    Tour
                  </span>
                </Link>

                <Link
                  href="/deals"
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-[#1b202c] border border-transparent hover:border-[#b59658]/30 transition-all group font-medium text-xs"
                >
                  <DollarSign className="w-4 h-4 text-[#ccb67b] group-hover:scale-110 transition-transform" />
                  Deals &amp; Commission
                  <span className="ml-auto text-[9px] bg-[#1b202c] text-[#ccb67b] font-mono font-bold px-1.5 py-0.5 rounded border border-[#b59658]/30">
                    Ledger
                  </span>
                </Link>

                <Link
                  href="/leads"
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-[#1b202c] border border-transparent hover:border-[#b59658]/30 transition-all group font-medium text-xs"
                >
                  <Users className="w-4 h-4 text-[#ccb67b] group-hover:scale-110 transition-transform" />
                  Leads &amp; Inquiries
                  <span className="ml-auto text-[9px] bg-[#1b202c] text-[#ccb67b] font-mono font-semibold px-1.5 py-0.5 rounded border border-[#b59658]/30">
                    Live
                  </span>
                </Link>

                <Link
                  href="/attribution"
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-[#1b202c] border border-transparent hover:border-[#b59658]/30 transition-all group font-medium text-xs"
                >
                  <Share2 className="w-4 h-4 text-[#ccb67b] group-hover:scale-110 transition-transform" />
                  Organic Attribution
                  <span className="ml-auto text-[9px] bg-[#1b202c] text-[#ccb67b] font-mono font-semibold px-1.5 py-0.5 rounded border border-[#b59658]/30">
                    No Ads
                  </span>
                </Link>

                <Link
                  href="/inventory"
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-[#1b202c] border border-transparent hover:border-[#b59658]/30 transition-all group font-medium text-xs"
                >
                  <ShieldCheck className="w-4 h-4 text-[#ccb67b] group-hover:scale-110 transition-transform" />
                  Verified Inventory
                  <span className="ml-auto text-[9px] bg-[#1b202c] text-[#ccb67b] font-mono font-bold px-1.5 py-0.5 rounded border border-[#b59658]/30">
                    RERA
                  </span>
                </Link>

                <Link
                  href="/calculator"
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-[#1b202c] border border-transparent hover:border-[#b59658]/30 transition-all group font-medium text-xs"
                >
                  <Calculator className="w-4 h-4 text-[#ccb67b] group-hover:scale-110 transition-transform" />
                  All-In Cost Engine
                  <span className="ml-auto text-[9px] bg-[#1b202c] text-[#ccb67b] font-mono font-semibold px-1.5 py-0.5 rounded border border-[#b59658]/30">
                    C_all-in
                  </span>
                </Link>
              </nav>

              {/* Bottom Status Card with RERA Badge */}
              <div className="p-3.5 m-3 rounded-2xl bg-[#1b202c]/90 border border-[#b59658]/30 text-xs shadow-md">
                <div className="flex items-center gap-2 text-[#ccb67b] font-semibold mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#b59658]" />
                  <span className="font-display">MahaRERA Registered</span>
                </div>
                <p className="text-slate-400 text-[10px] leading-relaxed font-mono">
                  Reg No: A52000029381 • 100% Verified Navi Mumbai Mandates
                </p>
              </div>
            </aside>

            {/* Main Content Viewport */}
            <main className="flex-1 ml-64 p-8 min-h-screen">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
