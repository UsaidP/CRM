'use client';

import React, { useState, useMemo } from 'react';
import {
  Calculator,
  TrendingDown,
  Sparkles,
  Share2,
  ShieldCheck,
  Wallet,
  Clock,
  Landmark,
  PiggyBank,
} from 'lucide-react';

interface BankPreset {
  id: string;
  name: string;
  rate: number;
  badge?: string;
}

const BANK_PRESETS: BankPreset[] = [
  { id: 'SBI', name: 'State Bank of India', rate: 8.50, badge: 'Govt Standard' },
  { id: 'HDFC', name: 'HDFC Bank', rate: 8.60, badge: 'Prime' },
  { id: 'ICICI', name: 'ICICI Bank', rate: 8.65, badge: 'Instant Approval' },
  { id: 'BOB', name: 'Bank of Baroda', rate: 8.40, badge: 'Lowest ROI' },
  { id: 'CUSTOM', name: 'Custom Rate', rate: 8.75 },
];

const DOWN_PAYMENT_PRESETS = [10, 20, 25, 30, 50];
const TENURE_PRESETS = [10, 15, 20, 25, 30];

interface PortalEmiCalculatorProps {
  unit: any;
  projectName: string;
  advisorPhone?: string;
}

export function PortalEmiCalculator({
  unit,
  projectName,
  advisorPhone,
}: PortalEmiCalculatorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedBank, setSelectedBank] = useState<string>('SBI');
  const [customRate, setCustomRate] = useState<number>(8.50);
  const [downPaymentPct, setDownPaymentPct] = useState<number>(20);
  const [tenureYears, setTenureYears] = useState<number>(20);

  // Property cost base
  const propertyCost = unit.allInTotalCost || unit.agreementValue || 4500000;

  // Active interest rate
  const activeRate = useMemo(() => {
    if (selectedBank === 'CUSTOM') return customRate;
    const found = BANK_PRESETS.find((b) => b.id === selectedBank);
    return found ? found.rate : 8.50;
  }, [selectedBank, customRate]);

  // EMI Math & Loan Proportions
  const {
    loanAmount,
    downPaymentAmount,
    monthlyEmi,
    totalPayable,
    totalInterest,
    principalPct,
    interestPct,
    recommendedIncome,
  } = useMemo(() => {
    const downPayment = propertyCost * (downPaymentPct / 100);
    const principal = propertyCost - downPayment;
    const monthlyRate = activeRate / 12 / 100;
    const totalMonths = tenureYears * 12;

    let emi = 0;
    if (monthlyRate > 0 && totalMonths > 0) {
      emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
        (Math.pow(1 + monthlyRate, totalMonths) - 1);
    }

    const roundedEmi = Math.round(emi);
    const totalOutflow = Math.round(roundedEmi * totalMonths);
    const interest = Math.max(0, totalOutflow - principal);

    const pPct = totalOutflow > 0 ? Math.round((principal / totalOutflow) * 100) : 50;
    const iPct = 100 - pPct;

    // Banking FOIR: EMI should be at most 45% of net household income
    const minIncome = Math.round((roundedEmi / 0.45) / 1000) * 1000;

    return {
      loanAmount: principal,
      downPaymentAmount: downPayment,
      monthlyEmi: roundedEmi,
      totalPayable: totalOutflow,
      totalInterest: interest,
      principalPct: pPct,
      interestPct: iPct,
      recommendedIncome: minIncome,
    };
  }, [propertyCost, downPaymentPct, tenureYears, activeRate]);

  const formatLakhs = (val: number) => {
    return (val / 100000).toFixed(2);
  };

  const handleShareLoanEstimate = () => {
    const text = `🏡 Loan Estimate for ${projectName} (${unit.bhk} BHK, Unit ${unit.unitNumber || ''}):
• All-In Cost: ₹${formatLakhs(propertyCost)} Lakhs
• Down Payment (${downPaymentPct}%): ₹${formatLakhs(downPaymentAmount)} Lakhs
• Bank Loan: ₹${formatLakhs(loanAmount)} Lakhs
• Interest Rate: ${activeRate.toFixed(2)}% p.a. (${selectedBank === 'CUSTOM' ? 'Custom' : selectedBank})
• Tenure: ${tenureYears} Years (${tenureYears * 12} Months)
• Estimated Monthly EMI: ₹${monthlyEmi.toLocaleString('en-IN')}/month
• Min Family Income: ~₹${recommendedIncome.toLocaleString('en-IN')}/mo`;

    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="rounded-3xl border border-amber-300/80 bg-white overflow-hidden shadow-md transition-all hover:border-amber-400 font-sans">
      {/* Header Banner - Light Luxury Theme */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 text-left hover:bg-amber-100/50 transition border-b border-amber-200/80 cursor-pointer"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#DFBA73] via-[#B38A38] to-[#8C641E] text-white flex items-center justify-center shadow-sm shrink-0">
            <Calculator className="w-4 h-4 sm:w-5 sm:h-5 font-black" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 font-serif tracking-tight truncate">
                Interactive Home Loan &amp; EMI Simulator
              </h3>
              <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Live Bank Rates
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 line-clamp-1">
              Simulate down payment, tenure, and monthly outflow with top bank benchmarks.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-amber-200/50">
          <div className="text-left sm:text-right">
            <span className="text-[9px] sm:text-[10px] uppercase font-mono text-slate-400 block font-semibold">Estimated EMI</span>
            <strong className="text-xs sm:text-sm font-extrabold text-[#8C641E] font-mono">
              ₹{monthlyEmi.toLocaleString('en-IN')} <span className="text-[10px] sm:text-[11px] font-normal text-slate-500">/mo</span>
            </strong>
          </div>
          <span className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] sm:text-xs font-bold text-[#8C641E] shadow-2xs font-mono">
            {isExpanded ? 'Hide ▲' : 'Open ▼'}
          </span>
        </div>
      </button>

      {/* Expanded Interactive Body */}
      {isExpanded && (
        <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 bg-gradient-to-b from-[#FFFDF9] to-white text-slate-800">
          
          {/* Top Row: Bank Benchmarks */}
          <div className="space-y-2 sm:space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-[#8C641E]" />
                1. Select Preferred Bank Benchmark Rate:
              </label>
              <span className="text-[11px] sm:text-xs font-mono font-bold text-[#8C641E]">
                Active ROI: {activeRate.toFixed(2)}% p.a.
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {BANK_PRESETS.map((bank) => {
                const isSelected = selectedBank === bank.id;
                return (
                  <button
                    key={bank.id}
                    type="button"
                    onClick={() => setSelectedBank(bank.id)}
                    className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-amber-50/90 border-amber-400 shadow-sm ring-1 ring-amber-400 text-slate-900'
                        : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-slate-700'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#8C641E]" />
                    )}
                    <span className="text-[11px] sm:text-xs font-bold text-slate-900 block truncate font-serif">{bank.name}</span>
                    <div className="flex items-baseline justify-between mt-1 gap-1">
                      <strong className={`text-xs sm:text-sm font-extrabold font-mono ${isSelected ? 'text-[#8C641E]' : 'text-slate-700'}`}>
                        {bank.id === 'CUSTOM' ? `${customRate.toFixed(2)}%` : `${bank.rate.toFixed(2)}%`}
                      </strong>
                      {bank.badge && (
                        <span className="text-[8px] sm:text-[9px] font-mono px-1 sm:px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200 truncate">
                          {bank.badge}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Rate Slider when CUSTOM selected */}
            {selectedBank === 'CUSTOM' && (
              <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-amber-50/60 border border-amber-300 space-y-2 mt-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-700 font-medium">Fine-tune Interest Rate:</span>
                  <strong className="text-[#8C641E] font-mono font-bold">{customRate.toFixed(2)}% p.a.</strong>
                </div>
                <input
                  type="range"
                  min={7.0}
                  max={12.0}
                  step={0.05}
                  value={customRate}
                  onChange={(e) => setCustomRate(parseFloat(e.target.value))}
                  className="w-full accent-[#8C641E] bg-slate-200 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] sm:text-[10px] text-slate-500 font-mono">
                  <span>7.00% (Subsidized)</span>
                  <span>8.50% (Standard)</span>
                  <span>12.00% (Commercial)</span>
                </div>
              </div>
            )}
          </div>

          {/* Main 2-Column Controls & Live Outcome Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
            
            {/* Left Column: Sliders (7 Cols) */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-5">
              
              {/* Down Payment Box */}
              <div className="p-3.5 sm:p-4.5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-800 font-bold flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-[#8C641E]" />
                    2. Down Payment Contribution:
                  </span>
                  <div className="text-right">
                    <span className="text-xs font-mono font-extrabold text-slate-900">
                      ₹{formatLakhs(downPaymentAmount)} Lakhs
                    </span>
                    <span className="text-[11px] text-[#8C641E] font-mono ml-1.5 font-bold">
                      ({downPaymentPct}%)
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min={10}
                  max={60}
                  step={5}
                  value={downPaymentPct}
                  onChange={(e) => setDownPaymentPct(Number(e.target.value))}
                  className="w-full accent-[#8C641E] bg-slate-200 h-2.5 rounded-lg cursor-pointer"
                />

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-1.5 pt-1">
                  {DOWN_PAYMENT_PRESETS.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDownPaymentPct(pct)}
                      className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-mono font-bold transition-all cursor-pointer ${
                        downPaymentPct === pct
                          ? 'bg-[#8C641E] text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-amber-50 hover:text-[#8C641E] text-slate-700'
                      }`}
                    >
                      {pct}% {pct === 10 ? '(Min)' : pct === 20 ? '(Std)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Loan Tenure Box */}
              <div className="p-3.5 sm:p-4.5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-800 font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#8C641E]" />
                    3. Loan Repayment Tenure:
                  </span>
                  <div className="text-right">
                    <span className="text-xs font-mono font-extrabold text-slate-900">
                      {tenureYears} Years
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-slate-500 font-mono ml-1.5">
                      ({tenureYears * 12} Installments)
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min={5}
                  max={30}
                  step={1}
                  value={tenureYears}
                  onChange={(e) => setTenureYears(Number(e.target.value))}
                  className="w-full accent-[#8C641E] bg-slate-200 h-2.5 rounded-lg cursor-pointer"
                />

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-1.5 pt-1">
                  {TENURE_PRESETS.map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setTenureYears(yr)}
                      className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-mono font-bold transition-all cursor-pointer ${
                        tenureYears === yr
                          ? 'bg-[#8C641E] text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-amber-50 hover:text-[#8C641E] text-slate-700'
                      }`}
                    >
                      {yr} Yrs {yr === 20 ? '(Typical)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Principal vs Interest Visual Ratio Bar */}
              <div className="p-3.5 sm:p-4.5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 sm:space-y-2.5">
                <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono font-bold flex-wrap gap-1">
                  <span className="text-emerald-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                    Principal: {principalPct}% (₹{formatLakhs(loanAmount)} L)
                  </span>
                  <span className="text-[#8C641E] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8C641E] inline-block" />
                    Interest: {interestPct}% (₹{formatLakhs(totalInterest)} L)
                  </span>
                </div>

                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner border border-slate-200">
                  <div
                    style={{ width: `${principalPct}%` }}
                    className="bg-emerald-600 h-full transition-all duration-500"
                    title={`Principal: ${principalPct}%`}
                  />
                  <div
                    style={{ width: `${interestPct}%` }}
                    className="bg-gradient-to-r from-amber-400 to-[#8C641E] h-full transition-all duration-500"
                    title={`Total Interest: ${interestPct}%`}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Hero Result Display Card (5 Cols) */}
            <div className="lg:col-span-5 space-y-3 sm:space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-50 via-amber-100/40 to-white text-slate-900 shadow-md border border-amber-300 space-y-3 sm:space-y-4 relative overflow-hidden">
                {/* Subtle Luxury Pattern Header */}
                <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-amber-200/80">
                  <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-widest text-[#8C641E] font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#9A7228]" />
                    Monthly Outflow
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-amber-200 text-[#8C641E] font-bold">
                    {activeRate.toFixed(2)}% p.a.
                  </span>
                </div>

                {/* Hero EMI Number */}
                <div className="space-y-0.5">
                  <span className="text-xs text-slate-600 font-medium">Estimated Monthly EMI</span>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#8C641E] font-mono tracking-tight">
                    ₹{monthlyEmi.toLocaleString('en-IN')}
                    <span className="text-xs font-normal text-slate-500 ml-1">/ month</span>
                  </div>
                </div>

                {/* Key Metrics Matrix */}
                <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-2 border-t border-amber-200/80 text-xs font-mono">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-white/90 border border-amber-200/80 shadow-2xs">
                    <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 block font-semibold truncate">Bank Loan</span>
                    <strong className="text-slate-900 font-bold block mt-0.5 text-xs sm:text-sm truncate">
                      ₹{formatLakhs(loanAmount)} L
                    </strong>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-white/90 border border-amber-200/80 shadow-2xs">
                    <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 block font-semibold truncate">Down Payment</span>
                    <strong className="text-[#8C641E] font-bold block mt-0.5 text-xs sm:text-sm truncate">
                      ₹{formatLakhs(downPaymentAmount)} L
                    </strong>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-white/90 border border-amber-200/80 shadow-2xs">
                    <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 block font-semibold truncate">Total Interest</span>
                    <strong className="text-slate-900 font-bold block mt-0.5 text-xs sm:text-sm truncate">
                      ₹{formatLakhs(totalInterest)} L
                    </strong>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-white/90 border border-amber-200/80 shadow-2xs">
                    <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 block font-semibold truncate">Total Repayment</span>
                    <strong className="text-slate-900 font-bold block mt-0.5 text-xs sm:text-sm truncate">
                      ₹{formatLakhs(totalPayable)} L
                    </strong>
                  </div>
                </div>

                {/* Share on WhatsApp Button */}
                <button
                  type="button"
                  onClick={handleShareLoanEstimate}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#B38A38] to-[#8C641E] hover:brightness-105 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="truncate">Share Loan Estimate on WhatsApp</span>
                </button>
              </div>

              {/* Financial Qualification & Tax Shield Card */}
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-700 font-bold flex items-center gap-1.5">
                    <PiggyBank className="w-4 h-4 text-[#8C641E]" />
                    Eligibility &amp; Tax Shield:
                  </span>
                  <span className="font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px] sm:text-xs">
                    FOIR ~45%
                  </span>
                </div>

                <div className="space-y-1.5 text-[10px] sm:text-[11px] text-slate-600">
                  <div className="flex justify-between gap-1">
                    <span>Suggested Household Income:</span>
                    <strong className="text-slate-900 font-mono">~₹{recommendedIncome.toLocaleString('en-IN')} / mo</strong>
                  </div>
                  <div className="flex justify-between gap-1">
                    <span>Sec 24(b) Interest Rebate:</span>
                    <strong className="text-emerald-700 font-mono">Up to ₹2.00 L / yr</strong>
                  </div>
                  <div className="flex justify-between gap-1">
                    <span>Sec 80C Principal Rebate:</span>
                    <strong className="text-emerald-700 font-mono">Up to ₹1.50 L / yr</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
