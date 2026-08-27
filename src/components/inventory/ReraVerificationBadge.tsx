'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Copy,
  Check,
  Building2,
  MapPin,
  AlertTriangle,
  Loader2,
  Search,
} from 'lucide-react';
import { validateReraNumber, ReraValidationResult, MAHARERA_PORTAL_SEARCH_URL } from '@/lib/domain/verification-engine';

interface ReraVerificationBadgeProps {
  reraNumber: string;
  projectId?: string;
  showDuplicateCheck?: boolean;
  showPortalLink?: boolean;
  showCopyButton?: boolean;
  compact?: boolean;
  className?: string;
  onValidationChange?: (result: ReraValidationResult & { duplicateInCrm?: boolean }) => void;
}

export function ReraVerificationBadge({
  reraNumber,
  projectId,
  showDuplicateCheck = true,
  showPortalLink = true,
  showCopyButton = true,
  compact = false,
  className = '',
  onValidationChange,
}: ReraVerificationBadgeProps) {
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [serverData, setServerData] = useState<{
    duplicateInCrm?: boolean;
    existingProject?: any;
  } | null>(null);

  // Client-side instant format validation
  const clientValidation = validateReraNumber(reraNumber || '');

  useEffect(() => {
    if (!reraNumber || !clientValidation.isValid || !showDuplicateCheck) {
      setServerData(null);
      if (onValidationChange) {
        onValidationChange({ ...clientValidation, duplicateInCrm: false });
      }
      return;
    }

    let isMounted = true;
    const debounceTimer = setTimeout(async () => {
      setChecking(true);
      try {
        const query = new URLSearchParams({
          reraNumber: clientValidation.normalized || reraNumber,
          ...(projectId ? { excludeProjectId: projectId } : {}),
        });
        const res = await fetch(`/api/v1/inventory/rera/verify?${query.toString()}`);
        const data = await res.json();
        if (isMounted && res.ok) {
          setServerData({
            duplicateInCrm: data.duplicateInCrm,
            existingProject: data.existingProject,
          });
          if (onValidationChange) {
            onValidationChange({ ...clientValidation, ...data });
          }
        }
      } catch (err) {
        console.error('RERA duplicate check error:', err);
      } finally {
        if (isMounted) setChecking(false);
      }
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
    };
  }, [reraNumber, projectId, showDuplicateCheck]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const textToCopy = clientValidation.normalized || reraNumber;
    if (!textToCopy) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy RERA number:', err);
    }
  };

  if (!reraNumber || reraNumber.trim() === '') {
    return (
      <div className={`text-xs text-content-muted flex items-center gap-1.5 ${className}`}>
        <span className="w-2 h-2 rounded-full bg-border" />
        <span>Enter official MahaRERA registration number (e.g. P52000028714)</span>
      </div>
    );
  }

  const portalSearchUrl = clientValidation.directSearchUrl || MAHARERA_PORTAL_SEARCH_URL;

  // COMPACT MODE: Inline badge
  if (compact) {
    if (!clientValidation.isValid) {
      return (
        <span
          title={clientValidation.error || 'Invalid RERA format'}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-status-danger-surface text-status-danger border border-status-danger/30 ${className}`}
        >
          <ShieldAlert className="w-3 h-3" />
          <span>Invalid RERA</span>
        </span>
      );
    }

    return (
      <span
        title={`${clientValidation.authority || 'MahaRERA'} • ${clientValidation.districtName || 'Verified'}`}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-status-success-surface text-status-success border border-status-success/30 ${className}`}
      >
        <ShieldCheck className="w-3.5 h-3.5 text-status-success" />
        <span>{clientValidation.normalized}</span>
        {clientValidation.districtCode && (
          <span className="text-[9px] opacity-75 hidden sm:inline">[{clientValidation.districtCode}]</span>
        )}
      </span>
    );
  }

  // FULL / EXPANDED MODE: Rich validation card
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Main Validation State */}
      <div
        className={`p-3 rounded-xl border transition-all duration-200 ${
          clientValidation.isValid
            ? serverData?.duplicateInCrm
              ? 'bg-status-warning-surface/60 border-status-warning/40 text-content'
              : 'bg-accent-soft border-accent/40 text-content'
            : 'bg-status-danger-surface border-status-danger/40 text-content'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 shrink-0">
              {clientValidation.isValid ? (
                <ShieldCheck className="w-5 h-5 text-accent" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-status-danger" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-content tracking-tight">
                  {clientValidation.normalized || reraNumber}
                </span>
                {clientValidation.isValid && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-accent/20 text-accent-text border border-accent/30 font-mono">
                    {clientValidation.formatType === 'MAHARERA_PROJECT'
                      ? 'MahaRERA Project'
                      : clientValidation.formatType === 'MAHARERA_AGENT'
                      ? 'MahaRERA Agent'
                      : 'State RERA'}
                  </span>
                )}
                {checking && (
                  <span className="flex items-center gap-1 text-[11px] text-content-muted font-mono">
                    <Loader2 className="w-3 h-3 animate-spin text-accent" /> Checking CRM...
                  </span>
                )}
              </div>

              {clientValidation.isValid ? (
                <div className="mt-1 text-xs text-content-secondary space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3 h-3 text-accent shrink-0" />
                    <span>{clientValidation.authority}</span>
                  </div>
                  {clientValidation.districtName && (
                    <div className="flex items-center gap-1.5 text-content-muted">
                      <MapPin className="w-3 h-3 text-status-success shrink-0" />
                      <span>District: {clientValidation.districtName}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-1 text-xs text-status-danger">
                  {clientValidation.error || 'Invalid RERA format. Expected P followed by 11 digits (e.g. P52000028714).'}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
            {showCopyButton && clientValidation.isValid && (
              <button
                type="button"
                onClick={handleCopy}
                title="Copy RERA registration number"
                className="px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-raised text-content text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-status-success" />
                    <span className="text-status-success text-[11px]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-content-muted" />
                    <span className="text-[11px]">Copy ID</span>
                  </>
                )}
              </button>
            )}

            {showPortalLink && (
              <a
                href={portalSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Verify registration certificate on official government portal"
                className="px-2.5 py-1.5 rounded-lg border border-accent/40 bg-accent text-white hover:bg-accent-hover text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="text-[11px]">Verify on MahaRERA</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* CRM Duplicate Warning */}
      {serverData?.duplicateInCrm && serverData.existingProject && (
        <div className="p-2.5 rounded-lg border border-status-warning/40 bg-status-warning-surface text-content text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-status-warning shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-status-warning">Duplicate Detected in CRM: </span>
            <span>
              This RERA ID is already registered under{' '}
              <strong className="text-content">{serverData.existingProject.projectName}</strong>
              {serverData.existingProject.microMarket ? ` (${serverData.existingProject.microMarket})` : ''}.
              Submitting will synchronize units with the existing project record.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
