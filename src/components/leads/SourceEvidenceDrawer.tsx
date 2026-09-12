'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Minimize2,
  Copy,
  Check,
  ExternalLink,
  Flame,
  Eye,
  IndianRupee,
  Home,
  Compass,
  User,
  Mail,
  Tag,
  Send,
  ChevronDown,
  RefreshCw,
  CheckCheck,
  Building,
  CheckSquare,
  ChevronRight
} from 'lucide-react';
import { YoutubeIcon, InstagramIcon } from '@/components/icons/SocialIcons';
import { formatDateTime } from '@/lib/date-utils';
import { formatLakhCr, formatIndianRupees } from '@/lib/money';
import { evaluate24HourMessagingWindow } from '@/lib/constants/broker-constants';
import { CustomSelect, type CustomSelectOption } from '@/components/ui/CustomSelect';
import { toast } from '@/lib/client/toast';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';

// ============================================================================
// CONSTANTS & OPTIONS
// ============================================================================

export const PIPELINE_STAGES = [
  { id: 'new_uncontacted', label: 'New Inbound', shortLabel: 'New', color: 'rose', step: 1 },
  { id: 'discovery_call', label: 'Discovery Call', shortLabel: 'Discovery', color: 'amber', step: 2 },
  { id: 'portal_shared', label: 'Deck / Portal Sent', shortLabel: 'Deck Sent', color: 'blue', step: 3 },
  { id: 'visit_scheduled', label: 'Site Visit Fixed', shortLabel: 'Visit Fixed', color: 'indigo', step: 4 },
  { id: 'visit_done', label: 'Visit Completed', shortLabel: 'Visit Done', color: 'purple', step: 5 },
  { id: 'negotiation_token', label: 'Negotiation & Token', shortLabel: 'Token', color: 'emerald', step: 6 },
  { id: 'closed_won', label: 'Booking Done (Won)', shortLabel: 'Won 🏆', color: 'emerald', step: 7 },
  { id: 'closed_lost', label: 'Lost / Dropped', shortLabel: 'Lost ❌', color: 'slate', step: 8 },
];

const DRAWER_CHANNEL_OPTIONS: CustomSelectOption[] = [
  { value: 'PHONE_CALL', label: '📞 Phone Call' },
  { value: 'WHATSAPP', label: '💬 WhatsApp Chat' },
  { value: 'SITE_VISIT', label: '🚗 Site Visit Meeting' },
  { value: 'IN_PERSON_MEETING', label: '🏢 In-Person Office Meeting' },
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
  { value: 'BUDGET_DISCUSSED', label: '💰 Budget / Unit Finalized' },
  { value: 'TOKEN_OFFER', label: '🏷️ Token / Booking in Progress' },
  { value: 'RINGING_NO_ANSWER', label: '🔕 Ringing / No Answer' },
  { value: 'BUSY_CALL_LATER', label: '⏳ Busy / Call Back Later' },
  { value: 'NOT_INTERESTED', label: '❌ Not Interested / Dropped' },
];

const NAVI_MUMBAI_LOCALITIES = [
  'Kharghar Sec 35',
  'Kharghar Sec 20',
  'Taloja Phase 1',
  'Taloja Phase 2',
  'Ulwe Sec 19',
  'Panvel Prime',
  'Seawoods / Nerul',
  'Vashi',
  'Dronagiri',
  'Kamothe',
];

const BHK_OPTIONS = [
  { value: 1, label: '1 BHK' },
  { value: 2, label: '2 BHK' },
  { value: 3, label: '3 BHK' },
  { value: 4, label: '4+ BHK' },
];

const BUDGET_PRESETS = [
  { label: '< ₹50L', min: 2500000, max: 5000000 },
  { label: '₹50L - ₹80L', min: 5000000, max: 8000000 },
  { label: '₹80L - ₹1.2 Cr', min: 8000000, max: 12000000 },
  { label: '₹1.2 Cr - ₹2 Cr', min: 12000000, max: 20000000 },
  { label: '₹2 Cr+', min: 20000000, max: 50000000 },
];

const WHATSAPP_TEMPLATES = [
  {
    id: 'intro',
    title: '👋 Welcome & Inquiry Greeting',
    body: (name: string, project: string) =>
      `Hello ${name || 'Sir/Ma\'am'}, Safwan from ZamZam Properties here regarding your inquiry for ${project || 'Navi Mumbai luxury projects'}. How can I assist you with floor plans, pricing, and availability today?`,
  },
  {
    id: 'brochure',
    title: '📑 Share Brochure & Floor Plans',
    body: (name: string, project: string) =>
      `Hello ${name || 'Sir/Ma\'am'}, sharing the verified project deck, RERA certificates, and detailed floor plans for ${project || 'our featured properties'}. Please take a look and let me know your preferred configuration!`,
  },
  {
    id: 'site_visit',
    title: '🚗 Site Visit Confirmation',
    body: (name: string, project: string) =>
      `Hello ${name || 'Sir/Ma\'am'}, confirming our upcoming site visit to ${project || 'the project site'}. Our site manager will receive you at the sales experience lounge. Let me know if you need pickup assistance or live Google location pin.`,
  },
  {
    id: 'followup',
    title: '⏳ Friendly Follow-up',
    body: (name: string) =>
      `Hello ${name || 'Sir/Ma\'am'}, following up regarding our earlier conversation. Did you get a chance to review the shortlisted options? Happy to answer any questions or arrange a quick call.`,
  },
];

// ============================================================================
// COMPONENT PROPS & MAIN EXPORT
// ============================================================================

interface SourceEvidenceDrawerProps {
  lead: any | null;
  canDeleteLeads?: boolean;
  canReassignLeads?: boolean;
  assignableUsers?: Array<{ id: string; fullName: string; role: string; email: string }>;
  onClose: () => void;
  onOpenMergeModal: (lead: any) => void;
  onLeadUpdated?: () => void;
  onLeadDeleted?: (deletedLeadId: string) => void;
  onReassign?: (leadId: string, newUserId: string | null) => Promise<void>;
}

