'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ExternalLink, 
  Send, 
  Eye, 
  Clock, 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Check, 
  Search, 
  Flame, 
  Zap, 
  Calendar, 
  Download, 
  Users, 
  Layers,
  PhoneCall,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function ClientPortalsConsolePage() {
  const [portals, setPortals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState('ALL');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPortals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/portals');
      const data = await res.json();
      if (data.success) {
        setPortals(data.data);
      }
    } catch (err) {
      console.error('Error fetching portals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortals();
  }, []);

  const handleCopyLink = (token: string) => {
    const url = `http://localhost:3000/p/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const filteredPortals = portals.filter((p) => {
    if (selectedTier !== 'ALL' && p.engagement.engagementTier !== selectedTier) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchLead = (p.lead?.fullName || '').toLowerCase().includes(q);
      const matchPhone = (p.lead?.phoneE164 || '').includes(q);
      const matchToken = p.token.toLowerCase().includes(q);
      if (!matchLead && !matchPhone && !matchToken) return false;
    }
    return true;
  });

  const totalPortals = portals.length;
  const hotLeadsCount = portals.filter((p) => p.engagement.engagementTier === 'HOT_PROSPECT').length;
  const warmLeadsCount = portals.filter((p) => p.engagement.engagementTier === 'WARM_INTEREST').length;
  const totalViews = portals.reduce((acc, p) => acc + (p.totalViews || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#b59658]/20">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1b202c] border border-[#b59658]/40 text-[#ccb67b] text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#b59658]" />
            Live Client Engagement &amp; Real-Time Telemetry Matrix
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white font-display">
            Tokenized Private Client Portals
          </h1>
          <p className="text-slate-400 text-xs mt-0.5 font-sans">
            Track client views, dwell times, photo swipes, and trigger instant WhatsApp follow-ups for hot prospects.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchPortals}
            className="p-2.5 rounded-xl bg-[#1b202c] hover:bg-[#2a3040] text-slate-300 hover:text-white border border-[#b59658]/30 transition-all flex items-center gap-2 text-xs font-semibold shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
          <a
            href="/matching"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] hover:opacity-95 text-[#12151f] text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-lg shadow-[#b59658]/20 border border-[#ccb67b]/60"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#12151f]" />
            Generate New Portal
          </a>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Active Shared Portals</span>
          <div className="text-2xl font-bold text-white mt-1">{totalPortals}</div>
          <span className="text-[10px] text-slate-500">{totalViews} Total Client Visits</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-[#b59658]/30">
          <span className="text-[11px] text-[#ccb67b] font-bold uppercase tracking-wider block flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Hot Leads (Visit / WhatsApp)
          </span>
          <div className="text-2xl font-bold text-[#ccb67b] mt-1 font-display">{hotLeadsCount}</div>
          <span className="text-[10px] text-[#ccb67b]/80">Ready for instant call / booking</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-blue-900/50">
          <span className="text-[11px] text-blue-400 font-bold uppercase tracking-wider block flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" />
            Warm Prospects
          </span>
          <div className="text-2xl font-bold text-blue-400 mt-1 font-display">{warmLeadsCount}</div>
          <span className="text-[10px] text-blue-300/80">Browsed photos & spent &gt;45s</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Inventory Included</span>
          <div className="text-2xl font-bold text-white mt-1 font-display">100%</div>
          <span className="text-[10px] text-[#ccb67b] font-semibold">MahaRERA &amp; $C_{'{'}all-in{'}'}$ Verified</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by client name, phone (+91...), or portal token..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#ccb67b]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {[
              { id: 'ALL', label: 'All Portals' },
              { id: 'HOT_PROSPECT', label: '🔥 Hot Leads' },
              { id: 'WARM_INTEREST', label: '⚡ Warm Interest' },
              { id: 'INITIAL_VIEW', label: '👁️ Initial View' },
              { id: 'NO_ACTIVITY', label: '⏳ Unopened' },
            ].map((tier) => (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                  selectedTier === tier.id
                    ? 'bg-[#1b202c] text-[#ccb67b] border border-[#b59658]/50 shadow-sm font-bold'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Portals Stream */}
      {loading ? (
        <div className="glass-panel p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#ccb67b]" />
          <span>Refreshing client telemetry matrix...</span>
        </div>
      ) : filteredPortals.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-400 text-sm space-y-2">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-white font-semibold">No client portals found.</p>
          <p className="text-xs text-slate-400">
            Select properties from the Property Matchmaker console to generate and dispatch your first client portal.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPortals.map((portal) => {
            const portalUrl = `http://localhost:3000/p/${portal.token}`;
            const isHot = portal.engagement.engagementTier === 'HOT_PROSPECT';
            const isWarm = portal.engagement.engagementTier === 'WARM_INTEREST';
            const leadPhone = (portal.lead?.phoneE164 || '').replace(/\+/g, '');

            const followUpText = isHot
              ? `Hello ${portal.lead?.fullName || ''}! I saw you were reviewing the options on your private ZamZam portal. Would you like to confirm the Saturday site visit with cab pickup?`
              : `Hello ${portal.lead?.fullName || ''}! Just checking if you had a chance to look over the curated property options on your private portal: ${portalUrl}`;

            const waChatUrl = `https://wa.me/${leadPhone}?text=${encodeURIComponent(followUpText)}`;

            return (
              <div
                key={portal.id}
                className={`glass-panel p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                  isHot
                    ? 'border-[#b59658]/80 bg-[#1b202c]/60'
                    : isWarm
                    ? 'border-blue-700/60 bg-blue-950/10'
                    : 'border-slate-800 hover:border-[#b59658]/30'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <Users className="w-4 h-4 text-[#ccb67b]" />
                      </span>
                      <h3 className="font-bold text-white text-base font-display">
                        {portal.lead?.fullName || 'Client'}
                      </h3>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                        {portal.lead?.phoneE164}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        /{portal.token}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 pt-1">
                      📁 Includes <strong>{portal.propertyCount} Verified Properties</strong>:{' '}
                      {portal.projects.map((p: any) => `${p.bhk} BHK in ${p.projectName}`).join(' • ')}
                    </p>
                  </div>

                  {/* Engagement Tier Badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border ${
                        isHot
                          ? 'bg-[#1b202c] text-[#ccb67b] border-[#b59658]/50 shadow-md'
                          : isWarm
                          ? 'bg-blue-950 text-blue-300 border-blue-700'
                          : portal.totalViews > 0
                          ? 'bg-slate-800 text-slate-300 border-slate-700'
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}
                    >
                      {isHot && <Flame className="w-3.5 h-3.5 text-amber-400" />}
                      {isWarm && <Zap className="w-3.5 h-3.5 text-blue-400" />}
                      {portal.engagement.engagementTier.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Hot Alert Callout */}
                {portal.engagement.brokerAlertMessage && (
                  <div className="p-3 rounded-xl bg-[#1b202c] border border-[#b59658]/40 text-xs text-[#ccb67b] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#b59658] shrink-0" />
                    <strong>{portal.engagement.brokerAlertMessage}</strong>
                  </div>
                )}

                {/* Telemetry Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Portal Views</span>
                    <strong className="text-white text-sm font-mono">{portal.totalViews} Views</strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Total Dwell Time</span>
                    <strong className="text-slate-200 text-sm font-mono">
                      {portal.engagement.dwellTimeSeconds}s
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Photo Swipes</span>
                    <strong className="text-slate-200 text-sm font-mono">
                      {portal.engagement.photoSwipes} Swipes
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Brochure Clicks</span>
                    <strong className="text-slate-200 text-sm font-mono">
                      {portal.engagement.brochureDownloads} Downloads
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Site Visit Clicks</span>
                    <strong className="text-[#ccb67b] text-sm font-mono font-bold">
                      {portal.engagement.visitBookingsRequested} Requests
                    </strong>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyLink(portal.token)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 flex items-center gap-1.5"
                    >
                      {copiedToken === portal.token ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#ccb67b]" />
                          Copied Link!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          Copy Link
                        </>
                      )}
                    </button>

                    <a
                      href={portalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Live Portal
                    </a>
                  </div>

                  <a
                    href={waChatUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] hover:opacity-95 text-[#12151f] font-extrabold shadow-md shadow-[#b59658]/20 flex items-center gap-1.5 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Context WhatsApp Follow-Up
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
