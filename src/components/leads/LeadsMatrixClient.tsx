'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  PhoneCall,
  MessageSquare,
  RefreshCw,
  Search,
  ExternalLink,
  Clock,
  CheckCircle2,
  Plus,
  Filter,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  ChevronDown,
  Building2,
  Phone,
  GitMerge,
  Eye,
  AlertTriangle,
  Send,
  UserCheck,
  FileSpreadsheet,
  Calendar,
  Flame,
  Check,
  Bell,
  ArrowUpDown,
  ListOrdered,
  AlertCircle,
  X,
  LayoutGrid,
  Table as TableIcon,
  FileText,
  Edit3,
  Download
} from 'lucide-react';
import { YoutubeIcon, InstagramIcon } from '@/components/icons/SocialIcons';
import { toast } from '@/lib/client/toast';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';
import { CallLogModal } from '@/components/leads/CallLogModal';
import { SourceEvidenceDrawer } from '@/components/leads/SourceEvidenceDrawer';
import { ContactMergeModal } from '@/components/leads/ContactMergeModal';
import { LeadCsvImportModal } from '@/components/leads/LeadCsvImportModal';
import { LeadsKanbanBoard } from '@/components/leads/LeadsKanbanBoard';
import { QuickReminderModal } from '@/components/reminders/QuickReminderModal';
import { exportLeadsToCsv } from '@/lib/export-utils';
import { CompleteReminderPrompt } from '@/components/reminders/CompleteReminderPrompt';
import { QuickLogModal } from '@/components/leads/QuickLogModal';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { evaluateLeadConnectPriority, rankFirmLeadsForNextConnect, PrioritizedLeadScore } from '@/lib/domain/prioritization-engine';
import { TelecallerConsoleView } from '@/components/leads/TelecallerConsoleView';
import { formatDateTime } from '@/lib/date-utils';
import { CustomSelect, type CustomSelectOption } from '@/components/ui/CustomSelect';

const SORT_OPTIONS: CustomSelectOption[] = [
  {
    value: 'SMART_PRIORITY',
    label: 'Smart Priority (Connect Next)',
    shortLabel: 'Smart Priority',
    icon: <Sparkles className="w-3.5 h-3.5 text-accent" />,
    description: 'Prioritizes high-intent & urgent SLA leads',
  },
  {
    value: 'DUE_DATE',
    label: 'Scheduled Reminder Date',
    shortLabel: 'Reminder Date',
    icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
    description: 'Sort by upcoming follow-up due time',
  },
  {
    value: 'RECENT',
    label: 'Newest Inbound Date',
    shortLabel: 'Newest Inbound',
    icon: <Calendar className="w-3.5 h-3.5 text-blue-500" />,
    description: 'Sort by most recently created lead',
  },
];

const CONFIDENCE_OPTIONS: CustomSelectOption[] = [
  { value: 'ALL', label: 'All Confidence Levels', shortLabel: 'All Confidence' },
  {
    value: 'EXACT',
    label: 'Exact Attribution Only',
    shortLabel: 'Exact Match',
    dotColor: 'bg-emerald-500',
    description: 'Matched specific project & video tag',
  },
  {
    value: 'INFERRED',
    label: 'Inferred Keyword Match',
    shortLabel: 'Inferred Match',
    dotColor: 'bg-amber-500',
    description: 'Matched location / BHK from text',
  },
  {
    value: 'UNKNOWN',
    label: 'Unknown Organic Direct',
    shortLabel: 'Organic Direct',
    dotColor: 'bg-slate-400',
    description: 'Unattributed direct inquiries',
  },
];

const STAGE_OPTIONS: CustomSelectOption[] = [
  { value: 'ALL', label: 'All Pipeline Stages', shortLabel: 'All Stages' },
  { value: 'new_uncontacted', label: 'New Lead (Uncontacted)', shortLabel: 'New Leads', dotColor: 'bg-rose-500' },
  { value: 'discovery_call', label: 'Discovery & Qualifying', shortLabel: 'Discovery', dotColor: 'bg-amber-500' },
  { value: 'portal_shared', label: 'Shortlist / Deck Sent', shortLabel: 'Deck Sent', dotColor: 'bg-blue-500' },
  { value: 'visit_scheduled', label: 'Site Visit Scheduled', shortLabel: 'Visit Fixed', dotColor: 'bg-sky-500' },
  { value: 'visit_done', label: 'Site Visit Completed', shortLabel: 'Tour Done', dotColor: 'bg-emerald-500' },
  { value: 'revisit_scheduled', label: 'Re-Visit / Family Tour', shortLabel: 'Re-Visit', dotColor: 'bg-indigo-500' },
  { value: 'negotiation_token', label: 'Price Negotiation & Token', shortLabel: 'Negotiating', dotColor: 'bg-purple-500' },
  { value: 'under_registration', label: 'Agreement & Registration', shortLabel: 'Registration', dotColor: 'bg-cyan-500' },
  { value: 'closed_won', label: 'Booking Done (Closed Won)', shortLabel: 'Closed Won', dotColor: 'bg-emerald-600' },
  { value: 'on_hold_nurture', label: 'Nurture / Follow-Up Later', shortLabel: 'Nurture', dotColor: 'bg-slate-400' },
  { value: 'closed_lost', label: 'Lost / Dropped', shortLabel: 'Lost', dotColor: 'bg-rose-700' },
];

