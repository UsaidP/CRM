'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Mail,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Copy,
  Check,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { FeedbackAlert } from '@/components/ui/FeedbackAlert';
import { forgotPassword } from '@/lib/client/auth';

export function ForgotPasswordClient() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setResetUrl(null);

    try {
      const data = await forgotPassword(email);

      if (data.success) {
        setSuccessMsg(data.message || 'Password reset link generated!');
        if (data.resetUrl) {
          setResetUrl(data.resetUrl);
        }
      } else {
        setErrorMsg(data.error || 'Failed to process password reset');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const copyResetLink = () => {
    if (!resetUrl) return;
    const fullUrl = `${window.location.origin}${resetUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-canvas text-content relative overflow-hidden font-sans">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-accent/10 via-accent/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <header className="p-6 md:px-12 flex items-center justify-between z-10">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-accent text-white flex items-center justify-center font-black text-lg shadow-md group-hover:scale-105 transition-transform">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-content font-display">
              ZamZam Realty
            </span>
            <span className="block text-[10px] text-content-muted font-mono uppercase">
              Account Recovery
            </span>
          </div>
        </Link>
        <ThemeToggle variant="compact" />
      </header>

      {/* Main Card */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8 z-10">
        <div className="w-full max-w-md bg-surface rounded-3xl border border-border shadow-2xl overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="p-6 pb-4 border-b border-border bg-surface-subtle">
            <div className="flex items-center gap-2 text-xs font-bold font-mono text-accent mb-2">
              <KeyRound className="w-4 h-4" />
              <span>PASSWORD RESET</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-content font-display tracking-tight">
              Forgot Your Password?
            </h1>
            <p className="text-xs text-content-secondary mt-1 font-medium">
              Enter your registered brokerage email to generate a secure password reset link.
            </p>
          </div>

          <div className="p-6 md:p-8 space-y-5">
            {successMsg && (
              <FeedbackAlert
                variant="success"
                title="Reset Link Ready"
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

            {/* Generated Reset Link Display Helper */}
            {resetUrl && (
              <div className="p-4 rounded-2xl bg-accent-soft/30 border border-accent/30 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-accent-text">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-accent" />
                    <span>Password Reset Link Ready</span>
                  </span>
                  <span className="text-[10px] font-mono opacity-80">Valid 2 Hours</span>
                </div>

                <div className="p-2.5 bg-surface border border-border rounded-xl font-mono text-xs text-content break-all">
                  {resetUrl}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={copyResetLink}
                    className="flex-1 py-2 px-3 rounded-xl bg-surface hover:bg-surface-subtle border border-border text-xs font-bold text-content flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5 text-accent" />}
                    <span>{copied ? 'Copied to Clipboard!' : 'Copy Reset Link'}</span>
                  </button>

                  <Link
                    href={resetUrl}
                    className="py-2 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <span>Open Reset Page</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-content">Registered Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-content-muted" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. samrin@zamzamproperties.in"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-content focus:outline-none focus:border-accent font-medium transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-white font-extrabold rounded-2xl text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Generating Link...' : 'Send Password Reset Link'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="pt-3 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-content-secondary hover:text-content transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-6 text-center text-[11px] text-content-muted z-10 font-mono">
        ZamZam Properties Real Estate Advisory • Secure Broker Desk
      </footer>
    </div>
  );
}
