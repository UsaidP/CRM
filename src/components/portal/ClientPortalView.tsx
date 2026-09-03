'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
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
  Play,
  Sparkles,
  CheckCircle2,
  Info,
  Layers,
  ArrowRight,
  UserCheck,
  Calculator,
  Car,
  Home,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { YoutubeIcon, InstagramIcon } from '@/components/icons/SocialIcons';
import { InventoryMediaAsset } from '@/lib/inventory-media';
import { formatLakhCr, formatIndianRupees } from '@/lib/money';

// Subcomponents
import { PortalHeader } from './PortalHeader';
import { PortalHero } from './PortalHero';
import { PortalComparisonTray } from './PortalComparisonTray';
import { PropertyCard } from './PropertyCard';
import { PortalVideoModal } from './PortalVideoModal';
import { PortalLightboxModal } from './PortalLightboxModal';
import { PortalBookingModal } from './PortalBookingModal';
import { PortalDossierModal } from './PortalDossierModal';
import { PortalStickyDock } from './PortalStickyDock';

interface ClientPortalViewProps {
  portal: any;
  token: string;
}

export function ClientPortalView({ portal, token }: ClientPortalViewProps) {
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

  // Digital Property Dossier Modal State (Client-Safe Broker Shield)
  const [activeDossierUnit, setActiveDossierUnit] = useState<any | null>(null);

  // Full Comparison Modal State
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

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

  const handleShare = async () => {
    sendTelemetry('PORTAL_SHARE');
    setShareError(null);
    if (navigator.share) {
      try {
        await navigator.share({
          title: portal?.title || 'ZamZam Properties Curated Selection',
          text: `Review these verified property options curated for ${
            portal.lead?.fullName || 'you'
          } by ZamZam Properties:`,
          url: window.location.href,
        });
        sendTelemetry('PORTAL_SHARE');
        return;
      } catch {
        // Fallback to clipboard
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

  const advisor = useMemo(() => {
    // 1. Creator of the portal (exact user who generated it)
    if (portal.createdBy && (portal.createdBy.fullName || portal.createdBy.phoneE164)) {
      return {
        fullName: portal.createdBy.fullName,
        phoneE164: portal.createdBy.phoneE164,
        email: portal.createdBy.email,
        role: portal.createdBy.role,
      };
    }
    // 2. Assigned Lead Broker fallback
    if (portal.lead?.assignedBroker && (portal.lead.assignedBroker.fullName || portal.lead.assignedBroker.phoneE164)) {
      return {
        fullName: portal.lead.assignedBroker.fullName,
        phoneE164: portal.lead.assignedBroker.phoneE164,
        email: portal.lead.assignedBroker.email,
        role: portal.lead.assignedBroker.role,
      };
    }
    // 3. Organization Default
    return {
      fullName: portal.organization?.name ? `${portal.organization.name} Advisory Desk` : 'Property Advisor',
      phoneE164: '+91 99677 31071',
      email: 'advisory@zamzamproperties.in',
      role: 'Senior Property Advisor',
    };
  }, [portal]);

  const handleBrochureClick = (unit: any) => {
    sendTelemetry('BROCHURE_DOWNLOAD', unit.id);
    setActiveDossierUnit(unit);
  };

  const handleWhatsAppInquiry = (unit: any) => {
    sendTelemetry('WHATSAPP_CLICK', unit?.id);
    const advisorName = advisor.fullName || 'Property Advisor';
    const clientName = portal.lead?.fullName || 'my requirement';
    const propertySummary = unit?.project?.projectName
      ? `\n\n🏡 *${unit.project.projectName}* - Unit ${unit.unitNumber || 'Selected'}\n📍 ${unit.project.microMarket || 'Navi Mumbai'}\n💰 All-In Price: ${formatLakhCr(unit.allInTotalCost || 0)} (${formatIndianRupees(unit.allInTotalCost || 0)})`
      : '';
    const text = `Hi ${advisorName} (${portal.organization?.name || 'ZamZam Properties'}), I am reviewing the curated options for ${clientName}:${propertySummary}\n\nCould you please share more details or arrange a site visit?`;
    const phone = (advisor.phoneE164 || '').replace(/[^0-9]/g, '') || '919967731071';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleBookVisitSubmit = (unit: any, slot: string, needsCab: boolean) => {
    sendTelemetry('VISIT_BOOKING_CLICK', unit?.id);
    const advisorName = advisor.fullName || 'Property Advisor';
    const cabNote = needsCab ? ' (Includes station pickup cab)' : '';
    const text = `Hi ${advisorName} (${portal.organization?.name || 'ZamZam Properties'}), I would like to schedule a physical site visit for:\n\n🏡 *${
      unit?.project?.projectName || 'Shortlisted Property'
    }*\n📅 Preferred Slot: ${slot}${cabNote}\n👤 Name: ${portal.lead?.fullName || 'Client'}\n\nPlease confirm the itinerary.`;
    const phone = (advisor.phoneE164 || '').replace(/[^0-9]/g, '') || '919967731071';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Convert raw youtube url to embed url
  const getEmbedUrl = (rawUrl: string) => {
    if (!rawUrl) return 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    if (rawUrl.includes('/embed/')) return rawUrl;

    const matchWatch = rawUrl.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/
    );
    if (matchWatch && matchWatch[1]) {
      return `https://www.youtube.com/embed/${matchWatch[1]}`;
    }
    return rawUrl;
  };

  const openVideoPlayer = (unit: any, videoAsset?: InventoryMediaAsset) => {
    const rawUrl =
      videoAsset?.url ||
      unit.videoReelUrl ||
      unit.project?.youtubeWalkthroughUrl ||
      'https://www.youtube.com/watch?v=iM0w7zGftCY';
    const isYouTube = rawUrl.includes('youtube') || rawUrl.includes('youtu.be');
    const isInstagram = rawUrl.includes('instagram.com');
    const embedUrl = getEmbedUrl(rawUrl);
    const title =
      videoAsset?.title || `${unit.project.projectName} • ${unit.bhk} BHK Host Walkthrough Tour`;

    sendTelemetry('VIDEO_PLAY', unit.id);
    setActiveVideoModal({
      unit,
      videoAsset,
      videoUrl: embedUrl,
      title,
      hostName: videoAsset?.hostName || advisor.fullName || 'Property Specialist',
      hostRole: videoAsset?.hostRole || `${advisor.fullName ? `${advisor.fullName} • ` : ''}${portal.organization?.name || 'ZamZam Properties'} Desk`,
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

  const unitsCount = portal.portalUnits?.length || 0;

  // Compute price range in raw rupees
  const priceRange = useMemo(() => {
    if (!portal.portalUnits || portal.portalUnits.length === 0) return { min: 0, max: 0 };
    const prices = portal.portalUnits.map((u: any) => u.propertyUnit.allInTotalCost || 0);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [portal.portalUnits]);

  return (
    <div
      data-portal-theme="luxury"
      className="portal-theme min-h-screen bg-gradient-to-b from-[#FCFAF6] via-[#FFFDF9] to-[#F7F3E9] text-slate-900 font-sans selection:bg-amber-200 selection:text-gold"
    >
      {/* Top Advisory Bar */}
      <PortalHeader
        portal={portal}
        advisor={advisor}
        onShare={handleShare}
        copiedLink={copiedLink}
        onOpenComparison={() => setIsComparisonOpen(true)}
        unitsCount={unitsCount}
        sendTelemetry={sendTelemetry}
      />

      {/* Share / Copy error notification */}
      {shareError && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs px-4 py-2 text-center font-medium">
          {shareError}
        </div>
      )}

      {/* Main Content Hub */}
      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 sm:space-y-10 pb-28 sm:pb-16">
        {/* HERO SECTION: Client Welcome & Personalization */}
        <PortalHero
          portal={portal}
          advisor={advisor}
          unitsCount={unitsCount}
          priceRange={priceRange}
          onWhatsAppAdvisor={() =>
            handleWhatsAppInquiry(portal.portalUnits[0]?.propertyUnit || {})
          }
        />

        {/* SECTION: Quick Side-by-Side Comparison Overview */}
        <PortalComparisonTray
          portal={portal}
          onScrollToUnit={scrollToUnit}
          isOpenModal={isComparisonOpen}
          onCloseModal={() => setIsComparisonOpen(false)}
          onSelectUnitForBooking={(unit) => setBookingUnit(unit)}
          onWhatsAppInquiry={handleWhatsAppInquiry}
        />

        {/* SECTION: Curated Property Details Showcase */}
        <section className="space-y-8 sm:space-y-12">
          <div className="border-b border-amber-200/80 pb-3.5 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gold font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-gold" />
                Verified Inventory Showcase
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 font-serif mt-0.5">
                Detailed Property Cards ({unitsCount})
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-mono font-bold">
              Live Verified Pricing • Ground Audited by ZamZam
            </span>
          </div>

          {/* Property Cards List */}
          {portal.portalUnits?.map((item: any, index: number) => (
            <PropertyCard
              key={item.id || item.propertyUnit?.id || index}
              item={item}
              index={index}
              totalCount={unitsCount}
              advisor={advisor}
              onOpenLightbox={openLightbox}
              onOpenVideoPlayer={openVideoPlayer}
              onOpenDossier={handleBrochureClick}
              onOpenBooking={(u) => setBookingUnit(u)}
              onWhatsAppInquiry={handleWhatsAppInquiry}
              sendTelemetry={sendTelemetry}
            />
          ))}
        </section>

        {/* Footer Advisory & Social Proof */}
        <footer className="mt-12 sm:mt-16 pt-8 border-t border-amber-200/80 space-y-6 text-center text-xs text-slate-500">
          <div className="max-w-lg mx-auto p-5 sm:p-7 rounded-3xl bg-white border border-amber-200/90 shadow-sm space-y-3.5">
            <BrandLogo variant="light" size="lg" withRera={false} />
            <p className="text-xs text-gold font-bold font-serif">
              Navi Mumbai’s Leading Verified Real Estate Advisory
            </p>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              Have questions regarding registration, title search, or loan pre-approval? Connect directly with your personal property advisor <strong>{advisor.fullName}</strong>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 max-w-sm mx-auto">
              <a
                href={`tel:${(advisor.phoneE164 || '+919967731071').replace(/\s+/g, '')}`}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition shadow-xs font-serif"
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

          <p className="text-xs text-slate-400 max-w-2xl mx-auto px-3">
            Disclaimer: All property dimensions, statutory fees, and availability are verified against sanctioned MahaRERA records. Pricing is subject to developer confirmation at the time of token booking.
          </p>
        </footer>
      </main>

      {/* Floating Bottom Quick Action Dock on Mobile/Tablet */}
      <PortalStickyDock
        unitsCount={unitsCount}
        minPrice={priceRange.min}
        onOpenBooking={() =>
          setBookingUnit(portal.portalUnits[0]?.propertyUnit || null)
        }
        onWhatsAppInquiry={() =>
          handleWhatsAppInquiry(portal.portalUnits[0]?.propertyUnit || {})
        }
        onOpenComparison={() => setIsComparisonOpen(true)}
      />

      {/* MODALS */}
      {/* 1: Interactive Video Walkthrough Player Modal */}
      <PortalVideoModal
        activeVideoModal={activeVideoModal}
        onClose={() => setActiveVideoModal(null)}
        onScheduleVisit={(unit) => {
          setActiveVideoModal(null);
          setBookingUnit(unit);
        }}
      />

      {/* 2: Fullscreen Photo Lightbox Modal */}
      <PortalLightboxModal
        lightboxState={lightboxState}
        onClose={() => setLightboxState(null)}
        onNavigate={(newIdx) =>
          setLightboxState((prev) => (prev ? { ...prev, currentIndex: newIdx } : null))
        }
      />

      {/* 3: Schedule Physical Site Visit Modal */}
      <PortalBookingModal
        bookingUnit={bookingUnit}
        advisor={advisor}
        onClose={() => setBookingUnit(null)}
        onSubmitBooking={handleBookVisitSubmit}
      />

      {/* 4: Official Digital Property Dossier Modal */}
      <PortalDossierModal
        dossierUnit={activeDossierUnit}
        portal={portal}
        advisor={advisor}
        onClose={() => setActiveDossierUnit(null)}
        onWhatsAppInquiry={handleWhatsAppInquiry}
      />
    </div>
  );
}
