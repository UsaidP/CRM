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
  Zap
} from 'lucide-react';

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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-[#b59658]/20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1b202c] border border-[#b59658]/40 text-[#ccb67b] text-xs font-semibold mb-2">
          <Calculator className="w-3.5 h-3.5 text-[#b59658]" />
          Statutory Capitalized Acquisition Cost Simulator
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white font-display">
          Maharashtra Real Estate All-In Cost Engine ($C_{'{'}all-in{'}'}$)
        </h1>
        <p className="text-slate-400 text-xs mt-0.5 font-sans">
          Bridge the 14%–22% gap between advertised agreement values and actual buyer out-of-pocket budget.
        </p>
      </div>

      {/* Preset Quick Chips */}
      <div className="glass-panel p-3.5 rounded-2xl flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400 font-semibold text-[11px] flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Quick Micro-Market Presets:
        </span>
        {Object.keys(NAVI_MUMBAI_MICRO_MARKETS).map((key) => (
          <button
            key={key}
            onClick={() => applyPreset(key, 2)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              selectedPresetMarket === key
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:text-white'
            }`}
          >
            {key} (2 BHK)
          </button>
        ))}
      </div>

      {/* Interactive 2-Column Calculator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Sliders & Options (7 cols) */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl space-y-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300 flex items-center gap-2 font-display">
            <Layers className="w-4 h-4 text-[#b59658]" />
            1. Property & Buyer Parameters
          </h2>

          {/* Agreement Value Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-slate-200">
                Base Agreement Value (V_agreement)
              </label>
              <span className="font-mono text-[#ccb67b] font-bold text-sm">
                ₹{(agreementValue / 100000).toFixed(2)} Lakhs (₹{agreementValue.toLocaleString('en-IN')})
              </span>
            </div>
            <input
              type="range"
              min={2000000}
              max={25000000}
              step={50000}
              value={agreementValue}
              onChange={(e) => setAgreementValue(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#b59658]"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>₹20L</span>
              <span>₹80L</span>
              <span>₹1.5Cr</span>
              <span>₹2.5Cr</span>
            </div>
          </div>

          {/* Toggles (OC Status & Female Buyer) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* OC Certificate Toggle */}
            <div 
              onClick={() => setHasOC(!hasOC)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                hasOC 
                  ? 'bg-[#1b202c] border-[#b59658]/50 text-[#ccb67b]' 
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Occupancy Cert (OC)</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${hasOC ? 'bg-[#12151f] text-[#ccb67b] border border-[#b59658]/40' : 'bg-slate-800 text-slate-400'}`}>
                  {hasOC ? '0% GST' : '5% GST'}
                </span>
              </div>
              <p className="text-[11px] mt-1 text-slate-400">
                {hasOC ? 'Ready-to-Move with OC: 0% GST exempt' : 'Under-construction: 5% GST applicable'}
              </p>
            </div>

            {/* Female Buyer Concession Toggle */}
            <div 
              onClick={() => setIsFemaleBuyer(!isFemaleBuyer)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                isFemaleBuyer 
                  ? 'bg-purple-950/60 border-purple-700 text-purple-200' 
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Female Buyer Concession</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${isFemaleBuyer ? 'bg-purple-900 text-purple-300' : 'bg-slate-800 text-slate-400'}`}>
                  {isFemaleBuyer ? '5% Stamp' : '6% Stamp'}
                </span>
              </div>
              <p className="text-[11px] mt-1 text-slate-400">
                {isFemaleBuyer ? '1% Concession applied (5% Stamp Duty)' : 'Standard Maharashtra Rate (6% Stamp Duty)'}
              </p>
            </div>
          </div>

          {/* Carpet Area & Floor Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label className="font-semibold text-slate-300">Carpet Area</label>
                <span className="font-mono text-slate-200 font-bold">{carpetAreaSqft} sq.ft</span>
              </div>
              <input
                type="range"
                min={300}
                max={2000}
                step={25}
                value={carpetAreaSqft}
                onChange={(e) => setCarpetAreaSqft(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#b59658]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label className="font-semibold text-slate-300">Floor Level</label>
                <span className="font-mono text-slate-200 font-bold">Floor {floorNumber} {floorNumber > 4 ? `(+₹${((floorNumber - 4) * 50 * carpetAreaSqft).toLocaleString('en-IN')})` : '(No Rise)'}</span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                value={floorNumber}
                onChange={(e) => setFloorNumber(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>

          {/* Parking & Society Development Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Parking Charges (₹)
              </label>
              <input
                type="number"
                step={25000}
                value={parkingCharges}
                onChange={(e) => setParkingCharges(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Society & Club Development (₹)
              </label>
              <input
                type="number"
                step={25000}
                value={societyDevCharges}
                onChange={(e) => setSocietyDevCharges(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Breakdown Results & Out-of-Pocket Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Main Total Card */}
          <div className="glass-panel p-6 rounded-2xl border-[#b59658]/40 bg-gradient-to-b from-[#12151f] to-[#1b202c] space-y-4 shadow-xl">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#ccb67b]">
                Total Capitalized Out-of-Pocket Cost
              </span>
              <div className="text-3xl font-extrabold text-white font-mono mt-1">
                ₹{costBreakdown.totalAllInCost.toLocaleString('en-IN')}
              </div>
              <div className="inline-flex items-center gap-1 text-xs text-[#ccb67b] font-semibold mt-1">
                <span>₹{(costBreakdown.totalAllInCost / 100000).toFixed(2)} Lakhs</span>
                <span className="text-slate-400 font-normal">
                  (+{costBreakdown.percentageOverAgreement}% over agreement)
                </span>
              </div>
            </div>

            {/* Itemized Line Items */}
            <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
              <div className="flex justify-between py-1 text-slate-300">
                <span>1. Agreement Value (V_agr):</span>
                <strong className="text-white font-mono">₹{costBreakdown.agreementValue.toLocaleString('en-IN')}</strong>
              </div>

              <div className="flex justify-between py-1 text-slate-300">
                <span>2. Stamp Duty ({costBreakdown.stampDutyRate}%):</span>
                <span className="text-amber-300 font-mono">+ ₹{costBreakdown.stampDutyAmount.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between py-1 text-slate-300">
                <span>3. Registration (Capped at ₹30k):</span>
                <span className="text-amber-300 font-mono">+ ₹{costBreakdown.registrationFee.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between py-1 text-slate-300">
                <span>4. GST ({costBreakdown.gstRate}%):</span>
                <span className="text-amber-300 font-mono">
                  {costBreakdown.gstAmount === 0 ? '₹0 (OC Exempt)' : `+ ₹${costBreakdown.gstAmount.toLocaleString('en-IN')}`}
                </span>
              </div>

              <div className="flex justify-between py-1 text-slate-300">
                <span>5. Floor Rise (Floor {floorNumber}):</span>
                <span className="text-slate-300 font-mono">
                  {costBreakdown.floorRiseCharges === 0 ? '₹0' : `+ ₹${costBreakdown.floorRiseCharges.toLocaleString('en-IN')}`}
                </span>
              </div>

              <div className="flex justify-between py-1 text-slate-300">
                <span>6. Parking + Society Dev:</span>
                <span className="text-slate-300 font-mono">+ ₹{(costBreakdown.parkingCharges + costBreakdown.societyDevCharges).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Buyer Advice Note */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <strong className="text-slate-200 block flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#b59658]" />
                Broker Consultation Rule
              </strong>
              <p>
                Never quote ₹{(costBreakdown.agreementValue / 100000).toFixed(1)}L to a buyer with a ₹55L budget without disclosing the additional ₹{((costBreakdown.totalAllInCost - costBreakdown.agreementValue) / 100000).toFixed(2)}L in government taxes and society fees.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
