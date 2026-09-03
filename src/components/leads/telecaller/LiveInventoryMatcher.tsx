'use client';

import React, { useState, useMemo } from 'react';
import {
  Building2,
  MapPin,
  FileText,
  Layers,
  Calculator,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Share2,
  Image as ImageIcon
} from 'lucide-react';
import { resolveAssetUrl } from '@/lib/inventory-media';

interface UnitSummary {
  id: string;
  bhk: number;
  agreementValue?: number | null;
  allInTotalCost?: number | null;
  floorPlanUrl?: string | null;
}

export interface ProjectMatchItem {
  id: string;
  projectName: string;
  developerName: string;
  microMarket: string;
  subLocality?: string | null;
  brochureUrl?: string | null;
  coverImageUrl?: string | null;
  elevationsJson?: string | null;
  floorPlanImagesJson?: string | null;
  basePricePerSqft?: number | null;
  units?: UnitSummary[];
}

interface LiveInventoryMatcherProps {
  lead: {
    fullName?: string | null;
    phoneE164?: string | null;
    preferredBhk?: number | string | null;
    budgetCeiling?: number | null;
    preferredMicroMarket?: string | null;
    sourceCode?: string | null;
  };
  projects: ProjectMatchItem[];
  onOpenCostCalculator?: (project: ProjectMatchItem, unit?: UnitSummary) => void;
}

