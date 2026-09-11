'use client';

import React, { useState } from 'react';
import {
  UserPlus,
  Phone,
  User,
  Mail,
  Building2,
  DollarSign,
  Tag,
  FileText,
  X,
  Check,
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { toast } from '@/lib/client/toast';
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
  { value: 'direct_call', label: 'Direct Phone Call', shortLabel: 'Direct Call' },
  { value: 'whatsapp_group', label: 'WhatsApp Direct / Inbound', shortLabel: 'WhatsApp' },
  { value: 'instagram_reel', label: 'Instagram Reel / DM', shortLabel: 'Instagram' },
  { value: 'youtube_short', label: 'YouTube Short / Video', shortLabel: 'YouTube' },
  { value: 'fb_group', label: 'Facebook Community / Ad', shortLabel: 'Facebook' },
  { value: 'referral', label: 'Client / Channel Partner Referral', shortLabel: 'Referral' },
  { value: 'web_form', label: 'Website Inquiry Form', shortLabel: 'Web Form' },
];

const STAGE_OPTIONS: CustomSelectOption[] = [
  { value: 'new_uncontacted', label: '🔴 New Inbound (Uncontacted)', shortLabel: 'New Lead' },
  { value: 'discovery_call', label: '🟡 Discovery & Qualifying', shortLabel: 'Discovery' },
  { value: 'portal_shared', label: '🔵 Property Shortlist / Deck Sent', shortLabel: 'Deck Sent' },
  { value: 'visit_scheduled', label: '📅 Site Visit Scheduled', shortLabel: 'Visit Fixed' },
];

const LOCATION_OPTIONS = [
  'Kharghar Sector 35',
  'Kharghar Sector 20',
  'Taloja Phase 1',
  'Taloja Phase 2',
  'Ulwe Sector 19',
  'Panvel Prime',
  'Dronagiri',
];

const BHK_OPTIONS = [1, 2, 3, 4];

export function AddLeadModal({
  isOpen,
  onClose,
  onSuccess,
  currentUserId,
  currentUserRole,
  assignableUsers = [],
}: AddLeadModalProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [leadSource, setLeadSource] = useState('direct_call');
  const [currentStage, setCurrentStage] = useState('new_uncontacted');
  const [selectedBhk, setSelectedBhk] = useState<number[]>([2]);
  const [targetLocation, setTargetLocation] = useState('Kharghar Sector 35');
  const [budgetMax, setBudgetMax] = useState('7500000');
  const [assignedBrokerId, setAssignedBrokerId] = useState<string>(currentUserId || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isTelecallerOrAgent = currentUserRole === 'TELECALLER' || currentUserRole === 'AGENT';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: any = {
        fullName: fullName.trim() || 'Direct Buyer Lead',
        phone: phone.trim(),
        email: email.trim() || undefined,
        leadSource,
        currentStage,
        notes: notes.trim() || undefined,
        assignedBrokerId: isTelecallerOrAgent ? currentUserId : assignedBrokerId || currentUserId,
        budgetMax: budgetMax ? Number(budgetMax) : 7500000,
        bhkPreferences: selectedBhk,
        targetLocations: [targetLocation],
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
        description: `${data.data?.fullName || 'Lead'} added to your pipeline.`,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92dvh] overflow-y-auto bg-surface border border-border rounded-2xl shadow-2xl text-content">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-border bg-surface-subtle flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-accent-soft border border-accent/20 rounded-xl text-accent">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold tracking-tight text-content flex items-center gap-2">
                New Buyer Lead
                {isTelecallerOrAgent && (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-status-success-surface text-status-success border border-status-success/30 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Auto-Assigned to You
                  </span>
                )}
              </h3>
              <p className="text-xs text-content-muted">
                Add a new prospective buyer to your dedicated pipeline
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-content-muted hover:text-content hover:bg-surface transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <FeedbackAlert
              variant="error"
              error={error}
              onDismiss={() => setError(null)}
            />
          )}

          {/* Row 1: Full Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-content mb-1">
                Buyer Full Name <span className="text-accent">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-medium text-content placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-content mb-1">
                Phone Number <span className="text-accent">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98200 12345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-mono font-medium text-content placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Email & Lead Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-content mb-1">
                Email Address <span className="text-content-muted font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
                <input
                  type="email"
                  placeholder="e.g. rahul@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-medium text-content placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-content mb-1">
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

          {/* Row 3: Pipeline Stage & Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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

            <div>
              <label className="block text-xs font-semibold text-content mb-1">
                Assigned Advisor / Rep
              </label>
              {isTelecallerOrAgent ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-medium text-content">
                  <ShieldCheck className="w-4 h-4 text-status-success shrink-0" />
                  <span className="truncate">Your Account ({currentUserRole})</span>
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

          {/* Row 4: Preferences & Budget */}
          <div className="p-3.5 rounded-xl bg-surface-subtle border border-border space-y-3">
            <span className="text-[11px] font-bold text-content uppercase tracking-wider font-mono block">
              Property Preferences
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* BHK Selection */}
              <div>
                <label className="block text-[11px] text-content-muted mb-1.5 font-medium">
                  BHK Preferences
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {BHK_OPTIONS.map((bhk) => {
                    const isSelected = selectedBhk.includes(bhk);
                    return (
                      <button
                        key={bhk}
                        type="button"
                        onClick={() => handleToggleBhk(bhk)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-accent text-white border-accent shadow-2xs'
                            : 'bg-surface border-border text-content hover:bg-surface-subtle'
                        }`}
                      >
                        {bhk} BHK
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Micro-Market */}
              <div>
                <label className="block text-[11px] text-content-muted mb-1.5 font-medium">
                  Target Micro-Market
                </label>
                <select
                  value={targetLocation}
                  onChange={(e) => setTargetLocation(e.target.value)}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-xl text-xs font-medium text-content focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                >
                  {LOCATION_OPTIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Budget Max */}
            <div>
              <label className="block text-[11px] text-content-muted mb-1 font-medium">
                Approximate Budget Ceiling
              </label>
              <select
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded-xl text-xs font-medium text-content focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              >
                <option value="4500000">₹45 Lakhs (Affordable 1 BHK)</option>
                <option value="6000000">₹60 Lakhs (Mid-Segment 1/2 BHK)</option>
                <option value="7500000">₹75 Lakhs (Spacious 2 BHK)</option>
                <option value="9500000">₹95 Lakhs (Premium 2 BHK)</option>
                <option value="12500000">₹1.25 Cr (Luxury 2/3 BHK)</option>
                <option value="20000000">₹2.00 Cr+ (High-End 3/4 BHK)</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-content mb-1">
              Lead Notes & Discovery Remarks
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Looking for ready-to-move 2 BHK near metro station with balcony, loan already pre-approved with HDFC."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-medium text-content placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-surface hover:bg-surface-subtle border border-border text-content text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Adding Lead…' : 'Create & Save Lead'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
