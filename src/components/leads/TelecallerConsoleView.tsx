'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  MessageSquare,
  Clock,
  Sparkles,
  Search,
  CheckCircle2,
  Calendar,
  Zap,
  Building2,
  MapPin,
  Flame,
  ArrowRight,
  ExternalLink,
  Plus,
  Send,
  AlertTriangle,
  FileText,
  User,
  SlidersHorizontal,
  ChevronRight,
  Volume2,
  Mic,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { YoutubeIcon, InstagramIcon } from '@/components/icons/SocialIcons';

interface LeadItem {
  id: string;
  fullName?: string | null;
  phoneE164?: string | null;
  leadSource?: string;
  sourceConfidence?: string;
  sourceContentId?: string | null;
  sourceCode?: string | null;
  currentStage: string;
  notes?: string | null;
  createdAt: string;
  reminders?: any[];
  requirements?: any[];
  portals?: any[];
  [key: string]: any;
}

interface TelecallerConsoleViewProps {
  leads: LeadItem[];
  onStageChange: (leadId: string, newStage: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onLogCall: (lead: LeadItem) => void;
  onSetReminder: (lead: LeadItem) => void;
}

export function TelecallerConsoleView({
  leads,
  onStageChange,
  onRefresh,
  onLogCall,
  onSetReminder,
}: TelecallerConsoleViewProps) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leads[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQueueFilter, setActiveQueueFilter] = useState<'ALL' | 'UNCONTACTED' | 'HOT' | 'OVERDUE'>('UNCONTACTED');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Brixi AI 4-Pillar Scorecard State for Active Lead
  const [brixiIntent, setBrixiIntent] = useState<'IMMEDIATE' | 'EXPLORING' | 'CURIOUS'>('IMMEDIATE');
  const [brixiBudget, setBrixiBudget] = useState<'VERIFIED_HIGH' | 'STRETCHED' | 'LOW'>('VERIFIED_HIGH');
  const [brixiLocation, setBrixiLocation] = useState<'PRIME_SEC35' | 'KHARGHAR_GEN' | 'TALOJA_OUTER'>('PRIME_SEC35');
  const [brixiTimeline, setBrixiTimeline] = useState<'HOT_30D' | 'WARM_90D' | 'EARLY_90D'>('HOT_30D');
  const [callNotes, setCallNotes] = useState('');
  const [callDurationSec, setCallDurationSec] = useState(0);
  const [isCallTimerRunning, setIsCallTimerRunning] = useState(false);

  // Selected Lead Object
  const selectedLead = useMemo(() => {
    return leads.find((l) => l.id === selectedLeadId) || leads[0] || null;
  }, [leads, selectedLeadId]);

  // Sync selected lead notes to callNotes input
  useEffect(() => {
    if (selectedLead) {
      setCallNotes(selectedLead.notes || '');
      setCallDurationSec(0);
      setIsCallTimerRunning(false);
    }
  }, [selectedLead?.id]);

