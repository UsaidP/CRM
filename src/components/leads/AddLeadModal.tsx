'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  UserPlus,
  Phone,
  User,
  Mail,
  Building2,
  Tag,
  FileText,
  X,
  Check,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Clock,
  Compass,
  Zap,
  Flame,
  Snowflake,
  CheckCircle2,
  MessageSquare,
  ChevronRight,
  Hash,
  Home,
  Briefcase,
  Layers,
  MapPin,
  IndianRupee,
} from 'lucide-react';
import { toast } from '@/lib/client/toast';
import { formatLakhCr, formatIndianRupees } from '@/lib/money';
import { FeedbackAlert } from '@/components/ui/FeedbackAlert';
import { CustomSelect, type CustomSelectOption } from '@/components/ui/CustomSelect';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserId?: string;
  currentUserRole?: string;
  assignableUsers?: Array<{ id: string; fullName: string; role: string; email: string }>;
}

const SOURCE_OPTIONS: CustomSelectOption[] = [
  { value: 'direct_call', label: '📞 Direct Phone Call', shortLabel: 'Direct Call' },
  { value: 'whatsapp_group', label: '💬 WhatsApp Inbound / Direct', shortLabel: 'WhatsApp' },
  { value: 'instagram_reel', label: '📸 Instagram Reel / DM', shortLabel: 'Instagram' },
  { value: 'youtube_short', label: '▶️ YouTube Video / Short', shortLabel: 'YouTube' },
  { value: 'fb_group', label: '👥 Facebook / Community Group', shortLabel: 'Facebook' },
  { value: 'referral', label: '🤝 Client / Partner Referral', shortLabel: 'Referral' },
  { value: 'web_form', label: '🌐 Website Inquiry Form', shortLabel: 'Web Form' },
];

const STAGE_OPTIONS: CustomSelectOption[] = [
  { value: 'new_uncontacted', label: '🔴 New Inbound (Uncontacted)', shortLabel: 'New Lead' },
  { value: 'discovery_call', label: '🟡 Discovery & Qualifying', shortLabel: 'Discovery' },
  { value: 'portal_shared', label: '🔵 Property Deck / Portal Sent', shortLabel: 'Deck Sent' },
  { value: 'visit_scheduled', label: '📅 Site Visit Scheduled', shortLabel: 'Visit Fixed' },
];

const POPULAR_LOCATIONS = [
  'Kharghar (Sec 35)',
  'Kharghar (Sec 20)',
  'Taloja Phase 1',
  'Taloja Phase 2',
  'Ulwe Sector 19',
  'Panvel Prime',
  'Seawoods / Nerul',
  'Dronagiri',
];

const BHK_OPTIONS = [
  { value: 1, label: '1 BHK', subtitle: 'Compact / Starter' },
  { value: 2, label: '2 BHK', subtitle: 'Standard Family' },
  { value: 3, label: '3 BHK', subtitle: 'Spacious Luxury' },
  { value: 4, label: '4+ BHK', subtitle: 'Ultra Luxury' },
];

const BUDGET_PRESETS = [
  { label: '₹35L – ₹50L', min: 3500000, max: 5000000, tag: 'Affordable 1 BHK' },
  { label: '₹50L – ₹75L', min: 5000000, max: 7500000, tag: 'Standard 2 BHK' },
  { label: '₹75L – ₹1.0 Cr', min: 7500000, max: 10000000, tag: 'Prime 2 BHK' },
  { label: '₹1.0 – ₹1.5 Cr', min: 10000000, max: 15000000, tag: 'Spacious 2/3 BHK' },
  { label: '₹1.5 – ₹2.5 Cr', min: 15000000, max: 25000000, tag: 'Premium 3/4 BHK' },
  { label: '₹2.5 Cr+', min: 25000000, max: 50000000, tag: 'High-End Luxury' },
];

const POSSESSION_PRESETS = [
  { id: 'READY_TO_MOVE', label: '⚡ Ready to Move', desc: 'OC Received' },
  { id: 'WITHIN_6_MONTHS', label: '⏳ < 6 Months', desc: 'Near Handover' },
  { id: 'UNDER_CONSTRUCTION', label: '🏗️ Under Construction', desc: '1–2 Years' },
  { id: 'ANY', label: '🌐 Any Timeline', desc: 'Flexible / Open' },
];

