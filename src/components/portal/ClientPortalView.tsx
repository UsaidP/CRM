'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Info,
  Image as ImageIcon,
  Ruler,
  Video,
  X,
  Maximize2,
  Layers,
  ArrowRight,
  UserCheck,
  Calculator,
  Car,
  Home,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { YoutubeIcon, InstagramIcon } from '@/components/icons/SocialIcons';
import { InventoryMediaAsset } from '@/lib/inventory-media';
import { PortalEmiCalculator } from './PortalEmiCalculator';
import { BrandLogo } from '@/components/ui/BrandLogo';

interface ClientPortalViewProps {
  portal: any;
  token: string;
}

export function ClientPortalView({ portal, token }: ClientPortalViewProps) {
  // State for active media tab per unit: 'photos' | 'video' | 'floorplan'
  const [activeMediaTabs, setActiveMediaTabs] = useState<{ [unitId: string]: string }>({});
  
  // State for active photo index per unit
  const [activePhotoIndices, setActivePhotoIndices] = useState<{ [unitId: string]: number }>({});
  
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
    isYouTube?: boolean;
    isInstagram?: boolean;
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

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!lightboxState) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxState(null);
      } else if (e.key === 'ArrowLeft') {
        setLightboxState((prev) => prev ? {
          ...prev,
          currentIndex: (prev.currentIndex - 1 + prev.photos.length) % prev.photos.length,
        } : null);
      } else if (e.key === 'ArrowRight') {
        setLightboxState((prev) => prev ? {
          ...prev,
          currentIndex: (prev.currentIndex + 1) % prev.photos.length,
        } : null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxState]);

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
      try {
        await navigator.share({
          title: portal?.title || 'Zam Zam Properties Curated Selection',
          text: `Review these verified property options curated for ${portal.lead?.fullName || 'you'} by Zam Zam Properties:`,
          url: window.location.href,
        });
        sendTelemetry('PORTAL_SHARE');
        return;
      } catch {
        // Fallback
      }
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      sendTelemetry('PORTAL_SHARE');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setShareError('Please copy the URL directly from your browser bar.');
    }
  };

  const handleBrochureClick = (unit: any) => {
    if (!unit.project?.brochureUrl) return;
    sendTelemetry('BROCHURE_DOWNLOAD', unit.id);
    window.open(unit.project.brochureUrl, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsAppInquiry = (unit: any) => {
    sendTelemetry('WHATSAPP_CLICK', unit.id);
    const advisorName = portal.createdBy?.fullName || 'Zam Zam Advisor';
    const text = `Hi ${advisorName} (Zam Zam Properties), I am reviewing the curated options for ${portal.lead?.fullName || 'my requirement'}:\n\n🏡 *${unit.project.projectName}* - Unit ${unit.unitNumber || 'Selected'}\n📍 ${unit.project.microMarket}\n💰 All-In Price: ₹${(unit.allInTotalCost / 100000).toFixed(2)} Lakhs\n\nCould you please share more details or arrange a site visit?`;
    const phone = portal.createdBy?.phoneE164?.replace(/[^0-9]/g, '') || '919967731071';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleBookVisitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingUnit) return;
    sendTelemetry('VISIT_BOOKING_CLICK', bookingUnit.id);
    setBookedSuccess(true);
    setTimeout(() => {
      setBookedSuccess(false);
      setBookingUnit(null);
    }, 2800);
  };

  // Convert raw youtube url to embed url
  const getEmbedUrl = (rawUrl: string) => {
    if (!rawUrl) return 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    if (rawUrl.includes('/embed/')) return rawUrl;
    
    // YouTube Watch: youtube.com/watch?v=XYZ
    const matchWatch = rawUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/);
    if (matchWatch && matchWatch[1]) {
      return `https://www.youtube.com/embed/${matchWatch[1]}`;
    }
    return rawUrl;
  };

  const openVideoPlayer = (unit: any, videoAsset?: InventoryMediaAsset) => {
    const rawUrl = videoAsset?.url || unit.videoReelUrl || unit.project?.youtubeWalkthroughUrl || 'https://www.youtube.com/watch?v=iM0w7zGftCY';
    const isYouTube = rawUrl.includes('youtube') || rawUrl.includes('youtu.be');
    const isInstagram = rawUrl.includes('instagram.com');
    const embedUrl = getEmbedUrl(rawUrl);
    const title = videoAsset?.title || `${unit.project.projectName} • ${unit.bhk} BHK Host Walkthrough Tour`;
    
    sendTelemetry('VIDEO_PLAY', unit.id);
    setActiveVideoModal({
      unit,
      videoAsset,
      videoUrl: embedUrl,
      title,
      hostName: videoAsset?.hostName || portal.createdBy?.fullName || 'Suhel Patel',
      hostRole: videoAsset?.hostRole || 'Senior Property Specialist • ZamZam Properties',
      isYouTube,
      isInstagram,
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

  const scrollToUnit = (unitId: string) => {
    const el = document.getElementById(`property-card-${unitId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const advisor = portal.createdBy || {
    fullName: 'Suhel Patel',
    phoneE164: '+91 99677 31071',
    email: 'suhel@zamzamproperties.in',
  };

  const unitsCount = portal.portalUnits?.length || 0;

  // Compute price range
  const priceRange = useMemo(() => {
    if (!portal.portalUnits || portal.portalUnits.length === 0) return { min: 0, max: 0 };
    const prices = portal.portalUnits.map((u: any) => u.propertyUnit.allInTotalCost);
    return {
      min: Math.min(...prices) / 100000,
      max: Math.max(...prices) / 100000,
    };
  }, [portal.portalUnits]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-900 font-sans selection:bg-amber-100 selection:text-[#8C641E]">
      {/* Top Advisory Bar with Zam Zam Properties Branding - Light Luxury Theme */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-amber-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo & Advisory Tag */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <BrandLogo
              variant="light"
              mode="horizontal"
              size="sm"
              withRera
              reraNumber={portal.organization?.reraBrokerRegistration ? `MahaRERA: ${portal.organization.reraBrokerRegistration}` : 'MahaRERA A52000028714'}
            />
            <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-[#8C641E] border border-amber-200 shrink-0">
              <ShieldCheck className="w-3 h-3 text-[#8C641E]" />
              Verified Advisory
            </span>
          </div>

          {/* Top Actions: Social Links, Share, Advisor Call */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* YouTube & Instagram Channel Proof Pills */}
            <div className="hidden lg:flex items-center gap-2 mr-1 border-r border-slate-200 pr-3">
              <a
                href="https://www.youtube.com/@zamzamproperties6354"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-xs font-semibold transition"
                title="Watch Project Tours on Zam Zam Properties YouTube"
              >
                <YoutubeIcon className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>YouTube</span>
              </a>
              <a
                href="https://www.instagram.com/zamzamproperties5531/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-pink-50 border border-pink-200 text-pink-700 hover:bg-pink-100 text-xs font-semibold transition"
                title="View Daily Reels on Zam Zam Properties Instagram"
              >
                <InstagramIcon className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                <span>Instagram</span>
              </a>
            </div>

            {/* Share Button */}
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1 sm:gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-amber-300 transition shadow-xs cursor-pointer"
              title="Share this portfolio"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-emerald-700 font-semibold text-[11px] sm:text-xs">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span className="hidden xs:inline text-[11px] sm:text-xs">Share</span>
                </>
              )}
            </button>

            {/* Direct Call Button */}
            <a
              href={`tel:${advisor.phoneE164 || '+919967731071'}`}
              onClick={() => sendTelemetry('CALL_CLICK')}
              className="inline-flex items-center gap-1 sm:gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition shadow-xs"
              title={`Call Advisor: ${advisor.fullName || 'Suhel Patel'}`}
            >
              <PhoneCall className="w-3.5 h-3.5 text-white shrink-0" />
              <span className="text-[11px] sm:text-xs">Call Advisor</span>
            </a>
          </div>
        </div>
      </header>

      {/* Share / Copy error notification */}
      {shareError && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs px-4 py-2 text-center font-medium">
          {shareError}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 sm:space-y-10 pb-28 sm:pb-12">
        {/* HERO SECTION: Client Welcome & Personalization */}
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#FFFDF9] via-[#FAF6EE] to-[#F5EEDB] border border-amber-300/80 p-4 sm:p-8 lg:p-10 shadow-sm text-slate-900">
          <div className="relative z-10 space-y-5 sm:space-y-6 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-0.5 sm:px-3.5 sm:py-1 text-[11px] sm:text-xs font-bold text-[#8C641E] border border-amber-300 shadow-2xs font-serif">
                <Sparkles className="w-3.5 h-3.5 text-[#8C641E]" />
                Private Curated Portfolio
              </span>
              <span className="text-[11px] sm:text-xs text-slate-500 font-mono">
                {unitsCount} Verified {unitsCount === 1 ? 'Property' : 'Properties'} Selected
              </span>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 font-serif leading-tight">
                {portal.title || `Curated Property Portfolio for ${portal.lead?.fullName || 'Client'}`}
              </h1>
              <p className="text-xs sm:text-sm lg:text-base text-slate-600 leading-relaxed font-sans">
                {portal.customMessage ||
                  `Welcome ${portal.lead?.fullName || 'Client'}. Based on your specific preferences for carpet layout, natural light, and budget, we have compiled this comparative overview of verified homes in Kharghar and Taloja.`}
              </p>
            </div>

            {/* Advisor Note Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4.5 rounded-xl sm:rounded-2xl bg-white border border-amber-200/90 shadow-sm">
              <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-[#DFBA73] via-[#B38A38] to-[#8C641E] p-0.5 shadow-sm shrink-0">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-bold text-xs text-[#8C641E]">
                    {advisor.fullName?.split(' ').map((n: string) => n[0]).join('') || 'SP'}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">{advisor.fullName}</span>
                    <span className="text-[10px] text-[#8C641E] font-semibold">• Senior Property Advisor</span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                    Direct: {advisor.phoneE164 || '+91 99677 31071'} • Zam Zam Desk
                  </p>
                </div>
              </div>

              {/* Quick WhatsApp with Advisor */}
              <button
                type="button"
                onClick={() => handleWhatsAppInquiry(portal.portalUnits[0]?.propertyUnit || {})}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Message on WhatsApp</span>
              </button>
            </div>

            {/* Portfolio Key Stats Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 pt-1 sm:pt-2">
              <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white border border-amber-200/80 shadow-2xs">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400 block truncate">Total Options</span>
                <strong className="text-sm sm:text-base font-bold text-slate-900 block mt-0.5 truncate">{unitsCount} Handpicked Homes</strong>
              </div>
              <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white border border-amber-200/80 shadow-2xs">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400 block truncate">Price Range</span>
                <strong className="text-sm sm:text-base font-bold text-[#8C641E] block mt-0.5 truncate">
                  ₹{priceRange.min.toFixed(2)}L – ₹{priceRange.max.toFixed(2)}L
                </strong>
              </div>
              <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white border border-amber-200/80 shadow-2xs">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400 block truncate">Configuration</span>
                <strong className="text-sm sm:text-base font-bold text-slate-900 block mt-0.5 truncate">2 BHK Layouts</strong>
              </div>
              <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white border border-amber-200/80 shadow-2xs">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400 block truncate">Corridor</span>
                <strong className="text-sm sm:text-base font-bold text-slate-900 block mt-0.5 truncate">Taloja Ph-2 • Navi Mumbai</strong>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: Quick Side-by-Side Comparison Overview */}
        {unitsCount > 1 && (
          <section className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
              <div>
                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 font-serif flex items-center gap-2">
                  <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-[#8C641E]" />
                  Quick Comparison at a Glance
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Compare your curated options side-by-side to find the ideal match for your family.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {portal.portalUnits.map((item: any, idx: number) => {
                const u = item.propertyUnit;
                const p = u.project;
                const photos = (u.mediaGallery || []).filter((m: any) => m.kind === 'image');
                const coverImg = photos[0]?.url || p.coverImageUrl || '/images/projects/today-callisto-taloja-phase-2-sec21/cover.jpg';

                return (
                  <div
                    key={u.id}
                    className="rounded-2xl bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md p-3.5 sm:p-5 transition-all shadow-xs space-y-3 sm:space-y-4 group cursor-pointer text-slate-900"
                    onClick={() => scrollToUnit(u.id)}
                  >
                    <div className="flex items-start gap-3 sm:gap-3.5">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 relative">
                        <img src={coverImg} alt={p.projectName} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-slate-900/80 text-[9px] font-bold text-white">
                          #{idx + 1}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate font-serif">{p.projectName}</span>
                          {item.brokerHighlight && (
                            <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-[#8C641E] border border-amber-200 font-semibold truncate">
                              {item.brokerHighlight}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#8C641E] shrink-0" />
                          <span className="truncate">{p.microMarket}</span>
                        </p>
                        <div className="mt-1 flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
                          <strong className="text-sm sm:text-base font-bold text-[#8C641E] font-mono">
                            ₹{(u.allInTotalCost / 100000).toFixed(2)} Lakhs
                          </strong>
                          <span className="text-[10px] text-slate-500 font-mono">All-Inclusive</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-2 border-t border-slate-100 text-[10px] sm:text-[11px]">
                      <div className="truncate">
                        <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase font-semibold">Carpet Area</span>
                        <strong className="text-slate-800 font-medium truncate block">{u.carpetAreaSqft} sq.ft</strong>
                      </div>
                      <div className="truncate">
                        <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase font-semibold">Floor & Facing</span>
                        <strong className="text-slate-800 font-medium truncate block">Fl {u.floorNumber} • {u.facing?.replace('_', ' ')}</strong>
                      </div>
                      <div className="truncate">
                        <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase font-semibold">To Metro</span>
                        <strong className="text-slate-800 font-medium truncate block">{p.distanceToMetroKm || 1.6} km</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToUnit(u.id);
                      }}
                      className="w-full py-2 rounded-xl bg-slate-50 hover:bg-amber-50 hover:text-[#8C641E] text-xs font-bold text-slate-700 border border-slate-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <span className="truncate">Explore Detailed Unit Specs & Walkthrough</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#8C641E] shrink-0" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* SECTION: Curated Property Details Cards */}
        <section className="space-y-8 sm:space-y-12">
          <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-end justify-between gap-1.5 sm:gap-2">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#8C641E] font-mono">
                Verified Inventory Showcase
              </span>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 font-serif mt-0.5">
                Detailed Property Cards ({unitsCount})
              </h2>
            </div>
            <span className="text-[11px] sm:text-xs text-slate-500 font-mono">
              Live Verified Pricing • Ground Audited by Zam Zam
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
                caption: `${unit.carpetAreaSqft} sq.ft usable carpet layout`,
                category: 'floorplan',
              });
            }
            const primaryFloorPlan = floorPlans[0];

            const videos = allMedia.filter((m) => m.kind === 'video');
            const primaryVideo = videos[0] || (unit.videoReelUrl || project.youtubeWalkthroughUrl ? {
              id: `video-reel-${unit.id}`,
              url: unit.videoReelUrl || project.youtubeWalkthroughUrl,
              kind: 'video' as const,
              title: `${project.projectName} ${unit.bhk} BHK Host Walkthrough Tour`,
              hostName: advisor.fullName || 'Suhel Patel',
              hostRole: 'Senior Property Specialist • Zam Zam Properties',
              duration: '1:15',
              posterUrl: photos[0]?.url || project.coverImageUrl || '/images/projects/today-callisto-taloja-phase-2-sec21/cover.jpg',
            } : null);

            const activeTab = activeMediaTabs[unit.id] || 'photos';
            const activePhotoIdx = activePhotoIndices[unit.id] || 0;
            const activePhoto = photos[activePhotoIdx] || photos[0];

            return (
              <article
                key={unit.id}
                id={`property-card-${unit.id}`}
                className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white shadow-md overflow-hidden transition-all hover:border-amber-300 space-y-0 text-slate-900"
              >
                {/* Top Option Ribbon - Light Luxury */}
                <div className="bg-gradient-to-r from-amber-50/80 via-white to-amber-50/80 border-b border-amber-200/80 px-4 py-3 sm:px-6 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <span className="rounded-full bg-white border border-amber-300 px-3 py-0.5 sm:px-3.5 sm:py-1 text-xs font-extrabold text-[#8C641E] font-serif shadow-2xs">
                      Option {String(index + 1).padStart(2, '0')} of {String(unitsCount).padStart(2, '0')}
                    </span>
                    {item.brokerHighlight && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-amber-100/70 border border-amber-300 text-[#8C641E] text-xs font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-[#8C641E]" />
                        {item.brokerHighlight}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-600">
                    <a
                      href="https://maharera.maharashtra.gov.in/projects-search-result"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-mono px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors max-w-full truncate"
                      title="Click to verify this project directly on the official Government of Maharashtra MahaRERA portal"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">MahaRERA: <strong className="text-emerald-950 font-bold">{project.reraNumber}</strong></span>
                      <ExternalLink className="w-3 h-3 text-emerald-600 opacity-70 shrink-0" />
                    </a>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md border border-emerald-200/60 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Verified
                    </span>
                  </div>
                </div>

                {/* Media Hub with High-Res Switcher */}
                <div className="bg-slate-50 p-3 sm:p-6 space-y-3 sm:space-y-4">
                  {/* Category Switcher Tabs */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5 sm:pb-3">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveMediaTabs((prev) => ({ ...prev, [unit.id]: 'photos' }))}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          activeTab === 'photos'
                            ? 'bg-gradient-to-r from-[#B38A38] to-[#8C641E] text-white shadow-xs font-bold'
                            : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200'
                        }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        HD Photos ({photos.length})
                      </button>

                      {primaryVideo && (
                        <button
                          type="button"
                          onClick={() => setActiveMediaTabs((prev) => ({ ...prev, [unit.id]: 'video' }))}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeTab === 'video'
                              ? 'bg-gradient-to-r from-[#B38A38] to-[#8C641E] text-white shadow-xs font-bold'
                              : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200'
                          }`}
                        >
                          <Video className="w-3.5 h-3.5 text-red-600" />
                          Video Tour
                        </button>
                      )}

                      {primaryFloorPlan && (
                        <button
                          type="button"
                          onClick={() => setActiveMediaTabs((prev) => ({ ...prev, [unit.id]: 'floorplan' }))}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeTab === 'floorplan'
                              ? 'bg-gradient-to-r from-[#B38A38] to-[#8C641E] text-white shadow-xs font-bold'
                              : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200'
                          }`}
                        >
                          <Ruler className="w-3.5 h-3.5" />
                          Floor Plan
                        </button>
                      )}
                    </div>

                    {/* Social proof tag */}
                    <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#8C641E] font-medium">
                      <YoutubeIcon className="w-3.5 h-3.5 text-red-600" />
                      <span>Verified Ground Video</span>
                    </div>
                  </div>

                  {/* TAB 1: HD PHOTO GALLERY */}
                  {activeTab === 'photos' && (
                    <div className="space-y-2.5 sm:space-y-3">
                      <div className="relative aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9] rounded-xl sm:rounded-2xl overflow-hidden group border border-slate-200 bg-slate-100 shadow-inner">
                        {photos.length > 0 ? (
                          <>
                            <img
                              src={activePhoto?.url}
                              alt={activePhoto?.title || `${project.projectName} Photo`}
                              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 cursor-pointer"
                              onClick={() => openLightbox(unit, photos, activePhotoIdx)}
                            />

                            {/* Top Badges */}
                            <div className="absolute left-2.5 top-2.5 sm:left-3 sm:top-3 flex flex-wrap gap-1.5 sm:gap-2 z-10">
                              <span className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-white/95 border border-amber-300 text-[#8C641E] font-bold text-[11px] sm:text-xs backdrop-blur-md shadow-sm font-serif">
                                {unit.bhk} BHK • {unit.carpetAreaSqft} sq.ft
                              </span>
                              <span className="hidden xs:inline-block px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-emerald-50/95 border border-emerald-300 text-emerald-800 font-semibold text-[11px] sm:text-xs backdrop-blur-md shadow-sm">
                                🟢 Ready OC (0% GST)
                              </span>
                            </div>

                            {/* Bottom Caption Overlay with Fullscreen Button */}
                            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 sm:gap-3 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent px-3 sm:px-4 pb-2.5 sm:pb-3.5 pt-12 sm:pt-16">
                              <div className="min-w-0">
                                <p className="truncate text-xs sm:text-base font-bold text-white font-serif">
                                  {activePhoto?.title || `${project.projectName} • Unit ${unit.unitNumber || 'Selected'}`}
                                </p>
                                <p className="mt-0.5 text-[10px] sm:text-xs text-slate-200 line-clamp-1">
                                  {activePhoto?.caption || 'Verified architectural view • Kharghar & Taloja Sector'}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => openLightbox(unit, photos, activePhotoIdx)}
                                className="inline-flex items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl border border-white/40 bg-black/60 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold text-white backdrop-blur hover:bg-black/80 transition shrink-0 shadow-sm cursor-pointer"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                                <span className="hidden xs:inline">Zoom HD</span>
                              </button>
                            </div>

                            {/* Navigation Arrows */}
                            {photos.length > 1 && (
                              <>
                                <button
                                  type="button"
                                  aria-label="Previous photo"
                                  onClick={() => handlePhotoNav(unit.id, 'prev', photos.length)}
                                  className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 grid place-items-center rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md transition-all active:scale-95 border border-slate-200 cursor-pointer"
                                >
                                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                                <button
                                  type="button"
                                  aria-label="Next photo"
                                  onClick={() => handlePhotoNav(unit.id, 'next', photos.length)}
                                  className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 grid place-items-center rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md transition-all active:scale-95 border border-slate-200 cursor-pointer"
                                >
                                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                                <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/90 backdrop-blur-md text-[10px] sm:text-xs text-slate-800 font-mono border border-slate-200 shadow-sm">
                                  {activePhotoIdx + 1} / {photos.length}
                                </div>
                              </>
                            )}
                          </>
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-slate-400">
                            <Building2 className="h-10 w-10 text-[#8C641E]" />
                            <p className="text-sm">Verified photos curated by advisor</p>
                          </div>
                        )}
                      </div>

                      {/* Filmstrip Scrubber */}
                      {photos.length > 1 && (
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5 sm:gap-2 pt-1">
                          {photos.map((photo, pIdx) => (
                            <button
                              key={photo.id || pIdx}
                              type="button"
                              onClick={() => {
                                setActivePhotoIndices((prev) => ({ ...prev, [unit.id]: pIdx }));
                                sendTelemetry('PHOTO_SWIPE', unit.id);
                              }}
                              className={`relative aspect-[4/3] rounded-lg sm:rounded-xl overflow-hidden border transition-all cursor-pointer ${
                                activePhotoIdx === pIdx
                                  ? 'border-[#8C641E] ring-2 ring-amber-300 scale-[1.03]'
                                  : 'border-slate-200 opacity-70 hover:opacity-100'
                              }`}
                            >
                              <img src={photo.url} alt="" className="h-full w-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: VIDEO REEL / WALKTHROUGH */}
                  {activeTab === 'video' && primaryVideo && (
                    <div className="space-y-3 sm:space-y-4">
                      <div className="relative aspect-[16/9] sm:aspect-[21/9] rounded-xl sm:rounded-2xl overflow-hidden border border-amber-200 bg-slate-900 group shadow-md">
                        <img
                          src={primaryVideo.posterUrl || photos[0]?.url || '/images/projects/today-callisto-taloja-phase-2-sec21/cover.jpg'}
                          alt={primaryVideo.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-75"
                        />

                        {/* Play Overlay */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-6 text-center bg-black/40 backdrop-blur-[2px]">
                          <button
                            type="button"
                            onClick={() => openVideoPlayer(unit, primaryVideo)}
                            className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-tr from-[#DFBA73] via-[#B38A38] to-[#8C641E] flex items-center justify-center text-white shadow-xl transform transition hover:scale-110 active:scale-95 border-2 border-white cursor-pointer"
                            aria-label="Play Host Video Walkthrough"
                          >
                            <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-white text-white ml-0.5 sm:ml-1" />
                          </button>

                          <div className="mt-3 sm:mt-4 max-w-lg">
                            <h4 className="text-sm sm:text-lg lg:text-xl font-bold text-white font-serif">
                              {primaryVideo.title}
                            </h4>
                            <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-slate-200">
                              Watch the full ground review by Zam Zam Properties
                            </p>
                          </div>

                          <div className="mt-2.5 sm:mt-3 inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-white/95 border border-slate-200 text-[10px] sm:text-xs text-slate-800 shadow-sm">
                            <UserCheck className="w-3.5 h-3.5 text-[#8C641E]" />
                            <span>Presented by: <strong className="text-[#8C641E]">{primaryVideo.hostName || advisor.fullName}</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: FLOOR PLAN & DIMENSIONS */}
                  {activeTab === 'floorplan' && (
                    <div className="space-y-3 sm:space-y-4">
                      {primaryFloorPlan && (
                        <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 bg-white p-3 sm:p-6 shadow-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 sm:pb-3 mb-3 sm:mb-4">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-amber-50 border border-amber-200 text-[#8C641E] font-mono text-[10px] sm:text-xs font-bold">
                                SANCTIONED PLAN
                              </span>
                              <span className="text-xs sm:text-sm text-slate-800 font-serif font-bold">
                                {unit.bhk} BHK Layout ({unit.carpetAreaSqft} sq.ft)
                              </span>
                            </div>
                            <div className="text-[11px] sm:text-xs text-[#8C641E] font-mono font-semibold">
                              Vastu Facing: <strong className="text-slate-900">{unit.facing?.replace('_', ' ')}</strong>
                            </div>
                          </div>

                          <div className="relative aspect-[16/10] w-full rounded-xl bg-slate-50 border border-slate-200 p-2 overflow-hidden flex items-center justify-center">
                            <img
                              src={primaryFloorPlan.url}
                              alt={primaryFloorPlan.title || 'Floor Plan'}
                              className="max-h-full max-w-full object-contain cursor-pointer"
                              onClick={() => openLightbox(unit, [primaryFloorPlan], 0)}
                            />
                            <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3">
                              <button
                                type="button"
                                onClick={() => openLightbox(unit, [primaryFloorPlan], 0)}
                                className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] sm:text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                                <span>Expand Plan</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Room Dimensions Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs">
                          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block">Living & Dining</span>
                          <strong className="text-xs sm:text-sm font-bold text-slate-900 block mt-0.5">11&apos;0&quot; × 17&apos;6&quot;</strong>
                          <span className="text-[9px] sm:text-[10px] text-slate-500">Balcony attached</span>
                        </div>
                        <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs">
                          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block">Master Bedroom</span>
                          <strong className="text-xs sm:text-sm font-bold text-slate-900 block mt-0.5">11&apos;0&quot; × 13&apos;0&quot;</strong>
                          <span className="text-[9px] sm:text-[10px] text-slate-500">Attached bathroom</span>
                        </div>
                        <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs">
                          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block">Modular Kitchen</span>
                          <strong className="text-xs sm:text-sm font-bold text-slate-900 block mt-0.5">8&apos;0&quot; × 10&apos;0&quot;</strong>
                          <span className="text-[9px] sm:text-[10px] text-slate-500">Dry utility area</span>
                        </div>
                        <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs">
                          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block">French Balcony</span>
                          <strong className="text-xs sm:text-sm font-bold text-[#8C641E] block mt-0.5">5&apos;0&quot; × 11&apos;0&quot;</strong>
                          <span className="text-[9px] sm:text-[10px] text-slate-500">Open scenic view</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Property Details, Pricing & Transparent Math */}
                <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
                  {/* Title & All-In Price Bar */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 sm:pb-6 border-b border-slate-200">
                    <div className="space-y-1 sm:space-y-1.5">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#8C641E] font-serif">
                          {unit.bhk} BHK • Unit {unit.unitNumber || 'Selected'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-emerald-700 font-semibold">Ready Possession with Full OC</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 font-serif tracking-tight">
                        {project.projectName}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#8C641E] shrink-0" />
                        <span>{project.microMarket} • {project.distanceToMetroKm ? `${project.distanceToMetroKm} km to Metro` : 'Near Metro'}</span>
                      </p>
                    </div>

                    {/* All-In Pricing Box - Light Luxury Theme */}
                    <div className="w-full md:w-auto p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50 via-amber-100/50 to-white border border-amber-300/80 md:text-right space-y-1 shadow-sm shrink-0">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block font-mono">
                        Total All-Inclusive On-Road Price
                      </span>
                      <strong className="text-2xl sm:text-3xl font-extrabold text-[#8C641E] font-mono block">
                        ₹{(unit.allInTotalCost / 100000).toFixed(2)} Lakhs
                      </strong>
                      <div className="flex items-center md:justify-end gap-2 text-xs text-slate-600">
                        <span>Base: ₹{(unit.agreementValue / 100000).toFixed(2)}L</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-emerald-700 font-semibold">0% GST (OC Ready)</span>
                      </div>
                      <div className="pt-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-[11px] text-[#8C641E] font-semibold shadow-xs">
                          <Calculator className="w-3 h-3 text-[#8C641E]" />
                          Approx. ₹{Math.round(((unit.allInTotalCost || unit.agreementValue || 4500000) * 0.8 * (0.085 / 12 * Math.pow(1 + 0.085 / 12, 240)) / (Math.pow(1 + 0.085 / 12, 240) - 1))).toLocaleString('en-IN')}/mo EMI
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Why this property matches your checklist */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 pb-5 sm:pb-6 border-b border-slate-200">
                    {/* Left: About & Project Highlights */}
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C641E] mb-2 font-serif flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-[#8C641E]" />
                          Advisor Checklist & Highlights
                        </h4>
                        <ul className="space-y-2 text-xs text-slate-700">
                          <li className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span><strong>Full Occupancy Certificate (OC):</strong> 100% legal clearance with 0% GST liability.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span><strong>Prime Connectivity:</strong> Only {project.distanceToMetroKm || 1.6} km from Metro Station & central 24m road.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span><strong>Vastu Compliant:</strong> {unit.facing?.replace('_', ' ')} entrance orientation with natural cross-ventilation.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span><strong>Floor Level:</strong> High floor ({unit.floorNumber} of {unit.totalFloors}) with unobstructed panoramic views.</span>
                          </li>
                        </ul>
                      </div>

                      {unit.description && (
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                          <strong className="text-slate-900 block mb-1">Advisor's Notes on Unit {unit.unitNumber || ''}:</strong>
                          {unit.description}
                        </div>
                      )}
                    </div>

                    {/* Right: Key Specs 6-Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 self-start">
                      <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 font-mono block font-semibold truncate">Configuration</span>
                        <strong className="text-xs font-bold text-slate-900 block mt-0.5 truncate">{unit.bhk} BHK Luxury</strong>
                      </div>
                      <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 font-mono block font-semibold truncate">Carpet Area</span>
                        <strong className="text-xs font-bold text-[#8C641E] block mt-0.5 truncate">{unit.carpetAreaSqft} sq.ft</strong>
                      </div>
                      <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 font-mono block font-semibold truncate">Baths / Deck</span>
                        <strong className="text-xs font-bold text-slate-900 block mt-0.5 truncate">{unit.bathrooms} Baths • {unit.balconies} Deck</strong>
                      </div>
                      <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 font-mono block font-semibold truncate">Floor Level</span>
                        <strong className="text-xs font-bold text-slate-900 block mt-0.5 truncate">Floor {unit.floorNumber} / {unit.totalFloors}</strong>
                      </div>
                      <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 font-mono block font-semibold truncate">Facing</span>
                        <strong className="text-xs font-bold text-[#8C641E] block mt-0.5 truncate">{unit.facing?.replace('_', ' ')}</strong>
                      </div>
                      <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 font-mono block font-semibold truncate">Metro Distance</span>
                        <strong className="text-xs font-bold text-slate-900 block mt-0.5 truncate">{project.distanceToMetroKm || 1.6} km</strong>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Home Loan & EMI Simulator */}
                  <PortalEmiCalculator
                    unit={unit}
                    projectName={project.projectName}
                    advisorPhone={advisor.phoneE164}
                  />

                  {/* Society Lifestyle Amenities */}
                  {unit.amenities?.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                        Clubhouse & Podium Amenities:
                      </span>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {unit.amenities.map((am: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-[11px] sm:text-xs font-medium">
                            ✨ {am}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons Hub */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        if (project.brochureUrl) {
                          handleBrochureClick(unit);
                        } else {
                          sendTelemetry('BROCHURE_DOWNLOAD', unit.id);
                          window.print();
                        }
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-xs cursor-pointer"
                      title={project.brochureUrl ? 'Download Developer Brochure (PDF)' : 'Print / Export ZamZam Property Dossier (PDF)'}
                    >
                      <Download className="w-4 h-4 text-[#8C641E]" />
                      <span>{project.brochureUrl ? 'Download Brochure (PDF)' : 'Export Property Dossier (PDF)'}</span>
                    </button>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      {primaryVideo && (
                        <button
                          type="button"
                          onClick={() => openVideoPlayer(unit, primaryVideo)}
                          className="flex-1 sm:flex-initial rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer min-w-[110px]"
                        >
                          <Play className="w-3.5 h-3.5 text-red-600" />
                          <span>Watch Tour</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setBookingUnit(unit)}
                        className="flex-1 sm:flex-initial rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100/80 px-3.5 py-2.5 text-xs font-bold text-[#8C641E] flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer min-w-[130px]"
                      >
                        <Calendar className="w-3.5 h-3.5 text-[#8C641E]" />
                        <span>Book Physical Visit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleWhatsAppInquiry(unit)}
                        className="w-full xs:w-auto flex-1 sm:flex-initial rounded-xl bg-gradient-to-r from-[#B38A38] to-[#8C641E] px-4 sm:px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:brightness-105 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer min-w-[140px]"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Ask on WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {/* Footer Advisory & Social Proof */}
        <footer className="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-slate-200 space-y-5 sm:space-y-6 text-center text-xs text-slate-500">
          <div className="max-w-md mx-auto p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
            <BrandLogo variant="light" size="lg" withRera={false} />
            <p className="text-[11px] text-[#8C641E] font-medium">Navi Mumbai’s Leading Verified Real Estate Consultancy</p>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
              Have questions about registration, title deed, or loan sanction? Speak directly with your dedicated advisor <strong>{advisor.fullName}</strong>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 pt-2 max-w-sm mx-auto">
              <a
                href={`tel:${advisor.phoneE164 || '+919967731071'}`}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-600 text-xs font-bold transition shadow-xs"
              >
                <PhoneCall className="w-3.5 h-3.5 text-white shrink-0" />
                <span>Call Advisor</span>
              </a>
              <a
                href="https://www.youtube.com/@zamzamproperties6354"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-xs font-bold transition shadow-xs"
              >
                <YoutubeIcon className="w-3.5 h-3.5 text-red-600" />
                <span>YouTube</span>
              </a>
              <a
                href="https://www.instagram.com/zamzamproperties5531/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-pink-50 border border-pink-200 text-pink-700 hover:bg-pink-100 text-xs font-bold transition shadow-xs"
              >
                <InstagramIcon className="w-3.5 h-3.5 text-pink-600" />
                <span>Instagram</span>
              </a>
            </div>
          </div>

          <p className="text-[10px] sm:text-[11px] text-slate-400 max-w-2xl mx-auto px-2">
            Disclaimer: All property dimensions, statutory fees, and availability are verified against sanctioned MahaRERA records. Pricing is subject to developer confirmation at the time of token booking.
          </p>
        </footer>
      </main>

      {/* Floating Bottom Quick Action Bar on Mobile/Tablet */}
      <div className="fixed bottom-0 inset-x-0 z-30 sm:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200 p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-lg">
        <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
          <div className="min-w-0 flex-1">
            <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Curated For You</span>
            <strong className="text-xs font-bold text-[#8C641E] truncate block">
              {unitsCount} Options • From ₹{priceRange.min.toFixed(2)}L
            </strong>
          </div>

          <button
            type="button"
            onClick={() => setBookingUnit(portal.portalUnits[0]?.propertyUnit || null)}
            className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-[#8C641E] text-xs font-bold shrink-0 shadow-xs cursor-pointer"
          >
            Book Visit
          </button>

          <button
            type="button"
            onClick={() => handleWhatsAppInquiry(portal.portalUnits[0]?.propertyUnit || {})}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#B38A38] to-[#8C641E] text-white text-xs font-extrabold flex items-center gap-1 shrink-0 shadow-sm cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>

      {/* MODAL 1: Interactive Video Walkthrough Player */}
      <AccessibleDialog
        open={Boolean(activeVideoModal)}
        onClose={() => setActiveVideoModal(null)}
        titleId="video-modal-title"
        descriptionId="video-modal-description"
        size="xl"
        panelClassName="p-0 rounded-3xl border border-slate-200 shadow-2xl overflow-hidden bg-white"
      >
        {activeVideoModal && (
          <div>
            <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                  <YoutubeIcon className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <h3 id="video-modal-title" className="text-sm sm:text-base font-bold text-slate-900 font-serif">
                    {activeVideoModal.title}
                  </h3>
                  <p id="video-modal-description" className="text-[11px] text-[#8C641E] font-medium">
                    Presented by {activeVideoModal.hostName} ({activeVideoModal.hostRole})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveVideoModal(null)}
                className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 grid place-items-center text-slate-600 hover:text-slate-900 cursor-pointer"
                aria-label="Close walkthrough video"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={`${activeVideoModal.videoUrl}?autoplay=1&rel=0`}
                title={activeVideoModal.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <a
                  href="https://www.youtube.com/@zamzamproperties6354"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-xs font-semibold transition shadow-2xs"
                >
                  <YoutubeIcon className="w-3.5 h-3.5 text-red-600" />
                  <span>YouTube</span>
                </a>
                <a
                  href="https://www.instagram.com/zamzamproperties5531/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-50 border border-pink-200 text-pink-700 hover:bg-pink-100 text-xs font-semibold transition shadow-2xs"
                >
                  <InstagramIcon className="w-3.5 h-3.5 text-pink-600" />
                  <span>Instagram</span>
                </a>
              </div>

              <button
                type="button"
                onClick={() => {
                  const unit = activeVideoModal.unit;
                  setActiveVideoModal(null);
                  setBookingUnit(unit);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#B38A38] to-[#8C641E] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer hover:brightness-105"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Schedule Ground Visit</span>
              </button>
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
        panelClassName="p-0 rounded-3xl border border-slate-200 shadow-2xl overflow-hidden bg-white"
      >
        {lightboxState && (
          <div>
            <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 id="lightbox-modal-title" className="text-sm font-bold text-slate-900 font-serif">
                  {lightboxState.photos[lightboxState.currentIndex]?.title || 'Property Photography'}
                </h3>
                <p id="lightbox-modal-description" className="text-[11px] text-slate-500 font-mono">
                  {lightboxState.unit?.project?.projectName} • Image {lightboxState.currentIndex + 1} of {lightboxState.photos.length}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setLightboxState(null)}
                className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 grid place-items-center text-slate-600 hover:text-slate-900 cursor-pointer"
                aria-label="Close photo lightbox"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-[16/10] w-full bg-slate-950 flex items-center justify-center p-2">
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
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 hover:bg-white text-slate-800 grid place-items-center border border-slate-200 shadow-md backdrop-blur cursor-pointer"
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
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 hover:bg-white text-slate-800 grid place-items-center border border-slate-200 shadow-md backdrop-blur cursor-pointer"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {lightboxState.photos[lightboxState.currentIndex]?.caption && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-700">
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
        panelClassName="p-6 rounded-3xl border border-slate-200 shadow-2xl space-y-4 bg-white"
      >
        {bookingUnit && (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 id="public-booking-title" className="font-bold text-slate-900 text-base flex items-center gap-2 font-serif">
                  <Calendar className="w-4 h-4 text-[#8C641E]" />
                  Schedule Free Physical Site Visit
                </h2>
                <p id="public-booking-description" className="mt-1 text-[11px] text-slate-500">
                  Select your preferred Saturday/Sunday tour timing slot.
                </p>
              </div>
              <button
                type="button"
                data-dialog-close
                aria-label="Close site visit request"
                onClick={() => setBookingUnit(null)}
                className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 grid place-items-center text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {bookedSuccess ? (
              <div className="p-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <h4 className="font-bold text-slate-900 text-base font-serif">Visit Request Confirmed!</h4>
                <p className="text-xs text-slate-600">
                  Your Zam Zam advisor (<strong>{advisor.fullName}</strong>) will confirm your pickup cab & itinerary on WhatsApp shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleBookVisitSubmit} className="space-y-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 text-[10px] block uppercase font-mono font-semibold">Selected Property:</span>
                  <strong className="text-slate-900 text-sm block font-serif">{bookingUnit.project.projectName}</strong>
                  <span className="text-[#8C641E] text-xs font-mono font-semibold">{bookingUnit.bhk} BHK • {bookingUnit.project.microMarket}</span>
                </div>

                <div>
                  <label htmlFor="public-visit-slot" className="font-semibold text-slate-700 block mb-1">
                    Preferred Tour Timing Slot
                  </label>
                  <select
                    id="public-visit-slot"
                    name="visitSlot"
                    data-dialog-autofocus
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#8C641E] focus:ring-1 focus:ring-[#8C641E]"
                  >
                    <option value="This Saturday (11:00 AM)">This Saturday (11:00 AM)</option>
                    <option value="This Saturday (04:00 PM)">This Saturday (04:00 PM)</option>
                    <option value="This Sunday (11:00 AM)">This Sunday (11:00 AM)</option>
                    <option value="This Sunday (04:00 PM)">This Sunday (04:00 PM)</option>
                    <option value="Weekday Evening (06:00 PM)">Weekday Evening (06:00 PM)</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] text-slate-700 flex items-start gap-2.5">
                  <Car className="w-4 h-4 text-[#8C641E] shrink-0 mt-0.5" />
                  <span>
                    🚗 <strong>Complimentary Station Cab:</strong> Zam Zam provides free cab pickup & drop from Kharghar or Mansarovar railway station for your family.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setBookingUnit(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#B38A38] to-[#8C641E] text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 hover:brightness-105 transition cursor-pointer"
                  >
                    <span>Confirm Visit Slot</span>
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