  // Call timer effect
  useEffect(() => {
    let interval: any = null;
    if (isCallTimerRunning) {
      interval = setInterval(() => {
        setCallDurationSec((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCallTimerRunning]);

  // Format call duration MM:SS
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Filtered Leads Queue
  const filteredQueue = useMemo(() => {
    return leads.filter((lead) => {
      // Search
      const matchesSearch =
        !searchQuery ||
        (lead.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.phoneE164 || '').includes(searchQuery) ||
        (lead.sourceCode || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Filter tabs
      if (activeQueueFilter === 'UNCONTACTED') {
        return lead.currentStage === 'new_uncontacted';
      }
      if (activeQueueFilter === 'HOT') {
        return lead.currentStage === 'discovery_call' || lead.currentStage === 'visit_scheduled';
      }
      if (activeQueueFilter === 'OVERDUE') {
        return (lead.reminders || []).some(
          (r) => r.status === 'PENDING' && new Date(r.dueAt).getTime() < Date.now()
        );
      }
      return true;
    });
  }, [leads, searchQuery, activeQueueFilter]);

  // Brixi Total Score Calculation (0 - 100)
  const brixiScore = useMemo(() => {
    let score = 0;
    // 01 Intent (30 pts max)
    if (brixiIntent === 'IMMEDIATE') score += 30;
    else if (brixiIntent === 'EXPLORING') score += 18;
    else score += 6;

    // 02 Budget (25 pts max)
    if (brixiBudget === 'VERIFIED_HIGH') score += 25;
    else if (brixiBudget === 'STRETCHED') score += 18;
    else score += 7;

    // 03 Location (20 pts max)
    if (brixiLocation === 'PRIME_SEC35') score += 20;
    else if (brixiLocation === 'KHARGHAR_GEN') score += 15;
    else score += 8;

    // 04 Timeline (25 pts max)
    if (brixiTimeline === 'HOT_30D') score += 25;
    else if (brixiTimeline === 'WARM_90D') score += 15;
    else score += 5;

    return score;
  }, [brixiIntent, brixiBudget, brixiLocation, brixiTimeline]);

  // Brixi Badge Details
  const brixiGrade = useMemo(() => {
    if (brixiScore >= 80) return { label: '🔥 HOT PROSPECT', class: 'bg-status-danger-surface text-status-danger border-status-danger/30' };
    if (brixiScore >= 55) return { label: '⚡ WARM INTENT', class: 'bg-status-warning-surface text-status-warning border-status-warning/30' };
    return { label: '🌱 EARLY NURTURE', class: 'bg-surface-subtle text-content-secondary border-border' };
  }, [brixiScore]);

  // Speed-to-lead calculation (elapsed minutes since creation)
  const getElapsedMins = (createdAt: string) => {
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
    return elapsed;
  };

  // 1-Click Rapid Call Disposition Handler
  const handleRapidDisposition = async (stage: string, dispositionLabel: string) => {
    if (!selectedLead) return;
    setIsSaving(true);
    setStatusMessage(`Recording disposition: ${dispositionLabel}...`);

    try {
      // 1. Update stage and notes
      await fetch(`/api/v1/leads/${selectedLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentStage: stage,
          notes: callNotes ? `${callNotes} [Brixi Score: ${brixiScore}/100 - ${dispositionLabel}]` : undefined,
          ...(selectedLead.currentStage === 'new_uncontacted' ? { firstResponseAt: new Date() } : {}),
        }),
      });

      // 2. Refresh parent leads
      await onRefresh();
      setStatusMessage(`✓ Logged: ${dispositionLabel}`);

      // 3. Move to next uncontacted lead automatically for high-velocity caller flow
      const currentIndex = filteredQueue.findIndex((l) => l.id === selectedLead.id);
      if (currentIndex !== -1 && currentIndex + 1 < filteredQueue.length) {
        setSelectedLeadId(filteredQueue[currentIndex + 1].id);
      }
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  // Quick WhatsApp Dispatch URL
  const getWhatsAppUrl = () => {
    if (!selectedLead?.phoneE164) return '#';
    const cleanPhone = selectedLead.phoneE164.replace(/\D/g, '');
    const prefill = `Hello ${selectedLead.fullName || 'Sir/Madam'}, this is ZamZam Properties following up on your inquiry for ${selectedLead.sourceCode || 'Navi Mumbai luxury properties'}. Here are our MahaRERA verified project floor plans and details:`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(prefill)}`;
  };

  return (
    <div className="space-y-4">
      {/* Console Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-surface border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent-soft text-accent-text">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-content flex items-center gap-2">
              Telecaller High-Velocity Calling Console
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-status-success-surface text-status-success border border-status-success/30">
                ⚡ 40px Speed Mode
              </span>
            </h2>
            <p className="text-xs text-content-secondary">
              Zero-latency lead disposition • Brixi AI 4-pillar qualification • Speed-to-Lead SLA tracking
            </p>
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-2">
          {(['UNCONTACTED', 'HOT', 'OVERDUE', 'ALL'] as const).map((filterKey) => (
            <button
              key={filterKey}
              type="button"
              onClick={() => setActiveQueueFilter(filterKey)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeQueueFilter === filterKey
                  ? 'bg-accent text-white shadow-xs'
                  : 'bg-surface-subtle text-content-secondary hover:text-content border border-border'
              }`}
            >
              {filterKey === 'UNCONTACTED' && `🔥 Uncontacted (${leads.filter((l) => l.currentStage === 'new_uncontacted').length})`}
              {filterKey === 'HOT' && '⚡ Hot Leads'}
              {filterKey === 'OVERDUE' && '⏰ Due Reminders'}
              {filterKey === 'ALL' && `All (${leads.length})`}
            </button>
          ))}
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-accent-soft border border-accent/30 rounded-xl text-accent-text text-xs font-bold flex items-center justify-between animate-fadeIn">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-accent-text font-bold">✕</button>
        </div>
      )}

      {/* Main Dual-Pane Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* =========================================================================
            LEFT PANE: 40px SPREADSHEET-SPEED CALL QUEUE (5 cols on lg)
            ========================================================================= */}
        <div className="lg:col-span-5 flex flex-col rounded-2xl bg-surface border border-border shadow-xs overflow-hidden h-[740px]">
          {/* Search Header */}
          <div className="p-3 border-b border-border bg-surface-subtle flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-content-muted" />
              <input
                type="text"
                placeholder="Filter by name, phone, or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-surface border border-border text-content placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <span className="text-xs font-mono font-bold text-content-muted shrink-0">
              {filteredQueue.length} in queue
            </span>
          </div>

          {/* Fixed-Density 40px Rows Table */}
          <div className="flex-1 overflow-y-auto divide-y divide-border-subtle">
            {filteredQueue.length === 0 ? (
              <div className="p-8 text-center text-content-muted text-xs">
                No leads match this queue filter.
              </div>
            ) : (
              filteredQueue.map((lead) => {
                const isSelected = lead.id === selectedLead?.id;
                const elapsedMins = getElapsedMins(lead.createdAt);
                const isUrgent = lead.currentStage === 'new_uncontacted' && elapsedMins <= 10;

                return (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`spreadsheet-row px-3 cursor-pointer select-none ${
                      isSelected ? 'is-selected' : ''
                    }`}
                  >
                    {/* Source Icon */}
                    <div className="w-6 shrink-0 flex items-center justify-center">
                      {(lead.leadSource || '').includes('YOUTUBE') ? (
                        <YoutubeIcon className="w-4 h-4 text-red-500" />
                      ) : (lead.leadSource || '').includes('INSTAGRAM') ? (
                        <InstagramIcon className="w-4 h-4 text-pink-500" />
                      ) : (lead.leadSource || '').includes('WHATSAPP') ? (
                        <MessageSquare className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Phone className="w-4 h-4 text-blue-500" />
                      )}
                    </div>

                    {/* Name & Source Code */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-xs text-content truncate">
                          {lead.fullName || 'Anonymous Prospect'}
                        </span>
                        {lead.sourceCode && (
                          <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-surface-subtle text-accent-text border border-border shrink-0">
                            {lead.sourceCode}
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-content-secondary truncate">
                        {lead.phoneE164 || 'No phone'}
                      </div>
                    </div>

                    {/* SLA Timer Badge */}
                    <div className="shrink-0 text-right">
                      {lead.currentStage === 'new_uncontacted' ? (
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                            isUrgent
                              ? 'bg-status-danger-surface text-status-danger border border-status-danger/40 animate-pulse'
                              : 'bg-accent-soft text-accent-text border border-accent/20'
                          }`}
                        >
                          ⚡ {elapsedMins}m
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-content-muted uppercase">
                          {lead.currentStage.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* =========================================================================
            RIGHT PANE: ACTIVE CALLER WORKBENCH HUD (7 cols on lg)
            ========================================================================= */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl bg-surface border border-border shadow-xs overflow-hidden p-6 space-y-5">
          {selectedLead ? (
            <>
              {/* Lead Identity & Direct Telephony Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-content tracking-tight">
                      {selectedLead.fullName || 'Anonymous Inbound Lead'}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${brixiGrade.class}`}>
                      {brixiGrade.label} ({brixiScore}/100)
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-content-secondary">
                    <span className="font-bold text-content">{selectedLead.phoneE164 || 'No Phone Number'}</span>
                    <span>•</span>
                    <span className="capitalize">{selectedLead.city || 'Navi Mumbai'}</span>
                    {selectedLead.sourceCode && (
                      <>
                        <span>•</span>
                        <span className="text-accent-text font-bold">Campaign: {selectedLead.sourceCode}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Telephony Actions & Live Timer */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Call Timer Display */}
                  {isCallTimerRunning && (
                    <div className="px-3 py-1.5 rounded-xl bg-status-danger-surface text-status-danger font-mono text-xs font-bold border border-status-danger/30 flex items-center gap-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-status-danger" />
                      <span>{formatTimer(callDurationSec)}</span>
                    </div>
                  )}

                  {/* Start/Stop Call Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isCallTimerRunning) {
                        setIsCallTimerRunning(true);
                        if (selectedLead.phoneE164) {
                          window.open(`tel:${selectedLead.phoneE164}`, '_self');
                        }
                      } else {
                        setIsCallTimerRunning(false);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                      isCallTimerRunning
                        ? 'bg-status-danger hover:opacity-90 text-white'
                        : 'bg-primary hover:bg-primary-light text-white'
                    }`}
                  >
                    {isCallTimerRunning ? (
                      <>
                        <PhoneOff className="w-3.5 h-3.5" />
                        <span>End Call</span>
                      </>
                    ) : (
                      <>
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Start Call</span>
                      </>
                    )}
                  </button>

                  {/* 1-Click WhatsApp */}
                  {selectedLead.phoneE164 && (
                    <a
                      href={getWhatsAppUrl()}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-status-success hover:opacity-90 text-white font-bold transition-all shadow-xs cursor-pointer"
                      title="Open WhatsApp with Verified Brochure Template"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* =====================================================================
                  BRIXI AI 4-PILLAR QUALIFICATION SCORECARD
                  ===================================================================== */}
              <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-content flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    Brixi AI 4-Pillar Scorecard
                  </span>
                  <span className="font-mono text-xs font-extrabold text-accent-text">
                    Total Score: {brixiScore}/100
                  </span>
                </div>

                {/* 4 Pillars Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Pillar 01: INTENT */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-content-secondary uppercase">
                      01 · Buyer Intent (30 pts)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setBrixiIntent('IMMEDIATE')}
                        className={`brixi-chip flex-1 text-center ${brixiIntent === 'IMMEDIATE' ? 'is-active' : ''}`}
                      >
                        Immediate (30)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrixiIntent('EXPLORING')}
                        className={`brixi-chip flex-1 text-center ${brixiIntent === 'EXPLORING' ? 'is-active' : ''}`}
                      >
                        Exploring (18)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrixiIntent('CURIOUS')}
                        className={`brixi-chip flex-1 text-center ${brixiIntent === 'CURIOUS' ? 'is-active' : ''}`}
                      >
                        Curious (6)
                      </button>
                    </div>
                  </div>

                  {/* Pillar 02: BUDGET */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-content-secondary uppercase">
                      02 · Budget Fit (25 pts)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setBrixiBudget('VERIFIED_HIGH')}
                        className={`brixi-chip flex-1 text-center ${brixiBudget === 'VERIFIED_HIGH' ? 'is-active' : ''}`}
                      >
                        ₹1.5 Cr+ (25)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrixiBudget('STRETCHED')}
                        className={`brixi-chip flex-1 text-center ${brixiBudget === 'STRETCHED' ? 'is-active' : ''}`}
                      >
                        ₹1-1.5 Cr (18)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrixiBudget('LOW')}
                        className={`brixi-chip flex-1 text-center ${brixiBudget === 'LOW' ? 'is-active' : ''}`}
                      >
                        &lt;₹1 Cr (7)
                      </button>
                    </div>
                  </div>

                  {/* Pillar 03: LOCATION */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-content-secondary uppercase">
                      03 · Micro-Market (20 pts)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setBrixiLocation('PRIME_SEC35')}
                        className={`brixi-chip flex-1 text-center ${brixiLocation === 'PRIME_SEC35' ? 'is-active' : ''}`}
                      >
                        Sec 34-36 (20)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrixiLocation('KHARGHAR_GEN')}
                        className={`brixi-chip flex-1 text-center ${brixiLocation === 'KHARGHAR_GEN' ? 'is-active' : ''}`}
                      >
                        Kharghar (15)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrixiLocation('TALOJA_OUTER')}
                        className={`brixi-chip flex-1 text-center ${brixiLocation === 'TALOJA_OUTER' ? 'is-active' : ''}`}
                      >
                        Taloja (8)
                      </button>
                    </div>
                  </div>

                  {/* Pillar 04: TIMELINE */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-content-secondary uppercase">
                      04 · Buying Window (25 pts)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setBrixiTimeline('HOT_30D')}
                        className={`brixi-chip flex-1 text-center ${brixiTimeline === 'HOT_30D' ? 'is-active' : ''}`}
                      >
                        &lt;30 Days (25)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrixiTimeline('WARM_90D')}
                        className={`brixi-chip flex-1 text-center ${brixiTimeline === 'WARM_90D' ? 'is-active' : ''}`}
                      >
                        31-90d (15)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrixiTimeline('EARLY_90D')}
                        className={`brixi-chip flex-1 text-center ${brixiTimeline === 'EARLY_90D' ? 'is-active' : ''}`}
                      >
                        90d+ (5)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-Time Call Notes & Audio Memo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-content flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-accent" />
                    Live Conversation Notes
                  </label>
                  <span className="text-[10px] text-content-muted">Auto-saves on disposition</span>
                </div>
                <textarea
                  rows={3}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Record buyer's BHK preference, floor requirements, Vastu notes, family decision-makers, or objection details..."
                  className="w-full p-3 rounded-xl bg-surface-subtle border border-border text-xs text-content placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* =====================================================================
                  1-CLICK COLOR-CODED DISPOSITION BUTTON BAR
                  ===================================================================== */}
              <div className="space-y-2 pt-2 border-t border-border">
                <span className="text-xs font-bold uppercase tracking-wider text-content">
                  1-Click Call Disposition
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Option 1: Book Site Visit */}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleRapidDisposition('visit_scheduled', 'Site Visit Booked')}
                    className="disposition-btn disposition-btn--connected py-3 flex flex-col gap-1 font-bold shadow-xs cursor-pointer"
                  >
                    <span>✓ Site Visit Booked</span>
                    <span className="text-[10px] opacity-80 lowercase font-normal">Advance to Visit</span>
                  </button>

                  {/* Option 2: WhatsApp Portal Shared */}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleRapidDisposition('portal_shared', 'Shared WhatsApp Portal')}
                    className="disposition-btn disposition-btn--callback py-3 flex flex-col gap-1 font-bold shadow-xs cursor-pointer"
                  >
                    <span>💬 Portal Shared</span>
                    <span className="text-[10px] opacity-80 lowercase font-normal">Send Floor Plans</span>
                  </button>

                  {/* Option 3: Request Callback */}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      onSetReminder(selectedLead);
                      handleRapidDisposition('discovery_call', 'Callback Requested');
                    }}
                    className="disposition-btn disposition-btn--busy py-3 flex flex-col gap-1 font-bold shadow-xs cursor-pointer"
                  >
                    <span>⏰ Callback Needed</span>
                    <span className="text-[10px] opacity-80 lowercase font-normal">Set Follow-Up</span>
                  </button>

                  {/* Option 4: Price Objection / Lost */}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleRapidDisposition('closed_lost', 'Budget / Price Mismatch')}
                    className="disposition-btn disposition-btn--drop py-3 flex flex-col gap-1 font-bold shadow-xs cursor-pointer"
                  >
                    <span>✕ Dropped / Lost</span>
                    <span className="text-[10px] opacity-80 lowercase font-normal">Mark Unqualified</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center text-content-muted">
              <Phone className="w-8 h-8 mb-2 opacity-40 text-accent" />
              <p className="text-sm font-semibold">Select a lead from the queue to start calling</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