export function LeadsMatrixClient({ initialLeads = [] }: { initialLeads?: any[] }) {
  const [leads, setLeads] = useState<any[]>(initialLeads);
  const [loading, setLoading] = useState(false);
  const [syncingFallbacks, setSyncingFallbacks] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'console'>('kanban');
  const [selectedConfidence, setSelectedConfidence] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState('ALL');
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'SMART_PRIORITY' | 'DUE_DATE' | 'RECENT'>('SMART_PRIORITY');
  const searchParams = useSearchParams();

  // Sync search query from URL parameter if navigated from global search
  useEffect(() => {
    const s = searchParams?.get('search');
    if (s) {
      setSearchQuery(s);
    }
  }, [searchParams]);

  // Modals & Drawers
  const [showCallLogModal, setShowCallLogModal] = useState(false);
  const [showLeadImportModal, setShowLeadImportModal] = useState(false);
  const [droppedImportFile, setDroppedImportFile] = useState<File | null>(null);
  const [isPageDragOver, setIsPageDragOver] = useState(false);
  const dragCounter = useRef(0);

  // Global safety listener to ensure drag-over rings never get stuck
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      dragCounter.current = 0;
      setIsPageDragOver(false);
    };
    window.addEventListener('dragend', handleGlobalDragEnd);
    window.addEventListener('drop', handleGlobalDragEnd);
    return () => {
      window.removeEventListener('dragend', handleGlobalDragEnd);
      window.removeEventListener('drop', handleGlobalDragEnd);
    };
  }, []);
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<any | null>(null);
  const [mergeSourceLead, setMergeSourceLead] = useState<any | null>(null);
  const [quickReminderLead, setQuickReminderLead] = useState<any | null>(null);
  const [quickLogLead, setQuickLogLead] = useState<any | null>(null);
  const [completingReminder, setCompletingReminder] = useState<any | null>(null);
  const [uiError, setUiError] = useState('');
  const [syncSuccessMsg, setSyncSuccessMsg] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    setUiError('');
    try {
      const res = await fetch('/api/v1/leads');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Unable to refresh leads.');
      setLeads(data.data);
    } catch (err: any) {
      setUiError(`${err.message || 'Unable to refresh leads.'} Check your connection.`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkStageChange = async (newStage: string) => {
    if (selectedLeadIds.length === 0) return;
    setBulkUpdating(true);
    setUiError('');
    try {
      const res = await fetch('/api/v1/leads/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: selectedLeadIds,
          currentStage: newStage,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLeads((prev) =>
          prev.map((l) =>
            selectedLeadIds.includes(l.id)
              ? {
                  ...l,
                  currentStage: newStage,
                  firstResponseAt: newStage !== 'new_uncontacted' ? new Date() : l.firstResponseAt,
                }
              : l
          )
        );
        const stageLabel = STAGE_OPTIONS.find((s) => s.value === newStage)?.label || newStage;
        const count = data.updatedCount || selectedLeadIds.length;
        setSyncSuccessMsg(`Bulk updated status to "${stageLabel}" for ${count} leads!`);
        toast.success(`Bulk Updated: ${count} Leads`, {
          description: `All selected leads moved to "${stageLabel}".`,
        });
        setSelectedLeadIds([]);
        setTimeout(() => setSyncSuccessMsg(''), 4000);
      } else {
        throw new Error(data.error || 'Failed to update lead stages.');
      }
    } catch (err: any) {
      setUiError(err.message || 'Error updating leads in bulk.');
      toast.error('Bulk Update Failed', { description: err.message });
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleStageChange = async (leadId: string, newStage: string) => {
    setUiError('');
    const targetLead = leads.find((l) => l.id === leadId);
    const prevStage = targetLead?.currentStage || 'new_uncontacted';
    const stageLabel = STAGE_OPTIONS.find((s) => s.value === newStage)?.label || newStage;

    try {
      const res = await fetch(`/api/v1/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentStage: newStage,
          ...(newStage !== 'new_uncontacted' ? { firstResponseAt: new Date() } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? {
                  ...l,
                  currentStage: newStage,
                  firstResponseAt: newStage !== 'new_uncontacted' ? new Date() : l.firstResponseAt,
                }
              : l
          )
        );

        toast.leadDisposition(targetLead?.fullName || 'Lead', stageLabel, async () => {
          try {
            await fetch(`/api/v1/leads/${leadId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ currentStage: prevStage }),
            });
            fetchLeads();
            toast.info(`Reverted ${targetLead?.fullName || 'Lead'} to ${prevStage}`);
          } catch {
            toast.error('Failed to revert lead stage');
          }
        });
      } else {
        throw new Error(data.error || 'The stage update was rejected.');
      }
    } catch (err: any) {
      setUiError(`${err.message || 'Unable to update the lead stage.'}`);
      toast.error('Stage Update Failed', { description: err.message });
    }
  };

  const handleSyncFallbacks = async () => {
    setSyncingFallbacks(true);
    setUiError('');
    setSyncSuccessMsg('');
    try {
      const res = await fetch('/api/v1/reminders/fallback-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncSuccessMsg(`Synchronized! ${data.data?.fallbackSync?.createdCount || 0} missing reminders created, ${data.data?.escalation?.escalatedCount || 0} overdue items escalated.`);
        await fetchLeads();
        setTimeout(() => setSyncSuccessMsg(''), 5000);
      } else {
        throw new Error(data.error || 'Failed to sync fallback reminders');
      }
    } catch (err: any) {
      setUiError(err.message || 'Failed to sync fallback reminders');
    } finally {
      setSyncingFallbacks(false);
    }
  };

  // Rank and Score all leads
  const scoredLeadsMap = useMemo(() => {
    const map = new Map<string, PrioritizedLeadScore>();
    const now = new Date();
    for (const lead of leads) {
      map.set(lead.id, evaluateLeadConnectPriority(lead, now));
    }
    return map;
  }, [leads]);

  // Connect Next Top Recommendation
  const topConnectNext = useMemo(() => {
    const nonClosed = leads.filter((l) => l.currentStage !== 'closed_lost' && l.currentStage !== 'closed_won');
    const ranked = rankFirmLeadsForNextConnect(nonClosed, new Date());
    if (ranked.length === 0) return null;
    const topScore = ranked[0];
    const fullLead = leads.find((l) => l.id === topScore.leadId);
    return fullLead ? { ...topScore, fullLead } : null;
  }, [leads]);

  const getSourceIcon = (source: string) => {
    const s = (source || '').toUpperCase();
    if (s.includes('YOUTUBE')) return <YoutubeIcon className="w-3.5 h-3.5 text-red-500" />;
    if (s.includes('INSTAGRAM')) return <InstagramIcon className="w-3.5 h-3.5 text-pink-500" />;
    if (s.includes('WHATSAPP')) return <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />;
    return <Phone className="w-3.5 h-3.5 text-accent" />;
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'EXACT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-status-success-surface text-status-success border border-status-success/30">
            <ShieldCheck className="w-3 h-3 text-status-success" /> EXACT
          </span>
        );
      case 'INFERRED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-status-warning-surface text-status-warning border border-status-warning/30">
            <ShieldAlert className="w-3 h-3 text-status-warning" /> INFERRED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-surface-subtle text-content-muted border border-border">
            UNKNOWN
          </span>
        );
    }
  };

  // Filter and Sort leads
  const filteredAndSortedLeads = useMemo(() => {
    const filtered = leads.filter((l) => {
      // Confidence Filter
      const matchesConfidence =
        selectedConfidence === 'ALL' || l.sourceConfidence === selectedConfidence;

      // Source Filter
      const matchesSource =
        selectedSource === 'ALL' || (l.leadSource || '').toUpperCase().includes(selectedSource.toUpperCase());

      // Stage Filter
      const matchesStage = selectedStage === 'ALL' || l.currentStage === selectedStage;

      // Search Query
      const matchesSearch =
        !searchQuery ||
        (l.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.phoneE164 || '').includes(searchQuery) ||
        (l.sourceCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

      return matchesConfidence && matchesSource && matchesStage && matchesSearch;
    });

    // Sorting
    return filtered.sort((a, b) => {
      if (sortBy === 'SMART_PRIORITY') {
        const scoreA = scoredLeadsMap.get(a.id)?.totalScore || 0;
        const scoreB = scoredLeadsMap.get(b.id)?.totalScore || 0;
        return scoreB - scoreA;
      }
      if (sortBy === 'DUE_DATE') {
        const nextRemA = (a.reminders || []).find((r: any) => r.status === 'PENDING')?.dueAt;
        const nextRemB = (b.reminders || []).find((r: any) => r.status === 'PENDING')?.dueAt;
        if (nextRemA && !nextRemB) return -1;
        if (!nextRemA && nextRemB) return 1;
        if (nextRemA && nextRemB) return new Date(nextRemA).getTime() - new Date(nextRemB).getTime();
        return 0;
      }
      // RECENT
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [leads, selectedConfidence, selectedSource, selectedStage, searchQuery, sortBy, scoredLeadsMap]);

  // Overall firm metrics
  const totalFirmLeads = leads.length;
  const uncontactedCount = leads.filter((l) => l.currentStage === 'new_uncontacted').length;
  const overdueRemindersCount = leads.reduce((acc, l) => {
    const hasOverdue = (l.reminders || []).some(
      (r: any) => r.status === 'PENDING' && new Date(r.dueAt).getTime() < Date.now()
    );
    return hasOverdue ? acc + 1 : acc;
  }, 0);
  const livePortalCount = leads.filter((l) => scoredLeadsMap.get(l.id)?.isLivePortalActive).length;

  return (
    <div 
      className={`space-y-6 max-w-7xl mx-auto pb-16 text-content font-sans transition-all relative ${
        isPageDragOver ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''
      }`}
      onDragEnter={(e) => {
        // Only trigger for external files (CSV/Excel), NOT internal Kanban cards
        const isFile = Array.from(e.dataTransfer?.types || []).includes('Files');
        if (!isFile) return;
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current += 1;
        if (dragCounter.current === 1) {
          setIsPageDragOver(true);
        }
      }}
      onDragOver={(e) => {
        const isFile = Array.from(e.dataTransfer?.types || []).includes('Files');
        if (!isFile) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={(e) => {
        const isFile = Array.from(e.dataTransfer?.types || []).includes('Files');
        if (!isFile) return;
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current = Math.max(0, dragCounter.current - 1);
        if (dragCounter.current === 0) {
          setIsPageDragOver(false);
        }
      }}
      onDrop={(e) => {
        const isFile = Array.from(e.dataTransfer?.types || []).includes('Files');
        if (!isFile) return;
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current = 0;
        setIsPageDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          setDroppedImportFile(e.dataTransfer.files[0]);
          setShowLeadImportModal(true);
        }
      }}
    >
      {/* File Drop Indicator (Only shows when dragging external CSV/Excel onto page) */}
      {isPageDragOver && (
        <div className="pointer-events-none absolute inset-0 z-50 rounded-2xl bg-accent/10 backdrop-blur-[2px] border-2 border-dashed border-accent flex items-center justify-center p-6 animate-in fade-in duration-150">
          <div className="bg-surface p-6 rounded-2xl border border-accent/40 shadow-2xl flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-content font-display">Drop CSV or Excel to Import Leads</h3>
            <p className="text-xs text-content-muted max-w-xs">Release file to launch Universal CSV &amp; Lead Ingestion Wizard</p>
          </div>
        </div>
      )}
      {/* Top Banner & Hallmark Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 p-6 rounded-2xl bg-surface border border-border shadow-xs">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase font-mono font-bold px-2.5 py-0.5 rounded-full bg-accent-soft text-accent-text border border-accent/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-accent" /> Live Queue
            </span>
            <HallmarkStamp type="audit" label="Speed-to-lead &lt; 5m" />
            <span className="text-[11px] font-mono text-content-muted hidden sm:inline-block">•</span>
            <span className="text-[11px] font-medium text-content-muted hidden sm:inline-block">
              {totalFirmLeads} Leads Total • {uncontactedCount} Uncontacted
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-content font-display">
            Leads &amp; Calling Desk
          </h1>
          <p className="text-xs text-content-secondary font-medium max-w-2xl">
            Unified firm-wide lead management, speed-to-lead queue dispatch, and automated follow-up reminder tracking.
          </p>
        </div>

        {/* Action Buttons & View Mode Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-surface-subtle border border-border h-9 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              aria-pressed={viewMode === 'kanban'}
              className={`h-7 px-2.5 rounded-lg flex items-center gap-1.5 text-xs transition-all cursor-pointer ${
                viewMode === 'kanban' ? 'bg-accent text-white font-bold shadow-xs' : 'text-content-secondary hover:text-content font-medium'
              }`}
              title="Interactive Pipeline Kanban Board"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              className={`h-7 px-2.5 rounded-lg flex items-center gap-1.5 text-xs transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-accent text-white font-bold shadow-xs' : 'text-content-secondary hover:text-content font-medium'
              }`}
              title="Dense Records Table"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('console')}
              aria-pressed={viewMode === 'console'}
              className={`h-7 px-2.5 rounded-lg flex items-center gap-1.5 text-xs transition-all cursor-pointer ${
                viewMode === 'console' ? 'bg-accent text-white font-bold shadow-xs' : 'text-content-secondary hover:text-content font-medium'
              }`}
              title="Telecaller 40px Speed Calling Console"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Console ⚡</span>
            </button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <button
              onClick={fetchLeads}
              disabled={loading}
              className="h-7 w-7 grid place-items-center rounded-lg text-content-secondary hover:text-content transition-all cursor-pointer disabled:opacity-50"
              title="Refresh Inbound Leads"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-accent' : ''}`} />
            </button>
          </div>

          {/* Secondary Tools Group */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSyncFallbacks}
              disabled={syncingFallbacks}
              className="h-9 px-3 bg-surface hover:bg-surface-subtle border border-border hover:border-accent/40 text-content font-semibold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Auto-scan orphan leads and generate stage-aware fallback reminders"
            >
              <Sparkles className={`w-3.5 h-3.5 text-accent ${syncingFallbacks ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{syncingFallbacks ? 'Syncing…' : 'Sync Reminders'}</span>
            </button>

            <button
              onClick={() => setShowLeadImportModal(true)}
              className="h-9 px-2.5 bg-surface hover:bg-surface-subtle border border-border hover:border-border-hover text-content font-medium text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
              title="Import Lead Data from CSV / Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-accent" />
              <span className="hidden md:inline">Import</span>
            </button>

            <button
              type="button"
              onClick={() => exportLeadsToCsv(filteredAndSortedLeads, { search: searchQuery, stage: selectedStage, channel: selectedSource })}
              className="h-9 px-2.5 bg-surface hover:bg-surface-subtle border border-border hover:border-border-hover text-content font-medium text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
              title="Export filtered buyer leads to CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-accent" />
              <span className="hidden md:inline">Export</span>
            </button>
          </div>

          <div className="w-px h-6 bg-border mx-0.5 hidden lg:block" />

          {/* Primary Action Button */}
          <button
            onClick={() => setShowCallLogModal(true)}
            className="h-9 px-4 bg-accent hover:bg-accent-hover text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <PhoneCall className="w-4 h-4" />
            <span>+ Log Call</span>
          </button>
        </div>
      </div>

      {syncSuccessMsg && (
        <div role="status" className="p-3.5 bg-status-success-surface border border-status-success/30 rounded-xl text-status-success text-xs font-semibold flex items-center justify-between shadow-xs">
          <span>{syncSuccessMsg}</span>
          <button onClick={() => setSyncSuccessMsg('')} className="text-status-success hover:opacity-80 font-bold p-1">✕</button>
        </div>
      )}

      {uiError && (
        <div role="alert" className="p-4 bg-status-danger-surface border border-status-danger/30 rounded-xl text-status-danger text-xs font-semibold flex items-center justify-between shadow-xs">
          <span>{uiError}</span>
          <button onClick={() => setUiError('')} className="text-status-danger hover:opacity-80 font-bold p-1">✕</button>
        </div>
      )}

      {/* Unified Firm Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Total Leads */}
        <div className="p-5 rounded-2xl bg-surface border border-border flex items-center justify-between shadow-2xs hover:border-border-strong hover:shadow-xs transition-all">
          <div>
            <p className="text-[11px] uppercase font-mono font-bold tracking-wider text-content-muted">Total Firm Leads</p>
            <h3 className="text-2xl font-mono font-extrabold text-content mt-1">{totalFirmLeads}</h3>
            <p className="text-[11px] text-content-secondary mt-0.5">Unified prospect pool</p>
          </div>
          <div className="p-3 rounded-xl bg-surface-subtle text-accent border border-border shadow-2xs">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Overdue Follow-ups */}
        <div className={`p-5 rounded-2xl bg-surface border flex items-center justify-between shadow-2xs transition-all ${
          overdueRemindersCount > 0
            ? 'border-status-danger/40 hover:border-status-danger'
            : 'border-border hover:border-border-strong'
        }`}>
          <div>
            <p className={`text-[11px] uppercase font-mono font-bold tracking-wider ${
              overdueRemindersCount > 0 ? 'text-status-danger' : 'text-content-muted'
            }`}>Overdue Follow-ups</p>
            <h3 className={`text-2xl font-mono font-extrabold mt-1 ${
              overdueRemindersCount > 0 ? 'text-status-danger' : 'text-content'
            }`}>{overdueRemindersCount}</h3>
            <p className="text-[11px] text-content-secondary mt-0.5">
              {overdueRemindersCount > 0 ? 'Pending urgent callbacks' : 'All follow-ups current'}
            </p>
          </div>
          <div className={`p-3 rounded-xl border shadow-2xs ${
            overdueRemindersCount > 0
              ? 'bg-status-danger-surface text-status-danger border-status-danger/30'
              : 'bg-status-success-surface text-status-success border-status-success/30'
          }`}>
            {overdueRemindersCount > 0 ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          </div>
        </div>

        {/* Card 3: Uncontacted Leads */}
        <div className={`p-5 rounded-2xl bg-surface border flex items-center justify-between shadow-2xs transition-all ${
          uncontactedCount > 0
            ? 'border-status-warning/40 hover:border-status-warning'
            : 'border-border hover:border-border-strong'
        }`}>
          <div>
            <p className={`text-[11px] uppercase font-mono font-bold tracking-wider ${
              uncontactedCount > 0 ? 'text-status-warning' : 'text-content-muted'
            }`}>Uncontacted Leads</p>
            <h3 className={`text-2xl font-mono font-extrabold mt-1 ${
              uncontactedCount > 0 ? 'text-status-warning' : 'text-content'
            }`}>{uncontactedCount}</h3>
            <p className="text-[11px] text-content-secondary mt-0.5">
              {uncontactedCount > 0 ? 'Sub-15m SLA pending' : 'Zero queue backlog'}
            </p>
          </div>
          <div className={`p-3 rounded-xl border shadow-2xs ${
            uncontactedCount > 0
              ? 'bg-status-warning-surface text-status-warning border-status-warning/30'
              : 'bg-surface-subtle text-content-muted border-border'
          }`}>
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Live Portal Views */}
        <div className="p-5 rounded-2xl bg-surface border border-border flex items-center justify-between shadow-2xs hover:border-border-strong hover:shadow-xs transition-all">
          <div>
            <p className="text-[11px] uppercase font-mono font-bold tracking-wider text-content-muted">Live Portal Activity</p>
            <h3 className="text-2xl font-mono font-extrabold text-content mt-1">{livePortalCount}</h3>
            <p className="text-[11px] text-content-secondary mt-0.5">Active presentation views</p>
          </div>
          <div className="p-3 rounded-xl bg-status-success-surface text-status-success border border-status-success/30 shadow-2xs">
            <Flame className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 🎯 TARGET CONNECT NEXT COMMAND BANNER */}
      {topConnectNext && (
        <div className="p-6 rounded-2xl bg-surface border-2 border-accent/40 shadow-md relative overflow-hidden ring-1 ring-accent/20">
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-accent text-white shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 fill-white" />
                  CONNECT NEXT #1
                </span>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                    topConnectNext.urgencyTier === 'CRITICAL'
                      ? 'bg-status-danger-surface text-status-danger border-status-danger/40'
                      : 'bg-status-warning-surface text-status-warning border-status-warning/40'
                  }`}
                >
                  Score: {topConnectNext.totalScore}/100 • {topConnectNext.urgencyTier} URGENCY
                </span>

                {topConnectNext.sourceCode && (
                  <span className="font-mono text-xs font-bold text-accent-text px-2.5 py-0.5 rounded-md bg-accent-soft border border-accent/20">
                    {topConnectNext.sourceCode}
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-xl font-bold text-content flex items-center gap-2.5 tracking-tight">
                  <span>{topConnectNext.leadName}</span>
                  {topConnectNext.phoneE164 && (
                    <span className="text-xs font-mono font-bold text-content-secondary">
                      ({topConnectNext.phoneE164})
                    </span>
                  )}
                </h2>

                <p className="text-xs text-content-secondary mt-1.5 font-medium flex items-center gap-2 flex-wrap">
                  <span className="text-amber-600 dark:text-amber-400 font-bold font-sans">
                    {topConnectNext.primaryReason}
                  </span>
                  {topConnectNext.secondaryReasons.length > 0 && (
                    <>
                      <span className="text-content-muted">•</span>
                      <span className="text-content-muted">
                        {topConnectNext.secondaryReasons[0]}
                      </span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-content-muted pt-1">
                <span className="font-semibold text-content-secondary">Recommended Action:</span>
                <span className="px-2.5 py-1 rounded-lg bg-surface-subtle text-content font-bold border border-border shadow-2xs">
                  {topConnectNext.actionDetails}
                </span>
              </div>
            </div>

            {/* Quick Action Trigger Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {topConnectNext.phoneE164 && (
                <>
                  <a
                    href={`https://wa.me/${topConnectNext.phoneE164.replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Hello ${topConnectNext.leadName}, following up from ZamZam Properties regarding your inquiry for ${
                        topConnectNext.sourceCode || 'Navi Mumbai luxury projects'
                      }.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 bg-status-success hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp Now</span>
                  </a>

                  <a
                    href={`tel:${topConnectNext.phoneE164}`}
                    className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call Now</span>
                  </a>
                </>
              )}

              <button
                onClick={() => setQuickReminderLead(topConnectNext.fullLead)}
                className="px-3.5 py-2.5 bg-surface hover:bg-surface-subtle border border-border text-content text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
              >
                <Clock className="w-4 h-4 text-accent" />
                <span>Set Reminder</span>
              </button>

              <button
                onClick={() => setSelectedLeadForDrawer(topConnectNext.fullLead)}
                className="p-2.5 bg-surface hover:bg-surface-subtle border border-border text-content hover:text-accent rounded-xl transition-all shadow-2xs cursor-pointer"
                title="View Complete Lead Profile"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Filter Toolbar & Sort Options */}
      <div className="p-4 rounded-2xl bg-surface border border-border shadow-2xs space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="md:col-span-2 relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search by buyer name, phone, code (e.g. TALOJA21)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input w-full pr-4 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-semibold text-content placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all shadow-2xs"
            />
          </div>

          {/* Sort Selector */}
          <div>
            <CustomSelect
              options={SORT_OPTIONS}
              value={sortBy}
              onChange={(val) => setSortBy(val as any)}
              className="w-full"
            />
          </div>

          {/* Confidence Filter */}
          <div>
            <CustomSelect
              options={CONFIDENCE_OPTIONS}
              value={selectedConfidence}
              onChange={(val) => setSelectedConfidence(val)}
              className="w-full"
            />
          </div>

          {/* Stage Filter */}
          <div>
            <CustomSelect
              options={STAGE_OPTIONS}
              value={selectedStage}
              onChange={(val) => setSelectedStage(val)}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area: Console vs Kanban Board vs Table View */}
      {viewMode === 'console' ? (
        <TelecallerConsoleView
          leads={leads}
          onStageChange={handleStageChange}
          onRefresh={fetchLeads}
          onLogCall={(lead) => setQuickLogLead(lead)}
          onSetReminder={(lead) => setQuickReminderLead(lead)}
        />
      ) : viewMode === 'kanban' ? (
        <LeadsKanbanBoard
          leads={filteredAndSortedLeads}
          scoredLeadsMap={scoredLeadsMap}
          onSelectLeadForDrawer={(lead) => setSelectedLeadForDrawer(lead)}
          onOpenQuickReminder={(lead) => setQuickReminderLead(lead)}
          onOpenCompleteReminder={(reminder) => setCompletingReminder(reminder)}
          onOpenQuickLog={(lead) => setQuickLogLead(lead)}
          onStageChange={handleStageChange}
        />
      ) : (
        /* Dense Table View */
        <div className="relative rounded-2xl bg-surface border border-border overflow-hidden shadow-xs">
          {/* Floating Bulk Actions Bar */}
          {selectedLeadIds.length > 0 && (
            <div className="sticky top-0 z-20 px-5 py-3 bg-accent text-white flex items-center justify-between flex-wrap gap-3 shadow-md animate-in slide-in-from-top duration-200">
              <div className="flex items-center gap-3">
                <span className="font-bold text-xs bg-white/20 px-2.5 py-1 rounded-lg">
                  {selectedLeadIds.length} Selected
                </span>
                <span className="text-xs text-white/90 font-medium hidden sm:inline">
                  Bulk update pipeline status for selected leads:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  disabled={bulkUpdating}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkStageChange(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                  className="px-3 py-1.5 rounded-xl bg-white text-slate-900 font-bold text-xs cursor-pointer shadow-xs focus:outline-none"
                >
                  <option value="" disabled>
                    {bulkUpdating ? 'Updating Status...' : '⚡ Bulk Change Status to...'}
                  </option>
                  {STAGE_OPTIONS.filter((s) => s.value !== 'ALL').map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setSelectedLeadIds([])}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-subtle text-content-secondary font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-4 px-4 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={
                        filteredAndSortedLeads.length > 0 &&
                        selectedLeadIds.length === filteredAndSortedLeads.length
                      }
                      onChange={() => {
                        if (selectedLeadIds.length === filteredAndSortedLeads.length) {
                          setSelectedLeadIds([]);
                        } else {
                          setSelectedLeadIds(filteredAndSortedLeads.map((l) => l.id));
                        }
                      }}
                      className="w-4 h-4 rounded text-accent border-border focus:ring-accent cursor-pointer"
                      title="Select / Deselect all visible leads"
                    />
                  </th>
                  <th className="py-4 px-4">Priority &amp; Buyer</th>
                  <th className="py-4 px-4">Latest Remark &amp; Audit Trail</th>
                  <th className="py-4 px-4">Scheduled Reminder / Action</th>
                  <th className="py-4 px-4">Attribution &amp; Source</th>
                  <th className="py-4 px-4">Pipeline Stage</th>
                  <th className="py-4 px-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAndSortedLeads.length > 0 ? (
                  filteredAndSortedLeads.map((lead, index) => {
                    const identities = lead.contact?.identities || [];
                    const score = scoredLeadsMap.get(lead.id);
                    const isRank1 = index === 0 && sortBy === 'SMART_PRIORITY' && score && score.totalScore >= 50;
                    const isRankTop3 = (index === 1 || index === 2) && sortBy === 'SMART_PRIORITY' && score && score.totalScore >= 40;
                    const isSelected = selectedLeadIds.includes(lead.id);

                    const pendingReminders = (lead.reminders || []).filter(
                      (r: any) => r.status === 'PENDING' || r.status === 'SNOOZED'
                    );
                    const nextReminder = pendingReminders[0];
                    const isReminderOverdue =
                      nextReminder && new Date(nextReminder.dueAt).getTime() < Date.now();

                    const comms = lead.communications || [];
                    const latestComm = comms[0];
                    const latestRemark = latestComm?.messageContent || lead.notes;

                    return (
                      <tr
                        key={lead.id}
                        className={`hover:bg-surface-subtle/80 transition-colors group cursor-pointer ${
                          isSelected
                            ? 'bg-accent-soft/40'
                            : isRank1
                            ? 'bg-accent-soft/30 border-l-4 border-l-accent'
                            : isRankTop3
                            ? 'border-l-2 border-l-accent/40'
                            : ''
                        }`}
                        onClick={() => setSelectedLeadForDrawer(lead)}
                      >
                        {/* Checkbox for Bulk Selection */}
                        <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedLeadIds((prev) =>
                                prev.includes(lead.id)
                                  ? prev.filter((id) => id !== lead.id)
                                  : [...prev, lead.id]
                              );
                            }}
                            className="w-4 h-4 rounded text-accent border-border focus:ring-accent cursor-pointer"
                          />
                        </td>

                        {/* Priority Rank & Buyer Details */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-surface-subtle border border-border text-content-secondary shrink-0 group-hover:border-accent/40 transition-colors">
                              {getSourceIcon(lead.leadSource)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-sm text-content group-hover:text-accent transition-colors">
                                  {lead.fullName || 'Navi Mumbai Prospect'}
                                </p>

                                {isRank1 && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-accent text-white shadow-2xs">
                                    #1 NEXT
                                  </span>
                                )}
                                {isRankTop3 && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent-soft text-accent-text border border-accent/20">
                                    #{index + 1}
                                  </span>
                                )}
                              </div>

                              <p className="font-mono text-xs text-content-secondary mt-0.5">
                                {lead.phoneE164
                                  ? lead.phoneE164
                                  : identities[0]?.identityValue
                                  ? `@${identities[0].identityValue}`
                                  : 'Social Lead'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 📝 VISIBLE REMARK & AUDIT TRAIL CELL (Directly visible on table list) */}
                        <td className="py-4 px-4 max-w-xs">
                          <div className="space-y-1">
                            <p className="text-xs text-content font-medium line-clamp-2 italic leading-relaxed">
                              &quot;{latestRemark || 'No remark recorded.'}&quot;
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-content-secondary">
                                <MessageSquare className="w-2.5 h-2.5 text-accent" />
                                {comms.length} {comms.length === 1 ? 'log' : 'logs'}
                              </span>

                              {lead.portals?.[0] && (
                                <a
                                  href={`/p/${lead.portals[0].token}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-accent-text hover:underline bg-accent-soft px-1.5 py-0.5 rounded border border-accent/20 cursor-pointer"
                                  title="View Client Portal & Floor Plans"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  Portal Docs
                                </a>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Scheduled Reminder / Diagnostics */}
                        <td className="py-4 px-4">
                          {nextReminder ? (
                            <div
                              className="space-y-1 group/rem"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCompletingReminder(nextReminder);
                              }}
                            >
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    isReminderOverdue
                                      ? 'bg-status-danger-surface text-status-danger border-status-danger/40'
                                      : 'bg-status-info-surface text-status-info border-status-info/40'
                                  }`}
                                >
                                  <Clock className="w-3 h-3" />
                                  {isReminderOverdue ? 'OVERDUE' : 'SCHEDULED'}
                                </span>
                                <span className="text-xs text-content-secondary font-mono font-medium">
                                  {formatDateTime(nextReminder.dueAt)}
                                </span>
                              </div>
                              <p className="text-xs text-content font-semibold truncate max-w-xs group-hover/rem:text-accent flex items-center gap-1">
                                <span>{nextReminder.title}</span>
                                <CheckCircle2 className="w-3 h-3 text-status-success opacity-0 group-hover/rem:opacity-100" />
                              </p>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuickReminderLead(lead);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-status-warning-surface border border-status-warning/40 text-status-warning text-xs font-bold inline-flex items-center gap-1.5 hover:border-status-warning cursor-pointer transition-all whitespace-nowrap"
                            >
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>No Follow-up Scheduled (+ Set SLA)</span>
                            </button>
                          )}
                        </td>

                        {/* Attribution & Code */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {getConfidenceBadge(lead.sourceConfidence)}
                              {lead.sourceCode && (
                                <span className="font-mono font-bold text-accent-text px-1.5 py-0.5 rounded bg-accent-soft border border-accent/20 text-[10px]">
                                  {lead.sourceCode}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-content-secondary line-clamp-1 font-medium">
                              {lead.campaign?.campaignName || lead.leadSource}
                            </p>
                          </div>
                        </td>

                        {/* Pipeline Stage Selector */}
                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          <CustomSelect
                            options={STAGE_OPTIONS.filter((s) => s.value !== 'ALL')}
                            value={lead.currentStage || 'new_uncontacted'}
                            onChange={(val) => handleStageChange(lead.id, val)}
                            size="xs"
                            className="w-44"
                          />
                        </td>

                        {/* Quick Action Toolbar */}
                        <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* + Log Call / Note Button */}
                            <button
                              onClick={() => setQuickLogLead(lead)}
                              className="w-8 h-8 rounded-lg bg-accent-soft hover:bg-accent text-accent-text hover:text-white border border-accent/20 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                              title="+ Log Call / Note / Remark"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setQuickReminderLead(lead)}
                              className="w-8 h-8 rounded-lg bg-surface hover:bg-accent-soft text-content-secondary hover:text-accent border border-border flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                              title="Schedule Follow-up Reminder"
                            >
                              <Bell className="w-3.5 h-3.5" />
                            </button>

                            {lead.phoneE164 && (
                              <>
                                <a
                                  href={`https://wa.me/${lead.phoneE164.replace(/\D/g, '')}?text=${encodeURIComponent(
                                    `Hello ${lead.fullName || 'Sir/Ma\'am'}, following up from ZamZam Properties regarding your inquiry for ${lead.sourceCode || 'Navi Mumbai luxury projects'}.`
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-8 h-8 rounded-lg bg-surface hover:bg-status-success-surface text-content-secondary hover:text-status-success border border-border flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                                  title="1-Click WhatsApp Reply"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                                <a
                                  href={`tel:${lead.phoneE164}`}
                                  className="w-8 h-8 rounded-lg bg-surface hover:bg-accent-soft text-content-secondary hover:text-accent border border-border flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                                  title="1-Click Phone Call"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              </>
                            )}

                            <button
                              onClick={() => setSelectedLeadForDrawer(lead)}
                              className="w-8 h-8 rounded-lg bg-surface hover:bg-surface-subtle text-content-secondary hover:text-content border border-border flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                              title="View Full Profile & History"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-content-muted">
                      No leads found matching the selected filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Log Call / Note Modal */}
      <QuickLogModal
        open={Boolean(quickLogLead)}
        onClose={() => setQuickLogLead(null)}
        lead={quickLogLead}
        onLogSaved={() => {
          fetchLeads();
        }}
      />

      {/* Quick Reminder Modal */}
      <QuickReminderModal
        open={Boolean(quickReminderLead)}
        onClose={() => setQuickReminderLead(null)}
        lead={quickReminderLead}
        onReminderSaved={() => {
          fetchLeads();
        }}
      />

      {/* Complete Reminder & Prompt Next Action Modal */}
      <CompleteReminderPrompt
        open={Boolean(completingReminder)}
        onClose={() => setCompletingReminder(null)}
        reminder={completingReminder}
        onCompleted={() => {
          fetchLeads();
        }}
      />

      {/* Slide-over Evidence Drawer */}
      {selectedLeadForDrawer && (
        <SourceEvidenceDrawer
          lead={selectedLeadForDrawer}
          onClose={() => setSelectedLeadForDrawer(null)}
          onOpenMergeModal={(lead) => setMergeSourceLead(lead)}
          onLeadUpdated={fetchLeads}
        />
      )}

      {/* Call Log Modal */}
      {showCallLogModal && (
        <CallLogModal
          isOpen={true}
          onClose={() => setShowCallLogModal(false)}
          onSuccess={fetchLeads}
        />
      )}

      {/* Lead CSV Import Modal */}
      {showLeadImportModal && (
        <LeadCsvImportModal
          initialFile={droppedImportFile}
          onClose={() => {
            setShowLeadImportModal(false);
            setDroppedImportFile(null);
          }}
          onImportSuccess={() => {
            fetchLeads();
            setDroppedImportFile(null);
          }}
        />
      )}

      {/* Contact Merge Modal */}
      {mergeSourceLead && (
        <ContactMergeModal
          isOpen={true}
          sourceLead={mergeSourceLead}
          allLeads={leads}
          onClose={() => setMergeSourceLead(null)}
          onSuccess={fetchLeads}
        />
      )}
    </div>
  );
}
