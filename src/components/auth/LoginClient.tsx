'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Phone,
  UserCheck,
  HelpCircle,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { login } from '@/lib/client/auth';

interface LoginClientProps {
  initialRedirect?: string;
  initialMessage?: string | null;
}

export function LoginClient({
  initialRedirect = '/',
  initialMessage = null,
}: LoginClientProps) {
  const router = useRouter();

  const [redirectUrl, setRedirectUrl] = useState(initialRedirect);
  const [authMode, setAuthMode] = useState<'CREDENTIALS' | 'SUPER_ADMIN_KEY'>('CREDENTIALS');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [superAdminKey, setSuperAdminKey] = useState('');
  const [showSuperAdminKey, setShowSuperAdminKey] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(initialMessage);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const redir = params.get('redirect');
      if (redir) setRedirectUrl(redir);
      const msg = params.get('message');
      if (msg && !initialMessage) setSuccessMsg(msg);
    }
  }, [initialMessage]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload =
        authMode === 'SUPER_ADMIN_KEY'
          ? { type: 'SUPER_ADMIN_KEY', superAdminKey }
          : { type: 'CREDENTIALS', email, password };

      const data = await login(payload);

      if (data.success) {
        setSuccessMsg('Authentication verified. Redirecting to workspace...');
        setTimeout(() => {
          router.push(redirectUrl);
          router.refresh();
        }, 400);
      } else {
        setErrorMsg(data.error || 'Authentication failed');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error during login');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail: string, demoRole: string) => {
    setAuthMode('CREDENTIALS');
    setEmail(demoEmail);
    setPassword('ZamZam@2026');
    setErrorMsg(null);
  };

  const fillSuperAdminDemoKey = () => {
    setAuthMode('SUPER_ADMIN_KEY');
    setSuperAdminKey('zamzam-superadmin-secret-2026');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-canvas text-content relative overflow-hidden font-sans selection:bg-[#2563eb] selection:text-white">
      {/* Background Ambience Gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-accent/10 via-accent/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Top Header */}
      <header className="p-6 md:px-12 flex items-center justify-between z-10">
        <Link href="/" className="flex items-center gap-3 group" aria-label="ZamZam Properties Home">
          <BrandLogo mode="horizontal" size="md" withRera reraNumber="MahaRERA A52000028714" />
        </Link>

        <ThemeToggle variant="compact" />
      </header>

      {/* Center Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8 z-10">
        <div className="w-full max-w-md bg-surface rounded-3xl border border-border shadow-2xl overflow-hidden backdrop-blur-md transition-all duration-300">
          {/* Card Banner */}
          <div className="p-6 pb-4 border-b border-border bg-surface-subtle">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold font-mono text-accent">
                <ShieldCheck className="w-4 h-4" />
                <span>SECURE ACCESS GATEWAY</span>
              </div>
              <span className="text-xs font-mono text-content-secondary font-semibold">v2.0 • 2026</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-content font-display tracking-tight">
              Sign In to Broker Console
            </h1>
            <p className="text-xs text-content-secondary mt-1.5 font-medium leading-relaxed">
              Access real-time lead dispatch, MahaRERA inventory, site visit logistics, and deal ledgers.
            </p>

            {/* Auth Method Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-canvas border border-border rounded-2xl mt-4" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'CREDENTIALS'}
                onClick={() => {
                  setAuthMode('CREDENTIALS');
                  setErrorMsg(null);
                }}
                className={`py-2.5 px-3 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  authMode === 'CREDENTIALS'
                    ? 'bg-surface text-content shadow-xs border border-border'
                    : 'text-content-secondary hover:text-content'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Team Credentials</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'SUPER_ADMIN_KEY'}
                onClick={() => {
                  setAuthMode('SUPER_ADMIN_KEY');
                  setErrorMsg(null);
                }}
                className={`py-2.5 px-3 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  authMode === 'SUPER_ADMIN_KEY'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-content-secondary hover:text-content'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span>Super Admin Key</span>
              </button>
            </div>
          </div>

          {/* Form Area */}
          <div className="p-6 md:p-8 space-y-5">
            {/* Feedback Notifications */}
            {successMsg && (
              <div className="p-3.5 bg-status-success-surface border border-status-success/30 rounded-2xl text-status-success text-xs font-bold flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3.5 bg-status-danger-surface border border-status-danger/30 rounded-2xl text-status-danger text-xs font-bold flex items-center gap-2.5" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {authMode === 'CREDENTIALS' ? (
                <>
                  {/* Email Input */}
                  <div className="space-y-1.5">
                    <label htmlFor="login-email" className="text-xs font-bold text-content flex items-center justify-between">
                      <span>Email Address</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-secondary pointer-events-none" />
                      <input
                        id="login-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. safwan@zamzamproperties.in"
                        autoComplete="email"
                        className="w-full pl-10 pr-4 py-3 min-h-[44px] bg-surface-subtle border border-border rounded-xl text-xs text-content focus:outline-none focus:border-accent font-medium transition-colors"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="login-password" className="text-xs font-bold text-content">Password</label>
                      <Link
                        href="/forgot-password"
                        className="text-xs font-bold text-accent hover:underline min-h-[32px] inline-flex items-center"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative flex items-center">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-secondary pointer-events-none" />
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        autoComplete="current-password"
                        className="w-full pl-10 pr-12 py-3 min-h-[44px] bg-surface-subtle border border-border rounded-xl text-xs text-content focus:outline-none focus:border-accent font-mono transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-content-secondary hover:text-content rounded-lg cursor-pointer transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Super Admin Master Key Input */}
                  <div className="space-y-2">
                    <label htmlFor="login-super-key" className="text-xs font-bold text-content block">
                      Super Admin Secret Key
                    </label>
                    <div className="relative flex items-center">
                      <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-secondary pointer-events-none" />
                      <input
                        id="login-super-key"
                        type={showSuperAdminKey ? 'text' : 'password'}
                        required
                        value={superAdminKey}
                        onChange={(e) => setSuperAdminKey(e.target.value)}
                        placeholder="Enter SUPER_ADMIN_KEY..."
                        autoComplete="off"
                        className="w-full pl-10 pr-12 py-3 min-h-[44px] bg-surface-subtle border border-border rounded-xl text-xs text-content focus:outline-none focus:border-accent font-mono transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSuperAdminKey(!showSuperAdminKey)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-content-secondary hover:text-content rounded-lg cursor-pointer transition-colors"
                        aria-label={showSuperAdminKey ? 'Hide key' : 'Show key'}
                        title={showSuperAdminKey ? 'Hide key' : 'Show key'}
                      >
                        {showSuperAdminKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 min-h-[44px] bg-accent hover:bg-accent-hover text-white font-extrabold rounded-2xl text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : authMode === 'SUPER_ADMIN_KEY' ? 'Authorize Super Admin' : 'Sign In to Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Credentials Assistant */}
            <div className="pt-4 border-t border-border/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-content-secondary font-bold">
                <span className="flex items-center gap-1.5 font-mono uppercase tracking-wider">
                  <UserCheck className="w-4 h-4 text-accent" /> Quick Fill Demo Accounts
                </span>
                <span className="text-[11px] font-mono text-content-secondary font-semibold">(Pass: ZamZam@2026)</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => fillDemoAccount('usaid@zamzamproperties.in', 'SUPER_ADMIN')}
                  className="p-3 min-h-[48px] rounded-xl bg-surface-subtle hover:bg-accent-soft border border-border hover:border-accent/40 text-left transition-colors cursor-pointer group"
                >
                  <div className="font-bold text-xs text-content group-hover:text-accent-text truncate font-display">
                    Usaid Patel
                  </div>
                  <div className="text-[11px] text-content-secondary group-hover:text-accent-text font-mono truncate font-medium">
                    👑 Super Admin
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount('safwan@zamzamproperties.in', 'MANAGER')}
                  className="p-3 min-h-[48px] rounded-xl bg-surface-subtle hover:bg-accent-soft border border-border hover:border-accent/40 text-left transition-colors cursor-pointer group"
                >
                  <div className="font-bold text-xs text-content group-hover:text-accent-text truncate font-display">
                    Safwan Diwan
                  </div>
                  <div className="text-[11px] text-content-secondary group-hover:text-accent-text font-mono truncate font-medium">
                    👔 Team Manager
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount('suhel@zamzamproperties.in', 'AGENT')}
                  className="p-3 min-h-[48px] rounded-xl bg-surface-subtle hover:bg-accent-soft border border-border hover:border-accent/40 text-left transition-colors cursor-pointer group"
                >
                  <div className="font-bold text-xs text-content group-hover:text-accent-text truncate font-display">
                    Suhel Patel
                  </div>
                  <div className="text-[11px] text-content-secondary group-hover:text-accent-text font-mono truncate font-medium">
                    💼 Senior Agent
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount('samrin@zamzamproperties.in', 'TELECALLER')}
                  className="p-3 min-h-[48px] rounded-xl bg-surface-subtle hover:bg-accent-soft border border-border hover:border-accent/40 text-left transition-colors cursor-pointer group"
                >
                  <div className="font-bold text-xs text-content group-hover:text-accent-text truncate font-display">
                    Samrin Merchant
                  </div>
                  <div className="text-[11px] text-content-secondary group-hover:text-accent-text font-mono truncate font-medium">
                    🎧 Telecaller Desk
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-content-secondary z-10 space-y-1 font-medium">
        <div>
          ZamZam Properties Real Estate Advisory CRM • Internal Team &amp; Broker Dispatch System
        </div>
        <div className="font-mono text-[11px] text-content-secondary">
          Encrypted Session Security • RERA Certified Real Estate Operations
        </div>
      </footer>
    </div>
  );
}
