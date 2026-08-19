'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  Building2,
  Calculator,
  Calendar,
  DollarSign,
  Globe,
  Layers,
  Menu,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { isPublicPortalPath } from '@/lib/navigation';

const navigation = [
  { href: '/', label: 'Dashboard', title: 'Operations dashboard', icon: Layers },
  { href: '/leads', label: 'Leads', title: 'Leads and inquiries', icon: Users },
  { href: '/inventory', label: 'Inventory', title: 'Property inventory', icon: ShieldCheck },
  { href: '/matching', label: 'Matchmaker', title: 'Property matchmaker', icon: Sparkles },
  { href: '/portals', label: 'Client portals', title: 'Client portals', icon: Globe },
  { href: '/visits', label: 'Site visits', title: 'Site visits and tours', icon: Calendar },
  { href: '/deals', label: 'Deals', title: 'Deals and commission', icon: DollarSign },
  { href: '/attribution', label: 'Attribution', title: 'Lead attribution', icon: Share2 },
  { href: '/analytics', label: 'Analytics', title: 'Analytics and ROI', icon: BarChart3 },
  { href: '/calculator', label: 'Cost calculator', title: 'All-in cost calculator', icon: Calculator },
] as const;

function isCurrentRoute(pathname: string, href: string) {
  return href === '/' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const activeItem = navigation.find((item) => isCurrentRoute(pathname, item.href));
  const isPublicPortal = isPublicPortalPath(pathname);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isMenuOpen]);

  if (isPublicPortal) {
    return <main className="public-portal-main">{children}</main>;
  }

  return (
    <div className="app-shell">
      <header className="app-mobile-header">
        <Link href="/" className="app-brand app-brand--mobile" aria-label="ZamZam CRM dashboard">
          <span className="app-brand__mark" aria-hidden="true">
            <Building2 />
          </span>
          <span className="app-mobile-title">{activeItem?.title ?? 'ZamZam CRM'}</span>
        </Link>
        <button
          type="button"
          className="app-menu-button"
          aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={isMenuOpen}
          aria-controls="app-navigation"
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </header>

      {isMenuOpen && (
        <button
          type="button"
          className="app-nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <aside id="app-navigation" className={`app-sidebar${isMenuOpen ? ' is-open' : ''}`}>
        <div className="app-sidebar__header">
          <Link href="/" className="app-brand" aria-label="ZamZam CRM dashboard">
            <span className="app-brand__mark" aria-hidden="true">
              <Building2 />
            </span>
            <span>
              <strong className="app-brand__name">ZamZam CRM</strong>
              <small className="app-brand__context">Real-estate operations</small>
            </span>
          </Link>
        </div>

        <div className="app-theme-control">
          <ThemeToggle />
        </div>

        <nav className="app-nav" aria-label="Primary navigation">
          <span className="app-nav__label">Lead-to-closing workflow</span>
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = isCurrentRoute(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`app-nav__link${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <p className="app-sidebar__status">
          <span className="app-status-dot" aria-hidden="true" />
          Workspace ready
        </p>
      </aside>

      <main className="app-main" id="main-content">
        <div className="app-main__inner">{children}</div>
      </main>
    </div>
  );
}
