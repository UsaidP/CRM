'use client';

export const dynamic = 'force-dynamic';

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
  Zap,
  ShoppingBag,
  Share2
} from 'lucide-react';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { MATCHING_SIMULATION_ENDPOINT } from '@/lib/navigation';

export default function MatchmakerConsolePage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('custom');
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [leadRequestKey, setLeadRequestKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [matchedResults, setMatchedResults] = useState<any[]>([]);
  const [matchingError, setMatchingError] = useState<string | null>(null);
  const [matchingRequestKey, setMatchingRequestKey] = useState(0);

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
  const [portalError, setPortalError] = useState<string | null>(null);

  const handleGeneratePortal = async () => {
    if (selectedUnitIds.length === 0) {
      setPortalError('No properties are selected. Add at least one unit to the basket, then try again.');
      return;
    }
    const activeLeadId = selectedLeadId !== 'custom' ? selectedLeadId : leads[0]?.id;
    if (!activeLeadId) {
      setPortalError('No lead is available for this portal. Load or select a lead, then try again.');
      return;
    }

    setPortalError(null);
    setGeneratingPortal(true);
    try {
      const res = await fetch('/api/v1/portals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: activeLeadId,
          selectedUnitIds,
          customMessage: 'Here are the property options selected from current broker records for your requirements.',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCopiedPortalUrl(false);
        setGeneratedPortalData(data.data);
      } else {
        setPortalError(data.error || 'The client portal could not be created. Review the selected lead and units, then try again.');
      }
    } catch (err: any) {
      setPortalError(err.message || 'The client portal request could not be completed. Check your connection, then try again.');
    } finally {
      setGeneratingPortal(false);
    }
  };

  const handleCopyPortalUrl = async () => {
    try {
      await navigator.clipboard.writeText(generatedPortalData.shareableUrl);
      setCopiedPortalUrl(true);
      setPortalError(null);
    } catch {
      setPortalError('The portal link could not be copied. Select the link and copy it manually.');
    }
  };

  // Initial Fetch of Leads
  useEffect(() => {
    const fetchLeads = async () => {
      setLeadsError(null);
      try {
        const res = await fetch('/api/v1/leads');
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Lead profiles could not be loaded.');
        }
        if (data.data.length > 0) {
          setLeads(data.data);
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
      } catch (err: any) {
        setLeadsError(err.message || 'Lead profiles could not be loaded. Check your connection, then try again.');
      }
    };
    fetchLeads();
  }, [leadRequestKey]);

  // Recalculate matches whenever criteria change
  useEffect(() => {
    const controller = new AbortController();
    const runMatching = async () => {
      setLoading(true);
      setMatchingError(null);
      try {
        const res = await fetch(MATCHING_SIMULATION_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            budgetMax,
            bhkPreferences,
            possessionPreference,
            minCarpetSqft,
            purpose,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setMatchedResults(data.data || []);
        } else {
          throw new Error(data.error || 'Matches could not be evaluated.');
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setMatchedResults([]);
        setMatchingError(err.message || 'Matches could not be evaluated. Check your connection, then try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    runMatching();
    return () => controller.abort();
  }, [budgetMax, bhkPreferences, possessionPreference, minCarpetSqft, purpose, selectedLeadId, matchingRequestKey]);

  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    if (leadId === 'custom') return;
    const l = leads.find((x) => x.id === leadId);
    if (l && l.requirements?.[0]) {
      const req = l.requirements[0];
      setBudgetMax(req.budgetMax || 7500000);
      setBhkPreferences(JSON.parse(req.bhkPreferencesJson || '[2]'));
      setPossessionPreference(req.possessionPreference || 'ANY');
      setMinCarpetSqft(req.minCarpetSqft || 600);
    }
  };

  const toggleBhk = (val: number) => {
    if (bhkPreferences.includes(val)) {
      if (bhkPreferences.length > 1) {
        setBhkPreferences(bhkPreferences.filter((b) => b !== val));
      }
    } else {
      setBhkPreferences([...bhkPreferences, val].sort());
    }
  };

  const toggleBasketUnit = (unitId: string) => {
    if (selectedUnitIds.includes(unitId)) {
      setSelectedUnitIds(selectedUnitIds.filter((id) => id !== unitId));
    } else {
      setSelectedUnitIds([...selectedUnitIds, unitId]);
    }
  };

  const formatINR = (val: number) => {
    if (!val && val !== 0) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-content font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-surface border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-soft text-accent-text border border-accent/20 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-accent" /> 5-FACTOR WEIGHTED SCORING
            </span>
            <HallmarkStamp type="rera" label="RERA ID + budget checks" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-content font-display">
            Property Matchmaker AI Console
          </h1>
          <p className="text-content-secondary text-xs mt-1">
            Weighted matching against current Kharghar &amp; Taloja broker records with a +5% budget ceiling.
          </p>
        </div>

        {/* Basket & Dispatch Toolbar */}
        <div className="flex flex-col items-stretch gap-2.5 sm:items-end">
          <div className="flex items-center gap-2.5">
            <div className="px-3.5 py-2 rounded-xl bg-surface-subtle border border-border text-xs flex items-center gap-2 shadow-2xs">
              <ShoppingBag className="w-4 h-4 text-accent" />
              <span className="text-content-secondary font-medium">Basket:</span>
              <strong className="text-accent-text font-bold font-mono">{selectedUnitIds.length} Units</strong>
            </div>

            <button
              onClick={handleGeneratePortal}
              disabled={selectedUnitIds.length === 0 || generatingPortal}
              aria-describedby={portalError ? 'matching-portal-error' : undefined}
              className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              {generatingPortal ? 'Generating portal…' : 'Generate Client Portal'}
            </button>
          </div>
          {portalError && (
            <div id="matching-portal-error" role="alert" className="max-w-md rounded-xl border border-status-danger/40 bg-status-danger-surface px-3.5 py-2 text-xs text-status-danger font-semibold shadow-xs">
              <p>{portalError}</p>
              {selectedUnitIds.length > 0 && leads.length > 0 && (
                <button type="button" onClick={handleGeneratePortal} className="mt-1 font-bold text-status-danger underline underline-offset-2">
                  Try generating again
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Criteria Input Controls (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-4 text-xs font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-content text-sm font-display flex items-center gap-2">
                <Sliders className="w-4 h-4 text-accent" />
                Client Matching Parameters
              </h3>
            </div>

            {/* Lead Selector */}
            <div>
              <label htmlFor="matching-lead" className="text-content-secondary font-medium block mb-1.5">Target Lead Profile:</label>
              <select
                id="matching-lead"
                name="leadId"
                value={selectedLeadId}
                onChange={(e) => handleLeadSelect(e.target.value)}
                className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content focus:outline-none focus:border-accent cursor-pointer"
              >
                <option value="custom">Custom search parameters</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.fullName} ({l.phoneE164})
                  </option>
                ))}
              </select>
              {leadsError && (
                <div role="alert" className="mt-2 rounded-xl border border-status-danger/40 bg-status-danger-surface p-2.5 text-xs text-status-danger font-semibold">
                  <p>{leadsError}</p>
                  <button type="button" onClick={() => setLeadRequestKey((key) => key + 1)} className="mt-1 font-bold text-status-danger underline underline-offset-2">
                    Retry lead profiles
                  </button>
                </div>
              )}
            </div>

            {/* Budget Range */}
            <div className="space-y-2 pt-3 border-t border-border">
              <div className="flex justify-between items-center">
                <label htmlFor="matching-budget" className="text-content-secondary font-medium">Maximum Budget Ceiling:</label>
                <output htmlFor="matching-budget" className="font-bold font-mono text-accent-text text-sm">{formatINR(budgetMax)}</output>
              </div>
              <input
                id="matching-budget"
                name="budgetMax"
                type="range"
                min={3000000}
                max={25000000}
                step={250000}
                value={budgetMax}
                onChange={(e) => setBudgetMax(Number(e.target.value))}
                className="w-full h-2 bg-surface-subtle rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <div className="flex justify-between text-[11px] font-mono text-content-muted">
                <span>₹30L</span>
                <span>₹1.25 Cr</span>
                <span>₹2.5 Cr</span>
              </div>
            </div>

            {/* BHK Configurations */}
            <fieldset className="space-y-2 pt-3 border-t border-border">
              <legend className="text-content-secondary font-medium block">BHK Preferences:</legend>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((b) => (
                  <button
                    type="button"
                    key={b}
                    onClick={() => toggleBhk(b)}
                    aria-pressed={bhkPreferences.includes(b)}
                    className={`py-2 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      bhkPreferences.includes(b)
                        ? 'bg-accent text-white border-accent shadow-xs'
                        : 'bg-surface text-content-secondary border-border hover:bg-surface-subtle hover:text-content'
                    }`}
                  >
                    {b} BHK
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Min Carpet Area */}
            <div className="space-y-2 pt-3 border-t border-border">
              <div className="flex justify-between items-center">
                <label htmlFor="matching-carpet" className="text-content-secondary font-medium">Minimum Carpet Area:</label>
                <output htmlFor="matching-carpet" className="font-bold font-mono text-content">{minCarpetSqft} sq.ft</output>
              </div>
              <input
                id="matching-carpet"
                name="minCarpetSqft"
                type="range"
                min={350}
                max={1500}
                step={25}
                value={minCarpetSqft}
                onChange={(e) => setMinCarpetSqft(Number(e.target.value))}
                className="w-full h-2 bg-surface-subtle rounded-lg appearance-none cursor-pointer accent-accent"
              />
            </div>

            {/* Possession Status */}
            <fieldset className="space-y-2 pt-3 border-t border-border">
              <legend className="text-content-secondary font-medium block">Possession Timeline:</legend>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { id: 'ANY', label: 'Any Stage' },
                  { id: 'READY', label: 'Ready (OC)' },
                  { id: 'UC_NEAR', label: '< 1 Year' },
                ].map((pos) => (
                  <button
                    type="button"
                    key={pos.id}
                    onClick={() => setPossessionPreference(pos.id)}
                    aria-pressed={possessionPreference === pos.id}
                    className={`py-2 px-2 rounded-xl border text-center font-semibold transition-all cursor-pointer ${
                      possessionPreference === pos.id
                        ? 'bg-accent-soft text-accent-text border-accent/40 font-bold'
                        : 'bg-surface text-content-secondary border-border hover:bg-surface-subtle'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        {/* Right Column: Ranked Matches Table (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl bg-surface border border-border shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                <span className="font-bold text-content uppercase tracking-wider">
                  Ranked Inventory Matches ({matchedResults.length})
                </span>
              </div>
              <span className="text-xs font-mono text-content-muted">0% matches auto-collapsed</span>
            </div>

            {matchingError ? (
              <div role="alert" className="p-12 text-center text-xs">
                <AlertCircle className="mx-auto h-8 w-8 text-status-danger" />
                <p className="mt-3 font-semibold text-content">Inventory matches could not be evaluated.</p>
                <p className="mt-1 text-content-muted">{matchingError}</p>
                <button
                  type="button"
                  onClick={() => setMatchingRequestKey((key) => key + 1)}
                  className="mt-4 rounded-xl border border-border bg-surface px-4 py-2 font-bold text-accent-text hover:bg-surface-subtle shadow-2xs"
                >
                  Retry matching
                </button>
              </div>
            ) : loading ? (
              <div className="p-12 text-center text-content-muted text-xs flex flex-col items-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-accent" />
                <span>Evaluating multi-factor weighted scores...</span>
              </div>
            ) : matchedResults.length === 0 ? (
              <div className="p-12 text-center text-content-muted text-xs space-y-2">
                <AlertCircle className="w-8 h-8 text-status-warning mx-auto" />
                <p className="text-content font-semibold">No current inventory records match your strict criteria.</p>
                <p className="text-xs">Try expanding the maximum budget ceiling or adding adjacent BHK configurations.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-subtle text-content-secondary uppercase text-[10px] font-bold border-b border-border">
                    <tr>
                      <th className="p-3.5 pl-4">Rank / Score</th>
                      <th className="p-3.5">Project &amp; Unit</th>
                      <th className="p-3.5">Config &amp; Carpet</th>
                      <th className="p-3.5 text-right">All-In Cost</th>
                      <th className="p-3.5">Highlights &amp; Trade-Offs</th>
                      <th className="p-3.5 pr-4 text-center">Basket Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-content-secondary">
                    {matchedResults.map((match: any, index: number) => {
                      const { unit, score } = match;
                      const isSelected = selectedUnitIds.includes(unit.id);
                      const isPrime = score.tier === 'PRIME_MATCH';
                      const isAlternative = score.tier === 'STRONG_ALTERNATIVE';

                      return (
                        <tr
                          key={unit.id}
                          className={`hover:bg-surface-subtle/80 transition-colors ${
                            isSelected ? 'bg-accent-soft/40' : ''
                          }`}
                        >
                          <td className="p-3.5 pl-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-content-muted text-xs font-mono">#{index + 1}</span>
                              <button
                                type="button"
                                onClick={() => setScoreModalData(match)}
                                aria-label={`View scoring breakdown for ${unit.project?.projectName || 'property'} unit ${unit.unitNumber || 'not recorded'}, ${score.totalScore} percent match`}
                                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border font-mono transition-all cursor-pointer ${
                                  isPrime
                                    ? 'bg-status-success-surface text-status-success border-status-success/40'
                                    : isAlternative
                                    ? 'bg-accent-soft text-accent-text border-accent/40'
                                    : 'bg-status-warning-surface text-status-warning border-status-warning/40'
                                }`}
                                title="Click to view full 5-factor breakdown"
                              >
                                {score.totalScore}%
                              </button>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="font-bold text-content font-sans text-sm">{unit.project?.projectName}</div>
                            <div className="text-[11px] text-content-muted mt-0.5">
                              Unit {unit.unitNumber || 'N/A'} • {unit.project?.microMarket}
                            </div>
                            <div className="mt-1">
                              <HallmarkStamp type="rera" code={unit.project?.reraNumber} size="sm" />
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="text-accent-text font-bold">{unit.bhk} BHK • {unit.facing}</div>
                            <div className="text-[11px] text-content-muted mt-0.5 font-mono">{unit.carpetAreaSqft} sqft</div>
                          </td>

                          <td className="p-3.5 text-right font-mono">
                            <div className="font-bold text-content">{formatINR(unit.allInTotalCost)}</div>
                            <div className="text-[11px] text-content-muted mt-0.5">Ag: {formatINR(unit.agreementValue)}</div>
                          </td>

                          <td className="p-3.5">
                            <div className="space-y-1 max-w-[220px]">
                              {score.matchingHighlights.slice(0, 2).map((hl: string, i: number) => (
                                <div key={i} className="text-[11px] text-status-success font-medium flex items-center gap-1">
                                  ✓ {hl}
                                </div>
                              ))}
                              {score.tradeOffs.slice(0, 1).map((to: string, i: number) => (
                                <div key={i} className="text-[11px] text-status-warning font-medium flex items-center gap-1">
                                  ⚠️ {to}
                                </div>
                              ))}
                            </div>
                          </td>

                          <td className="p-3.5 pr-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleBasketUnit(unit.id)}
                              aria-pressed={isSelected}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                                isSelected
                                  ? 'bg-status-success text-white'
                                  : 'bg-surface hover:bg-surface-subtle text-accent-text border border-border hover:border-accent/40'
                              }`}
                            >
                              {isSelected ? '✓ In Basket' : '+ Add'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: 5-Factor Score Breakdown */}
      <AccessibleDialog
        open={Boolean(scoreModalData)}
        onClose={() => setScoreModalData(null)}
        titleId="matching-score-title"
        descriptionId="matching-score-description"
        size="md"
      >
        {scoreModalData && (
          <div className="space-y-4 text-content font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 id="matching-score-title" className="font-bold text-content text-base font-display flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent" />
                  5-Factor Scoring Inspector
                </h2>
                <p id="matching-score-description" className="mt-1 text-xs text-content-secondary">Review the recorded factors behind this property rank.</p>
              </div>
              <button type="button" data-dialog-close aria-label="Close scoring inspector" onClick={() => setScoreModalData(null)} className="p-1 rounded-lg text-content-muted hover:text-content">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-content-muted text-xs block">Evaluated Property:</span>
                <strong className="text-content font-sans text-sm">
                  {scoreModalData.unit?.project?.projectName} - Unit {scoreModalData.unit?.unitNumber} ({scoreModalData.unit?.bhk} BHK)
                </strong>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-subtle border border-border space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-content-secondary">1. Budget Proximity (35% weight):</span>
                  <strong className="text-content">{Math.round((scoreModalData.score?.budgetScore ?? 0) * 100)}/100</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-content-secondary">2. Carpet Area Fit (25% weight):</span>
                  <strong className="text-content">{Math.round((scoreModalData.score?.carpetScore ?? 0) * 100)}/100</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-content-secondary">3. Transit Fit (15% weight):</span>
                  <strong className="text-content">{Math.round((scoreModalData.score?.transitScore ?? 0) * 100)}/100</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-content-secondary">4. Possession Timeline (15% weight):</span>
                  <strong className="text-content">{Math.round((scoreModalData.score?.possessionScore ?? 0) * 100)}/100</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-content-secondary">5. Amenities Fit (10% weight):</span>
                  <strong className="text-content">{Math.round((scoreModalData.score?.amenitiesScore ?? 0) * 100)}/100</strong>
                </div>
                <div className="pt-2 border-t border-border flex justify-between items-center font-bold text-sm text-accent-text">
                  <span>Composite Match Score:</span>
                  <span>{scoreModalData.score?.totalScore}%</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                data-dialog-autofocus
                onClick={() => setScoreModalData(null)}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-semibold shadow-2xs cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        )}
      </AccessibleDialog>

      {/* MODAL: Generated Client Portal Link */}
      <AccessibleDialog
        open={Boolean(generatedPortalData)}
        onClose={() => setGeneratedPortalData(null)}
        titleId="generated-portal-title"
        descriptionId="generated-portal-description"
        size="md"
      >
        {generatedPortalData && (
          <div className="space-y-4 text-content font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 id="generated-portal-title" className="font-bold text-content text-base font-display flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-accent" />
                  Client Portal Generated
                </h2>
                <p id="generated-portal-description" className="mt-1 text-xs text-content-secondary">Open, copy, or share the private property shortlist.</p>
              </div>
              <button type="button" data-dialog-close aria-label="Close generated portal" onClick={() => setGeneratedPortalData(null)} className="p-1 rounded-lg text-content-muted hover:text-content">✕</button>
            </div>

            <div className="p-3.5 rounded-xl bg-status-success-surface border border-status-success/40 text-status-success text-xs font-semibold">
              Portal created with {selectedUnitIds.length} recorded units and engagement tracking.
            </div>

            <div className="space-y-1.5">
              <label htmlFor="generated-portal-url" className="text-content-secondary font-medium text-xs block">Shareable Portal URL:</label>
              <input id="generated-portal-url" name="portalUrl" readOnly value={generatedPortalData.shareableUrl} className="w-full p-2.5 rounded-xl bg-surface-inset border border-border text-accent-text font-mono text-xs" />
              <p aria-live="polite" className="min-h-4 text-[11px] font-semibold text-status-success">{copiedPortalUrl ? 'Portal link copied.' : ''}</p>
            </div>

            <div className="pt-2 flex flex-wrap justify-end gap-2 text-xs">
              <a
                data-dialog-autofocus
                href={generatedPortalData.shareableUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border font-semibold flex items-center gap-1.5 shadow-2xs"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Preview Portal
              </a>

              <button type="button" onClick={handleCopyPortalUrl} className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border font-semibold shadow-2xs cursor-pointer">
                Copy link
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(generatedPortalData.waShareText)}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-status-success hover:opacity-90 text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                Share on WhatsApp
              </a>
            </div>
          </div>
        )}
      </AccessibleDialog>
    </div>
  );
}
