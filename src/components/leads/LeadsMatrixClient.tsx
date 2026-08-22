'use client';

import React, { useState, useMemo } from 'react';
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
  Edit3
} from 'lucide-react';
import { YoutubeIcon, InstagramIcon } from '@/components/icons/SocialIcons';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';
import { CallLogModal } from '@/components/leads/CallLogModal';
import { SourceEvidenceDrawer } from '@/components/leads/SourceEvidenceDrawer';
import { ContactMergeModal } from '@/components/leads/ContactMergeModal';
import { LeadCsvImportModal } from '@/components/leads/LeadCsvImportModal';
import { LeadsKanbanBoard } from '@/components/leads/LeadsKanbanBoard';
import { QuickReminderModal } from '@/components/reminders/QuickReminderModal';
import { CompleteReminderPrompt } from '@/components/reminders/CompleteReminderPrompt';
import { QuickLogModal } from '@/components/leads/QuickLogModal';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { evaluateLeadConnectPriority, rankFirmLeadsForNextConnect, PrioritizedLeadScore } from '@/lib/domain/prioritization-engine';
import { TelecallerConsoleView } from '@/components/leads/TelecallerConsoleView';

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

  // Modals & Drawers
  const [showCallLogModal, setShowCallLogModal] = useState(false);
  const [showLeadImportModal, setShowLeadImportModal] = useState(false);
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<any | null>(null);
  const [mergeSourceLead, setMergeSourceLead] = useState<any | null>(null);
  const [quickReminderLead, setQuickReminderLead] = useState<any | null>(null);
  const [quickLogLead, setQuickLogLead] = useState<any | null>(null);
  const [completingReminder, setCompletingReminder] = useState<any | null>(null);
  const [uiError, setUiError] = useState('');
  const [syncSuccessMsg, setSyncSuccessMsg] = useState('');

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

  const handleStageChange = async (leadId: string, newStage: string) => {
    setUiError('');
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
      } else {
        throw new Error(data.error || 'The stage update was rejected.');
      }
    } catch (err: any) {
      setUiError(`${err.message || 'Unable to update the lead stage.'}`);
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
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-content font-sans">
      {/* Top Banner & Hallmark Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 p-6 rounded-2xl bg-surface border border-border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-content flex items-center gap-2.5">
              Firm Lead Operations Workstation
              <span className="text-xs uppercase font-mono font-bold px-2.5 py-0.5 rounded-full bg-accent-soft text-accent-text border border-accent/20">
                Unified Stream
              </span>
            </h1>
          </div>
          <p className="text-xs text-content-secondary">
            Unified firm-wide lead management • Scheduled follow-up reminders • Intelligent Next-Action prioritization
          </p>
        </div>

        {/* Action Buttons & View Mode Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-surface-subtle border border-border h-10">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              aria-pressed={viewMode === 'kanban'}
              className={`h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'kanban' ? 'bg-accent text-white font-bold shadow-xs' : 'text-content-secondary hover:text-content'
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
              className={`h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-accent text-white font-bold shadow-xs' : 'text-content-secondary hover:text-content'
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
              className={`h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'console' ? 'bg-accent text-white font-bold shadow-xs' : 'text-content-secondary hover:text-content'
              }`}
              title="Telecaller 40px Speed Calling Console with Brixi AI"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Console ⚡</span>
            </button>
          </div>

          {/* Sync Lead Fallbacks */}
          <button
            type="button"
            onClick={handleSyncFallbacks}
            disabled={syncingFallbacks}
            className="h-10 px-3.5 bg-surface hover:bg-surface-subtle border border-border text-content font-semibold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Auto-scan orphan leads and generate stage-aware fallback reminders"
          >
            <Sparkles className={`w-3.5 h-3.5 text-accent ${syncingFallbacks ? 'animate-spin' : ''}`} />
            <span>{syncingFallbacks ? 'Syncing…' : 'Sync Fallbacks'}</span>
          </button>

          <button
            onClick={() => setShowLeadImportModal(true)}
            className="h-10 px-3.5 bg-surface hover:bg-surface-subtle border border-border text-content font-semibold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Import Lead Data from CSV / Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-accent" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => setShowCallLogModal(true)}
            className="h-10 px-4 bg-accent hover:bg-accent-hover text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Log Call</span>
          </button>

          <button
            onClick={fetchLeads}
            disabled={loading}
            className="h-10 w-10 grid place-items-center bg-surface hover:bg-surface-subtle border border-border text-content-secondary hover:text-content rounded-xl transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
            title="Refresh Inbound Leads"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent' : ''}`} />
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
                    <span className="text-xs font-mono font-normal text-content-secondary">
                      ({topConnectNext.phoneE164})
                    </span>
                  )}
                </h2>

                <p className="text-xs text-content-secondary mt-1 font-medium flex items-center gap-2">
                  <span className="text-accent-text font-bold font-sans">
                    {topConnectNext.primaryReason}
                  </span>
                  {topConnectNext.secondaryReasons.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-content-muted">
                        {topConnectNext.secondaryReasons[0]}
                      </span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-content-muted pt-1">
                <span>Recommended Action:</span>
                <span className="px-2 py-0.5 rounded bg-surface-subtle text-content font-bold border border-border">
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
                    className="px-4 py-2.5 bg-status-success hover:opacity-90 text-zinc-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp Now</span>
                  </a>

                  <a
                    href={`tel:${topConnectNext.phoneE164}`}
                    className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call Now</span>
                  </a>
                </>
              )}

              <button
                onClick={() => setQuickReminderLead(topConnectNext.fullLead)}
                className="px-3.5 py-2.5 bg-surface hover:bg-surface-subtle border border-border text-content text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Clock className="w-4 h-4 text-accent" />
                <span>Set Reminder</span>
              </button>

              <button
                onClick={() => setSelectedLeadForDrawer(topConnectNext.fullLead)}
                className="p-2.5 bg-surface hover:bg-surface-subtle border border-border text-content-secondary hover:text-content rounded-xl transition-all shadow-xs cursor-pointer"
                title="View Complete Lead Profile"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Firm Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border flex items-center justify-between shadow-xs hover:border-border-strong transition-all">
          <div>
            <p className="text-[11px] uppercase font-bold tracking-wider text-content-secondary">Total Firm Leads</p>
            <h3 className="text-2xl font-bold text-content mt-1">{totalFirmLeads}</h3>
            <p className="text-[11px] text-content-muted mt-0.5">Unified firm prospect pool</p>
          </div>
          <div className="p-3 rounded-xl bg-surface-subtle text-accent border border-border">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-status-danger/30 flex items-center justify-between shadow-xs hover:border-status-danger/50 transition-all">
          <div>
            <p className="text-[11px] uppercase font-bold tracking-wider text-content-secondary">Overdue Follow-ups</p>
            <h3 className="text-2xl font-bold text-status-danger mt-1">{overdueRemindersCount}</h3>
            <p className="text-[11px] text-content-muted mt-0.5">Missed client call promises</p>
          </div>
          <div className="p-3 rounded-xl bg-status-danger-surface text-status-danger border border-status-danger/30">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-status-warning/30 flex items-center justify-between shadow-xs hover:border-status-warning/50 transition-all">
          <div>
            <p className="text-[11px] uppercase font-bold tracking-wider text-content-secondary">Uncontacted Leads</p>
            <h3 className="text-2xl font-bold text-status-warning mt-1">{uncontactedCount}</h3>
            <p className="text-[11px] text-content-muted mt-0.5">Sub-15m speed-to-lead pending</p>
          </div>
          <div className="p-3 rounded-xl bg-status-warning-surface text-status-warning border border-status-warning/30">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-status-success/30 flex items-center justify-between shadow-xs hover:border-status-success/50 transition-all">
          <div>
            <p className="text-[11px] uppercase font-bold tracking-wider text-content-secondary">Live Portal Activity</p>
            <h3 className="text-2xl font-bold text-status-success mt-1">{livePortalCount}</h3>
            <p className="text-[11px] text-content-muted mt-0.5">Active buyer presentation views</p>
          </div>
          <div className="p-3 rounded-xl bg-status-success-surface text-status-success border border-status-success/30">
            <Flame className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Sort Options */}
      <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-content-muted" />
            <input
              type="text"
              placeholder="Search by buyer name, phone, code (e.g. TALOJA21)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-surface border border-border rounded-xl text-xs font-medium text-content placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
            />
          </div>

          {/* Sort Selector */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl text-xs font-bold text-accent-text focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent cursor-pointer transition-all"
            >
              <option value="SMART_PRIORITY" className="bg-surface text-content font-medium">🎯 Smart Priority (Connect Next)</option>
              <option value="DUE_DATE" className="bg-surface text-content font-medium">⏰ Scheduled Reminder Date</option>
              <option value="RECENT" className="bg-surface text-content font-medium">📅 Newest Inbound Date</option>
            </select>
          </div>

          {/* Confidence Filter */}
          <div>
            <select
              value={selectedConfidence}
              onChange={(e) => setSelectedConfidence(e.target.value)}
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl text-xs font-semibold text-content focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent cursor-pointer transition-all"
            >
              <option value="ALL" className="bg-surface text-content font-medium">All Confidence Levels</option>
              <option value="EXACT" className="bg-surface text-content font-medium">🟢 Exact Attribution Only</option>
              <option value="INFERRED" className="bg-surface text-content font-medium">🟡 Inferred Keyword Match</option>
              <option value="UNKNOWN" className="bg-surface text-content font-medium">⚪ Unknown Organic Direct</option>
            </select>
          </div>

          {/* Stage Filter */}
          <div>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl text-xs font-semibold text-content focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent cursor-pointer transition-all"
            >
              <option value="ALL" className="bg-surface text-content font-medium">All Pipeline Stages</option>
              <option value="new_uncontacted" className="bg-surface text-content font-medium">🔴 New Lead (Uncontacted)</option>
              <option value="discovery_call" className="bg-surface text-content font-medium">📞 Discovery &amp; Qualifying</option>
              <option value="portal_shared" className="bg-surface text-content font-medium">📑 Shortlist / Deck Sent</option>
              <option value="visit_scheduled" className="bg-surface text-content font-medium">🚗 Site Visit Scheduled</option>
              <option value="visit_done" className="bg-surface text-content font-medium">🏢 Site Visit Completed</option>
              <option value="revisit_scheduled" className="bg-surface text-content font-medium">🔄 Re-Visit / Family Tour</option>
              <option value="negotiation_token" className="bg-surface text-content font-medium">💰 Price Negotiation &amp; Token</option>
              <option value="under_registration" className="bg-surface text-content font-medium">📝 Agreement &amp; Registration</option>
              <option value="closed_won" className="bg-surface text-content font-medium">🏆 Booking Done (Closed Won)</option>
              <option value="on_hold_nurture" className="bg-surface text-content font-medium">⏳ Nurture / Follow-Up Later</option>
              <option value="closed_lost" className="bg-surface text-content font-medium">❌ Lost / Dropped</option>
            </select>
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
        <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-subtle text-content-secondary font-bold uppercase tracking-wider text-[11px]">
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
                          isRank1
                            ? 'bg-accent-soft/30 border-l-4 border-l-accent'
                            : isRankTop3
                            ? 'border-l-2 border-l-accent/40'
                            : ''
                        }`}
                        onClick={() => setSelectedLeadForDrawer(lead)}
                      >
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
                                  href={`/portal/${lead.portals[0].token}`}
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
                                <span suppressHydrationWarning className="text-xs text-content-secondary font-mono font-medium">
                                  {new Date(nextReminder.dueAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    day: 'numeric',
                                    month: 'short',
                                  })}
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
                              className="px-2.5 py-1 rounded-lg bg-status-warning-surface border border-status-warning/40 text-status-warning text-xs font-bold flex items-center gap-1.5 hover:border-status-warning cursor-pointer transition-all"
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
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
                          <select
                            value={lead.currentStage}
                            onChange={(e) => handleStageChange(lead.id, e.target.value)}
                            className="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs font-semibold text-content hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent cursor-pointer transition-all"
                          >
                            <option value="new_uncontacted" className="bg-surface text-content">🔴 New Lead (Uncontacted)</option>
                            <option value="discovery_call" className="bg-surface text-content">📞 Discovery &amp; Qualifying</option>
                            <option value="portal_shared" className="bg-surface text-content">📑 Shortlist / Deck Sent</option>
                            <option value="visit_scheduled" className="bg-surface text-content">🚗 Site Visit Scheduled</option>
                            <option value="visit_done" className="bg-surface text-content">🏢 Site Visit Completed</option>
                            <option value="revisit_scheduled" className="bg-surface text-content">🔄 Re-Visit / Family Tour</option>
                            <option value="negotiation_token" className="bg-surface text-content">💰 Price Negotiation &amp; Token</option>
                            <option value="under_registration" className="bg-surface text-content">📝 Agreement &amp; Registration</option>
                            <option value="closed_won" className="bg-surface text-content">🏆 Booking Done (Closed Won)</option>
                            <option value="on_hold_nurture" className="bg-surface text-content">⏳ Nurture / Follow-Up Later</option>
                            <option value="closed_lost" className="bg-surface text-content">❌ Lost / Dropped</option>
                          </select>
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
          onClose={() => setShowLeadImportModal(false)}
          onImportSuccess={fetchLeads}
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
