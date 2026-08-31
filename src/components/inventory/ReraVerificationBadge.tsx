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
        className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 shadow-xs ${
          clientValidation.isValid
            ? serverData?.duplicateInCrm
              ? 'bg-status-warning-surface/60 border-status-warning/40 text-content'
              : 'bg-accent-soft/70 border-accent/40 text-content'
            : 'bg-status-danger-surface border-status-danger/40 text-content'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left Info Column */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="mt-0.5 shrink-0">
              {clientValidation.isValid ? (
                <div className="w-8 h-8 rounded-xl bg-accent/20 border border-accent/30 text-accent flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-status-danger/20 border border-status-danger/30 text-status-danger flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm sm:text-base font-bold text-content tracking-tight select-all">
                  {clientValidation.normalized || reraNumber}
                </span>
                {clientValidation.isValid && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-accent/20 text-accent-text border border-accent/30 font-mono whitespace-nowrap">
                    {clientValidation.formatType === 'MAHARERA_PROJECT'
                      ? 'MahaRERA Project'
                      : clientValidation.formatType === 'MAHARERA_AGENT'
                      ? 'MahaRERA Agent'
                      : 'State RERA'}
                  </span>
                )}
                {checking && (
                  <span className="flex items-center gap-1 text-[11px] text-content-secondary font-mono">
                    <Loader2 className="w-3 h-3 animate-spin text-accent" /> Checking CRM...
                  </span>
                )}
              </div>

              {clientValidation.isValid ? (
                <div className="mt-1.5 text-xs text-content-secondary space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-content">
                    <Building2 className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span className="truncate">{clientValidation.authority}</span>
                  </div>
                  {clientValidation.districtName && (
                    <div className="flex items-center gap-1.5 text-content-secondary">
                      <MapPin className="w-3.5 h-3.5 text-status-success shrink-0" />
                      <span>
                        District: <strong className="text-content font-semibold">{clientValidation.districtName}</strong>
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-1 text-xs font-medium text-status-danger">
                  {clientValidation.error || 'Invalid RERA format. Expected P followed by 11 digits (e.g. P52000028714).'}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-start md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-border/40 md:border-transparent w-full md:w-auto justify-end">
            {showCopyButton && clientValidation.isValid && (
              <button
                type="button"
                onClick={handleCopy}
                title="Copy RERA registration number"
                className="px-3 py-2 rounded-xl border border-border bg-surface hover:bg-surface-raised text-content text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs min-h-[36px]"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-status-success" />
                    <span className="text-status-success text-xs font-bold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-content-secondary" />
                    <span className="text-xs font-bold">Copy ID</span>
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
                className="px-3.5 py-2 rounded-xl border border-accent/40 bg-accent text-white hover:bg-accent-hover text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer whitespace-nowrap min-h-[36px]"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Verify on MahaRERA</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* CRM Duplicate Warning */}
      {serverData?.duplicateInCrm && serverData.existingProject && (
        <div className="p-3 rounded-xl border border-status-warning/40 bg-status-warning-surface text-content text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-status-warning shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-status-warning">Duplicate Detected in CRM: </span>
            <span>
              This RERA ID is already registered under{' '}
              <strong className="text-content font-bold">{serverData.existingProject.projectName}</strong>
              {serverData.existingProject.microMarket ? ` (${serverData.existingProject.microMarket})` : ''}.
              Submitting will synchronize units with the existing project record.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
