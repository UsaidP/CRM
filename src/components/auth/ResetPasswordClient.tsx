'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { FeedbackAlert } from '@/components/ui/FeedbackAlert';
import { resetPassword } from '@/lib/client/auth';

export function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMsg('Missing password reset token. Please check your link.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const data = await resetPassword(token, newPassword);

      if (data.success) {
        setSuccessMsg(data.message || 'Password has been updated successfully!');
        setTimeout(() => {
          router.push('/login?message=Password updated successfully! Please sign in with your new password.');
        }, 1500);
      } else {
        setErrorMsg(data.error || 'Failed to update password');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error');
    } finally {
      setLoading(false);
    }
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
              Set New Password
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
              <span>SECURITY RECOVERY</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-content font-display tracking-tight">
              Reset Your Password
            </h1>
            <p className="text-xs text-content-secondary mt-1 font-medium">
              Create a new secure password for your brokerage console account.
            </p>
          </div>

          <div className="p-6 md:p-8 space-y-5">
            {successMsg && (
              <FeedbackAlert
                variant="success"
                title="Password Updated"
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

            {!token ? (
              <div className="p-4 rounded-2xl bg-status-danger-surface border border-status-danger/30 text-status-danger space-y-3">
                <div className="font-bold text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>Invalid or Missing Token</span>
                </div>
                <p className="text-xs">
                  No valid reset token was found in the URL. Please request a new password reset link.
                </p>
                <Link
                  href="/forgot-password"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white font-bold rounded-xl text-xs"
                >
                  <span>Request New Link</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-content">New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-content-muted" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-10 pr-10 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-content focus:outline-none focus:border-accent font-mono transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-content-muted hover:text-content p-0.5 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-content">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-content-muted" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full pl-10 pr-4 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-content focus:outline-none focus:border-accent font-mono transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-white font-extrabold rounded-2xl text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{loading ? 'Updating Password...' : 'Save New Password & Log In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

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
