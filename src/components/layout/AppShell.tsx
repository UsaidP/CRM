'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import type { PermissionKey } from '@/types/crm';
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
  Phone,
  PhoneCall,
  Plus,
  QrCode,
  KeyRound,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
  Zap,
  LogOut,
  Shield,
  Cloud,
  Home,
  FileText,
  MapPin,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { isPublicLayoutPath } from '@/lib/navigation';
import { BackupModal } from '@/components/admin/BackupModal';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { fetchSession, logout } from '@/lib/client/auth';

interface NavItem {
  href: string;
  label: string;
  badge?: string;
  badgeType?: 'urgent' | 'count' | 'info';
  icon: any;
  permission?: PermissionKey;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Operations',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/leads', label: 'Leads & Calling', icon: Users },
      { href: '/calendar', label: 'Calendar & Visits', icon: CalendarDays },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { href: '/inventory', label: 'Projects & Units', icon: Building2 },
      { href: '/matching', label: 'Matchmaker', icon: Sparkles },
      { href: '/portals', label: 'Client Portals', icon: Globe },
      { href: '/visits', label: 'Site Visits', icon: Car },
    ],
  },
  {
    title: 'Finance & Admin',
    items: [
      { href: '/deals', label: 'Deals & Invoices', icon: DollarSign },
      { href: '/calculator', label: 'Cost Calculator', icon: Calculator },
      { href: '/attribution', label: 'Campaigns & QR', icon: QrCode },
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/admin/users', label: 'Team & Access', icon: KeyRound, permission: 'admin:manage_rbac', adminOnly: true },
    ],
  },
];

