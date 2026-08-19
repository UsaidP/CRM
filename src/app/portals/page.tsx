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
  AlertCircle,
  MessageSquare,
  Activity,
  Globe
} from 'lucide-react';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { buildPublicPortalUrl } from '@/lib/navigation';

export default function ClientPortalsConsolePage() {
  const [portals, setPortals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState('ALL');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectedPortal, setInspectedPortal] = useState<any | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const fetchPortals = async () => {
    setLoading(true);
    setRequestError(null);
    try {
      const res = await fetch('/api/v1/portals');
      const data = await res.json();
      if (res.ok && data.success) {
        setPortals(data.data);
      } else {
        throw new Error(data.error || 'Client portals could not be loaded.');
      }
    } catch (err: any) {
      setRequestError(err.message || 'Client portals could not be loaded. Check your connection, then try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortals();
  }, []);

  const handleCopyLink = async (token: string) => {
    const url = buildPublicPortalUrl(window.location.origin, token);
    try {
      await navigator.clipboard.writeText(url);
      setCopyError(null);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      setCopiedToken(null);
      setCopyError('The portal link could not be copied. Open the portal and copy its address from the browser.');
    }
  };

  const filteredPortals = portals.filter((p) => {
    if (selectedTier !== 'ALL' && p.engagement.engagementTier !== selectedTier) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchLead = (p.lead?.fullName || '').toLowerCase().includes(q);
      const matchPhone = (p.lead?.phoneE164 || '').includes(q);
      const matchToken = (p.token || '').toLowerCase().includes(q);
      if (!matchLead && !matchPhone && !matchToken) return false;
    }
    return true;
  });

  const hotCount = portals.filter((p) => p.engagement?.engagementTier === 'HOT_PROSPECT').length;
  const warmCount = portals.filter((p) => p.engagement?.engagementTier === 'WARM_INTEREST').length;
  const totalViews = portals.reduce((acc, p) => acc + (p.totalViews || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#b59658]/20">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1b202c] text-amber-300 border border-amber-500/40 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" /> REAL-TIME DWELL TELEMETRY
            </span>
            <HallmarkStamp type="rera" label="Private Client Sessions" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-display">
            Client Portals &amp; Live Telemetry
          </h1>
          <p className="text-slate-400 text-xs mt-0.5 font-mono">
            Track real-time dwell time on floor plans, photo gallery swipes, and automatic HOT PROSPECT alerts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchPortals}
            disabled={loading}
            aria-label="Refresh client portal telemetry"
            className="min-h-11 min-w-11 px-3 py-2 rounded-lg bg-[#12151f] hover:bg-[#1b202c] text-slate-300 border border-[#b59658]/20 text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Overview Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#1b202c]/90 border border-amber-500/40 shadow-sm">
          <div className="text-[10px] font-mono uppercase text-amber-300 font-bold flex justify-between items-center">
            <span>Hot Prospects</span>
            <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300 mt-1">{hotCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">&gt;60s floorplan dwell time</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#1b202c]/90 border border-blue-500/30 shadow-sm">
          <div className="text-[10px] font-mono uppercase text-blue-300 font-bold flex justify-between items-center">
            <span>Warm Interest</span>
            <Zap className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-300 mt-1">{warmCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Active photo viewing</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-sm">
          <div className="text-[10px] font-mono uppercase text-slate-300 font-bold flex justify-between items-center">
            <span>Total Portal Views</span>
            <Eye className="w-3.5 h-3.5 text-[#ccb67b]" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{totalViews}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Across {portals.length} portals</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#1b202c]/90 border border-emerald-500/30 shadow-sm">
          <div className="text-[10px] font-mono uppercase text-emerald-300 font-bold flex justify-between items-center">
            <span>Active Portals</span>
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300 mt-1">{portals.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Tokenized portfolios</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 rounded-xl bg-[#1b202c]/90 border border-[#b59658]/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
        <div className="relative flex-1 w-full">
          <label htmlFor="portal-search" className="sr-only">Search client portals</label>
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="portal-search"
            name="portalSearch"
            type="text"
            placeholder="Search by buyer name, phone, or token…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#12151f] border border-[#b59658]/20 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ccb67b]"
          />
        </div>

        <fieldset className="flex min-w-0 max-w-full items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <legend className="sr-only">Filter portals by engagement tier</legend>
          {[
            { id: 'ALL', label: 'All Tiers' },
            { id: 'HOT_PROSPECT', label: '🔥 Hot Prospect' },
            { id: 'WARM_INTEREST', label: '⚡ Warm Interest' },
            { id: 'CASUAL_VIEWER', label: 'Casual' },
          ].map((tier) => (
            <button
              type="button"
              key={tier.id}
              onClick={() => setSelectedTier(tier.id)}
              aria-pressed={selectedTier === tier.id}
              className={`min-h-11 px-2.5 py-1.5 rounded text-[11px] whitespace-nowrap ${
                selectedTier === tier.id
                  ? 'bg-gradient-to-r from-[#8a6f3c] to-[#ccb67b] text-[#12151f] font-bold shadow-sm'
                  : 'bg-[#12151f] text-slate-400 hover:text-white border border-[#b59658]/20'
              }`}
            >
              {tier.label}
            </button>
          ))}
        </fieldset>
      </div>

      <div aria-live="polite" className="space-y-2">
        {requestError && (
          <div role="alert" className="rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-200">
            <p>{requestError}</p>
            <button type="button" onClick={fetchPortals} className="mt-1 min-h-11 font-bold text-white underline underline-offset-2">
              Retry client portals
            </button>
          </div>
        )}
        {copyError && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-200">{copyError}</p>}
        {copiedToken && <p className="text-xs text-emerald-300">Portal link copied.</p>}
      </div>

      {/* High-Density Portals & Telemetry Table */}
      <div className="rounded-xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#12151f]/90 text-slate-400 uppercase text-[10px] border-b border-[#b59658]/20">
              <tr>
                <th className="p-3 pl-4">Client Profile</th>
                <th className="p-3">Portal Token</th>
                <th className="p-3">Units Curated</th>
                <th className="p-3 text-center">Engagement Tier</th>
                <th className="p-3 text-center">Views &amp; Dwell</th>
                <th className="p-3">Last Telemetry Event</th>
                <th className="p-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#b59658]/10 text-slate-300">
              {filteredPortals.map((portal) => {
                const isHot = portal.engagement?.engagementTier === 'HOT_PROSPECT';
                const isWarm = portal.engagement?.engagementTier === 'WARM_INTEREST';
                const unitCount = portal.portalUnits?.length || 0;
                const logs = portal.telemetryLogs || [];
                const lastLog = logs[logs.length - 1];

                return (
                  <tr key={portal.id} className={`hover:bg-[#12151f]/70 transition-colors ${isHot ? 'bg-amber-950/20' : ''}`}>
                    <td className="p-3 pl-4">
                      <div className="font-bold text-white font-sans text-sm">{portal.lead?.fullName || 'Prospective Buyer'}</div>
                      <div className="text-[11px] text-[#ccb67b]">{portal.lead?.phoneE164}</div>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-slate-300 text-xs">{portal.token}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(portal.token)}
                          aria-label={`Copy portal link for ${portal.lead?.fullName || 'prospective buyer'}`}
                          className="min-h-11 min-w-11 grid place-items-center rounded hover:bg-[#2a3040] text-slate-400 hover:text-white"
                        >
                          {copiedToken === portal.token ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="p-3">
                      <span className="font-bold text-white">{unitCount} Units</span>
                      <span className="text-[10px] text-slate-400 block">Curated basket</span>
                    </td>

                    <td className="p-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        isHot
                          ? 'bg-amber-950/70 text-amber-300 border border-amber-500/40 animate-pulse'
                          : isWarm
                          ? 'bg-blue-950/70 text-blue-300 border border-blue-500/40'
                          : 'bg-[#12151f] text-slate-400 border border-slate-700'
                      }`}>
                        {portal.engagement?.engagementTier.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <div className="font-bold text-white">{portal.totalViews || 0} Views</div>
                      <div className="text-[10px] text-slate-400">{portal.engagement?.totalDwellSeconds || 0}s dwell</div>
                    </td>

                    <td className="p-3 text-xs">
                      {lastLog ? (
                        <div>
                          <span className="text-emerald-400 font-semibold">{lastLog.eventType}</span>
                          <span className="text-[10px] text-slate-500 block">
                            {new Date(lastLog.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500">No events yet</span>
                      )}
                    </td>

                    <td className="p-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectedPortal(portal)}
                          className="min-h-11 px-2.5 py-1 rounded bg-[#12151f] hover:bg-[#2a3040] text-[#ccb67b] border border-[#b59658]/30 text-[11px] font-semibold flex items-center gap-1 shadow-sm"
                        >
                          <Activity className="w-3 h-3" /> Logs
                        </button>
                        <a
                          href={`https://wa.me/${(portal.lead?.phoneE164 || '').replace(/\+/g, '')}?text=${encodeURIComponent(`Hi ${portal.lead?.fullName || 'Client'}, I noticed you were exploring your property selection on ZamZam Properties. Would you like to schedule an escorted sample flat visit this weekend?`)}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Follow up with ${portal.lead?.fullName || 'prospective buyer'} on WhatsApp`}
                          className="min-h-11 min-w-11 grid place-items-center rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {loading && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    Loading client portals…
                  </td>
                </tr>
              )}

              {!loading && !requestError && filteredPortals.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    No client portals found matching current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Granular Telemetry Log Inspector */}
      <AccessibleDialog
        open={Boolean(inspectedPortal)}
        onClose={() => setInspectedPortal(null)}
        titleId="portal-telemetry-title"
        descriptionId="portal-telemetry-description"
        panelClassName="max-w-lg bg-[#1b202c] border border-[#b59658]/40 rounded-2xl p-6 space-y-4 shadow-2xl font-mono text-xs"
      >
        {inspectedPortal && (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-[#b59658]/20">
              <div>
                <h2 id="portal-telemetry-title" className="font-bold text-white text-base font-display flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#b59658]" />
                  Portal telemetry: {inspectedPortal.lead?.fullName || 'Prospective buyer'}
                </h2>
                <p id="portal-telemetry-description" className="mt-1 text-[11px] text-slate-400">Review engagement events recorded for this portal token.</p>
              </div>
              <button type="button" data-dialog-close aria-label="Close portal telemetry" onClick={() => setInspectedPortal(null)} className="min-h-11 min-w-11 text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-2">
              <div className="text-slate-400 text-[11px] uppercase tracking-wider font-bold">
                Logged Event Stream ({inspectedPortal.telemetryLogs?.length || 0} events):
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto p-2 rounded-lg bg-[#12151f] border border-[#b59658]/20">
                {(inspectedPortal.telemetryLogs || []).map((log: any, idx: number) => (
                  <div key={idx} className="p-2 rounded bg-[#1b202c] flex justify-between items-center text-xs">
                    <div>
                      <strong className="text-emerald-400">{log.eventType}</strong>
                      {log.targetUnitId && <span className="text-[10px] text-slate-400 block">Target Unit: {log.targetUnitId}</span>}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))}
                {(inspectedPortal.telemetryLogs || []).length === 0 && (
                  <div className="p-4 text-center text-slate-500 text-xs">
                    No granular telemetry events logged yet for this token.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                data-dialog-autofocus
                onClick={() => setInspectedPortal(null)}
                className="min-h-11 px-4 py-1.5 rounded-lg bg-[#12151f] hover:bg-[#2a3040] text-slate-200 border border-[#b59658]/30"
              >
                Close Inspector
              </button>
            </div>
          </>
        )}
      </AccessibleDialog>
    </div>
  );
}
