'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { YoutubeIcon, InstagramIcon } from '@/components/icons/SocialIcons';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';
import { CallLogModal } from '@/components/leads/CallLogModal';
import { SourceEvidenceDrawer } from '@/components/leads/SourceEvidenceDrawer';
import { ContactMergeModal } from '@/components/leads/ContactMergeModal';
import { OFFICIAL_BROKER_NUMBERS } from '@/lib/domain/broker-resolver';

function ElapsedSlaTimer({ startTime, isResponded }: { startTime?: string | Date; isResponded: boolean }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (isResponded || !startTime) return;
    const startMs = new Date(startTime).getTime();
    
    const update = () => {
      const diff = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setSeconds(diff);
    };
    
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime, isResponded]);

  if (isResponded) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Responded
      </span>
    );
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const isCritical = mins >= 5;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold tracking-tight border animate-pulse ${
        isCritical
          ? 'bg-red-500/20 text-red-300 border-red-500/50 shadow-sm shadow-red-500/30'
          : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
      }`}
    >
      <Clock className={`w-3 h-3 ${isCritical ? 'text-red-400' : 'text-amber-400'}`} />
      <span>{formatted}</span>
      <span className="text-[9px] uppercase tracking-wider font-sans font-bold">
        {isCritical ? 'SLA Alert' : 'SLA Clock'}
      </span>
    </span>
  );
}

export function LeadsMatrixClient({ initialLeads = [] }: { initialLeads?: any[] }) {
  const [leads, setLeads] = useState<any[]>(initialLeads);
  const [loading, setLoading] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<string>('ALL');
  const [selectedConfidence, setSelectedConfidence] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState('ALL');
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers
  const [showCallLogModal, setShowCallLogModal] = useState(false);
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<any | null>(null);
  const [mergeSourceLead, setMergeSourceLead] = useState<any | null>(null);
  const [uiError, setUiError] = useState('');

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

  const getSourceIcon = (source: string) => {
    const s = (source || '').toUpperCase();
    if (s.includes('YOUTUBE')) return <YoutubeIcon className="w-3.5 h-3.5 text-red-500" />;
    if (s.includes('INSTAGRAM')) return <InstagramIcon className="w-3.5 h-3.5 text-pink-500" />;
    if (s.includes('WHATSAPP')) return <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />;
    return <Phone className="w-3.5 h-3.5 text-amber-400" />;
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'EXACT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <ShieldCheck className="w-3 h-3 text-emerald-400" /> EXACT
          </span>
        );
      case 'INFERRED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <ShieldAlert className="w-3 h-3 text-amber-400" /> INFERRED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
            UNKNOWN
          </span>
        );
    }
  };

  const filteredLeads = leads.filter((l) => {
    // Broker Filter
    let matchesBroker = true;
    if (selectedBroker === 'SAFWAN') {
      matchesBroker =
        l.assignedBroker?.phoneE164 === OFFICIAL_BROKER_NUMBERS.SAFWAN.e164 ||
        l.inboundNumber === OFFICIAL_BROKER_NUMBERS.SAFWAN.e164 ||
        (l.assignedBroker?.fullName || '').includes('Safwan');
    } else if (selectedBroker === 'SUHEL') {
      matchesBroker =
        l.assignedBroker?.phoneE164 === OFFICIAL_BROKER_NUMBERS.SUHEL.e164 ||
        l.inboundNumber === OFFICIAL_BROKER_NUMBERS.SUHEL.e164 ||
        (l.assignedBroker?.fullName || '').includes('Suhel');
    }

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

    return matchesBroker && matchesConfidence && matchesSource && matchesStage && matchesSearch;
  });

  const uncontactedCount = leads.filter((l) => l.currentStage === 'new_uncontacted').length;
  const exactAttributionCount = leads.filter((l) => l.sourceConfidence === 'EXACT').length;
  const safwanLeadCount = leads.filter(
    (l) =>
      l.assignedBroker?.phoneE164 === OFFICIAL_BROKER_NUMBERS.SAFWAN.e164 ||
      l.inboundNumber === OFFICIAL_BROKER_NUMBERS.SAFWAN.e164
  ).length;
  const suhelLeadCount = leads.filter(
    (l) =>
      l.assignedBroker?.phoneE164 === OFFICIAL_BROKER_NUMBERS.SUHEL.e164 ||
      l.inboundNumber === OFFICIAL_BROKER_NUMBERS.SUHEL.e164
  ).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-zinc-100 font-sans">
      {/* Top Banner & Hallmark Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#0d1017] via-[#121622] to-[#0d1017] border border-amber-500/30 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              Organic Lead Workstation
              <span className="text-xs uppercase font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Live Speed-to-Lead
              </span>
            </h1>
          </div>
          <p className="text-xs text-zinc-400">
            Durable multi-channel identity resolution • Strict broker line ownership • Stated campaign codes
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCallLogModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-semibold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Log Call / Quick Inbound</span>
          </button>

          <button
            onClick={fetchLeads}
            disabled={loading}
            className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 text-zinc-300 hover:text-white rounded-xl transition-all disabled:opacity-50"
            title="Refresh Inbound Leads"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {uiError && (
        <div className="p-4 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center justify-between">
          <span>{uiError}</span>
          <button onClick={() => setUiError('')} className="text-red-400 hover:text-red-300 font-bold">✕</button>
        </div>
      )}

      {/* Speed-to-Lead SLA & Ownership Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-[#0e111a] border border-red-500/30 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] uppercase font-semibold text-zinc-400">Uncontacted Leads</p>
            <h3 className="text-xl font-bold text-red-400 mt-0.5">{uncontactedCount}</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">&lt;5 min response SLA clock active</p>
          </div>
          <div className="p-2.5 rounded-lg bg-red-500/10 text-red-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0e111a] border border-emerald-500/30 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] uppercase font-semibold text-zinc-400">Exact Attributed</p>
            <h3 className="text-xl font-bold text-emerald-400 mt-0.5">{exactAttributionCount}</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">Verified via Stated Source Codes</p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0e111a] border border-amber-500/30 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] uppercase font-semibold text-zinc-400">Safwan Diwan</p>
            <h3 className="text-xl font-bold text-amber-300 mt-0.5">{safwanLeadCount} Leads</h3>
            <p className="text-[10px] font-mono text-zinc-400 mt-0.5">{OFFICIAL_BROKER_NUMBERS.SAFWAN.e164}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0e111a] border border-amber-500/30 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] uppercase font-semibold text-zinc-400">Suhel Patel</p>
            <h3 className="text-xl font-bold text-amber-300 mt-0.5">{suhelLeadCount} Leads</h3>
            <p className="text-[10px] font-mono text-zinc-400 mt-0.5">{OFFICIAL_BROKER_NUMBERS.SUHEL.e164}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[#0e111a] border border-zinc-800/90 space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by buyer name, phone, code (e.g. TALOJA21)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          {/* Broker Filter */}
          <div>
            <select
              value={selectedBroker}
              onChange={(e) => setSelectedBroker(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-amber-300 font-medium focus:outline-none focus:border-amber-500/60"
            >
              <option value="ALL">All Brokers (Combined)</option>
              <option value="SAFWAN">Safwan Diwan (+91 7977552011)</option>
              <option value="SUHEL">Suhel Patel (+91 9967731071)</option>
            </select>
          </div>

          {/* Confidence Filter */}
          <div>
            <select
              value={selectedConfidence}
              onChange={(e) => setSelectedConfidence(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/60"
            >
              <option value="ALL">All Confidence Levels</option>
              <option value="EXACT">🟢 Exact Attribution Only</option>
              <option value="INFERRED">🟡 Inferred Keyword Match</option>
              <option value="UNKNOWN">⚪ Unknown Organic Direct</option>
            </select>
          </div>

          {/* Stage Filter */}
          <div>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/60"
            >
              <option value="ALL">All Pipeline Stages</option>
              <option value="new_uncontacted">🔴 New Uncontacted</option>
              <option value="discovery_call">📞 Discovery Call</option>
              <option value="portal_shared">🔗 Portal Shared</option>
              <option value="visit_scheduled">🚗 Visit Scheduled</option>
              <option value="visit_done">🏢 Visit Done</option>
              <option value="closed_won">🏆 Closed Won</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Leads Table */}
      <div className="rounded-2xl bg-[#0c0e16] border border-zinc-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-[#0f121d] text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Buyer & Identities</th>
                <th className="py-3.5 px-4">Attribution & Code</th>
                <th className="py-3.5 px-4">Contacted Broker Line</th>
                <th className="py-3.5 px-4">Speed-to-Lead SLA</th>
                <th className="py-3.5 px-4">Meta 24h Window</th>
                <th className="py-3.5 px-4">Pipeline Stage</th>
                <th className="py-3.5 px-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => {
                  const identities = lead.contact?.identities || [];
                  const isResponded = lead.currentStage !== 'new_uncontacted';
                  const windowInfo = lead.messagingWindow || { isOpen: true, hoursRemaining: 24, label: 'Open' };

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-zinc-900/50 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLeadForDrawer(lead)}
                    >
                      {/* Buyer Details & Identities */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 shrink-0">
                            {getSourceIcon(lead.leadSource)}
                          </div>
                          <div>
                            <p className="font-semibold text-white group-hover:text-amber-300 transition-colors">
                              {lead.fullName || 'Navi Mumbai Prospect'}
                            </p>
                            <p className="font-mono text-[11px] text-zinc-400 mt-0.5">
                              {lead.phoneE164 ? lead.phoneE164 : (identities[0]?.identityValue ? `@${identities[0].identityValue}` : 'Social Lead')}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Attribution & Code */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            {getConfidenceBadge(lead.sourceConfidence)}
                            {lead.sourceCode && (
                              <span className="font-mono font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px]">
                                {lead.sourceCode}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 line-clamp-1">
                            {lead.campaign?.campaignName || lead.leadSource}
                          </p>
                        </div>
                      </td>

                      {/* Contacted Broker Line */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="text-zinc-200 font-semibold flex items-center gap-1.5 text-xs">
                            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                            {lead.assignedBroker?.fullName || 'Safwan Diwan'}
                          </p>
                          <p className="font-mono text-[11px] text-zinc-400">
                            {lead.inboundNumber || OFFICIAL_BROKER_NUMBERS.SAFWAN.e164}
                          </p>
                        </div>
                      </td>

                      {/* Speed-to-Lead SLA Clock */}
                      <td className="py-3.5 px-4">
                        <ElapsedSlaTimer
                          startTime={lead.lastInboundMessageAt || lead.createdAt}
                          isResponded={isResponded}
                        />
                      </td>

                      {/* Meta 24h Window */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            windowInfo.isOpen
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-300 border border-red-500/20'
                          }`}
                        >
                          {windowInfo.isOpen ? `🟢 ${windowInfo.hoursRemaining || 24}h Open` : '🔴 Expired'}
                        </span>
                      </td>

                      {/* Pipeline Stage Selector */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={lead.currentStage}
                          onChange={(e) => handleStageChange(lead.id, e.target.value)}
                          className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500/50"
                        >
                          <option value="new_uncontacted">🔴 New Uncontacted</option>
                          <option value="discovery_call">📞 Discovery Call</option>
                          <option value="portal_shared">🔗 Portal Shared</option>
                          <option value="visit_scheduled">🚗 Visit Scheduled</option>
                          <option value="visit_done">🏢 Visit Done</option>
                          <option value="closed_won">🏆 Closed Won</option>
                        </select>
                      </td>

                      {/* Quick Action Toolbar */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {lead.phoneE164 && (
                            <>
                              <a
                                href={`https://wa.me/${lead.phoneE164.replace(/\D/g, '')}?text=${encodeURIComponent(
                                  `Hello ${lead.fullName || 'Sir/Ma\'am'}, Safwan from ZamZam Properties here regarding your inquiry for ${lead.sourceCode || 'Navi Mumbai luxury projects'}.`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all"
                                title="1-Click WhatsApp Reply"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                              <a
                                href={`tel:${lead.phoneE164}`}
                                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 transition-all"
                                title="1-Click Phone Call"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            </>
                          )}
                          <button
                            onClick={() => setSelectedLeadForDrawer(lead)}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 transition-all"
                            title="View Source Evidence"
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
                  <td colSpan={7} className="py-12 text-center text-xs text-zinc-500">
                    No matching leads found for the selected broker and filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawers & Modals */}
      <SourceEvidenceDrawer
        lead={selectedLeadForDrawer}
        onClose={() => setSelectedLeadForDrawer(null)}
        onOpenMergeModal={(lead) => {
          setSelectedLeadForDrawer(null);
          setMergeSourceLead(lead);
        }}
      />

      <CallLogModal
        isOpen={showCallLogModal}
        onClose={() => setShowCallLogModal(false)}
        onSuccess={fetchLeads}
      />

      <ContactMergeModal
        isOpen={!!mergeSourceLead}
        sourceLead={mergeSourceLead}
        allLeads={leads}
        onClose={() => setMergeSourceLead(null)}
        onSuccess={fetchLeads}
      />
    </div>
  );
}
