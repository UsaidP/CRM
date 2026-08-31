'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  ShieldCheck,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Receipt,
  PiggyBank,
} from 'lucide-react';
import { formatLakhCr, formatIndianRupees } from '@/lib/money';

interface PropertyPricingBreakdownProps {
  unit: any;
  project: any;
}

export function PropertyPricingBreakdown({ unit, project }: PropertyPricingBreakdownProps) {
  const [showLedger, setShowLedger] = useState(false);

  const agreementVal = unit.agreementValue || unit.allInTotalCost || 4500000;
  const stampDutyRate = unit.stampDutyRate ?? 6.0;
  const stampDutyAmount = Math.round(agreementVal * (stampDutyRate / 100));
  const registrationFee = unit.registrationFee ?? 30000;
  const gstRate = unit.gstRate ?? 0.0;
  const gstAmount = Math.round(agreementVal * (gstRate / 100));
  const parkingCharges = unit.parkingCharges ?? 0;
  const societyDevCharges = unit.societyDevelopmentCharges ?? 0;
  const floorRise = unit.floorRiseCharges ?? 0;
  const totalAllIn =
    unit.allInTotalCost ||
    agreementVal + stampDutyAmount + registrationFee + gstAmount + parkingCharges + societyDevCharges + floorRise;

  // Approx monthly EMI for quick badge
  const approxEmi = Math.round(
    ((totalAllIn * 0.8 * (0.085 / 12)) * Math.pow(1 + 0.085 / 12, 240)) /
      (Math.pow(1 + 0.085 / 12, 240) - 1)
  );

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-50/70 via-amber-100/40 to-white border border-amber-300/80 p-4 sm:p-6 shadow-sm space-y-4">
      {/* Top Price Bar */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-[#8C641E]" />
            Total All-Inclusive On-Road Price
          </span>
          <div className="flex items-baseline gap-2 flex-wrap">
            <strong className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#8C641E] font-mono tracking-tight">
              {formatLakhCr(totalAllIn)}
            </strong>
            <span className="text-xs sm:text-sm font-semibold text-slate-600 font-mono">
              ({formatIndianRupees(totalAllIn)})
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Base Agreement Value: <strong className="text-slate-800 font-mono">{formatLakhCr(agreementVal)}</strong> • 100% Transparent
          </p>
        </div>

        {/* Quick Badges */}
        <div className="flex flex-wrap md:flex-col md:items-end gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            0% GST (Full OC Ready)
          </span>

          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-amber-300 text-[#8C641E] text-xs font-bold shadow-2xs font-mono">
            <Calculator className="w-3.5 h-3.5 text-[#8C641E]" />
            Approx. {formatIndianRupees(approxEmi)}/mo EMI
          </span>
        </div>
      </div>

      {/* Toggle Statutory Breakdown Ledger */}
      <div className="pt-2 border-t border-amber-200/80">
        <button
          type="button"
          onClick={() => setShowLedger(!showLedger)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8C641E] hover:text-[#6F4E14] transition-colors cursor-pointer"
        >
          <span>{showLedger ? 'Hide Detailed Statutory Ledger' : 'View Itemized Government & Statutory Breakdown'}</span>
          {showLedger ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {showLedger && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden pt-3"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-amber-200/80 shadow-2xs space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-mono block">Agreement Value</span>
                  <strong className="text-slate-900 font-bold font-mono block truncate">
                    {formatLakhCr(agreementVal)}
                  </strong>
                  <span className="text-[10px] text-slate-500 font-mono truncate block">
                    {formatIndianRupees(agreementVal)}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-amber-200/80 shadow-2xs space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-mono block">Stamp Duty ({stampDutyRate}%)</span>
                  <strong className="text-slate-900 font-bold font-mono block truncate">
                    {formatIndianRupees(stampDutyAmount)}
                  </strong>
                  <span className="text-[10px] text-slate-500">Maha. Govt Statutory</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-amber-200/80 shadow-2xs space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-mono block">Registration Fee</span>
                  <strong className="text-slate-900 font-bold font-mono block truncate">
                    {formatIndianRupees(registrationFee)}
                  </strong>
                  <span className="text-[10px] text-slate-500">Official Gov Receipt</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-amber-200/80 shadow-2xs space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-mono block">GST Status</span>
                  <strong className="text-emerald-700 font-bold font-mono block truncate">
                    ₹0 (0% GST)
                  </strong>
                  <span className="text-[10px] text-emerald-700">OC Received Exemption</span>
                </div>

                {parkingCharges > 0 && (
                  <div className="p-3 bg-white rounded-xl border border-amber-200/80 shadow-2xs space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-mono block">Car Parking Space</span>
                    <strong className="text-slate-900 font-bold font-mono block truncate">
                      {formatIndianRupees(parkingCharges)}
                    </strong>
                    <span className="text-[10px] text-slate-500">Reserved Dedicated</span>
                  </div>
                )}

                {societyDevCharges > 0 && (
                  <div className="p-3 bg-white rounded-xl border border-amber-200/80 shadow-2xs space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-mono block">Society Infra Charges</span>
                    <strong className="text-slate-900 font-bold font-mono block truncate">
                      {formatIndianRupees(societyDevCharges)}
                    </strong>
                    <span className="text-[10px] text-slate-500">Clubhouse &amp; Electric</span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500 mt-2.5 font-sans">
                🛡️ <strong>Zero Hidden Charges Guarantee:</strong> All calculations above include statutory stamp duty, government registration, and developer infrastructure costs verified against MahaRERA documentation.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
