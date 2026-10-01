'use client';

import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  PhoneCall, 
  ShieldCheck, 
  AlertCircle, 
  Play, 
  Headphones, 
  ExternalLink,
  RefreshCw,
  Clock,
  CheckCircle2,
  Sliders,
  Send,
  MessageSquare,
  Calendar,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Volume2
} from 'lucide-react';
import { OFFICIAL_BROKER_NUMBERS } from '@/lib/constants/broker-constants';
import { toast } from '@/lib/client/toast';
import { formatDateTime } from '@/lib/date-utils';

export function CompanionSetupClient() {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [selectedOem, setSelectedOem] = useState<'SAMSUNG' | 'XIAOMI' | 'REALME'>('SAMSUNG');
  
  // Simulator state
  const [simNumber, setSimNumber] = useState('+919820566778');
  const [simName, setSimName] = useState('Rahul Sharma');
  const [simDirection, setSimDirection] = useState<'INCOMING' | 'OUTGOING' | 'MISSED'>('OUTGOING');
  const [simDuration, setSimDuration] = useState(145);
  const [simNotes, setSimNotes] = useState('Inquired about ready 2 BHK in Kharghar Sector 35. Budget 75L-80L. Requested brochure and floor plans.');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  // Recent synced calls
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // WhatsApp daily digest state
  const [digestPreview, setDigestPreview] = useState<string>('');
  const [loadingDigest, setLoadingDigest] = useState(false);
  const [sendingDigest, setSendingDigest] = useState(false);

  const serverUrl = typeof window !== 'undefined' ? window.location.origin : 'https://lucky-crm.vercel.app';

  const fetchRecentCalls = async () => {
    setLoadingRecent(true);
    try {
      // Query recent phone communications across the org
      const res = await fetch('/api/v1/analytics/rep-performance?timeRange=week');
      if (res.ok) {
        const data = await res.json();
        if (data.recentCalls) {
          setRecentCalls(data.recentCalls);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingRecent(false);
    }
  };

  const fetchDigestPreview = async () => {
    setLoadingDigest(true);
    try {
      const res = await fetch('/api/v1/cron/daily-call-digest');
      if (res.ok) {
        const data = await res.json();
        if (data.digestText) {
          setDigestPreview(data.digestText);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingDigest(false);
    }
  };

  useEffect(() => {
    fetchRecentCalls();
    fetchDigestPreview();
  }, []);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(serverUrl);
    setCopiedUrl(true);
    toast.success('Copied Server URL to clipboard');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSendDigest = async () => {
    setSendingDigest(true);
    try {
      const res = await fetch('/api/v1/cron/daily-call-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch WhatsApp digest');
      }
      toast.success('WhatsApp Daily Digest Dispatched!', {
        description: `Sent to: ${data.recipients?.join(', ') || 'Official Managers'}`
      });
      fetchDigestPreview();
    } catch (err: any) {
      toast.error('Dispatch Failed', { description: err.message });
    } finally {
      setSendingDigest(false);
    }
  };

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    setSimulationResult(null);

    try {
      const res = await fetch('/api/v1/mobile/call-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerNumber: simNumber,
          callerName: simName,
          direction: simDirection,
          durationSeconds: simDirection === 'MISSED' ? 0 : simDuration,
          notes: simNotes,
          clientCallId: `sim_${Date.now()}`,
          contactedBrokerNumber: OFFICIAL_BROKER_NUMBERS.SAFWAN.e164,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Simulation failed');
      }

      setSimulationResult(data.data);
      toast.success('Call Event Simulated & Analyzed by Gemini Flash!');
      fetchRecentCalls();
      fetchDigestPreview();
    } catch (err: any) {
      toast.error('Simulation Failed', { description: err.message });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="p-6 bg-surface border border-border rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-accent-soft text-accent border border-accent/20">
                <Smartphone className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-content tracking-tight">
                Android Companion &amp; Physical SIM Sync
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-[11px] font-bold">
                Runo-Parity Engine
              </span>
            </div>
            <p className="text-xs text-content-muted max-w-2xl leading-relaxed">
              Auto-log every physical SIM call on your broker&apos;s Samsung, Xiaomi, or Realme phone. The companion service reads OEM audio recordings, runs Gemini Flash AI summaries, and syncs directly to the lead timeline.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Download APK (v1.0.0)
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Connection Details & Phone OEM Guide */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quick Setup Card */}
          <div className="p-5 bg-surface border border-border rounded-2xl shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-content flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent" />
              Broker App Connection Details
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-content-muted block mb-1">CRM Server URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={serverUrl}
                    className="w-full px-3.5 py-2 bg-surface-inset border border-border rounded-xl text-xs font-mono text-content"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="p-2.5 rounded-xl border border-border bg-surface-subtle hover:bg-surface-raised text-content transition-colors cursor-pointer"
                    title="Copy Server URL"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-content-muted block mb-1">Webhook Endpoint</label>
                <p className="px-3.5 py-2 bg-surface-inset border border-border rounded-xl text-xs font-mono text-content-muted">
                  {serverUrl}/api/v1/mobile/call-events
                </p>
              </div>

              <div className="p-3 bg-surface-inset rounded-xl border border-border text-xs space-y-1.5">
                <p className="font-semibold text-content">Active Official Broker SIM Lines:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 bg-surface rounded-lg border border-border">
                    <span className="text-content-muted block">Safwan Diwan (Kharghar)</span>
                    <span className="text-accent font-bold">{OFFICIAL_BROKER_NUMBERS.SAFWAN.e164}</span>
                  </div>
                  <div className="p-2 bg-surface rounded-lg border border-border">
                    <span className="text-content-muted block">Suhel Patel (Taloja)</span>
                    <span className="text-accent font-bold">{OFFICIAL_BROKER_NUMBERS.SUHEL.e164}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* OEM Call Recording Setup Guide */}
          <div className="p-5 bg-surface border border-border rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-content flex items-center gap-2">
                <Sliders className="w-4 h-4 text-accent" />
                OEM Phone Recording Setup (1-Time Step)
              </h2>
              <div className="flex rounded-lg border border-border p-0.5 bg-surface-subtle text-xs">
                {(['SAMSUNG', 'XIAOMI', 'REALME'] as const).map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => setSelectedOem(brand)}
                    className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all ${
                      selectedOem === brand
                        ? 'bg-accent text-white shadow-xs'
                        : 'text-content-muted hover:text-content'
                    }`}
                  >
                    {brand === 'SAMSUNG' ? 'Samsung Galaxy' : brand === 'XIAOMI' ? 'Xiaomi / Redmi' : 'Realme / Vivo'}
                  </button>
                ))}
              </div>
            </div>

            {selectedOem === 'SAMSUNG' && (
              <div className="p-4 bg-surface-inset rounded-xl border border-border space-y-2.5 text-xs text-content-secondary">
                <p className="font-bold text-content flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Samsung Galaxy (OneUI Dialer Native Recorder):
                </p>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
                  <li>Open default Samsung <strong>Phone</strong> app &rarr; Tap the <strong>3 vertical dots</strong> (top right) &rarr; <strong>Settings</strong>.</li>
                  <li>Tap <strong>Record calls</strong> &rarr; Toggle <strong>Auto record calls</strong> to <span className="text-emerald-600 font-bold">ON</span> (choose &quot;All numbers&quot;).</li>
                  <li>Recordings are automatically stored in <code className="bg-surface px-1 py-0.5 rounded font-mono text-accent">/Recordings/Call recordings/</code>.</li>
                  <li>Open Lucky Companion &rarr; Disable Battery Optimization so Samsung does not pause sync.</li>
                </ol>
              </div>
            )}

            {selectedOem === 'XIAOMI' && (
              <div className="p-4 bg-surface-inset rounded-xl border border-border space-y-2.5 text-xs text-content-secondary">
                <p className="font-bold text-content flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Xiaomi / Redmi / POCO (MIUI &amp; HyperOS):
                </p>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
                  <li>Open default <strong>Dialer</strong> &rarr; Settings &rarr; <strong>Call recording</strong>.</li>
                  <li>Turn on <strong>Record calls automatically</strong>.</li>
                  <li>Recordings are saved to <code className="bg-surface px-1 py-0.5 rounded font-mono text-accent">/MIUI/sound_recorder/call_rec/</code>.</li>
                  <li>Go to <strong>Settings &rarr; Apps &rarr; Lucky Companion &rarr; Battery saver</strong> &rarr; Select <strong>No restrictions</strong>.</li>
                </ol>
              </div>
            )}

            {selectedOem === 'REALME' && (
              <div className="p-4 bg-surface-inset rounded-xl border border-border space-y-2.5 text-xs text-content-secondary">
                <p className="font-bold text-content flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Realme / OPPO / Vivo (ColorOS &amp; FuntouchOS):
                </p>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
                  <li>Open Dialer settings &rarr; Call Recording &rarr; Select <strong>Auto Record All Calls</strong>.</li>
                  <li>In Phone Manager / Security app, enable <strong>Auto-start</strong> for Lucky Companion.</li>
                  <li>Lock the Lucky app in the Recent Apps overview so memory cleaners do not clear it.</li>
                </ol>
              </div>
            )}
          </div>

          {/* WhatsApp Daily Executive Digest Card */}
          <div className="p-5 bg-surface border border-emerald-500/25 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-content">WhatsApp Daily Call Digest</h2>
                  <p className="text-[11px] text-content-muted">Automated 8:00 PM IST summary sent to managing brokers</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold">
                Vercel Cron Active
              </span>
            </div>

            <div className="p-3 bg-surface-inset rounded-xl border border-border text-xs space-y-2">
              <div className="flex items-center justify-between text-content-muted text-[11px]">
                <span>Registered Manager Lines:</span>
                <span className="font-mono text-content font-semibold">
                  Safwan ({OFFICIAL_BROKER_NUMBERS.SAFWAN.cleanDigits}), Suhel ({OFFICIAL_BROKER_NUMBERS.SUHEL.cleanDigits})
                </span>
              </div>

              {digestPreview ? (
                <div className="p-3 bg-[#eef7f0] dark:bg-[#062013] border border-emerald-500/20 rounded-lg font-mono text-[11px] text-content whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {digestPreview}
                </div>
              ) : (
                <div className="p-3 bg-surface text-center text-content-muted text-xs">
                  {loadingDigest ? 'Loading today\'s digest preview...' : 'No calls recorded yet today.'}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSendDigest}
                disabled={sendingDigest}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {sendingDigest ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending WhatsApp Message...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send WhatsApp Digest Now</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={fetchDigestPreview}
                disabled={loadingDigest}
                title="Refresh preview"
                className="p-2 rounded-xl border border-border bg-surface hover:bg-surface-subtle text-content transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingDigest ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Call Simulator & Recent Feed */}
        <div className="lg:col-span-5 space-y-6">
          {/* Simulator Box */}
          <div className="p-5 bg-surface border border-accent/25 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-content flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                Live SIM Call &amp; AI Simulator
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-soft text-accent border border-accent/20">
                Gemini Flash Live
              </span>
            </div>
            <p className="text-xs text-content-muted">
              Test how an incoming or outgoing physical SIM call is processed, categorized, and summarized by AI in real time.
            </p>

            <form onSubmit={handleRunSimulation} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-content block mb-1">Lead Phone</label>
                  <input
                    type="text"
                    required
                    value={simNumber}
                    onChange={(e) => setSimNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-inset border border-border rounded-xl font-mono text-content text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-content block mb-1">Lead Name</label>
                  <input
                    type="text"
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-inset border border-border rounded-xl text-content text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-content block mb-1">Call Direction</label>
                  <select
                    value={simDirection}
                    onChange={(e: any) => setSimDirection(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-inset border border-border rounded-xl text-content text-xs"
                  >
                    <option value="OUTGOING">Outgoing Call</option>
                    <option value="INCOMING">Incoming Call</option>
                    <option value="MISSED">Missed Call</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-content block mb-1">Duration (Seconds)</label>
                  <input
                    type="number"
                    min="0"
                    value={simDuration}
                    onChange={(e) => setSimDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-surface-inset border border-border rounded-xl font-mono text-content text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-content block mb-1">Call Conversation / Notes</label>
                <textarea
                  rows={3}
                  value={simNotes}
                  onChange={(e) => setSimNotes(e.target.value)}
                  placeholder="Enter sample dialogue or call notes..."
                  className="w-full px-3 py-2 bg-surface-inset border border-border rounded-xl text-content text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isSimulating}
                className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing with Gemini Flash...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Simulate Physical SIM Event</span>
                  </>
                )}
              </button>
            </form>

            {/* Simulation Result Box */}
            {simulationResult && (
              <div className="p-3.5 bg-accent-soft/30 border border-accent/30 rounded-xl space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-accent">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Extraction Result
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    {simulationResult.callOutcome || 'INTERESTED'}
                  </span>
                </div>

                {simulationResult.aiSummary && (
                  <p className="text-xs text-content leading-relaxed font-sans">
                    <strong>Summary:</strong> {simulationResult.aiSummary}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1 text-[11px] text-content-muted">
                  <span>Sentiment: <strong>{simulationResult.aiSentiment || 'POSITIVE'}</strong></span>
                  <span>•</span>
                  <span>Lead Created / Updated in CRM ✓</span>
                </div>
              </div>
            )}
          </div>

          {/* Real-time Synced Calls Feed */}
          <div className="p-5 bg-surface border border-border rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-bold text-content">Live Synced SIM Calls</h2>
              </div>
              <button
                type="button"
                onClick={fetchRecentCalls}
                disabled={loadingRecent}
                className="text-[11px] text-accent hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loadingRecent ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {recentCalls.map((call) => {
                const isMissed = call.direction === 'MISSED' || call.durationSeconds === 0;
                const isOut = call.direction === 'OUTBOUND' || call.direction === 'OUTGOING';

                return (
                  <div
                    key={call.id}
                    className="p-3 bg-surface-inset border border-border rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold text-content">
                          {isMissed ? (
                            <PhoneMissed className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          ) : isOut ? (
                            <PhoneOutgoing className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          ) : (
                            <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                          <span>{call.leadName}</span>
                        </div>
                        <p className="text-[11px] text-content-muted font-mono">{call.leadPhone}</p>
                      </div>

                      <div className="text-right space-y-0.5 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          call.callOutcome === 'INTERESTED' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                          call.callOutcome === 'CALLBACK_REQUESTED' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                          'bg-surface text-content-muted border border-border'
                        }`}>
                          {call.callOutcome || (isMissed ? 'MISSED' : 'CONNECTED')}
                        </span>
                        <p className="text-[10px] text-content-muted">{call.durationSeconds}s</p>
                      </div>
                    </div>

                    {call.aiSummary && (
                      <p className="text-[11px] text-content-secondary line-clamp-2 italic bg-surface p-2 rounded-lg border border-border/50">
                        &quot;{call.aiSummary}&quot;
                      </p>
                    )}

                    {call.callRecordingUrl && (
                      <div className="pt-1">
                        <audio
                          controls
                          src={call.callRecordingUrl}
                          className="w-full h-7 rounded"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-content-muted pt-1 border-t border-border/40">
                      <span>Advisor: <strong>{call.repName}</strong></span>
                      <span>{formatDateTime(call.createdAt)}</span>
                    </div>
                  </div>
                );
              })}

              {recentCalls.length === 0 && (
                <div className="py-8 text-center text-xs text-content-muted">
                  No physical SIM calls synced yet this week.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
