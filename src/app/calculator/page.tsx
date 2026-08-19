'use client';

import React, { useState, useMemo } from 'react';
import { calculateAllInCost } from '@/lib/domain/cost-calculator';
import { NAVI_MUMBAI_MICRO_MARKETS } from '@/lib/domain/market-definitions';
import { 
  Calculator, 
  HelpCircle, 
  CheckCircle2, 
  Sparkles, 
  TrendingUp, 
  FileText, 
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  DollarSign
} from 'lucide-react';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';

export default function CostCalculatorPage() {
  const [agreementValue, setAgreementValue] = useState<number>(5500000);
  const [hasOC, setHasOC] = useState<boolean>(false);
  const [isFemaleBuyer, setIsFemaleBuyer] = useState<boolean>(false);
  const [floorNumber, setFloorNumber] = useState<number>(8);
  const [carpetAreaSqft, setCarpetAreaSqft] = useState<number>(650);
  const [parkingCharges, setParkingCharges] = useState<number>(250000);
  const [societyDevCharges, setSocietyDevCharges] = useState<number>(150000);
  const [selectedPresetMarket, setSelectedPresetMarket] = useState<string>('Kharghar Sector 35');

  const costBreakdown = useMemo(() => {
    return calculateAllInCost({
      agreementValue,
      hasOccupancyCertificate: hasOC,
      isFemaleBuyer,
      floorNumber,
      carpetAreaSqft,
      parkingCharges,
      societyDevCharges,
    });
  }, [agreementValue, hasOC, isFemaleBuyer, floorNumber, carpetAreaSqft, parkingCharges, societyDevCharges]);

  const applyPreset = (marketKey: string, bhk: number) => {
    setSelectedPresetMarket(marketKey);
    const m = NAVI_MUMBAI_MICRO_MARKETS[marketKey];
    if (!m) return;

    let carpet = 650;
    if (bhk === 1) carpet = 420;
    if (bhk === 2) carpet = 650;
    if (bhk === 3) carpet = 980;

    const rate = hasOC ? m.rtmPricePerSqft : m.underConstructionPricePerSqft;
    const estAgreement = Math.round((carpet * rate) / 50000) * 50000;
    setAgreementValue(estAgreement);
    setCarpetAreaSqft(carpet);
  };

  const formatINR = (val: number) => {
    if (!val && val !== 0) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-mono">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#b59658]/20">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1b202c] text-[#ccb67b] border border-[#b59658]/40 uppercase tracking-wider flex items-center gap-1">
              <Calculator className="w-3.5 h-3.5 text-[#b59658]" /> STATUTORY COST ENGINE
            </span>
            <HallmarkStamp type="ledger" label="Calculated from entered values" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-display">
            Capitalized Cost Engine ($C_{'{'}all-in{'}'}$)
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Estimate itemized acquisition costs from the values and certificate status you enter.
          </p>
        </div>
      </div>

      {/* Preset Quick Chips */}
      <div className="p-3 rounded-xl bg-[#1b202c]/90 border border-[#b59658]/30 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400 font-semibold text-[11px] flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Micro-Market Presets:
        </span>
        {Object.keys(NAVI_MUMBAI_MICRO_MARKETS).map((key) => (
          <button
            type="button"
            key={key}
            onClick={() => applyPreset(key, 2)}
            aria-pressed={selectedPresetMarket === key}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
              selectedPresetMarket === key
                ? 'bg-gradient-to-r from-[#8a6f3c] to-[#ccb67b] text-[#12151f] font-bold shadow-sm'
                : 'bg-[#12151f] text-slate-400 hover:text-white border border-[#b59658]/20'
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Two-Column Working Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Pane: Parameter Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-xl space-y-4 text-xs">
            <h3 className="font-bold text-white text-sm font-display border-b border-[#b59658]/20 pb-2">
              Property Parameters
            </h3>

            <div>
              <label className="text-slate-300 block mb-1">Agreement Base Value (₹):</label>
              <input
                aria-label="Agreement base value"
                type="number"
                step="50000"
                value={agreementValue}
                onChange={(e) => setAgreementValue(Number(e.target.value))}
                className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white font-bold"
              />
              <span className="text-[#ccb67b] text-[11px] block mt-1">
                {formatINR(agreementValue)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 block mb-1">Carpet Area (sq.ft):</label>
                <input
                  aria-label="Carpet area in square feet"
                  type="number"
                  value={carpetAreaSqft}
                  onChange={(e) => setCarpetAreaSqft(Number(e.target.value))}
                  className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Floor Number:</label>
                <input
                  aria-label="Floor number"
                  type="number"
                  value={floorNumber}
                  onChange={(e) => setFloorNumber(Number(e.target.value))}
                  className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 block mb-1">Covered Parking (₹):</label>
                <input
                  aria-label="Covered parking charges"
                  type="number"
                  step="25000"
                  value={parkingCharges}
                  onChange={(e) => setParkingCharges(Number(e.target.value))}
                  className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Society &amp; Club (₹):</label>
                <input
                  aria-label="Society and club charges"
                  type="number"
                  step="25000"
                  value={societyDevCharges}
                  onChange={(e) => setSocietyDevCharges(Number(e.target.value))}
                  className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#b59658]/10 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  aria-label="Occupancy certificate received"
                  type="checkbox"
                  checked={hasOC}
                  onChange={(e) => setHasOC(e.target.checked)}
                  className="accent-[#b59658]"
                />
                <span>Occupancy Certificate (OC) Received (0% GST)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  aria-label="Female sole purchaser"
                  type="checkbox"
                  checked={isFemaleBuyer}
                  onChange={(e) => setIsFemaleBuyer(e.target.checked)}
                  className="accent-[#b59658]"
                />
                <span>Female Sole Purchaser (1% Stamp Duty Concession)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Pane: Itemized Statutory Breakdown (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-[#b59658]/20 pb-3">
              <h3 className="font-bold text-white text-base font-display">
                Itemized Statutory Out-of-Pocket Ledger
              </h3>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                Estimate only
              </span>
            </div>

            <div className="space-y-2 divide-y divide-[#b59658]/10 text-slate-300">
              <div className="flex justify-between pt-1">
                <span>1. Agreement Base Value:</span>
                <strong className="text-white">{formatINR(agreementValue)}</strong>
              </div>

              <div className="flex justify-between pt-1">
                <span>2. Maharashtra Stamp Duty ({costBreakdown.stampDutyRate}%):</span>
                <strong className="text-white">{formatINR(costBreakdown.stampDutyAmount)}</strong>
              </div>

              <div className="flex justify-between pt-1">
                <span>3. Registration Fee (1% capped at ₹30,000):</span>
                <strong className="text-white">{formatINR(costBreakdown.registrationFee)}</strong>
              </div>

              <div className="flex justify-between pt-1">
                <span>4. GST ({costBreakdown.gstRate}% {hasOC ? '• OC Exempt' : '• Under-Construction'}):</span>
                <strong className="text-white">{formatINR(costBreakdown.gstAmount)}</strong>
              </div>

              <div className="flex justify-between pt-1">
                <span>5. Floor Rise Charges (Fl {floorNumber}):</span>
                <strong className="text-white">{formatINR(costBreakdown.floorRiseCharges)}</strong>
              </div>

              <div className="flex justify-between pt-1">
                <span>6. Covered Parking Allotment:</span>
                <strong className="text-white">{formatINR(parkingCharges)}</strong>
              </div>

              <div className="flex justify-between pt-1">
                <span>7. Society Development &amp; Club Charges:</span>
                <strong className="text-white">{formatINR(societyDevCharges)}</strong>
              </div>

              <div className="pt-3 border-t border-[#b59658]/30 flex justify-between items-center text-sm font-bold text-[#ccb67b]">
                <div>
                  <span className="block">Total Capitalized Cost ($C_{'{'}all-in{'}'}$):</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Adds +{((costBreakdown.totalAllInCost - agreementValue) / agreementValue * 100).toFixed(1)}% above base
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xl text-white font-mono">{formatINR(costBreakdown.totalAllInCost)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
