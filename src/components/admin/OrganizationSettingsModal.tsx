'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  ShieldCheck,
  X,
  Save,
  Loader2,
  MapPin,
  FileCheck,
} from 'lucide-react';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { toast } from '@/lib/client/toast';
import { FeedbackAlert } from '@/components/ui/FeedbackAlert';
import { YoutubeIcon, InstagramIcon } from '@/components/icons/SocialIcons';

interface OrganizationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOrganization?: {
    id?: string;
    name?: string;
    slug?: string;
    reraBrokerRegistration?: string | null;
    youtubeUrl?: string | null;
    instagramUrl?: string | null;
  } | null;
  onOrganizationUpdated?: (updated: {
    id: string;
    name: string;
    slug: string;
    reraBrokerRegistration: string | null;
    youtubeUrl: string | null;
    instagramUrl: string | null;
  }) => void;
}

export function OrganizationSettingsModal({
  isOpen,
  onClose,
  currentOrganization,
  onOrganizationUpdated,
}: OrganizationSettingsModalProps) {
  const [firmName, setFirmName] = useState(currentOrganization?.name || '');
  const [reraNumber, setReraNumber] = useState(currentOrganization?.reraBrokerRegistration || '');
  const [youtubeUrl, setYoutubeUrl] = useState(currentOrganization?.youtubeUrl || '');
  const [instagramUrl, setInstagramUrl] = useState(currentOrganization?.instagramUrl || '');
  const [stateName, setStateName] = useState('Maharashtra');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (currentOrganization) {
      setFirmName(currentOrganization.name || '');
      setReraNumber(currentOrganization.reraBrokerRegistration || '');
      setYoutubeUrl(currentOrganization.youtubeUrl || '');
      setInstagramUrl(currentOrganization.instagramUrl || '');
    }
  }, [currentOrganization, isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firmName.trim() || firmName.trim().length < 2) {
      setErrorMsg('Firm name must be at least 2 characters.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: firmName.trim(),
          reraBrokerRegistration: reraNumber.trim() || null,
          youtubeUrl: youtubeUrl.trim() || null,
          instagramUrl: instagramUrl.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update organization details');
      }

      toast.success('Organization profile updated successfully');
      if (onOrganizationUpdated) {
        onOrganizationUpdated(data.organization);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error updating organization');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AccessibleDialog
      open={isOpen}
      onClose={onClose}
      titleId="org-settings-dialog-title"
      descriptionId="org-settings-dialog-desc"
      size="md"
    >
      <div className="flex flex-col bg-surface text-content rounded-2xl overflow-hidden shadow-2xl border border-border">
        {/* Header */}
        <div className="p-5 border-b border-border bg-surface-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0 border border-accent/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="org-settings-dialog-title" className="text-base font-bold font-display text-content">
                Firm Identity &amp; Branding
              </h2>
              <p id="org-settings-dialog-desc" className="text-xs text-content-muted">
                Customize your firm name and MahaRERA certificate displayed across the CRM.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-content-muted hover:text-content hover:bg-surface border border-transparent hover:border-border cursor-pointer transition-colors"
            aria-label="Close organization settings dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {errorMsg && (
            <FeedbackAlert
              variant="error"
              error={errorMsg}
              onDismiss={() => setErrorMsg(null)}
            />
          )}

          {/* Firm Name */}
          <div className="space-y-1.5">
            <label htmlFor="modal-firm-name" className="text-xs font-bold text-content flex items-center justify-between">
              <span>Firm / Organization Name</span>
              <span className="text-[10px] text-content-muted font-mono font-normal">e.g. ZamZam Properties</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
              <input
                id="modal-firm-name"
                type="text"
                required
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder="Enter firm name (e.g. ZamZam Properties)"
                className="w-full pl-10 pr-4 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-content focus:outline-none focus:border-accent font-medium transition-colors"
              />
            </div>
            <p className="text-[11px] text-content-muted leading-relaxed">
              This name appears in the top navigation, WhatsApp/call dispatch headers, and client presentation portals.
            </p>
          </div>

          {/* MahaRERA Broker Registration */}
          <div className="space-y-1.5">
            <label htmlFor="modal-firm-rera" className="text-xs font-bold text-content flex items-center justify-between">
              <span>MahaRERA Broker Registration Number</span>
              <span className="text-[10px] text-status-success font-mono font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Verified Badge
              </span>
            </label>
            <div className="relative">
              <FileCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
              <input
                id="modal-firm-rera"
                type="text"
                value={reraNumber}
                onChange={(e) => setReraNumber(e.target.value)}
                placeholder="e.g. MahaRERA A52000028714"
                className="w-full pl-10 pr-4 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-content focus:outline-none focus:border-accent font-mono transition-colors"
              />
            </div>
            <p className="text-[11px] text-content-muted">
              Displayed on client portals, PDF brochures, and cost calculator estimates.
            </p>
          </div>

          {/* Social Media Links */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-content">Social Media Links <span className="text-[10px] text-content-muted font-normal ml-1">(shown on client portals)</span></p>
            <div className="space-y-1.5">
              <label htmlFor="modal-firm-youtube" className="text-[11px] font-semibold text-content-muted flex items-center gap-1.5">
                <YoutubeIcon className="w-3.5 h-3.5 text-red-500" />
                YouTube Channel URL
              </label>
              <input
                id="modal-firm-youtube"
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/@yourfirm"
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-content focus:outline-none focus:border-accent font-mono transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="modal-firm-instagram" className="text-[11px] font-semibold text-content-muted flex items-center gap-1.5">
                <InstagramIcon className="w-3.5 h-3.5 text-pink-500" />
                Instagram Profile URL
              </label>
              <input
                id="modal-firm-instagram"
                type="url"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://www.instagram.com/yourfirm"
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-content focus:outline-none focus:border-accent font-mono transition-colors"
              />
            </div>
          </div>

          {/* Region / Jurisdiction */}
          <div className="space-y-1.5">
            <label htmlFor="modal-firm-state" className="text-xs font-bold text-content flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-content-muted" />
              <span>Primary Operating Jurisdiction</span>
            </label>
            <input
              id="modal-firm-state"
              type="text"
              disabled
              value={stateName}
              className="w-full px-3.5 py-2.5 bg-surface-subtle/50 border border-border/70 rounded-xl text-xs text-content-muted font-medium cursor-not-allowed"
            />
            <p className="text-[10px] text-content-muted font-mono">
              Statutory stamp duty &amp; registration rules are calibrated to Maharashtra RERA.
            </p>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-content-muted hover:text-content hover:bg-surface-subtle rounded-xl border border-border cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-accent hover:bg-accent-hover rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Update Firm Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AccessibleDialog>
  );
}