const DISCOVERY_TAGS = [
  '✨ Loan Pre-Approved',
  '🚇 Near Metro Station',
  '🌅 Balcony Required',
  '🌿 High Floor Preferred',
  '⚡ Urgent Site Visit',
  '🚗 Covered Car Parking',
  '🧭 Vastu Compliant',
  '👨‍👩‍👧 Family Decision Maker',
  '💼 NRI / Investor',
];

export function AddLeadModal({
  isOpen,
  onClose,
  onSuccess,
  currentUserId,
  currentUserRole,
  assignableUsers = [],
}: AddLeadModalProps) {
  // Core contact states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isWhatsappSame, setIsWhatsappSame] = useState(true);
  const [email, setEmail] = useState('');
  const [leadSource, setLeadSource] = useState('direct_call');

  // Stage & Team
  const [currentStage, setCurrentStage] = useState('new_uncontacted');
  const [leadPriority, setLeadPriority] = useState<'HOT' | 'WARM' | 'COLD'>('WARM');
  const [assignedBrokerId, setAssignedBrokerId] = useState<string>(currentUserId || '');

  // Property Preferences
  const [selectedBhk, setSelectedBhk] = useState<number[]>([2]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(['Kharghar (Sec 35)']);
  const [budgetMin, setBudgetMin] = useState<number>(5000000);
  const [budgetMax, setBudgetMax] = useState<number>(7500000);
  const [possession, setPossession] = useState<string>('READY_TO_MOVE');
  const [purpose, setPurpose] = useState<'self_use' | 'investment'>('self_use');

  // Discovery notes & tags
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // UI status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTelecallerOrAgent = currentUserRole === 'TELECALLER' || currentUserRole === 'AGENT';

  // Clean raw digits for live counter and validation
  const rawDigits = useMemo(() => phone.replace(/\D/g, ''), [phone]);
  const isPhoneValid = rawDigits.length === 10;

  // Keyboard shortcut listener (Esc to close, Cmd+Enter to submit)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        const fakeFormEvent = { preventDefault: () => {} } as React.FormEvent;
        handleSubmit(fakeFormEvent);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, fullName, phone, email, leadSource, currentStage, budgetMin, budgetMax, selectedBhk, selectedLocations, notes, selectedTags, leadPriority, possession, purpose, assignedBrokerId]);

  if (!isOpen) return null;

  const userSelectOptions: CustomSelectOption[] = [
    { value: currentUserId || '', label: 'Assign to Myself (My Account)', shortLabel: 'Myself' },
    ...assignableUsers
      .filter((u) => u.id !== currentUserId)
      .map((u) => ({
        value: u.id,
        label: `${u.fullName} (${u.role})`,
        shortLabel: u.fullName,
        badge: u.role,
      })),
  ];

  const handleToggleBhk = (bhk: number) => {
    if (selectedBhk.includes(bhk)) {
      if (selectedBhk.length > 1) {
        setSelectedBhk(selectedBhk.filter((b) => b !== bhk));
      }
    } else {
      setSelectedBhk([...selectedBhk, bhk].sort());
    }
  };

  const handleToggleLocation = (loc: string) => {
    if (selectedLocations.includes(loc)) {
      if (selectedLocations.length > 1) {
        setSelectedLocations(selectedLocations.filter((l) => l !== loc));
      }
    } else {
      setSelectedLocations([...selectedLocations, loc]);
    }
  };

  const handleSelectBudgetPreset = (preset: typeof BUDGET_PRESETS[number]) => {
    setBudgetMin(preset.min);
    setBudgetMax(preset.max);
  };

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const cleanPhoneDigits = phone.trim().replace(/\D/g, '');
    if (cleanPhoneDigits.length < 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Structure any tags, priority, or possession notes neatly
      const tagPrefix = selectedTags.length > 0 ? `[Tags: ${selectedTags.join(', ')}] ` : '';
      const priorityPrefix = `[Priority: ${leadPriority}] `;
      const whatsappNote = isWhatsappSame ? '[WhatsApp: Verified] ' : '';
      const consolidatedNotes = `${priorityPrefix}${whatsappNote}${tagPrefix}${notes.trim()}`.trim();

      const payload: any = {
        fullName: fullName.trim() || 'Direct Buyer Lead',
        phone: cleanPhoneDigits.startsWith('91') && cleanPhoneDigits.length === 12
          ? `+${cleanPhoneDigits}`
          : `+91${cleanPhoneDigits.slice(-10)}`,
        email: email.trim() || undefined,
        leadSource,
        currentStage,
        notes: consolidatedNotes || undefined,
        assignedBrokerId: isTelecallerOrAgent ? currentUserId : assignedBrokerId || currentUserId,
        budgetMin: budgetMin || null,
        budgetMax: budgetMax || 7500000,
        bhkPreferences: selectedBhk,
        targetLocations: selectedLocations,
        possessionPreference: possession,
        purpose,
        loanPreApproved: selectedTags.includes('✨ Loan Pre-Approved'),
      };

      const res = await fetch('/api/v1/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create lead record.');
      }

      toast.success('Lead Created Successfully', {
        description: `${data.data?.fullName || 'Lead'} added to your pipeline with full RBAC isolation.`,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error creating lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92dvh] flex flex-col bg-surface border border-border/90 rounded-2xl shadow-2xl text-content overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-3.5 border-b border-border bg-surface-subtle/80 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-accent to-blue-700 text-white rounded-xl shadow-xs shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-content">
                  New Buyer Lead
                </h3>
                {isTelecallerOrAgent ? (
                  <span className="text-[10px] tracking-wide font-mono px-2 py-0.5 rounded-full bg-status-success-surface text-status-success border border-status-success/30 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
                    Auto-Assigned to You
                  </span>
                ) : (
                  <span className="text-[10px] tracking-wide font-mono px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/20 font-semibold">
                    Admin Creation
                  </span>
                )}
              </div>
              <p className="text-xs text-content-muted">
                Capture buyer identity, budget, and micro-market preferences
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-[11px] font-mono text-content-subtle bg-surface px-2 py-0.5 rounded-md border border-border">
              Esc to close
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-content-muted hover:text-content hover:bg-surface transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {error && (
            <FeedbackAlert
              variant="error"
              error={error}
              onDismiss={() => setError(null)}
            />
          )}

          {/* Section 1: Contact Identity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-content uppercase tracking-wider font-mono flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-accent" />
                Buyer Contact Details
              </span>
              <span className="text-[11px] text-content-muted">
                * Required fields
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Buyer Full Name */}
              <div>
                <label className="block text-xs font-semibold text-content mb-1">
                  Buyer Full Name <span className="text-accent">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-medium text-content placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  />
                </div>
              </div>

              {/* Phone Number with +91 Prefix */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-content">
                    Phone Number <span className="text-accent">*</span>
                  </label>
                  {rawDigits.length > 0 && (
                    <span className={`text-[10px] font-mono font-medium ${isPhoneValid ? 'text-status-success font-bold flex items-center gap-0.5' : 'text-content-muted'}`}>
                      {isPhoneValid ? (
                        <>
                          <Check className="w-3 h-3 text-status-success" /> Valid 10-Digit
                        </>
                      ) : (
                        `(${rawDigits.length}/10 digits)`
                      )}
                    </span>
                  )}
                </div>
                <div className="relative flex rounded-xl border border-border focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all bg-surface-subtle overflow-hidden">
                  <div className="flex items-center gap-1 px-2.5 bg-surface border-r border-border text-xs font-mono font-semibold text-content shrink-0 select-none">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="98200 12345"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-transparent text-xs font-mono font-medium text-content placeholder:text-content-muted focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Email & WhatsApp toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div>
                <label className="block text-xs font-semibold text-content mb-1">
                  Email Address <span className="text-content-muted font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
                  <input
                    type="email"
                    placeholder="e.g. rahul@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-medium text-content placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  />
                </div>
              </div>

              {/* Inbound Channel & WhatsApp active toggle */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-content">
                  Lead Inbound Channel
                </label>
                <CustomSelect
                  options={SOURCE_OPTIONS}
                  value={leadSource}
                  onChange={setLeadSource}
                  className="w-full"
                />
              </div>
            </div>

            {/* Quick WhatsApp check chip */}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setIsWhatsappSame(!isWhatsappSame)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  isWhatsappSame
                    ? 'bg-status-success-surface text-status-success border-status-success/40'
                    : 'bg-surface border-border text-content-muted hover:text-content'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{isWhatsappSame ? '✓ Phone number is active on WhatsApp' : 'Phone differs from WhatsApp'}</span>
              </button>
            </div>
          </div>

          {/* Section 2: Property Preferences & Budget */}
          <div className="p-4 rounded-2xl bg-surface-subtle/80 border border-border space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-content uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-accent" />
                Property Specifications & Budget
              </span>
              <div className="text-xs font-mono font-bold text-accent bg-surface px-2.5 py-0.5 rounded-md border border-border">
                {formatLakhCr(budgetMin)} – {formatLakhCr(budgetMax)}
              </div>
            </div>

            {/* BHK Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-content flex items-center gap-1">
                  BHK Preferences <span className="text-content-muted text-[11px]">(Multi-Select)</span>
                </label>
                <span className="text-[11px] font-mono text-content-muted">
                  Selected: {selectedBhk.map((b) => `${b} BHK`).join(', ')}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {BHK_OPTIONS.map((opt) => {
                  const isSelected = selectedBhk.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleToggleBhk(opt.value)}
                      className={`p-2.5 text-left rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-accent text-white border-accent shadow-xs'
                          : 'bg-surface border-border text-content hover:border-accent/40'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold">{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-content-muted'}`}>
                        {opt.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Budget Presets & Custom Range */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-content">
                  Budget Presets (Navi Mumbai Sizing)
                </label>
                <span className="text-[10px] text-content-muted">
                  Click preset to auto-set range
                </span>
              </div>

              {/* Quick Budget Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {BUDGET_PRESETS.map((p) => {
                  const isMatch = budgetMin === p.min && budgetMax === p.max;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleSelectBudgetPreset(p)}
                      className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg border transition-all cursor-pointer ${
                        isMatch
                          ? 'bg-primary text-white border-primary shadow-xs font-bold'
                          : 'bg-surface border-border text-content hover:bg-surface-subtle'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* Min - Max Dual Inputs */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] text-content-muted mb-1 font-medium">
                    Min Budget (₹)
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
                    <input
                      type="number"
                      step={500000}
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(Number(e.target.value))}
                      className="w-full pl-8 pr-2 py-1.5 bg-surface border border-border rounded-xl text-xs font-mono font-medium text-content focus:outline-none focus:border-accent"
                    />
                  </div>
                  <span className="text-[10px] text-content-muted mt-0.5 block font-mono">
                    {formatLakhCr(budgetMin)}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] text-content-muted mb-1 font-medium">
                    Max Budget (₹)
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
                    <input
                      type="number"
                      step={500000}
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(Number(e.target.value))}
                      className="w-full pl-8 pr-2 py-1.5 bg-surface border border-border rounded-xl text-xs font-mono font-medium text-content focus:outline-none focus:border-accent"
                    />
                  </div>
                  <span className="text-[10px] text-content-muted mt-0.5 block font-mono">
                    {formatLakhCr(budgetMax)}
                  </span>
                </div>
              </div>
            </div>

            {/* Target Micro-Markets */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-content flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-accent" />
                  Target Micro-Markets
                </label>
                <span className="text-[11px] text-content-muted">
                  {selectedLocations.length} selected
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {POPULAR_LOCATIONS.map((loc) => {
                  const isSelected = selectedLocations.includes(loc);
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => handleToggleLocation(loc)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-accent-soft text-accent border-accent/40 font-semibold'
                          : 'bg-surface border-border text-content-muted hover:text-content hover:bg-surface-subtle'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}{loc}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Possession Timeline & Purpose */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/60">
              <div>
                <label className="block text-[11px] font-medium text-content mb-1">
                  Possession Timeline
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {POSSESSION_PRESETS.map((pos) => {
                    const isSelected = possession === pos.id;
                    return (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => setPossession(pos.id)}
                        className={`px-2 py-1.5 text-left rounded-lg border text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-surface border-accent text-accent font-bold shadow-2xs'
                            : 'bg-surface border-border text-content-muted hover:text-content'
                        }`}
                      >
                        <span className="block text-[11px] truncate">{pos.label}</span>
                        <span className="block text-[9px] text-content-muted truncate">{pos.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-content mb-1">
                  Purchase Purpose
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPurpose('self_use')}
                    className={`px-2 py-2 text-center rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      purpose === 'self_use'
                        ? 'bg-surface border-accent text-accent font-bold shadow-2xs'
                        : 'bg-surface border-border text-content-muted hover:text-content'
                    }`}
                  >
                    👨‍👩‍👧 Family Self-Use
                  </button>
                  <button
                    type="button"
                    onClick={() => setPurpose('investment')}
                    className={`px-2 py-2 text-center rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      purpose === 'investment'
                        ? 'bg-surface border-accent text-accent font-bold shadow-2xs'
                        : 'bg-surface border-border text-content-muted hover:text-content'
                    }`}
                  >
                    📈 Investment / Rental
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Urgency, Stage & Ownership */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Lead Temperature / Urgency */}
            <div>
              <label className="block text-xs font-semibold text-content mb-1">
                Lead Priority
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-surface-subtle border border-border rounded-xl">
                <button
                  type="button"
                  onClick={() => setLeadPriority('HOT')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    leadPriority === 'HOT'
                      ? 'bg-red-500 text-white shadow-2xs'
                      : 'text-content-muted hover:text-content'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Hot</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLeadPriority('WARM')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    leadPriority === 'WARM'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-content-muted hover:text-content'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Warm</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLeadPriority('COLD')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    leadPriority === 'COLD'
                      ? 'bg-blue-500 text-white shadow-2xs'
                      : 'text-content-muted hover:text-content'
                  }`}
                >
                  <Snowflake className="w-3.5 h-3.5" />
                  <span>Cold</span>
                </button>
              </div>
            </div>

            {/* Pipeline Stage */}
            <div>
              <label className="block text-xs font-semibold text-content mb-1">
                Initial Pipeline Stage
              </label>
              <CustomSelect
                options={STAGE_OPTIONS}
                value={currentStage}
                onChange={setCurrentStage}
                className="w-full"
              />
            </div>

            {/* Assigned Advisor / Rep */}
            <div>
              <label className="block text-xs font-semibold text-content mb-1">
                Assigned Advisor / Rep
              </label>
              {isTelecallerOrAgent ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-medium text-content h-[38px]">
                  <ShieldCheck className="w-4 h-4 text-status-success shrink-0" />
                  <span className="truncate font-semibold">Your Desk ({currentUserRole})</span>
                </div>
              ) : (
                <CustomSelect
                  options={userSelectOptions}
                  value={assignedBrokerId}
                  onChange={setAssignedBrokerId}
                  className="w-full"
                />
              )}
            </div>
          </div>

          {/* Section 4: Discovery Tags & Notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-content flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-accent" />
                Discovery Remarks & 1-Click Observation Tags
              </label>
              <span className="text-[11px] text-content-muted">
                Click chips to tag notes
              </span>
            </div>

            {/* Quick Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {DISCOVERY_TAGS.map((tag) => {
                const isChecked = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                      isChecked
                        ? 'bg-accent text-white border-accent shadow-xs'
                        : 'bg-surface border-border text-content-muted hover:text-content hover:bg-surface-subtle'
                    }`}
                  >
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>

            {/* Textarea */}
            <textarea
              rows={2}
              placeholder="e.g. Inquired for 2 BHK in Kharghar near metro station. Family currently renting in Belapur, looking to buy with HDFC loan sanction."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-medium text-content placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-5 sm:px-6 py-3 border-t border-border bg-surface-subtle/80 flex items-center justify-between sticky bottom-0 z-10 backdrop-blur-md">
          <div className="hidden sm:flex items-center gap-1.5 text-content-muted text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-status-success" />
            <span>Encrypted Lead Record • Dedicated Pipeline Isolation</span>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-surface hover:bg-surface-subtle border border-border text-content text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating Lead…' : 'Create & Save Lead'}</span>
              <span className="hidden sm:inline-block ml-1 text-[10px] font-mono bg-white/20 px-1.5 py-0.5 rounded text-white">
                ⌘ ↵
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
