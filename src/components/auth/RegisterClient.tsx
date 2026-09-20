'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  Sparkles,
  MapPin,
  FileCheck,
  Check,
  Loader2,
  KeyRound,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { FeedbackAlert } from '@/components/ui/FeedbackAlert';
import { BrandLogo } from '@/components/ui/BrandLogo';

export function RegisterClient() {
  const router = useRouter();

  // Multi-step form state
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Firm details
  const [firmName, setFirmName] = useState('');
  const [reraNumber, setReraNumber] = useState('');
  const [city, setCity] = useState('Mumbai / Navi Mumbai');

  // Step 2: Admin details
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  // Navigation between steps with validation
  const handleNextToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firmName.trim() || firmName.trim().length < 2) {
      setErrorMsg('Please enter a valid Firm / Organization name (at least 2 characters).');
      return;
    }
    setErrorMsg(null);
    setStep(2);
  };

  const handleNextToStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim() || adminName.trim().length < 2) {
      setErrorMsg('Please enter the principal administrator full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid official email address.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      setErrorMsg('Please enter a valid contact phone number.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }
    setErrorMsg(null);
    setStep(3);
  };

  // Final Registration Submission
  const handleFinalSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);

    const formattedPhone = phone.trim().startsWith('+') ? phone.trim() : `+91${phone.trim().replace(/^0+/, '')}`;

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firmName: firmName.trim(),
          reraNumber: reraNumber.trim() || null,
          adminName: adminName.trim(),
          email: email.trim().toLowerCase(),
          phoneE164: formattedPhone,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed. Please check your details and try again.');
      }

      setRegisteredSuccess(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-canvas text-content relative overflow-hidden font-sans selection:bg-[#2563eb] selection:text-white">
      {/* Background Ambience Gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-accent/15 via-accent/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Top Header */}
      <header className="p-6 md:px-12 flex items-center justify-between z-10">
        <Link href="/" className="flex items-center gap-3 group" aria-label="Lucky CRM Home">
          <BrandLogo mode="horizontal" size="sm" withRera firmName="Lucky CRM" reraNumber="Real Estate OS" />
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-bold text-content-muted hover:text-content px-3 py-2 rounded-xl transition-colors"
          >
            Already have an account? <span className="text-accent underline">Sign In</span>
          </Link>
          <ThemeToggle variant="compact" />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8 z-10">
        <div className="w-full max-w-xl bg-surface rounded-3xl border border-border shadow-2xl overflow-hidden backdrop-blur-md transition-all duration-300">
          {/* Card Banner & Stepper */}
          <div className="p-6 pb-4 border-b border-border bg-surface-subtle">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold font-mono text-accent">
                <Sparkles className="w-4 h-4" />
                <span>SELF-SERVICE FIRM ONBOARDING</span>
              </div>
              <span className="text-[11px] font-mono text-status-success font-bold bg-status-success-surface px-2 py-0.5 rounded-md border border-status-success/30">
                Auto-Approval Active
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-black text-content font-display tracking-tight">
              {registeredSuccess ? 'Firm Workspace Ready' : 'Register Your Real Estate Firm'}
            </h1>
            <p className="text-xs text-content-secondary mt-1 font-medium leading-relaxed">
              {registeredSuccess
                ? 'Your isolated firm tenant and principal admin account have been provisioned.'
                : 'Get instant access to lead attribution, MahaRERA inventory matrices, and client presentation portals.'}
            </p>

            {/* Step Progress Bar */}
            {!registeredSuccess && (
              <div className="grid grid-cols-3 gap-2 mt-5">
                {/* Step 1 Tab */}
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    step >= 1 ? 'bg-accent' : 'bg-border'
                  }`}
                />
                {/* Step 2 Tab */}
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    step >= 2 ? 'bg-accent' : 'bg-border'
                  }`}
                />
                {/* Step 3 Tab */}
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    step >= 3 ? 'bg-accent' : 'bg-border'
                  }`}
                />
              </div>
            )}
          </div>

          {/* Form Content Area */}
          <div className="p-6 md:p-8 space-y-5">
            {errorMsg && (
              <FeedbackAlert
                variant="error"
                error={errorMsg}
                onDismiss={() => setErrorMsg(null)}
              />
            )}

            {registeredSuccess ? (
              /* Success Confirmation Card */
              <div className="text-center py-6 space-y-5">
                <div className="w-16 h-16 rounded-3xl bg-status-success-surface text-status-success flex items-center justify-center mx-auto border border-status-success/30 shadow-md">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold font-display text-content">
                    Welcome, {firmName}!
                  </h3>
                  <p className="text-xs text-content-secondary max-w-md mx-auto leading-relaxed">
                    Your brokerage workspace has been successfully initialized. You can now sign in with your administrator email{' '}
                    <strong className="text-content font-mono">{email}</strong> to customize your firm name, invite brokers, and upload inventory.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-subtle border border-border text-left max-w-sm mx-auto space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-content-muted">Firm Name:</span>
                    <span className="font-bold text-content">{firmName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-content-muted">Admin:</span>
                    <span className="font-bold text-content">{adminName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-content-muted">RERA Registration:</span>
                    <span className="font-mono text-content">{reraNumber || 'Pending / Optional'}</span>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => router.push(`/login?email=${encodeURIComponent(email)}`)}
                    className="py-3 px-6 bg-accent hover:bg-accent-hover text-white font-extrabold rounded-2xl text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Proceed to Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <Link
                    href="/"
                    className="py-3 px-5 text-content-muted hover:text-content hover:bg-surface-subtle rounded-2xl text-xs font-bold transition-colors text-center border border-border"
                  >
                    Lucky CRM Homepage
                  </Link>
                </div>
              </div>
            ) : step === 1 ? (
              /* STEP 1: FIRM DETAILS */
              <form onSubmit={handleNextToStep2} className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent">
                    Step 1 of 3 • Firm Identity
                  </span>
                  <h2 className="text-sm font-bold text-content">What is your brokerage or advisory firm name?</h2>
                </div>

                {/* Firm Name */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-firm-name" className="text-xs font-bold text-content flex items-center justify-between">
                    <span>Firm / Organization Name</span>
                    <span className="text-[10px] text-content-muted font-normal">e.g. Apex Realty, ZamZam Properties</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
                    <input
                      id="reg-firm-name"
                      type="text"
                      required
                      value={firmName}
                      onChange={(e) => setFirmName(e.target.value)}
                      placeholder="e.g. Skyline Real Estate Partners"
                      className="w-full pl-10 pr-4 py-3 bg-surface-subtle border border-border rounded-xl text-xs text-content focus:outline-none focus:border-accent font-medium transition-colors"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-content-muted">
                    You can rename or customize this anytime inside the CRM after signing in.
                  </p>
                </div>

                {/* MahaRERA Registration */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-rera-num" className="text-xs font-bold text-content flex items-center justify-between">
                    <span>MahaRERA Broker Registration Number (Optional)</span>
                    <span className="text-[10px] text-content-muted font-mono">Format: A520000...</span>
                  </label>
                  <div className="relative">
                    <FileCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
                    <input
                      id="reg-rera-num"
                      type="text"
                      value={reraNumber}
                      onChange={(e) => setReraNumber(e.target.value)}
                      placeholder="e.g. MahaRERA A52000028714"
                      className="w-full pl-10 pr-4 py-3 bg-surface-subtle border border-border rounded-xl text-xs text-content focus:outline-none focus:border-accent font-mono transition-colors"
                    />
                  </div>
                </div>

                {/* Operating Region */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-city" className="text-xs font-bold text-content flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-content-muted" />
                    <span>Primary Operating Market</span>
                  </label>
                  <input
                    id="reg-city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-subtle border border-border rounded-xl text-xs text-content focus:outline-none focus:border-accent font-medium transition-colors"
                  />
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 bg-accent hover:bg-accent-hover text-white font-extrabold rounded-2xl text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Continue to Administrator Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : step === 2 ? (
              /* STEP 2: ADMIN CREDENTIALS */
              <form onSubmit={handleNextToStep3} className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent">
                    Step 2 of 3 • Principal Administrator
                  </span>
                  <h2 className="text-sm font-bold text-content">Create your root administrative credentials</h2>
                </div>

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-admin-name" className="text-xs font-bold text-content">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
                    <input
                      id="reg-admin-name"
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="e.g. Imran Khan"
                      className="w-full pl-10 pr-4 py-3 bg-surface-subtle border border-border rounded-xl text-xs text-content focus:outline-none focus:border-accent font-medium transition-colors"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-email" className="text-xs font-bold text-content">
                    Official Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
                    <input
                      id="reg-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. imran@apexrealty.in"
                      className="w-full pl-10 pr-4 py-3 bg-surface-subtle border border-border rounded-xl text-xs text-content focus:outline-none focus:border-accent font-medium transition-colors"
                    />
                  </div>
                </div>

                {/* Contact Phone */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-phone" className="text-xs font-bold text-content">
                    Mobile Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
                    <input
                      id="reg-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9820123456"
                      className="w-full pl-10 pr-4 py-3 bg-surface-subtle border border-border rounded-xl text-xs text-content focus:outline-none focus:border-accent font-medium transition-colors"
                    />
                  </div>
                </div>

                {/* Password & Confirm */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="reg-pwd" className="text-xs font-bold text-content">Password</label>
                    <div className="relative flex items-center">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
                      <input
                        id="reg-pwd"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-10 py-3 bg-surface-subtle border border-border rounded-xl text-xs text-content focus:outline-none focus:border-accent font-mono transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 text-content-muted hover:text-content p-1 cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="reg-confirm-pwd" className="text-xs font-bold text-content">Confirm Password</label>
                    <div className="relative flex items-center">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
                      <input
                        id="reg-confirm-pwd"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-4 py-3 bg-surface-subtle border border-border rounded-xl text-xs text-content focus:outline-none focus:border-accent font-mono transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="py-3.5 px-4 text-xs font-semibold text-content-muted hover:text-content hover:bg-surface-subtle rounded-2xl border border-border transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 px-4 bg-accent hover:bg-accent-hover text-white font-extrabold rounded-2xl text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Review &amp; Provision Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              /* STEP 3: REVIEW & LAUNCH */
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent">
                    Step 3 of 3 • Review &amp; Launch
                  </span>
                  <h2 className="text-sm font-bold text-content">Confirm firm parameters for immediate deployment</h2>
                </div>

                <div className="p-4 rounded-2xl bg-surface-subtle border border-border space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-content-muted font-medium">Firm / Org Name:</span>
                    <span className="font-bold text-content">{firmName}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-content-muted font-medium">MahaRERA Registration:</span>
                    <span className="font-mono text-content">{reraNumber || 'None (General Real Estate)'}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-content-muted font-medium">Principal Administrator:</span>
                    <span className="font-bold text-content">{adminName}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-content-muted font-medium">Admin Email:</span>
                    <span className="font-mono text-content">{email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-content-muted font-medium">Subscription Tier:</span>
                    <span className="font-bold text-accent">14-Day Free Evaluation (Auto-Approved)</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-accent-soft/40 border border-accent/20 flex items-start gap-2.5 text-xs text-content-secondary">
                  <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    By clicking <strong>Provision Firm Workspace</strong>, your tenant is immediately initialized with full RBAC access, telemetry pipelines, and WhatsApp inbound routing.
                  </p>
                </div>

                <div className="pt-3 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setStep(2)}
                    className="py-3.5 px-4 text-xs font-semibold text-content-muted hover:text-content hover:bg-surface-subtle rounded-2xl border border-border transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleFinalSubmit}
                    className="flex-1 py-3.5 px-4 bg-accent hover:bg-accent-hover text-white font-extrabold rounded-2xl text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Provisioning Firm Workspace...</span>
                      </>
                    ) : (
                      <>
                        <span>Provision Firm Workspace</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-content-secondary z-10 space-y-1 font-medium">
        <div>Lucky CRM Real Estate OS • Multi-Tenant Architecture &amp; Tenant Guard Isolation</div>
        <div className="font-mono text-[11px] text-content-secondary">
          Statutory MahaRERA Data Security • Encrypted Password Verification
        </div>
      </footer>
    </div>
  );
}
