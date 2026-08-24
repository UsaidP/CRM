'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  Building2,
  Calculator,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  Flame,
  Globe,
  Layers,
  LayoutDashboard,
  Menu,
  PhoneCall,
  Plus,
  QrCode,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { isPublicPortalPath } from '@/lib/navigation';

interface NavItem {
  href: string;
  label: string;
  badge?: string;
  badgeType?: 'urgent' | 'count' | 'info';
  icon: any;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Operations & Dispatch',
    items: [
      { href: '/', label: 'Executive Dashboard', icon: LayoutDashboard },
      { href: '/leads', label: 'Leads & Calling Desk', badge: '3 Fresh', badgeType: 'urgent', icon: Users },
      { href: '/calendar', label: 'Schedule & Radar', icon: CalendarDays },
    ],
  },
  {
    title: 'Inventory & Advisory',
    items: [
      { href: '/inventory', label: 'Inventory & RERA', icon: ShieldCheck },
      { href: '/matching', label: 'Property Matchmaker', icon: Sparkles },
      { href: '/portals', label: 'Client Portals & Radar', icon: Globe },
      { href: '/visits', label: 'Site Visits & Tours', icon: Car },
    ],
  },
  {
    title: 'Commercial & Financial',
    items: [
      { href: '/deals', label: 'Deals & GST Invoices', icon: DollarSign },
      { href: '/calculator', label: 'Statutory Cost Engine', icon: Calculator },
      { href: '/attribution', label: 'Attribution & QR Codes', icon: QrCode },
      { href: '/analytics', label: 'Velocity Analytics', icon: BarChart3 },
    ],
  },
];

