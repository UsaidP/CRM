'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  ShieldCheck,
  Send,
  PhoneCall,
  Calendar,
  Share2,
  Download,
  Check,
  ChevronLeft,
  ChevronRight,
  Play,
  Sparkles,
  CheckCircle2,
  Lock,
  Zap,
  Info,
  Image as ImageIcon,
  Ruler,
  Video,
  X,
  Maximize2,
  Eye,
  Layers,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { InventoryMediaAsset } from '@/lib/inventory-media';

interface ClientPortalViewProps {
  portal: any;
  token: string;
}

export function ClientPortalView({ portal, token }: ClientPortalViewProps) {
  // State for active media tab per unit: 'all' | 'photos' | 'video' | 'floorplan'
  const [activeMediaTabs, setActiveMediaTabs] = useState<{ [unitId: string]: string }>({});
  
  // State for active photo index per unit
  const [activePhotoIndices, setActivePhotoIndices] = useState<{ [unitId: string]: number }>({});
  
  // State for itemized cost sheet accordion per unit
  const [showCostBreakdown, setShowCostBreakdown] = useState<{ [unitId: string]: boolean }>({});
  
  // Share state
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Active Video Modal State
  const [activeVideoModal, setActiveVideoModal] = useState<{
    unit: any;
    videoAsset?: InventoryMediaAsset;
    videoUrl: string;
    title: string;
    hostName?: string;
    hostRole?: string;
  } | null>(null);

  // Active Photo Lightbox State
  const [lightboxState, setLightboxState] = useState<{
    unit: any;
    photos: InventoryMediaAsset[];
    currentIndex: number;
  } | null>(null);

  // Visit Booking Modal State
  const [bookingUnit, setBookingUnit] = useState<any | null>(null);
  const [visitDate, setVisitDate] = useState('This Saturday (11:00 AM)');
  const [bookedSuccess, setBookedSuccess] = useState(false);

  // Telemetry Beacon helper
  const sendTelemetry = (actionType: string, unitId?: string, dwellTimeSec: number = 0) => {
    try {
      void fetch(`/api/v1/portals/${token}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType, unitId, dwellTimeSec }),
      }).catch(() => {});
    } catch {
      // silent
    }
  };

  useEffect(() => {
    sendTelemetry('PORTAL_OPEN');

    const startTime = Date.now();
    return () => {
      const dwellSec = Math.round((Date.now() - startTime) / 1000);
      if (dwellSec > 2) {
        sendTelemetry('PORTAL_DWELL', undefined, dwellSec);
      }
    };
  }, [token]);

  const handlePhotoNav = (unitId: string, direction: 'prev' | 'next', totalPhotos: number) => {
    sendTelemetry('PHOTO_SWIPE', unitId);
    setActivePhotoIndices((prev) => {
      const current = prev[unitId] || 0;
      const nextIdx = direction === 'next'
        ? (current + 1) % totalPhotos
        : (current - 1 + totalPhotos) % totalPhotos;
      return { ...prev, [unitId]: nextIdx };
    });
  };

  const handleShare = async () => {
    sendTelemetry('PORTAL_SHARE');
    setShareError(null);
    if (navigator.share) {
      navigator.share({
        title: portal?.title || 'ZamZam Properties Options',
        text: 'Review these verified property options selected for us by ZamZam Properties:',
        url: window.location.href,
      }).catch(() => {});
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } catch {
        setShareError('The portal link could not be copied. Select the browser address and copy it manually.');
      }
    }
  };

  const handleBrochureClick = (unit: any) => {
    if (!unit.project?.brochureUrl) return;
    sendTelemetry('BROCHURE_DOWNLOAD', unit.id);
    window.open(unit.project.brochureUrl, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsAppInquiry = (unit: any) => {
    sendTelemetry('WHATSAPP_CLICK', unit.id);
    const text = `Hi ZamZam Properties, I am reviewing ${unit.bhk} BHK in ${unit.project.projectName} (Unit ${unit.unitNumber || 'N/A'}) on my private portal. Can we schedule a quick call?`;
    window.open(`https://wa.me/919820123456?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleBookVisitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingUnit) return;
    sendTelemetry('VISIT_BOOKING_CLICK', bookingUnit.id);
    setBookedSuccess(true);
    setTimeout(() => {
      setBookedSuccess(false);
      setBookingUnit(null);
    }, 2500);
  };

  const openVideoPlayer = (unit: any, videoAsset?: InventoryMediaAsset) => {
    const videoUrl = videoAsset?.url || unit.videoReelUrl || unit.project?.youtubeWalkthroughUrl || 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    const title = videoAsset?.title || `${unit.project.projectName} ${unit.bhk} BHK Walkthrough Tour`;
    sendTelemetry('VIDEO_PLAY', unit.id);
    setActiveVideoModal({
      unit,
      videoAsset,
      videoUrl,
      title,
      hostName: videoAsset?.hostName || portal.createdBy?.fullName || 'Farhan Shaikh',
      hostRole: videoAsset?.hostRole || 'Senior Property Specialist',
    });
  };

  const openLightbox = (unit: any, photos: InventoryMediaAsset[], index: number) => {
    sendTelemetry('PHOTO_SWIPE', unit.id);
    setLightboxState({
      unit,
      photos,
      currentIndex: index,
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 selection:bg-[#b59658] selection:text-[#12151f] pb-16 font-sans">
      {/* Top Advisory Sticky Header */}
      <header className="sticky top-0 z-40 bg-[#12151f]/95 backdrop-blur-md border-b border-[#b59658]/20 px-4 py-3 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8a6f3c] via-[#b59658] to-[#ccb67b] flex items-center justify-center shadow-lg shadow-[#b59658]/20 border border-[#ccb67b]/50">
              <Building2 className="w-5 h-5 text-[#12151f]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-white font-display">ZamZam Properties</span>
                <span className="whitespace-nowrap rounded-md bg-[#1b202c] px-2 py-0.5 text-[10px] font-bold text-[#ccb67b] border border-[#b59658]/40 font-mono">
                  Private Advisory Portal
                </span>
              </div>
              <p className="hidden text-[10px] text-[#ccb67b]/80 font-mono sm:block">MahaRERA Reg: {portal.organization?.reraBrokerRegistration || 'A52000029381'} • Navi Mumbai</p>
            </div>
          </div>

          <div className="flex min-w-0 flex-col items-end gap-1">
            <button
              type="button"
              onClick={handleShare}
              aria-describedby={shareError ? 'portal-share-error' : undefined}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#b59658]/40 bg-[#1b202c] px-3.5 py-1.5 text-xs font-bold text-[#ccb67b] shadow-sm transition-all hover:bg-[#2a3040] active:scale-95"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#ccb67b]" />
                  Copied Link!
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-[#b59658]" />
                  Share Portfolio
                </>
              )}
            </button>
            {shareError && <p id="portal-share-error" role="alert" className="max-w-[16rem] text-right text-[11px] text-red-300">{shareError}</p>}
          </div>
        </div>
      </header>

      {/* Hero Welcome Container */}
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-2">
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#12151f] via-[#1b202c] to-[#12151f] border border-[#b59658]/30 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1b202c] border border-[#b59658]/40 text-[#ccb67b] text-xs font-semibold font-mono">
              <Sparkles className="w-3.5 h-3.5 text-[#b59658]" />
              Verified Client Selection
            </div>

            {portal.createdBy && (
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-[#0a0d14]/70 px-3 py-1 rounded-full border border-slate-800">
                <UserCheck className="w-3.5 h-3.5 text-[#ccb67b]" />
                <span>Advisor: <strong className="text-white">{portal.createdBy.fullName}</strong></span>
              </div>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight font-display leading-tight">
            {portal.title}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans max-w-3xl">
            {portal.customMessage || 'We selected these verified options using your budget, BHK, and possession timeline preferences.'}
          </p>

          <div className="h-px bg-gradient-to-r from-[#b59658]/40 via-slate-700 to-transparent my-3" />

          <div className="flex flex-wrap items-center gap-6 pt-1 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-2 text-[#ccb67b]">
              <ShieldCheck className="w-4 h-4 text-[#b59658]" />
              100% MahaRERA Verified Records
            </span>
            <span className="flex items-center gap-2 text-[#ccb67b]">
              <Zap className="w-4 h-4 text-[#b59658]" />
              Itemized Statutory All-In Cost Sheets
            </span>
            <span className="flex items-center gap-2 text-[#ccb67b]">
              <Video className="w-4 h-4 text-[#b59658]" />
              Host Walkthrough Reels & Floor Plans Included
            </span>
          </div>
        </div>
      </div>

      {/* Curated Properties List */}
      <main className="max-w-5xl mx-auto px-4 space-y-8 pt-6">
        <div className="flex flex-col gap-2 border-b border-[#b59658]/20 px-1 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ccb67b]">
              Prepared for {portal.lead?.fullName || 'You'}
            </span>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
              Curated Property Units ({portal.portalUnits?.length || 0})
            </h2>
          </div>
          <span className="font-mono text-xs text-slate-400">
            Real-time verified pricing • Direct developer inventory
          </span>
        </div>

        {portal.portalUnits?.map((item: any, index: number) => {
          const unit = item.propertyUnit;
          const project = unit.project;
          
          // Media Extraction
          const unitMedia: InventoryMediaAsset[] = unit.mediaGallery || [];
          const projectMedia: InventoryMediaAsset[] = project.mediaGallery || [];
          const allMedia = Array.from(new Map([...unitMedia, ...projectMedia].filter((m) => m?.url).map((m) => [m.url, m])).values());
          
          const photos = allMedia.filter((m) => m.kind === 'image' && m.category !== 'floorplan');
          const floorPlans = allMedia.filter((m) => m.category === 'floorplan');
          if (floorPlans.length === 0 && unit.floorPlanUrl) {
            floorPlans.push({
              id: `fp-${unit.id}`,
              url: unit.floorPlanUrl,
              kind: 'image' as const,
              title: `${project.projectName} ${unit.bhk} BHK Floor Plan Schematic`,
              caption: `${unit.carpetAreaSqft} sq.ft usable carpet dimension schematic`,
              category: 'floorplan',
            });
          }
          const primaryFloorPlan = floorPlans[0] || (unit.floorPlanUrl ? {
            id: `fp-${unit.id}`,
            url: unit.floorPlanUrl,
            kind: 'image' as const,
            title: `${project.projectName} ${unit.bhk} BHK Floor Plan Schematic`,
            caption: `${unit.carpetAreaSqft} sq.ft usable carpet dimension schematic`,
            category: 'floorplan',
          } : null);
          const videos = allMedia.filter((m) => m.kind === 'video');
          const primaryVideo = videos[0] || (unit.videoReelUrl ? {
            id: `video-reel-${unit.id}`,
            url: unit.videoReelUrl,
            kind: 'video' as const,
            title: `${project.projectName} ${unit.bhk} BHK Host Walkthrough Tour`,
            hostName: portal.createdBy?.fullName || 'Farhan Shaikh',
            hostRole: 'Senior Property Specialist',
            duration: '1:15',
            posterUrl: photos[0]?.url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200',
          } : null);

          const activeTab = activeMediaTabs[unit.id] || 'photos';
          const activePhotoIdx = activePhotoIndices[unit.id] || 0;
          const activePhoto = photos[activePhotoIdx] || photos[0];
          const isCostExpanded = showCostBreakdown[unit.id] || false;

          return (
            <article
              key={unit.id}
              className="glass-panel overflow-hidden rounded-3xl border border-slate-800 bg-[#12151f]/90 shadow-2xl transition-all hover:border-[#b59658]/40"
            >
              {/* Top Unit Banner */}
              <div className="bg-[#1b202c]/80 border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="rounded-full border border-[#b59658]/40 bg-[#12151f] px-3 py-1 text-xs font-extrabold text-[#ccb67b] font-mono shadow-sm">
                    Option {String(index + 1).padStart(2, '0')}
                  </span>
                  {item.brokerHighlight && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8a6f3c]/20 border border-[#b59658]/40 text-[#ccb67b] text-xs font-semibold">
                      <Sparkles className="w-3.5 h-3.5 text-[#b59658]" />
                      {item.brokerHighlight}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1 text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-[#b59658]" />
                    RERA: <strong className="text-white">{project.reraNumber}</strong>
                  </span>
                </div>
              </div>

              {/* Media Hub Section with Tabs */}
              <div className="bg-slate-950 p-4 sm:p-6 space-y-4">
                {/* Media Category Filter Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveMediaTabs((prev) => ({ ...prev, [unit.id]: 'photos' }))}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'photos'
                          ? 'bg-[#b59658] text-[#12151f] shadow-md shadow-[#b59658]/20'
                          : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      HD Photos ({photos.length})
                    </button>

                    {primaryVideo && (
                      <button
                        type="button"
                        onClick={() => setActiveMediaTabs((prev) => ({ ...prev, [unit.id]: 'video' }))}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          activeTab === 'video'
                            ? 'bg-[#b59658] text-[#12151f] shadow-md shadow-[#b59658]/20'
                            : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                        }`}
                      >
                        <Video className="w-3.5 h-3.5" />
                        Host Video Reel {primaryVideo.duration ? `(${primaryVideo.duration})` : ''}
                      </button>
                    )}

                    {(floorPlans.length > 0 || unit.floorPlanUrl) && (
                      <button
                        type="button"
                        onClick={() => setActiveMediaTabs((prev) => ({ ...prev, [unit.id]: 'floorplan' }))}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          activeTab === 'floorplan'
                            ? 'bg-[#b59658] text-[#12151f] shadow-md shadow-[#b59658]/20'
                            : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                        }`}
                      >
                        <Ruler className="w-3.5 h-3.5" />
                        Floor Plan ({unit.carpetAreaSqft} sq.ft)
                      </button>
                    )}
                  </div>

                  <span className="text-[11px] font-mono text-[#ccb67b] hidden sm:block">
                    Physical broker audit completed
                  </span>
                </div>

                {/* TAB 1: HD PHOTO GALLERY */}
                {activeTab === 'photos' && (
                  <div className="space-y-3">
                    <div className="relative aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden group border border-slate-800/80 bg-slate-900">
                      {photos.length > 0 ? (
                        <>
                          <img
                            src={activePhoto?.url}
                            alt={activePhoto?.alt || activePhoto?.title || `${project.projectName} Photo`}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] cursor-pointer"
                            onClick={() => openLightbox(unit, photos, activePhotoIdx)}
                          />

                          {/* Top Badges */}
                          <div className="absolute left-3 top-3 flex flex-wrap gap-2 z-10">
                            <span className="px-3 py-1 rounded-xl bg-[#12151f]/90 border border-[#b59658]/50 text-[#ccb67b] font-bold text-xs backdrop-blur-md shadow-lg font-mono">
                              {unit.bhk} BHK • {unit.carpetAreaSqft} sq.ft
                            </span>
                            {unit.possessionStatus === 'READY_TO_MOVE' || project.hasOccupancyCertificate ? (
                              <span className="px-3 py-1 rounded-xl bg-emerald-950/90 border border-emerald-600/50 text-emerald-300 font-semibold text-xs backdrop-blur-md font-mono">
                                🟢 Ready to Move (OC Received)
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-xl bg-amber-950/90 border border-amber-600/50 text-amber-300 font-semibold text-xs backdrop-blur-md font-mono">
                                🏗️ Under Construction (5% GST)
                              </span>
                            )}
                          </div>

                          {/* Bottom Caption Overlay with Fullscreen Button */}
                          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-4 pb-3.5 pt-12">
                            <div className="min-w-0">
                              <p className="truncate text-sm sm:text-base font-bold text-white font-display">
                                {activePhoto?.title || `${project.projectName} • Unit ${unit.unitNumber || 'Selected'}`}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-300 line-clamp-1">
                                {activePhoto?.caption || 'Verified high-resolution architectural photography.'}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => openLightbox(unit, photos, activePhotoIdx)}
                              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-bold text-white backdrop-blur transition hover:bg-black/80"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                              View Fullscreen
                            </button>
                          </div>

                          {/* Navigation Arrows */}
                          {photos.length > 1 && (
                            <>
                              <button
                                type="button"
                                aria-label="Previous photo"
                                onClick={() => handlePhotoNav(unit.id, 'prev', photos.length)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 min-h-10 min-w-10 grid place-items-center rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all active:scale-95"
                              >
                                <ChevronLeft className="w-5 h-5" />
                              </button>
                              <button
                                type="button"
                                aria-label="Next photo"
                                onClick={() => handlePhotoNav(unit.id, 'next', photos.length)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 min-h-10 min-w-10 grid place-items-center rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all active:scale-95"
                              >
                                <ChevronRight className="w-5 h-5" />
                              </button>
                              <div className="absolute bottom-3.5 right-36 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] text-white font-mono">
                                {activePhotoIdx + 1} / {photos.length}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-slate-400">
                          <Building2 className="h-10 w-10 text-[#ccb67b]/70" />
                          <p className="text-sm">Verified photos being uploaded by advisor</p>
                        </div>
                      )}
                    </div>

                    {/* Thumbnail Filmstrip Scrubber */}
                    {photos.length > 1 && (
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 pt-1">
                        {photos.map((photo, pIdx) => (
                          <button
                            key={photo.id || pIdx}
                            type="button"
                            onClick={() => {
                              setActivePhotoIndices((prev) => ({ ...prev, [unit.id]: pIdx }));
                              sendTelemetry('PHOTO_SWIPE', unit.id);
                            }}
                            className={`relative aspect-[4/3] rounded-xl overflow-hidden border transition-all ${
                              activePhotoIdx === pIdx
                                ? 'border-[#ccb67b] ring-2 ring-[#ccb67b]/50 scale-[1.03]'
                                : 'border-slate-800 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img src={photo.url} alt="" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: HOST WALKTHROUGH VIDEO REEL */}
                {activeTab === 'video' && primaryVideo && (
                  <div className="space-y-4">
                    <div className="relative aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden border border-[#b59658]/40 bg-slate-900 group">
                      <img
                        src={primaryVideo.posterUrl || photos[0]?.url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200'}
                        alt={primaryVideo.title || 'Host Video Tour'}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-75"
                      />

                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/40 backdrop-blur-[2px]">
                        <button
                          type="button"
                          onClick={() => openVideoPlayer(unit, primaryVideo)}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[#8a6f3c] via-[#b59658] to-[#ccb67b] flex items-center justify-center text-[#12151f] shadow-2xl shadow-[#b59658]/40 transform transition hover:scale-110 active:scale-95 border-2 border-white/40"
                          aria-label="Play Host Video Walkthrough"
                        >
                          <Play className="w-8 h-8 fill-[#12151f] text-[#12151f] ml-1" />
                        </button>

                        <div className="mt-4 max-w-lg">
                          <h4 className="text-lg sm:text-xl font-bold text-white font-display">
                            {primaryVideo.title}
                          </h4>
                          {primaryVideo.caption && (
                            <p className="mt-1 text-xs text-slate-200 line-clamp-2">
                              {primaryVideo.caption}
                            </p>
                          )}
                        </div>

                        {/* Host Badge */}
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 border border-[#b59658]/40 text-xs text-white backdrop-blur">
                          <UserCheck className="w-3.5 h-3.5 text-[#ccb67b]" />
                          <span>Presented by: <strong className="text-[#ccb67b]">{primaryVideo.hostName || 'Farhan Shaikh'}</strong> ({primaryVideo.hostRole || 'Senior Advisor'})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: ARCHITECTURAL FLOOR PLAN & BLUEPRINT SCHEMATIC */}
                {activeTab === 'floorplan' && (
                  <div className="space-y-4">
                    <div className="relative rounded-2xl overflow-hidden border border-[#b59658]/40 bg-[#0a1122] p-4 sm:p-6 shadow-inner">
                      {/* Architectural Blueprint SVG Visualizer */}
                      <div className="max-w-3xl mx-auto space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#b59658]/30 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-md bg-[#1b253b] border border-[#b59658]/50 text-[#ccb67b] font-mono text-[11px] font-bold">
                              CAD SCHEMATIC • REV 2.4
                            </span>
                            <span className="text-xs font-mono text-slate-300">
                              {unit.bhk} BHK Architectural Layout ({unit.carpetAreaSqft} sq.ft)
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-mono text-[#ccb67b]">
                            <span>Vastu: <strong className="text-white">{unit.facing?.replace('_', ' ')} Facing</strong></span>
                          </div>
                        </div>

                        {/* Interactive Blueprint Canvas */}
                        <div className="relative aspect-[16/10] w-full rounded-xl bg-[#070c18] border border-blue-900/60 p-4 overflow-hidden flex items-center justify-center shadow-2xl">
                          {/* Blueprint Grid Background */}
                          <div
                            className="absolute inset-0 opacity-20 pointer-events-none"
                            style={{
                              backgroundImage: 'linear-gradient(to right, #3b82f6 1px, transparent 1px), linear-gradient(to bottom, #3b82f6 1px, transparent 1px)',
                              backgroundSize: '24px 24px',
                            }}
                          />

                          {/* Architectural Blueprint Vector */}
                          <svg
                            viewBox="0 0 800 500"
                            className="w-full h-full text-blue-300 select-none z-10"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            {/* Outer Wall Boundary */}
                            <rect x="50" y="40" width="700" height="420" rx="8" stroke="#60a5fa" strokeWidth="4" fill="#0f1c38" fillOpacity="0.7" />

                            {/* Living & Dining Area */}
                            <rect x="60" y="50" width="360" height="260" stroke="#93c5fd" strokeWidth="2" strokeDasharray="4 4" fill="#1e3a8a" fillOpacity="0.25" />
                            <text x="240" y="150" textAnchor="middle" fill="#f8fafc" fontSize="16" fontWeight="bold" fontFamily="sans-serif">Living & Dining Hall</text>
                            <text x="240" y="175" textAnchor="middle" fill="#93c5fd" fontSize="12" fontFamily="monospace">11&apos;0&quot; × 17&apos;6&quot; (192 sq.ft)</text>

                            {/* French Balcony Deck */}
                            <rect x="60" y="320" width="360" height="130" stroke="#38bdf8" strokeWidth="2" fill="#0369a1" fillOpacity="0.3" />
                            <text x="240" y="380" textAnchor="middle" fill="#38bdf8" fontSize="14" fontWeight="bold" fontFamily="sans-serif">French Balcony Deck</text>
                            <text x="240" y="402" textAnchor="middle" fill="#bae6fd" fontSize="11" fontFamily="monospace">5&apos;0&quot; × 11&apos;0&quot; (Valley View)</text>

                            {/* Modular Kitchen & Utility */}
                            <rect x="430" y="50" width="310" height="150" stroke="#a7f3d0" strokeWidth="2" fill="#065f46" fillOpacity="0.25" />
                            <text x="585" y="115" textAnchor="middle" fill="#a7f3d0" fontSize="14" fontWeight="bold" fontFamily="sans-serif">Modular Kitchen & Utility</text>
                            <text x="585" y="137" textAnchor="middle" fill="#6ee7b7" fontSize="11" fontFamily="monospace">8&apos;0&quot; × 10&apos;0&quot; (Piped Gas)</text>

                            {/* Master Bedroom Suite */}
                            <rect x="430" y="210" width="310" height="160" stroke="#fde047" strokeWidth="2" fill="#854d0e" fillOpacity="0.25" />
                            <text x="585" y="280" textAnchor="middle" fill="#fef08a" fontSize="14" fontWeight="bold" fontFamily="sans-serif">Master Bedroom Suite</text>
                            <text x="585" y="302" textAnchor="middle" fill="#fde047" fontSize="11" fontFamily="monospace">11&apos;0&quot; × 13&apos;0&quot; (Attached Bath)</text>

                            {/* Luxury Bathrooms */}
                            <rect x="430" y="380" width="150" height="70" stroke="#c084fc" strokeWidth="2" fill="#581c87" fillOpacity="0.3" />
                            <text x="505" y="420" textAnchor="middle" fill="#e9d5ff" fontSize="11" fontWeight="bold" fontFamily="sans-serif">Master Bath</text>

                            <rect x="590" y="380" width="150" height="70" stroke="#c084fc" strokeWidth="2" fill="#581c87" fillOpacity="0.3" />
                            <text x="665" y="420" textAnchor="middle" fill="#e9d5ff" fontSize="11" fontWeight="bold" fontFamily="sans-serif">Common Bath</text>

                            {/* Entry Door & North Indicator */}
                            <circle cx="700" cy="80" r="18" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
                            <text x="700" y="76" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">▲ N</text>
                            <text x="700" y="90" textAnchor="middle" fill="#cbd5e1" fontSize="8" fontFamily="monospace">{unit.facing?.replace('_', ' ') || 'EAST'}</text>
                          </svg>
                        </div>

                        {/* Room Dimension Breakdown Pills */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs font-mono">
                          <div className="p-2.5 rounded-xl bg-[#0f172a] border border-blue-900/50">
                            <span className="text-[10px] text-blue-400 block uppercase">Living & Dining</span>
                            <strong className="text-white text-xs">11&apos;0&quot; × 17&apos;6&quot;</strong>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#0f172a] border border-emerald-900/50">
                            <span className="text-[10px] text-emerald-400 block uppercase">Modular Kitchen</span>
                            <strong className="text-white text-xs">8&apos;0&quot; × 10&apos;0&quot;</strong>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#0f172a] border border-amber-900/50">
                            <span className="text-[10px] text-amber-400 block uppercase">Master Suite</span>
                            <strong className="text-white text-xs">11&apos;0&quot; × 13&apos;0&quot;</strong>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#0f172a] border border-sky-900/50">
                            <span className="text-[10px] text-sky-400 block uppercase">Balcony Deck</span>
                            <strong className="text-white text-xs">5&apos;0&quot; × 11&apos;0&quot;</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-mono">Usable Carpet Area</span>
                        <strong className="text-white text-sm font-mono">{unit.carpetAreaSqft} sq.ft</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-mono">Configuration</span>
                        <strong className="text-white text-sm">{unit.bhk} BHK ({unit.bathrooms}B / {unit.balconies} Balcony)</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-mono">Floor Level</span>
                        <strong className="text-white text-sm font-mono">Floor {unit.floorNumber} of {unit.totalFloors}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-mono">Facing Direction</span>
                        <strong className="text-[#ccb67b] text-sm">{unit.facing?.replace('_', ' ')}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Property Details & Pricing Section */}
              <div className="p-6 sm:p-8 space-y-6">
                {/* Title, Locality & Pricing Header */}
                <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#ccb67b]">
                      {unit.bhk} BHK • {unit.possessionStatus === 'READY_TO_MOVE' || project.hasOccupancyCertificate ? 'Ready to Move with OC' : 'Under Construction'}
                    </p>
                    <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
                      {project.projectName}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-1.5 font-mono pt-0.5">
                      <MapPin className="w-4 h-4 text-[#ccb67b] shrink-0" />
                      {project.microMarket} ({project.subLocality || 'Prime Sector Corridor'}) • {project.distanceToMetroKm ? `${project.distanceToMetroKm} km to Metro` : 'Near Station'}
                    </p>
                  </div>

                  <div className="min-w-[12rem] sm:border-l sm:border-[#b59658]/30 sm:pl-6 text-left sm:text-right space-y-1">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
                      Statutory All-In Cost (C_all-in)
                    </span>
                    <strong className="font-mono text-2xl sm:text-3xl font-extrabold tracking-tight text-[#ccb67b] block">
                      ₹{(unit.allInTotalCost / 100000).toFixed(2)} Lakhs
                    </strong>
                    <span className="block text-[10px] text-slate-400 font-mono">
                      Base Agreement: ₹{(unit.agreementValue / 100000).toFixed(2)}L
                    </span>
                  </div>
                </div>

                {/* Descriptions & Feature Highlights */}
                <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] border-b border-slate-800 pb-6 text-xs sm:text-sm">
                  <div className="space-y-4">
                    {unit.description && (
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-wider text-[#ccb67b] mb-1 font-mono">
                          About this Home (Unit {unit.unitNumber || 'Selected'})
                        </h5>
                        <p className="text-slate-300 leading-relaxed font-sans">
                          {unit.description}
                        </p>
                      </div>
                    )}

                    {project.description && (
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-wider text-[#ccb67b] mb-1 font-mono">
                          Project Architecture & Specifications
                        </h5>
                        <p className="text-slate-400 leading-relaxed font-sans">
                          {project.description}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {unit.featureHighlights?.length > 0 && (
                      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-[#ccb67b] mb-2 font-mono flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#b59658]" />
                          Verified Home Highlights
                        </h5>
                        <ul className="space-y-2 text-xs text-slate-300">
                          {unit.featureHighlights.map((feat: string, fIdx: number) => (
                            <li key={fIdx} className="flex items-start gap-2">
                              <Check className="w-3.5 h-3.5 text-[#ccb67b] shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {project.locationDescription && (
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-wider text-[#ccb67b] mb-1 font-mono">
                          Micro-Market & Connectivity
                        </h5>
                        <p className="text-slate-400 leading-relaxed font-sans">
                          {project.locationDescription}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Key Spec Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5">
                    <span className="block text-[10px] uppercase text-slate-400 font-mono">Config</span>
                    <strong className="text-sm font-bold text-white">{unit.bhk} BHK</strong>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5">
                    <span className="block text-[10px] uppercase text-slate-400 font-mono">Carpet Area</span>
                    <strong className="text-sm font-bold text-white">{unit.carpetAreaSqft} sq.ft</strong>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5">
                    <span className="block text-[10px] uppercase text-slate-400 font-mono">Baths & Balconies</span>
                    <strong className="text-sm font-bold text-white">{unit.bathrooms}B / {unit.balconies} Deck</strong>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5">
                    <span className="block text-[10px] uppercase text-slate-400 font-mono">Floor Level</span>
                    <strong className="text-sm font-bold text-white">{unit.floorNumber} / {unit.totalFloors}</strong>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5">
                    <span className="block text-[10px] uppercase text-slate-400 font-mono">Vastu Facing</span>
                    <strong className="text-sm font-bold text-[#ccb67b]">{unit.facing?.replace('_', ' ')}</strong>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5">
                    <span className="block text-[10px] uppercase text-slate-400 font-mono">Metro Distance</span>
                    <strong className="text-sm font-bold text-[#ccb67b]">{project.distanceToMetroKm ? `${project.distanceToMetroKm} km` : 'Near Metro'}</strong>
                  </div>
                </div>

                {/* All-In Statutory Cost Sheet (Itemized Math) */}
                <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden text-xs">
                  <button
                    type="button"
                    aria-expanded={isCostExpanded}
                    aria-controls={`cost-breakdown-${unit.id}`}
                    onClick={() => setShowCostBreakdown((prev) => ({ ...prev, [unit.id]: !prev[unit.id] }))}
                    className="w-full min-h-12 px-4 py-3.5 flex items-center justify-between text-slate-300 hover:text-white font-semibold transition"
                  >
                    <span className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-[#ccb67b]" />
                      Itemized All-In Statutory Acquisition Cost Sheet (C_all-in)
                    </span>
                    <span className="text-xs text-[#ccb67b] font-mono font-bold">
                      {isCostExpanded ? 'Hide Breakdown ▲' : 'View Itemized Math ▼'}
                    </span>
                  </button>

                  {isCostExpanded && (
                    <div id={`cost-breakdown-${unit.id}`} className="p-5 pt-1 border-t border-slate-800 space-y-2.5 text-slate-300 font-mono">
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span>1. Base Agreement Value:</span>
                        <span className="text-white font-bold">₹{(unit.agreementValue / 100000).toFixed(2)} Lakhs</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span>2. Stamp Duty ({unit.stampDutyRate}%):</span>
                        <span>₹{((unit.agreementValue * unit.stampDutyRate) / 10000000).toFixed(2)} Lakhs</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span>3. Registration Fee (Capped at ₹30k):</span>
                        <span>₹{(unit.registrationFee / 100000).toFixed(2)} Lakhs</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span>4. Statutory GST ({unit.gstRate}%):</span>
                        <span>{unit.gstRate === 0 ? '₹0.00 (0% on OC Received)' : `₹${((unit.agreementValue * unit.gstRate) / 10000000).toFixed(2)} Lakhs`}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span>5. Floor Rise & Premium Charges:</span>
                        <span>₹{(unit.floorRiseCharges / 100000).toFixed(2)} Lakhs</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span>6. Parking & Society Development Charges:</span>
                        <span>₹{((unit.parkingCharges + unit.societyDevelopmentCharges) / 100000).toFixed(2)} Lakhs</span>
                      </div>
                      <div className="flex justify-between pt-3 text-[#ccb67b] font-bold text-sm sm:text-base border-t border-slate-700">
                        <span>Net Total Acquisition Outlay:</span>
                        <span>₹{(unit.allInTotalCost / 100000).toFixed(2)} Lakhs</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Project Amenities Tags */}
                {unit.amenities?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block font-mono">
                      Clubhouse & Lifestyle Amenities:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {unit.amenities.map((am: string, i: number) => (
                        <span key={i} className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs">
                          {am}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Card Action CTAs */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-5">
                  {project.brochureUrl ? (
                    <button
                      type="button"
                      onClick={() => handleBrochureClick(unit)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
                    >
                      <Download className="w-4 h-4 text-[#ccb67b]" />
                      Download Official Brochure (PDF)
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500 font-mono">Brochure pending upload</span>
                  )}

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    {primaryVideo && (
                      <button
                        type="button"
                        onClick={() => openVideoPlayer(unit, primaryVideo)}
                        className="flex-1 sm:flex-initial min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 flex items-center justify-center gap-1.5 transition"
                      >
                        <Play className="w-3.5 h-3.5 text-[#ccb67b]" />
                        Watch Video Reel
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setBookingUnit(unit)}
                      className="flex-1 sm:flex-initial min-h-11 rounded-xl border border-[#b59658]/50 bg-[#1b202c] px-4 py-2.5 text-xs font-bold text-[#ccb67b] shadow-sm hover:bg-[#2a3040] flex items-center justify-center gap-1.5 transition"
                    >
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      Book Physical Visit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleWhatsAppInquiry(unit)}
                      className="flex-1 sm:flex-initial min-h-11 rounded-xl border border-[#ccb67b]/70 bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] px-5 py-2.5 text-xs font-extrabold text-[#12151f] shadow-lg shadow-[#b59658]/20 hover:brightness-110 flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Ask on WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </main>

      {/* Direct Advisory Assistance Bar */}
      <aside aria-label="Direct Advisory Assistance" className="mx-auto mt-10 max-w-lg px-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#b59658]/40 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#8a6f3c] via-[#b59658] to-[#ccb67b] flex items-center justify-center text-[#12151f] font-extrabold text-sm font-display shadow-md">
              ZP
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-white">Need a second opinion on pricing?</p>
              <p className="text-[11px] text-[#ccb67b]">Speak with Senior Advisor {portal.createdBy?.fullName || 'Farhan Shaikh'}</p>
            </div>
          </div>
          <a
            href="tel:+919820123456"
            aria-label="Call senior advisor"
            onClick={() => sendTelemetry('CALL_CLICK')}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[#ccb67b] bg-[#1b202c] px-4 py-2 text-xs font-bold text-[#ccb67b] hover:bg-[#2a3040] transition"
          >
            <PhoneCall className="w-4 h-4 text-[#b59658]" />
            Call Advisor
          </a>
        </div>
      </aside>

      {/* MODAL 1: Interactive Host Video Walkthrough Player */}
      <AccessibleDialog
        open={Boolean(activeVideoModal)}
        onClose={() => setActiveVideoModal(null)}
        titleId="video-modal-title"
        descriptionId="video-modal-description"
        size="xl"
        panelClassName="glass-panel p-0 rounded-3xl border border-[#b59658]/40 shadow-2xl overflow-hidden bg-slate-950"
      >
        {activeVideoModal && (
          <div>
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#12151f] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1b202c] border border-[#b59658]/40 flex items-center justify-center text-[#ccb67b]">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="video-modal-title" className="text-sm sm:text-base font-bold text-white font-display">
                    {activeVideoModal.title}
                  </h3>
                  <p id="video-modal-description" className="text-[11px] text-[#ccb67b] font-mono">
                    Presented by {activeVideoModal.hostName} ({activeVideoModal.hostRole})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveVideoModal(null)}
                className="w-9 h-9 rounded-full bg-slate-900 border border-slate-700 grid place-items-center text-slate-400 hover:text-white"
                aria-label="Close walkthrough video"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Player */}
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={`${activeVideoModal.videoUrl}?autoplay=1&rel=0`}
                title={activeVideoModal.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>

            {/* Modal Footer CTAs */}
            <div className="p-4 bg-[#12151f] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-400 font-mono">
                {activeVideoModal.unit?.project?.microMarket || 'Navi Mumbai'} • Verified Property Tour
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const unit = activeVideoModal.unit;
                    setActiveVideoModal(null);
                    setBookingUnit(unit);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] text-black font-bold text-xs shadow-lg flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Schedule Visit
                </button>
              </div>
            </div>
          </div>
        )}
      </AccessibleDialog>

      {/* MODAL 2: Fullscreen Photo Lightbox */}
      <AccessibleDialog
        open={Boolean(lightboxState)}
        onClose={() => setLightboxState(null)}
        titleId="lightbox-modal-title"
        descriptionId="lightbox-modal-description"
        size="xl"
        panelClassName="glass-panel p-0 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden bg-slate-950"
      >
        {lightboxState && (
          <div>
            <div className="px-5 py-3.5 bg-[#12151f] border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 id="lightbox-modal-title" className="text-sm font-bold text-white font-display">
                  {lightboxState.photos[lightboxState.currentIndex]?.title || 'Property Photography'}
                </h3>
                <p id="lightbox-modal-description" className="text-[11px] text-slate-400 font-mono">
                  {lightboxState.unit?.project?.projectName} • Image {lightboxState.currentIndex + 1} of {lightboxState.photos.length}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setLightboxState(null)}
                className="w-9 h-9 rounded-full bg-slate-900 border border-slate-700 grid place-items-center text-slate-400 hover:text-white"
                aria-label="Close photo lightbox"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-[16/10] w-full bg-black flex items-center justify-center p-2">
              <img
                src={lightboxState.photos[lightboxState.currentIndex]?.url}
                alt={lightboxState.photos[lightboxState.currentIndex]?.title || ''}
                className="max-h-full max-w-full object-contain"
              />

              {lightboxState.photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setLightboxState((prev) => prev ? {
                      ...prev,
                      currentIndex: (prev.currentIndex - 1 + prev.photos.length) % prev.photos.length,
                    } : null)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/70 hover:bg-black text-white grid place-items-center border border-white/20 backdrop-blur"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setLightboxState((prev) => prev ? {
                      ...prev,
                      currentIndex: (prev.currentIndex + 1) % prev.photos.length,
                    } : null)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/70 hover:bg-black text-white grid place-items-center border border-white/20 backdrop-blur"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {lightboxState.photos[lightboxState.currentIndex]?.caption && (
              <div className="p-4 bg-[#12151f] border-t border-slate-800 text-xs text-slate-300">
                {lightboxState.photos[lightboxState.currentIndex].caption}
              </div>
            )}
          </div>
        )}
      </AccessibleDialog>

      {/* MODAL 3: Book Physical Site Visit */}
      <AccessibleDialog
        open={Boolean(bookingUnit)}
        onClose={() => setBookingUnit(null)}
        titleId="public-booking-title"
        descriptionId="public-booking-description"
        size="md"
        panelClassName="glass-panel p-6 rounded-3xl border border-slate-700 shadow-2xl space-y-4 bg-slate-950"
      >
        {bookingUnit && (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 id="public-booking-title" className="font-bold text-white text-base flex items-center gap-2 font-display">
                  <Calendar className="w-4 h-4 text-[#b59658]" />
                  Schedule Physical Site Inspection
                </h2>
                <p id="public-booking-description" className="mt-1 text-[11px] text-slate-400">
                  Select your preferred Saturday/Sunday tour timing slot.
                </p>
              </div>
              <button
                type="button"
                data-dialog-close
                aria-label="Close site visit request"
                onClick={() => setBookingUnit(null)}
                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 grid place-items-center text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {bookedSuccess ? (
              <div className="p-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#1b202c] border border-[#b59658]/40 text-[#ccb67b] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-[#b59658]" />
                </div>
                <h4 className="font-bold text-white text-base font-display">Visit Request Confirmed!</h4>
                <p className="text-xs text-slate-300">
                  Your ZamZam advisor ({portal.createdBy?.fullName || 'Farhan Shaikh'}) will confirm your Saturday pickup cab & itinerary on WhatsApp shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleBookVisitSubmit} className="space-y-4 text-xs">
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block uppercase font-mono">Selected Property:</span>
                  <strong className="text-white text-sm block font-display">{bookingUnit.project.projectName}</strong>
                  <span className="text-[#ccb67b] text-xs font-mono">{bookingUnit.bhk} BHK • {bookingUnit.project.microMarket}</span>
                </div>

                <div>
                  <label htmlFor="public-visit-slot" className="font-semibold text-slate-300 block mb-1">
                    Preferred Tour Timing Slot
                  </label>
                  <select
                    id="public-visit-slot"
                    name="visitSlot"
                    data-dialog-autofocus
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#ccb67b]"
                  >
                    <option value="This Saturday (11:00 AM)">This Saturday (11:00 AM)</option>
                    <option value="This Saturday (04:00 PM)">This Saturday (04:00 PM)</option>
                    <option value="This Sunday (11:00 AM)">This Sunday (11:00 AM)</option>
                    <option value="This Sunday (04:00 PM)">This Sunday (04:00 PM)</option>
                    <option value="Weekday Evening (06:00 PM)">Weekday Evening (06:00 PM)</option>
                  </select>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed bg-[#1b202c]/60 p-3 rounded-xl border border-slate-800">
                  🚗 ZamZam provides complimentary cab pickup & drop from Kharghar / Mansarovar railway stations for pre-scheduled client visits.
                </p>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setBookingUnit(null)}
                    className="min-h-11 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="min-h-11 px-5 py-2 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] text-[#12151f] text-xs font-extrabold shadow-md flex items-center gap-1.5 hover:brightness-110 transition"
                  >
                    Confirm Visit Request
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </AccessibleDialog>
    </div>
  );
}
