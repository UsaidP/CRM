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
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-content font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-surface border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-soft text-accent-text border border-accent/20 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-status-warning" /> REAL-TIME DWELL TELEMETRY
            </span>
            <HallmarkStamp type="rera" label="Private Client Sessions" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-content font-display">
            Client Portals &amp; Live Telemetry
          </h1>
          <p className="text-content-secondary text-xs mt-1">
            Track real-time dwell time on floor plans, photo gallery swipes, and automatic HOT PROSPECT alerts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchPortals}
            disabled={loading}
            aria-label="Refresh client portal telemetry"
            className="p-2.5 rounded-xl bg-surface hover:bg-surface-subtle text-content-secondary hover:text-content border border-border text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Overview Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs space-y-1">
          <div className="text-[10px] font-mono uppercase text-status-warning font-bold flex justify-between items-center">
            <span>Hot Prospects</span>
            <Flame className="w-4 h-4 text-status-warning animate-pulse" />
          </div>
          <div className="text-2xl font-bold font-mono text-content mt-1">{hotCount}</div>
          <div className="text-xs text-content-muted">&gt;60s floorplan dwell time</div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs space-y-1">
          <div className="text-[10px] font-mono uppercase text-accent-text font-bold flex justify-between items-center">
            <span>Warm Interest</span>
            <Zap className="w-4 h-4 text-accent" />
          </div>
          <div className="text-2xl font-bold font-mono text-content mt-1">{warmCount}</div>
          <div className="text-xs text-content-muted">Active photo viewing</div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs space-y-1">
          <div className="text-[10px] font-mono uppercase text-content-secondary font-bold flex justify-between items-center">
            <span>Total Portal Views</span>
            <Eye className="w-4 h-4 text-accent" />
          </div>
          <div className="text-2xl font-bold font-mono text-content mt-1">{totalViews}</div>
          <div className="text-xs text-content-muted">Across {portals.length} portals</div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs space-y-1">
          <div className="text-[10px] font-mono uppercase text-status-success font-bold flex justify-between items-center">
            <span>Active Portals</span>
            <Globe className="w-4 h-4 text-status-success" />
          </div>
          <div className="text-2xl font-bold font-mono text-content mt-1">{portals.length}</div>
          <div className="text-xs text-content-muted">Tokenized portfolios</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-sans">
        <div className="relative flex-1 w-full">
          <label htmlFor="portal-search" className="sr-only">Search client portals</label>
          <Search className="w-4 h-4 text-content-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="portal-search"
            name="portalSearch"
            type="text"
            placeholder="Search by buyer name, phone, or token…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-inset border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-content placeholder:text-content-muted focus:outline-none focus:border-accent"
          />
        </div>

        <fieldset className="flex min-w-0 max-w-full items-center gap-2 overflow-x-auto w-full sm:w-auto">
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
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedTier === tier.id
                  ? 'bg-accent text-white font-bold shadow-xs'
                  : 'bg-surface text-content-secondary border border-border hover:bg-surface-subtle hover:text-content'
              }`}
            >
              {tier.label}
            </button>
          ))}
        </fieldset>
      </div>

      <div aria-live="polite" className="space-y-2">
        {requestError && (
          <div role="alert" className="rounded-xl border border-status-danger/40 bg-status-danger-surface p-3.5 text-xs text-status-danger font-semibold shadow-xs">
            <p>{requestError}</p>
            <button type="button" onClick={fetchPortals} className="mt-1 font-bold text-status-danger underline underline-offset-2">
              Retry client portals
            </button>
          </div>
        )}
        {copyError && <p role="alert" className="rounded-xl border border-status-danger/40 bg-status-danger-surface p-3.5 text-xs text-status-danger font-semibold">{copyError}</p>}
        {copiedToken && <p className="text-xs font-semibold text-status-success">Portal link copied to clipboard.</p>}
      </div>

      {/* High-Density Portals & Telemetry Table */}
      <div className="rounded-2xl bg-surface border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-subtle text-content-secondary uppercase text-[10px] font-bold border-b border-border">
              <tr>
                <th className="p-3.5 pl-4">Client Profile</th>
                <th className="p-3.5">Portal Token</th>
                <th className="p-3.5">Units Curated</th>
                <th className="p-3.5 text-center">Engagement Tier</th>
                <th className="p-3.5 text-center">Views &amp; Dwell</th>
                <th className="p-3.5">Last Telemetry Event</th>
                <th className="p-3.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-content-secondary">
              {filteredPortals.map((portal) => {
                const isHot = portal.engagement?.engagementTier === 'HOT_PROSPECT';
                const isWarm = portal.engagement?.engagementTier === 'WARM_INTEREST';
                const unitCount = portal.portalUnits?.length || 0;
                const logs = portal.telemetryLogs || [];
                const lastLog = logs[logs.length - 1];

                return (
                  <tr key={portal.id} className={`hover:bg-surface-subtle/80 transition-colors ${isHot ? 'bg-status-warning-surface/30' : ''}`}>
                    <td className="p-3.5 pl-4">
                      <div className="font-bold text-content font-sans text-sm">{portal.lead?.fullName || 'Prospective Buyer'}</div>
                      <div className="text-[11px] text-accent-text font-mono mt-0.5">{portal.lead?.phoneE164}</div>
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-content text-xs">{portal.token}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(portal.token)}
                          aria-label={`Copy portal link for ${portal.lead?.fullName || 'prospective buyer'}`}
                          className="h-7 w-7 grid place-items-center rounded-lg border border-border bg-surface hover:bg-surface-subtle text-content-secondary hover:text-content transition-all shadow-2xs"
                        >
                          {copiedToken === portal.token ? (
                            <Check className="w-3.5 h-3.5 text-status-success" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span className="font-bold text-content">{unitCount} Units</span>
                      <span className="text-[11px] text-content-muted block">Curated basket</span>
                    </td>

                    <td className="p-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold border font-mono ${
                        isHot
                          ? 'bg-status-warning-surface text-status-warning border-status-warning/40 animate-pulse'
                          : isWarm
                          ? 'bg-accent-soft text-accent-text border-accent/40'
                          : 'bg-surface-subtle text-content-muted border-border'
                      }`}>
                        {portal.engagement?.engagementTier.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="p-3.5 text-center font-mono">
                      <div className="font-bold text-content">{portal.totalViews || 0} Views</div>
                      <div className="text-[11px] text-content-muted">{portal.engagement?.totalDwellSeconds || 0}s dwell</div>
                    </td>

                    <td className="p-3.5 text-xs font-mono">
                      {lastLog ? (
                        <div>
                          <span className="text-status-success font-semibold">{lastLog.eventType}</span>
                          <span className="text-[10px] text-content-muted block">
                            {new Date(lastLog.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-content-muted">No events yet</span>
                      )}
                    </td>

                    <td className="p-3.5 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectedPortal(portal)}
                          className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        >
                          <Activity className="w-3.5 h-3.5 text-accent" /> Logs
                        </button>
                        <a
                          href={`https://wa.me/${(portal.lead?.phoneE164 || '').replace(/\+/g, '')}?text=${encodeURIComponent(`Hi ${portal.lead?.fullName || 'Client'}, I noticed you were exploring your property selection on ZamZam Properties. Would you like to schedule an escorted sample flat visit this weekend?`)}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Follow up with ${portal.lead?.fullName || 'prospective buyer'} on WhatsApp`}
                          className="h-8 w-8 grid place-items-center rounded-xl bg-status-success hover:opacity-90 text-zinc-950 shadow-2xs transition-all cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {loading && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-content-muted text-xs">
                    Loading client portals…
                  </td>
                </tr>
              )}

              {!loading && !requestError && filteredPortals.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-content-muted text-xs">
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
        size="lg"
      >
        {inspectedPortal && (
          <div className="space-y-4 text-content font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 id="portal-telemetry-title" className="font-bold text-content text-base font-display flex items-center gap-2">
                  <Activity className="w-4 h-4 text-accent" />
                  Portal Telemetry: {inspectedPortal.lead?.fullName || 'Prospective buyer'}
                </h2>
                <p id="portal-telemetry-description" className="mt-1 text-xs text-content-secondary">Review engagement events recorded for this portal token.</p>
              </div>
              <button type="button" data-dialog-close aria-label="Close portal telemetry" onClick={() => setInspectedPortal(null)} className="p-1 rounded-lg text-content-muted hover:text-content">✕</button>
            </div>

            <div className="space-y-2">
              <div className="text-content-secondary text-xs uppercase tracking-wider font-bold">
                Logged Event Stream ({inspectedPortal.telemetryLogs?.length || 0} events):
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto p-3 rounded-xl bg-surface-subtle border border-border font-mono text-xs">
                {(inspectedPortal.telemetryLogs || []).map((log: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-surface border border-border flex justify-between items-center text-xs">
                    <div>
                      <strong className="text-status-success">{log.eventType}</strong>
                      {log.targetUnitId && <span className="text-[10px] text-content-muted block">Target Unit: {log.targetUnitId}</span>}
                    </div>
                    <span className="text-[10px] text-content-muted">
                      {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))}
                {(inspectedPortal.telemetryLogs || []).length === 0 && (
                  <div className="p-4 text-center text-content-muted text-xs">
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
                className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-semibold shadow-2xs cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        )}
      </AccessibleDialog>
    </div>
  );
}
