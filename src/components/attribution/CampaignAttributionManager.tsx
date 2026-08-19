'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  PhoneCall,
  MessageSquare,
  QrCode,
  Copy,
  Check,
  Plus,
  ExternalLink,
  ShieldCheck,
  Building2,
  TrendingUp,
  UserCheck,
  RefreshCw,
  X,
  Layers,
} from 'lucide-react';
import { YoutubeIcon, InstagramIcon } from '@/components/icons/SocialIcons';
import { OFFICIAL_BROKER_NUMBERS } from '@/lib/domain/broker-resolver';

export function CampaignAttributionManager({ initialCampaigns = [] }: { initialCampaigns?: any[] }) {
  const [campaigns, setCampaigns] = useState<any[]>(initialCampaigns);
  const [loading, setLoading] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [selectedQrCampaign, setSelectedQrCampaign] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formChannel, setFormChannel] = useState('YOUTUBE_SHORT');
  const [formCode, setFormCode] = useState('');
  const [formBroker, setFormBroker] = useState<string>(OFFICIAL_BROKER_NUMBERS.SAFWAN.e164);
  const [formText, setFormText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/attribution/campaigns');
      const data = await res.json();
      if (data.success) {
        setCampaigns(data.data);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCopyLink = (url: string, slug: string) => {
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/attribution/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: formName,
          channelType: formChannel,
          sourceCode: formCode.trim().toUpperCase(),
          waPrefilledText: formText || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setFormName('');
        setFormCode('');
        setFormText('');
        fetchCampaigns();
      }
    } catch (err) {
      console.error('Error creating campaign:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getChannelIcon = (type: string) => {
    if (type.includes('YOUTUBE')) return <YoutubeIcon className="w-4 h-4 text-red-500" />;
    if (type.includes('INSTAGRAM')) return <InstagramIcon className="w-4 h-4 text-pink-500" />;
    if (type.includes('WHATSAPP')) return <MessageSquare className="w-4 h-4 text-emerald-400" />;
    return <PhoneCall className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-zinc-100 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#0d1017] via-[#121622] to-[#0d1017] border border-amber-500/30 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            Campaign Attribution & Deep Link Engine
            <span className="text-xs uppercase font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
              MahaRERA Ready
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Generate prefilled WhatsApp deep links, QR codes, and traceable source codes (e.g. TALOJA21, MARVEL35, CROWN12)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-semibold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Campaign Code</span>
          </button>
          <button
            onClick={fetchCampaigns}
            className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 text-zinc-300 rounded-xl transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid of Campaign Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campaigns.map((camp) => (
          <div
            key={camp.id}
            className="p-5 rounded-2xl bg-[#0c0e16] border border-zinc-800 hover:border-amber-500/40 transition-all shadow-xl flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              {/* Header Info */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                    {getChannelIcon(camp.channelType)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm line-clamp-1">{camp.campaignName}</h3>
                    <p className="text-[11px] text-zinc-400">{camp.channelType}</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-amber-400 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
                  {camp.sourceCode}
                </span>
              </div>

              {/* Broker & Stats */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/80 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase">Assigned Broker</span>
                  <p className="font-semibold text-zinc-200 mt-0.5">{camp.assignedBroker?.fullName || 'Safwan Diwan'}</p>
                  <p className="text-[10px] font-mono text-zinc-400">{camp.brokerPhone}</p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase">Clicks Tracked</span>
                  <p className="font-bold text-white mt-0.5">{camp.totalClicks || 0}</p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase">Leads Generated</span>
                  <p className="font-bold text-emerald-400 mt-0.5">{camp.totalLeadsGenerated || camp.leads?.length || 0}</p>
                </div>
              </div>

              {/* Prefilled Prompt */}
              <div className="p-3 bg-zinc-950/70 rounded-xl border border-zinc-800/80 text-xs space-y-1">
                <span className="text-[10px] uppercase font-semibold text-amber-400/90">WhatsApp Prefilled Text:</span>
                <p className="text-zinc-300 italic text-[11px] line-clamp-2">"{camp.prefilledText || camp.waPrefilledText}"</p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex items-center gap-2 border-t border-zinc-800/80">
              <button
                onClick={() => handleCopyLink(camp.deepLinkUrl, camp.customSlug)}
                className="flex-1 py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-semibold text-xs rounded-xl border border-zinc-700 flex items-center justify-center gap-1.5 transition-all"
              >
                {copiedSlug === camp.customSlug ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Copy wa.me Link</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setSelectedQrCampaign(camp)}
                className="py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition-all"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Show QR Code</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* QR Code Modal */}
      {selectedQrCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0e1017] border border-amber-500/30 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                {selectedQrCampaign.sourceCode}
              </span>
              <button onClick={() => setSelectedQrCampaign(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="font-bold text-white text-sm">{selectedQrCampaign.campaignName}</h3>

            <div
              className="flex justify-center p-3 bg-white rounded-xl shadow-lg border border-amber-500/30 mx-auto w-fit"
              dangerouslySetInnerHTML={{ __html: selectedQrCampaign.svgQrCode }}
            />

            <p className="text-xs text-zinc-400">
              Scan with camera or WhatsApp scanner to open prefilled chat targeting {selectedQrCampaign.brokerPhone}.
            </p>

            <button
              onClick={() => setSelectedQrCampaign(null)}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0e1017] border border-amber-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white text-base">Create Campaign Attribution Code</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Campaign Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. YouTube Short: Sai Marvel Kharghar 35 2BHK"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Channel Platform</label>
                  <select
                    value={formChannel}
                    onChange={(e) => setFormChannel(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/60"
                  >
                    <option value="YOUTUBE_SHORT">YouTube Short</option>
                    <option value="YOUTUBE_VIDEO">YouTube Video</option>
                    <option value="INSTAGRAM_REEL">Instagram Reel</option>
                    <option value="WHATSAPP_DIRECT">WhatsApp Direct</option>
                    <option value="DIRECT_CALL">Direct Phone Call</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Source Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TALOJA21"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Assigned Broker Line</label>
                <select
                  value={formBroker}
                  onChange={(e) => setFormBroker(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/60"
                >
                  <option value={OFFICIAL_BROKER_NUMBERS.SAFWAN.e164}>
                    Safwan Diwan ({OFFICIAL_BROKER_NUMBERS.SAFWAN.e164})
                  </option>
                  <option value={OFFICIAL_BROKER_NUMBERS.SUHEL.e164}>
                    Suhel Patel ({OFFICIAL_BROKER_NUMBERS.SUHEL.e164})
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Custom WhatsApp Prefilled Text</label>
                <textarea
                  rows={2}
                  placeholder="Hi ZamZam, saw your video for Sai Marvel 2BHK. Code: MARVEL35..."
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 font-semibold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Save Campaign Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
