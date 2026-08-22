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
    <div className="space-y-6 max-w-6xl mx-auto pb-16 text-content font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-surface border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-soft text-accent-text border border-accent/20 uppercase tracking-wider flex items-center gap-1">
              <Calculator className="w-3.5 h-3.5 text-accent" /> STATUTORY COST ENGINE
            </span>
            <HallmarkStamp type="ledger" label="Calculated from entered values" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-content font-display">
            Capitalized Cost Engine (C_all-in)
          </h1>
          <p className="text-content-secondary text-xs mt-1">
            Estimate itemized acquisition costs from the values and certificate status you enter.
          </p>
        </div>
      </div>

      {/* Preset Quick Chips */}
      <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex flex-wrap items-center gap-2 text-xs">
        <span className="text-content-muted font-semibold text-xs flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-accent" />
          Micro-Market Presets:
        </span>
        {Object.keys(NAVI_MUMBAI_MICRO_MARKETS).map((key) => (
          <button
            type="button"
            key={key}
            onClick={() => applyPreset(key, 2)}
            aria-pressed={selectedPresetMarket === key}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedPresetMarket === key
                ? 'bg-accent text-white font-bold shadow-xs'
                : 'bg-surface text-content-secondary border border-border hover:bg-surface-subtle hover:text-content'
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
          <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-4 text-xs font-sans">
            <h3 className="font-bold text-content text-sm font-display border-b border-border pb-2.5">
              Property Parameters
            </h3>

            <div>
              <label className="text-content-secondary font-medium block mb-1.5">Agreement Base Value (₹):</label>
              <input
                aria-label="Agreement base value"
                type="number"
                step="50000"
                value={agreementValue}
                onChange={(e) => setAgreementValue(Number(e.target.value))}
                className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content font-bold font-mono focus:outline-none focus:border-accent"
              />
              <span className="text-accent-text font-bold font-mono text-xs block mt-1">
                {formatINR(agreementValue)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-content-secondary font-medium block mb-1.5">Carpet Area (sq.ft):</label>
                <input
                  aria-label="Carpet area in square feet"
                  type="number"
                  value={carpetAreaSqft}
                  onChange={(e) => setCarpetAreaSqft(Number(e.target.value))}
                  className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content font-mono focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-content-secondary font-medium block mb-1.5">Floor Number:</label>
                <input
                  aria-label="Floor number"
                  type="number"
                  value={floorNumber}
                  onChange={(e) => setFloorNumber(Number(e.target.value))}
                  className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content font-mono focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-content-secondary font-medium block mb-1.5">Covered Parking (₹):</label>
                <input
                  aria-label="Covered parking charges"
                  type="number"
                  step="25000"
                  value={parkingCharges}
                  onChange={(e) => setParkingCharges(Number(e.target.value))}
                  className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content font-mono focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-content-secondary font-medium block mb-1.5">Society &amp; Club (₹):</label>
                <input
                  aria-label="Society and club charges"
                  type="number"
                  step="25000"
                  value={societyDevCharges}
                  onChange={(e) => setSocietyDevCharges(Number(e.target.value))}
                  className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content font-mono focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer text-content-secondary font-medium">
                <input
                  aria-label="Occupancy certificate received"
                  type="checkbox"
                  checked={hasOC}
                  onChange={(e) => setHasOC(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                />
                <span>Occupancy Certificate (OC) Received (0% GST)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-content-secondary font-medium">
                <input
                  aria-label="Female sole purchaser"
                  type="checkbox"
                  checked={isFemaleBuyer}
                  onChange={(e) => setIsFemaleBuyer(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                />
                <span>Female Sole Purchaser (1% Stamp Duty Concession)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Pane: Itemized Statutory Breakdown (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-4 text-xs font-sans">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-bold text-content text-base font-display">
                Itemized Statutory Out-of-Pocket Ledger
              </h3>
              <span className="text-[10px] text-status-success font-bold font-mono bg-status-success-surface px-2.5 py-0.5 rounded-lg border border-status-success/30">
                Estimate only
              </span>
            </div>

            <div className="space-y-2 divide-y divide-border text-content-secondary">
              <div className="flex justify-between pt-2">
                <span>1. Agreement Base Value:</span>
                <strong className="text-content font-mono">{formatINR(agreementValue)}</strong>
              </div>

              <div className="flex justify-between pt-2">
                <span>2. Maharashtra Stamp Duty ({costBreakdown.stampDutyRate}%):</span>
                <strong className="text-content font-mono">{formatINR(costBreakdown.stampDutyAmount)}</strong>
              </div>

              <div className="flex justify-between pt-2">
                <span>3. Registration Fee (1% capped at ₹30,000):</span>
                <strong className="text-content font-mono">{formatINR(costBreakdown.registrationFee)}</strong>
              </div>

              <div className="flex justify-between pt-2">
                <span>4. GST ({costBreakdown.gstRate}% {hasOC ? '• OC Exempt' : '• Under-Construction'}):</span>
                <strong className="text-content font-mono">{formatINR(costBreakdown.gstAmount)}</strong>
              </div>

              <div className="flex justify-between pt-2">
                <span>5. Floor Rise Charges (Fl {floorNumber}):</span>
                <strong className="text-content font-mono">{formatINR(costBreakdown.floorRiseCharges)}</strong>
              </div>

              <div className="flex justify-between pt-2">
                <span>6. Covered Parking Allotment:</span>
                <strong className="text-content font-mono">{formatINR(parkingCharges)}</strong>
              </div>

              <div className="flex justify-between pt-2">
                <span>7. Society Development &amp; Club Charges:</span>
                <strong className="text-content font-mono">{formatINR(societyDevCharges)}</strong>
              </div>

              <div className="pt-4 border-t border-border flex justify-between items-center text-sm font-bold text-accent-text">
                <div>
                  <span className="block text-content">Total Capitalized Cost (C_all-in):</span>
                  <span className="text-xs text-content-muted font-normal">
                    Adds +{((costBreakdown.totalAllInCost - agreementValue) / agreementValue * 100).toFixed(1)}% above base
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl text-accent-text font-mono font-bold">{formatINR(costBreakdown.totalAllInCost)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