export function LiveInventoryMatcher({
  lead,
  projects,
}: LiveInventoryMatcherProps) {
  const [selectedProjectIdForCost, setSelectedProjectIdForCost] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'MATCHED' | 'ALL'>('MATCHED');

  const leadBhk = lead.preferredBhk ? Number(lead.preferredBhk) : null;
  const leadMarket = (lead.preferredMicroMarket || '').toLowerCase();
  const leadBudget = lead.budgetCeiling || null;

  // Filter and rank projects
  const { matchedProjects, allProjects } = useMemo(() => {
    if (!projects || projects.length === 0) {
      return { matchedProjects: [], allProjects: [] };
    }

    const scored = projects.map((proj) => {
      let score = 0;
      const projUnits = proj.units || [];
      const hasBhkMatch = leadBhk ? projUnits.some((u) => u.bhk === leadBhk) : true;
      if (hasBhkMatch) score += 40;

      const projMarket = (proj.microMarket || '').toLowerCase();
      if (leadMarket && projMarket.includes(leadMarket)) score += 30;

      if (leadBudget) {
        const hasBudgetMatch = projUnits.some(
          (u) => u.allInTotalCost && u.allInTotalCost <= leadBudget * 1.15
        );
        if (hasBudgetMatch) score += 30;
      }

      return { project: proj, score };
    });

    // Sort scored
    scored.sort((a, b) => b.score - a.score);

    const matched = scored.filter((s) => s.score > 0).map((s) => s.project);
    const all = scored.map((s) => s.project);

    return {
      matchedProjects: matched.length > 0 ? matched : all.slice(0, 3),
      allProjects: all,
    };
  }, [projects, leadBhk, leadMarket, leadBudget]);

  const displayedProjects = activeTab === 'MATCHED' ? matchedProjects : allProjects;

  // Helper to get floor plans for project
  const getFloorPlanForLead = (proj: ProjectMatchItem) => {
    if (!proj.floorPlanImagesJson) return null;
    try {
      const parsed = JSON.parse(proj.floorPlanImagesJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (leadBhk) {
          const match = parsed.find((p: any) => Number(p.bhk) === leadBhk);
          if (match) return resolveAssetUrl(match.imageUrl || match.url || match);
        }
        return resolveAssetUrl(parsed[0].imageUrl || parsed[0].url || parsed[0]);
      }
    } catch {
      // ignore
    }
    return null;
  };

  // 1-Click WhatsApp links
  const handleSendBrochure = (proj: ProjectMatchItem) => {
    if (!lead.phoneE164) return;
    const brochureLink = proj.brochureUrl || '';
    const text = encodeURIComponent(
      `Hello ${lead.fullName || 'Sir/Ma\'am'}, Safwan here from ZamZam Properties. As discussed on our call, here is the official verified developer brochure and project details for *${proj.projectName}* by ${proj.developerName} in ${proj.microMarket}:\n\n📄 Project Brochure: ${brochureLink || 'Available on request'}\n\nPlease let me know if you would like me to arrange a VIP site visit this weekend.`
    );
    window.open(`https://wa.me/${lead.phoneE164.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  const handleSendFloorPlan = (proj: ProjectMatchItem) => {
    if (!lead.phoneE164) return;
    const planUrl = getFloorPlanForLead(proj);
    const text = encodeURIComponent(
      `Hello ${lead.fullName || 'Sir/Ma\'am'}, here is the verified architectural floor plan layout for *${proj.projectName}* (${leadBhk ? `${leadBhk} BHK` : '1 & 2 BHK'}):\n\n📐 Floor Plan: ${planUrl || 'Layout ready for preview'}\n\nLet me know if you would like to see the carpet area specifications and all-in costing sheet.`
    );
    window.open(`https://wa.me/${lead.phoneE164.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  const handleSendCostSheet = (proj: ProjectMatchItem, agreementVal: number) => {
    if (!lead.phoneE164) return;
    const stampDuty = Math.round(agreementVal * 0.06);
    const gst = Math.round(agreementVal * 0.05);
    const registration = 30000;
    const allInTotal = agreementVal + stampDuty + gst + registration;
    const emiEstimate = Math.round((allInTotal * 0.8 * 80) / 10000); // Rough rule of thumb for 8.5% 20y loan

    const text = encodeURIComponent(
      `Hello ${lead.fullName || 'Sir/Ma\'am'}, here is the transparent statutory cost breakdown for *${proj.projectName}* (${leadBhk ? `${leadBhk} BHK` : 'Residential Unit'}):\n\n` +
      `• Base Agreement Value: ₹${(agreementVal / 100000).toFixed(2)} Lakhs\n` +
      `• Stamp Duty (6% MahaRERA): ₹${(stampDuty / 100000).toFixed(2)} Lakhs\n` +
      `• GST (5% Under Construction): ₹${(gst / 100000).toFixed(2)} Lakhs\n` +
      `• Registration & Legal: ₹30,000\n` +
      `---------------------------------\n` +
      `*Total All-In Cost: ₹${(allInTotal / 100000).toFixed(2)} Lakhs*\n` +
      `• Approx Monthly EMI (80% Home Loan): ~₹${emiEstimate.toLocaleString('en-IN')}/month\n\n` +
      `Would you like to schedule a site visit this Saturday or Sunday to inspect the sample flat?`
    );
    window.open(`https://wa.me/${lead.phoneE164.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-3">
      {/* Header with Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-accent" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-content">
            Live Inventory Pitcher ({displayedProjects.length})
          </h4>
        </div>
        <div className="flex items-center p-0.5 rounded-lg bg-surface-subtle border border-border text-[10px]">
          <button
            type="button"
            onClick={() => setActiveTab('MATCHED')}
            className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
              activeTab === 'MATCHED' ? 'bg-accent text-white shadow-2xs' : 'text-content-muted hover:text-content'
            }`}
          >
            Smart Match
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
              activeTab === 'ALL' ? 'bg-accent text-white shadow-2xs' : 'text-content-muted hover:text-content'
            }`}
          >
            All ({projects.length})
          </button>
        </div>
      </div>

      {/* Matching Criteria Pill Bar */}
      <div className="px-2.5 py-1.5 rounded-xl bg-surface-subtle border border-border/80 text-[11px] flex items-center justify-between text-content-secondary">
        <div className="flex items-center gap-2 truncate">
          <span className="font-semibold text-content">Targeting:</span>
          <span className="font-mono text-accent-text font-bold">{leadBhk ? `${leadBhk} BHK` : 'Any BHK'}</span>
          <span>•</span>
          <span className="truncate">{lead.preferredMicroMarket || 'Navi Mumbai'}</span>
        </div>
        {lead.budgetCeiling && (
          <span className="font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0">
            ≤ ₹{(lead.budgetCeiling / 100000).toFixed(1)}L
          </span>
        )}
      </div>

      {/* Projects List */}
      {displayedProjects.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-border text-center space-y-1">
          <p className="text-xs text-content font-medium">No verified projects found.</p>
          <p className="text-[10px] text-content-muted">Upload inventory in Project Master to pitch directly to leads.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayedProjects.map((proj) => {
            const floorPlanUrl = getFloorPlanForLead(proj);
            const coverImage = proj.coverImageUrl || (proj.elevationsJson ? JSON.parse(proj.elevationsJson || '[]')[0]?.url : null);
            const isCostOpen = selectedProjectIdForCost === proj.id;
            const approxAgreement = proj.units?.[0]?.agreementValue || (proj.basePricePerSqft ? proj.basePricePerSqft * (leadBhk === 1 ? 450 : 650) : 6500000);

            return (
              <div
                key={proj.id}
                className="rounded-xl bg-surface-subtle border border-border overflow-hidden hover:border-accent/40 transition-all p-3 space-y-2.5"
              >
                {/* Project Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-content truncate font-display">{proj.projectName}</span>
                      <span className="px-1.5 py-0.2 rounded bg-accent-soft text-accent-text text-[9px] font-mono font-bold border border-accent/20 shrink-0">
                        {proj.microMarket}
                      </span>
                    </div>
                    <p className="text-[10px] text-content-muted truncate">
                      By {proj.developerName} {proj.subLocality ? `• ${proj.subLocality}` : ''}
                    </p>
                  </div>

                  {coverImage && (
                    <img
                      src={resolveAssetUrl(coverImage)}
                      alt={proj.projectName}
                      className="w-10 h-10 rounded-lg object-cover border border-border shrink-0"
                    />
                  )}
                </div>

                {/* Available Configurations & Price Row */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/60">
                  <div className="flex items-center gap-1.5 text-content-secondary">
                    <Layers className="w-3 h-3 text-accent" />
                    <span>
                      {proj.units && proj.units.length > 0
                        ? Array.from(new Set(proj.units.map((u) => `${u.bhk} BHK`))).join(', ')
                        : '1 & 2 BHK'}
                    </span>
                  </div>

                  <div className="font-mono font-bold text-content text-[11px]">
                    {proj.units?.[0]?.allInTotalCost
                      ? `From ₹${(proj.units[0].allInTotalCost / 100000).toFixed(1)}L`
                      : proj.basePricePerSqft
                      ? `₹${proj.basePricePerSqft}/sq.ft`
                      : 'Cost on request'}
                  </div>
                </div>

                {/* Quick Pitch Action Buttons */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {/* Action 1: Send Brochure */}
                  <button
                    type="button"
                    onClick={() => handleSendBrochure(proj)}
                    disabled={!lead.phoneE164}
                    className="py-1.5 px-2 rounded-lg bg-surface hover:bg-surface-raised border border-border text-[10px] font-semibold text-content flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                    title="Send Verified Brochure PDF on WhatsApp"
                  >
                    <FileText className="w-3 h-3 text-red-500" />
                    <span className="truncate">Brochure</span>
                  </button>

                  {/* Action 2: Send Floor Plan */}
                  <button
                    type="button"
                    onClick={() => handleSendFloorPlan(proj)}
                    disabled={!lead.phoneE164}
                    className="py-1.5 px-2 rounded-lg bg-surface hover:bg-surface-raised border border-border text-[10px] font-semibold text-content flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                    title="Send BHK Floor Plan Layout on WhatsApp"
                  >
                    <ImageIcon className="w-3 h-3 text-blue-500" />
                    <span className="truncate">Floor Plan</span>
                  </button>

                  {/* Action 3: Cost & EMI Tooltip */}
                  <button
                    type="button"
                    onClick={() => setSelectedProjectIdForCost(isCostOpen ? null : proj.id)}
                    className={`py-1.5 px-2 rounded-lg border text-[10px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      isCostOpen
                        ? 'bg-accent text-white border-accent'
                        : 'bg-surface hover:bg-surface-raised border-border text-content'
                    }`}
                    title="Calculate Stamp Duty, GST, and Monthly EMI"
                  >
                    <Calculator className="w-3 h-3 text-emerald-500" />
                    <span className="truncate">Cost &amp; EMI</span>
                  </button>
                </div>

                {/* Instant Cost Sheet & EMI Breakdown Drawer */}
                {isCostOpen && (
                  <div className="p-3 rounded-xl bg-surface border border-accent/30 space-y-2 text-xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[11px] font-bold text-content pb-1 border-b border-border">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-emerald-500" />
                        Statutory All-In Costing
                      </span>
                      <span className="font-mono text-accent-text">
                        ₹{(approxAgreement / 100000).toFixed(1)} Lakhs Base
                      </span>
                    </div>

                    <div className="space-y-1 font-mono text-[10px] text-content-secondary">
                      <div className="flex justify-between">
                        <span>Base Agreement Value:</span>
                        <span>₹{(approxAgreement / 100000).toFixed(2)} L</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Stamp Duty (6%):</span>
                        <span>₹{((approxAgreement * 0.06) / 100000).toFixed(2)} L</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST (5% Under Const):</span>
                        <span>₹{((approxAgreement * 0.05) / 100000).toFixed(2)} L</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Registration &amp; Legal:</span>
                        <span>₹0.30 L</span>
                      </div>
                      <div className="flex justify-between font-bold text-content pt-1 border-t border-border/80">
                        <span>Total All-In Budget:</span>
                        <span className="text-status-success font-extrabold">
                          ₹{((approxAgreement * 1.11 + 30000) / 100000).toFixed(2)} Lakhs
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSendCostSheet(proj, approxAgreement)}
                      disabled={!lead.phoneE164}
                      className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Send Formatted Cost Sheet on WhatsApp</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
