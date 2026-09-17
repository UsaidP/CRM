'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Phone,
  MessageSquare,
  Clock,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Zap,
  Calendar,
  CheckCircle2,
  Building2,
  Flame,
  ArrowRight,
  GripVertical,
  MoveRight,
  FileText,
  Edit3,
  PlusCircle,
  UserCheck,
} from 'lucide-react';
import { PrioritizedLeadScore } from '@/lib/domain/prioritization-engine';
import { formatDateShort } from '@/lib/date-utils';
import { CustomSelect, type CustomSelectOption } from '@/components/ui/CustomSelect';

export interface KanbanStageDef {
  id: string;
  label: string;
  shortLabel: string;
  dotColor: string;
  colorClass: string;
  badgeClass: string;
  description: string;
}

export const KANBAN_STAGES: KanbanStageDef[] = [
  {
    id: 'new_uncontacted',
    label: 'New Inbound (Sub-15m SLA)',
    shortLabel: 'New Leads',
    dotColor: 'bg-status-danger',
    colorClass: 'border-l-status-danger',
    badgeClass: 'bg-status-danger-surface text-status-danger border-status-danger/30',
    description: 'Fresh speed-to-lead qualification',
  },
  {
    id: 'discovery_call',
    label: 'Discovery & Qualifying',
    shortLabel: 'Discovery',
    dotColor: 'bg-status-warning',
    colorClass: 'border-l-status-warning',
    badgeClass: 'bg-status-warning-surface text-status-warning border-status-warning/30',
    description: 'Budget, BHK & micro-market check',
  },
  {
    id: 'portal_shared',
    label: 'Shortlist / Deck Sent',
    shortLabel: 'Deck Sent',
    dotColor: 'bg-accent',
    colorClass: 'border-l-accent',
    badgeClass: 'bg-accent-soft text-accent-text border-accent/30',
    description: 'Portal telemetry & unit inspection',
  },
  {
    id: 'visit_scheduled',
    label: 'Site Visit Scheduled',
    shortLabel: 'Visit Fixed',
    dotColor: 'bg-sky-500',
    colorClass: 'border-l-sky-500',
    badgeClass: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800',
    description: 'Cab logistics & developer POC',
  },
  {
    id: 'visit_confirmed',
    label: 'Site Visit Confirmed',
    shortLabel: 'Visit Confirmed',
    dotColor: 'bg-indigo-500',
    colorClass: 'border-l-indigo-500',
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    description: 'Buyer confirmed attendance & slot',
  },
  {
    id: 'visit_done',
    label: 'Site Visit Completed',
    shortLabel: 'Tour Done',
    dotColor: 'bg-emerald-500',
    colorClass: 'border-l-emerald-500',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    description: 'Post-visit feedback & token offer',
  },
  {
    id: 'negotiation_token',
    label: 'Negotiation & Token',
    shortLabel: 'Negotiating',
    dotColor: 'bg-purple-500',
    colorClass: 'border-l-purple-500',
    badgeClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    description: 'Price revision & booking slip',
  },
  {
    id: 'closed_won',
    label: 'Booking Done (Closed Won)',
    shortLabel: 'Closed Won',
    dotColor: 'bg-emerald-600',
    colorClass: 'border-l-emerald-600',
    badgeClass: 'bg-status-success-surface text-status-success border-status-success/30',
    description: 'Commission ledger booked',
  },
  {
    id: 'on_hold_nurture',
    label: 'Nurture / Follow-Up Later',
    shortLabel: 'Nurture',
    dotColor: 'bg-slate-400',
    colorClass: 'border-l-border',
    badgeClass: 'bg-surface-subtle text-content-secondary border-border',
    description: 'Long term market updates',
  },
];

interface DragTargetPosition {
  stageId: string;
  insertIndex: number; // 0 for top, N for middle, length for bottom
}

function cleanCardRemark(rawText?: string | null): string {
  if (!rawText) return 'No remark entered yet.';
  const cleaned = rawText
    .replace(/\[Priority:\s*[^\]]+\]/gi, '')
    .replace(/\[WhatsApp:\s*[^\]]+\]/gi, '')
    .replace(/\[Tags:\s*[^\]]+\]/gi, '')
    .replace(/\[Client Portal[^\]]*\]/gi, '')
    .trim();
  return cleaned || rawText;
}

