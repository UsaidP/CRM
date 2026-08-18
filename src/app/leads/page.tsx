'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  PhoneCall, 
  MessageSquare, 
  RefreshCw, 
  Search, 
  Send, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  Plus, 
  Filter, 
  Sparkles, 
  Zap, 
  ArrowRight 
} from 'lucide-react';
import { YoutubeIcon, InstagramIcon } from '@/components/icons/SocialIcons';

export default function LeadsMatrixPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState('ALL');
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Manual Inbound Ingestion Simulation Modal State
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simPhone, setSimPhone] = useState('9820199887');
  const [simName, setSimName] = useState('Rahul Deshmukh');
  const [simChannel, setSimChannel] = useState('WHATSAPP');
  const [simText, setSimText] = useState('Hi ZamZam, saw your YouTube Short of Sai Marvel 2BHK. Please share verified price.');
  const [simulating, setSimulating] = useState(false);

  // Speed-to-Lead WhatsApp Dispatch Modal
  const [dispatchLead, setDispatchLead] = useState<any | null>(null);
  const [dispatchText, setDispatchText] = useState('');

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/leads');
      const data = await res.json();
      if (data.success) setLeads(data.data);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleStageChange = async (leadId: string, newStage: string) => {
    try {
      const res = await fetch(`/api/v1/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStage: newStage }),
      });
      const data = await res.json();
      if (data.success) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, currentStage: newStage } : l))
        );
      }
    } catch (err) {
      console.error('Error updating stage:', err);
    }
  };

  const handleSimulateInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    try {
      let endpoint = '/api/v1/webhooks/whatsapp';
      let payload: any = {
        fromPhone: simPhone,
        senderName: simName,
        messageText: simText,
      };

      if (simChannel === 'INSTAGRAM') {
        endpoint = '/api/v1/webhooks/instagram';
        payload = {
          customerPhone: simPhone,
          customerName: simName,
          igUsername: simName.toLowerCase().replace(/\s+/g, '_'),
          reelCode: 'REEL-KHARGHAR-35',
          commentOrDmText: simText,
        };
      } else if (simChannel === 'TELEPHONY') {
        endpoint = '/api/v1/webhooks/telephony';
        payload = {
          callerNumber: simPhone,
          virtualNumber: '+912269001122',
          callType: 'MISSED_CALL',
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setShowSimulateModal(false);
        fetchLeads();
      } else {
        alert(data.error || 'Failed to simulate inbound lead');
      }
    } catch (err: any) {
      alert(err.message || 'Error simulating inbound lead');
    } finally {
      setSimulating(false);
    }
  };

  const getSourceIcon = (source: string) => {
    const s = (source || '').toLowerCase();
    if (s.includes('youtube')) return <YoutubeIcon className="w-4 h-4 text-red-400" />;
    if (s.includes('instagram') || s.includes('reel')) return <InstagramIcon className="w-4 h-4 text-pink-400" />;
    if (s.includes('fb') || s.includes('facebook')) return <Users className="w-4 h-4 text-blue-400" />;
    if (s.includes('whatsapp')) return <MessageSquare className="w-4 h-4 text-[#ccb67b]" />;
    return <PhoneCall className="w-4 h-4 text-amber-400" />;
  };

  const getSourceLabel = (source: string) => {
    const s = (source || '').toLowerCase();
    if (s.includes('youtube_short') || s.includes('youtube')) return 'YouTube Short';
    if (s.includes('instagram')) return 'Instagram Reel';
    if (s.includes('fb')) return 'Facebook Group';
    if (s.includes('whatsapp')) return 'WhatsApp Group';
    return 'Inbound Call';
  };

  const filteredLeads = leads.filter((l) => {
    if (selectedSource !== 'ALL') {
      const src = (l.leadSource || '').toLowerCase();
      if (!src.includes(selectedSource.toLowerCase())) return false;
    }
    if (selectedStage !== 'ALL' && l.currentStage !== selectedStage) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = (l.fullName || '').toLowerCase().includes(q);
      const matchPhone = (l.phoneE164 || '').includes(q);
      const matchNotes = (l.notes || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchNotes) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#b59658]/20">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1b202c] border border-[#b59658]/40 text-[#ccb67b] text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5 text-[#b59658]" />
            Live Omnichannel Inbound Matrix
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white font-display">
            Buyer Inquiries &amp; Organic Lead Triage
          </h1>
          <p className="text-slate-400 text-xs mt-0.5 font-sans">
            Real-time ingestion from YouTube Shorts, Instagram Reels, Facebook Groups, and WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchLeads}
            className="p-2.5 rounded-xl bg-[#1b202c] hover:bg-[#2a3040] text-slate-300 hover:text-white border border-[#b59658]/30 transition-all flex items-center gap-2 text-xs font-semibold shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowSimulateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] hover:opacity-95 text-[#12151f] text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-lg shadow-[#b59658]/20 border border-[#ccb67b]/60"
          >
            <Zap className="w-4 h-4 text-[#12151f]" />
            Test Inbound Ingestion
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Total Inbound Leads</span>
          <div className="text-2xl font-bold text-white mt-1 font-display">{leads.length}</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-[#b59658]/30">
          <span className="text-[11px] text-[#ccb67b] font-semibold uppercase tracking-wider block">New Uncontacted</span>
          <div className="text-2xl font-bold text-[#ccb67b] mt-1 font-display">
            {leads.filter((l) => l.currentStage === 'new_uncontacted').length}
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-purple-900/40">
          <span className="text-[11px] text-purple-400 font-semibold uppercase tracking-wider block">Requirement Discovery</span>
          <div className="text-2xl font-bold text-purple-400 mt-1 font-display">
            {leads.filter((l) => l.currentStage === 'discovery_call').length}
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-amber-900/40">
          <span className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider block">Portals Shared / Visits</span>
          <div className="text-2xl font-bold text-amber-400 mt-1 font-display">
            {leads.filter((l) => ['portal_shared', 'visit_scheduled', 'visit_done'].includes(l.currentStage)).length}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search leads by name, phone (+91...), or message keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#ccb67b]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'ALL', label: 'All Sources' },
              { id: 'youtube', label: 'YouTube' },
              { id: 'instagram', label: 'Instagram' },
              { id: 'fb', label: 'Facebook' },
              { id: 'whatsapp', label: 'WhatsApp' },
              { id: 'call', label: 'Calls' },
            ].map((src) => (
              <button
                key={src.id}
                onClick={() => setSelectedSource(src.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedSource === src.id
                    ? 'bg-[#1b202c] text-[#ccb67b] border border-[#b59658]/50 shadow-sm font-bold'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {src.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leads Stream */}
      {loading ? (
        <div className="glass-panel p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#ccb67b]" />
          <span>Refreshing live lead stream...</span>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-400 text-sm">
          No leads found matching your search and filter criteria.
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredLeads.map((lead) => {
            const cleanPhone = (lead.phoneE164 || '').replace(/\+/g, '');
            const defaultReply = `Hello ${lead.fullName || ''}! Thank you for reaching out to ZamZam Properties. We have verified options matching your request. Let me know when you'd like a brief 2-minute discovery call.`;
            const waChatUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultReply)}`;

            return (
              <div
                key={lead.id}
                className="glass-card p-5 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-[#b59658]/40 transition-all"
              >
                {/* Lead Contact Info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                      {getSourceIcon(lead.leadSource)}
                    </span>
                    <h3 className="font-bold text-white text-base font-display">
                      {lead.fullName || 'Unidentified Prospect'}
                    </h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                      {lead.phoneE164}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#1b202c] text-[#ccb67b] border border-[#b59658]/40 font-medium">
                      {getSourceLabel(lead.leadSource)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 mt-2">
                    💬 <span className="italic text-slate-300">{lead.notes || 'Inbound inquiry captured'}</span>
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(lead.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {lead.campaign && (
                      <span className="text-[#ccb67b] font-mono">
                        Campaign: {lead.campaign.campaignName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stage Progression & Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 lg:border-l lg:border-slate-800 lg:pl-5">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Pipeline Stage
                    </label>
                    <select
                      value={lead.currentStage}
                      onChange={(e) => handleStageChange(lead.id, e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ccb67b] font-medium"
                    >
                      <option value="new_uncontacted">New Uncontacted</option>
                      <option value="discovery_call">Discovery Call Done</option>
                      <option value="portal_shared">Client Portal Shared</option>
                      <option value="visit_scheduled">Site Visit Scheduled</option>
                      <option value="visit_done">Visit Completed</option>
                      <option value="closed_won">Closed Won</option>
                      <option value="closed_lost">Closed Lost</option>
                    </select>
                  </div>

                  <a
                    href={`/matching`}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[#ccb67b] border border-[#b59658]/30 text-xs font-semibold transition-all flex items-center gap-1.5 mt-4 lg:mt-0"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#b59658]" />
                    Match Properties
                  </a>

                  <a
                    href={waChatUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] hover:opacity-95 text-[#12151f] text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md shadow-[#b59658]/20 mt-4 lg:mt-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Speed-to-Lead WhatsApp
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Simulate Inbound Social Lead */}
      {showSimulateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-lg flex items-center gap-2 font-display">
                <Zap className="w-5 h-5 text-[#b59658]" />
                Simulate Inbound Webhook Event
              </h3>
              <button onClick={() => setShowSimulateModal(false)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleSimulateInbound} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Simulated Channel</label>
                <select
                  value={simChannel}
                  onChange={(e) => setSimChannel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ccb67b]"
                >
                  <option value="WHATSAPP">WhatsApp Cloud API (Message / Deep Link)</option>
                  <option value="INSTAGRAM">Instagram Graph API (Reel Comment / DM)</option>
                  <option value="TELEPHONY">Exotel / Twilio Missed Call</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Buyer Phone Number</label>
                <input
                  type="text"
                  required
                  value={simPhone}
                  onChange={(e) => setSimPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Buyer Name</label>
                <input
                  type="text"
                  required
                  value={simName}
                  onChange={(e) => setSimName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {simChannel !== 'TELEPHONY' && (
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Inbound Message Content</label>
                  <textarea
                    rows={3}
                    required
                    value={simText}
                    onChange={(e) => setSimText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={simulating}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] text-[#12151f] text-xs font-extrabold shadow-md flex items-center gap-1.5"
                >
                  {simulating ? 'Firing Webhook...' : 'Fire Webhook & Ingest Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
