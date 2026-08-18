'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Building2, 
  MapPin, 
  Sliders, 
  Check, 
  Plus, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  RefreshCw, 
  TrendingUp, 
  ShieldCheck, 
  User, 
  ExternalLink,
  ChevronRight,
  Layers,
  Zap
} from 'lucide-react';

export default function MatchmakerConsolePage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('custom');
  const [loading, setLoading] = useState(false);
  const [matchedResults, setMatchedResults] = useState<any[]>([]);

  // Live Requirement Adjuster State
  const [budgetMax, setBudgetMax] = useState<number>(7500000);
  const [bhkPreferences, setBhkPreferences] = useState<number[]>([2]);
  const [possessionPreference, setPossessionPreference] = useState<string>('ANY');
  const [minCarpetSqft, setMinCarpetSqft] = useState<number>(600);
  const [purpose, setPurpose] = useState<string>('self_use');

  // Client Portal Selection Basket
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [scoreModalData, setScoreModalData] = useState<any | null>(null);

  // Portal Generation Modal State
  const [generatingPortal, setGeneratingPortal] = useState(false);
  const [generatedPortalData, setGeneratedPortalData] = useState<any | null>(null);
  const [copiedPortalUrl, setCopiedPortalUrl] = useState(false);

  const handleGeneratePortal = async () => {
    if (selectedUnitIds.length === 0) {
      alert('Please select at least 1 property in your basket.');
      return;
    }
    setGeneratingPortal(true);
    try {
      const activeLeadId = selectedLeadId !== 'custom' ? selectedLeadId : leads[0]?.id;
      const res = await fetch('/api/v1/portals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: activeLeadId,
          selectedUnitIds,
          customMessage: 'Here are the verified properties we handpicked and audited for your specific requirements.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedPortalData(data.data);
      } else {
        alert(data.error || 'Failed to create client portal.');
      }
    } catch (err: any) {
      alert(err.message || 'Error generating client portal.');
    } finally {
      setGeneratingPortal(false);
    }
  };

  // Initial Fetch of Leads
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch('/api/v1/leads');
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          setLeads(data.data);
          // Default to first lead with requirements if available
          const firstLead = data.data[0];
          if (firstLead) {
            setSelectedLeadId(firstLead.id);
            if (firstLead.requirements?.[0]) {
              const req = firstLead.requirements[0];
              setBudgetMax(req.budgetMax || 7500000);
              setBhkPreferences(JSON.parse(req.bhkPreferencesJson || '[2]'));
              setPossessionPreference(req.possessionPreference || 'ANY');
              setMinCarpetSqft(req.minCarpetSqft || 600);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching leads:', err);
      }
    };
    fetchLeads();
  }, []);

  // Run Matching Algorithm whenever parameters change
  const runMatching = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/matching/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetMax,
          bhkPreferences,
          possessionPreference,
          minCarpetSqft,
          purpose,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMatchedResults(data.data);
        // Pre-select top 2 matches if basket is empty
        if (selectedUnitIds.length === 0 && data.data.length > 0) {
          setSelectedUnitIds(data.data.slice(0, 2).map((m: any) => m.unit.id));
        }
      }
    } catch (err) {
      console.error('Error matching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runMatching();
  }, [budgetMax, bhkPreferences, possessionPreference, minCarpetSqft, purpose]);

  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    if (leadId === 'custom') return;

    const lead = leads.find((l) => l.id === leadId);
    if (lead?.requirements?.[0]) {
      const req = lead.requirements[0];
      setBudgetMax(req.budgetMax);
      setBhkPreferences(JSON.parse(req.bhkPreferencesJson || '[2]'));
      setPossessionPreference(req.possessionPreference || 'ANY');
      setMinCarpetSqft(req.minCarpetSqft || 600);
    }
  };

  const toggleBhk = (bhk: number) => {
    setBhkPreferences((prev) =>
      prev.includes(bhk) ? (prev.length > 1 ? prev.filter((b) => b !== bhk) : prev) : [...prev, bhk]
    );
  };

  const toggleUnitSelection = (unitId: string) => {
    setSelectedUnitIds((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#b59658]/20">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1b202c] border border-[#b59658]/40 text-[#ccb67b] text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#b59658]" />
            Core Module: Requirements-to-Property Matchmaker
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white font-display">
            Consultative Property Matching Engine
          </h1>
          <p className="text-slate-400 text-xs mt-0.5 font-sans">
            Evaluates verified inventory against buyer requirements, statutory all-in costs ($C_{'{'}all-in{'}'}$), and transit scores.
          </p>
        </div>

        {/* Selected Basket Counter & Generate Button */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 px-4 rounded-xl bg-[#1b202c] border border-[#b59658]/30 text-xs text-slate-300 flex items-center gap-2 shadow-sm">
            <Layers className="w-4 h-4 text-[#ccb67b]" />
            <span>Curated Basket: <strong className="text-[#ccb67b] font-mono">{selectedUnitIds.length}</strong> Units</span>
          </div>

          <button
            onClick={handleGeneratePortal}
            disabled={generatingPortal || selectedUnitIds.length === 0}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] hover:opacity-95 text-[#12151f] text-xs font-extrabold transition-all flex items-center gap-2 shadow-lg shadow-[#b59658]/20 border border-[#ccb67b]/60 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5 text-[#12151f]" />
            {generatingPortal ? 'Generating Portal...' : '🚀 Generate Client Portal Link'}
          </button>
        </div>
      </div>

      {/* 2-Column Matchmaker Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Pane: Requirement Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-panel p-5 rounded-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#ccb67b]" />
                Buyer Profile
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">Live Sync</span>
            </div>

            {/* Buyer Selector Dropdown */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#ccb67b]" />
                Active Prospect Lead:
              </label>
              <select
                value={selectedLeadId}
                onChange={(e) => handleLeadSelect(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ccb67b] font-medium"
              >
                <option value="custom">⚡ Custom / Live Phone Discovery Call</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.fullName} ({l.phoneE164})
                  </option>
                ))}
              </select>
            </div>

            {/* Maximum Budget Slider */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-200">Max All-In Budget</label>
                <span className="font-mono text-[#ccb67b] font-bold text-sm">
                  ₹{(budgetMax / 100000).toFixed(1)} Lakhs
                </span>
              </div>
              <input
                type="range"
                min={3000000}
                max={15000000}
                step={50000}
                value={budgetMax}
                onChange={(e) => setBudgetMax(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#b59658]"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>₹30L (Taloja)</span>
                <span>₹75L (Kharghar)</span>
                <span>₹1.5Cr+</span>
              </div>
            </div>

            {/* BHK Checkboxes */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                BHK Configuration:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((b) => {
                  const active = bhkPreferences.includes(b);
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => toggleBhk(b)}
                      className={`p-2 rounded-xl text-xs font-bold transition-all border ${
                        active
                          ? 'bg-[#1b202c] text-[#ccb67b] border-[#b59658]/50 shadow-sm'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {b} BHK
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Possession Status Toggle */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Possession Timeline:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'ANY', label: 'Any' },
                  { id: 'READY_TO_MOVE', label: 'RTM (OC)' },
                  { id: 'UNDER_CONSTRUCTION', label: 'UC (<2026)' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setPossessionPreference(pos.id)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all border ${
                      possessionPreference === pos.id
                        ? 'bg-[#1b202c] text-[#ccb67b] border-[#b59658]/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Min Carpet Area Slider */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-300">Min Carpet Area</label>
                <span className="font-mono text-slate-200 font-bold">{minCarpetSqft} sq.ft</span>
              </div>
              <input
                type="range"
                min={350}
                max={1200}
                step={25}
                value={minCarpetSqft}
                onChange={(e) => setMinCarpetSqft(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#b59658]"
              />
            </div>
          </div>
        </div>

        {/* Right Pane: Ranked Matching Properties (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#ccb67b]" />
              Ranked Verified Inventory Matches ({matchedResults.length} Found)
            </h2>
            <span className="text-xs text-slate-400 font-medium">Sorted by Weighted Score</span>
          </div>

          {loading ? (
            <div className="glass-panel p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-[#ccb67b]" />
              <span>Calculating multi-factor property scores...</span>
            </div>
          ) : matchedResults.length === 0 ? (
            <div className="glass-panel p-12 text-center text-slate-400 text-sm space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-white font-semibold">No verified properties match your strict criteria.</p>
              <p className="text-xs text-slate-400">
                Try expanding the maximum budget or adding alternative BHK configurations.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {matchedResults.map((match: any, index: number) => {
                const { unit, score } = match;
                const isSelected = selectedUnitIds.includes(unit.id);
                const isPrime = score.tier === 'PRIME_MATCH';
                const isAlternative = score.tier === 'STRONG_ALTERNATIVE';

                return (
                  <div
                    key={unit.id}
                    className={`glass-panel p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                      isSelected
                        ? 'border-[#b59658]/80 bg-[#1b202c]/60'
                        : 'border-slate-800 hover:border-[#b59658]/40'
                    }`}
                  >
                    {/* Top Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Rank Pill */}
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            #{index + 1}
                          </span>
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-[#1b202c] text-[#ccb67b] border border-[#b59658]/40">
                            {unit.bhk} BHK
                          </span>
                          <h3 className="font-bold text-white text-base font-display">
                            {unit.project.projectName}
                          </h3>
                          <span className="text-xs font-mono text-slate-400">
                            (Unit {unit.unitNumber || 'N/A'})
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {unit.project.microMarket} • {unit.project.hasOccupancyCertificate ? 'OC Received' : 'Under Construction'}
                        </p>
                      </div>

                      {/* Match Score Badge */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setScoreModalData(match)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm border transition-all ${
                            isPrime
                              ? 'bg-[#1b202c] text-[#ccb67b] border-[#b59658]/50'
                              : isAlternative
                              ? 'bg-blue-950 text-blue-300 border-blue-700'
                              : 'bg-amber-950 text-amber-300 border-amber-800'
                          }`}
                          title="Click to view score breakdown"
                        >
                          <Zap className="w-3.5 h-3.5 text-[#b59658]" />
                          {score.totalScore}% MATCH
                          <Info className="w-3 h-3 ml-1 opacity-70" />
                        </button>
                      </div>
                    </div>

                    {/* Highlights & Trade-offs */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        {score.matchingHighlights.map((hl: string, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-[#1b202c] border border-[#b59658]/30 text-[#ccb67b] font-medium"
                          >
                            ✓ {hl}
                          </span>
                        ))}
                      </div>

                      {score.tradeOffs.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          {score.tradeOffs.map((to: string, i: number) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-amber-950/50 border border-amber-800/60 text-amber-300 font-medium"
                            >
                              ⚠️ {to}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Specs & Pricing Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Carpet Area</span>
                        <strong className="text-slate-200">{unit.carpetAreaSqft} sq.ft</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Floor</span>
                        <strong className="text-slate-200">{unit.floorNumber} of {unit.totalFloors}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Agreement Value</span>
                        <strong className="text-slate-300">₹{(unit.agreementValue / 100000).toFixed(2)}L</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Out-of-Pocket</span>
                        <strong className="text-[#ccb67b] font-extrabold">
                          ₹{(unit.allInTotalCost / 100000).toFixed(2)} Lakhs
                        </strong>
                      </div>
                    </div>

                    {/* Card Footer: Selection Basket Toggle */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px] font-mono">
                        MahaRERA: <strong className="text-slate-300">{unit.project.reraNumber}</strong>
                      </span>

                      <button
                        onClick={() => toggleUnitSelection(unit.id)}
                        className={`px-4 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 text-xs ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] text-[#12151f] shadow-md'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Selected in Basket
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Select for Client Portal
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Score Math Breakdown */}
      {scoreModalData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-lg flex items-center gap-2 font-display">
                <Zap className="w-5 h-5 text-[#b59658]" />
                Match Score Breakdown ({scoreModalData.score.totalScore}%)
              </h3>
              <button onClick={() => setScoreModalData(null)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <strong className="text-white block">{scoreModalData.unit.project.projectName} (Unit {scoreModalData.unit.unitNumber})</strong>
                <p className="text-slate-400">All-In Cost: ₹{(scoreModalData.unit.allInTotalCost / 100000).toFixed(2)}L vs Buyer Max: ₹{(budgetMax / 100000).toFixed(2)}L</p>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-300">💰 Budget Proximity (35% wt):</span>
                  <span className="font-mono text-[#ccb67b] font-bold">{Math.round(scoreModalData.score.budgetScore * 100)}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-300">📐 Carpet Sufficiency (25% wt):</span>
                  <span className="font-mono text-[#ccb67b] font-bold">{Math.round(scoreModalData.score.carpetScore * 100)}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-300">🚇 Metro Line 1 Transit (15% wt):</span>
                  <span className="font-mono text-[#ccb67b] font-bold">{Math.round(scoreModalData.score.transitScore * 100)}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-300">⏳ Possession Alignment (15% wt):</span>
                  <span className="font-mono text-[#ccb67b] font-bold">{Math.round(scoreModalData.score.possessionScore * 100)}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-300">✨ Amenities & Floor Level (10% wt):</span>
                  <span className="font-mono text-[#ccb67b] font-bold">{Math.round(scoreModalData.score.amenitiesScore * 100)}%</span>
                </div>
              </div>

              <div className="p-3 mt-3 rounded-xl bg-[#1b202c] border border-[#b59658]/40 flex justify-between items-center text-sm font-bold">
                <span className="text-white">Aggregate Weighted Score:</span>
                <span className="text-[#ccb67b] font-mono text-base">{scoreModalData.score.totalScore}%</span>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setScoreModalData(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: Generated Client Portal Share */}
      {generatedPortalData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full p-6 rounded-3xl border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2 font-display">
                <Sparkles className="w-4 h-4 text-[#b59658]" />
                Tokenized Client Portal Generated!
              </h3>
              <button onClick={() => setGeneratedPortalData(null)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#1b202c] border border-[#b59658]/40 space-y-1.5">
                <span className="text-[#ccb67b] font-bold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#b59658]" />
                  Live Private Mini-Website Ready:
                </span>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                  <code className="text-[#ccb67b] font-mono text-[11px] truncate">
                    {generatedPortalData.shareableUrl}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPortalData.shareableUrl);
                      setCopiedPortalUrl(true);
                      setTimeout(() => setCopiedPortalUrl(false), 2000);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold shrink-0"
                  >
                    {copiedPortalUrl ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>

              {/* Prefilled WhatsApp Message */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 block text-[11px]">
                  Prefilled WhatsApp Dispatch Message:
                </label>
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 whitespace-pre-line max-h-36 overflow-y-auto font-mono">
                  {generatedPortalData.waShareText}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <a
                  href={generatedPortalData.shareableUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Preview Portal View
                </a>

                <a
                  href={`https://wa.me/919820199887?text=${encodeURIComponent(generatedPortalData.waShareText)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] hover:opacity-95 text-[#12151f] text-xs font-extrabold shadow-lg shadow-[#b59658]/20 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  1-Click WhatsApp Dispatch
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