function isCurrentRoute(pathname?: string | null, href?: string) {
  if (!pathname || !href) return false;
  return href === '/' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const rawPathname = usePathname();
  const pathname = rawPathname || '';
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [callTimer, setCallTimer] = useState('04:18');
  const [isCallActive, setIsCallActive] = useState(true);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    fullName: string;
    email: string;
    role: string;
    isSuperAdmin: boolean;
    effectivePermissions?: string[];
  } | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupModalMode, setBackupModalMode] = useState<'BACKUP' | 'DUTY_END'>('BACKUP');

  // Global Omnisearch State
  const [searchResults, setSearchResults] = useState<{
    leads: any[];
    projects: any[];
    units: any[];
    visits: any[];
    deals: any[];
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Live Omnisearch Fetch with Debounce
  useEffect(() => {
    const trimmed = searchQuery.trim();
    setSelectedIndex(0);
    if (!trimmed) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(trimmed)}`, {
          credentials: 'same-origin',
        });
        const json = await res.json();
        if (json.success) {
          setSearchResults(json.results);
        }
      } catch (err) {
        console.error('Omnisearch error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const isPublicLayout = isPublicLayoutPath(pathname);

  // Fetch active session user; bounce unauthenticated visitors to login so
  // the authenticated shell (sidebar, search, etc.) is never exposed.
  useEffect(() => {
    if (isPublicLayout) return;
    fetchSession()
      .then((user) => {
        if (user) {
          setCurrentUser(user as { id: string; fullName: string; email: string; role: string; isSuperAdmin: boolean });
        } else {
          router.replace('/login');
        }
      })
      .catch(() => router.replace('/login'));
  }, [isPublicLayout, pathname, router]);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      window.location.href = '/login';
    }
  };

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

  // Filter visible nav sections based on user role and permissions.
  // NOTE: must stay ABOVE the public-portal early return — React hooks
  // cannot run conditionally (Rules of Hooks).
  const visibleNavSections = useMemo(() => {
    const permissions = currentUser?.effectivePermissions || [];
    // Role shortcuts must NOT bypass explicit permission grants/revocations:
    // adminOnly items always require the admin:manage_rbac permission
    // (SUPER_ADMIN holds every permission by default).
    const isSuperAdmin =
      currentUser?.isSuperAdmin || currentUser?.role === 'SUPER_ADMIN';

    return navSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (item.adminOnly) {
            return isSuperAdmin || permissions.includes('admin:manage_rbac');
          }
          if (item.permission) {
            return isSuperAdmin || permissions.includes(item.permission);
          }
          return true;
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [currentUser]);

  // Public portal layout: unauthenticated chrome-free render. This early
  // return is safe here because every hook above now runs unconditionally.
  const isPublicPortal = isPublicLayout;
  if (isPublicPortal) {
    return <main className="public-portal-main min-h-screen bg-[#FDFBF7] text-slate-900 selection:bg-amber-100 selection:text-amber-900">{children}</main>;
  }

  // Find active item for breadcrumbs
  const allNavItems = visibleNavSections.flatMap((s) => s.items);
  const activeItem = allNavItems.find((item) => isCurrentRoute(pathname, item.href)) || {
    label: 'Console',
    href: '/',
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-content antialiased">
      {/* Mobile Top Header */}
      <header className="lg:hidden flex items-center justify-between px-4 h-[60px] bg-surface border-b border-border z-50 sticky top-0">
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo mode="horizontal" size="xs" withRera={false} />
        </Link>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setBackupModalMode('BACKUP');
              setIsBackupModalOpen(true);
            }}
            className="p-2 rounded-xl text-content-muted hover:text-accent hover:bg-surface-subtle transition-colors cursor-pointer"
            aria-label="Google Drive Backup"
            title="Backup to Google Drive"
          >
            <Cloud className="w-4 h-4 text-accent" />
          </button>
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
              <BrandLogo mode="horizontal" size="md" withRera reraNumber="MahaRERA A52000028714" />
            </Link>

            {/* Quick Action: New Inbound Lead / Quick Call */}
            <div className="mt-3">
              <Link
                href="/leads?view=telecaller&action=new"
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-98"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Lead / Quick Call</span>
              </Link>
            </div>
          </div>

          {/* Grouped Navigation Links - Only this area scrolls */}
          <nav className="flex-1 min-h-0 px-3 py-3 space-y-4 overflow-y-auto" aria-label="Primary navigation">
            {visibleNavSections.map((section) => (
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
                <div className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold shadow-2xs shrink-0">
                  {currentUser?.fullName
                    ? currentUser.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                    : 'ZP'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-content truncate font-display">
                    {currentUser?.fullName || 'ZamZam Advisor'}
                  </div>
                  <div className="text-[10px] text-content-muted truncate font-mono">
                    {currentUser?.role === 'SUPER_ADMIN'
                      ? '👑 Super Admin'
                      : currentUser?.role === 'BROKER_MANAGER'
                      ? '👔 Broker Manager'
                      : currentUser?.role === 'SALES_EXECUTIVE'
                      ? '💼 Sales Advisor'
                      : currentUser?.role === 'TELECALLER'
                      ? '🎧 Telecaller Desk'
                      : 'Broker'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <ThemeToggle variant="compact" />
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="p-1.5 rounded-xl text-content-muted hover:text-status-danger hover:bg-status-danger-surface transition-colors cursor-pointer disabled:opacity-50"
                  title="Sign Out"
                >
                  {isLoggingOut ? (
                    <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Unified Status & Backup Control Bar */}
            <div className="flex items-center justify-between text-[11px] bg-surface-subtle p-1 rounded-xl border border-border">
              <div className="flex items-center gap-1.5 px-2 py-1 text-status-success font-bold text-xs">
                <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
                <span className="truncate">Live Dispatch</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBackupModalMode('BACKUP');
                  setIsBackupModalOpen(true);
                }}
                className="flex items-center gap-1 bg-accent-soft hover:bg-accent hover:text-white px-2 py-1 rounded-lg border border-accent/20 text-accent-text font-bold text-[11px] transition-colors cursor-pointer"
                title="Google Drive Cloud Backup"
              >
                <Cloud className="w-3 h-3 text-accent" />
                <span>Backup</span>
              </button>
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
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-soft/90 border border-accent/35 text-accent-text text-xs font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                <Flame className="w-3.5 h-3.5 text-accent" />
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

            {/* Right: Active Call Timer, GDrive Backup, Quick Links & Status */}
            <div className="flex items-center gap-2.5">
              {/* Google Drive Cloud Backup Button (Visible to all team members) */}
              <button
                type="button"
                onClick={() => {
                  setBackupModalMode('BACKUP');
                  setIsBackupModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-subtle border border-border text-content rounded-xl text-xs font-bold transition-all shadow-2xs hover:border-accent/40 cursor-pointer group"
                title="Google Drive Cloud Backup & Export"
              >
                <Cloud className="w-3.5 h-3.5 text-accent group-hover:scale-110 transition-transform" />
                <span className="font-semibold">Backup (GDrive)</span>
              </button>

              {/* Active Call Widget */}
              <div className="flex items-center gap-2 px-3 py-1 bg-status-success-surface border border-status-success/30 rounded-xl">
                <PhoneCall className="w-3.5 h-3.5 text-status-success animate-pulse" />
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

      {/* Global Omnisearch Dialog Modal (⌘K) */}
      {isSearchOpen && (() => {
        const quickDestinations = [
          {
            id: 'quick-telecaller',
            icon: Zap,
            iconColor: 'text-accent',
            title: 'Telecaller High-Velocity Desk (Speed-to-Lead)',
            badge: '/leads',
            action: () => { router.push('/leads?view=telecaller'); setIsSearchOpen(false); setSearchQuery(''); },
          },
          {
            id: 'quick-inventory',
            icon: Building2,
            iconColor: 'text-status-success',
            title: 'Kharghar & Taloja MahaRERA Inventory (Upload Brochure)',
            badge: '/inventory',
            action: () => { router.push('/inventory'); setIsSearchOpen(false); setSearchQuery(''); },
          },
          {
            id: 'quick-calculator',
            icon: Calculator,
            iconColor: 'text-blue-500',
            title: 'Maharashtra Statutory Cost Engine (Stamp Duty & GST Quotations)',
            badge: '/calculator',
            action: () => { router.push('/calculator'); setIsSearchOpen(false); setSearchQuery(''); },
          },
          {
            id: 'quick-matching',
            icon: Sparkles,
            iconColor: 'text-amber-500',
            title: 'Requirements-to-Property Matchmaker',
            badge: '/matching',
            action: () => { router.push('/matching'); setIsSearchOpen(false); setSearchQuery(''); },
          },
          {
            id: 'quick-deals',
            icon: DollarSign,
            iconColor: 'text-emerald-500',
            title: 'Deal Closing Commission Ledger & GST Invoices',
            badge: '/deals',
            action: () => { router.push('/deals'); setIsSearchOpen(false); setSearchQuery(''); },
          },
          {
            id: 'quick-visits',
            icon: Car,
            iconColor: 'text-purple-500',
            title: 'Site Visits & VIP Property Tour Passports',
            badge: '/visits',
            action: () => { router.push('/visits'); setIsSearchOpen(false); setSearchQuery(''); },
          },
          {
            id: 'quick-backup',
            icon: Cloud,
            iconColor: 'text-sky-500',
            title: 'Backup Real Estate Database to Google Drive',
            badge: 'Cloud Backup',
            action: () => { setBackupModalMode('BACKUP'); setIsBackupModalOpen(true); setIsSearchOpen(false); setSearchQuery(''); },
          },
        ];

        // Flatten active search result items for unified index navigation
        const allResultItems: { id: string; action: () => void }[] = [];
        if (!searchQuery.trim()) {
          quickDestinations.forEach((item) => allResultItems.push({ id: item.id, action: item.action }));
        } else if (searchResults) {
          (searchResults.leads || []).forEach((lead: any) => {
            allResultItems.push({
              id: `lead-${lead.id}`,
              action: () => {
                router.push(`/leads?search=${encodeURIComponent(lead.phoneE164 || lead.fullName || '')}`);
                setIsSearchOpen(false);
                setSearchQuery('');
              },
            });
          });
          (searchResults.projects || []).forEach((proj: any) => {
            allResultItems.push({
              id: `project-${proj.id}`,
              action: () => {
                router.push(`/inventory?search=${encodeURIComponent(proj.projectName)}`);
                setIsSearchOpen(false);
                setSearchQuery('');
              },
            });
          });
          (searchResults.units || []).forEach((unit: any) => {
            allResultItems.push({
              id: `unit-${unit.id}`,
              action: () => {
                router.push(`/inventory?search=${encodeURIComponent(unit.unitNumber || unit.project?.projectName || '')}`);
                setIsSearchOpen(false);
                setSearchQuery('');
              },
            });
          });
          (searchResults.visits || []).forEach((visit: any) => {
            allResultItems.push({
              id: `visit-${visit.id}`,
              action: () => {
                router.push('/visits');
                setIsSearchOpen(false);
                setSearchQuery('');
              },
            });
          });
          (searchResults.deals || []).forEach((deal: any) => {
            allResultItems.push({
              id: `deal-${deal.id}`,
              action: () => {
                router.push('/deals');
                setIsSearchOpen(false);
                setSearchQuery('');
              },
            });
          });
        }

        const handleKeyDown = (e: React.KeyboardEvent) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (allResultItems.length > 0) {
              setSelectedIndex((prev) => (prev + 1) % allResultItems.length);
            }
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (allResultItems.length > 0) {
              setSelectedIndex((prev) => (prev - 1 + allResultItems.length) % allResultItems.length);
            }
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (allResultItems[selectedIndex]) {
              allResultItems[selectedIndex].action();
            }
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setIsSearchOpen(false);
            setSearchQuery('');
          }
        };

        let currentIndexCounter = 0;

        return (
          <div 
            className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-20 px-4 bg-black/60 backdrop-blur-xs"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsSearchOpen(false);
                setSearchQuery('');
              }
            }}
          >
            <div className="w-full max-w-2xl bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]">
              {/* Search Input Bar */}
              <div className="px-4 py-3.5 border-b border-border flex items-center gap-3 bg-surface">
                {isSearching ? (
                  <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" />
                ) : (
                  <Search className="w-4 h-4 text-content-muted shrink-0" />
                )}
                <input
                  type="text"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search leads, phone (+91), Kharghar sectors, RERA number, deals..."
                  className="omnisearch-input w-full bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none text-sm text-content placeholder:text-content-muted font-medium !p-0 !shadow-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="px-2 py-0.5 text-xs text-content-muted hover:text-content bg-surface-subtle hover:bg-surface border border-border rounded-md cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="p-1 text-content-muted hover:text-content hover:bg-surface-subtle rounded-lg cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Results or Quick Destinations */}
              <div className="p-3 text-xs text-content-muted overflow-y-auto space-y-3 divide-y divide-border/40 max-h-[60vh]">
                {/* Case 1: Empty Query -> Show Quick Destinations & Speed Tools */}
                {!searchQuery.trim() && (
                  <div className="space-y-1">
                    <div className="px-2 py-1 font-bold text-[10px] uppercase tracking-wider text-content-muted font-mono">
                      ⚡ Quick Destinations &amp; Speed Tools
                    </div>
                    {quickDestinations.map((dest, idx) => {
                      const Icon = dest.icon;
                      const isSelected = selectedIndex === idx;
                      return (
                        <button
                          key={dest.id}
                          onClick={dest.action}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left cursor-pointer transition-all border ${
                            isSelected
                              ? 'bg-accent-soft text-accent-text border-accent/30 shadow-2xs font-semibold'
                              : 'hover:bg-surface-subtle border-transparent text-content'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <Icon className={`w-4 h-4 ${dest.iconColor}`} />
                            <span className="text-xs font-semibold">{dest.title}</span>
                          </span>
                          <span className="font-mono text-[10px] text-content-muted px-2 py-0.5 rounded bg-surface border border-border">
                            {dest.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Case 2: Searching with Results */}
                {searchQuery.trim() && searchResults && (
                  <>
                    {/* Leads Results */}
                    {searchResults.leads.length > 0 && (
                      <div className="space-y-1 pt-2 first:pt-0">
                        <div className="px-2 py-1 font-bold text-[10px] uppercase tracking-wider text-accent-text font-mono flex items-center justify-between">
                          <span>👥 Leads &amp; Inbound Inquiries ({searchResults.leads.length})</span>
                          <span className="text-[9px] text-content-muted">Click to view in Calling Desk</span>
                        </div>
                        {searchResults.leads.map((lead: any) => {
                          const itemIndex = currentIndexCounter++;
                          const isSelected = selectedIndex === itemIndex;
                          return (
                            <button
                              key={lead.id}
                              onClick={() => {
                                router.push(`/leads?search=${encodeURIComponent(lead.phoneE164 || lead.fullName || '')}`);
                                setIsSearchOpen(false);
                                setSearchQuery('');
                              }}
                              onMouseEnter={() => setSelectedIndex(itemIndex)}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left cursor-pointer transition-all border ${
                                isSelected
                                  ? 'bg-accent-soft border-accent/40 shadow-2xs'
                                  : 'hover:bg-surface-subtle border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-accent-soft text-accent flex items-center justify-center font-bold text-xs shrink-0">
                                  <User className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-content text-xs truncate">
                                    {lead.fullName || 'Anonymous Prospect'}
                                  </p>
                                  <p className="font-mono text-[11px] text-content-secondary truncate">
                                    {lead.phoneE164 || 'No Phone'} {lead.preferredMicroMarket ? `• ${lead.preferredMicroMarket}` : ''} {lead.preferredBhk ? `• ${lead.preferredBhk} BHK` : ''}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-surface border border-border text-accent-text uppercase">
                                  {lead.currentStage?.replace(/_/g, ' ') || 'NEW'}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Projects Results */}
                    {searchResults.projects.length > 0 && (
                      <div className="space-y-1 pt-2">
                        <div className="px-2 py-1 font-bold text-[10px] uppercase tracking-wider text-accent-text font-mono flex items-center justify-between">
                          <span>🏢 Developer Projects &amp; RERA Inventory ({searchResults.projects.length})</span>
                          <span className="text-[9px] text-content-muted">Click to inspect in Inventory</span>
                        </div>
                        {searchResults.projects.map((proj: any) => {
                          const itemIndex = currentIndexCounter++;
                          const isSelected = selectedIndex === itemIndex;
                          return (
                            <button
                              key={proj.id}
                              onClick={() => {
                                router.push(`/inventory?search=${encodeURIComponent(proj.projectName)}`);
                                setIsSearchOpen(false);
                                setSearchQuery('');
                              }}
                              onMouseEnter={() => setSelectedIndex(itemIndex)}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left cursor-pointer transition-all border ${
                                isSelected
                                  ? 'bg-accent-soft border-accent/40 shadow-2xs'
                                  : 'hover:bg-surface-subtle border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-status-success-surface text-status-success flex items-center justify-center font-bold text-xs shrink-0">
                                  <Building2 className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-content text-xs truncate">
                                    {proj.projectName} <span className="font-normal text-content-secondary">by {proj.developerName}</span>
                                  </p>
                                  <p className="font-mono text-[11px] text-content-secondary truncate">
                                    MahaRERA: <span className="font-bold text-accent-text">{proj.reraNumber}</span> • {proj.microMarket} ({proj.totalFloors} Floors)
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0 font-mono text-[11px] font-bold text-content">
                                ₹{proj.basePricePerSqft?.toLocaleString('en-IN')}/sqft
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Property Units Results */}
                    {searchResults.units.length > 0 && (
                      <div className="space-y-1 pt-2">
                        <div className="px-2 py-1 font-bold text-[10px] uppercase tracking-wider text-accent-text font-mono">
                          🏠 Property Unit Configurations ({searchResults.units.length})
                        </div>
                        {searchResults.units.map((unit: any) => {
                          const itemIndex = currentIndexCounter++;
                          const isSelected = selectedIndex === itemIndex;
                          return (
                            <button
                              key={unit.id}
                              onClick={() => {
                                router.push(`/inventory?search=${encodeURIComponent(unit.unitNumber || unit.project?.projectName || '')}`);
                                setIsSearchOpen(false);
                                setSearchQuery('');
                              }}
                              onMouseEnter={() => setSelectedIndex(itemIndex)}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left cursor-pointer transition-all border ${
                                isSelected
                                  ? 'bg-accent-soft border-accent/40 shadow-2xs'
                                  : 'hover:bg-surface-subtle border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                  <Home className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-content text-xs truncate">
                                    {unit.unitNumber || 'Unit'} • {unit.bhk} BHK ({unit.carpetAreaSqft} sq.ft)
                                  </p>
                                  <p className="font-mono text-[11px] text-content-secondary truncate">
                                    {unit.project?.projectName} ({unit.project?.microMarket})
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                ₹{(unit.allInTotalCost / 100000).toFixed(2)} Lakh
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Site Visits Results */}
                    {searchResults.visits.length > 0 && (
                      <div className="space-y-1 pt-2">
                        <div className="px-2 py-1 font-bold text-[10px] uppercase tracking-wider text-accent-text font-mono">
                          🚗 Site Visits &amp; Tours ({searchResults.visits.length})
                        </div>
                        {searchResults.visits.map((visit: any) => {
                          const itemIndex = currentIndexCounter++;
                          const isSelected = selectedIndex === itemIndex;
                          return (
                            <button
                              key={visit.id}
                              onClick={() => {
                                router.push('/visits');
                                setIsSearchOpen(false);
                                setSearchQuery('');
                              }}
                              onMouseEnter={() => setSelectedIndex(itemIndex)}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left cursor-pointer transition-all border ${
                                isSelected
                                  ? 'bg-accent-soft border-accent/40 shadow-2xs'
                                  : 'hover:bg-surface-subtle border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold text-xs shrink-0">
                                  <Car className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-content text-xs truncate">
                                    Tour for {visit.clientName} ({visit.clientPhone})
                                  </p>
                                  <p className="font-mono text-[11px] text-content-secondary truncate">
                                    {visit.microMarket} • Escort: {visit.escortAgent || 'Assigned Agent'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0 font-mono text-[10px] font-bold uppercase text-accent-text">
                                {visit.status}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Deals Results */}
                    {searchResults.deals.length > 0 && (
                      <div className="space-y-1 pt-2">
                        <div className="px-2 py-1 font-bold text-[10px] uppercase tracking-wider text-accent-text font-mono">
                          💰 Deals &amp; Invoices ({searchResults.deals.length})
                        </div>
                        {searchResults.deals.map((deal: any) => {
                          const itemIndex = currentIndexCounter++;
                          const isSelected = selectedIndex === itemIndex;
                          return (
                            <button
                              key={deal.id}
                              onClick={() => {
                                router.push('/deals');
                                setIsSearchOpen(false);
                                setSearchQuery('');
                              }}
                              onMouseEnter={() => setSelectedIndex(itemIndex)}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left cursor-pointer transition-all border ${
                                isSelected
                                  ? 'bg-accent-soft border-accent/40 shadow-2xs'
                                  : 'hover:bg-surface-subtle border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                                  <DollarSign className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-content text-xs truncate">
                                    {deal.clientName} • {deal.developerName} (Unit {deal.unitNumber})
                                  </p>
                                  <p className="font-mono text-[11px] text-content-secondary truncate">
                                    Agreement: ₹{(deal.agreementValue / 100000).toFixed(2)} Lakh • Brokerage: ₹{(deal.brokerageAmount / 1000).toFixed(1)}k
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0 font-mono text-[10px] font-bold uppercase text-status-success">
                                {deal.dealStage}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Zero Matches State */}
                    {searchResults.leads.length === 0 &&
                      searchResults.projects.length === 0 &&
                      searchResults.units.length === 0 &&
                      searchResults.visits.length === 0 &&
                      searchResults.deals.length === 0 && (
                        <div className="p-8 text-center space-y-2">
                          <Search className="w-8 h-8 mx-auto text-content-muted/40" />
                          <p className="font-bold text-content text-xs">
                            No records match &ldquo;{searchQuery}&rdquo;
                          </p>
                          <p className="text-[11px] text-content-muted max-w-sm mx-auto">
                            Try searching by 10-digit mobile number, buyer name, project name (e.g. Crown Heights, City Avenue), or MahaRERA number (e.g. P52000079818).
                          </p>
                        </div>
                      )}
                  </>
                )}
              </div>

              {/* Bottom Shortcut Footer */}
              <div className="p-2.5 px-4 bg-surface-subtle/80 border-t border-border flex items-center justify-between text-[11px] text-content-muted font-mono">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px]">↑↓</kbd> Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px]">↵</kbd> Select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px]">ESC</kbd> Close
                  </span>
                </div>
                <span className="text-[10px] text-content-secondary font-medium">
                  {searchQuery ? `${allResultItems.length} matching records` : '7 quick tools'}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Google Drive Cloud Backup Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        initialMode={backupModalMode}
        currentUser={currentUser}
      />
    </div>
  );
}

