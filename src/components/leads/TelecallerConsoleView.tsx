'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  ShieldCheck,
  Tag,
  Copy,
  Check,
  Share2,
  DollarSign,
  Compass,
  CheckSquare,
  Layers,
  ShieldAlert
} from 'lucide-react';
import { YoutubeIcon, InstagramIcon } from '@/components/icons/SocialIcons';
import { BackupModal } from '@/components/admin/BackupModal';
import { toast } from '@/lib/client/toast';
import { FeedbackAlert } from '@/components/ui/FeedbackAlert';
import { EmptyState } from '@/components/ui/EmptyState';
import { toUserMessage } from '@/lib/client/user-feedback';

// New Sub-Components for Option 4 All-in-One Super Console
import { TelecallerShiftHud, type ShiftStats } from './telecaller/TelecallerShiftHud';
import { LiveInventoryMatcher, type ProjectMatchItem } from './telecaller/LiveInventoryMatcher';
import { ObjectionBattlecards } from './telecaller/ObjectionBattlecards';
import { WhatsAppQuickTemplates } from './telecaller/WhatsAppQuickTemplates';

interface LeadItem {
  id: string;
  fullName?: string | null;
  phoneE164?: string | null;
  email?: string | null;
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
  city?: string | null;
  preferredBhk?: number | string | null;
  budgetCeiling?: number | null;
  preferredMicroMarket?: string | null;
  [key: string]: any;
}

