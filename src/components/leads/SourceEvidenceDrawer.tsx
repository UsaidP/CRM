'use client';

import React from 'react';
import {
  X,
  Phone,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ExternalLink,
  UserCheck,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  GitMerge,
} from 'lucide-react';
import { YoutubeIcon, InstagramIcon } from '@/components/icons/SocialIcons';
import { evaluate24HourMessagingWindow } from '@/lib/domain/contact-manager';
import { OFFICIAL_BROKER_NUMBERS } from '@/lib/domain/broker-resolver';

interface SourceEvidenceDrawerProps {
  lead: any | null;
  onClose: () => void;
  onOpenMergeModal: (lead: any) => void;
}

export function SourceEvidenceDrawer({ lead, onClose, onOpenMergeModal }: SourceEvidenceDrawerProps) {
  if (!lead) return null;

  const identities = lead.contact?.identities || [];
  const communications = lead.communications || [];
  const windowInfo = evaluate24HourMessagingWindow(lead.lastInboundMessageAt || lead.createdAt);

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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
            UNKNOWN ORGANIC
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-[#0c0e14] border-l border-amber-500/30 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-250 text-zinc-100 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 px-6 py-5 bg-[#0e111a]/95 backdrop-blur border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            {getSourceIcon(lead.leadSource)}
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {lead.fullName || 'Unnamed Prospect'}
              {getConfidenceBadge(lead.sourceConfidence)}
            </h2>
            <p className="text-xs text-zinc-400">
              Durable Person ID: <span className="font-mono text-zinc-300">{lead.contactId || lead.id.substring(0, 8)}</span>
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 flex-1">
        {/* Attribution & Stated Source Code Banner */}
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Campaign Source Code:</span>
            <span className="font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
              {lead.sourceCode || 'NO_EXPLICIT_CODE'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Inbound Contacted Broker Line:</span>
            <span className="font-mono text-zinc-200 font-medium">
              {lead.inboundNumber || OFFICIAL_BROKER_NUMBERS.SAFWAN.e164}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Assigned Broker Owner:</span>
            <span className="text-amber-300 font-semibold flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              {lead.assignedBroker?.fullName || 'Safwan Diwan'}
            </span>
          </div>

          {lead.campaign && (
            <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800">
              <span className="text-zinc-400">Linked Campaign:</span>
              <span className="text-zinc-200 font-medium">{lead.campaign.campaignName}</span>
            </div>
          )}
        </div>

        {/* 24-Hour WhatsApp Messaging Window Card */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            windowInfo.isOpen
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
              : 'bg-red-950/20 border-red-500/40 text-red-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0 text-amber-400" />
              <span className="text-xs font-semibold uppercase tracking-wider">Meta 24h Window Status</span>
            </div>
            <span className="text-xs font-mono font-bold">{windowInfo.windowLabel}</span>
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            {windowInfo.isOpen
              ? `Broker can send freeform WhatsApp replies for the next ${windowInfo.hoursRemaining} hours.`
              : 'Window has elapsed. Direct freeform WhatsApp messages are blocked by Meta. Must send an approved Meta Template Message to re-open.'}
          </p>
        </div>

        {/* Multi-Channel Identities Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Durable Identities ({identities.length || (lead.phoneE164 ? 1 : 0)})
            </h3>
            <button
              onClick={() => onOpenMergeModal(lead)}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium transition-colors"
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
                  className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {id.identityType}
                    </span>
                    <span className="font-mono text-zinc-100 font-medium">{id.identityValue}</span>
                  </div>
                  {id.isPrimary && (
                    <span className="text-[10px] uppercase font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Primary
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between text-xs">
                <span className="font-mono text-zinc-400">PHONE_E164</span>
                <span className="font-mono text-zinc-100">{lead.phoneE164 || 'No Phone (Social Inbound)'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Communication Audit History */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            Communication Logs & Audit Trail ({communications.length})
          </h3>

          <div className="space-y-3">
            {communications.length > 0 ? (
              communications.map((c: any) => (
                <div key={c.id} className="p-3.5 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                      {c.channel === 'WHATSAPP' && <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />}
                      {c.channel === 'PHONE_CALL' && <Phone className="w-3.5 h-3.5 text-amber-400" />}
                      {c.channel === 'INSTAGRAM_DM' && <Instagram className="w-3.5 h-3.5 text-pink-400" />}
                      {c.channel} • {c.direction}
                    </span>
                    <span className="text-[11px]">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-zinc-300">{c.messageContent || '[No content text recorded]'}</p>
                  {c.callDurationSeconds > 0 && (
                    <p className="text-[11px] text-amber-400/90 font-mono">
                      ⏱ Duration: {c.callDurationSeconds} seconds
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                Initial lead created. No outbound conversations logged yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer 1-Click Action Toolbar */}
      <div className="sticky bottom-0 p-5 bg-[#0e111a]/95 backdrop-blur border-t border-zinc-800 flex items-center gap-3">
        {lead.phoneE164 ? (
          <>
            <a
              href={`https://wa.me/${lead.phoneE164.replace(/\D/g, '')}?text=${encodeURIComponent(
                `Hello ${lead.fullName || 'Sir/Ma\'am'}, Safwan from ZamZam Properties here regarding your inquiry for ${lead.sourceCode || 'Navi Mumbai luxury projects'}.`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              1-Click WhatsApp
            </a>
            <a
              href={`tel:${lead.phoneE164}`}
              className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-semibold text-xs rounded-xl border border-amber-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <Phone className="w-4 h-4" />
              Call
            </a>
          </>
        ) : (
          <div className="w-full text-center py-2 text-xs text-zinc-400">
            Instagram Social Inbound • Reply via Direct Message or request phone number
          </div>
        )}
      </div>
    </div>
  );
}
