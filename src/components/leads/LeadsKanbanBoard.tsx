'use client';

import React, { useState } from 'react';
import {
  Phone,
  MessageSquare,
  Clock,
  AlertCircle,
  Sparkles,
  ChevronRight,
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
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

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
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = (e?: React.DragEvent) => {
    if (e) e.stopPropagation();
    setDraggedLeadId(null);
    setDragOverStageId(null);
  };

  const handleDragOver = (stageId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStageId !== stageId) {
      setDragOverStageId(stageId);
    }
  };

  const handleDragLeave = (stageId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    if (dragOverStageId === stageId) {
      setDragOverStageId(null);
    }
  };

  const handleDrop = async (stageId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    setDragOverStageId(null);
    setDraggedLeadId(null);

    if (leadId) {
      const currentLead = leads.find((l) => l.id === leadId);
      if (currentLead && currentLead.currentStage !== stageId) {
        await handleMoveStage(leadId, stageId, e);
      }
    }
  };

  return (
    <div className="overflow-x-auto pb-6">
      <div className="flex gap-4 min-w-max">
        {KANBAN_STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => (l.currentStage || 'new_uncontacted') === stage.id);
          const isTargetedByDrag = dragOverStageId === stage.id;

          return (
            <div
              key={stage.id}
              onDragOver={(e) => handleDragOver(stage.id, e)}
              onDragLeave={(e) => handleDragLeave(stage.id, e)}
              onDrop={(e) => handleDrop(stage.id, e)}
              className={`w-80 flex flex-col rounded-2xl bg-surface border shadow-2xs overflow-hidden transition-all duration-200 ${
                isTargetedByDrag
                  ? 'border-accent ring-2 ring-accent/30 bg-accent-soft/10 shadow-md scale-[1.01]'
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
                      {stageLeads.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-content-muted truncate">{stage.description}</p>
                </div>
              </div>

              {/* Cards Container (Drop Target Zone) */}
              <div className="p-3 flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[220px]">
                {/* Active Drop Cue Placeholder when dragging over column */}
                {isTargetedByDrag && (
                  <div className="p-3 rounded-xl border-2 border-dashed border-accent bg-accent-soft/30 flex items-center justify-center gap-2 text-xs font-bold text-accent-text animate-pulse">
                    <MoveRight className="w-4 h-4" />
                    <span>Drop to advance to {stage.shortLabel}</span>
                  </div>
                )}

                {stageLeads.length === 0 && !isTargetedByDrag ? (
                  <div className="h-36 rounded-xl border border-dashed border-border/80 bg-surface-subtle/30 flex flex-col items-center justify-center text-center p-4 text-content-muted text-xs space-y-1.5">
                    <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-content-muted">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-content-secondary">No leads in {stage.shortLabel}</span>
                    <span className="text-[10px] text-content-muted">Drag cards here to update stage</span>
                  </div>
                ) : (
                  stageLeads.map((lead) => {
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
                      <div
                        key={lead.id}
                        draggable={!isUpdating}
                        onDragStart={(e) => handleDragStart(lead.id, e)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onSelectLeadForDrawer(lead)}
                        className={`p-3.5 rounded-xl bg-surface border border-border hover:border-accent/40 shadow-2xs hover:shadow-xs transition-all cursor-grab active:cursor-grabbing space-y-2.5 group ${
                          stage.colorClass
                        } border-l-4 ${
                          isCardBeingDragged ? 'opacity-40 scale-95 border-dashed border-accent' : ''
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
                        </div>

                        {/* 📝 VISIBLE REMARK & COMMUNICATION AUDIT TRAIL BOX (Visible directly on card) */}
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
                            &quot;{latestRemark || 'No remark entered yet.'}&quot;
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
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