interface TelecallerConsoleViewProps {
  leads: LeadItem[];
  onStageChange: (leadId: string, newStage: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onLogCall: (lead: LeadItem) => void;
  onSetReminder: (lead: LeadItem) => void;
}

const SHIFT_STORAGE_KEY = 'zamzam_telecaller_shift_stats_v1';
const AUTO_ADVANCE_KEY = 'zamzam_telecaller_auto_advance';

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
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupMode, setBackupMode] = useState<'BACKUP' | 'DUTY_END'>('DUTY_END');
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Tab State for Right-Pane Smart Assistant
  const [assistantTab, setAssistantTab] = useState<'INVENTORY' | 'BATTLECARDS' | 'TEMPLATES'>('INVENTORY');

  // Developer Projects Cache for Live Inventory Matcher
  const [inventoryProjects, setInventoryProjects] = useState<ProjectMatchItem[]>([]);

  // Shift Statistics State with Daily LocalStorage Persistence
  const [shiftStats, setShiftStats] = useState<ShiftStats>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(SHIFT_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const today = new Date().toISOString().split('T')[0];
          if (parsed.date === today && parsed.stats) {
            return parsed.stats;
          }
        }
      } catch {
        // ignore
      }
    }
    return {
      callsMade: 0,
      totalDurationSec: 0,
      visitsBooked: 0,
      connectedCalls: 0,
      targetVisits: 10,
    };
  });

  // Auto-Advance Power Dialer State
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(AUTO_ADVANCE_KEY);
      if (stored !== null) return stored === 'true';
    }
    return true; // default ON for high velocity
  });

  const [countdown, setCountdown] = useState<number | null>(null);
  const [pendingNextLeadId, setPendingNextLeadId] = useState<string | null>(null);
  const countdownTimerRef = useRef<any>(null);

  // ZamZam 4-Pillar Qualification Scorecard State
  const [qualificationIntent, setQualificationIntent] = useState<'IMMEDIATE' | 'EXPLORING' | 'CURIOUS'>('IMMEDIATE');
  const [qualificationBudget, setQualificationBudget] = useState<'LUXURY_125CR' | 'MID_60L_125CR' | 'AFFORDABLE_60L'>('MID_60L_125CR');
  const [qualificationLocation, setQualificationLocation] = useState<'KHARGHAR_PRIME' | 'TALOJA_METRO' | 'ULWE_PANVEL'>('KHARGHAR_PRIME');
  const [qualificationTimeline, setQualificationTimeline] = useState<'READY_30D' | 'UNDER_CONST_90D' | 'INVESTOR_90D'>('READY_30D');

  // Discovery Checklist State
  const [loanApproved, setLoanApproved] = useState(true);
  const [selfUse, setSelfUse] = useState(true);
  const [weekendVisitReady, setWeekendVisitReady] = useState(false);

  const [callNotes, setCallNotes] = useState('');
  const [callDurationSec, setCallDurationSec] = useState(0);
  const [isCallTimerRunning, setIsCallTimerRunning] = useState(false);

  // Selected Lead Object
  const selectedLead = useMemo(() => {
    return leads.find((l) => l.id === selectedLeadId) || leads[0] || null;
  }, [leads, selectedLeadId]);

  // Save Shift Stats to LocalStorage on Change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(
          SHIFT_STORAGE_KEY,
          JSON.stringify({ date: today, stats: shiftStats })
        );
      } catch {
        // ignore
      }
    }
  }, [shiftStats]);

  // Save Auto-Advance Toggle
  const handleToggleAutoAdvance = () => {
    const next = !autoAdvanceEnabled;
    setAutoAdvanceEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTO_ADVANCE_KEY, String(next));
    }
    if (!next) {
      handleCancelCountdown();
    }
  };

  // Fetch Inventory Projects for Live Matching
  useEffect(() => {
    let isMounted = true;
    const fetchInventory = async () => {
      try {
        const res = await fetch('/api/v1/inventory/projects');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data)) {
            setInventoryProjects(data);
          }
        }
      } catch {
        // ignore
      }
    };
    fetchInventory();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync selected lead notes to callNotes input & reset timers
  useEffect(() => {
    if (selectedLead) {
      setCallNotes(selectedLead.notes || '');
      setCallDurationSec(0);
      setIsCallTimerRunning(false);
      setCopiedPhone(false);

      // Auto-set qualification pillars if lead has preferences
      const budget = selectedLead.budgetCeiling || selectedLead.requirements?.[0]?.maxBudget;
      if (budget && budget >= 12500000) setQualificationBudget('LUXURY_125CR');
      else if (budget && budget >= 6000000) setQualificationBudget('MID_60L_125CR');
      else setQualificationBudget('AFFORDABLE_60L');

      const loc = (
        selectedLead.preferredMicroMarket ||
        selectedLead.requirements?.[0]?.preferredMicroMarket ||
        ''
      ).toLowerCase();
      if (loc.includes('taloja')) setQualificationLocation('TALOJA_METRO');
      else if (loc.includes('ulwe') || loc.includes('panvel')) setQualificationLocation('ULWE_PANVEL');
      else setQualificationLocation('KHARGHAR_PRIME');
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
        (lead.sourceCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.email || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Filter tabs
      if (activeQueueFilter === 'UNCONTACTED') {
        return lead.currentStage === 'new_uncontacted';
      }
      if (activeQueueFilter === 'HOT') {
        return (
          lead.currentStage === 'discovery_call' ||
          lead.currentStage === 'visit_scheduled' ||
          lead.currentStage === 'negotiation_costing'
        );
      }
      if (activeQueueFilter === 'OVERDUE') {
        return (lead.reminders || []).some(
          (r) => r.status === 'PENDING' && new Date(r.dueAt).getTime() < Date.now()
        );
      }
      return true;
    });
  }, [leads, searchQuery, activeQueueFilter]);

  // ZamZam 4-Pillar Scorecard Calculation (0 - 100)
  const qualificationScore = useMemo(() => {
    let score = 0;
    // 01 Intent (30 pts max)
    if (qualificationIntent === 'IMMEDIATE') score += 30;
    else if (qualificationIntent === 'EXPLORING') score += 18;
    else score += 6;

    // 02 Budget (25 pts max)
    if (qualificationBudget === 'LUXURY_125CR') score += 25;
    else if (qualificationBudget === 'MID_60L_125CR') score += 20;
    else score += 12;

    // 03 Location (20 pts max)
    if (qualificationLocation === 'KHARGHAR_PRIME') score += 20;
    else if (qualificationLocation === 'TALOJA_METRO') score += 16;
    else score += 10;

    // 04 Timeline (25 pts max)
    if (qualificationTimeline === 'READY_30D') score += 25;
    else if (qualificationTimeline === 'UNDER_CONST_90D') score += 16;
    else score += 8;

    return score;
  }, [qualificationIntent, qualificationBudget, qualificationLocation, qualificationTimeline]);

  // Qualification Grade Details
  const qualificationGrade = useMemo(() => {
    if (qualificationScore >= 80)
      return {
        label: '🔥 HOT PROSPECT',
        class: 'bg-status-danger-surface text-status-danger border-status-danger/30',
      };
    if (qualificationScore >= 55)
      return {
        label: '⚡ QUALIFIED BUYER',
        class: 'bg-status-warning-surface text-status-warning border-status-warning/30',
      };
    return {
      label: '🌱 NURTURE PIPELINE',
      class: 'bg-surface-subtle text-content-secondary border-border',
    };
  }, [qualificationScore]);

  // Speed-to-lead calculation (elapsed minutes since creation)
  const getElapsedMins = (createdAt: string) => {
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
    return elapsed;
  };

  // Copy phone number
  const handleCopyPhone = () => {
    if (!selectedLead?.phoneE164) return;
    navigator.clipboard.writeText(selectedLead.phoneE164);
    setCopiedPhone(true);
    toast.info('Phone Copied', { description: `${selectedLead.phoneE164} copied to clipboard.` });
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // Countdown Timers for Auto-Advance
  const handleCancelCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
    setPendingNextLeadId(null);
  }, []);

  const handleSkipCountdownNow = useCallback(() => {
    if (pendingNextLeadId) {
      setSelectedLeadId(pendingNextLeadId);
    }
    handleCancelCountdown();
  }, [pendingNextLeadId, handleCancelCountdown]);

  // 1-Click Rapid Call Disposition Handler
  const handleRapidDisposition = async (stage: string, dispositionLabel: string) => {
    if (!selectedLead) return;
    handleCancelCountdown();

    setIsSaving(true);
    setStatusMessage(`Recording disposition: ${dispositionLabel}...`);

    const previousStage = selectedLead.currentStage;
    const targetLeadId = selectedLead.id;
    const targetLeadName = selectedLead.fullName || 'Lead';
    const durationToRecord = callDurationSec;

    // Stop timer
    setIsCallTimerRunning(false);

    try {
      const summaryNotes = callNotes
        ? `${callNotes} [ZamZam Score: ${qualificationScore}/100 - ${dispositionLabel}]`
        : `[ZamZam Score: ${qualificationScore}/100 - ${dispositionLabel}]`;

      await fetch(`/api/v1/leads/${selectedLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentStage: stage,
          notes: summaryNotes,
          ...(selectedLead.currentStage === 'new_uncontacted' ? { firstResponseAt: new Date() } : {}),
        }),
      });

      await onRefresh();
      setStatusMessage(`✓ Logged: ${dispositionLabel}`);

      // Update Shift Statistics
      setShiftStats((prev) => ({
        ...prev,
        callsMade: prev.callsMade + 1,
        totalDurationSec: prev.totalDurationSec + durationToRecord,
        visitsBooked: stage === 'visit_scheduled' ? prev.visitsBooked + 1 : prev.visitsBooked,
        connectedCalls:
          ['visit_scheduled', 'portal_shared', 'discovery_call'].includes(stage)
            ? prev.connectedCalls + 1
            : prev.connectedCalls,
      }));

      toast.leadDisposition(targetLeadName, dispositionLabel, async () => {
        try {
          await fetch(`/api/v1/leads/${targetLeadId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentStage: previousStage }),
          });
          await onRefresh();
          toast.info(`Reverted ${targetLeadName} to ${previousStage}`);
        } catch {
          toast.error('Failed to revert disposition');
        }
      });

      // Find next lead in filtered queue
      const currentIndex = filteredQueue.findIndex((l) => l.id === selectedLead.id);
      const nextLead = currentIndex !== -1 && currentIndex + 1 < filteredQueue.length ? filteredQueue[currentIndex + 1] : null;

      if (nextLead) {
        if (autoAdvanceEnabled) {
          // Trigger 5-second countdown progress
          setPendingNextLeadId(nextLead.id);
          setCountdown(5);

          let currentSeconds = 5;
          countdownTimerRef.current = setInterval(() => {
            currentSeconds -= 1;
            if (currentSeconds <= 0) {
              clearInterval(countdownTimerRef.current);
              countdownTimerRef.current = null;
              setSelectedLeadId(nextLead.id);
              setCountdown(null);
              setPendingNextLeadId(null);
            } else {
              setCountdown(currentSeconds);
            }
          }, 1000);
        } else {
          // Manual advance immediately
          setSelectedLeadId(nextLead.id);
        }
      }
    } catch (err: any) {
      const userErr = toUserMessage(err, 'Call Log Incomplete', 'Unable to record disposition for this prospect.');
      setStatusMessage(userErr.description);
      toast.error('Disposition Incomplete', { description: userErr.description });
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Keyboard Shortcuts (1-4 for Rapid Disposition, Space for Start/Stop Call)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      if (isTyping) return;

      if (e.key === '1') {
        e.preventDefault();
        handleRapidDisposition('visit_scheduled', 'Site Visit Booked');
      } else if (e.key === '2') {
        e.preventDefault();
        handleRapidDisposition('portal_shared', 'Shared WhatsApp Portal');
      } else if (e.key === '3') {
        e.preventDefault();
        if (selectedLead) {
          onSetReminder(selectedLead);
          handleRapidDisposition('discovery_call', 'Callback Requested');
        }
      } else if (e.key === '4') {
        e.preventDefault();
        handleRapidDisposition('closed_lost', 'Budget / Price Mismatch');
      } else if (e.code === 'Space') {
        e.preventDefault();
        setIsCallTimerRunning((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLead, callNotes, qualificationScore, autoAdvanceEnabled, filteredQueue]);

  // Quick WhatsApp Dispatch URL
  const getWhatsAppUrl = () => {
    if (!selectedLead?.phoneE164) return '#';
    const cleanPhone = selectedLead.phoneE164.replace(/\D/g, '');
    const prefill = `Assalamu Alaikum / Hello ${selectedLead.fullName || 'Sir/Madam'}, this is ZamZam Properties following up on your inquiry for ${selectedLead.sourceCode || selectedLead.preferredMicroMarket || 'Navi Mumbai luxury projects'}. Here are our MahaRERA verified project brochures and all-in cost sheets:`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(prefill)}`;
  };

  const getPortalLink = () => {
    if (selectedLead?.portals && selectedLead.portals.length > 0) {
      return `/p/${selectedLead.portals[0].shareToken}`;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP SHIFT PERFORMANCE HUD & AUTO-ADVANCE BAR */}
      <TelecallerShiftHud
        stats={shiftStats}
        autoAdvanceEnabled={autoAdvanceEnabled}
        onToggleAutoAdvance={handleToggleAutoAdvance}
        countdown={countdown}
        onCancelCountdown={handleCancelCountdown}
        onSkipCountdownNow={handleSkipCountdownNow}
        onEndDutyAndBackup={() => {
          setBackupMode('DUTY_END');
          setIsBackupModalOpen(true);
        }}
      />

      {statusMessage && (
        <FeedbackAlert
          variant={statusMessage.startsWith('✓') ? 'success' : 'info'}
          title={statusMessage.startsWith('✓') ? 'Action Completed' : 'Telecaller Notice'}
          description={statusMessage}
          onDismiss={() => setStatusMessage(null)}
        />
      )}

      {/* 2. MAIN 3-PANE WORKSTATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* =========================================================================
            LEFT PANE: 40px SPREADSHEET-SPEED CALL QUEUE (3 cols on xl, 4 on lg)
            ========================================================================= */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col rounded-2xl bg-surface border border-border shadow-xs overflow-hidden h-[420px] sm:h-[500px] xl:h-[780px]">
          {/* Quick Queue Filter Chips */}
          <div className="p-2 border-b border-border bg-surface-subtle flex items-center gap-1 overflow-x-auto">
            {(['UNCONTACTED', 'HOT', 'OVERDUE', 'ALL'] as const).map((filterKey) => (
              <button
                key={filterKey}
                type="button"
                onClick={() => setActiveQueueFilter(filterKey)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeQueueFilter === filterKey
                    ? 'bg-accent text-white shadow-2xs'
                    : 'text-content-secondary hover:text-content hover:bg-surface'
                }`}
              >
                {filterKey === 'UNCONTACTED' && `🔥 Uncontacted (${leads.filter((l) => l.currentStage === 'new_uncontacted').length})`}
                {filterKey === 'HOT' && `⚡ Hot (${leads.filter((l) => ['discovery_call', 'visit_scheduled', 'negotiation_costing'].includes(l.currentStage)).length})`}
                {filterKey === 'OVERDUE' && '⏰ Due'}
                {filterKey === 'ALL' && `All (${leads.length})`}
              </button>
            ))}
          </div>

          {/* Search Header */}
          <div className="p-2.5 border-b border-border bg-surface flex items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-content-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search leads in queue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-3 pl-8 py-1.5 text-xs rounded-xl bg-surface-subtle border border-border text-content placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <span className="text-[10px] font-mono font-bold text-content-muted shrink-0">
              {filteredQueue.length}
            </span>
          </div>

          {/* Fixed-Density 40px Rows Table */}
          <div className="flex-1 overflow-y-auto divide-y divide-border-subtle p-1.5">
            {filteredQueue.length === 0 ? (
              <EmptyState
                type="filter"
                title="Queue Empty"
                description="No prospects matched this filter."
                actionLabel="Clear Filter"
                onAction={() => setSearchQuery('')}
              />
            ) : (
              filteredQueue.map((lead) => {
                const isSelected = lead.id === selectedLead?.id;
                const elapsedMins = getElapsedMins(lead.createdAt);
                const isUrgent = lead.currentStage === 'new_uncontacted' && elapsedMins <= 15;

                return (
                  <div
                    key={lead.id}
                    onClick={() => {
                      handleCancelCountdown();
                      setSelectedLeadId(lead.id);
                    }}
                    className={`spreadsheet-row px-2.5 py-2 cursor-pointer select-none rounded-xl transition-colors ${
                      isSelected ? 'is-selected bg-accent-soft/70 border border-accent/20' : 'hover:bg-surface-subtle/70'
                    }`}
                  >
                    {/* Source Icon */}
                    <div className="w-5 shrink-0 flex items-center justify-center">
                      {(lead.leadSource || '').includes('YOUTUBE') ? (
                        <YoutubeIcon className="w-3.5 h-3.5 text-red-500" />
                      ) : (lead.leadSource || '').includes('INSTAGRAM') ? (
                        <InstagramIcon className="w-3.5 h-3.5 text-pink-500" />
                      ) : (lead.leadSource || '').includes('WHATSAPP') ? (
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Phone className="w-3.5 h-3.5 text-blue-500" />
                      )}
                    </div>

                    {/* Name & Phone */}
                    <div className="flex-1 min-w-0 pr-1.5">
                      <div className="flex items-center gap-1 truncate">
                        <span className="font-bold text-xs text-content truncate font-sans">
                          {lead.fullName || 'Anonymous Prospect'}
                        </span>
                        {lead.sourceCode && (
                          <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-surface text-accent-text border border-border shrink-0">
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
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
                            isUrgent
                              ? 'bg-status-danger-surface text-status-danger border border-status-danger/40 animate-pulse'
                              : 'bg-accent-soft text-accent-text border border-accent/20'
                          }`}
                        >
                          ⚡ {elapsedMins}m
                        </span>
                      ) : (
                        <span className="font-mono text-[9px] text-content-muted uppercase">
                          {lead.currentStage.replace(/_/g, ' ')}
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
            CENTER PANE: ACTIVE CALLER WORKBENCH HUD (5 cols on xl, 8 on lg)
            ========================================================================= */}
        <div className="lg:col-span-8 xl:col-span-5 flex flex-col rounded-2xl bg-surface border border-border shadow-xs overflow-hidden p-4 sm:p-5 space-y-4">
          {selectedLead ? (
            <>
              {/* Lead Identity & Direct Telephony Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-content font-display tracking-tight truncate">
                      {selectedLead.fullName || 'Anonymous Inbound Lead'}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${qualificationGrade.class}`}>
                      {qualificationGrade.label} ({qualificationScore}/100)
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-content-secondary">
                    <span className="font-bold text-content">{selectedLead.phoneE164 || 'No Phone'}</span>
                    {selectedLead.phoneE164 && (
                      <button
                        type="button"
                        onClick={handleCopyPhone}
                        className="p-1 rounded hover:bg-surface-subtle text-content-muted hover:text-content transition-colors cursor-pointer"
                        title="Copy phone number"
                      >
                        {copiedPhone ? <Check className="w-3 h-3 text-status-success" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                    <span>•</span>
                    <span className="capitalize">{selectedLead.city || 'Navi Mumbai'}</span>
                    {selectedLead.sourceCode && (
                      <>
                        <span>•</span>
                        <span className="text-accent-text font-bold">Code: {selectedLead.sourceCode}</span>
                      </>
                    )}
                    {getPortalLink() && (
                      <>
                        <span>•</span>
                        <a
                          href={getPortalLink()!}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-accent font-bold hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" /> Portal
                        </a>
                      </>
                    )}
                  </div>
                </div>

                {/* Telephony Controls & Stopwatch */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Call Timer Display */}
                  {isCallTimerRunning && (
                    <div className="px-2.5 py-1 rounded-xl bg-status-danger-surface text-status-danger font-mono text-xs font-bold border border-status-danger/30 flex items-center gap-1.5 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-danger" />
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                      isCallTimerRunning
                        ? 'bg-status-danger hover:opacity-90 text-white'
                        : 'bg-primary hover:bg-primary-light text-white'
                    }`}
                    title="Press [Space] to toggle call timer"
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

                  {/* Direct WhatsApp */}
                  {selectedLead.phoneE164 && (
                    <a
                      href={getWhatsAppUrl()}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-status-success hover:opacity-90 text-white font-bold transition-all shadow-xs cursor-pointer"
                      title="Open WhatsApp chat with prospect"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Requirement Summary Pills */}
              <div className="p-2.5 bg-surface-subtle/80 rounded-xl border border-border flex flex-wrap items-center gap-2.5 text-[11px]">
                <div className="flex items-center gap-1 text-content">
                  <Building2 className="w-3 h-3 text-accent" />
                  <span className="font-bold">Pref:</span>
                  <span className="font-semibold text-accent-text">
                    {selectedLead.preferredBhk ? `${selectedLead.preferredBhk} BHK` : '1 & 2 BHK'}
                  </span>
                </div>
                <span className="text-border">|</span>
                <div className="flex items-center gap-1 text-content">
                  <MapPin className="w-3 h-3 text-status-success" />
                  <span className="font-bold">Market:</span>
                  <span>{selectedLead.preferredMicroMarket || 'Kharghar / Taloja Corridor'}</span>
                </div>
                <span className="text-border">|</span>
                <div className="flex items-center gap-1 text-content">
                  <DollarSign className="w-3 h-3 text-amber-500" />
                  <span className="font-bold">Budget:</span>
                  <span>
                    {selectedLead.budgetCeiling
                      ? `₹${(selectedLead.budgetCeiling / 100000).toFixed(1)} Lakhs`
                      : '₹45L - ₹85L'}
                  </span>
                </div>
              </div>

              {/* ZamZam 4-Pillar Buyer Qualification Scorecard */}
              <div className="p-3.5 rounded-xl bg-surface-subtle border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-content flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    ZamZam 4-Pillar Qualification
                  </span>
                  <span className="font-mono text-xs font-extrabold text-accent-text">
                    Score: {qualificationScore}/100
                  </span>
                </div>

                {/* 4 Pillars Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Pillar 01: INTENT */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-content-secondary uppercase">
                      01 · Buyer Intent (30 pts)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setQualificationIntent('IMMEDIATE')}
                        className={`pillar-chip flex-1 text-center text-[10px] py-1 ${
                          qualificationIntent === 'IMMEDIATE' ? 'is-active' : ''
                        }`}
                      >
                        Immediate (30)
                      </button>
                      <button
                        type="button"
                        onClick={() => setQualificationIntent('EXPLORING')}
                        className={`pillar-chip flex-1 text-center text-[10px] py-1 ${
                          qualificationIntent === 'EXPLORING' ? 'is-active' : ''
                        }`}
                      >
                        Exploring (18)
                      </button>
                      <button
                        type="button"
                        onClick={() => setQualificationIntent('CURIOUS')}
                        className={`pillar-chip flex-1 text-center text-[10px] py-1 ${
                          qualificationIntent === 'CURIOUS' ? 'is-active' : ''
                        }`}
                      >
                        Curious (6)
                      </button>
                    </div>
                  </div>

                  {/* Pillar 02: BUDGET FIT */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-content-secondary uppercase">
                      02 · Budget Segment (25 pts)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setQualificationBudget('LUXURY_125CR')}
                        className={`pillar-chip flex-1 text-center text-[10px] py-1 ${
                          qualificationBudget === 'LUXURY_125CR' ? 'is-active' : ''
                        }`}
                      >
                        ₹1.25Cr+ (25)
                      </button>
                      <button
                        type="button"
                        onClick={() => setQualificationBudget('MID_60L_125CR')}
                        className={`pillar-chip flex-1 text-center text-[10px] py-1 ${
                          qualificationBudget === 'MID_60L_125CR' ? 'is-active' : ''
                        }`}
                      >
                        ₹60L-1.25Cr (20)
                      </button>
                      <button
                        type="button"
                        onClick={() => setQualificationBudget('AFFORDABLE_60L')}
                        className={`pillar-chip flex-1 text-center text-[10px] py-1 ${
                          qualificationBudget === 'AFFORDABLE_60L' ? 'is-active' : ''
                        }`}
                      >
                        &lt;₹60L (12)
                      </button>
                    </div>
                  </div>

                  {/* Pillar 03: MICRO-MARKET */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-content-secondary uppercase">
                      03 · Micro-Market (20 pts)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setQualificationLocation('KHARGHAR_PRIME')}
                        className={`pillar-chip flex-1 text-center text-[10px] py-1 ${
                          qualificationLocation === 'KHARGHAR_PRIME' ? 'is-active' : ''
                        }`}
                      >
                        Kharghar (20)
                      </button>
                      <button
                        type="button"
                        onClick={() => setQualificationLocation('TALOJA_METRO')}
                        className={`pillar-chip flex-1 text-center text-[10px] py-1 ${
                          qualificationLocation === 'TALOJA_METRO' ? 'is-active' : ''
                        }`}
                      >
                        Taloja (16)
                      </button>
                      <button
                        type="button"
                        onClick={() => setQualificationLocation('ULWE_PANVEL')}
                        className={`pillar-chip flex-1 text-center text-[10px] py-1 ${
                          qualificationLocation === 'ULWE_PANVEL' ? 'is-active' : ''
                        }`}
                      >
                        Ulwe/Panvel (10)
                      </button>
                    </div>
                  </div>

                  {/* Pillar 04: TIMELINE */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-content-secondary uppercase">
                      04 · Buying Window (25 pts)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setQualificationTimeline('READY_30D')}
                        className={`pillar-chip flex-1 text-center text-[10px] py-1 ${
                          qualificationTimeline === 'READY_30D' ? 'is-active' : ''
                        }`}
                      >
                        &lt;30d (25)
                      </button>
                      <button
                        type="button"
                        onClick={() => setQualificationTimeline('UNDER_CONST_90D')}
                        className={`pillar-chip flex-1 text-center text-[10px] py-1 ${
                          qualificationTimeline === 'UNDER_CONST_90D' ? 'is-active' : ''
                        }`}
                      >
                        30–90d (16)
                      </button>
                      <button
                        type="button"
                        onClick={() => setQualificationTimeline('INVESTOR_90D')}
                        className={`pillar-chip flex-1 text-center text-[10px] py-1 ${
                          qualificationTimeline === 'INVESTOR_90D' ? 'is-active' : ''
                        }`}
                      >
                        90d+ (8)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Discovery Checkchips */}
                <div className="pt-2 border-t border-border/60 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLoanApproved(!loanApproved)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                      loanApproved
                        ? 'bg-status-success-surface text-status-success border-status-success/40'
                        : 'bg-surface text-content-muted border-border'
                    }`}
                  >
                    {loanApproved ? '✓ Loan Approved' : 'Loan Assistance Needed'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelfUse(!selfUse)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                      selfUse
                        ? 'bg-accent-soft text-accent-text border-accent/30'
                        : 'bg-surface text-content-muted border-border'
                    }`}
                  >
                    {selfUse ? '🏠 End-User' : '💼 Investor'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setWeekendVisitReady(!weekendVisitReady)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                      weekendVisitReady
                        ? 'bg-status-warning-surface text-status-warning border-status-warning/40'
                        : 'bg-surface text-content-muted border-border'
                    }`}
                  >
                    {weekendVisitReady ? '🚗 Visit Ready' : 'Visit Pending'}
                  </button>
                </div>
              </div>

              {/* Real-Time Call Notes */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-content flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-accent" />
                    Conversation Notes
                  </label>
                  <span className="text-[9px] text-content-muted">Auto-saves on disposition</span>
                </div>
                <textarea
                  rows={2}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Record buyer's BHK preference, floor requirements, Vastu notes, family decision-makers, or objection details..."
                  className="w-full p-2.5 rounded-xl bg-surface-subtle border border-border text-xs text-content placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* 1-Click Color-Coded Disposition Button Bar with Keyboard Shortcuts */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-content">
                    1-Click Call Disposition
                  </span>
                  <span className="text-[9px] text-content-muted font-mono">
                    Shortcuts: [1] Visit • [2] Portal • [3] Callback • [4] Lost
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Option 1: Book Site Visit [1] */}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleRapidDisposition('visit_scheduled', 'Site Visit Booked')}
                    className="disposition-btn disposition-btn--connected py-2.5 flex flex-col gap-0.5 font-bold shadow-xs cursor-pointer relative"
                    title="Press key [1]"
                  >
                    <span className="flex items-center justify-center gap-1 text-xs">
                      <span>✓ Visit Booked</span>
                      <kbd className="px-1 py-0.2 rounded bg-black/20 text-[9px] font-mono">1</kbd>
                    </span>
                    <span className="text-[9px] opacity-80 lowercase font-normal">Advance to Visit</span>
                  </button>

                  {/* Option 2: WhatsApp Portal Shared [2] */}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleRapidDisposition('portal_shared', 'Shared WhatsApp Portal')}
                    className="disposition-btn disposition-btn--callback py-2.5 flex flex-col gap-0.5 font-bold shadow-xs cursor-pointer relative"
                    title="Press key [2]"
                  >
                    <span className="flex items-center justify-center gap-1 text-xs">
                      <span>💬 Portal Shared</span>
                      <kbd className="px-1 py-0.2 rounded bg-black/20 text-[9px] font-mono">2</kbd>
                    </span>
                    <span className="text-[9px] opacity-80 lowercase font-normal">Send Floor Plans</span>
                  </button>

                  {/* Option 3: Request Callback [3] */}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      onSetReminder(selectedLead);
                      handleRapidDisposition('discovery_call', 'Callback Requested');
                    }}
                    className="disposition-btn disposition-btn--busy py-2.5 flex flex-col gap-0.5 font-bold shadow-xs cursor-pointer relative"
                    title="Press key [3]"
                  >
                    <span className="flex items-center justify-center gap-1 text-xs">
                      <span>⏰ Callback</span>
                      <kbd className="px-1 py-0.2 rounded bg-black/20 text-[9px] font-mono">3</kbd>
                    </span>
                    <span className="text-[9px] opacity-80 lowercase font-normal">Set Follow-Up</span>
                  </button>

                  {/* Option 4: Price Objection / Lost [4] */}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleRapidDisposition('closed_lost', 'Budget / Price Mismatch')}
                    className="disposition-btn disposition-btn--drop py-2.5 flex flex-col gap-0.5 font-bold shadow-xs cursor-pointer relative"
                    title="Press key [4]"
                  >
                    <span className="flex items-center justify-center gap-1 text-xs">
                      <span>✕ Dropped</span>
                      <kbd className="px-1 py-0.2 rounded bg-black/20 text-[9px] font-mono">4</kbd>
                    </span>
                    <span className="text-[9px] opacity-80 lowercase font-normal">Mark Unqualified</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center p-6">
              <EmptyState
                icon={Phone}
                title="Ready for Calling"
                description="Select any prospect from the left queue to open their telemetry card and record dispositions."
              />
            </div>
          )}
        </div>

        {/* =========================================================================
            RIGHT PANE: SMART ASSISTANT WORKBENCH (4 cols on xl, 12 on lg)
            ========================================================================= */}
        <div className="lg:col-span-12 xl:col-span-4 flex flex-col rounded-2xl bg-surface border border-border shadow-xs overflow-hidden p-4 sm:p-5 space-y-4 h-full">
          {/* Smart Assistant Tab Selector */}
          <div className="flex items-center p-1 rounded-xl bg-surface-subtle border border-border">
            <button
              type="button"
              onClick={() => setAssistantTab('INVENTORY')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                assistantTab === 'INVENTORY'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-content-secondary hover:text-content'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Pitch Inventory</span>
            </button>

            <button
              type="button"
              onClick={() => setAssistantTab('BATTLECARDS')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                assistantTab === 'BATTLECARDS'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-content-secondary hover:text-content'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Battlecards</span>
            </button>

            <button
              type="button"
              onClick={() => setAssistantTab('TEMPLATES')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                assistantTab === 'TEMPLATES'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-content-secondary hover:text-content'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          </div>

          {/* Assistant Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {assistantTab === 'INVENTORY' && (
              <LiveInventoryMatcher
                lead={{
                  fullName: selectedLead?.fullName,
                  phoneE164: selectedLead?.phoneE164,
                  preferredBhk: selectedLead?.preferredBhk,
                  budgetCeiling: selectedLead?.budgetCeiling,
                  preferredMicroMarket: selectedLead?.preferredMicroMarket,
                  sourceCode: selectedLead?.sourceCode,
                }}
                projects={inventoryProjects}
              />
            )}

            {assistantTab === 'BATTLECARDS' && (
              <ObjectionBattlecards
                leadPhone={selectedLead?.phoneE164}
                leadName={selectedLead?.fullName}
              />
            )}

            {assistantTab === 'TEMPLATES' && (
              <WhatsAppQuickTemplates
                leadPhone={selectedLead?.phoneE164}
                leadName={selectedLead?.fullName}
                projectName={selectedLead?.sourceCode || 'Navi Mumbai Residential Project'}
                preferredBhk={selectedLead?.preferredBhk}
              />
            )}
          </div>
        </div>
      </div>

      {/* Google Drive Cloud Backup Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        initialMode={backupMode}
      />
    </div>
  );
}