function isCurrentRoute(pathname: string, href: string) {
  return href === '/' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [callTimer, setCallTimer] = useState('04:18');
  const [isCallActive, setIsCallActive] = useState(true);

  const isPublicPortal = isPublicPortalPath(pathname);

  // Close mobile navigation on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Global Keyboard shortcuts: Ctrl+K or Cmd+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Simple call timer tick simulation for realistic operational console vibe
  useEffect(() => {
    if (!isCallActive) return;
    const interval = setInterval(() => {
      const parts = callTimer.split(':');
      let min = parseInt(parts[0], 10);
      let sec = parseInt(parts[1], 10) + 1;
      if (sec >= 60) {
        min += 1;
        sec = 0;
      }
      setCallTimer(`${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [callTimer, isCallActive]);

  if (isPublicPortal) {
    return <main className="public-portal-main min-h-screen bg-[#FBFBF9] dark:bg-[#081C15]">{children}</main>;
  }

  // Find active item for breadcrumbs
  const allNavItems = navSections.flatMap((s) => s.items);
  const activeItem = allNavItems.find((item) => isCurrentRoute(pathname, item.href)) || {
    label: 'Console',
    href: '/',
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-content antialiased">
      {/* Mobile Top Header */}
      <header className="lg:hidden flex items-center justify-between px-4 h-[60px] bg-surface border-b border-border z-50 sticky top-0">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-sm shadow-xs">
            Z
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-content font-display">ZamZam Realty</span>
            <span className="block text-[10px] text-content-muted uppercase tracking-wider font-semibold">Tele-Ops</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="p-2 rounded-xl text-content-muted hover:text-content hover:bg-surface-subtle transition-colors cursor-pointer"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>
          <ThemeToggle variant="compact" />
          <button
            type="button"
            className="p-2 rounded-xl text-content-muted hover:text-content hover:bg-surface-subtle transition-colors cursor-pointer"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setIsMenuOpen((prev) => !prev)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Backdrop */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <div className="flex flex-1 relative">
        {/* Stitch 280px Left Navigation Sidebar */}
        <aside
          id="app-navigation"
          className={`fixed lg:sticky top-0 left-0 h-screen max-h-screen w-[280px] bg-surface-subtle border-r border-border z-40 flex flex-col transition-transform duration-200 ease-out shrink-0 overflow-hidden ${
            isMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Sidebar Header & Branding - Fixed at Top */}
          <div className="shrink-0 p-4 pb-3 border-b border-border bg-surface/80 backdrop-blur-xs">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-lg shadow-xs group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-[15px] tracking-tight text-content font-display truncate">
                    ZamZam Realty
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-content-muted truncate">
                  <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
                  <span className="font-mono">MahaRERA R-51700000001</span>
                </div>
              </div>
            </Link>

            {/* Quick Action: New Inbound Lead / Quick Call */}
            <div className="mt-3">
              <Link
                href="/leads?view=telecaller&action=new"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-98"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Lead / Call</span>
              </Link>
            </div>
          </div>

          {/* Grouped Navigation Links - Only this area scrolls */}
          <nav className="flex-1 min-h-0 px-3 py-3 space-y-4 overflow-y-auto" aria-label="Primary navigation">
            {navSections.map((section) => (
              <div key={section.title} className="space-y-1">
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-content-muted font-mono">
                  {section.title}
                </div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isCurrentRoute(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all ${
                        isActive
                          ? 'bg-accent-soft text-accent-text font-bold shadow-2xs border-l-4 border-accent'
                          : 'text-content-muted hover:bg-surface hover:text-content font-medium'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent' : 'text-content-muted'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 font-mono ${
                            item.badgeType === 'urgent'
                              ? 'bg-status-danger-surface text-status-danger border border-status-danger/30 animate-pulse'
                              : 'bg-status-success-surface text-status-success border border-status-success/30'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Sidebar Footer: Agent Profile & Shift Status - Fixed at Bottom */}
          <div className="shrink-0 p-3 border-t border-border bg-surface/80 backdrop-blur-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                  FA
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-content truncate font-display">Farhan Akhtar</div>
                  <div className="text-[10px] text-content-muted truncate">Senior Broker / Desk</div>
                </div>
              </div>
              <ThemeToggle variant="compact" />
            </div>

            <div className="flex items-center justify-between text-[11px] bg-surface-subtle px-2.5 py-1.5 rounded-xl border border-border">
              <span className="flex items-center gap-1.5 text-status-success font-bold text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-ping" />
                Live Dispatch
              </span>
              <span className="font-mono text-content-muted text-[10px]">Shift 05h 42m</span>
            </div>
          </div>
        </aside>

        {/* Main Content Pane with Sticky Stitch Topbar */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Sticky Stitch Top Navigation Bar */}
          <header className="hidden lg:flex items-center justify-between px-6 h-[64px] bg-surface border-b border-border sticky top-0 z-30 shadow-2xs">
            {/* Left: Breadcrumbs & SLA Status Badge */}
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-content-muted">
                  <Link href="/" className="hover:text-content transition-colors font-medium">
                    ZamZam Console
                  </Link>
                  <span>/</span>
                  <span className="font-bold text-content">{activeItem.label}</span>
                </div>
              </div>

              {/* Speed-to-Lead SLA Target Alert Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-soft border border-accent/20 text-accent-text text-xs font-bold">
                <Flame className="w-3.5 h-3.5 text-accent animate-pulse" />
                <span className="font-mono font-bold">Speed-to-Lead: &lt; 5m Target</span>
              </div>
            </div>

            {/* Center: Global Search Bar */}
            <div className="flex-1 max-w-md mx-6">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="w-full flex items-center justify-between px-3.5 py-1.5 bg-surface-subtle border border-border rounded-xl text-xs text-content-muted hover:border-accent transition-colors group text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-content-muted group-hover:text-accent transition-colors" />
                  <span>Search leads, phone, RERA ID, units...</span>
                </div>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold bg-surface border border-border rounded-md text-content-muted">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Right: Active Call Timer, Quick Links & Status */}
            <div className="flex items-center gap-3">
              {/* Active Call Widget */}
              <div className="flex items-center gap-2 px-3 py-1 bg-status-success-surface border border-status-success/30 rounded-xl">
                <PhoneCall className="w-3.5 h-3.5 text-status-success animate-bounce" />
                <span className="text-xs font-bold text-status-success">Active Call:</span>
                <span className="font-mono font-bold text-xs text-content">{callTimer}</span>
              </div>

              <Link
                href="/leads?view=telecaller"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Tele-Desk</span>
              </Link>
            </div>
          </header>

          {/* Main Page Area */}
          <main id="main-content" className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Global Search Dialog Modal (⌘K) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 border-b border-border flex items-center gap-2.5">
              <Search className="w-4 h-4 text-content-muted" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads, phone number, Kharghar sectors, RERA number..."
                className="w-full bg-transparent border-none text-sm focus:outline-hidden text-content placeholder-content-muted font-medium"
              />
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="p-1 text-content-muted hover:text-content rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 text-xs text-content-muted max-h-72 overflow-y-auto space-y-1">
              <div className="px-2 py-1 font-bold text-[10px] uppercase tracking-wider text-content-muted font-mono">Quick Destinations</div>
              <button
                onClick={() => {
                  router.push('/leads?view=telecaller');
                  setIsSearchOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-surface-subtle rounded-xl text-left cursor-pointer transition-colors"
              >
                <span className="font-semibold text-content">🔥 Telecaller Calling Desk (Speed-to-Lead)</span>
                <span className="font-mono text-[10px] text-content-muted">/leads</span>
              </button>
              <button
                onClick={() => {
                  router.push('/inventory');
                  setIsSearchOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-surface-subtle rounded-xl text-left cursor-pointer transition-colors"
              >
                <span className="font-semibold text-content">🏢 Kharghar & Taloja MahaRERA Inventory</span>
                <span className="font-mono text-[10px] text-content-muted">/inventory</span>
              </button>
              <button
                onClick={() => {
                  router.push('/calculator');
                  setIsSearchOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-surface-subtle rounded-xl text-left cursor-pointer transition-colors"
              >
                <span className="font-semibold text-content">📐 Maharashtra Statutory Cost Engine (Stamp Duty & GST)</span>
                <span className="font-mono text-[10px] text-content-muted">/calculator</span>
              </button>
              <button
                onClick={() => {
                  router.push('/deals');
                  setIsSearchOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-surface-subtle rounded-xl text-left cursor-pointer transition-colors"
              >
                <span className="font-semibold text-content">💰 Deal Closing Commission Ledger & GST Invoices</span>
                <span className="font-mono text-[10px] text-content-muted">/deals</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