interface LeadsKanbanBoardProps {
  leads: any[];
  scoredLeadsMap: Map<string, PrioritizedLeadScore>;
  onSelectLeadForDrawer: (lead: any) => void;
  onOpenQuickReminder: (lead: any) => void;
  onOpenCompleteReminder: (reminder: any) => void;
  onOpenQuickLog: (lead: any) => void;
  onStageChange: (leadId: string, newStage: string) => Promise<void>;
}

export function LeadsKanbanBoard({
  leads,
  scoredLeadsMap,
  onSelectLeadForDrawer,
  onOpenQuickReminder,
  onOpenCompleteReminder,
  onOpenQuickLog,
  onStageChange,
}: LeadsKanbanBoardProps) {
  const [updatingStageLeadId, setUpdatingStageLeadId] = useState<string | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTargetPosition | null>(null);
  const [selectedMobileStage, setSelectedMobileStage] = useState<string>('ALL');

  const activeDragIdRef = useRef<string | null>(null);
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Local persistent order mapping: stageId -> string[] of leadIds
  const [stageOrderMap, setStageOrderMap] = useState<Record<string, string[]>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('crm_kanban_stage_orders');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Reorder stage leads based on custom user drag sequence
  const getOrderedStageLeads = useCallback(
    (stageId: string, stageLeads: any[]) => {
      const orderList = stageOrderMap[stageId];
      if (!orderList || orderList.length === 0) return stageLeads;

      const orderMap = new Map<string, number>();
      orderList.forEach((id, idx) => orderMap.set(id, idx));

      return [...stageLeads].sort((a, b) => {
        const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999999;
        const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999999;
        return idxA - idxB;
      });
    },
    [stageOrderMap]
  );

  // Smooth scroll board horizontally
  const scrollBoard = (direction: 'left' | 'right') => {
    if (!boardScrollRef.current) return;
    const distance = 350;
    boardScrollRef.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  // Jump or filter to stage
  const scrollToStage = (stageId: string) => {
    setSelectedMobileStage(stageId);
    if (stageId === 'ALL') {
      if (boardScrollRef.current) {
        boardScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }
      return;
    }
    const colEl = columnRefs.current[stageId];
    if (colEl) {
      colEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  const handleMoveStage = async (leadId: string, newStage: string, e?: React.MouseEvent | React.ChangeEvent | React.DragEvent) => {
    if (e && 'stopPropagation' in e) {
      e.stopPropagation();
    }
    setUpdatingStageLeadId(leadId);
    try {
      await onStageChange(leadId, newStage);
    } finally {
      setUpdatingStageLeadId(null);
    }
  };

  const handleDragStart = (leadId: string, e: React.DragEvent) => {
    e.stopPropagation();
    activeDragIdRef.current = leadId;
    setDraggedLeadId(leadId);
    try {
      e.dataTransfer.setData('text/plain', leadId);
      e.dataTransfer.setData('application/x-lead-id', leadId);
      e.dataTransfer.effectAllowed = 'move';
    } catch {
      // Ignore in restricted environments
    }
  };

  const handleDragEnd = (e?: React.DragEvent) => {
    if (e) e.stopPropagation();
    activeDragIdRef.current = null;
    setDraggedLeadId(null);
    setDragTarget(null);
  };

  // Drag over a specific card: decide whether insertion is ABOVE (idx) or BELOW (idx + 1)
  const handleCardDragOver = (stageId: string, index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertIndex = e.clientY < midY ? index : index + 1;

    setDragTarget((prev) => {
      if (prev?.stageId === stageId && prev?.insertIndex === insertIndex) return prev;
      return { stageId, insertIndex };
    });
  };

  const handleCardDrop = (stageId: string, index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertIndex = e.clientY < midY ? index : index + 1;
    executeDrop(stageId, insertIndex, e);
  };

  // Drag over the general column zone (e.g. empty column or open space at top/bottom)
  const handleColumnContainerDragOver = (stageId: string, leadCount: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    if (leadCount === 0) {
      setDragTarget((prev) => {
        if (prev?.stageId === stageId && prev?.insertIndex === 0) return prev;
        return { stageId, insertIndex: 0 };
      });
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const isTopHalf = e.clientY < rect.top + 70;
    const insertIndex = isTopHalf ? 0 : leadCount;

    setDragTarget((prev) => {
      if (prev?.stageId === stageId && prev?.insertIndex === insertIndex) return prev;
      return { stageId, insertIndex };
    });
  };

  const handleColumnContainerDrop = (stageId: string, leadCount: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (leadCount === 0) {
      executeDrop(stageId, 0, e);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const isTopHalf = e.clientY < rect.top + 70;
      executeDrop(stageId, isTopHalf ? 0 : leadCount, e);
    }
  };

  // Execute precise reordering & stage transition
  const executeDrop = async (stageId: string, insertIndex: number, e: React.DragEvent) => {
    let leadId: string | null = null;
    try {
      leadId = e.dataTransfer.getData('application/x-lead-id') || e.dataTransfer.getData('text/plain');
    } catch {
      leadId = null;
    }
    if (!leadId) {
      leadId = activeDragIdRef.current || draggedLeadId;
    }

    activeDragIdRef.current = null;
    setDraggedLeadId(null);
    setDragTarget(null);

    if (!leadId) return;

    const currentLead = leads.find((l) => l.id === leadId);
    if (!currentLead) return;

    const sourceStage = currentLead.currentStage || 'new_uncontacted';
    const isStageChange = sourceStage !== stageId;

    // 1. Update position map in state and persist to localStorage
    setStageOrderMap((prev) => {
      const nextMap = { ...prev };

      // Remove from source stage order list
      const currentSourceOrder = (
        nextMap[sourceStage] ||
        leads.filter((l) => (l.currentStage || 'new_uncontacted') === sourceStage).map((l) => l.id)
      ).filter((id) => id !== leadId);
      nextMap[sourceStage] = currentSourceOrder;

      // Insert at target index in target stage order list
      const currentTargetOrder = (
        nextMap[stageId] ||
        leads.filter((l) => (l.currentStage || 'new_uncontacted') === stageId).map((l) => l.id)
      ).filter((id) => id !== leadId);

      const targetIdx = Math.max(0, Math.min(insertIndex, currentTargetOrder.length));
      currentTargetOrder.splice(targetIdx, 0, leadId);
      nextMap[stageId] = currentTargetOrder;

      try {
        localStorage.setItem('crm_kanban_stage_orders', JSON.stringify(nextMap));
      } catch {
        // Safe fallback
      }

      return nextMap;
    });

    // 2. If stage changed, update in backend
    if (isStageChange) {
      await handleMoveStage(leadId, stageId, e);
    }
  };

  const displayedStages = selectedMobileStage === 'ALL'
    ? KANBAN_STAGES
    : KANBAN_STAGES.filter((s) => s.id === selectedMobileStage);

  return (
    <div className="space-y-3 pb-8">
      {/* 🧭 Stage Navigation Bar & Horizontal Pan Controls */}
      <div className="flex items-center justify-between gap-2 p-1.5 bg-surface rounded-2xl border border-border shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll no-scrollbar flex-1 min-w-0 py-0.5">
          <button
            type="button"
            onClick={() => scrollToStage('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedMobileStage === 'ALL'
                ? 'bg-accent text-white shadow-xs'
                : 'text-content-muted hover:text-content hover:bg-surface-subtle'
            }`}
          >
            All Stages ({leads.length})
          </button>
          {KANBAN_STAGES.map((stage) => {
            const count = leads.filter((l) => (l.currentStage || 'new_uncontacted') === stage.id).length;
            const isSelected = selectedMobileStage === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => scrollToStage(stage.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-content-muted hover:text-content hover:bg-surface-subtle'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${stage.dotColor} shrink-0`} />
                <span>{stage.shortLabel}</span>
                <span className="font-mono text-[10px] opacity-80">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Quick Pan Controls (< and >) */}
        <div className="hidden sm:flex items-center gap-1 shrink-0 pl-2 border-l border-border/60">
          <button
            type="button"
            onClick={() => scrollBoard('left')}
            className="p-1.5 rounded-xl border border-border bg-surface-subtle hover:bg-surface text-content-secondary hover:text-content transition-all shadow-2xs cursor-pointer"
            title="Scroll Left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBoard('right')}
            className="p-1.5 rounded-xl border border-border bg-surface-subtle hover:bg-surface text-content-secondary hover:text-content transition-all shadow-2xs cursor-pointer"
            title="Scroll Right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Kanban Columns Container (with dedicated bottom scrollbar clearance) */}
      <div
        ref={boardScrollRef}
        className="overflow-x-auto touch-scroll pb-6 pt-1 px-1 custom-scrollbar scroll-smooth"
      >
        <div className={`flex gap-4 ${selectedMobileStage === 'ALL' ? 'min-w-max items-start' : 'flex-col lg:flex-row min-w-0'}`}>
          {displayedStages.map((stage) => {
            const rawStageLeads = leads.filter(
              (l) => (l.currentStage || 'new_uncontacted') === stage.id
            );
            const orderedStageLeads = getOrderedStageLeads(stage.id, rawStageLeads);
            const isColumnTargeted = dragTarget?.stageId === stage.id;

            return (
              <div
                key={stage.id}
                ref={(el) => {
                  columnRefs.current[stage.id] = el;
                }}
                className={`${
                  selectedMobileStage === 'ALL' ? 'w-72 sm:w-80' : 'w-full lg:w-80'
                } flex flex-col rounded-2xl bg-surface border shadow-2xs overflow-hidden transition-all duration-200 shrink-0 ${
                  isColumnTargeted
                    ? 'border-accent ring-2 ring-accent/30 bg-accent-soft/10 shadow-md'
                    : 'border-border'
                }`}
              >
                {/* Stage Column Header */}
                <div className="p-3.5 border-b border-border bg-surface-subtle/50 flex items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${stage.dotColor} shrink-0`} />
                      <h3 className="font-bold text-xs text-content font-display tracking-tight truncate">
                        {stage.shortLabel}
                      </h3>
                      <span className="px-2 py-0.2 text-[11px] font-mono font-bold bg-surface text-content border border-border rounded-full shadow-2xs">
                        {orderedStageLeads.length}
                      </span>
                    </div>
                    <p className="text-[10px] text-content-muted truncate">{stage.description}</p>
                  </div>
                </div>

                {/* Cards Container (Drop Target Zone with comfortable bottom breathing room) */}
                <div
                  onDragOver={(e) => handleColumnContainerDragOver(stage.id, orderedStageLeads.length, e)}
                  onDrop={(e) => handleColumnContainerDrop(stage.id, orderedStageLeads.length, e)}
                  className="p-3 pb-6 flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-270px)] min-h-[300px] custom-scrollbar touch-scroll overscroll-contain"
                >
                  {/* Insertion Slot at Top (Index 0) */}
                  {draggedLeadId && isColumnTargeted && dragTarget?.insertIndex === 0 && (
                    <div className="p-2.5 rounded-xl border-2 border-dashed border-accent bg-accent-soft/40 flex items-center justify-center gap-2 text-xs font-bold text-accent-text animate-pulse shadow-xs transition-all">
                      <ArrowRight className="w-3.5 h-3.5 rotate-90 text-accent" />
                      <span>Insert at Top of {stage.shortLabel}</span>
                    </div>
                  )}

                  {orderedStageLeads.length === 0 ? (
                    <div className="h-36 rounded-xl border border-dashed border-border/80 bg-surface-subtle/30 flex flex-col items-center justify-center text-center p-4 text-content-muted text-xs space-y-1.5">
                      <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-content-muted">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-content-secondary">No leads in {stage.shortLabel}</span>
                      <span className="text-[10px] text-content-muted">Drag cards here to update stage</span>
                    </div>
                  ) : (
                    orderedStageLeads.map((lead, idx) => {
                      const isCardBeingDragged = draggedLeadId === lead.id;
                      const isUpdating = updatingStageLeadId === lead.id;
                      const score = scoredLeadsMap.get(lead.id);
                      const pendingReminders = (lead.reminders || []).filter(
                        (r: any) => r.status === 'PENDING' || r.status === 'SNOOZED'
                      );
                      const topReminder = pendingReminders[0];

                      const isOverdue =
                        topReminder && new Date(topReminder.dueAt).getTime() < Date.now();
                      const isDueToday =
                        topReminder &&
                        new Date(topReminder.dueAt).toDateString() === new Date().toDateString();

                      const comms = lead.communications || [];
                      const latestComm = comms[0];
                      const latestRemark = latestComm?.messageContent || lead.notes;

                      return (
                        <React.Fragment key={lead.id}>
                          <div
                            draggable={!isUpdating}
                            onDragStart={(e) => handleDragStart(lead.id, e)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleCardDragOver(stage.id, idx, e)}
                            onDrop={(e) => handleCardDrop(stage.id, idx, e)}
                            onClick={() => onSelectLeadForDrawer(lead)}
                            className={`p-3.5 rounded-xl bg-surface border border-border hover:border-accent/40 shadow-2xs hover:shadow-xs transition-all cursor-grab active:cursor-grabbing space-y-2.5 group ${
                              stage.colorClass
                            } border-l-4 ${
                              isCardBeingDragged ? 'opacity-30 scale-95 border-dashed border-accent' : ''
                            } ${isUpdating ? 'opacity-60 pointer-events-none' : ''}`}
                          >
                            {/* Top Meta: Drag Handle, Connect Next Rank & Attribution Code */}
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className="text-content-muted group-hover:text-content transition-colors cursor-grab"
                                  title="Drag lead card across stages"
                                >
                                  <GripVertical className="w-3.5 h-3.5" />
                                </span>

                                {score && score.totalScore >= 60 && (
                                  <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-accent text-white flex items-center gap-1 shadow-2xs">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    #{score.urgencyTier}
                                  </span>
                                )}
                                {lead.sourceCode && (
                                  <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-accent-soft text-accent-text border border-accent/20">
                                    {lead.sourceCode}
                                  </span>
                                )}
                              </div>

                              <div className="text-[10px] text-content-muted font-mono font-semibold">
                                {formatDateShort(lead.createdAt)}
                              </div>
                            </div>

                            {/* Buyer Info */}
                            <div>
                              <h4 className="font-bold text-xs text-content group-hover:text-accent transition-colors">
                                {lead.fullName || 'Navi Mumbai Prospect'}
                              </h4>
                              {lead.phoneE164 ? (
                                <p className="text-[11px] font-mono text-content-secondary mt-0.5">
                                  {lead.phoneE164}
                                </p>
                              ) : (
                                <p className="text-[10px] text-content-muted italic">Social Lead (No phone)</p>
                              )}
                              <div className="flex items-center gap-1 text-[10px] text-content-muted mt-1">
                                <UserCheck className="w-3 h-3 text-accent shrink-0" />
                                <span className="truncate font-medium text-content-secondary">
                                  {lead.assignedBroker?.fullName || 'Unassigned'}
                                </span>
                                {lead.assignedBroker?.role && (
                                  <span className="text-[8px] px-1 py-0.2 rounded bg-surface border border-border text-content-muted font-mono uppercase">
                                    {lead.assignedBroker.role}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* 📝 VISIBLE REMARK & COMMUNICATION AUDIT TRAIL BOX */}
                            <div className="p-2.5 rounded-xl bg-surface-subtle border border-border space-y-1.5">
                              <div className="flex items-center justify-between gap-1 text-[10px]">
                                <span className="font-bold text-content flex items-center gap-1">
                                  <FileText className="w-3 h-3 text-accent" />
                                  Latest Remark / Note:
                                </span>
                                <span className="text-content-muted font-mono">
                                  {latestComm ? formatDateShort(latestComm.createdAt) : 'Recent'}
                                </span>
                              </div>

                              <p className="text-[11px] text-content font-medium line-clamp-2 leading-relaxed italic bg-surface/50 p-1.5 rounded-lg border border-border/50">
                                &quot;{cleanCardRemark(latestRemark)}&quot;
                              </p>

                              {/* Audit Trail Count & Portal/Doc Links */}
                              <div className="pt-1 flex items-center justify-between gap-1.5 flex-wrap border-t border-border/60">
                                <span className="text-[10px] font-bold text-content-secondary flex items-center gap-1">
                                  <MessageSquare className="w-2.5 h-2.5 text-accent" />
                                  {comms.length} Communication {comms.length === 1 ? 'Trail' : 'Trails'}
                                </span>

                                {lead.portals?.[0] && (
                                  <a
                                    href={`/p/${lead.portals[0].token}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[10px] font-bold text-accent-text hover:underline flex items-center gap-1 bg-accent-soft px-1.5 py-0.5 rounded border border-accent/20 cursor-pointer"
                                    title="Open Buyer Shortlist Portal & Docs"
                                  >
                                    <ExternalLink className="w-2.5 h-2.5" />
                                    Portal Docs
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Reminder Urgency Status Pill */}
                            <div>
                              {topReminder ? (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenCompleteReminder(topReminder);
                                  }}
                                  className={`p-2 rounded-lg border text-[11px] flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                                    isOverdue
                                      ? 'bg-status-danger-surface border-status-danger/40 text-status-danger hover:border-status-danger'
                                      : isDueToday
                                      ? 'bg-status-warning-surface border-status-warning/40 text-status-warning hover:border-status-warning'
                                      : 'bg-surface-subtle border-border text-content-secondary hover:text-content'
                                  }`}
                                  title="Click to complete or log outcome"
                                >
                                  <div className="flex items-center gap-1.5 truncate">
                                    <Clock className="w-3.5 h-3.5 shrink-0" />
                                    <span className="font-bold truncate">
                                      {isOverdue ? 'Overdue' : 'Due'}: {topReminder.title}
                                    </span>
                                  </div>
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 opacity-70 hover:opacity-100" />
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenQuickReminder(lead);
                                  }}
                                  className="w-full p-2 rounded-lg bg-status-warning-surface border border-status-warning/30 hover:border-status-warning text-status-warning text-[11px] font-bold flex items-center justify-between gap-1 transition-all cursor-pointer"
                                >
                                  <span className="flex items-center gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    No Follow-up Set
                                  </span>
                                  <span className="underline">+ Set SLA</span>
                                </button>
                              )}
                            </div>

                            {/* Quick Card Action Toolbar */}
                            <div className="pt-2 border-t border-border flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1">
                                {lead.phoneE164 && (
                                  <>
                                    <a
                                      href={`https://wa.me/${lead.phoneE164.replace(/\D/g, '')}?text=${encodeURIComponent(
                                        `Hello ${lead.fullName || ''}, following up from ZamZam Properties.`
                                      )}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1.5 rounded-lg bg-status-success-surface hover:bg-status-success text-status-success hover:text-white border border-status-success/30 transition-all cursor-pointer"
                                      title="WhatsApp Client"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </a>

                                    <a
                                      href={`tel:${lead.phoneE164}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1.5 rounded-lg bg-accent-soft hover:bg-accent text-accent-text hover:text-white border border-accent/20 transition-all cursor-pointer"
                                      title="Call Client"
                                    >
                                      <Phone className="w-3.5 h-3.5" />
                                    </a>
                                  </>
                                )}

                                {/* + Log Call / Note Quick Trigger */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenQuickLog(lead);
                                  }}
                                  className="p-1.5 rounded-lg bg-accent-soft hover:bg-accent text-accent-text hover:text-white border border-accent/20 transition-all cursor-pointer"
                                  title="+ Log Call / Note / Remark"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenQuickReminder(lead);
                                  }}
                                  className="p-1.5 rounded-lg bg-surface hover:bg-surface-subtle text-content-secondary hover:text-content border border-border transition-all cursor-pointer"
                                  title="Schedule / Adjust Reminder"
                                >
                                  <Clock className="w-3.5 h-3.5 text-accent" />
                                </button>
                              </div>

                              {/* Quick Stage Mover Dropdown */}
                              <div className="relative" onClick={(e) => e.stopPropagation()}>
                                <CustomSelect
                                  options={KANBAN_STAGES.map((s) => ({
                                    value: s.id,
                                    label: s.shortLabel,
                                    dotColor: s.dotColor,
                                  }))}
                                  value={lead.currentStage || 'new_uncontacted'}
                                  disabled={isUpdating}
                                  onChange={(val) => handleMoveStage(lead.id, val)}
                                  size="xs"
                                  align="right"
                                  menuClassName="w-48"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Insertion Slot Below Card (Index: idx + 1) */}
                          {draggedLeadId && isColumnTargeted && dragTarget?.insertIndex === idx + 1 && (
                            <div className="p-2.5 rounded-xl border-2 border-dashed border-accent bg-accent-soft/40 flex items-center justify-center gap-2 text-xs font-bold text-accent-text animate-pulse shadow-xs transition-all">
                              <ArrowRight className="w-3.5 h-3.5 text-accent" />
                              <span>
                                {idx + 1 === orderedStageLeads.length
                                  ? `Insert at Bottom of ${stage.shortLabel}`
                                  : 'Insert here (Middle)'}
                              </span>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
