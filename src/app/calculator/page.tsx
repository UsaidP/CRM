'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  calculateAllInCost, 
  formatINR, 
  formatINRFull,
  DEFAULT_MAHARERA_MILESTONES, 
  calculateHomeLoan,
  CustomChargeItem,
  PaymentMilestone
} from '@/lib/domain/cost-calculator';
import { NAVI_MUMBAI_MICRO_MARKETS } from '@/lib/domain/market-definitions';
import { formatQuotationWhatsApp } from '@/lib/export-utils';
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
  Award,
  Plus,
  Trash2,
  RotateCcw,
  Copy,
  ChevronDown,
  ChevronUp,
  Landmark,
  CreditCard,
  User,
  Info,
  Calendar,
  Settings,
  Share2,
  FolderOpen
} from 'lucide-react';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';

interface SavedQuote {
  id: string;
  savedAt: string;
  projectName: string;
  clientName: string;
  market: string;
  unitNo: string;
  agreementValue: number;
  totalAllInCost: number;
  carpetAreaSqft: number;
}

export default function CostCalculatorPage() {
  // --- Unit & Project State ---
  const [selectedPresetMarket, setSelectedPresetMarket] = useState<string>('Kharghar Sector 35');
  const [selectedBhk, setSelectedBhk] = useState<number>(2);
  const [projectName, setProjectName] = useState<string>('Crown Greens');
  const [towerUnit, setTowerUnit] = useState<string>('Tower A - Unit 804');
  const [clientName, setClientName] = useState<string>('');
  const [preparedBy, setPreparedBy] = useState<string>('ZamZam Advisory Team');
  const [quotationNotes, setQuotationNotes] = useState<string>('Includes 1 covered stilt car parking & 1-year clubhouse access.');

  // --- Pricing & Dimensions ---
  const [rateMode, setRateMode] = useState<'AGREEMENT' | 'PERSQFT'>('AGREEMENT');
  const [carpetAreaSqft, setCarpetAreaSqft] = useState<number>(685);
  const [ratePerSqft, setRatePerSqft] = useState<number>(7591);
  const [agreementValue, setAgreementValue] = useState<number>(5200000);

  // --- Floor Rise Customization ---
  const [floorNumber, setFloorNumber] = useState<number>(8);
  const [includeFloorRise, setIncludeFloorRise] = useState<boolean>(true);
  const [floorRiseRate, setFloorRiseRate] = useState<number>(50); // ₹50/sqft
  const [baseFloorThreshold, setBaseFloorThreshold] = useState<number>(4); // above 4th floor

  // --- Statutory Levies (Customizable) ---
  const [stampDutyMode, setStampDutyMode] = useState<'STANDARD_6' | 'FEMALE_5' | 'GRAM_4' | 'CUSTOM'>('STANDARD_6');
  const [customStampDutyRate, setCustomStampDutyRate] = useState<number>(6.0);
  const [customStampDutyAmountOverride, setCustomStampDutyAmountOverride] = useState<string>('');

  const [registrationMode, setRegistrationMode] = useState<'AUTO_1_CAPPED' | 'CUSTOM'>('AUTO_1_CAPPED');
  const [customRegistrationOverride, setCustomRegistrationOverride] = useState<string>('');

  const [gstMode, setGstMode] = useState<'UNDER_CONSTRUCTION_5' | 'READY_OC_0' | 'AFFORDABLE_1' | 'COMMERCIAL_12' | 'CUSTOM'>('UNDER_CONSTRUCTION_5');
  const [customGstRate, setCustomGstRate] = useState<number>(5.0);
  const [customGstAmountOverride, setCustomGstAmountOverride] = useState<string>('');

  // --- Ancillary & Infrastructure Charges ---
  const [parkingCharges, setParkingCharges] = useState<number>(250000);
  const [societyDevCharges, setSocietyDevCharges] = useState<number>(150000);
  const [legalCharges, setLegalCharges] = useState<number>(25000);
  const [infraCharges, setInfraCharges] = useState<number>(75000); // Electricity/Water/Gas
  const [clubhouseCharges, setClubhouseCharges] = useState<number>(100000);
  
  // Advance Maintenance
  const [maintenanceMode, setMaintenanceMode] = useState<'CALCULATED' | 'LUMP_SUM'>('CALCULATED');
  const [advanceMaintenanceMonths, setAdvanceMaintenanceMonths] = useState<number>(12);
  const [advanceMaintenanceRatePerSqft, setAdvanceMaintenanceRatePerSqft] = useState<number>(3.0); // ₹3/sqft/mo
  const [advanceMaintenanceLumpSum, setAdvanceMaintenanceLumpSum] = useState<number>(24000);

  // --- Dynamic Custom Charges ---
  const [customCharges, setCustomCharges] = useState<CustomChargeItem[]>([
    { id: '1', name: 'CIDCO / Society Transfer Scrutiny', amount: 15000, category: 'STATUTORY' }
  ]);
  const [newChargeName, setNewChargeName] = useState<string>('');
  const [newChargeAmount, setNewChargeAmount] = useState<string>('');

  // --- Tab Switcher for Right Panel (Breakdown vs Payment Schedule vs Loan Calculator) ---
  const [activeTab, setActiveTab] = useState<'BREAKDOWN' | 'SCHEDULE' | 'LOAN' | 'SAVED'>('BREAKDOWN');

  // --- Milestone Payment Schedule State ---
  const [milestones, setMilestones] = useState<PaymentMilestone[]>(DEFAULT_MAHARERA_MILESTONES);

  // --- Home Loan Calculator State ---
  const [loanLtv, setLoanLtv] = useState<number>(80);
  const [loanTenureYears, setLoanTenureYears] = useState<number>(20);
  const [loanInterestRate, setLoanInterestRate] = useState<number>(8.5);

  // --- Saved Quotes & UI Toast ---
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  // Synchronize Rate per Sqft with Agreement Value
  const handleCarpetChange = (newCarpet: number) => {
    const validCarpet = Math.max(1, newCarpet);
    setCarpetAreaSqft(validCarpet);
    if (rateMode === 'PERSQFT') {
      setAgreementValue(Math.round(validCarpet * ratePerSqft));
    } else {
      setRatePerSqft(Math.round(agreementValue / validCarpet));
    }
  };

  const handleAgreementChange = (newAgreement: number) => {
    const val = Math.max(0, newAgreement);
    setAgreementValue(val);
    if (carpetAreaSqft > 0) {
      setRatePerSqft(Math.round(val / carpetAreaSqft));
    }
  };

  const handleRatePerSqftChange = (newRate: number) => {
    const rate = Math.max(0, newRate);
    setRatePerSqft(rate);
    setAgreementValue(Math.round(rate * carpetAreaSqft));
  };

  // Load Saved Quotes from LocalStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('zamzam_crm_saved_quotes');
      if (stored) {
        setSavedQuotes(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load saved quotes', e);
    }
  }, []);

  // Compute Active Statutory Values based on modes
  const calculatedStampDutyRate = useMemo(() => {
    if (stampDutyMode === 'STANDARD_6') return 6.0;
    if (stampDutyMode === 'FEMALE_5') return 5.0;
    if (stampDutyMode === 'GRAM_4') return 4.0;
    return customStampDutyRate;
  }, [stampDutyMode, customStampDutyRate]);

  const calculatedGstRate = useMemo(() => {
    if (gstMode === 'UNDER_CONSTRUCTION_5') return 5.0;
    if (gstMode === 'READY_OC_0') return 0.0;
    if (gstMode === 'AFFORDABLE_1') return 1.0;
    if (gstMode === 'COMMERCIAL_12') return 12.0;
    return customGstRate;
  }, [gstMode, customGstRate]);

  // Execute Cost Calculation Engine
  const costBreakdown = useMemo(() => {
    return calculateAllInCost({
      agreementValue,
      floorNumber,
      carpetAreaSqft,
      floorRisePerSqftPerFloor: floorRiseRate,
      baseFloorThreshold,
      includeFloorRise,
      parkingCharges,
      societyDevCharges,
      legalAndDocumentationCharges: legalCharges,
      infrastructureCharges: infraCharges,
      clubhouseCharges: clubhouseCharges,
      advanceMaintenanceMonths: maintenanceMode === 'CALCULATED' ? advanceMaintenanceMonths : undefined,
      advanceMaintenancePerSqftMonth: maintenanceMode === 'CALCULATED' ? advanceMaintenanceRatePerSqft : undefined,
      advanceMaintenanceLumpSum: maintenanceMode === 'LUMP_SUM' ? advanceMaintenanceLumpSum : undefined,
      customStampDutyRate: stampDutyMode === 'CUSTOM' ? customStampDutyRate : calculatedStampDutyRate,
      customStampDutyAmount: customStampDutyAmountOverride ? Number(customStampDutyAmountOverride) : undefined,
      customRegistrationFee: customRegistrationOverride ? Number(customRegistrationOverride) : undefined,
      customGstRate: gstMode === 'CUSTOM' ? customGstRate : calculatedGstRate,
      customGstAmount: customGstAmountOverride ? Number(customGstAmountOverride) : undefined,
      customCharges,
    });
  }, [
    agreementValue,
    floorNumber,
    carpetAreaSqft,
    floorRiseRate,
    baseFloorThreshold,
    includeFloorRise,
    parkingCharges,
    societyDevCharges,
    legalCharges,
    infraCharges,
    clubhouseCharges,
    maintenanceMode,
    advanceMaintenanceMonths,
    advanceMaintenanceRatePerSqft,
    advanceMaintenanceLumpSum,
    stampDutyMode,
    customStampDutyRate,
    calculatedStampDutyRate,
    customStampDutyAmountOverride,
    customRegistrationOverride,
    gstMode,
    customGstRate,
    calculatedGstRate,
    customGstAmountOverride,
    customCharges
  ]);

  // Home Loan Calculation
  const loanBreakdown = useMemo(() => {
    return calculateHomeLoan({
      agreementValue,
      totalAllInCost: costBreakdown.totalAllInCost,
      ltvPercentage: loanLtv,
      interestRateAnnual: loanInterestRate,
      tenureYears: loanTenureYears,
    });
  }, [agreementValue, costBreakdown.totalAllInCost, loanLtv, loanInterestRate, loanTenureYears]);

  // Apply Micro-Market Preset
  const applyPreset = (marketKey: string, bhk: number) => {
    setSelectedPresetMarket(marketKey);
    setSelectedBhk(bhk);
    const m = NAVI_MUMBAI_MICRO_MARKETS[marketKey];
    if (!m) return;

    let carpet = 685;
    if (bhk === 1) carpet = 440;
    if (bhk === 2) carpet = 685;
    if (bhk === 3) carpet = 980;
    if (bhk === 4) carpet = 1450;

    const isReady = gstMode === 'READY_OC_0';
    const rate = isReady ? m.rtmPricePerSqft : m.underConstructionPricePerSqft;
    const estAgreement = Math.round((carpet * rate) / 50000) * 50000;
    
    setCarpetAreaSqft(carpet);
    setRatePerSqft(rate);
    setAgreementValue(estAgreement);
  };

  // Add Dynamic Custom Charge
  const handleAddCustomCharge = () => {
    if (!newChargeName.trim() || !newChargeAmount || isNaN(Number(newChargeAmount))) return;
    const newCharge: CustomChargeItem = {
      id: Date.now().toString(),
      name: newChargeName.trim(),
      amount: Math.round(Number(newChargeAmount)),
      category: 'CUSTOM'
    };
    setCustomCharges([...customCharges, newCharge]);
    setNewChargeName('');
    setNewChargeAmount('');
  };

  // Remove Dynamic Custom Charge
  const handleRemoveCustomCharge = (id: string) => {
    setCustomCharges(customCharges.filter(c => c.id !== id));
  };

  // Update Milestone Percentage
  const handleMilestonePercentageChange = (id: string, newPct: number) => {
    setMilestones(milestones.map(m => m.id === id ? { ...m, percentage: Math.max(0, Math.min(100, newPct)) } : m));
  };

  // Reset Milestone Percentages to Defaults
  const handleResetMilestones = () => {
    setMilestones(DEFAULT_MAHARERA_MILESTONES);
  };

  // Save current quote to localStorage
  const handleSaveQuote = () => {
    const newQuote: SavedQuote = {
      id: Date.now().toString(),
      savedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      projectName,
      clientName: clientName.trim() || 'Valued Client',
      market: selectedPresetMarket,
      unitNo: towerUnit,
      agreementValue,
      totalAllInCost: costBreakdown.totalAllInCost,
      carpetAreaSqft,
    };
    const updated = [newQuote, ...savedQuotes.slice(0, 19)];
    setSavedQuotes(updated);
    try {
      localStorage.setItem('zamzam_crm_saved_quotes', JSON.stringify(updated));
      showToast('Quotation successfully saved!');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSavedQuote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedQuotes.filter(q => q.id !== id);
    setSavedQuotes(updated);
    localStorage.setItem('zamzam_crm_saved_quotes', JSON.stringify(updated));
  };

  // Reset all parameters to initial defaults
  const handleResetAll = () => {
    setAgreementValue(5200000);
    setCarpetAreaSqft(685);
    setRatePerSqft(7591);
    setFloorNumber(8);
    setIncludeFloorRise(true);
    setFloorRiseRate(50);
    setBaseFloorThreshold(4);
    setStampDutyMode('STANDARD_6');
    setCustomStampDutyRate(6.0);
    setCustomStampDutyAmountOverride('');
    setRegistrationMode('AUTO_1_CAPPED');
    setCustomRegistrationOverride('');
    setGstMode('UNDER_CONSTRUCTION_5');
    setCustomGstRate(5.0);
    setCustomGstAmountOverride('');
    setParkingCharges(250000);
    setSocietyDevCharges(150000);
    setLegalCharges(25000);
    setInfraCharges(75000);
    setClubhouseCharges(100000);
    setMaintenanceMode('CALCULATED');
    setAdvanceMaintenanceMonths(12);
    setAdvanceMaintenanceRatePerSqft(3.0);
    setAdvanceMaintenanceLumpSum(24000);
    setCustomCharges([{ id: '1', name: 'CIDCO / Society Transfer Scrutiny', amount: 15000, category: 'STATUTORY' }]);
    showToast('Reset to default MahaRERA statutory configuration');
  };

  // Toast Helper
  const showToast = (msg: string) => {
    setCopiedToast(msg);
    setTimeout(() => setCopiedToast(null), 3000);
  };

  // Generate Formatted Text for Copy / WhatsApp using ZamZam Theme
  const generateQuotationText = () => {
    return formatQuotationWhatsApp({
      projectName,
      market: selectedPresetMarket,
      towerUnit,
      carpetAreaSqft,
      clientName,
      preparedBy,
      agreementValue,
      ratePerSqftAgreement: costBreakdown.ratePerSqftAgreement,
      floorRiseCharges: costBreakdown.floorRiseCharges,
      floorNumber,
      stampDutyRate: costBreakdown.stampDutyRate,
      stampDutyAmount: costBreakdown.stampDutyAmount,
      registrationFee: costBreakdown.registrationFee,
      gstRate: costBreakdown.gstRate,
      gstAmount: costBreakdown.gstAmount,
      amenitiesTotal: costBreakdown.amenitiesTotal,
      totalAllInCost: costBreakdown.totalAllInCost,
      ratePerSqftAllIn: costBreakdown.ratePerSqftAllIn,
      percentageOverAgreement: costBreakdown.percentageOverAgreement,
      loanLtv,
      loanInterestRate,
      loanTenureYears,
      eligibleLoanAmount: loanBreakdown.eligibleLoanAmount,
      requiredDownPayment: loanBreakdown.requiredDownPayment,
      monthlyEMI: loanBreakdown.monthlyEMI,
      quotationNotes,
    });
  };

  const handleShareWhatsApp = () => {
    const text = generateQuotationText();
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(generateQuotationText());
    showToast('Quotation text copied to clipboard!');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 text-content">
      {/* Toast Notification */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-primary-light flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-accent" />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-soft text-accent-text border border-accent/20 uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
              <Calculator className="w-3 h-3 text-accent" /> STATUTORY COST ENGINE v2.0
            </span>
            <span className="text-xs font-semibold text-content-muted flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-accent" />
              {projectName} • {selectedPresetMarket}
            </span>
            <HallmarkStamp type="rera" label="MahaRERA Ready" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-content tracking-tight font-display">
            Statutory Cost Engine &amp; Acquisition Ledger
          </h1>
          <p className="text-xs text-content-secondary mt-0.5 max-w-2xl">
            Customizable capitalization calculator for MahaRERA stamp duty, registration, GST, floor rise, amenities, milestone schedules, and bank loan structuring.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleResetAll}
            title="Reset to default settings"
            className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-border rounded-xl text-xs font-bold text-content-muted hover:text-content hover:bg-surface-subtle transition-all cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          
          <button
            onClick={handleSaveQuote}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-surface border border-border rounded-xl text-xs font-bold text-content hover:bg-surface-subtle transition-all shadow-2xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-accent" />
            <span>Save Quote</span>
          </button>

          <button
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-surface border border-border rounded-xl text-xs font-bold text-content hover:bg-surface-subtle transition-all shadow-2xs cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-content-muted" />
            <span>Copy Text</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-surface border border-border rounded-xl text-xs font-bold text-content hover:bg-surface-subtle transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-accent" />
            <span>Export PDF</span>
          </button>
          
          <button
            onClick={handleShareWhatsApp}
            className="flex items-center gap-1.5 px-4 py-2 bg-status-success-surface border border-status-success/40 rounded-xl text-xs font-bold text-status-success hover:bg-status-success hover:text-white transition-all shadow-2xs cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Preset Quick Chips Bar */}
      <div className="p-3.5 bg-surface rounded-2xl border border-border shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-content-muted font-bold text-xs flex items-center gap-1 mr-1">
              <Zap className="w-3.5 h-3.5 text-accent" />
              Micro-Market Presets:
            </span>
            {Object.keys(NAVI_MUMBAI_MICRO_MARKETS).map((key) => (
              <button
                type="button"
                key={key}
                onClick={() => applyPreset(key, selectedBhk)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedPresetMarket === key
                    ? 'bg-accent text-white shadow-xs'
                    : 'bg-surface-subtle text-content-muted border border-border hover:text-content hover:bg-surface'
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          {/* BHK Typology Selector */}
          <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-xl border border-border text-xs">
            <span className="text-[11px] font-bold text-content-muted px-2 uppercase font-mono">BHK:</span>
            {[1, 2, 3, 4].map((bhk) => (
              <button
                key={bhk}
                type="button"
                onClick={() => applyPreset(selectedPresetMarket, bhk)}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedBhk === bhk
                    ? 'bg-primary text-white shadow-2xs'
                    : 'text-content-muted hover:text-content'
                }`}
              >
                {bhk} BHK
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Comprehensive Customization Controls (6 Cols) */}
        <div className="lg:col-span-6 space-y-5">
          
          {/* Card 1: Unit & Project Identity */}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xs font-bold text-content font-display uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-accent" />
                Unit & Client Details
              </h3>
              <span className="bg-accent-soft text-accent-text font-bold font-mono text-[10px] px-2.5 py-0.5 rounded-lg uppercase border border-accent/20">
                {carpetAreaSqft} SQ.FT CARPET
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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

              <div>
                <label className="block text-[11px] font-bold text-content-muted mb-1 uppercase font-mono">
                  Tower / Unit No.
                </label>
                <input
                  type="text"
                  value={towerUnit}
                  onChange={(e) => setTowerUnit(e.target.value)}
                  placeholder="e.g. Wing B - Unit 1202"
                  className="w-full px-3.5 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-semibold text-content focus:outline-hidden focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-content-muted mb-1 uppercase font-mono">
                  Client / Lead Name
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Mr. Rajesh Sharma"
                  className="w-full px-3.5 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-semibold text-content focus:outline-hidden focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-content-muted mb-1 uppercase font-mono">
                  Prepared By (Executive)
                </label>
                <input
                  type="text"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  className="w-full px-3.5 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-semibold text-content focus:outline-hidden focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Agreement Value & Carpet Area Rate Matrix */}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xs font-bold text-content font-display uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-accent" />
                Base Valuation Matrix
              </h3>

              {/* Rate Mode Toggle */}
              <div className="flex items-center bg-surface-subtle p-0.5 rounded-lg border border-border text-[11px]">
                <button
                  type="button"
                  onClick={() => setRateMode('AGREEMENT')}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                    rateMode === 'AGREEMENT' ? 'bg-accent text-white shadow-2xs' : 'text-content-muted hover:text-content'
                  }`}
                >
                  Agreement (₹)
                </button>
                <button
                  type="button"
                  onClick={() => setRateMode('PERSQFT')}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                    rateMode === 'PERSQFT' ? 'bg-accent text-white shadow-2xs' : 'text-content-muted hover:text-content'
                  }`}
                >
                  Rate / Sq.Ft
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-content-muted uppercase font-mono">
                    Carpet Area (sq.ft)
                  </label>
                  <span className="text-[10px] font-mono text-content-muted">
                    {(carpetAreaSqft * 0.092903).toFixed(1)} sq.m
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={carpetAreaSqft}
                    onChange={(e) => handleCarpetChange(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-mono font-bold text-content focus:outline-hidden focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => handleCarpetChange(carpetAreaSqft - 25)}
                    className="px-2 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-bold text-content-muted hover:text-content"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCarpetChange(carpetAreaSqft + 25)}
                    className="px-2 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-bold text-content-muted hover:text-content"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-content-muted mb-1 uppercase font-mono">
                  Base Rate (₹ / sq.ft)
                </label>
                <input
                  type="number"
                  step="100"
                  value={ratePerSqft}
                  onChange={(e) => handleRatePerSqftChange(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-mono font-bold text-content focus:outline-hidden focus:border-accent"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-content-muted mb-1 uppercase font-mono">
                  Base Agreement Value (₹) — Statutory Base
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="50000"
                    value={agreementValue}
                    onChange={(e) => handleAgreementChange(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-surface-subtle border-2 border-accent/40 rounded-xl text-base font-mono font-extrabold text-content focus:outline-hidden focus:border-accent"
                  />
                  <div className="absolute right-3 top-2.5 text-xs font-mono font-bold text-accent">
                    {formatINR(agreementValue)}
                  </div>
                </div>
              </div>
            </div>

            {/* Floor Rise Customization Sub-Section */}
            <div className="pt-2 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeFloorRise}
                    onChange={(e) => setIncludeFloorRise(e.target.checked)}
                    className="rounded text-accent focus:ring-accent"
                  />
                  <span className="font-bold text-xs text-content">Enable Floor Rise Charges</span>
                </label>

                {includeFloorRise && costBreakdown.floorRiseCharges > 0 && (
                  <span className="font-mono text-[11px] font-bold text-accent bg-accent-soft px-2 py-0.5 rounded-lg">
                    +{formatINRFull(costBreakdown.floorRiseCharges)} ({floorNumber - baseFloorThreshold} fls @ ₹{floorRiseRate})
                  </span>
                )}
              </div>

              {includeFloorRise && (
                <div className="grid grid-cols-3 gap-2.5 text-xs pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-content-muted mb-1 uppercase font-mono">
                      Unit Floor #
                    </label>
                    <input
                      type="number"
                      value={floorNumber}
                      onChange={(e) => setFloorNumber(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-surface-subtle border border-border rounded-lg text-xs font-mono font-bold text-content"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-content-muted mb-1 uppercase font-mono">
                      Base Threshold
                    </label>
                    <input
                      type="number"
                      value={baseFloorThreshold}
                      onChange={(e) => setBaseFloorThreshold(Number(e.target.value))}
                      title="Floors above this will be charged floor rise"
                      className="w-full px-2.5 py-1.5 bg-surface-subtle border border-border rounded-lg text-xs font-mono font-bold text-content"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-content-muted mb-1 uppercase font-mono">
                      Rate (₹/sqft/fl)
                    </label>
                    <input
                      type="number"
                      step="10"
                      value={floorRiseRate}
                      onChange={(e) => setFloorRiseRate(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-surface-subtle border border-border rounded-lg text-xs font-mono font-bold text-content"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Deep Statutory Levies & Tax Customization */}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xs font-bold text-content font-display uppercase tracking-wider flex items-center gap-2">
                <Percent className="w-4 h-4 text-accent" />
                Statutory Taxes & Levies (Maharashtra)
              </h3>
              <span className="text-[10px] font-mono text-content-muted flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-status-success" /> Stamp Act Compliant
              </span>
            </div>

            {/* Stamp Duty Customizer */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-content">01. Maharashtra Stamp Duty</span>
                <span className="font-mono font-bold text-xs text-accent">
                  {formatINRFull(costBreakdown.stampDutyAmount)} ({costBreakdown.stampDutyRate}%)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setStampDutyMode('STANDARD_6')}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer ${
                    stampDutyMode === 'STANDARD_6'
                      ? 'bg-accent text-white border-accent shadow-2xs'
                      : 'bg-surface-subtle border-border text-content-muted hover:text-content'
                  }`}
                >
                  Standard (6%)
                </button>
                <button
                  type="button"
                  onClick={() => setStampDutyMode('FEMALE_5')}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer ${
                    stampDutyMode === 'FEMALE_5'
                      ? 'bg-accent text-white border-accent shadow-2xs'
                      : 'bg-surface-subtle border-border text-content-muted hover:text-content'
                  }`}
                >
                  Female (5%)
                </button>
                <button
                  type="button"
                  onClick={() => setStampDutyMode('GRAM_4')}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer ${
                    stampDutyMode === 'GRAM_4'
                      ? 'bg-accent text-white border-accent shadow-2xs'
                      : 'bg-surface-subtle border-border text-content-muted hover:text-content'
                  }`}
                >
                  Gram / Rural (4%)
                </button>
                <button
                  type="button"
                  onClick={() => setStampDutyMode('CUSTOM')}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer ${
                    stampDutyMode === 'CUSTOM'
                      ? 'bg-accent text-white border-accent shadow-2xs'
                      : 'bg-surface-subtle border-border text-content-muted hover:text-content'
                  }`}
                >
                  Custom Rate
                </button>
              </div>

              {stampDutyMode === 'CUSTOM' && (
                <div className="grid grid-cols-2 gap-2 pt-1 bg-surface-subtle p-2.5 rounded-xl border border-border">
                  <div>
                    <label className="block text-[10px] font-bold text-content-muted mb-1 font-mono">Custom Stamp Duty %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={customStampDutyRate}
                      onChange={(e) => setCustomStampDutyRate(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs font-mono font-bold text-content"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-content-muted mb-1 font-mono">Direct ₹ Override (Optional)</label>
                    <input
                      type="number"
                      placeholder="e.g. 350000"
                      value={customStampDutyAmountOverride}
                      onChange={(e) => setCustomStampDutyAmountOverride(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs font-mono font-bold text-content"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Registration Charges Customizer */}
            <div className="space-y-2 text-xs pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-content">02. Registration Charges</span>
                  <span className="text-[10px] text-content-muted ml-1.5">(1% capped at ₹30,000 in Maharashtra)</span>
                </div>
                <span className="font-mono font-bold text-xs text-content">
                  {formatINRFull(costBreakdown.registrationFee)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setRegistrationMode('AUTO_1_CAPPED');
                    setCustomRegistrationOverride('');
                  }}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer ${
                    registrationMode === 'AUTO_1_CAPPED'
                      ? 'bg-accent text-white border-accent shadow-2xs'
                      : 'bg-surface-subtle border-border text-content-muted hover:text-content'
                  }`}
                >
                  Auto 1% (Cap ₹30k)
                </button>
                <button
                  type="button"
                  onClick={() => setRegistrationMode('CUSTOM')}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer ${
                    registrationMode === 'CUSTOM'
                      ? 'bg-accent text-white border-accent shadow-2xs'
                      : 'bg-surface-subtle border-border text-content-muted hover:text-content'
                  }`}
                >
                  Custom ₹ Override
                </button>
              </div>

              {registrationMode === 'CUSTOM' && (
                <div className="pt-1 bg-surface-subtle p-2.5 rounded-xl border border-border">
                  <label className="block text-[10px] font-bold text-content-muted mb-1 font-mono">Enter Custom Registration Fee (₹)</label>
                  <input
                    type="number"
                    value={customRegistrationOverride}
                    onChange={(e) => setCustomRegistrationOverride(e.target.value)}
                    placeholder="e.g. 30000"
                    className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs font-mono font-bold text-content"
                  />
                </div>
              )}
            </div>

            {/* GST Customizer */}
            <div className="space-y-2 text-xs pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="font-bold text-content">03. Statutory GST (Goods & Services Tax)</span>
                <span className="font-mono font-bold text-xs text-status-success">
                  {formatINRFull(costBreakdown.gstAmount)} ({costBreakdown.gstRate}%)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setGstMode('UNDER_CONSTRUCTION_5')}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer ${
                    gstMode === 'UNDER_CONSTRUCTION_5'
                      ? 'bg-accent text-white border-accent shadow-2xs'
                      : 'bg-surface-subtle border-border text-content-muted hover:text-content'
                  }`}
                >
                  UC Standard (5%)
                </button>
                <button
                  type="button"
                  onClick={() => setGstMode('READY_OC_0')}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer ${
                    gstMode === 'READY_OC_0'
                      ? 'bg-accent text-white border-accent shadow-2xs'
                      : 'bg-surface-subtle border-border text-content-muted hover:text-content'
                  }`}
                >
                  Ready OC (0%)
                </button>
                <button
                  type="button"
                  onClick={() => setGstMode('AFFORDABLE_1')}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer ${
                    gstMode === 'AFFORDABLE_1'
                      ? 'bg-accent text-white border-accent shadow-2xs'
                      : 'bg-surface-subtle border-border text-content-muted hover:text-content'
                  }`}
                >
                  Affordable (1%)
                </button>
                <button
                  type="button"
                  onClick={() => setGstMode('CUSTOM')}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer ${
                    gstMode === 'CUSTOM'
                      ? 'bg-accent text-white border-accent shadow-2xs'
                      : 'bg-surface-subtle border-border text-content-muted hover:text-content'
                  }`}
                >
                  Custom GST
                </button>
              </div>

              {gstMode === 'CUSTOM' && (
                <div className="grid grid-cols-2 gap-2 pt-1 bg-surface-subtle p-2.5 rounded-xl border border-border">
                  <div>
                    <label className="block text-[10px] font-bold text-content-muted mb-1 font-mono">Custom GST %</label>
                    <input
                      type="number"
                      step="0.5"
                      value={customGstRate}
                      onChange={(e) => setCustomGstRate(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs font-mono font-bold text-content"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-content-muted mb-1 font-mono">Direct ₹ Override (Optional)</label>
                    <input
                      type="number"
                      placeholder="e.g. 260000"
                      value={customGstAmountOverride}
                      onChange={(e) => setCustomGstAmountOverride(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs font-mono font-bold text-content"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Legal & Scrutiny Fee */}
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-content-muted uppercase font-mono">
                  Legal Documentation & Scrutiny Fee (₹)
                </label>
                <span className="font-mono text-xs font-bold text-content">{formatINRFull(legalCharges)}</span>
              </div>
              <input
                type="number"
                step="5000"
                value={legalCharges}
                onChange={(e) => setLegalCharges(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-surface-subtle border border-border rounded-xl text-xs font-mono font-bold text-content"
              />
            </div>
          </div>

          {/* Card 4: Ancillary, Infrastructure & Society Charges */}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xs font-bold text-content font-display uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" />
                Development, Corpus & Infrastructure
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-content-muted mb-1 uppercase font-mono">
                  Covered Car Parking (₹)
                </label>
                <input
                  type="number"
                  step="25000"
                  value={parkingCharges}
                  onChange={(e) => setParkingCharges(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-mono font-bold text-content"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-content-muted mb-1 uppercase font-mono">
                  Society Corpus / Sinking Fund (₹)
                </label>
                <input
                  type="number"
                  step="25000"
                  value={societyDevCharges}
                  onChange={(e) => setSocietyDevCharges(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-mono font-bold text-content"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-content-muted mb-1 uppercase font-mono">
                  Clubhouse / Amenities Fee (₹)
                </label>
                <input
                  type="number"
                  step="10000"
                  value={clubhouseCharges}
                  onChange={(e) => setClubhouseCharges(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-mono font-bold text-content"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-content-muted mb-1 uppercase font-mono">
                  Water / Electricity / Gas Infra (₹)
                </label>
                <input
                  type="number"
                  step="10000"
                  value={infraCharges}
                  onChange={(e) => setInfraCharges(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-mono font-bold text-content"
                />
              </div>
            </div>

            {/* Advance Maintenance Sub-Section */}
            <div className="pt-3 border-t border-border space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-content">Advance Maintenance</span>
                <span className="font-mono font-bold text-xs text-content">
                  {formatINRFull(costBreakdown.advanceMaintenanceCharges)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMaintenanceMode('CALCULATED')}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer ${
                    maintenanceMode === 'CALCULATED'
                      ? 'bg-accent text-white border-accent shadow-2xs'
                      : 'bg-surface-subtle border-border text-content-muted hover:text-content'
                  }`}
                >
                  Rate × Months × Carpet
                </button>
                <button
                  type="button"
                  onClick={() => setMaintenanceMode('LUMP_SUM')}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer ${
                    maintenanceMode === 'LUMP_SUM'
                      ? 'bg-accent text-white border-accent shadow-2xs'
                      : 'bg-surface-subtle border-border text-content-muted hover:text-content'
                  }`}
                >
                  Lump Sum ₹
                </button>
              </div>

              {maintenanceMode === 'CALCULATED' ? (
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-content-muted mb-1 font-mono">Tenure (Months)</label>
                    <select
                      value={advanceMaintenanceMonths}
                      onChange={(e) => setAdvanceMaintenanceMonths(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-surface-subtle border border-border rounded-lg text-xs font-semibold text-content"
                    >
                      <option value={6}>6 Months</option>
                      <option value={12}>12 Months (1 Year)</option>
                      <option value={24}>24 Months (2 Years)</option>
                      <option value={36}>36 Months (3 Years)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-content-muted mb-1 font-mono">Rate (₹/sqft/mo)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={advanceMaintenanceRatePerSqft}
                      onChange={(e) => setAdvanceMaintenanceRatePerSqft(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-surface-subtle border border-border rounded-lg text-xs font-mono font-bold text-content"
                    />
                  </div>
                </div>
              ) : (
                <div className="pt-1">
                  <label className="block text-[10px] font-bold text-content-muted mb-1 font-mono">Lump Sum Advance Maintenance (₹)</label>
                  <input
                    type="number"
                    step="5000"
                    value={advanceMaintenanceLumpSum}
                    onChange={(e) => setAdvanceMaintenanceLumpSum(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-surface-subtle border border-border rounded-lg text-xs font-mono font-bold text-content"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Card 5: Dynamic Custom Line Items ("+ Add Custom Fee") */}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xs font-bold text-content font-display uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-accent" />
                Custom Add-On Line Items
              </h3>
              <span className="font-mono text-xs font-bold text-accent">
                +{formatINRFull(costBreakdown.customChargesTotal)}
              </span>
            </div>

            {/* Existing Custom Charges List */}
            {customCharges.length > 0 && (
              <div className="space-y-2">
                {customCharges.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2.5 bg-surface-subtle rounded-xl border border-border text-xs">
                    <span className="font-semibold text-content">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-content">{formatINRFull(item.amount)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomCharge(item.id)}
                        className="text-status-danger hover:text-status-danger/80 p-1 cursor-pointer"
                        title="Delete line item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Line Item Input Form */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs pt-2">
              <div className="sm:col-span-7">
                <input
                  type="text"
                  placeholder="Charge Name (e.g. Modular Kitchen, Solar Setup)"
                  value={newChargeName}
                  onChange={(e) => setNewChargeName(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-medium text-content focus:outline-hidden focus:border-accent"
                />
              </div>
              <div className="sm:col-span-3">
                <input
                  type="number"
                  placeholder="Amount (₹)"
                  value={newChargeAmount}
                  onChange={(e) => setNewChargeAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-mono font-bold text-content focus:outline-hidden focus:border-accent"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddCustomCharge}
                  className="w-full h-full py-2 bg-primary text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 hover:bg-primary-light transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Breakdown Output, Financial Scheduling, Loan Simulator (6 Cols, Sticky) */}
        <div className="lg:col-span-6 space-y-5 lg:sticky lg:top-24">
          
          {/* Navigation View Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-surface-subtle border border-border rounded-2xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('BREAKDOWN')}
              className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'BREAKDOWN'
                  ? 'bg-surface text-content shadow-xs border border-border'
                  : 'text-content-muted hover:text-content'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-accent" />
              <span>Cost Breakdown</span>
            </button>

            <button
              onClick={() => setActiveTab('SCHEDULE')}
              className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'SCHEDULE'
                  ? 'bg-surface text-content shadow-xs border border-border'
                  : 'text-content-muted hover:text-content'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-accent" />
              <span>Milestones (CLP)</span>
            </button>

            <button
              onClick={() => setActiveTab('LOAN')}
              className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'LOAN'
                  ? 'bg-surface text-content shadow-xs border border-border'
                  : 'text-content-muted hover:text-content'
              }`}
            >
              <Landmark className="w-3.5 h-3.5 text-accent" />
              <span>Loan & EMI</span>
            </button>

            <button
              onClick={() => setActiveTab('SAVED')}
              className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'SAVED'
                  ? 'bg-surface text-content shadow-xs border border-border'
                  : 'text-content-muted hover:text-content'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 text-accent" />
              <span>Saved ({savedQuotes.length})</span>
            </button>
          </div>

          {/* TAB 1: ITEMIZED COST BREAKDOWN */}
          {activeTab === 'BREAKDOWN' && (
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-content-muted font-mono">
                    MahaRERA Acquisition Ledger
                  </span>
                  <h3 className="text-base font-extrabold text-content font-display">
                    All-In Net Capitalized Total (C_all-in)
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold bg-status-success-surface text-status-success border border-status-success/30 px-2.5 py-1 rounded-full shadow-2xs">
                    MahaRERA Compliant
                  </span>
                </div>
              </div>

              {/* Allocation Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono font-semibold text-content-muted">
                  <span>Valuation Composition</span>
                  <span className="text-accent font-bold">+{costBreakdown.percentageOverAgreement}% Statutory Loading</span>
                </div>
                <div className="h-2.5 w-full bg-surface-subtle rounded-full overflow-hidden flex border border-border">
                  <div
                    style={{ width: `${Math.round((costBreakdown.agreementValue / costBreakdown.totalAllInCost) * 100)}%` }}
                    className="bg-accent h-full"
                    title={`Agreement Value: ${formatINR(costBreakdown.agreementValue)}`}
                  />
                  <div
                    style={{ width: `${Math.round((costBreakdown.taxAndLegalTotal / costBreakdown.totalAllInCost) * 100)}%` }}
                    className="bg-status-success h-full"
                    title={`Statutory Taxes & Legal: ${formatINR(costBreakdown.taxAndLegalTotal)}`}
                  />
                  <div
                    style={{ width: `${Math.round((costBreakdown.amenitiesTotal / costBreakdown.totalAllInCost) * 100)}%` }}
                    className="bg-primary h-full"
                    title={`Amenities & Corpus: ${formatINR(costBreakdown.amenitiesTotal)}`}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-content-muted pt-0.5">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-accent inline-block" /> Base ({Math.round((costBreakdown.agreementValue / costBreakdown.totalAllInCost) * 100)}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-status-success inline-block" /> Taxes ({Math.round((costBreakdown.taxAndLegalTotal / costBreakdown.totalAllInCost) * 100)}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary inline-block" /> Amenities ({Math.round((costBreakdown.amenitiesTotal / costBreakdown.totalAllInCost) * 100)}%)
                  </span>
                </div>
              </div>

              {/* Itemized Rows */}
              <div className="space-y-2.5 text-xs">
                {/* 01. Agreement */}
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <div>
                    <span className="font-bold text-content">01. Base Agreement Value</span>
                    <span className="ml-2 text-[10px] font-mono text-content-muted">(@ ₹{costBreakdown.ratePerSqftAgreement}/sq.ft)</span>
                  </div>
                  <span className="font-mono font-extrabold text-sm text-content">{formatINRFull(agreementValue)}</span>
                </div>

                {/* 02. Floor Rise */}
                {costBreakdown.floorRiseCharges > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <div>
                      <span className="font-semibold text-content-muted">02. Floor Rise Charges</span>
                      <span className="ml-2 text-[10px] font-mono text-accent font-bold">(Floor {floorNumber}, {floorNumber - baseFloorThreshold} fls @ ₹{floorRiseRate})</span>
                    </div>
                    <span className="font-mono font-bold text-sm text-content">{formatINRFull(costBreakdown.floorRiseCharges)}</span>
                  </div>
                )}

                {/* 03. Stamp Duty */}
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <div>
                    <span className="font-semibold text-content-muted">03. Maharashtra Stamp Duty</span>
                    <span className="ml-2 text-[10px] font-mono text-accent font-bold">({costBreakdown.stampDutyRate}%)</span>
                  </div>
                  <span className="font-mono font-bold text-sm text-content">{formatINRFull(costBreakdown.stampDutyAmount)}</span>
                </div>

                {/* 04. Registration */}
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <div>
                    <span className="font-semibold text-content-muted">04. MahaRERA Registration Fee</span>
                    <span className="ml-2 text-[10px] font-mono text-content-muted">(1% capped at ₹30k)</span>
                  </div>
                  <span className="font-mono font-bold text-sm text-content">{formatINRFull(costBreakdown.registrationFee)}</span>
                </div>

                {/* 05. GST */}
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <div>
                    <span className="font-semibold text-content-muted">05. Statutory GST</span>
                    <span className="ml-2 text-[10px] font-mono text-status-success font-bold">
                      ({costBreakdown.gstRate === 0 ? '0% Ready OC Exempt' : `${costBreakdown.gstRate}%`})
                    </span>
                  </div>
                  <span className="font-mono font-bold text-sm text-content">{formatINRFull(costBreakdown.gstAmount)}</span>
                </div>

                {/* 06. Legal */}
                {costBreakdown.legalAndDocumentationCharges > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="font-semibold text-content-muted">06. Legal Scrutiny & Documentation</span>
                    <span className="font-mono font-bold text-sm text-content">{formatINRFull(costBreakdown.legalAndDocumentationCharges)}</span>
                  </div>
                )}

                {/* 07. Parking */}
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="font-semibold text-content-muted">07. Covered Parking Charges</span>
                  <span className="font-mono font-bold text-sm text-content">{formatINRFull(parkingCharges)}</span>
                </div>

                {/* 08. Society Corpus */}
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="font-semibold text-content-muted">08. Society Corpus / Development Fund</span>
                  <span className="font-mono font-bold text-sm text-content">{formatINRFull(societyDevCharges)}</span>
                </div>

                {/* 09. Clubhouse */}
                {costBreakdown.clubhouseCharges > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="font-semibold text-content-muted">09. Clubhouse & Amenities Membership</span>
                    <span className="font-mono font-bold text-sm text-content">{formatINRFull(costBreakdown.clubhouseCharges)}</span>
                  </div>
                )}

                {/* 10. Infrastructure */}
                {costBreakdown.infrastructureCharges > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="font-semibold text-content-muted">10. Water / Electricity / Gas Infra</span>
                    <span className="font-mono font-bold text-sm text-content">{formatINRFull(costBreakdown.infrastructureCharges)}</span>
                  </div>
                )}

                {/* 11. Advance Maintenance */}
                {costBreakdown.advanceMaintenanceCharges > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <div>
                      <span className="font-semibold text-content-muted">11. Advance Maintenance</span>
                      {maintenanceMode === 'CALCULATED' && (
                        <span className="ml-2 text-[10px] font-mono text-content-muted">({advanceMaintenanceMonths}M @ ₹{advanceMaintenanceRatePerSqft}/sqft)</span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-sm text-content">{formatINRFull(costBreakdown.advanceMaintenanceCharges)}</span>
                  </div>
                )}

                {/* 12. Dynamic Custom Charges */}
                {customCharges.map((item, idx) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-border">
                    <span className="font-semibold text-content-muted">{12 + idx}. {item.name}</span>
                    <span className="font-mono font-bold text-sm text-content">{formatINRFull(item.amount)}</span>
                  </div>
                ))}
              </div>

              {/* Grand Total Hero Box */}
              <div className="p-5 bg-surface-subtle rounded-2xl border-2 border-accent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-accent font-display flex items-center gap-1.5">
                    <Award className="w-4 h-4" /> Grand Capitalized Net Total
                  </span>
                  <div className="text-xs text-content-muted mt-0.5">
                    Effective Rate: <strong className="font-mono text-content">₹{costBreakdown.ratePerSqftAllIn} / sq.ft</strong> (all levies included)
                  </div>
                </div>
                <div className="font-mono text-2xl lg:text-3xl font-extrabold text-content">
                  {formatINRFull(costBreakdown.totalAllInCost)}
                </div>
              </div>

              {/* Notes Box */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-[11px] font-bold text-content-muted uppercase font-mono">
                  Quotation Notes & Special Inclusions
                </label>
                <textarea
                  rows={2}
                  value={quotationNotes}
                  onChange={(e) => setQuotationNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-xl text-xs text-content focus:outline-hidden focus:border-accent"
                />
              </div>
            </div>
          )}

          {/* TAB 2: MAHARERA MILESTONE PAYMENT SCHEDULE (CLP) */}
          {activeTab === 'SCHEDULE' && (
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-content-muted font-mono">
                    Construction-Linked Plan (CLP)
                  </span>
                  <h3 className="text-base font-extrabold text-content font-display">
                    MahaRERA Stage-Wise Milestone Schedule
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleResetMilestones}
                  className="text-xs font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Schedule
                </button>
              </div>

              <p className="text-xs text-content-muted">
                Standard payment distribution based on Agreement Value of <strong>{formatINRFull(agreementValue)}</strong>. Adjust percentages per developer demand letter:
              </p>

              <div className="space-y-3 text-xs">
                {milestones.map((ms, index) => {
                  const stageAmount = Math.round((agreementValue * ms.percentage) / 100);
                  return (
                    <div key={ms.id} className="p-3 bg-surface-subtle rounded-xl border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-content font-mono mr-2">Stage {index + 1}.</span>
                          <span className="font-bold text-content">{ms.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-sm text-accent">{formatINRFull(stageAmount)}</span>
                          <span className="font-mono text-[11px] font-bold bg-surface px-2 py-0.5 rounded-lg border border-border">
                            {ms.percentage}%
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-content-muted">
                        {ms.stageDescription}
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <input
                          type="range"
                          min="0"
                          max="40"
                          step="1"
                          value={ms.percentage}
                          onChange={(e) => handleMilestonePercentageChange(ms.id, Number(e.target.value))}
                          className="w-full accent-accent cursor-pointer"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Percentage Check */}
              <div className="p-3 bg-surface-subtle rounded-xl border border-border flex items-center justify-between text-xs">
                <span className="font-bold text-content">Total Milestones Sum:</span>
                <span className={`font-mono font-bold ${milestones.reduce((a, b) => a + b.percentage, 0) === 100 ? 'text-status-success' : 'text-status-danger'}`}>
                  {milestones.reduce((a, b) => a + b.percentage, 0)}% (should equal 100%)
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: HOME LOAN & DOWN PAYMENT ESTIMATOR */}
          {activeTab === 'LOAN' && (
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-content-muted font-mono">
                    Financial Structuring
                  </span>
                  <h3 className="text-base font-extrabold text-content font-display">
                    Home Loan & Down Payment Calculator
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold bg-accent-soft text-accent-text border border-accent/20 px-2.5 py-1 rounded-full">
                  SBI / HDFC Rates
                </span>
              </div>

              <div className="space-y-4 text-xs">
                {/* LTV Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold">
                    <span className="text-content-muted font-mono uppercase">Bank Funding (LTV %)</span>
                    <span className="font-mono text-accent">{loanLtv}% Loan on Agreement</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="90"
                    step="5"
                    value={loanLtv}
                    onChange={(e) => setLoanLtv(Number(e.target.value))}
                    className="w-full accent-accent cursor-pointer"
                  />
                </div>

                {/* Interest Rate & Tenure */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-content-muted mb-1 uppercase font-mono">
                      Interest Rate (% p.a.)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={loanInterestRate}
                      onChange={(e) => setLoanInterestRate(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-mono font-bold text-content"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-content-muted mb-1 uppercase font-mono">
                      Loan Tenure (Years)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="30"
                      value={loanTenureYears}
                      onChange={(e) => setLoanTenureYears(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-mono font-bold text-content"
                    />
                  </div>
                </div>

                {/* Loan Outputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-4 bg-surface-subtle rounded-xl border border-border space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-content-muted font-mono">
                      Eligible Bank Loan
                    </span>
                    <div className="font-mono text-xl font-extrabold text-content">
                      {formatINRFull(loanBreakdown.eligibleLoanAmount)}
                    </div>
                    <span className="text-[10px] text-content-muted">Based on {loanLtv}% Agreement Value</span>
                  </div>

                  <div className="p-4 bg-surface-subtle rounded-xl border border-border space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-content-muted font-mono">
                      Estimated Monthly EMI
                    </span>
                    <div className="font-mono text-xl font-extrabold text-accent">
                      {formatINRFull(loanBreakdown.monthlyEMI)} <span className="text-xs text-content-muted font-normal">/ mo</span>
                    </div>
                    <span className="text-[10px] text-content-muted">Tenure: {loanTenureYears} Years ({loanTenureYears * 12} EMIs)</span>
                  </div>

                  <div className="p-4 bg-status-success-surface rounded-xl border border-status-success/30 space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-status-success font-mono">
                      Required Self-Funded Down Payment
                    </span>
                    <div className="font-mono text-2xl font-extrabold text-status-success">
                      {formatINRFull(loanBreakdown.requiredDownPayment)}
                    </div>
                    <span className="text-[11px] text-content-muted block">
                      Includes <strong>{formatINRFull(costBreakdown.taxAndLegalTotal)}</strong> statutory taxes and <strong>{formatINRFull(costBreakdown.amenitiesTotal)}</strong> amenities & corpus funds which cannot be funded by bank loan.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SAVED QUOTES REPOSITORY */}
          {activeTab === 'SAVED' && (
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-content-muted font-mono">
                    Quotation Archive
                  </span>
                  <h3 className="text-base font-extrabold text-content font-display">
                    Saved Client Proposals
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-accent">
                  {savedQuotes.length} Saved
                </span>
              </div>

              {savedQuotes.length === 0 ? (
                <div className="p-8 text-center bg-surface-subtle rounded-xl border border-border text-xs text-content-muted space-y-2">
                  <Save className="w-6 h-6 text-content-muted mx-auto" />
                  <p>No saved quotes yet. Click "Save Quote" at the top toolbar to store your custom calculations.</p>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  {savedQuotes.map((q) => (
                    <div
                      key={q.id}
                      onClick={() => {
                        setProjectName(q.projectName);
                        setClientName(q.clientName);
                        setAgreementValue(q.agreementValue);
                        setCarpetAreaSqft(q.carpetAreaSqft);
                        setSelectedPresetMarket(q.market);
                        setTowerUnit(q.unitNo);
                        setActiveTab('BREAKDOWN');
                        showToast(`Loaded quote for ${q.clientName}`);
                      }}
                      className="p-3.5 bg-surface-subtle hover:bg-surface border border-border rounded-xl flex items-center justify-between transition-all cursor-pointer shadow-2xs"
                    >
                      <div>
                        <div className="font-bold text-content text-sm">{q.clientName}</div>
                        <div className="text-[11px] text-content-muted">
                          {q.projectName} ({q.market}) • {q.unitNo} • {q.carpetAreaSqft} sqft
                        </div>
                        <div className="text-[10px] font-mono text-content-muted mt-1">{q.savedAt}</div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-content-muted block font-mono">All-In Total</span>
                          <span className="font-mono font-extrabold text-sm text-accent">{formatINR(q.totalAllInCost)}</span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteSavedQuote(q.id, e)}
                          className="text-content-muted hover:text-status-danger p-1.5 cursor-pointer"
                          title="Delete quote"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
         OFFICIAL ZAMZAM REAL ESTATE STATUTORY COST SHEET (PRINT / PDF EXPORT ONLY)
         Rendered exclusively during window.print() / Save as PDF
         ========================================================================= */}
      <div className="print-only font-sans text-slate-900 bg-white p-4">
        {/* Document Header with Official ZamZam Branding */}
        <div className="zamzam-print-header">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#1B4332] text-white flex items-center justify-center font-bold text-base">
                ZP
              </div>
              <div>
                <h1 className="zamzam-print-brand leading-none">ZAMZAM PROPERTIES</h1>
                <p className="text-[9pt] font-semibold text-slate-600 tracking-wide mt-0.5">
                  MAHARASHTRA STATUTORY PROPERTY ADVISORY
                </p>
              </div>
            </div>
            <div className="mt-2 text-[8pt] text-slate-500 font-mono space-y-0.5">
              <p>MahaRERA Registration: <strong className="text-slate-800 font-bold">A52000028714</strong></p>
              <p>Office: Sector 35, Kharghar &amp; Sector 14, Taloja Phase 1, Navi Mumbai</p>
              <p>Contact: +91 98201 23456 • advisory@zamzamproperties.in</p>
            </div>
          </div>

          <div className="text-right">
            <span className="zamzam-print-badge">OFFICIAL STATUTORY QUOTATION</span>
            <div className="mt-2 text-[8pt] font-mono text-slate-600 space-y-0.5">
              <p>Ref: <strong className="text-slate-900 font-bold">ZP-COST-{new Date().getFullYear()}-{towerUnit.replace(/[^a-zA-Z0-9]/g, '') || '01'}</strong></p>
              <p>Date: <strong className="text-slate-900 font-bold">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></p>
              <p>Valid For: <strong>14 Days from issuance</strong></p>
            </div>
          </div>
        </div>

        {/* Client & Unit Specifications Box */}
        <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded-lg p-3 bg-slate-50 mb-4 text-[9pt]">
          <div className="space-y-1 border-r border-slate-200 pr-3">
            <p className="text-[7.5pt] font-bold uppercase tracking-wider text-slate-500 font-mono">Purchaser Profile</p>
            <p className="font-bold text-slate-900 text-[10pt]">{clientName || 'Valued Purchaser'}</p>
            <p className="text-slate-600">Assigned Senior Advisor: <strong>{preparedBy || 'ZamZam Executive Desk'}</strong></p>
            <p className="text-slate-600">Structuring Mode: <strong>{stampDutyMode === 'FEMALE_5' ? 'Female Concession (5% Stamp Duty)' : 'Standard Maharashtra Levies'}</strong></p>
          </div>

          <div className="space-y-1 pl-2">
            <p className="text-[7.5pt] font-bold uppercase tracking-wider text-slate-500 font-mono">Property &amp; Typology Specifications</p>
            <p className="font-bold text-slate-900 text-[10pt]">{projectName} ({selectedPresetMarket})</p>
            <p className="text-slate-600">Unit / Flat: <strong>{towerUnit}</strong> • Floor: <strong>{floorNumber}</strong></p>
            <p className="text-slate-600">RERA Carpet Area: <strong>{carpetAreaSqft} sq.ft</strong> (Rate: <strong>₹{costBreakdown.ratePerSqftAgreement}/sq.ft</strong>)</p>
          </div>
        </div>

        {/* Itemized Statutory & Capitalized Breakdown Table */}
        <div className="no-break-inside mb-4">
          <h2 className="text-[10pt] font-extrabold uppercase tracking-wide text-[#1B4332] border-b border-[#1B4332] pb-1 font-mono">
            1. Statutory Capitalized Acquisition Cost Breakdown (C_all-in)
          </h2>
          <table className="zamzam-print-table">
            <thead>
              <tr>
                <th style={{ width: '8%', textAlign: 'center' }}>Sr</th>
                <th style={{ width: '47%', textAlign: 'left' }}>Component Description</th>
                <th style={{ width: '22%', textAlign: 'left' }}>Statutory Rule / Basis</th>
                <th style={{ width: '23%', textAlign: 'right' }}>Amount (INR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: 'center' }}>1</td>
                <td><strong>Base Agreement Value (C_agr)</strong></td>
                <td>{carpetAreaSqft} sq.ft @ ₹{costBreakdown.ratePerSqftAgreement}/sq.ft</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatINRFull(agreementValue)}</td>
              </tr>
              {costBreakdown.floorRiseCharges > 0 && (
                <tr>
                  <td style={{ textAlign: 'center' }}>2</td>
                  <td>Floor Rise Premium</td>
                  <td>Floor {floorNumber} (Above Fl {baseFloorThreshold})</td>
                  <td style={{ textAlign: 'right' }}>{formatINRFull(costBreakdown.floorRiseCharges)}</td>
                </tr>
              )}
              <tr>
                <td style={{ textAlign: 'center' }}>3</td>
                <td>Maharashtra Stamp Duty</td>
                <td>{costBreakdown.stampDutyRate}% on Capitalized Value</td>
                <td style={{ textAlign: 'right' }}>{formatINRFull(costBreakdown.stampDutyAmount)}</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center' }}>4</td>
                <td>MahaRERA Registration Fee</td>
                <td>Govt of Maharashtra Standard Cap</td>
                <td style={{ textAlign: 'right' }}>{formatINRFull(costBreakdown.registrationFee)}</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center' }}>5</td>
                <td>Statutory GST</td>
                <td>{costBreakdown.gstRate}% Statutory Levy</td>
                <td style={{ textAlign: 'right' }}>{formatINRFull(costBreakdown.gstAmount)}</td>
              </tr>
              {costBreakdown.legalAndDocumentationCharges > 0 && (
                <tr>
                  <td style={{ textAlign: 'center' }}>6</td>
                  <td>Legal Scrutiny &amp; Title Verification</td>
                  <td>Fixed Documentation Fee</td>
                  <td style={{ textAlign: 'right' }}>{formatINRFull(costBreakdown.legalAndDocumentationCharges)}</td>
                </tr>
              )}
              {costBreakdown.parkingCharges > 0 && (
                <tr>
                  <td style={{ textAlign: 'center' }}>7</td>
                  <td>Covered / Stilt Parking Slot</td>
                  <td>Dedicated Allotment</td>
                  <td style={{ textAlign: 'right' }}>{formatINRFull(costBreakdown.parkingCharges)}</td>
                </tr>
              )}
              {costBreakdown.societyDevCharges > 0 && (
                <tr>
                  <td style={{ textAlign: 'center' }}>8</td>
                  <td>Society Corpus &amp; Development Fund</td>
                  <td>One-time society formation sinking fund</td>
                  <td style={{ textAlign: 'right' }}>{formatINRFull(costBreakdown.societyDevCharges)}</td>
                </tr>
              )}
              {costBreakdown.infrastructureCharges > 0 && (
                <tr>
                  <td style={{ textAlign: 'center' }}>9</td>
                  <td>Infra (Water/Electricity/MGL Gas Connection)</td>
                  <td>Statutory Utility Metering</td>
                  <td style={{ textAlign: 'right' }}>{formatINRFull(costBreakdown.infrastructureCharges)}</td>
                </tr>
              )}
              {costBreakdown.clubhouseCharges > 0 && (
                <tr>
                  <td style={{ textAlign: 'center' }}>10</td>
                  <td>Clubhouse &amp; Lifestyle Amenities</td>
                  <td>Lifetime Membership Corpus</td>
                  <td style={{ textAlign: 'right' }}>{formatINRFull(costBreakdown.clubhouseCharges)}</td>
                </tr>
              )}
              {costBreakdown.advanceMaintenanceCharges > 0 && (
                <tr>
                  <td style={{ textAlign: 'center' }}>11</td>
                  <td>Advance Maintenance ({advanceMaintenanceMonths} Months)</td>
                  <td>Pre-handover facility upkeep</td>
                  <td style={{ textAlign: 'right' }}>{formatINRFull(costBreakdown.advanceMaintenanceCharges)}</td>
                </tr>
              )}
              {customCharges.map((c, i) => (
                <tr key={c.id}>
                  <td style={{ textAlign: 'center' }}>{12 + i}</td>
                  <td>{c.name}</td>
                  <td>{c.category}</td>
                  <td style={{ textAlign: 'right' }}>{formatINRFull(c.amount)}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td colSpan={2} style={{ fontWeight: '800' }}>
                  GRAND CAPITALIZED ALL-IN COST (C_all-in)
                </td>
                <td style={{ fontSize: '9pt', color: '#1B4332', fontWeight: 'bold' }}>
                  ₹{costBreakdown.ratePerSqftAllIn}/sq.ft (+{costBreakdown.percentageOverAgreement}%)
                </td>
                <td style={{ textAlign: 'right', fontWeight: '800', fontSize: '11pt' }}>
                  {formatINRFull(costBreakdown.totalAllInCost)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bank Loan Structuring Summary */}
        <div className="no-break-inside grid grid-cols-3 gap-3 border border-slate-300 rounded-lg p-3 bg-slate-50 mb-4 text-[8.5pt]">
          <div className="space-y-0.5">
            <span className="text-[7pt] font-bold text-slate-500 uppercase tracking-wider font-mono">Sanctioned Bank Loan</span>
            <p className="text-[11pt] font-extrabold text-slate-900 font-mono">{formatINRFull(loanBreakdown.eligibleLoanAmount)}</p>
            <p className="text-slate-500 text-[7.5pt]">{loanLtv}% of Agreement Value</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[7pt] font-bold text-slate-500 uppercase tracking-wider font-mono">Estimated Monthly EMI</span>
            <p className="text-[11pt] font-extrabold text-[#1B4332] font-mono">{formatINRFull(loanBreakdown.monthlyEMI)} <span className="text-[8pt] text-slate-500 font-normal">/mo</span></p>
            <p className="text-slate-500 text-[7.5pt]">{loanTenureYears} Years @ {loanInterestRate}% ROI</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[7pt] font-bold text-slate-500 uppercase tracking-wider font-mono">Required Cash Down Payment</span>
            <p className="text-[11pt] font-extrabold text-amber-700 font-mono">{formatINRFull(loanBreakdown.requiredDownPayment)}</p>
            <p className="text-slate-500 text-[7.5pt]">Margin Money + Statutory Levies</p>
          </div>
        </div>

        {/* MahaRERA Construction-Linked Payment Milestone Schedule */}
        <div className="no-break-inside mb-4">
          <h2 className="text-[10pt] font-extrabold uppercase tracking-wide text-[#1B4332] border-b border-[#1B4332] pb-1 font-mono">
            2. Standard MahaRERA Construction-Linked Milestone Schedule
          </h2>
          <table className="zamzam-print-table">
            <thead>
              <tr>
                <th style={{ width: '8%', textAlign: 'center' }}>Stage</th>
                <th style={{ width: '52%', textAlign: 'left' }}>Construction Milestone</th>
                <th style={{ width: '15%', textAlign: 'center' }}>% of Agreement</th>
                <th style={{ width: '25%', textAlign: 'right' }}>Milestone Demand (INR)</th>
              </tr>
            </thead>
            <tbody>
              {milestones.map((m, idx) => (
                <tr key={m.id || idx}>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>#{idx + 1}</td>
                  <td>
                    <strong>{m.name}</strong>
                    {m.stageDescription && <div style={{ fontSize: '7.5pt', color: '#64748b' }}>{m.stageDescription}</div>}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{m.percentage}%</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {formatINRFull((agreementValue * m.percentage) / 100)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Statutory Disclaimers & Signatures */}
        <div className="no-break-inside pt-3 border-t border-slate-300 text-[8pt] text-slate-600 space-y-4">
          {quotationNotes && (
            <div className="p-2 rounded border border-slate-200 bg-slate-50 text-[8pt]">
              <strong>Advisory Notes:</strong> {quotationNotes}
            </div>
          )}

          <p className="text-[7.5pt] leading-relaxed text-slate-500 italic">
            <strong>Statutory Terms &amp; Compliance:</strong> This quotation is prepared in accordance with the Maharashtra Stamp Act (Schedule I), MahaRERA Registration Rules, and prevailing GST Circulars. Statutory taxes and stamp duty are subject to government revisions at the actual time of registration. Bank loan sanctions are subject to individual borrower eligibility criteria and property valuation.
          </p>

          <div className="grid grid-cols-2 pt-6 gap-8 text-[8.5pt]">
            <div className="border-t border-slate-400 pt-1">
              <p className="font-bold text-slate-800">Purchaser Acknowledgment</p>
              <p className="text-slate-500 text-[7.5pt]">Signature: ______________________</p>
            </div>
            <div className="border-t border-slate-400 pt-1 text-right">
              <p className="font-bold text-slate-800">For ZamZam Properties</p>
              <p className="text-slate-500 text-[7.5pt]">Authorized Real Estate Advisor Stamp &amp; Sign</p>
            </div>
          </div>
        </div>

        <div className="zamzam-print-footer">
          ZamZam Real Estate • MahaRERA Reg: A52000028714 • Kharghar &amp; Taloja Property Specialists • info@zamzamproperties.in
        </div>
      </div>
    </div>
  );
}
