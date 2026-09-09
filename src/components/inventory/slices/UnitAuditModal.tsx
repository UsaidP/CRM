'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { FeedbackAlert } from '@/components/ui/FeedbackAlert';
import { CustomSelect } from '@/components/ui/CustomSelect';

export interface UnitAuditModalProps {
  unit: any | null;
  isOpen: boolean;
  onClose: () => void;
  targetStatus: string;
  onTargetStatusChange: (val: string) => void;
  auditNotes: string;
  onAuditNotesChange: (val: string) => void;
  submitting: boolean;
  actionError: string | null;
  auditSuccessMsg: string;
  onSubmit: (e: React.FormEvent) => void;
  onDismissError: () => void;
}

export function UnitAuditModal({
  unit,
  isOpen,
  onClose,
  targetStatus,
  onTargetStatusChange,
  auditNotes,
  onAuditNotesChange,
  submitting,
  actionError,
  auditSuccessMsg,
  onSubmit,
  onDismissError,
}: UnitAuditModalProps) {
  return (
    <AccessibleDialog
      open={isOpen && Boolean(unit)}
      onClose={onClose}
      titleId="verify-unit-title"
      descriptionId="verify-unit-description"
      size="md"
    >
      {unit && (
        <>
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2
                id="verify-unit-title"
                className="font-bold text-content text-base font-display flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-accent" />
                Inventory Update Record
              </h2>
              <p id="verify-unit-description" className="mt-1 text-xs text-content-muted">
                Record the source and status used for the freshness date.
              </p>
            </div>
            <button
              type="button"
              data-dialog-close
              aria-label="Close inventory update"
              onClick={onClose}
              className="p-1 rounded-lg text-content-muted hover:text-content hover:bg-surface-subtle transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          {auditSuccessMsg ? (
            <div className="my-3">
              <FeedbackAlert
                variant="success"
                title="Unit Verified"
                description={auditSuccessMsg}
              />
            </div>
          ) : (
            <>
              {actionError && (
                <div className="mt-3">
                  <FeedbackAlert
                    variant="error"
                    error={actionError}
                    onDismiss={onDismissError}
                  />
                </div>
              )}
              <form onSubmit={onSubmit} className="space-y-4 pt-3">
                <div className="p-3 rounded-xl bg-surface-subtle border border-border">
                  <span className="text-content-muted text-[11px] block">Target Unit:</span>
                  <strong className="text-content text-xs font-bold">
                    {unit.project?.projectName} - Unit {unit.unitNumber} ({unit.bhk} BHK)
                  </strong>
                </div>

                <div>
                  <CustomSelect
                    id="unit-target-verification-status"
                    label="Target Verification Status:"
                    value={targetStatus}
                    onChange={onTargetStatusChange}
                    options={[
                      {
                        value: 'ACTIVE_MARKETABLE',
                        label: 'Active Marketable',
                        description: 'Broker updated within <14 days',
                        dotColor: 'bg-status-success',
                      },
                      {
                        value: 'PHYSICALLY_AUDITED',
                        label: 'Physically Audited',
                        description: 'Internal site inspection verified',
                        dotColor: 'bg-accent',
                      },
                      {
                        value: 'STALE_EXPIRED',
                        label: 'Stale / Expired',
                        description: 'No broker updates for >30 days',
                        dotColor: 'bg-status-warning',
                      },
                      {
                        value: 'ARCHIVED_SOLD',
                        label: 'Archived / Sold',
                        description: 'Unit no longer available on market',
                        dotColor: 'bg-content-muted',
                      },
                    ]}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-content block mb-1">
                    Mandatory Update Notes:
                  </label>
                  <textarea
                    aria-label="Mandatory update notes"
                    rows={3}
                    value={auditNotes}
                    onChange={(e) => onAuditNotesChange(e.target.value)}
                    placeholder="Record the source, price check, availability update, or site review…"
                    className="w-full bg-surface-subtle border border-border rounded-xl p-2.5 text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent font-medium"
                    required
                  />
                </div>

                <div className="pt-3 flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-border">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    {submitting ? 'Recording…' : 'Record Update'}
                  </button>
                </div>
              </form>
            </>
          )}
        </>
      )}
    </AccessibleDialog>
  );
}
