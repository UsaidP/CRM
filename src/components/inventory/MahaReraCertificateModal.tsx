'use client';

import React from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { MahaReraFormCCertificate, type FormCProjectData } from '@/components/inventory/MahaReraFormCCertificate';

interface MahaReraCertificateModalProps {
  open: boolean;
  onClose: () => void;
  projectData: FormCProjectData | null;
}

export function MahaReraCertificateModal({
  open,
  onClose,
  projectData,
}: MahaReraCertificateModalProps) {
  if (!open || !projectData) return null;

  return (
    <AccessibleDialog
      open={open}
      onClose={onClose}
      titleId="maharera-cert-modal-title"
      size="xl"
      panelClassName="p-0 overflow-hidden bg-surface-raised border border-border"
    >
      {/* Modal Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-status-success-surface text-status-success border border-status-success/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-content font-display">
              MahaRERA Statutory Registration Certificate
            </h3>
            <p className="text-xs text-content-muted">
              Official Form &lsquo;C&rsquo; [See rule 6(a)] • {projectData.reraNumber || 'Pending Registration'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close Certificate Modal"
          className="p-2 rounded-xl text-content-muted hover:text-content hover:bg-surface-subtle transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Modal Body */}
      <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto bg-surface-inset">
        <MahaReraFormCCertificate data={projectData} showActions={true} />
      </div>
    </AccessibleDialog>
  );
}
