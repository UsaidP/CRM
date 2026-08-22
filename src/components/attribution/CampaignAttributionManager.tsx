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
import { OFFICIAL_BROKER_NUMBERS } from '@/lib/constants/broker-constants';

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
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-content font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-surface border border-border shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-content flex items-center gap-2.5">
            Campaign Attribution &amp; Deep Link Engine
            <span className="text-xs uppercase font-mono font-bold px-2.5 py-0.5 rounded-full bg-accent-soft text-accent-text border border-accent/20">
              MahaRERA Ready
            </span>
          </h1>
          <p className="text-xs text-content-secondary mt-1">
            Generate prefilled WhatsApp deep links, QR codes, and traceable source codes (e.g. TALOJA21, MARVEL35, CROWN12)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Campaign Code</span>
          </button>
          <button
            onClick={fetchCampaigns}
            className="p-2.5 bg-surface hover:bg-surface-subtle border border-border text-content-secondary hover:text-content rounded-xl transition-all shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid of Campaign Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campaigns.map((camp) => (
          <div
            key={camp.id}
            className="p-5 rounded-2xl bg-surface border border-border hover:border-accent/40 transition-all shadow-xs flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              {/* Header Info */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-surface-subtle border border-border">
                    {getChannelIcon(camp.channelType)}
                  </div>
                  <div>
                    <h3 className="font-bold text-content text-sm line-clamp-1">{camp.campaignName}</h3>
                    <p className="text-[11px] text-content-muted">{camp.channelType}</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-accent-text px-2.5 py-1 rounded-lg bg-accent-soft border border-accent/20 text-xs">
                  {camp.sourceCode}
                </span>
              </div>

              {/* Broker & Stats */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-surface-inset rounded-xl border border-border text-xs">
                <div>
                  <span className="text-[10px] text-content-muted uppercase font-semibold">Assigned Broker</span>
                  <p className="font-semibold text-content mt-0.5">{camp.assignedBroker?.fullName || 'Safwan Diwan'}</p>
                  <p className="text-[10px] font-mono text-content-muted">{camp.brokerPhone}</p>
                </div>
                <div>
                  <span className="text-[10px] text-content-muted uppercase font-semibold">Clicks Tracked</span>
                  <p className="font-bold text-content mt-0.5">{camp.totalClicks || 0}</p>
                </div>
                <div>
                  <span className="text-[10px] text-content-muted uppercase font-semibold">Leads Generated</span>
                  <p className="font-bold text-status-success mt-0.5">{camp.totalLeadsGenerated || camp.leads?.length || 0}</p>
                </div>
              </div>

              {/* Prefilled Prompt */}
              <div className="p-3 bg-surface-inset rounded-xl border border-border text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-accent-text">WhatsApp Prefilled Text:</span>
                <p className="text-content-secondary italic text-[11px] line-clamp-2">"{camp.prefilledText || camp.waPrefilledText}"</p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex items-center gap-2 border-t border-border">
              <button
                onClick={() => handleCopyLink(camp.deepLinkUrl, camp.customSlug)}
                className="flex-1 py-2 px-3 bg-surface hover:bg-surface-subtle text-content font-semibold text-xs rounded-xl border border-border flex items-center justify-center gap-1.5 transition-all shadow-2xs"
              >
                {copiedSlug === camp.customSlug ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-status-success" />
                    <span className="text-status-success">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-accent" />
                    <span>Copy wa.me Link</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setSelectedQrCampaign(camp)}
                className="py-2 px-3 bg-accent-soft hover:bg-accent-soft/80 text-accent-text font-semibold text-xs rounded-xl border border-accent/20 flex items-center gap-1.5 transition-all shadow-2xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl text-content">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-accent-text bg-accent-soft px-2 py-0.5 rounded border border-accent/20">
                {selectedQrCampaign.sourceCode}
              </span>
              <button onClick={() => setSelectedQrCampaign(null)} className="text-content-muted hover:text-content">
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="font-bold text-content text-sm">{selectedQrCampaign.campaignName}</h3>

            <div
              className="flex justify-center p-3 bg-white rounded-xl shadow-md border border-border mx-auto w-fit"
              dangerouslySetInnerHTML={{ __html: selectedQrCampaign.svgQrCode }}
            />

            <p className="text-xs text-content-muted">
              Scan with camera or WhatsApp scanner to open prefilled chat targeting {selectedQrCampaign.brokerPhone}.
            </p>

            <button
              onClick={() => setSelectedQrCampaign(null)}
              className="w-full py-2.5 bg-surface hover:bg-surface-subtle border border-border text-content rounded-xl text-xs font-semibold transition-colors shadow-2xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-content">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-content text-base">Create Campaign Attribution Code</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-content-muted hover:text-content">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-content mb-1">Campaign Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. YouTube Short: Sai Marvel Kharghar 35 2BHK"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-inset border border-border rounded-xl text-xs text-content focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-content mb-1">Channel Platform</label>
                  <select
                    value={formChannel}
                    onChange={(e) => setFormChannel(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-inset border border-border rounded-xl text-xs text-content focus:outline-none focus:border-accent"
                  >
                    <option value="YOUTUBE_SHORT">YouTube Short</option>
                    <option value="YOUTUBE_VIDEO">YouTube Video</option>
                    <option value="INSTAGRAM_REEL">Instagram Reel</option>
                    <option value="WHATSAPP_DIRECT">WhatsApp Direct</option>
                    <option value="DIRECT_CALL">Direct Phone Call</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-content mb-1">Source Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TALOJA21"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-surface-inset border border-border rounded-xl text-xs text-accent-text font-mono font-bold focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-content mb-1">Assigned Broker Line</label>
                <select
                  value={formBroker}
                  onChange={(e) => setFormBroker(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-inset border border-border rounded-xl text-xs text-content focus:outline-none focus:border-accent"
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
                <label className="block text-xs font-medium text-content mb-1">Custom WhatsApp Prefilled Text</label>
                <textarea
                  rows={2}
                  placeholder="Hi ZamZam, saw your video for Sai Marvel 2BHK. Code: MARVEL35..."
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-inset border border-border rounded-xl text-xs text-content focus:outline-none focus:border-accent"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 text-xs text-content-secondary hover:text-content"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
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
