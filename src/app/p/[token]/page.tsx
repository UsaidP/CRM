'use client';

import React, { useState, useEffect, use } from 'react';
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
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Lock,
  Compass,
  Zap,
  Info
} from 'lucide-react';

export default function ClientPortalPublicPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [portal, setPortal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Gallery Active Slide State (keyed by unitId)
  const [activePhotoIndices, setActivePhotoIndices] = useState<{ [unitId: string]: number }>({});
  const [showCostBreakdown, setShowCostBreakdown] = useState<{ [unitId: string]: boolean }>({});
  const [copiedLink, setCopiedLink] = useState(false);

  // Visit Booking Modal State
  const [bookingUnit, setBookingUnit] = useState<any | null>(null);
  const [visitDate, setVisitDate] = useState('This Saturday (11:00 AM)');
  const [bookedSuccess, setBookedSuccess] = useState(false);

  // Telemetry Beacon helper
  const sendTelemetry = async (actionType: string, unitId?: string, dwellTimeSec: number = 0) => {
    try {
      fetch(`/api/v1/portals/${token}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType, unitId, dwellTimeSec }),
      });
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    const fetchPortal = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/portals/${token}`);
        const data = await res.json();
        if (data.success) {
          setPortal(data.data);
          sendTelemetry('PORTAL_OPEN');
        } else {
          setError(data.error || 'Portal not found or expired.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load client portal.');
      } finally {
        setLoading(false);
      }
    };
    fetchPortal();

    // Dwell time beacon on unload
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

  const handleShare = () => {
    sendTelemetry('PORTAL_SHARE');
    if (navigator.share) {
      navigator.share({
        title: portal?.title || 'ZamZam Properties Options',
        text: 'Check out these verified property options curated for us by ZamZam Properties:',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleBrochureClick = (unit: any) => {
    sendTelemetry('BROCHURE_DOWNLOAD', unit.id);
    window.open(unit.project.brochureUrl || '#', '_blank');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0d14] text-white flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8a6f3c] via-[#b59658] to-[#ccb67b] flex items-center justify-center animate-pulse shadow-lg shadow-[#b59658]/20 border border-[#ccb67b]/50">
          <Building2 className="w-6 h-6 text-[#12151f]" />
        </div>
        <p className="text-sm text-slate-400 font-medium font-display">Opening your private verified property portfolio...</p>
      </div>
    );
  }

  if (error || !portal) {
    return (
      <div className="min-h-screen bg-[#0a0d14] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="p-4 rounded-full bg-slate-900 border border-slate-800 text-amber-400">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold font-display">Portal Unavailable</h1>
        <p className="text-xs text-slate-400 max-w-sm">
          {error || 'This private client link has expired or is no longer active. Please request a refreshed link from your ZamZam advisor.'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 selection:bg-[#b59658] selection:text-[#12151f] pb-20">
      {/* Top Advisory Banner */}
      <header className="sticky top-0 z-40 bg-[#12151f]/95 backdrop-blur-md border-b border-[#b59658]/20 px-4 py-3.5 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8a6f3c] via-[#b59658] to-[#ccb67b] flex items-center justify-center shadow-lg shadow-[#b59658]/20 border border-[#ccb67b]/50">
              <Building2 className="w-5 h-5 text-[#12151f]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-white font-display">ZamZam Properties</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#1b202c] text-[#ccb67b] border border-[#b59658]/40 font-mono">
                  MahaRERA
                </span>
              </div>
              <p className="text-[10px] text-[#ccb67b]/80 font-mono">Navi Mumbai Advisory • Verified Mandates</p>
            </div>
          </div>

          <button
            onClick={handleShare}
            className="px-3.5 py-1.5 rounded-xl bg-[#1b202c] hover:bg-[#2a3040] text-[#ccb67b] text-xs font-bold border border-[#b59658]/40 flex items-center gap-1.5 transition-all shadow-sm"
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
        </div>
      </header>

      {/* Hero Welcome Container */}
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-4">
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#12151f] via-[#1b202c] to-[#12151f] border border-[#b59658]/30 shadow-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1b202c] border border-[#b59658]/40 text-[#ccb67b] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#b59658]" />
            Private Client Selection
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
            {portal.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
            {portal.customMessage || 'We have handpicked and physically verified these high-performing properties matching your budget, BHK, and possession preferences in Navi Mumbai.'}
          </p>

          <div className="rule-gold my-2" />

          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5 text-[#ccb67b]">
              <ShieldCheck className="w-4 h-4 text-[#b59658]" />
              100% MahaRERA Verified Inventory
            </span>
            <span className="flex items-center gap-1.5 text-[#ccb67b]">
              <Zap className="w-4 h-4 text-[#b59658]" />
              All-Inclusive Total Acquisition Cost (C_all-in)
            </span>
          </div>
        </div>
      </div>

      {/* Curated Properties List */}
      <main className="max-w-4xl mx-auto px-4 space-y-6 pt-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider font-display">
            Curated Listings ({portal.portalUnits?.length || 0} Options)
          </h2>
          <span className="text-[11px] text-[#ccb67b] font-mono font-medium">All Direct Broker Verified</span>
        </div>

        {portal.portalUnits?.map((item: any, index: number) => {
          const unit = item.propertyUnit;
          const project = unit.project;
          const photos = unit.photoGallery || [
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
          ];
          const activePhotoIdx = activePhotoIndices[unit.id] || 0;
          const isCostExpanded = showCostBreakdown[unit.id] || false;

          return (
            <article
              key={unit.id}
              className="glass-panel rounded-3xl overflow-hidden border border-slate-800/80 shadow-2xl transition-all hover:border-[#b59658]/40 space-y-0"
            >
              {/* Photo & Video Carousel Header */}
              <div className="relative aspect-[16/9] sm:aspect-[21/9] bg-slate-950 overflow-hidden group">
                <img
                  src={photos[activePhotoIdx]}
                  alt={`${project.projectName} Unit ${unit.unitNumber}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Photo Carousel Navigation Arrows */}
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={() => handlePhotoNav(unit.id, 'prev', photos.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePhotoNav(unit.id, 'next', photos.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] text-white font-mono">
                      {activePhotoIdx + 1} / {photos.length}
                    </div>
                  </>
                )}

                {/* Badges on Image */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-xl bg-[#12151f]/90 border border-[#b59658]/50 text-[#ccb67b] font-bold text-xs backdrop-blur-md shadow-lg font-mono">
                    {unit.bhk} BHK
                  </span>
                  {project.hasOccupancyCertificate ? (
                    <span className="px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-700 text-[#ccb67b] font-semibold text-xs backdrop-blur-md font-mono">
                      Ready to Move (OC)
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-700 text-amber-300 font-semibold text-xs backdrop-blur-md font-mono">
                      Under Construction
                    </span>
                  )}
                </div>

                {unit.videoReelUrl && (
                  <a
                    href={unit.videoReelUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => sendTelemetry('VIDEO_PLAY', unit.id)}
                    className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-900 text-white border border-slate-700 text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 shadow-lg transition-all"
                  >
                    <Play className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                    Watch Reel Walkthrough
                  </a>
                )}
              </div>

              {/* Property Specs Body */}
              <div className="p-6 space-y-5">
                {/* Title & Location Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-xl font-extrabold text-white tracking-tight font-display">
                      {project.projectName}
                    </h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                      <MapPin className="w-3.5 h-3.5 text-[#ccb67b]" />
                      {project.microMarket} ({project.subLocality || 'Prime Sector Corridor'})
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total All-In Cost</span>
                    <strong className="text-2xl font-extrabold text-[#ccb67b] font-mono tracking-tight">
                      ₹{(unit.allInTotalCost / 100000).toFixed(2)} Lakhs
                    </strong>
                  </div>
                </div>

                {/* Key Spec Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Carpet Area</span>
                    <strong className="text-slate-100 text-sm font-semibold">{unit.carpetAreaSqft} sq.ft</strong>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Floor Level</span>
                    <strong className="text-slate-100 text-sm font-semibold">Floor {unit.floorNumber} of {unit.totalFloors}</strong>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Metro Line 1</span>
                    <strong className="text-[#ccb67b] text-sm font-semibold">
                      {project.distanceToMetroKm ? `${project.distanceToMetroKm} km` : 'Near Station'}
                    </strong>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">MahaRERA No.</span>
                    <strong className="text-slate-300 text-xs font-mono">{project.reraNumber}</strong>
                  </div>
                </div>

                {/* Broker Highlight Callout */}
                {item.brokerHighlight && (
                  <div className="p-3 rounded-2xl bg-[#1b202c] border border-[#b59658]/30 text-xs text-[#ccb67b] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 text-[#b59658]" />
                    <span>{item.brokerHighlight}</span>
                  </div>
                )}

                {/* All-In Cost Breakdown Accordion */}
                <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 overflow-hidden text-xs">
                  <button
                    onClick={() =>
                      setShowCostBreakdown((prev) => ({ ...prev, [unit.id]: !prev[unit.id] }))
                    }
                    className="w-full p-3.5 flex items-center justify-between text-slate-300 hover:text-white font-semibold transition-all"
                  >
                    <span className="flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-[#ccb67b]" />
                      Statutory All-In Cost Breakdown (C_all-in)
                    </span>
                    <span className="text-xs text-[#ccb67b] font-mono">
                      {isCostExpanded ? 'Hide Details ▲' : 'View Itemized Math ▼'}
                    </span>
                  </button>

                  {isCostExpanded && (
                    <div className="p-4 pt-1 border-t border-slate-800/80 space-y-2 text-slate-300">
                      <div className="flex justify-between py-1 border-b border-slate-800/50">
                        <span>Agreement Base Value:</span>
                        <span className="font-mono text-slate-100 font-bold">₹{(unit.agreementValue / 100000).toFixed(2)}L</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/50">
                        <span>Stamp Duty ({unit.stampDutyRate}%):</span>
                        <span className="font-mono text-slate-300">₹{((unit.agreementValue * unit.stampDutyRate) / 10000000).toFixed(2)}L</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/50">
                        <span>Registration Fee (Cap ₹30k):</span>
                        <span className="font-mono text-slate-300">₹{(unit.registrationFee / 100000).toFixed(2)}L</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/50">
                        <span>GST ({unit.gstRate}%):</span>
                        <span className="font-mono text-slate-300">{unit.gstRate === 0 ? '₹0.00 (0% on OC Received)' : `₹${((unit.agreementValue * unit.gstRate) / 10000000).toFixed(2)}L`}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/50">
                        <span>Parking & Development Charges:</span>
                        <span className="font-mono text-slate-300">₹{((unit.parkingCharges + unit.societyDevelopmentCharges) / 100000).toFixed(2)}L</span>
                      </div>
                      <div className="flex justify-between pt-2 text-[#ccb67b] font-bold text-sm">
                        <span>Total Out-of-Pocket:</span>
                        <span className="font-mono">₹{(unit.allInTotalCost / 100000).toFixed(2)} Lakhs</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Project Amenities Tags */}
                {unit.amenities?.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block">Key Lifestyle Amenities:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {unit.amenities.map((am: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 text-[11px]">
                          {am}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Card Action CTAs */}
                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => handleBrochureClick(unit)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Brochure
                  </button>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setBookingUnit(unit)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    >
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      Book Site Visit
                    </button>

                    <button
                      onClick={() => handleWhatsAppInquiry(unit)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] hover:opacity-95 text-[#12151f] text-xs font-extrabold shadow-lg shadow-[#b59658]/20 flex items-center justify-center gap-1.5 transition-all"
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

      {/* Floating Bottom Direct Broker Callback Button */}
      <aside aria-label="Direct Advisory Assistance" className="fixed bottom-4 inset-x-0 z-40 px-4">
        <div className="max-w-md mx-auto p-3 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#8a6f3c] via-[#b59658] to-[#ccb67b] flex items-center justify-center text-[#12151f] font-bold text-xs font-display">
              ZP
            </div>
            <div>
              <p className="text-xs font-bold text-white">Have questions about these options?</p>
              <p className="text-[10px] text-slate-400">Direct Senior Advisor Assistance</p>
            </div>
          </div>
          <a
            href="tel:+919820123456"
            onClick={() => sendTelemetry('CALL_CLICK')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[#ccb67b] text-xs font-bold border border-[#b59658]/40 flex items-center gap-1.5 shrink-0"
          >
            <PhoneCall className="w-3.5 h-3.5 text-[#b59658]" />
            Call Advisor
          </a>
        </div>
      </aside>

      {/* MODAL: Book Site Visit */}
      {bookingUnit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-3xl border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2 font-display">
                <Calendar className="w-4 h-4 text-[#b59658]" />
                Schedule Physical Site Visit
              </h3>
              <button onClick={() => setBookingUnit(null)} className="text-slate-400 hover:text-white text-sm">
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
                  Your ZamZam advisor will confirm the Saturday pickup time & itinerary on WhatsApp shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleBookVisitSubmit} className="space-y-3.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block uppercase">Selected Property:</span>
                  <strong className="text-white text-sm block font-display">{bookingUnit.project.projectName}</strong>
                  <span className="text-slate-400 text-xs font-mono">{bookingUnit.bhk} BHK • {bookingUnit.project.microMarket}</span>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Preferred Timing Slot</label>
                  <select
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ccb67b]"
                  >
                    <option value="This Saturday (11:00 AM)">This Saturday (11:00 AM)</option>
                    <option value="This Saturday (04:00 PM)">This Saturday (04:00 PM)</option>
                    <option value="This Sunday (11:00 AM)">This Sunday (11:00 AM)</option>
                    <option value="This Sunday (04:00 PM)">This Sunday (04:00 PM)</option>
                    <option value="Weekday Evening (06:00 PM)">Weekday Evening (06:00 PM)</option>
                  </select>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  🚗 ZamZam provides complimentary cab pickup & drop from Kharghar / Mansarovar railway stations for pre-scheduled client visits.
                </p>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setBookingUnit(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] text-[#12151f] text-xs font-extrabold shadow-md flex items-center gap-1.5"
                  >
                    Confirm Visit Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
