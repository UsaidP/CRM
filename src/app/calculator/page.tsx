'use client';

export const dynamic = 'force-dynamic';

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
  DollarSign,
  Download,
  MessageSquare,
  Save,
  Building2,
  MapPin,
  Check,
  Percent,
  Sliders,
  Award
} from 'lucide-react';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';

export default function CostCalculatorPage() {
  const [agreementValue, setAgreementValue] = useState<number>(6800000);
  const [hasOC, setHasOC] = useState<boolean>(false);
  const [isFemaleBuyer, setIsFemaleBuyer] = useState<boolean>(false);
  const [floorNumber, setFloorNumber] = useState<number>(8);
  const [carpetAreaSqft, setCarpetAreaSqft] = useState<number>(685);
  const [parkingCharges, setParkingCharges] = useState<number>(250000);
  const [societyDevCharges, setSocietyDevCharges] = useState<number>(150000);
  const [selectedPresetMarket, setSelectedPresetMarket] = useState<string>('Kharghar Sector 35');
  const [projectName, setProjectName] = useState<string>('Crown Greens');
  const [copiedMsg, setCopiedMsg] = useState(false);

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

    let carpet = 685;
    if (bhk === 1) carpet = 440;
    if (bhk === 2) carpet = 685;
    if (bhk === 3) carpet = 980;

    const rate = hasOC ? m.rtmPricePerSqft : m.underConstructionPricePerSqft;
    const estAgreement = Math.round((carpet * rate) / 50000) * 50000;
    setAgreementValue(estAgreement);
    setCarpetAreaSqft(carpet);
  };

  const formatINR = (val: number) => {
    if (!val && val !== 0) return '₹0';
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  const handleShareWhatsApp = () => {
    const text = `*ZamZam Realty - Maharashtra Statutory Cost Sheet*
Project: ${projectName} (${selectedPresetMarket})
Carpet Area: ${carpetAreaSqft} sq.ft
---
1. Agreement Value: ${formatINR(agreementValue)}
2. Maharashtra Stamp Duty (${isFemaleBuyer ? '5%' : '6%'}): ${formatINR(costBreakdown.stampDutyAmount)}
3. MahaRERA Registration: ${formatINR(costBreakdown.registrationFee)}
4. Statutory GST (${hasOC ? '0% Ready OC' : '5%'}): ${formatINR(costBreakdown.gstAmount)}
5. Parking & Society Corpus: ${formatINR(parkingCharges + societyDevCharges)}
---
*Grand Net Capitalized Total (C_all-in): ${formatINR(costBreakdown.totalAllInCost)}*
_Calculated in compliance with Maharashtra Stamp Act & MahaRERA regulations._`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-content">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-status-success-surface text-status-success border border-status-success/30 uppercase tracking-wider flex items-center gap-1">
              <Calculator className="w-3 h-3" /> STATUTORY COST ENGINE
            </span>
            <span className="text-xs font-semibold text-content-muted flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-accent" />
              {projectName}, {selectedPresetMarket}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-content tracking-tight font-display">
            Maharashtra Statutory Capitalized Cost Engine
          </h1>
          <p className="text-xs text-content-muted mt-0.5">
            Transparent acquisition breakdown: Stamp Duty, Registration, GST, and Corpus Funds (C_all-in)
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-surface border border-border rounded-xl text-xs font-bold text-content hover:bg-surface-subtle transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-accent" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-status-success-surface border border-status-success/30 rounded-xl text-xs font-bold text-status-success hover:bg-status-success hover:text-white transition-all shadow-2xs cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Share WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Preset Quick Chips */}
      <div className="p-3 bg-surface rounded-2xl border border-border flex flex-wrap items-center gap-2 text-xs shadow-2xs">
        <span className="text-content-muted font-bold text-xs flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-accent" />
          Micro-Market Presets:
        </span>
        {Object.keys(NAVI_MUMBAI_MICRO_MARKETS).map((key) => (
          <button
            type="button"
            key={key}
            onClick={() => applyPreset(key, 2)}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedPresetMarket === key
                ? 'bg-accent text-white shadow-2xs'
                : 'bg-surface-subtle text-content-muted border border-border hover:text-content hover:bg-surface'
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Form (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Unit Details Card */}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xs font-bold text-content font-display uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-accent" />
                Unit Configuration
              </h3>
              <span className="bg-accent-soft text-accent-text font-bold font-mono text-[10px] px-2 py-0.5 rounded-lg uppercase border border-accent/20">
                {carpetAreaSqft} SQ.FT CARPET
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-content-muted mb-1 uppercase font-mono">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-semibold text-content focus:outline-hidden focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-content-muted mb-1 uppercase font-mono">
                    Carpet Area (sq.ft)
                  </label>
                  <input
                    type="number"
                    value={carpetAreaSqft}
                    onChange={(e) => setCarpetAreaSqft(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-mono font-bold text-content focus:outline-hidden focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-content-muted mb-1 uppercase font-mono">
                    Floor Number
                  </label>
                  <input
                    type="number"
                    value={floorNumber}
                    onChange={(e) => setFloorNumber(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-mono font-bold text-content focus:outline-hidden focus:border-accent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Statutory Rate Inputs Card */}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xs font-bold text-content font-display uppercase tracking-wider flex items-center gap-2">
                <Percent className="w-4 h-4 text-accent" />
                Statutory Parameters
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-content-muted mb-1 uppercase font-mono">
                  Base Agreement Value (₹)
                </label>
                <input
                  type="number"
                  step="50000"
                  value={agreementValue}
                  onChange={(e) => setAgreementValue(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-surface-subtle border border-border rounded-xl text-sm font-mono font-bold text-content focus:outline-hidden focus:border-accent"
                />
              </div>

              {/* Toggles: Occupancy Certificate & Female Concession */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-subtle border border-border cursor-pointer hover:border-accent/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={hasOC}
                    onChange={(e) => setHasOC(e.target.checked)}
                    className="rounded text-accent focus:ring-accent"
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-content block">Ready OC</span>
                    <span className="text-[10px] text-content-muted">0% GST Exemption</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-subtle border border-border cursor-pointer hover:border-accent/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={isFemaleBuyer}
                    onChange={(e) => setIsFemaleBuyer(e.target.checked)}
                    className="rounded text-accent focus:ring-accent"
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-content block">Female Buyer</span>
                    <span className="text-[10px] text-content-muted">1% Stamp Duty Rebate</span>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-content-muted mb-1 uppercase font-mono">
                    Covered Parking (₹)
                  </label>
                  <input
                    type="number"
                    value={parkingCharges}
                    onChange={(e) => setParkingCharges(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-mono font-bold text-content"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-content-muted mb-1 uppercase font-mono">
                    Society Corpus (₹)
                  </label>
                  <input
                    type="number"
                    value={societyDevCharges}
                    onChange={(e) => setSocietyDevCharges(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-mono font-bold text-content"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Capitalized Statutory Cost Engine Breakdown (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-content-muted font-mono">
                  Statutory Output Breakdown
                </span>
                <h3 className="text-base font-bold text-content font-display">
                  All-In Net Capitalized Total (C_all-in)
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono font-bold bg-status-success-surface text-status-success border border-status-success/30 px-2.5 py-1 rounded-full">
                  MahaRERA Compliant
                </span>
              </div>
            </div>

            {/* Itemized Rows */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="font-semibold text-content-muted">01. Base Agreement Value</span>
                <span className="font-mono font-bold text-sm text-content">{formatINR(agreementValue)}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <span className="font-semibold text-content-muted">02. Maharashtra Stamp Duty</span>
                  <span className="ml-2 text-[10px] font-mono text-accent font-bold">({isFemaleBuyer ? '5% Female' : '6% Standard'})</span>
                </div>
                <span className="font-mono font-bold text-sm text-content">{formatINR(costBreakdown.stampDutyAmount)}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <span className="font-semibold text-content-muted">03. Registration Charges</span>
                  <span className="ml-2 text-[10px] font-mono text-content-muted">(Fixed MahaRERA rate)</span>
                </div>
                <span className="font-mono font-bold text-sm text-content">{formatINR(costBreakdown.registrationFee)}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <span className="font-semibold text-content-muted">04. Statutory GST</span>
                  <span className="ml-2 text-[10px] font-mono text-status-success font-bold">({hasOC ? '0% Exempt (Ready OC)' : '5% Under-Construction'})</span>
                </div>
                <span className="font-mono font-bold text-sm text-content">{formatINR(costBreakdown.gstAmount)}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="font-semibold text-content-muted">05. Covered Parking Charges</span>
                <span className="font-mono font-bold text-sm text-content">{formatINR(parkingCharges)}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="font-semibold text-content-muted">06. Society Corpus / Development Fund</span>
                <span className="font-mono font-bold text-sm text-content">{formatINR(societyDevCharges)}</span>
              </div>
            </div>

            {/* Grand Total Hero Box */}
            <div className="p-5 bg-surface-subtle rounded-2xl border-2 border-accent flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-accent font-display">
                  Grand Capitalized Net Total
                </span>
                <div className="text-xs text-content-muted mt-0.5">
                  All statutory levies included
                </div>
              </div>
              <div className="font-mono text-2xl font-extrabold text-content">
                {formatINR(costBreakdown.totalAllInCost)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
