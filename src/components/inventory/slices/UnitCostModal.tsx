'use client';

import React from 'react';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { formatINR } from '@/lib/formatters';

export interface UnitCostModalProps {
  unit: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function UnitCostModal({ unit, isOpen, onClose }: UnitCostModalProps) {
  return (
    <AccessibleDialog
      open={isOpen && Boolean(unit)}
      onClose={onClose}
      titleId="cost-sheet-title"
      descriptionId="cost-sheet-description"
      size="lg"
    >
      {unit && (
        <>
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2
                id="cost-sheet-title"
                className="font-bold text-content text-base font-display"
              >
                Statutory All-in Cost Sheet
              </h2>
              <p id="cost-sheet-description" className="text-xs text-content-muted">
                {unit.project?.projectName} • Unit {unit.unitNumber}
              </p>
            </div>
            <button
              type="button"
              data-dialog-close
              aria-label="Close cost sheet"
              onClick={onClose}
              className="p-1 rounded-lg text-content-muted hover:text-content hover:bg-surface-subtle transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 divide-y divide-border text-xs text-content-muted pt-2">
            <div className="flex justify-between pt-2">
              <span>Agreement Base Value:</span>
              <strong className="text-content font-mono font-bold">
                {formatINR(unit.agreementValue)}
              </strong>
            </div>
            <div className="flex justify-between pt-2">
              <span>Maharashtra Stamp Duty ({unit.stampDutyRate}%):</span>
              <strong className="text-content font-mono font-bold">
                {formatINR(
                  Math.round((unit.agreementValue * unit.stampDutyRate) / 100)
                )}
              </strong>
            </div>
            <div className="flex justify-between pt-2">
              <span>Registration Fee (1% capped at ₹30k):</span>
              <strong className="text-content font-mono font-bold">
                {formatINR(unit.registrationFee)}
              </strong>
            </div>
            <div className="flex justify-between pt-2">
              <span>
                GST ({unit.gstRate}% {unit.gstRate === 0 ? 'OC Received' : 'Under-Construction'}):
              </span>
              <strong className="text-content font-mono font-bold">
                {formatINR(
                  Math.round((unit.agreementValue * unit.gstRate) / 100)
                )}
              </strong>
            </div>
            <div className="flex justify-between pt-2">
              <span>Floor Rise Charges:</span>
              <strong className="text-content font-mono font-bold">
                {formatINR(unit.floorRiseCharges)}
              </strong>
            </div>
            <div className="flex justify-between pt-2">
              <span>Covered Car Parking:</span>
              <strong className="text-content font-mono font-bold">
                {formatINR(unit.parkingCharges)}
              </strong>
            </div>
            <div className="flex justify-between pt-2">
              <span>Society Development / Club Charges:</span>
              <strong className="text-content font-mono font-bold">
                {formatINR(unit.societyDevelopmentCharges)}
              </strong>
            </div>
            <div className="flex justify-between pt-3 border-t border-border text-sm font-bold text-accent">
              <span>Total All-Inclusive Capitalized Cost:</span>
              <span className="font-mono">{formatINR(unit.allInTotalCost)}</span>
            </div>
          </div>

          <div className="pt-4 flex justify-end border-t border-border mt-3">
            <button
              type="button"
              data-dialog-autofocus
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              Close Cost Sheet
            </button>
          </div>
        </>
      )}
    </AccessibleDialog>
  );
}
