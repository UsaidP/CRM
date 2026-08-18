'use client';

import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  Plus, 
  Copy, 
  Check, 
  ExternalLink, 
  TrendingUp, 
  MessageSquare, 
  Users, 
  PhoneCall, 
  QrCode, 
  Sparkles, 
  RefreshCw, 
  Zap, 
  CheckCircle2 
} from 'lucide-react';
import { YoutubeIcon, InstagramIcon } from '@/components/icons/SocialIcons';

export default function AttributionStudioPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State for creating new campaign
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [channelType, setChannelType] = useState('YOUTUBE_SHORT');
  const [contentId, setContentId] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [targetProjectId, setTargetProjectId] = useState('');
  const [brokerPhone, setBrokerPhone] = useState('+919820123456');
  const [creating, setCreating] = useState(false);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const [campRes, projRes] = await Promise.all([
        fetch('/api/v1/attribution/campaigns'),
        fetch('/api/v1/inventory/projects'),
      ]);
      const campData = await campRes.json();
      const projData = await projRes.json();

      if (campData.success) setCampaigns(campData.data);
      if (projData.success) {
        setProjects(projData.data);
        if (projData.data.length > 0 && !targetProjectId) {
          setTargetProjectId(projData.data[0].id);
        }
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

  const handleCopyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/v1/attribution/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName,
          channelType,
          contentId,
          customSlug: customSlug || campaignName.toLowerCase().replace(/\s+/g, '-'),
          targetProjectId,
          brokerPhone,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setCampaignName('');
        setContentId('');
        setCustomSlug('');
        fetchCampaigns();
      } else {
        alert(data.error || 'Failed to create campaign');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating campaign');
    } finally {
      setCreating(false);
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'YOUTUBE_SHORT':
      case 'YOUTUBE_VIDEO':
        return <YoutubeIcon className="w-4 h-4 text-red-400" />;
      case 'INSTAGRAM_REEL':
      case 'INSTAGRAM_DM':
        return <InstagramIcon className="w-4 h-4 text-pink-400" />;
      case 'FB_GROUP':
        return <Users className="w-4 h-4 text-blue-400" />;
      case 'WHATSAPP_GROUP':
        return <MessageSquare className="w-4 h-4 text-[#ccb67b]" />;
      default:
        return <PhoneCall className="w-4 h-4 text-amber-400" />;
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (selectedChannel !== 'ALL' && c.channelType !== selectedChannel) return false;
    return true;
  });

  const totalClicks = campaigns.reduce((acc, c) => acc + (c.totalClicks || 0), 0);
  const totalLeads = campaigns.reduce((acc, c) => acc + (c.totalLeadsGenerated || c._count?.leads || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#b59658]/20">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1b202c] border border-[#b59658]/40 text-[#ccb67b] text-xs font-semibold mb-2">
            <Share2 className="w-3.5 h-3.5 text-[#b59658]" />
            Organic Attribution Engine
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white font-display">
            Social Tracked Links &amp; Campaign Attribution
          </h1>
          <p className="text-slate-400 text-xs mt-0.5 font-sans">
            Track incoming leads from YouTube Shorts, Instagram Reels, Facebook Groups, and WhatsApp Groups with deterministic redirection.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchCampaigns}
            className="p-2.5 rounded-xl bg-[#1b202c] hover:bg-[#2a3040] text-slate-300 hover:text-white border border-[#b59658]/30 transition-all flex items-center gap-2 text-xs font-semibold shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] hover:opacity-95 text-[#12151f] text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-lg shadow-[#b59658]/20 border border-[#ccb67b]/60"
          >
            <Plus className="w-4 h-4 text-[#12151f]" />
            Create Tracked Link
          </button>
        </div>
      </div>

      {/* Aggregate KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Active Campaigns</span>
          <div className="text-2xl font-extrabold text-white mt-1 font-display">{campaigns.length} Tracked Links</div>
          <p className="text-[11px] text-slate-400 mt-1">Shorts, Reels, FB Groups, WhatsApp</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-[#b59658]/30">
          <span className="text-xs text-[#ccb67b] font-semibold uppercase tracking-wider block">Total Tracked Link Clicks</span>
          <div className="text-2xl font-extrabold text-[#ccb67b] mt-1 font-mono">{totalClicks} Clicks</div>
          <p className="text-[11px] text-[#ccb67b]/80 mt-1">Smart redirected to WhatsApp wa.me</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-purple-900/40">
          <span className="text-xs text-purple-400 font-semibold uppercase tracking-wider block">Leads Converted Directly</span>
          <div className="text-2xl font-extrabold text-purple-400 mt-1 font-mono">{totalLeads} Inquiries</div>
          <p className="text-[11px] text-purple-300/80 mt-1">100% Deterministic Organic Attribution</p>
        </div>
      </div>

      {/* Channel Filters */}
      <div className="glass-panel p-3.5 rounded-2xl flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400 font-semibold text-[11px] mr-1">Filter by Channel:</span>
        {[
          { id: 'ALL', label: 'All Channels' },
          { id: 'YOUTUBE_SHORT', label: 'YouTube Shorts' },
          { id: 'INSTAGRAM_REEL', label: 'Instagram Reels' },
          { id: 'FB_GROUP', label: 'Facebook Groups' },
          { id: 'WHATSAPP_GROUP', label: 'WhatsApp Groups' },
        ].map((ch) => (
          <button
            key={ch.id}
            onClick={() => setSelectedChannel(ch.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedChannel === ch.id
                ? 'bg-[#1b202c] text-[#ccb67b] border border-[#b59658]/50 shadow-sm font-bold'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {ch.label}
          </button>
        ))}
      </div>

      {/* Campaigns Grid */}
      {loading ? (
        <div className="glass-panel p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#ccb67b]" />
          <span>Loading organic attribution links...</span>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-400 text-sm">
          No campaign links found for this channel filter. Create your first tracked link above!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCampaigns.map((c) => {
            const redirectUrl = `http://localhost:3000/api/v1/track/${c.customSlug}`;
            const cleanPhone = '919820123456';
            const directWaUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(c.waPrefilledText)}`;

            return (
              <div key={c.id} className="glass-card p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-[#b59658]/40 transition-all">
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        {getChannelIcon(c.channelType)}
                      </span>
                      <div>
                        <h3 className="font-bold text-white text-sm font-display">{c.campaignName}</h3>
                        <span className="text-[10px] text-slate-400 font-mono">/{c.customSlug}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                      {c.channelType.replace('_', ' ')}
                    </span>
                  </div>

                  {c.targetProject && (
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-300">
                      📍 Target: <strong>{c.targetProject.projectName}</strong> ({c.targetProject.microMarket})
                    </div>
                  )}

                  {/* Prefilled WhatsApp Message Preview */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                    <span className="text-[10px] text-[#ccb67b] font-bold uppercase tracking-wider block">
                      Prefilled WhatsApp Trigger:
                    </span>
                    <p className="italic text-slate-400 line-clamp-2 font-mono">
                      "{c.waPrefilledText}"
                    </p>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Link Clicks</span>
                      <strong className="text-white font-mono text-sm">{c.totalClicks}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Leads Attributed</span>
                      <strong className="text-[#ccb67b] font-mono text-sm">{c.totalLeadsGenerated || c._count?.leads || 0}</strong>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={() => handleCopyLink(redirectUrl, c.id)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all flex items-center justify-center gap-1.5 font-semibold text-[11px]"
                  >
                    {copiedId === c.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#ccb67b]" />
                        Copied Link!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        Copy Shortlink
                      </>
                    )}
                  </button>

                  <a
                    href={directWaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-[#1b202c] hover:bg-[#2a3040] text-[#ccb67b] border border-[#b59658]/40 transition-all"
                    title="Test WhatsApp Open"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Create Tracked Campaign Link */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full p-6 rounded-2xl border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-lg flex items-center gap-2 font-display">
                <Share2 className="w-5 h-5 text-[#b59658]" />
                Generate Organic Tracked Link
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Campaign / Video Title <span className="text-[#ccb67b]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kharghar Sector 35 Mountain View Reel #4"
                  value={campaignName}
                  onChange={(e) => {
                    setCampaignName(e.target.value);
                    if (!customSlug) {
                      setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30));
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ccb67b]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Organic Channel</label>
                  <select
                    value={channelType}
                    onChange={(e) => setChannelType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ccb67b]"
                  >
                    <option value="YOUTUBE_SHORT">YouTube Shorts (Bio/Comment)</option>
                    <option value="YOUTUBE_VIDEO">YouTube Longform Review</option>
                    <option value="INSTAGRAM_REEL">Instagram Reel</option>
                    <option value="INSTAGRAM_DM">Instagram Keyword DM</option>
                    <option value="FB_GROUP">Facebook Community Group</option>
                    <option value="WHATSAPP_GROUP">WhatsApp Broadcast Group</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Reference Code / ID</label>
                  <input
                    type="text"
                    placeholder="e.g. #KG35-REEL04"
                    value={contentId}
                    onChange={(e) => setContentId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Target Project</label>
                  <select
                    value={targetProjectId}
                    onChange={(e) => setTargetProjectId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ccb67b]"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.projectName} ({p.microMarket})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Custom Slug</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. yt-sec35-sobha"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="text-slate-300 font-semibold block">Destination Link Preview:</span>
                <code className="text-[#ccb67b] font-mono block">http://localhost:3000/api/v1/track/{customSlug || 'your-slug'}</code>
                <p className="text-[10px] text-slate-500">
                  When prospects tap this in your YouTube Bio or FB Post, it counts the click and immediately opens WhatsApp with your pre-filled inquiry.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] hover:opacity-95 text-[#12151f] text-xs font-extrabold shadow-md flex items-center gap-2"
                >
                  {creating ? 'Creating Link...' : 'Generate Tracked Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
