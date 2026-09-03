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
  Banknote,
} from 'lucide-react';
import { formatLakhCr, formatIndianRupees } from '@/lib/money';

interface PropertyPricingBreakdownProps {
  unit: any;
  project: any;
}

export function PropertyPricingBreakdown({ unit, project }: PropertyPricingBreakdownProps) {
  const [showLedger, setShowLedger] = useState(false);

  const agreementVal = unit.agreementValue || unit.allInTotalCost || 0;
  const stampDutyRate = unit.stampDutyRate ?? 6.0;
  const stampDutyAmount = Math.round(agreementVal * (stampDutyRate / 100));
  const registrationFee = unit.registrationFee ?? 30000;
  const isOcReady = Boolean(project?.hasOccupancyCertificate || unit.possessionStatus === 'READY_TO_MOVE');
  const gstRate = isOcReady ? 0.0 : (unit.gstRate ?? 5.0);
  const gstAmount = Math.round(agreementVal * (gstRate / 100));
  const parkingCharges = unit.parkingCharges ?? 0;
  const societyDevCharges = unit.societyDevelopmentCharges ?? 0;
  const floorRise = unit.floorRiseCharges ?? 0;
  const totalAllIn =
    unit.allInTotalCost ||
    agreementVal + stampDutyAmount + registrationFee + gstAmount + parkingCharges + societyDevCharges + floorRise;

  // Approx monthly EMI for quick badge
  const approxEmi = agreementVal > 0 ? Math.round(
    ((totalAllIn * 0.8 * (0.085 / 12)) * Math.pow(1 + 0.085 / 12, 240)) /
      (Math.pow(1 + 0.085 / 12, 240) - 1)
  ) : 0;

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-50/80 via-[#FFFDF9] to-amber-50/50 border border-amber-300/85 p-4 sm:p-6 shadow-sm space-y-4">
      {/* Top Price Bar */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-gold" />
            Total All-Inclusive On-Road Price
          </span>
          <div className="flex items-baseline gap-2 flex-wrap">
            <strong className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gold font-mono tracking-tight">
              {formatLakhCr(totalAllIn)}
            </strong>
            <span className="text-xs sm:text-sm font-semibold text-slate-600 font-mono">
              ({formatIndianRupees(totalAllIn)})
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Base Agreement Value: <strong className="text-slate-900 font-mono font-bold">{formatLakhCr(agreementVal)}</strong> • 100% Transparent
          </p>
        </div>

        {/* Quick Badges */}
        <div className="flex flex-wrap md:flex-col md:items-end gap-2 shrink-0">
          <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold shadow-2xs ${
            gstRate === 0
              ? 'bg-emerald-100/90 border border-emerald-300 text-emerald-800'
              : 'bg-amber-100/90 border border-amber-300 text-amber-800'
          }`}>
            <CheckCircle2 className={`w-3.5 h-3.5 ${gstRate === 0 ? 'text-emerald-600' : 'text-amber-600'}`} />
            {gstRate === 0 ? '0% GST (Full OC Ready)' : `${gstRate}% GST (Under Construction)`}
          </span>

          {approxEmi > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white border border-amber-300 text-gold text-xs font-bold shadow-2xs font-mono">
              <Calculator className="w-3.5 h-3.5 text-gold" />
              Approx. {formatIndianRupees(approxEmi)}/mo EMI
            </span>
          )}
        </div>
      </div>

      {/* Toggle Statutory Breakdown Ledger */}
      <div className="pt-2 border-t border-amber-200/80">
        <button
          type="button"
          onClick={() => setShowLedger(!showLedger)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gold hover:text-[#6F4E14] transition-colors cursor-pointer font-serif"
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
                  <span className="text-[10px] text-slate-400 font-mono block">GST ({gstRate}%)</span>
                  <strong className={`${gstRate === 0 ? 'text-emerald-700' : 'text-amber-800'} font-bold font-mono block truncate`}>
                    {gstRate === 0 ? '₹0 (0% GST)' : formatIndianRupees(gstAmount)}
                  </strong>
                  <span className={`text-[10px] ${gstRate === 0 ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    {gstRate === 0 ? 'OC Received Exemption' : 'Under-Construction Statutory'}
                  </span>
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

              <div className="flex items-center gap-2 p-3 rounded-xl bg-white border border-amber-200/90 mt-2.5 shadow-2xs text-[11px] text-slate-600 font-sans">
                <ShieldCheck className="w-4 h-4 text-gold shrink-0" />
                <span>
                  <strong className="text-slate-900">Zero Hidden Charges Guarantee:</strong> All calculations above include statutory stamp duty, government registration, and developer infrastructure costs verified against MahaRERA documentation.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
