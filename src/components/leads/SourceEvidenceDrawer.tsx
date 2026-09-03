'use client';

import React, { useState } from 'react';
import { 
  X, 
  Phone, 
  MessageSquare, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Layers, 
  ArrowRight, 
  GitMerge, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  UserCheck, 
  Sparkles,
  MapPin,
  FileText,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { YoutubeIcon, InstagramIcon } from '@/components/icons/SocialIcons';
import { OFFICIAL_BROKER_NUMBERS } from '@/lib/constants/broker-constants';
import { formatDateTime } from '@/lib/date-utils';
import { CustomSelect, type CustomSelectOption } from '@/components/ui/CustomSelect';

const DRAWER_CHANNEL_OPTIONS: CustomSelectOption[] = [
  { value: 'PHONE_CALL', label: '📞 Phone Call' },
  { value: 'WHATSAPP', label: '💬 WhatsApp Chat' },
  { value: 'SITE_VISIT', label: '🚗 Site Visit Meeting' },
  { value: 'IN_PERSON_MEETING', label: '🏢 In-Person Meeting' },
  { value: 'SMS', label: '📱 SMS Message' },
  { value: 'EMAIL', label: '✉️ Email Message' },
];

const DRAWER_DIRECTION_OPTIONS: CustomSelectOption[] = [
  { value: 'OUTBOUND', label: 'Outbound (Broker to Buyer)' },
  { value: 'INBOUND', label: 'Inbound (Buyer to Broker)' },
];

const DRAWER_OUTCOME_OPTIONS: CustomSelectOption[] = [
  { value: 'CONNECTED_INTERESTED', label: '✅ Connected & Interested' },
  { value: 'VISIT_REQUESTED', label: '🚗 Site Visit Requested' },
  { value: 'FOLLOW_UP_SCHEDULED', label: '📅 Callback Scheduled' },
  { value: 'BUDGET_DISCUSSED', label: '💰 Budget / Floor Rise' },
  { value: 'TOKEN_OFFER', label: '🏷️ Token / Booking in Progress' },
  { value: 'RINGING_NO_ANSWER', label: '🔕 Ringing / No Answer' },
  { value: 'BUSY_CALL_LATER', label: '⏳ Busy / Call Back Later' },
  { value: 'NOT_INTERESTED', label: '❌ Not Interested / Dropped' },
];

const DRAWER_STAGE_OPTIONS: CustomSelectOption[] = [
  { value: 'discovery_call', label: '📞 Discovery & Qualifying' },
  { value: 'portal_shared', label: '📑 Shortlist / Deck Sent' },
  { value: 'visit_scheduled', label: '🚗 Site Visit Scheduled' },
  { value: 'visit_done', label: '🏢 Site Visit Completed' },
  { value: 'revisit_scheduled', label: '🔄 Re-Visit / Family Tour' },
  { value: 'negotiation_token', label: '💰 Price Negotiation & Token' },
  { value: 'under_registration', label: '📝 Agreement & Registration' },
  { value: 'closed_won', label: '🏆 Booking Done (Closed Won)' },
  { value: 'on_hold_nurture', label: '⏳ Nurture / Follow-Up Later' },
  { value: 'closed_lost', label: '❌ Lost / Dropped' },
];

interface SourceEvidenceDrawerProps {
  lead: any | null;
  onClose: () => void;
  onOpenMergeModal: (lead: any) => void;
  onLeadUpdated?: () => void;
}

export function SourceEvidenceDrawer({
  lead,
  onClose,
  onOpenMergeModal,
  onLeadUpdated,
}: SourceEvidenceDrawerProps) {
  // Hooks must run unconditionally — guard values with `lead?.` instead of
  // returning early before them (react-hooks/rules-of-hooks).
  const [communications, setCommunications] = useState<any[]>(lead?.communications || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(true);

  // New Log Form State
  const [channel, setChannel] = useState('PHONE_CALL');
  const [direction, setDirection] = useState('OUTBOUND');
  const [outcome, setOutcome] = useState('CONNECTED_INTERESTED');
  const [messageContent, setMessageContent] = useState('');
  const [callDurationMinutes, setCallDurationMinutes] = useState(2);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [followUpDate, setFollowUpDate] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [callerName, setCallerName] = useState(lead?.assignedBroker?.fullName || 'Safwan Diwan');
  const [stageUpdate, setStageUpdate] = useState(lead?.currentStage || 'discovery_call');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit Log State
  const [editNotes, setEditNotes] = useState('');
  const [editOutcome, setEditOutcome] = useState('');
  const [editFollowUp, setEditFollowUp] = useState('');
  const [editNextSteps, setEditNextSteps] = useState('');

  if (!lead) return null;

  const identities = lead.contact?.identities || [];

  const getSourceIcon = (source: string) => {
    const s = (source || '').toUpperCase();
    if (s.includes('YOUTUBE')) return <YoutubeIcon className="w-4 h-4 text-red-500" />;
    if (s.includes('INSTAGRAM')) return <InstagramIcon className="w-4 h-4 text-pink-500" />;
    if (s.includes('WHATSAPP')) return <MessageSquare className="w-4 h-4 text-emerald-400" />;
    return <Phone className="w-4 h-4 text-amber-400" />;
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'EXACT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            EXACT ATTRIBUTION
          </span>
        );
      case 'INFERRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            INFERRED KEYWORD
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-subtle text-content-muted border border-border">
            UNKNOWN ORGANIC
          </span>
        );
    }
  };

  const getOutcomeBadge = (out: string) => {
    const o = (out || '').toUpperCase();
    if (o.includes('INTERESTED') || o.includes('TOKEN') || o.includes('BOOKING')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-status-success-surface text-status-success border border-status-success/30">✅ {out}</span>;
    }
    if (o.includes('VISIT')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-soft text-accent-text border border-accent/30">🚗 {out}</span>;
    }
    if (o.includes('FOLLOW_UP') || o.includes('CALLBACK')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-status-info-surface text-status-info border border-status-info/30">📅 {out}</span>;
    }
    if (o.includes('RINGING') || o.includes('BUSY')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-status-warning-surface text-status-warning border border-status-warning/30">⏳ {out}</span>;
    }
    if (o.includes('NOT_INTERESTED') || o.includes('DROPPED')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-status-danger-surface text-status-danger border border-status-danger/30">❌ {out}</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-surface-subtle text-content-muted border border-border">{out || 'General Log'}</span>;
  };

  const handleCreateCommunication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Please enter conversation notes or summary.' });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMsg(null);

    const totalSeconds = (parseInt(String(callDurationMinutes), 10) || 0) * 60 + (parseInt(String(callDurationSeconds), 10) || 0);

    try {
      const res = await fetch(`/api/v1/leads/${lead.id}/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          direction,
          messageContent,
          callDurationSeconds: totalSeconds,
          outcome,
          followUpDate: followUpDate || null,
          nextSteps: nextSteps || '',
          callerName,
          stageUpdate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCommunications((prev) => [data.communication, ...prev]);
        setShowAddForm(false);
        setMessageContent('');
        setNextSteps('');
        setFollowUpDate('');
        setFeedbackMsg({ type: 'success', text: 'Communication log & next steps saved successfully!' });
        if (onLeadUpdated) onLeadUpdated();
      } else {
        setFeedbackMsg({ type: 'error', text: data.error || 'Failed to save communication log.' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Network error saving log.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditLog = (c: any) => {
    setEditingLogId(c.id);
    setEditNotes(c.messageContent || '');
    let meta: any = {};
    try {
      meta = JSON.parse(c.metadataJson || '{}');
    } catch {
      meta = {};
    }
    setEditOutcome(meta.outcome || 'CONNECTED_INTERESTED');
    setEditFollowUp(meta.followUpDate ? meta.followUpDate.slice(0, 16) : '');
    setEditNextSteps(meta.nextSteps || '');
  };

  const handleUpdateCommunication = async (id: string) => {
    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch(`/api/v1/communications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageContent: editNotes,
          outcome: editOutcome,
          followUpDate: editFollowUp || null,
          nextSteps: editNextSteps,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCommunications((prev) =>
          prev.map((item) => (item.id === id ? data.communication : item))
        );
        setEditingLogId(null);
        setFeedbackMsg({ type: 'success', text: 'Communication entry updated.' });
        if (onLeadUpdated) onLeadUpdated();
      } else {
        setFeedbackMsg({ type: 'error', text: data.error || 'Failed to update log.' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error updating log.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCommunication = async (id: string) => {
    if (!confirm('Are you sure you want to delete this communication log entry?')) return;

    try {
      const res = await fetch(`/api/v1/communications/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setCommunications((prev) => prev.filter((item) => item.id !== id));
        setFeedbackMsg({ type: 'success', text: 'Log deleted.' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: 'Failed to delete entry.' });
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <div 
        className={`fixed inset-y-0 right-0 z-[70] bg-surface shadow-2xl overflow-y-auto touch-scroll h-dvh max-h-dvh pb-safe text-content flex flex-col font-sans transition-all duration-300 ${
          isFullScreen 
            ? 'inset-0 w-full max-w-full border-none animate-in fade-in' 
            : 'w-full max-w-full sm:max-w-xl md:max-w-2xl border-l border-border animate-in slide-in-from-right'
        }`}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 px-4 sm:px-6 py-3.5 sm:py-4 bg-surface/95 backdrop-blur border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="p-2 sm:p-2.5 bg-accent-soft border border-accent/20 rounded-xl text-accent shrink-0">
              {getSourceIcon(lead.leadSource)}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-content flex items-center gap-2 truncate">
                <span className="truncate">{lead.fullName || 'Unnamed Prospect'}</span>
                {getConfidenceBadge(lead.sourceConfidence)}
              </h2>
              <p className="text-[11px] sm:text-xs text-content-muted truncate">
                Person ID: <span className="font-mono text-content-secondary">{lead.contactId || lead.id.substring(0, 8)}</span> • Phone: <span className="font-mono text-accent-text font-semibold">{lead.phoneE164 || 'None'}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 rounded-xl text-content-muted hover:text-content hover:bg-surface-subtle transition-colors shrink-0 cursor-pointer border border-transparent hover:border-border"
              title={isFullScreen ? "Minimize to side drawer" : "Maximize to full screen"}
              aria-label={isFullScreen ? "Minimize to side drawer" : "Maximize to full screen"}
            >
              {isFullScreen ? (
                <Minimize2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              ) : (
                <Maximize2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-content-muted hover:text-content hover:bg-surface-subtle transition-colors shrink-0 cursor-pointer border border-transparent hover:border-border"
              aria-label="Close details"
            >
              <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className={`p-4 sm:p-6 flex-1 ${isFullScreen ? 'max-w-7xl w-full mx-auto' : ''}`}>
          <div className={isFullScreen ? 'grid grid-cols-1 lg:grid-cols-12 gap-6' : 'space-y-4 sm:space-y-6'}>
            
            {/* Column 1: Prospect Profile, Attribution & Durable Identities */}
            <div className={isFullScreen ? 'lg:col-span-4 space-y-4' : 'space-y-4'}>
              {/* Feedback Message */}
              {feedbackMsg && (
                <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                  feedbackMsg.type === 'success' ? 'bg-status-success-surface border-status-success/30 text-status-success' : 'bg-status-danger-surface border-status-danger/30 text-status-danger'
                }`}>
                  {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-status-success" /> : <AlertCircle className="w-4 h-4 text-status-danger" />}
                  <span>{feedbackMsg.text}</span>
                </div>
              )}

              {/* Attribution & Stated Source Code Banner */}
              <div className="p-4 rounded-2xl bg-surface-subtle border border-border space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-content-muted">Campaign Source Code:</span>
                  <span className="font-mono font-bold text-accent-text px-2 py-0.5 rounded bg-accent-soft border border-accent/20">
                    {lead.sourceCode || 'NO_EXPLICIT_CODE'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-content-muted">Assigned Broker Lead:</span>
                  <span className="text-accent-text font-semibold flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    {lead.assignedBroker?.fullName || 'Safwan Diwan'}
                  </span>
                </div>

                {lead.campaign && (
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                    <span className="text-content-muted">Linked Campaign:</span>
                    <span className="text-content font-medium">{lead.campaign.campaignName}</span>
                  </div>
                )}
              </div>

              {/* Multi-Channel Identities */}
              <div className="p-4 rounded-2xl bg-surface-subtle border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-content-muted flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-accent" />
                    Durable Identities ({identities.length || (lead.phoneE164 ? 1 : 0)})
                  </h3>
                  <button
                    onClick={() => onOpenMergeModal(lead)}
                    className="text-xs text-accent hover:underline flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    Merge Duplicates
                  </button>
                </div>

                <div className="space-y-2">
                  {identities.length > 0 ? (
                    identities.map((id: any) => (
                      <div
                        key={id.id}
                        className="p-3 bg-surface-inset border border-border rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-subtle text-content-muted border border-border">
                            {id.identityType}
                          </span>
                          <span className="font-mono text-content font-medium">{id.identityValue}</span>
                        </div>
                        {id.isPrimary && (
                          <span className="text-[10px] uppercase font-semibold text-accent-text bg-accent-soft px-2 py-0.5 rounded border border-accent/20">
                            Primary
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-surface-inset border border-border rounded-xl flex items-center justify-between text-xs">
                      <span className="font-mono text-content-muted">PHONE_E164</span>
                      <span className="font-mono text-content">{lead.phoneE164 || 'No Phone (Social Inbound)'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Communication Logs & Audit Trail */}
            <div className={isFullScreen ? 'lg:col-span-8 space-y-4' : 'space-y-4 pt-2 border-t border-border'}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-content-muted flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-accent" />
                  Communication Logs &amp; Audit Trail ({communications.length})
                </h3>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-3 py-1.5 rounded-lg bg-accent-soft hover:bg-accent-soft/80 border border-accent/20 text-accent-text text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  {showAddForm ? 'Hide Form' : '+ Log Call / Note'}
                </button>
              </div>

            {/* New Communication Log Form */}
            {showAddForm && (
              <form onSubmit={handleCreateCommunication} className="p-4 bg-surface-subtle border border-accent/40 rounded-2xl space-y-3.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-xs font-bold text-accent-text flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5" /> Update Communication Info &amp; Notes
                  </span>
                  <span className="text-[10px] text-content-muted font-mono">Logged by: {callerName}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-content-muted block mb-1">Channel</label>
                    <CustomSelect
                      options={DRAWER_CHANNEL_OPTIONS}
                      value={channel}
                      onChange={(val) => setChannel(val)}
                      className="w-full"
                      size="xs"
                      triggerClassName="bg-surface-inset border-border rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-content-muted block mb-1">Direction</label>
                    <CustomSelect
                      options={DRAWER_DIRECTION_OPTIONS}
                      value={direction}
                      onChange={(val) => setDirection(val)}
                      className="w-full"
                      size="xs"
                      triggerClassName="bg-surface-inset border-border rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-content-muted block mb-1">Call Outcome / Disposition</label>
                    <CustomSelect
                      options={DRAWER_OUTCOME_OPTIONS}
                      value={outcome}
                      onChange={(val) => setOutcome(val)}
                      className="w-full"
                      size="xs"
                      triggerClassName="bg-surface-inset border-border rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Call Duration & Pipeline Stage Update */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-content-muted block mb-1">Call Duration (Minutes)</label>
                    <input
                      type="number"
                      min="0"
                      max="180"
                      value={callDurationMinutes}
                      onChange={(e) => setCallDurationMinutes(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-surface-inset border border-border rounded-lg p-2 text-xs text-content focus:outline-none focus:border-accent font-mono"
                      placeholder="e.g. 3"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-content-muted block mb-1">Next Follow-Up Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full bg-surface-inset border border-border rounded-lg p-2 text-xs text-content focus:outline-none focus:border-accent font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-content-muted block mb-1">Sync Pipeline Stage</label>
                    <CustomSelect
                      options={DRAWER_STAGE_OPTIONS}
                      value={stageUpdate}
                      onChange={(val) => setStageUpdate(val)}
                      className="w-full"
                      size="xs"
                      triggerClassName="bg-surface-inset border-border rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Conversation Notes */}
                <div>
                  <label className="text-[11px] text-content-muted block mb-1">
                    Conversation Notes &amp; Key Details <span className="text-accent">*</span>
                  </label>
                  <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    rows={3}
                    placeholder="e.g. Spoke with buyer. Looking for 2 BHK in Kharghar Sector 35. Budget ₹75-80L. Likes Sai World Empire floor plans. Wants site visit this Saturday 11 AM."
                    className="w-full bg-surface-inset border border-border rounded-lg p-2.5 text-xs text-content placeholder:text-content-muted focus:outline-none focus:border-accent font-sans"
                    required
                  />
                </div>

                {/* Next Steps */}
                <div>
                  <label className="text-[11px] text-content-muted block mb-1">Action Items / Next Steps for Future Reference</label>
                  <input
                    type="text"
                    value={nextSteps}
                    onChange={(e) => setNextSteps(e.target.value)}
                    placeholder="e.g. Send video walkthrough on WhatsApp & confirm driver for Saturday tour."
                    className="w-full bg-surface-inset border border-border rounded-lg p-2 text-xs text-content placeholder:text-content-muted focus:outline-none focus:border-accent"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-raised border border-border text-content text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSubmitting ? 'Saving...' : 'Save Communication Log'}
                  </button>
                </div>
              </form>
            )}

            {/* Historical Communication Logs List */}
            <div className="space-y-3">
              {communications.length > 0 ? (
                communications.map((c: any) => {
                  let meta: any = {};
                  try {
                    meta = JSON.parse(c.metadataJson || '{}');
                  } catch {
                    meta = {};
                  }

                  const isEditing = editingLogId === c.id;

                  return (
                    <div
                      key={c.id}
                      className="p-4 bg-surface border border-border hover:border-border-strong rounded-2xl space-y-2.5 text-xs transition-all shadow-sm"
                    >
                      {/* Log Header */}
                      <div className="flex items-center justify-between flex-wrap gap-2 text-content-muted border-b border-border pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-content flex items-center gap-1.5 text-xs">
                            {c.channel === 'WHATSAPP' && <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />}
                            {c.channel === 'PHONE_CALL' && <Phone className="w-3.5 h-3.5 text-accent" />}
                            {c.channel === 'SITE_VISIT' && <MapPin className="w-3.5 h-3.5 text-blue-500" />}
                            {c.channel === 'INSTAGRAM_DM' && <InstagramIcon className="w-3.5 h-3.5 text-pink-500" />}
                            {c.channel} • {c.direction}
                          </span>
                          {getOutcomeBadge(meta.outcome)}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-content-muted">
                            {formatDateTime(c.createdAt)}
                          </span>
                          {!isEditing && (
                            <button
                              onClick={() => startEditLog(c)}
                              className="p-1 rounded bg-surface-subtle hover:bg-surface-raised text-content-muted hover:text-content border border-border transition-colors"
                              title="Edit Communication Notes"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteCommunication(c.id)}
                            className="p-1 rounded bg-surface-subtle hover:bg-status-danger-surface text-content-muted hover:text-status-danger border border-border transition-colors"
                            title="Delete Entry"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Inline Editor or Display Mode */}
                      {isEditing ? (
                        <div className="space-y-3 pt-1">
                          <div>
                            <label className="text-[11px] text-content-muted block mb-1">Edit Conversation Notes</label>
                            <textarea
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              rows={3}
                              className="w-full bg-surface-inset border border-accent rounded-lg p-2 text-xs text-content focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="text-[11px] text-content-muted block mb-1">Outcome</label>
                              <CustomSelect
                                options={DRAWER_OUTCOME_OPTIONS}
                                value={editOutcome}
                                onChange={(val) => setEditOutcome(val)}
                                className="w-full"
                                size="xs"
                                triggerClassName="bg-surface-inset border-border rounded-lg text-xs"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] text-content-muted block mb-1">Follow-Up Date</label>
                              <input
                                type="datetime-local"
                                value={editFollowUp}
                                onChange={(e) => setEditFollowUp(e.target.value)}
                                className="w-full bg-surface-inset border border-border rounded-lg p-1.5 text-xs text-content font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] text-content-muted block mb-1">Next Steps</label>
                            <input
                              type="text"
                              value={editNextSteps}
                              onChange={(e) => setEditNextSteps(e.target.value)}
                              className="w-full bg-surface-inset border border-border rounded-lg p-1.5 text-xs text-content"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingLogId(null)}
                              className="px-2.5 py-1 rounded bg-surface hover:bg-surface-raised border border-border text-content text-xs"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateCommunication(c.id)}
                              disabled={isSubmitting}
                              className="px-3 py-1 rounded bg-accent hover:bg-accent-hover text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                            >
                              <Save className="w-3 h-3" /> Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-content leading-relaxed font-sans">{c.messageContent || '[No notes recorded]'}</p>

                          {/* Extra metadata badges: Duration, Follow up, Next steps */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {c.callDurationSeconds > 0 && (
                              <span className="px-2 py-0.5 rounded bg-accent-soft border border-accent/20 text-[10px] text-accent-text font-mono flex items-center gap-1">
                                <Clock className="w-3 h-3 text-accent" />
                                Duration: {Math.floor(c.callDurationSeconds / 60)}m {c.callDurationSeconds % 60}s
                              </span>
                            )}

                            {meta.followUpDate && (
                              <span className="px-2 py-0.5 rounded bg-status-info-surface border border-status-info/30 text-[10px] text-status-info font-mono flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-status-info" />
                                Follow-Up: {formatDateTime(meta.followUpDate)}
                              </span>
                            )}

                            {meta.callerName && (
                              <span className="px-2 py-0.5 rounded bg-surface-subtle border border-border text-[10px] text-content-muted">
                                Caller: {meta.callerName}
                              </span>
                            )}
                          </div>

                          {meta.nextSteps && (
                            <div className="p-2 bg-surface-inset rounded-lg border border-border text-[11px] text-content-secondary flex items-start gap-1.5 mt-1">
                              <span className="font-bold text-accent shrink-0">Next Action:</span>
                              <span>{meta.nextSteps}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-6 rounded-2xl border border-dashed border-border text-center space-y-2">
                  <FileText className="w-6 h-6 text-content-muted mx-auto" />
                  <p className="text-xs text-content font-medium">No communication notes logged yet.</p>
                  <p className="text-[11px] text-content-muted">Click <strong>"+ Log Call / Note"</strong> above to record your first client conversation.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

        {/* Footer 1-Click Action Toolbar */}
        <div className="sticky bottom-0 p-4 sm:p-5 bg-surface/95 backdrop-blur border-t border-border z-20">
          <div className={`flex items-center gap-3 ${isFullScreen ? 'max-w-7xl mx-auto' : ''}`}>
            {lead.phoneE164 ? (
              <>
                <a
                  href={`https://wa.me/${lead.phoneE164.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Hello ${lead.fullName || 'Sir/Ma\'am'}, Safwan from ZamZam Properties here regarding your inquiry for ${lead.sourceCode || 'Navi Mumbai luxury projects'}.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  1-Click WhatsApp
                </a>
                <a
                  href={`tel:${lead.phoneE164}`}
                  className="py-3 px-5 bg-surface hover:bg-surface-raised text-accent-text font-semibold text-xs rounded-xl border border-border flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                >
                  <Phone className="w-4 h-4 text-accent" />
                  Call
                </a>
              </>
            ) : (
              <div className="w-full text-center py-2 text-xs text-content-muted">
                Instagram Social Inbound • Reply via Direct Message or request phone number
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

