'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  Car,
  Calculator,
  Globe,
  DollarSign,
  ShieldCheck,
  Sparkles,
  Zap,
  ArrowRight,
  CheckCircle2,
  Check,
  ChevronRight,
  PhoneCall,
  Flame,
  QrCode,
  Lock,
  Layers,
  BarChart3,
  HelpCircle,
  Clock,
  KeyRound,
  FileText,
  Sliders,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { BrandLogo } from '@/components/ui/BrandLogo';

export function LandingPageClient() {
  // Billing cycle toggle: Monthly vs Annually (20% discount)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('annually');

  // ROI Calculator interactive state
  const [leadsPerMonth, setLeadsPerMonth] = useState<number>(150);
  const [avgDealValueLakhs, setAvgDealValueLakhs] = useState<number>(85); // in ₹ Lakhs

  // Calculations for ROI:
  // Industry standard: average conversion with slow response is ~1.5%.
  // With Lucky CRM speed-to-lead (< 5m SLA), conversion rate typically jumps to ~3.5%.
  const baseDeals = Math.max(1, Math.round(leadsPerMonth * 0.015));
  const luckyDeals = Math.max(2, Math.round(leadsPerMonth * 0.035));
  const extraDeals = luckyDeals - baseDeals;
  const avgBrokeragePerDeal = (avgDealValueLakhs * 100000) * 0.02; // 2% brokerage standard
  const extraBrokerageYearly = extraDeals * avgBrokeragePerDeal * 12;

  // Active pricing values:
  // Base: ₹2,999 / month
  // Annual with 20% discount: ₹2,399 / month (billed ₹28,790/year)
  const monthlyPrice = 2999;
  const annualDiscountedPrice = 2399;
  const annualBilledAmount = annualDiscountedPrice * 12;

  return (
    <div className="min-h-screen bg-canvas text-content selection:bg-[#2563eb] selection:text-white font-sans antialiased overflow-x-hidden">
      {/* 1. TOP ANNOUNCEMENT BAR */}
      <div className="bg-surface-subtle border-b border-border py-2 px-4 text-center text-xs font-mono text-content-secondary flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1 font-bold text-accent">
          <Sparkles className="w-3.5 h-3.5" />
          <span>LUCKY CRM v2.0</span>
        </span>
        <span className="hidden sm:inline">•</span>
        <span className="hidden sm:inline">Maharashtra Statutory RERA Compliant Real Estate Operating System</span>
        <span className="inline-flex items-center gap-1 text-status-success font-semibold ml-2">
          <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
          Auto-Approval Active
        </span>
      </div>

      {/* 2. NAVIGATION HEADER */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-border transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group cursor-pointer" aria-label="Lucky CRM Home">
            <BrandLogo mode="horizontal" size="sm" withRera firmName="Lucky CRM" reraNumber="Real Estate Brokerage OS" />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-content-muted" aria-label="Main Navigation">
            <a href="#features" className="hover:text-content transition-colors">Core Engines</a>
            <a href="#calculator" className="hover:text-content transition-colors">ROI Calculator</a>
            <a href="#how-it-works" className="hover:text-content transition-colors">Workflow</a>
            <a href="#pricing" className="hover:text-content transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-content transition-colors">FAQ</a>
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            <ThemeToggle variant="compact" />
            <Link
              href="/login"
              className="hidden sm:inline-flex px-4 py-2 text-xs font-bold text-content hover:text-accent hover:bg-surface-subtle rounded-xl border border-border transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 sm:px-5 sm:py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-extrabold rounded-xl shadow-xs transition-all active:scale-98 flex items-center gap-1.5"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[1200px] h-[550px] bg-gradient-to-b from-accent/15 via-accent/5 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-soft text-accent-text border border-accent/25 text-xs font-bold shadow-2xs font-mono">
            <Flame className="w-4 h-4 text-accent animate-pulse" />
            <span>Speed-to-Lead SLA &lt; 5 Minutes</span>
            <span className="text-content-muted">|</span>
            <span>MahaRERA Ready</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-content font-display tracking-tight max-w-4xl mx-auto leading-[1.12]">
            The Real Estate Operating System for High-Velocity Brokerages
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-lg text-content-secondary max-w-2xl mx-auto font-medium leading-relaxed">
            Dispatch buyer leads in seconds, track MahaRERA inventory freshness, share bespoke private client portals with live heatmaps, and automate deal commission ledgers.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 bg-accent hover:bg-accent-hover text-white text-sm font-extrabold rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-98 flex items-center justify-center gap-2.5"
            >
              <span>Register Your Firm Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-4 bg-surface hover:bg-surface-subtle border border-border text-content text-sm font-bold rounded-2xl shadow-xs transition-all text-center"
            >
              Sign In to Broker Console
            </Link>
          </div>

          {/* Feature Badges Grid */}
          <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
            <div className="p-3 rounded-xl bg-surface border border-border flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-status-success shrink-0" />
              <div className="text-[11px] leading-tight">
                <div className="font-bold text-content">MahaRERA Certified</div>
                <div className="text-content-muted font-mono">Verified Units</div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-surface border border-border flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-accent shrink-0" />
              <div className="text-[11px] leading-tight">
                <div className="font-bold text-content">Instant Ingestion</div>
                <div className="text-content-muted font-mono">WhatsApp &amp; IVR</div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-surface border border-border flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-blue-500 shrink-0" />
              <div className="text-[11px] leading-tight">
                <div className="font-bold text-content">Client Portals</div>
                <div className="text-content-muted font-mono">Live Telemetry</div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-surface border border-border flex items-center gap-2.5">
              <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="text-[11px] leading-tight">
                <div className="font-bold text-content">Deals &amp; Invoicing</div>
                <div className="text-content-muted font-mono">18% GST Compliant</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. DASHBOARD INTERACTIVE PREVIEW CARD */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-3xl border border-border bg-surface shadow-2xl overflow-hidden backdrop-blur-md">
          {/* Window Header */}
          <div className="px-6 py-4 border-b border-border bg-surface-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="ml-3 font-mono text-xs text-content-muted font-semibold">
                lucky-crm.app/dashboard • Active Brokerage Desk
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-accent">
              <span className="w-2 h-2 rounded-full bg-status-success animate-ping" />
              <span>LIVE DISPATCH ACTIVE</span>
            </div>
          </div>

          {/* Console Preview Content */}
          <div className="p-6 md:p-8 space-y-6">
            {/* Top Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-surface-subtle border border-border">
                <div className="text-xs text-content-muted font-medium">Inbound Leads Today</div>
                <div className="text-2xl font-black text-content font-mono mt-1">48 Leads</div>
                <div className="text-[11px] text-status-success font-semibold mt-1 flex items-center gap-1">
                  <span>↑ 18%</span> from WhatsApp Ads
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-surface-subtle border border-border">
                <div className="text-xs text-content-muted font-medium">Avg Speed-to-Lead</div>
                <div className="text-2xl font-black text-accent font-mono mt-1">03m 14s</div>
                <div className="text-[11px] text-content-muted font-semibold mt-1">
                  Target SLA: &lt; 05m 00s
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-surface-subtle border border-border">
                <div className="text-xs text-content-muted font-medium">MahaRERA Verified Units</div>
                <div className="text-2xl font-black text-content font-mono mt-1">214 Units</div>
                <div className="text-[11px] text-status-success font-semibold mt-1">
                  Kharghar &amp; Taloja Hub
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-surface-subtle border border-border">
                <div className="text-xs text-content-muted font-medium">Closed Brokerage (MTD)</div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">₹14.85 L</div>
                <div className="text-[11px] text-content-muted font-semibold mt-1">
                  7 Deals Registered
                </div>
              </div>
            </div>

            {/* Simulated Live Lead Pipeline */}
            <div className="p-5 rounded-2xl bg-canvas border border-border space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-content">
                <span className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-accent" />
                  <span>Next Recommended Connect • High Probability Buyers</span>
                </span>
                <span className="font-mono text-content-muted text-[11px]">Ranked by Engagement Telemetry</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-surface border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-content">Farhan Shaikh</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-status-danger-surface text-status-danger font-bold">HOT (Opened Portal 4x)</span>
                  </div>
                  <p className="text-[11px] text-content-secondary">
                    Exploring 2 BHK in Crown Heights • Budget ₹75-85L
                  </p>
                  <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-content-muted border-t border-border">
                    <span>Source: Meta WhatsApp</span>
                    <span className="text-accent font-bold">Escorted Visit Sat</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-content">Dr. Meera Nambiar</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-bold">WARM (Downloaded Cost Sheet)</span>
                  </div>
                  <p className="text-[11px] text-content-secondary">
                    3 BHK Luxury Deck Flat • Kharghar Sector 20
                  </p>
                  <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-content-muted border-t border-border">
                    <span>Source: Google Ads</span>
                    <span className="text-accent font-bold">Follow-Up 2:30 PM</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-content">Rajesh Agrawal</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold">TOKEN RECEIVED</span>
                  </div>
                  <p className="text-[11px] text-content-secondary">
                    City Avenue Unit 1402 • All-in ₹1.22 Cr
                  </p>
                  <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-content-muted border-t border-border">
                    <span>Brokerage: ₹2,44,000</span>
                    <span className="text-status-success font-bold">Invoiced</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. 6 CORE ENGINES GRID */}
      <section id="features" className="py-20 bg-surface-subtle/50 border-t border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent">
              Architecture &amp; Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-content font-display tracking-tight">
              Six Specialized Real Estate Engines in One Unified Platform
            </h2>
            <p className="text-xs sm:text-sm text-content-secondary leading-relaxed">
              Designed specifically for the nuances of Indian property brokerage, MahaRERA compliance, and fast-moving sales desks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Engine 1 */}
            <div className="p-6 rounded-3xl bg-surface border border-border shadow-xs hover:border-accent/40 transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-accent-soft text-accent flex items-center justify-center font-bold">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-display text-content">
                1. Speed-to-Lead Routing Engine
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                Connects directly to WhatsApp Cloud API, Instagram lead ads, and telephony IVR. New inquiries trigger high-priority alerts with automated next-broker dispatch under 5 minutes.
              </p>
              <ul className="text-xs space-y-1.5 text-content-muted font-medium pt-2 border-t border-border">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-status-success shrink-0" />
                  <span>Sub-5-minute lead SLA countdown</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-status-success shrink-0" />
                  <span>Auto-assignment to on-duty telecallers</span>
                </li>
              </ul>
            </div>

            {/* Engine 2 */}
            <div className="p-6 rounded-3xl bg-surface border border-border shadow-xs hover:border-accent/40 transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-display text-content">
                2. MahaRERA Inventory Matrix
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                Track developer inventory across projects with unit-level carpet areas, parking allocations, facing, and statutory certificate verification status. Automatic alerts for stale inventory.
              </p>
              <ul className="text-xs space-y-1.5 text-content-muted font-medium pt-2 border-t border-border">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-status-success shrink-0" />
                  <span>MahaRERA certificate viewer</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-status-success shrink-0" />
                  <span>45-day freshness re-verification lock</span>
                </li>
              </ul>
            </div>

            {/* Engine 3 */}
            <div className="p-6 rounded-3xl bg-surface border border-border shadow-xs hover:border-accent/40 transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center font-bold">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-display text-content">
                3. Intelligent Property Matchmaker
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                Aligns buyer preferences (budget, configuration, micro-market, possession date) with live developer units to produce instant match scores and eliminate manual brochure searching.
              </p>
              <ul className="text-xs space-y-1.5 text-content-muted font-medium pt-2 border-t border-border">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-status-success shrink-0" />
                  <span>High-probability match scoring</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-status-success shrink-0" />
                  <span>One-click curated buyer portfolios</span>
                </li>
              </ul>
            </div>

            {/* Engine 4 */}
            <div className="p-6 rounded-3xl bg-surface border border-border shadow-xs hover:border-accent/40 transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 flex items-center justify-center font-bold">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-display text-content">
                4. Private Client Portals
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                Generate secure, passwordless presentation links for buyers. Tracks real-time telemetry: brochure downloads, unit dwell times, floor plan views, and scheduled visits.
              </p>
              <ul className="text-xs space-y-1.5 text-content-muted font-medium pt-2 border-t border-border">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-status-success shrink-0" />
                  <span>Real-time buyer intent telemetry</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-status-success shrink-0" />
                  <span>Branded with your firm name &amp; RERA badge</span>
                </li>
              </ul>
            </div>

            {/* Engine 5 */}
            <div className="p-6 rounded-3xl bg-surface border border-border shadow-xs hover:border-accent/40 transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 flex items-center justify-center font-bold">
                <Car className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-display text-content">
                5. Escorted Tour Passports
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                Organize multi-project site visits with turn-by-turn driving directions, sample flat checklists, assigned host agents, and post-tour feedback collection.
              </p>
              <ul className="text-xs space-y-1.5 text-content-muted font-medium pt-2 border-t border-border">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-status-success shrink-0" />
                  <span>WhatsApp site visit itinerary pass</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-status-success shrink-0" />
                  <span>GPS navigation &amp; sample flat confirmation</span>
                </li>
              </ul>
            </div>

            {/* Engine 6 */}
            <div className="p-6 rounded-3xl bg-surface border border-border shadow-xs hover:border-accent/40 transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 flex items-center justify-center font-bold">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-display text-content">
                6. Deal Commission &amp; GST Ledger
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                Record booking tokens, calculate brokerage percentages, split commissions across closing agents and firm reserves, and generate statutory 18% GST tax invoices.
              </p>
              <ul className="text-xs space-y-1.5 text-content-muted font-medium pt-2 border-t border-border">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-status-success shrink-0" />
                  <span>Commission milestone tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-status-success shrink-0" />
                  <span>One-click GST tax invoice generation</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. INTERACTIVE BROKERAGE ROI CALCULATOR */}
      <section id="calculator" className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent">
              Financial Impact
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-content font-display tracking-tight">
              Calculate Additional Brokerage Unlocked with Lucky CRM
            </h2>
            <p className="text-xs sm:text-sm text-content-secondary">
              See what accelerating response time and preventing lead slippage means for your bottom line.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border shadow-xl space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Slider 1: Leads */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="roi-leads-range" className="text-xs font-bold text-content flex items-center gap-2">
                    <Users className="w-4 h-4 text-accent" />
                    <span>Monthly Inbound Buyer Leads</span>
                  </label>
                  <span className="font-mono font-black text-accent text-sm">
                    {leadsPerMonth} Leads
                  </span>
                </div>
                <input
                  id="roi-leads-range"
                  type="range"
                  min="20"
                  max="1000"
                  step="10"
                  value={leadsPerMonth}
                  onChange={(e) => setLeadsPerMonth(Number(e.target.value))}
                  className="w-full accent-[#2563eb] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-content-muted">
                  <span>20 Leads</span>
                  <span>500 Leads</span>
                  <span>1,000 Leads</span>
                </div>
              </div>

              {/* Slider 2: Average Property Deal Size */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="roi-deal-value-range" className="text-xs font-bold text-content flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-500" />
                    <span>Average Property Deal Ticket</span>
                  </label>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    ₹{avgDealValueLakhs} Lakhs
                  </span>
                </div>
                <input
                  id="roi-deal-value-range"
                  type="range"
                  min="30"
                  max="500"
                  step="5"
                  value={avgDealValueLakhs}
                  onChange={(e) => setAvgDealValueLakhs(Number(e.target.value))}
                  className="w-full accent-[#10b981] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-content-muted">
                  <span>₹30 L (Affordable)</span>
                  <span>₹1.5 Cr (Mid-Luxury)</span>
                  <span>₹5 Cr (High-End)</span>
                </div>
              </div>
            </div>

            {/* Results Grid */}
            <div className="p-6 rounded-2xl bg-surface-subtle border border-border grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-[11px] text-content-muted font-medium">Extra Monthly Closings</div>
                <div className="text-2xl font-black text-content font-mono">+{extraDeals} Deals</div>
                <div className="text-[10px] text-content-muted">via sub-5m speed to lead</div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-content-muted font-medium">Avg Brokerage Per Deal (2%)</div>
                <div className="text-2xl font-black text-content font-mono">
                  ₹{(avgBrokeragePerDeal / 1000).toLocaleString('en-IN')}k
                </div>
                <div className="text-[10px] text-content-muted">Gross Commission</div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-accent font-bold">Estimated Extra Brokerage (Annual)</div>
                <div className="text-3xl font-black text-accent font-mono">
                  ₹{(extraBrokerageYearly / 100000).toFixed(2)} Lakhs
                </div>
                <div className="text-[10px] text-status-success font-semibold">
                  ROI &gt; 80x Subscription Cost
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. HOW IT WORKS WORKFLOW */}
      <section id="how-it-works" className="py-20 bg-surface-subtle/50 border-t border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent">
              Implementation Timeline
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-content font-display tracking-tight">
              Live in Your Brokerage in Under 5 Minutes
            </h2>
            <p className="text-xs sm:text-sm text-content-secondary">
              Zero complicated server setup. Cloud-native multi-tenant deployment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-3xl bg-surface border border-border space-y-4 relative">
              <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-sm font-mono">
                01
              </div>
              <h3 className="text-base font-bold font-display text-content">
                Register Your Firm &amp; Set Admin
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                Provide your firm name (e.g. ZamZam Properties, Apex Realty) and optional MahaRERA number. Your isolated database tenant is provisioned with auto-approval instantly.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-3xl bg-surface border border-border space-y-4 relative">
              <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-sm font-mono">
                02
              </div>
              <h3 className="text-base font-bold font-display text-content">
                Upload Inventory &amp; Webhooks
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                Connect inbound WhatsApp or IVR channels. Add developer projects and marketable property units with carpet areas and floor plans.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-3xl bg-surface border border-border space-y-4 relative">
              <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-sm font-mono">
                03
              </div>
              <h3 className="text-base font-bold font-display text-content">
                Start Closing Deals &amp; Invoicing
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                Dispatch curated client portals, host escorted site visits, record booking tokens, and track real-time commission payouts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. PRICING SECTION */}
      <section id="pricing" className="py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent">
              Transparent Firm Licensing
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-content font-display tracking-tight">
              One Predictable Flat Plan. No Hidden Fees.
            </h2>
            <p className="text-xs sm:text-sm text-content-secondary max-w-xl mx-auto">
              Everything you need to run your real estate firm. Unlimited leads, full MahaRERA compliance tools, and multi-broker RBAC.
            </p>

            {/* Monthly vs Annual Toggle with 20% Discount */}
            <div className="pt-4 flex items-center justify-center gap-3" role="radiogroup" aria-label="Billing frequency selection">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-surface text-content shadow-xs border border-border'
                    : 'text-content-muted hover:text-content'
                }`}
              >
                Monthly Billing
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle('annually')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  billingCycle === 'annually'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-content-muted hover:text-content'
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-status-success text-white font-mono font-bold tracking-tight">
                  SAVE 20%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Card */}
          <div className="max-w-md mx-auto rounded-3xl bg-surface border-2 border-accent shadow-2xl overflow-hidden backdrop-blur-md relative">
            <div className="bg-accent text-white py-1.5 px-4 text-center text-[11px] font-mono font-bold uppercase tracking-wider">
              ⭐ Most Popular Real Estate Operating System
            </div>

            <div className="p-8 space-y-6">
              <div>
                <div className="text-xs font-mono uppercase text-accent font-bold">
                  Brokerage Enterprise Edition
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl sm:text-5xl font-black text-content font-mono tracking-tight">
                    ₹{billingCycle === 'annually' ? annualDiscountedPrice.toLocaleString('en-IN') : monthlyPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-content-muted font-medium">/ month</span>
                </div>
                {billingCycle === 'annually' ? (
                  <p className="text-xs text-status-success font-semibold mt-1">
                    Billed annually at ₹{annualBilledAmount.toLocaleString('en-IN')}/year (20% discount applied)
                  </p>
                ) : (
                  <p className="text-xs text-content-muted mt-1">
                    Billed monthly. Cancel anytime without lock-in.
                  </p>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-border text-xs text-content-secondary font-medium">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
                  <span>Unlimited Inbound Leads &amp; Pipeline Stages</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
                  <span>Sub-5-minute Speed-to-Lead Telecaller Desk</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
                  <span>MahaRERA Project &amp; Unit Inventory Verification</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
                  <span>Private Client Presentation Portals with Live Telemetry</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
                  <span>WhatsApp Cloud API &amp; Telephony Webhook Ingestion</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
                  <span>Deal Commission Ledger &amp; 18% GST Invoice Generator</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
                  <span>Multi-Broker Team RBAC &amp; Tenant Guard Security</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
                  <span>Google Drive Cloud Database Backup &amp; CSV Exports</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/register"
                  className="w-full py-4 px-6 bg-accent hover:bg-accent-hover text-white font-extrabold rounded-2xl text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
                >
                  <span>Start 14-Day Free Trial</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-[10px] text-center text-content-muted mt-2 font-mono">
                  No credit card required • Instant auto-approval
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FAQ SECTION */}
      <section id="faq" className="py-20 bg-surface-subtle/50 border-t border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent">
              Frequently Asked Questions
            </span>
            <h2 className="text-3xl font-black text-content font-display tracking-tight">
              Got Questions? We Have Answers.
            </h2>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-surface border border-border space-y-2">
              <h3 className="text-sm font-bold text-content flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-accent" />
                <span>Can we customize our firm name and branding inside the CRM?</span>
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed pl-6">
                <strong>Yes, absolutely!</strong> After registering and logging in, any firm administrator can rename the organization (e.g. to &ldquo;ZamZam Properties&rdquo;, &ldquo;Apex Realty&rdquo;, or &ldquo;Lodha Channel Partners&rdquo;) and configure your official MahaRERA broker registration number. This custom name is dynamically displayed across your headers, reports, and buyer presentation portals.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-surface border border-border space-y-2">
              <h3 className="text-sm font-bold text-content flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-accent" />
                <span>How does multi-tenant isolation work? Is our data separate from other firms?</span>
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed pl-6">
                Lucky CRM uses strict database-level multi-tenancy enforced by our automated Tenant Guard. Every lead, phone number, inventory record, client portal, and commission invoice is cryptographically and logically bound to your firm&rsquo;s <code className="text-accent font-mono text-[11px]">organizationId</code>. No other firm or broker can ever see or access your pipeline.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-surface border border-border space-y-2">
              <h3 className="text-sm font-bold text-content flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-accent" />
                <span>How does the 14-day evaluation trial work?</span>
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed pl-6">
                When you register through <Link href="/register" className="text-accent underline font-semibold">/register</Link>, your firm workspace is immediately auto-approved. You get full access to all 6 core engines for 14 days with no credit card required.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-surface border border-border space-y-2">
              <h3 className="text-sm font-bold text-content flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-accent" />
                <span>Can we import our existing lead spreadsheets from Excel or CSV?</span>
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed pl-6">
                Yes! Our built-in spreadsheet ingestion engine allows you to drag-and-drop Excel files (.xlsx, .xls), CSV, TSV, or JSON. It automatically deduplicates contacts by phone number and normalizes budgets and configurations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FINAL CONVERSION BANNER */}
      <section className="py-20 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black text-content font-display tracking-tight">
            Ready to 10x Your Real Estate Brokerage Velocity?
          </h2>
          <p className="text-sm sm:text-base text-content-secondary max-w-xl mx-auto leading-relaxed">
            Join premier advisory firms and channel partners using Lucky CRM to dispatch leads faster and close more high-ticket deals.
          </p>
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 bg-accent hover:bg-accent-hover text-white text-sm font-extrabold rounded-2xl shadow-xl transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <span>Register Your Firm Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-4 text-content hover:bg-surface-subtle border border-border rounded-2xl text-sm font-bold transition-colors"
            >
              Sign In to Console
            </Link>
          </div>
        </div>
      </section>

      {/* 11. FOOTER */}
      <footer className="py-12 border-t border-border bg-surface text-content-muted text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-3">
            <BrandLogo mode="horizontal" size="xs" withRera firmName="Lucky CRM" reraNumber="Real Estate Brokerage OS" />
          </Link>

          <div className="flex items-center gap-6 text-xs font-semibold">
            <Link href="/register" className="hover:text-content transition-colors">Register Firm</Link>
            <Link href="/login" className="hover:text-content transition-colors">Sign In</Link>
            <a href="#features" className="hover:text-content transition-colors">Engines</a>
            <a href="#pricing" className="hover:text-content transition-colors">Pricing</a>
          </div>

          <div className="text-center md:text-right font-mono text-[11px] space-y-1">
            <div>© {new Date().getFullYear()} Lucky CRM Real Estate OS. All rights reserved.</div>
            <div>MahaRERA Statutory Compliance &amp; Cryptographic Tenant Isolation.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
