'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  HelpCircle,
  Smartphone,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { FeedbackAlert } from '@/components/ui/FeedbackAlert';
import { login, sendOtp, verifyOtp } from '@/lib/client/auth';

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
  const [authMode, setAuthMode] = useState<'CREDENTIALS' | 'PHONE_OTP' | 'SUPER_ADMIN_KEY'>('CREDENTIALS');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [superAdminKey, setSuperAdminKey] = useState('');
  const [showSuperAdminKey, setShowSuperAdminKey] = useState(false);

  // OTP state
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setErrorMsg('Please enter your phone number');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const data = await sendOtp(phone);

      if (data.success) {
        setOtpSent(true);
        setCooldown(30);
        setSuccessMsg('OTP sent to your phone number');
        // Auto-focus first OTP input
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      } else {
        if ((data as any).cooldownSeconds) {
          setCooldown((data as any).cooldownSeconds);
        }
        setErrorMsg(data.error || 'Failed to send OTP');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const otpCode = otpDigits.join('');
    if (otpCode.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const data = await verifyOtp(phone, otpCode);

      if (data.success) {
        setSuccessMsg('Phone verified. Redirecting to workspace...');
        setTimeout(() => {
          router.push(redirectUrl);
          router.refresh();
        }, 400);
      } else {
        setErrorMsg(data.error || 'Invalid OTP');
        // Clear OTP on failure
        setOtpDigits(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    // Only allow single digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are filled
    if (digit && index === 5) {
      const fullOtp = newDigits.join('');
      if (fullOtp.length === 6) {
        // Small delay to show the last digit before submitting
        setTimeout(() => handleVerifyOtp(), 150);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newDigits = pasted.split('');
      setOtpDigits(newDigits);
      otpInputRefs.current[5]?.focus();
      // Auto-submit
      setTimeout(() => handleVerifyOtp(), 150);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setOtpDigits(['', '', '', '', '', '']);
    setErrorMsg(null);
    await handleSendOtp({ preventDefault: () => {} } as React.FormEvent);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-canvas text-content relative overflow-hidden font-sans selection:bg-[#2563eb] selection:text-white">
      {/* Background Ambience Gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-accent/10 via-accent/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Top Header */}
      <header className="p-6 md:px-12 flex items-center justify-between z-10">
        <Link href="/" className="flex items-center gap-3 group" aria-label="Lucky CRM Home">
          <BrandLogo mode="horizontal" size="md" withRera firmName="Lucky CRM" reraNumber="Real Estate Brokerage OS" />
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

            {/* Auth Method Tabs — 3 columns */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-canvas border border-border rounded-2xl mt-4" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'CREDENTIALS'}
                onClick={() => {
                  setAuthMode('CREDENTIALS');
                  setErrorMsg(null);
                  setOtpSent(false);
                }}
                className={`py-2.5 px-2 min-h-[44px] rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMode === 'CREDENTIALS'
                    ? 'bg-surface text-content shadow-xs border border-border'
                    : 'text-content-secondary hover:text-content'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'PHONE_OTP'}
                onClick={() => {
                  setAuthMode('PHONE_OTP');
                  setErrorMsg(null);
                }}
                className={`py-2.5 px-2 min-h-[44px] rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMode === 'PHONE_OTP'
                    ? 'bg-surface text-content shadow-xs border border-border'
                    : 'text-content-secondary hover:text-content'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Phone OTP</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'SUPER_ADMIN_KEY'}
                onClick={() => {
                  setAuthMode('SUPER_ADMIN_KEY');
                  setErrorMsg(null);
                  setOtpSent(false);
                }}
                className={`py-2.5 px-2 min-h-[44px] rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMode === 'SUPER_ADMIN_KEY'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-content-secondary hover:text-content'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Admin Key</span>
              </button>
            </div>
          </div>

          {/* Form Area */}
          <div className="p-6 md:p-8 space-y-5">
            {/* Feedback Notifications */}
            {successMsg && (
              <FeedbackAlert
                variant="success"
                title="Welcome Back"
                description={successMsg}
                onDismiss={() => setSuccessMsg(null)}
              />
            )}

            {errorMsg && (
              <FeedbackAlert
                variant="error"
                error={errorMsg}
                onDismiss={() => setErrorMsg(null)}
              />
            )}

            {/* ─── Email + Password Form ─── */}
            {authMode === 'CREDENTIALS' && (
              <form onSubmit={handleLogin} className="space-y-4">
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
                      placeholder="e.g. you@yourfirm.com"
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 min-h-[44px] bg-accent hover:bg-accent-hover text-white font-extrabold rounded-2xl text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* ─── Phone + OTP Form ─── */}
            {authMode === 'PHONE_OTP' && (
              <>
                {!otpSent ? (
                  /* Step 1: Enter phone number */
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="login-phone" className="text-xs font-bold text-content">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-secondary pointer-events-none" />
                        <input
                          id="login-phone"
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98201 23456"
                          autoComplete="tel"
                          className="w-full pl-10 pr-4 py-3 min-h-[44px] bg-surface-subtle border border-border rounded-xl text-xs text-content focus:outline-none focus:border-accent font-medium transition-colors"
                        />
                      </div>
                      <p className="text-[11px] text-content-secondary font-medium">
                        Enter the phone number registered with your CRM account
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-4 min-h-[44px] bg-accent hover:bg-accent-hover text-white font-extrabold rounded-2xl text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>{loading ? 'Sending OTP...' : 'Send OTP'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  /* Step 2: Enter OTP */
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-content block">
                        Enter 6-digit OTP
                      </label>
                      <p className="text-[11px] text-content-secondary font-medium">
                        Sent to <span className="font-bold text-content font-mono">{phone}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setOtpSent(false);
                            setOtpDigits(['', '', '', '', '', '']);
                            setErrorMsg(null);
                          }}
                          className="ml-2 text-accent font-bold hover:underline cursor-pointer"
                        >
                          Change
                        </button>
                      </p>

                      {/* 6-digit OTP input boxes */}
                      <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                        {otpDigits.map((digit, i) => (
                          <input
                            key={i}
                            ref={(el) => { otpInputRefs.current[i] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                            className="w-11 h-13 text-center text-lg font-bold font-mono bg-surface-subtle border border-border rounded-xl text-content focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                            aria-label={`OTP digit ${i + 1}`}
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otpDigits.join('').length !== 6}
                      className="w-full py-3.5 px-4 min-h-[44px] bg-accent hover:bg-accent-hover text-white font-extrabold rounded-2xl text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>{loading ? 'Verifying...' : 'Verify & Sign In'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    {/* Resend OTP */}
                    <div className="text-center">
                      {cooldown > 0 ? (
                        <span className="text-xs text-content-secondary font-medium">
                          Resend OTP in <span className="font-bold font-mono text-content">{cooldown}s</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={loading}
                          className="text-xs font-bold text-accent hover:underline cursor-pointer disabled:opacity-50"
                        >
                          Didn&apos;t receive it? Resend OTP
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </>
            )}

            {/* ─── Super Admin Key Form ─── */}
            {authMode === 'SUPER_ADMIN_KEY' && (
              <form onSubmit={handleLogin} className="space-y-4">
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 min-h-[44px] bg-accent hover:bg-accent-hover text-white font-extrabold rounded-2xl text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{loading ? 'Authenticating...' : 'Authorize Super Admin'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-content-secondary z-10 space-y-1 font-medium">
        <div>
          Lucky CRM • Internal Team &amp; Broker Dispatch System
        </div>
        <div className="font-mono text-[11px] text-content-secondary">
          Encrypted Session Security • RERA Certified Real Estate Operations
        </div>
      </footer>
    </div>
  );
}