export function SourceEvidenceDrawer({
  lead,
  canDeleteLeads = false,
  canReassignLeads = false,
  assignableUsers = [],
  onClose,
  onOpenMergeModal,
  onLeadUpdated,
  onLeadDeleted,
  onReassign,
}: SourceEvidenceDrawerProps) {
  // Tabs: 'activity' | 'requirements' | 'portals' | 'dossier'
  const [activeTab, setActiveTab] = useState<'activity' | 'requirements' | 'portals' | 'dossier'>('activity');
  const [isFullScreen, setIsFullScreen] = useState(true);
  const [hasCopiedPhone, setHasCopiedPhone] = useState(false);

  // Lead State & Inline Editing
  const [currentStage, setCurrentStage] = useState(lead?.currentStage || 'new_uncontacted');
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(lead?.fullName || '');
  const [profileEmail, setProfileEmail] = useState(lead?.email || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Scratchpad Notes
  const [quickNotes, setQuickNotes] = useState(lead?.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Communications State
  const [communications, setCommunications] = useState<any[]>(lead?.communications || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  // New Communication Form State
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
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  // Edit Log State
  const [editNotes, setEditNotes] = useState('');
  const [editOutcome, setEditOutcome] = useState('');
  const [editFollowUp, setEditFollowUp] = useState('');
  const [editNextSteps, setEditNextSteps] = useState('');

  // Buyer Requirements State
  const initialReq = lead?.requirements?.[0] || {};
  const [bhkPreferences, setBhkPreferences] = useState<number[]>(() => {
    try {
      return initialReq.bhkPreferencesJson ? JSON.parse(initialReq.bhkPreferencesJson) : [2];
    } catch {
      return [2];
    }
  });
  const [budgetMin, setBudgetMin] = useState<number>(initialReq.budgetMin || 5000000);
  const [budgetMax, setBudgetMax] = useState<number>(initialReq.budgetMax || 10000000);
  const [targetLocations, setTargetLocations] = useState<string[]>(() => {
    try {
      return initialReq.targetLocationsJson ? JSON.parse(initialReq.targetLocationsJson) : ['Kharghar Sec 35'];
    } catch {
      return ['Kharghar Sec 35'];
    }
  });
  const [possessionPreference, setPossessionPreference] = useState(initialReq.possessionPreference || 'ANY');
  const [purpose, setPurpose] = useState(initialReq.purpose || 'self_use');
  const [loanPreApproved, setLoanPreApproved] = useState(Boolean(initialReq.loanPreApproved));
  const [floorPreference, setFloorPreference] = useState(initialReq.floorPreference || 'middle');
  const [minCarpetSqft, setMinCarpetSqft] = useState<string>(initialReq.minCarpetSqft ? String(initialReq.minCarpetSqft) : '');
  const [isSavingRequirements, setIsSavingRequirements] = useState(false);

  // WhatsApp Template Drawer
  const [selectedTemplateId, setSelectedTemplateId] = useState('intro');

  // Deletion State
  const [isDeletingLead, setIsDeletingLead] = useState(false);
  const [showDeleteLeadConfirm, setShowDeleteLeadConfirm] = useState(false);

  // Sync state when lead prop changes
  useEffect(() => {
    if (!lead) return;
    setCommunications(lead.communications || []);
    setCurrentStage(lead.currentStage || 'new_uncontacted');
    setProfileName(lead.fullName || '');
    setProfileEmail(lead.email || '');
    setQuickNotes(lead.notes || '');

    const req = lead.requirements?.[0] || {};
    try {
      if (req.bhkPreferencesJson) setBhkPreferences(JSON.parse(req.bhkPreferencesJson));
    } catch {
      // fallback
    }
    if (req.budgetMin !== undefined) setBudgetMin(req.budgetMin);
    if (req.budgetMax !== undefined) setBudgetMax(req.budgetMax);
    try {
      if (req.targetLocationsJson) setTargetLocations(JSON.parse(req.targetLocationsJson));
    } catch {
      // fallback
    }
    if (req.possessionPreference) setPossessionPreference(req.possessionPreference);
    if (req.purpose) setPurpose(req.purpose);
    if (req.loanPreApproved !== undefined) setLoanPreApproved(Boolean(req.loanPreApproved));
    if (req.floorPreference) setFloorPreference(req.floorPreference);
    if (req.minCarpetSqft) setMinCarpetSqft(String(req.minCarpetSqft));
  }, [lead]);

  if (!lead) return null;

  const identities = lead.contact?.identities || [];
  const portals = lead.portals || [];
  const messagingWindow = evaluate24HourMessagingWindow(lead.lastInboundMessageAt || lead.createdAt);

  // Copy phone handler
  const handleCopyPhone = () => {
    if (!lead.phoneE164) return;
    navigator.clipboard.writeText(lead.phoneE164);
    setHasCopiedPhone(true);
    toast.success('Phone Copied', { description: lead.phoneE164 });
    setTimeout(() => setHasCopiedPhone(false), 2000);
  };

  // Helper icons
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3 h-3" />
            EXACT ATTRIBUTION
          </span>
        );
      case 'INFERRED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <ShieldAlert className="w-3 h-3" />
            INFERRED KEYWORD
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-surface-subtle text-content-muted border border-border">
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

  // Pipeline Stage Switcher
  const handleStageSelect = async (newStage: string) => {
    if (currentStage === newStage || isUpdatingStage) return;
    const prev = currentStage;
    setCurrentStage(newStage);
    setIsUpdatingStage(true);

    try {
      const res = await fetch(`/api/v1/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStage: newStage }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update stage');
      }
      toast.success('Stage Updated', {
        description: `Lead moved to ${PIPELINE_STAGES.find((s) => s.id === newStage)?.label || newStage}.`,
      });
      if (onLeadUpdated) onLeadUpdated();
    } catch (err: any) {
      setCurrentStage(prev);
      toast.error('Stage Update Failed', { description: err.message });
    } finally {
      setIsUpdatingStage(false);
    }
  };

  // Profile Save
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const res = await fetch(`/api/v1/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: profileName.trim() || undefined,
          email: profileEmail.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }
      toast.success('Prospect Profile Saved');
      setIsEditingProfile(false);
      if (onLeadUpdated) onLeadUpdated();
    } catch (err: any) {
      toast.error('Update Failed', { description: err.message });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Scratchpad Notes Save
  const handleSaveQuickNotes = async () => {
    setIsSavingNotes(true);
    try {
      const res = await fetch(`/api/v1/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: quickNotes }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save notes');
      }
      toast.success('Broker Notes Saved');
      if (onLeadUpdated) onLeadUpdated();
    } catch (err: any) {
      toast.error('Failed to save notes', { description: err.message });
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Buyer Requirements Save
  const handleSaveRequirements = async () => {
    setIsSavingRequirements(true);
    try {
      const res = await fetch(`/api/v1/leads/${lead.id}/requirements`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetMin,
          budgetMax,
          bhkPreferences,
          targetLocations,
          possessionPreference,
          purpose,
          loanPreApproved,
          floorPreference,
          minCarpetSqft: minCarpetSqft ? Number(minCarpetSqft) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save buyer requirements');
      }
      toast.success('Requirements Saved', {
        description: 'Buyer preferences updated successfully.',
      });
      if (onLeadUpdated) onLeadUpdated();
    } catch (err: any) {
      toast.error('Save Failed', { description: err.message });
    } finally {
      setIsSavingRequirements(false);
    }
  };

  // Communication Handlers
  const handleCreateCommunication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim()) {
      toast.error('Notes Required', { description: 'Please enter conversation notes or summary.' });
      return;
    }

    setIsSubmittingLog(true);
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
        if (stageUpdate && stageUpdate !== currentStage) {
          setCurrentStage(stageUpdate);
        }
        toast.success('Communication Logged', { description: 'Activity and next steps recorded.' });
        if (onLeadUpdated) onLeadUpdated();
      } else {
        toast.error('Logging Failed', { description: data.error || 'Failed to save communication.' });
      }
    } catch (err: any) {
      toast.error('Network Error', { description: err.message });
    } finally {
      setIsSubmittingLog(false);
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
    setIsSubmittingLog(true);
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
        toast.success('Log Updated');
        if (onLeadUpdated) onLeadUpdated();
      } else {
        toast.error('Update Failed', { description: data.error || 'Failed to update log.' });
      }
    } catch (err: any) {
      toast.error('Error', { description: err.message });
    } finally {
      setIsSubmittingLog(false);
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
        toast.success('Log Deleted');
      }
    } catch (err: any) {
      toast.error('Failed to delete log entry');
    }
  };

  // Lead Deletion Handler
  const handleDeleteLead = async () => {
    if (!lead?.id) return;
    setIsDeletingLead(true);
    try {
      const res = await fetch(`/api/v1/leads/${lead.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete lead.');
      }
      toast.success('Lead Deleted', {
        description: `Lead "${lead.fullName || lead.phoneE164 || 'Lead'}" permanently removed.`,
      });
      if (onLeadDeleted) {
        onLeadDeleted(lead.id);
      }
      onClose();
    } catch (err: any) {
      toast.error('Deletion Failed', { description: err.message });
    } finally {
      setIsDeletingLead(false);
      setShowDeleteLeadConfirm(false);
    }
  };

  // Active WhatsApp Message Text
  const currentWhatsAppText = useMemo(() => {
    const tmpl = WHATSAPP_TEMPLATES.find((t) => t.id === selectedTemplateId) || WHATSAPP_TEMPLATES[0];
    return tmpl.body(profileName || lead.fullName || 'Sir/Ma\'am', lead.sourceCode || 'Navi Mumbai luxury projects');
  }, [selectedTemplateId, profileName, lead.fullName, lead.sourceCode]);

  const activeStageIndex = PIPELINE_STAGES.findIndex((s) => s.id === currentStage);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <div 
        className={`fixed inset-y-0 right-0 z-[70] bg-surface shadow-2xl overflow-hidden flex flex-col font-sans transition-all duration-300 ${
          isFullScreen 
            ? 'inset-0 w-full max-w-full border-none animate-in fade-in' 
            : 'w-full max-w-full sm:max-w-3xl md:max-w-4xl border-l border-border animate-in slide-in-from-right'
        }`}
      >
        {/* ==================================================================
            1. COMMAND HEADER & IDENTITY HERO
            ================================================================== */}
        <div className="shrink-0 px-4 sm:px-6 py-3.5 bg-surface border-b border-border z-20 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            
            {/* Prospect Identity Details */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-accent-soft border border-accent/25 text-accent flex items-center justify-center shrink-0 shadow-2xs font-display font-extrabold text-base">
                {lead.fullName ? lead.fullName.charAt(0).toUpperCase() : <User className="w-5 h-5 text-accent" />}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {isEditingProfile ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Prospect full name"
                        className="bg-surface-inset border border-accent rounded-lg px-2.5 py-1 text-sm font-bold text-content focus:outline-none"
                      />
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        placeholder="Email address"
                        className="bg-surface-inset border border-border rounded-lg px-2.5 py-1 text-xs text-content focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                        className="p-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover text-xs font-bold"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="p-1.5 rounded-lg bg-surface-subtle text-content-muted hover:text-content text-xs"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-base sm:text-lg font-black text-content font-display tracking-tight truncate flex items-center gap-2">
                        <span>{profileName || lead.fullName || 'Unnamed Prospect'}</span>
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(true)}
                          className="text-content-muted hover:text-accent p-1 transition-colors"
                          title="Edit Name & Contact"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </h1>
                      {getConfidenceBadge(lead.sourceConfidence)}
                    </>
                  )}
                </div>

                {/* Subtitle / Fast Metadata Bar */}
                <div className="flex items-center gap-2 sm:gap-3 text-xs text-content-muted flex-wrap mt-0.5">
                  {lead.phoneE164 ? (
                    <div className="flex items-center gap-1 font-mono font-bold text-content">
                      <span className="text-emerald-500 font-sans">📞</span>
                      <span>{lead.phoneE164}</span>
                      <button
                        type="button"
                        onClick={handleCopyPhone}
                        className="p-1 hover:text-accent text-content-muted transition-colors rounded"
                        title="Copy Phone Number"
                      >
                        {hasCopiedPhone ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  ) : (
                    <span className="text-amber-500 font-medium">No Phone (Social Inbound)</span>
                  )}

                  <span className="text-border">•</span>
                  <span className="text-content-secondary flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-accent" /> {lead.city || 'Navi Mumbai'}
                  </span>

                  <span className="text-border hidden sm:inline">•</span>
                  <span className="font-mono text-[11px] text-content-muted hidden sm:inline">
                    ID: {lead.contactId ? lead.contactId.slice(0, 8) : lead.id.slice(0, 8)}
                  </span>
                </div>
              </div>
            </div>

            {/* Header Control Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {canDeleteLeads && (
                <button
                  type="button"
                  onClick={() => setShowDeleteLeadConfirm(true)}
                  className="p-2 rounded-xl text-content-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-800"
                  title="Permanently Delete Lead"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-2 rounded-xl text-content-muted hover:text-content hover:bg-surface-subtle transition-colors cursor-pointer border border-transparent hover:border-border"
                title={isFullScreen ? "Minimize to drawer" : "Maximize to full screen"}
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-content-muted hover:text-content hover:bg-surface-subtle transition-colors cursor-pointer border border-transparent hover:border-border"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ================================================================
              2. INTERACTIVE PIPELINE STAGE STEPPER
              ================================================================ */}
          <div className="pt-2 border-t border-border/70 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-max py-0.5">
              {PIPELINE_STAGES.map((st, idx) => {
                const isActive = st.id === currentStage;
                const isPast = activeStageIndex > idx && currentStage !== 'closed_lost';
                const isLost = st.id === 'closed_lost';

                return (
                  <button
                    key={st.id}
                    type="button"
                    disabled={isUpdatingStage}
                    onClick={() => handleStageSelect(st.id)}
                    className={`group px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer border select-none ${
                      isActive
                        ? 'bg-accent text-white border-accent shadow-xs'
                        : isPast
                        ? 'bg-accent-soft/30 text-accent-text border-accent/20 hover:border-accent/40'
                        : isLost
                        ? 'bg-surface-subtle text-content-muted border-border hover:border-rose-300 hover:text-rose-500'
                        : 'bg-surface-subtle text-content-secondary border-border hover:border-border-strong hover:text-content'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-black shrink-0 ${
                      isActive ? 'bg-white text-accent' : isPast ? 'bg-accent/20 text-accent-text' : 'bg-surface border border-border text-content-muted'
                    }`}>
                      {isPast ? '✓' : st.step}
                    </span>
                    <span className="font-display">{st.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ==================================================================
            3. MAIN BODY WORKSPACE (HIGH-DENSITY 2-PANEL LAYOUT)
            ================================================================== */}
        <div className="flex-1 overflow-y-auto touch-scroll bg-surface-inset/30">
          <div className={`p-4 sm:p-6 ${isFullScreen ? 'max-w-7xl mx-auto' : ''}`}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* ==============================================================
                  LEFT PANEL (COL-SPAN-4): PROSPECT INTELLIGENCE & ATTRIBUTION
                  ============================================================== */}
              <div className="lg:col-span-4 space-y-4">
                
                {/* 24-Hour WhatsApp SLA Window Card */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  messagingWindow.isOpen 
                    ? 'bg-emerald-500/5 border-emerald-500/25 shadow-2xs' 
                    : 'bg-surface border-border'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${messagingWindow.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                      <span className="text-xs font-black font-display text-content">24-Hour WhatsApp Window</span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      messagingWindow.isOpen 
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    }`}>
                      {messagingWindow.isOpen ? `${messagingWindow.hoursRemaining}h remaining` : 'Template Mode'}
                    </span>
                  </div>

                  <p className="text-[11px] text-content-secondary mt-1.5 leading-relaxed">
                    {messagingWindow.isOpen 
                      ? 'Inbound communication window active. Freeform responses and rich brochures permitted without template charges.'
                      : 'More than 24 hours have passed since last client inbound. Initiating new outbound messages requires Meta-approved templates.'}
                  </p>
                </div>

                {/* Attribution & Campaign Intelligence */}
                <div className="p-4 rounded-2xl bg-surface border border-border space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-xs font-black uppercase tracking-wider text-content font-display flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                      Attribution &amp; Source
                    </span>
                    <span className="text-xs font-mono text-content-muted flex items-center gap-1">
                      {getSourceIcon(lead.leadSource)}
                      {lead.leadSource}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-content-muted">Campaign Code:</span>
                      <span className="font-mono font-bold text-accent-text px-2.5 py-0.5 rounded-lg bg-accent-soft border border-accent/20">
                        {lead.sourceCode || 'NO_EXPLICIT_CODE'}
                      </span>
                    </div>

                    {lead.campaign && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-content-muted">Linked Campaign:</span>
                        <span className="font-semibold text-content truncate max-w-[180px]" title={lead.campaign.campaignName}>
                          {lead.campaign.campaignName}
                        </span>
                      </div>
                    )}

                    {lead.inboundNumber && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-content-muted">Inbound Number Dialed:</span>
                        <span className="font-mono text-content-secondary">{lead.inboundNumber}</span>
                      </div>
                    )}

                    {/* Assigned Telecaller / Broker */}
                    <div className="pt-2 border-t border-border flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-content-muted font-medium flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-accent" />
                          Assigned Telecaller / Rep:
                        </span>
                      </div>

                      {canReassignLeads && assignableUsers && assignableUsers.length > 0 ? (
                        <CustomSelect
                          size="xs"
                          value={lead.assignedBrokerId || 'UNASSIGN'}
                          onChange={async (val) => {
                            const newUserId = val === 'UNASSIGN' ? null : val;
                            if (onReassign) {
                              await onReassign(lead.id, newUserId);
                            }
                          }}
                          options={[
                            { value: 'UNASSIGN', label: 'Unassigned', shortLabel: 'Unassigned' },
                            ...assignableUsers.map((u) => ({
                              value: u.id,
                              label: `${u.fullName} (${u.role})`,
                              shortLabel: u.fullName,
                              badge: u.role,
                              group: u.role === 'TELECALLER' ? 'Telecallers' : 'Brokers & Admins',
                            })),
                          ]}
                          className="w-full"
                          triggerClassName="bg-surface-inset border-border rounded-xl text-xs font-semibold"
                        />
                      ) : (
                        <div className="p-2.5 rounded-xl bg-surface-inset border border-border flex items-center justify-between">
                          <span className="font-bold text-content text-xs">
                            {lead.assignedBroker?.fullName || 'Unassigned'}
                          </span>
                          {lead.assignedBroker?.role && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border text-content-muted">
                              {lead.assignedBroker.role}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Durable Multi-Channel Identities */}
                <div className="p-4 rounded-2xl bg-surface border border-border space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-content flex items-center gap-2 font-display">
                      <Layers className="w-3.5 h-3.5 text-accent" />
                      Durable Identities ({identities.length || (lead.phoneE164 ? 1 : 0)})
                    </h3>
                    <button
                      type="button"
                      onClick={() => onOpenMergeModal(lead)}
                      className="text-[11px] text-accent hover:underline flex items-center gap-1 font-bold transition-colors cursor-pointer"
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
                          className="p-2.5 bg-surface-inset border border-border rounded-xl flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-surface-subtle text-content-muted border border-border">
                              {id.identityType}
                            </span>
                            <span className="font-mono text-content font-bold">{id.identityValue}</span>
                          </div>
                          {id.isPrimary && (
                            <span className="text-[9px] uppercase font-bold text-accent-text bg-accent-soft px-2 py-0.5 rounded border border-accent/20">
                              Primary
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-2.5 bg-surface-inset border border-border rounded-xl flex items-center justify-between text-xs">
                        <span className="font-mono text-content-muted text-[11px]">PHONE_E164</span>
                        <span className="font-mono text-content font-bold">{lead.phoneE164 || 'No Phone (Social Inbound)'}</span>
                        <span className="text-[9px] uppercase font-bold text-accent-text bg-accent-soft px-2 py-0.5 rounded border border-accent/20">
                          Primary
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Broker Scratchpad & Private Remarks */}
                <div className="p-4 rounded-2xl bg-surface border border-border space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-content font-display flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-accent" />
                      Private Broker Memo
                    </span>
                    <button
                      type="button"
                      disabled={isSavingNotes}
                      onClick={handleSaveQuickNotes}
                      className="px-2.5 py-1 rounded-lg bg-accent-soft hover:bg-accent-soft/80 border border-accent/25 text-accent-text text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Save className="w-3 h-3" />
                      {isSavingNotes ? 'Saving...' : 'Save Note'}
                    </button>
                  </div>
                  <textarea
                    value={quickNotes}
                    onChange={(e) => setQuickNotes(e.target.value)}
                    rows={3}
                    placeholder="Add internal notes about buyer behavior, family decision makers, financing nuances..."
                    className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content placeholder:text-content-muted focus:outline-none focus:border-accent font-sans leading-relaxed resize-none"
                  />
                </div>

              </div>

              {/* ==============================================================
                  RIGHT PANEL (COL-SPAN-8): DEEP WORKSPACE TABS
                  ============================================================== */}
              <div className="lg:col-span-8 space-y-4">
                
                {/* Workspace Tab Strip */}
                <div className="p-1 bg-surface border border-border rounded-2xl flex items-center gap-1 overflow-x-auto no-scrollbar shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('activity')}
                    className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold font-display transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      activeTab === 'activity'
                        ? 'bg-accent text-white shadow-xs'
                        : 'text-content-secondary hover:text-content hover:bg-surface-subtle'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Activity &amp; Calls ({communications.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('requirements')}
                    className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold font-display transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      activeTab === 'requirements'
                        ? 'bg-accent text-white shadow-xs'
                        : 'text-content-secondary hover:text-content hover:bg-surface-subtle'
                    }`}
                  >
                    <Home className="w-4 h-4" />
                    Buyer Requirements
                    {bhkPreferences.length > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        activeTab === 'requirements' ? 'bg-white/20 text-white' : 'bg-surface-subtle text-accent font-black border border-accent/20'
                      }`}>
                        {bhkPreferences.join(', ')} BHK
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('portals')}
                    className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold font-display transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      activeTab === 'portals'
                        ? 'bg-accent text-white shadow-xs'
                        : 'text-content-secondary hover:text-content hover:bg-surface-subtle'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    Portals &amp; Views ({portals.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('dossier')}
                    className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold font-display transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      activeTab === 'dossier'
                        ? 'bg-accent text-white shadow-xs'
                        : 'text-content-secondary hover:text-content hover:bg-surface-subtle'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4" />
                    Full Audit
                  </button>
                </div>

                {/* ============================================================
                    TAB 1: ACTIVITY & COMMUNICATIONS
                    ============================================================ */}
                {activeTab === 'activity' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* Activity Header Controls */}
                    <div className="flex items-center justify-between flex-wrap gap-2 px-1">
                      <div>
                        <h3 className="text-sm font-black text-content font-display">Communication Timeline</h3>
                        <p className="text-xs text-content-muted">Record outbound calls, WhatsApp chats, and schedule follow-ups.</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-3.5 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        {showAddForm ? 'Close Form' : '+ Log Call / Note'}
                      </button>
                    </div>

                    {/* New Communication Log Form */}
                    {showAddForm && (
                      <form onSubmit={handleCreateCommunication} className="p-4 sm:p-5 bg-surface border border-accent/40 rounded-2xl space-y-4 shadow-sm animate-in fade-in">
                        <div className="flex items-center justify-between border-b border-border pb-2.5">
                          <span className="text-xs font-black text-content font-display flex items-center gap-2">
                            <Edit3 className="w-4 h-4 text-accent" /> Log New Client Interaction
                          </span>
                          <span className="text-[11px] text-content-muted font-mono">Logged by: {callerName}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <label className="text-[11px] font-bold text-content-muted block mb-1">Channel</label>
                            <CustomSelect
                              options={DRAWER_CHANNEL_OPTIONS}
                              value={channel}
                              onChange={(val) => setChannel(val)}
                              className="w-full"
                              size="xs"
                              triggerClassName="bg-surface-inset border-border rounded-xl text-xs"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-content-muted block mb-1">Direction</label>
                            <CustomSelect
                              options={DRAWER_DIRECTION_OPTIONS}
                              value={direction}
                              onChange={(val) => setDirection(val)}
                              className="w-full"
                              size="xs"
                              triggerClassName="bg-surface-inset border-border rounded-xl text-xs"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-content-muted block mb-1">Call Disposition / Outcome</label>
                            <CustomSelect
                              options={DRAWER_OUTCOME_OPTIONS}
                              value={outcome}
                              onChange={(val) => setOutcome(val)}
                              className="w-full"
                              size="xs"
                              triggerClassName="bg-surface-inset border-border rounded-xl text-xs"
                            />
                          </div>
                        </div>

                        {/* Call Duration & Pipeline Stage Update */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <label className="text-[11px] font-bold text-content-muted block mb-1">Call Duration (Minutes)</label>
                            <input
                              type="number"
                              min="0"
                              max="180"
                              value={callDurationMinutes}
                              onChange={(e) => setCallDurationMinutes(parseInt(e.target.value, 10) || 0)}
                              className="w-full bg-surface-inset border border-border rounded-xl p-2 text-xs text-content focus:outline-none focus:border-accent font-mono"
                              placeholder="e.g. 3"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-content-muted block mb-1">Next Follow-Up Date &amp; Time</label>
                            <input
                              type="datetime-local"
                              value={followUpDate}
                              onChange={(e) => setFollowUpDate(e.target.value)}
                              className="w-full bg-surface-inset border border-border rounded-xl p-2 text-xs text-content focus:outline-none focus:border-accent font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-content-muted block mb-1">Sync Pipeline Stage</label>
                            <CustomSelect
                              options={PIPELINE_STAGES.map((s) => ({ value: s.id, label: s.label }))}
                              value={stageUpdate}
                              onChange={(val) => setStageUpdate(val)}
                              className="w-full"
                              size="xs"
                              triggerClassName="bg-surface-inset border-border rounded-xl text-xs"
                            />
                          </div>
                        </div>

                        {/* Conversation Notes */}
                        <div>
                          <label className="text-[11px] font-bold text-content-muted block mb-1">
                            Conversation Notes &amp; Client Feedback <span className="text-accent">*</span>
                          </label>
                          <textarea
                            value={messageContent}
                            onChange={(e) => setMessageContent(e.target.value)}
                            rows={3}
                            placeholder="e.g. Spoke with buyer. Looking for 2 BHK in Kharghar Sector 35. Budget ₹85L. Likes Sai World Empire floor plans. Wants site visit this Saturday 11 AM."
                            className="w-full bg-surface-inset border border-border rounded-xl p-3 text-xs text-content placeholder:text-content-muted focus:outline-none focus:border-accent font-sans leading-relaxed"
                            required
                          />
                        </div>

                        {/* Next Steps */}
                        <div>
                          <label className="text-[11px] font-bold text-content-muted block mb-1">Action Items / Immediate Next Steps</label>
                          <input
                            type="text"
                            value={nextSteps}
                            onChange={(e) => setNextSteps(e.target.value)}
                            placeholder="e.g. Share project video walkthrough on WhatsApp and confirm driver for Saturday tour."
                            className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content placeholder:text-content-muted focus:outline-none focus:border-accent"
                          />
                        </div>

                        {/* Submit Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                          <button
                            type="button"
                            onClick={() => setShowAddForm(false)}
                            className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-subtle border border-border text-content text-xs font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmittingLog}
                            className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                          >
                            <Save className="w-4 h-4" />
                            {isSubmittingLog ? 'Saving...' : 'Save Communication Log'}
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
                              className="p-4 bg-surface border border-border hover:border-border-strong rounded-2xl space-y-2.5 text-xs transition-all shadow-2xs"
                            >
                              {/* Log Header */}
                              <div className="flex items-center justify-between flex-wrap gap-2 text-content-muted border-b border-border/80 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-content flex items-center gap-1.5 text-xs">
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
                                      className="p-1 rounded bg-surface-subtle hover:bg-surface-raised text-content-muted hover:text-content border border-border transition-colors cursor-pointer"
                                      title="Edit Communication Notes"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteCommunication(c.id)}
                                    className="p-1 rounded bg-surface-subtle hover:bg-status-danger-surface text-content-muted hover:text-status-danger border border-border transition-colors cursor-pointer"
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
                                    <label className="text-[11px] font-bold text-content-muted block mb-1">Edit Notes</label>
                                    <textarea
                                      value={editNotes}
                                      onChange={(e) => setEditNotes(e.target.value)}
                                      rows={3}
                                      className="w-full bg-surface-inset border border-accent rounded-xl p-2.5 text-xs text-content focus:outline-none"
                                    />
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <label className="text-[11px] font-bold text-content-muted block mb-1">Outcome</label>
                                      <CustomSelect
                                        options={DRAWER_OUTCOME_OPTIONS}
                                        value={editOutcome}
                                        onChange={(val) => setEditOutcome(val)}
                                        className="w-full"
                                        size="xs"
                                        triggerClassName="bg-surface-inset border-border rounded-xl text-xs"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[11px] font-bold text-content-muted block mb-1">Follow-Up Date</label>
                                      <input
                                        type="datetime-local"
                                        value={editFollowUp}
                                        onChange={(e) => setEditFollowUp(e.target.value)}
                                        className="w-full bg-surface-inset border border-border rounded-xl p-2 text-xs text-content font-mono"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="text-[11px] font-bold text-content-muted block mb-1">Next Steps</label>
                                    <input
                                      type="text"
                                      value={editNextSteps}
                                      onChange={(e) => setEditNextSteps(e.target.value)}
                                      className="w-full bg-surface-inset border border-border rounded-xl p-2 text-xs text-content"
                                    />
                                  </div>

                                  <div className="flex items-center justify-end gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditingLogId(null)}
                                      className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-subtle border border-border text-content text-xs font-semibold"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateCommunication(c.id)}
                                      disabled={isSubmittingLog}
                                      className="px-3.5 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                                    >
                                      <Save className="w-3.5 h-3.5" /> Save Changes
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="text-content leading-relaxed font-sans text-xs">{c.messageContent || '[No notes recorded]'}</p>

                                  {/* Badges: Duration, Follow-up, Next steps */}
                                  <div className="flex flex-wrap items-center gap-2 pt-1">
                                    {c.callDurationSeconds > 0 && (
                                      <span className="px-2.5 py-0.5 rounded-lg bg-accent-soft border border-accent/20 text-[10px] text-accent-text font-mono flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-accent" />
                                        Duration: {Math.floor(c.callDurationSeconds / 60)}m {c.callDurationSeconds % 60}s
                                      </span>
                                    )}

                                    {meta.followUpDate && (
                                      <span className="px-2.5 py-0.5 rounded-lg bg-status-info-surface border border-status-info/30 text-[10px] text-status-info font-mono flex items-center gap-1 font-bold">
                                        <Calendar className="w-3 h-3 text-status-info" />
                                        Follow-Up: {formatDateTime(meta.followUpDate)}
                                      </span>
                                    )}

                                    {meta.callerName && (
                                      <span className="px-2 py-0.5 rounded-lg bg-surface-subtle border border-border text-[10px] text-content-muted">
                                        Logged by: {meta.callerName}
                                      </span>
                                    )}
                                  </div>

                                  {meta.nextSteps && (
                                    <div className="p-2.5 bg-surface-inset rounded-xl border border-border text-xs text-content-secondary flex items-start gap-2 mt-1">
                                      <span className="font-black text-accent shrink-0 font-display">NEXT STEP:</span>
                                      <span>{meta.nextSteps}</span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-8 rounded-2xl border border-dashed border-border bg-surface text-center space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-accent-soft border border-accent/20 flex items-center justify-center mx-auto text-accent">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-content">No communication logs recorded</h4>
                            <p className="text-xs text-content-muted mt-1 max-w-sm mx-auto">
                              Log your discovery calls, WhatsApp chats, or scheduled site visits to maintain a transparent audit trail.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowAddForm(true)}
                            className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-hover transition-colors inline-flex items-center gap-1.5 shadow-xs"
                          >
                            <PlusCircle className="w-4 h-4" />
                            Record First Call / Note
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ============================================================
                    TAB 2: BUYER PROPERTY REQUIREMENTS (NEW)
                    ============================================================ */}
                {activeTab === 'requirements' && (
                  <div className="p-5 sm:p-6 bg-surface border border-border rounded-2xl space-y-5 shadow-2xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <div>
                        <h3 className="text-sm font-black text-content font-display flex items-center gap-2">
                          <Home className="w-4 h-4 text-accent" />
                          Buyer Property Criteria &amp; Preferences
                        </h3>
                        <p className="text-xs text-content-muted">Configure configuration, micro-market locations, and Indian budget presets.</p>
                      </div>

                      <button
                        type="button"
                        disabled={isSavingRequirements}
                        onClick={handleSaveRequirements}
                        className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        {isSavingRequirements ? 'Saving...' : 'Save Requirements'}
                      </button>
                    </div>

                    {/* 1. Configuration (BHK) Selection */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-content-muted uppercase tracking-wider block font-display">
                        Configuration (BHK Preferences)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {BHK_OPTIONS.map((bhk) => {
                          const isSelected = bhkPreferences.includes(bhk.value);
                          return (
                            <button
                              key={bhk.value}
                              type="button"
                              onClick={() => {
                                setBhkPreferences((prev) =>
                                  isSelected ? prev.filter((v) => v !== bhk.value) : [...prev, bhk.value].sort()
                                );
                              }}
                              className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-accent text-white border-accent shadow-xs font-black'
                                  : 'bg-surface-inset border-border text-content-secondary hover:border-border-strong hover:text-content font-medium'
                              }`}
                            >
                              <span className="text-sm block">{bhk.label}</span>
                              <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-white/80' : 'text-content-muted'}`}>
                                {bhk.value === 1 ? 'Compact' : bhk.value === 2 ? 'Family' : bhk.value === 3 ? 'Luxury' : 'Palatial'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Budget Range (Indian Lakhs & Crores) */}
                    <div className="space-y-2.5 pt-2 border-t border-border">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-content-muted uppercase tracking-wider block font-display">
                          Budget Range ({formatLakhCr(budgetMin)} - {formatLakhCr(budgetMax)})
                        </label>
                        <span className="text-xs font-mono font-bold text-accent-text bg-accent-soft px-2.5 py-0.5 rounded-lg border border-accent/20">
                          {formatIndianRupees(budgetMin)} to {formatIndianRupees(budgetMax)}
                        </span>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-content-muted mr-1">Presets:</span>
                        {BUDGET_PRESETS.map((p) => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => {
                              setBudgetMin(p.min);
                              setBudgetMax(p.max);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-colors border cursor-pointer ${
                              budgetMin === p.min && budgetMax === p.max
                                ? 'bg-accent text-white border-accent shadow-xs'
                                : 'bg-surface-inset border-border text-content-secondary hover:border-accent hover:text-accent'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>

                      {/* Manual Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="text-[11px] font-bold text-content-muted block mb-1">Min Budget (₹)</label>
                          <input
                            type="number"
                            step="100000"
                            value={budgetMin}
                            onChange={(e) => setBudgetMin(Number(e.target.value) || 0)}
                            className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content font-mono focus:outline-none focus:border-accent"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-content-muted block mb-1">Max Budget (₹)</label>
                          <input
                            type="number"
                            step="100000"
                            value={budgetMax}
                            onChange={(e) => setBudgetMax(Number(e.target.value) || 0)}
                            className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content font-mono focus:outline-none focus:border-accent"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 3. Micro-Market Locations in Navi Mumbai */}
                    <div className="space-y-2 pt-2 border-t border-border">
                      <label className="text-xs font-bold text-content-muted uppercase tracking-wider block font-display">
                        Preferred Navi Mumbai Localities
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {NAVI_MUMBAI_LOCALITIES.map((loc) => {
                          const isSelected = targetLocations.includes(loc);
                          return (
                            <button
                              key={loc}
                              type="button"
                              onClick={() => {
                                setTargetLocations((prev) =>
                                  isSelected ? prev.filter((l) => l !== loc) : [...prev, loc]
                                );
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                                isSelected
                                  ? 'bg-accent-soft text-accent-text border-accent/40 shadow-xs'
                                  : 'bg-surface-inset text-content-secondary border-border hover:border-border-strong hover:text-content'
                              }`}
                            >
                              <MapPin className={`w-3 h-3 ${isSelected ? 'text-accent' : 'text-content-muted'}`} />
                              {loc}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4. Possession & Purpose Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-border text-xs">
                      <div>
                        <label className="text-[11px] font-bold text-content-muted block mb-1">Possession Timeline</label>
                        <select
                          value={possessionPreference}
                          onChange={(e) => setPossessionPreference(e.target.value)}
                          className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content focus:outline-none focus:border-accent"
                        >
                          <option value="ANY">Any / Flexible</option>
                          <option value="READY_TO_MOVE">Ready to Move (OC Received)</option>
                          <option value="UNDER_CONSTRUCTION">Under Construction (Within 1-2 Yrs)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-content-muted block mb-1">Purchase Purpose</label>
                        <select
                          value={purpose}
                          onChange={(e) => setPurpose(e.target.value)}
                          className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content focus:outline-none focus:border-accent"
                        >
                          <option value="self_use">End-Use / Family Residence</option>
                          <option value="investment">Investment &amp; Rental Yield</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-content-muted block mb-1">Home Loan Status</label>
                        <select
                          value={loanPreApproved ? 'true' : 'false'}
                          onChange={(e) => setLoanPreApproved(e.target.value === 'true')}
                          className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content focus:outline-none focus:border-accent"
                        >
                          <option value="false">Self Funding / Need Bank Assistance</option>
                          <option value="true">Pre-Approved / Sanctioned</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* ============================================================
                    TAB 3: CLIENT PRESENTATION PORTALS & TELEMETRY
                    ============================================================ */}
                {activeTab === 'portals' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between px-1">
                      <div>
                        <h3 className="text-sm font-black text-content font-display">Client Presentation Portals</h3>
                        <p className="text-xs text-content-muted">Track view engagement and unit clicks for this prospect.</p>
                      </div>

                      <a
                        href={`/portals?createForLead=${lead.id}`}
                        className="px-3.5 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Create Portal
                      </a>
                    </div>

                    {portals.length > 0 ? (
                      <div className="space-y-3">
                        {portals.map((p: any) => {
                          const portalUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${p.token}`;
                          const isHighEngagement = (p.totalViews || 0) >= 3;

                          return (
                            <div
                              key={p.id}
                              className="p-4 bg-surface border border-border hover:border-border-strong rounded-2xl space-y-3 text-xs transition-all shadow-2xs"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-content">{p.title || 'Curated Property Portal'}</h4>
                                    {isHighEngagement ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center gap-1">
                                        <Flame className="w-3 h-3 text-rose-500" />
                                        Hot Lead ({p.totalViews} Views)
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-subtle text-content-muted border border-border">
                                        {p.totalViews || 0} Total Views
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] font-mono text-content-muted mt-0.5">
                                    Token: /p/{p.token} • Created {formatDateTime(p.createdAt)}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={`/p/${p.token}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 rounded-xl bg-surface-subtle hover:bg-surface-raised border border-border text-content hover:text-accent transition-colors"
                                    title="Open Portal Preview"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(portalUrl);
                                      toast.success('Portal Link Copied', { description: portalUrl });
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-accent-soft hover:bg-accent-soft/80 border border-accent/25 text-accent-text font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                    Copy Link
                                  </button>
                                </div>
                              </div>

                              {p.customMessage && (
                                <p className="text-xs text-content-secondary italic bg-surface-inset p-2.5 rounded-xl border border-border">
                                  &quot;{p.customMessage}&quot;
                                </p>
                              )}

                              {p.lastViewedAt && (
                                <div className="text-[11px] text-content-muted flex items-center gap-1 font-mono">
                                  <Eye className="w-3 h-3 text-accent" />
                                  Last viewed by buyer on {formatDateTime(p.lastViewedAt)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 rounded-2xl border border-dashed border-border bg-surface text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-accent-soft border border-accent/20 flex items-center justify-center mx-auto text-accent">
                          <Eye className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-content">No Client Portals Generated Yet</h4>
                          <p className="text-xs text-content-muted mt-1 max-w-md mx-auto">
                            Create an interactive, trackable web presentation for {profileName || lead.fullName || 'this client'} with verified RERA certificates, unit floor plans, and video walkthroughs.
                          </p>
                        </div>
                        <a
                          href={`/portals?createForLead=${lead.id}`}
                          className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-hover transition-colors inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <PlusCircle className="w-4 h-4" />
                          Generate First Client Portal
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* ============================================================
                    TAB 4: FULL AUDIT & DOSSIER
                    ============================================================ */}
                {activeTab === 'dossier' && (
                  <div className="p-5 sm:p-6 bg-surface border border-border rounded-2xl space-y-4 shadow-2xs animate-in fade-in duration-150">
                    <h3 className="text-sm font-black text-content font-display flex items-center gap-2 pb-2 border-b border-border">
                      <CheckSquare className="w-4 h-4 text-accent" />
                      Technical Dossier &amp; System Identifiers
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                      <div className="p-3 bg-surface-inset rounded-xl border border-border space-y-1">
                        <span className="text-content-muted text-[10px] block">ORGANIZATION ID:</span>
                        <span className="text-content select-all break-all">{lead.organizationId}</span>
                      </div>

                      <div className="p-3 bg-surface-inset rounded-xl border border-border space-y-1">
                        <span className="text-content-muted text-[10px] block">PERSON / CONTACT ID:</span>
                        <span className="text-content select-all break-all">{lead.contactId || 'None'}</span>
                      </div>

                      <div className="p-3 bg-surface-inset rounded-xl border border-border space-y-1">
                        <span className="text-content-muted text-[10px] block">LEAD RECORD UUID:</span>
                        <span className="text-content select-all break-all">{lead.id}</span>
                      </div>

                      <div className="p-3 bg-surface-inset rounded-xl border border-border space-y-1">
                        <span className="text-content-muted text-[10px] block">CREATED AT:</span>
                        <span className="text-content">{formatDateTime(lead.createdAt)}</span>
                      </div>
                    </div>

                    {lead.sourceContentUrl && (
                      <div className="p-3 bg-surface-inset rounded-xl border border-border space-y-1 text-xs">
                        <span className="text-content-muted text-[10px] block font-mono">ORIGINAL SOURCE URL:</span>
                        <a
                          href={lead.sourceContentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent hover:underline break-all font-mono"
                        >
                          {lead.sourceContentUrl}
                        </a>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================
            4. ERGONOMIC ACTION DOCK & WHATSAPP TEMPLATE LAUNCHER
            ================================================================== */}
        <div className="shrink-0 p-4 bg-surface/98 backdrop-blur border-t border-border z-30 shadow-lg">
          <div className={`flex flex-col sm:flex-row items-center gap-3 ${isFullScreen ? 'max-w-7xl mx-auto w-full' : ''}`}>
            
            {/* WhatsApp Template Selector & Direct Button */}
            {lead.phoneE164 ? (
              <div className="flex-1 flex flex-col sm:flex-row items-center gap-2 w-full">
                <div className="w-full sm:w-64">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content font-bold focus:outline-none focus:border-accent"
                  >
                    {WHATSAPP_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>

                <a
                  href={`https://wa.me/${lead.phoneE164.replace(/\D/g, '')}?text=${encodeURIComponent(currentWhatsAppText)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Launch WhatsApp ({WHATSAPP_TEMPLATES.find((t) => t.id === selectedTemplateId)?.title.split(' ')[0]})</span>
                </a>

                <a
                  href={`tel:${lead.phoneE164}`}
                  onClick={() => {
                    // Auto-open call logger when phone link is clicked
                    setShowAddForm(true);
                    setChannel('PHONE_CALL');
                    setDirection('OUTBOUND');
                  }}
                  className="w-full sm:w-auto py-2.5 px-5 bg-surface hover:bg-surface-subtle text-accent-text font-bold text-xs rounded-xl border border-border flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer"
                >
                  <Phone className="w-4 h-4 text-accent" />
                  Call Now
                </a>
              </div>
            ) : (
              <div className="w-full text-center py-2 text-xs text-content-muted">
                Instagram / Social Inbound • Reply via direct message or request phone number
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-surface-subtle hover:bg-surface-raised border border-border text-content text-xs font-bold transition-colors cursor-pointer"
            >
              Done &amp; Close
            </button>
          </div>
        </div>
      </div>

      {/* Delete Lead Confirmation Modal */}
      <AccessibleDialog
        open={showDeleteLeadConfirm}
        onClose={() => !isDeletingLead && setShowDeleteLeadConfirm(false)}
        titleId="drawer-delete-lead-title"
        descriptionId="drawer-delete-lead-desc"
        size="sm"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="drawer-delete-lead-title" className="text-base font-bold text-content">
                Delete Lead
              </h3>
              <p id="drawer-delete-lead-desc" className="text-xs text-content-secondary mt-1 leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <strong className="text-content font-semibold">
                  {lead?.fullName || lead?.phoneE164 || 'this prospect'}
                </strong>
                ? All associated communication logs, site visits, portal links, and reminders will be deleted immediately. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isDeletingLead}
              onClick={() => setShowDeleteLeadConfirm(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-content-secondary hover:bg-surface-subtle border border-border transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeletingLead}
              onClick={handleDeleteLead}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isDeletingLead ? (
                <span>Deleting…</span>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Permanently</span>
                </>
              )}
            </button>
          </div>
        </div>
      </AccessibleDialog>
    </>
  );
}
