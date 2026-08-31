'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon,
  Video,
  Ruler,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Play,
  UserCheck,
  Building2,
  Compass,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { YoutubeIcon } from '@/components/icons/SocialIcons';
import { InventoryMediaAsset } from '@/lib/inventory-media';

interface PropertyMediaHubProps {
  unit: any;
  project: any;
  advisor: any;
  onOpenLightbox: (photos: InventoryMediaAsset[], index: number) => void;
  onOpenVideoPlayer: (videoAsset?: InventoryMediaAsset) => void;
  sendTelemetry: (action: string, unitId?: string) => void;
}

export function PropertyMediaHub({
  unit,
  project,
  advisor,
  onOpenLightbox,
  onOpenVideoPlayer,
  sendTelemetry,
}: PropertyMediaHubProps) {
  // Extract and normalize media
  const unitMedia: InventoryMediaAsset[] = unit.mediaGallery || [];
  const projectMedia: InventoryMediaAsset[] = project.mediaGallery || [];
  const allMedia = Array.from(
    new Map(
      [...unitMedia, ...projectMedia].filter((m) => m?.url).map((m) => [m.url, m])
    ).values()
  );

  const photos = allMedia.filter((m) => m.kind === 'image' && m.category !== 'floorplan');
  if (photos.length === 0 && project.coverImageUrl) {
    photos.push({
      id: `cover-${unit.id}`,
      url: project.coverImageUrl,
      kind: 'image',
      title: `${project.projectName} Elevation & Façade`,
      caption: 'Verified architectural perspective',
    });
  }

  const floorPlans = allMedia.filter((m) => m.category === 'floorplan');
  if (floorPlans.length === 0 && unit.floorPlanUrl) {
    floorPlans.push({
      id: `fp-${unit.id}`,
      url: unit.floorPlanUrl,
      kind: 'image',
      title: `${project.projectName} ${unit.bhk} BHK Floor Plan Schematic`,
      caption: `${unit.carpetAreaSqft} sq.ft usable carpet layout`,
      category: 'floorplan',
    });
  }
  const primaryFloorPlan = floorPlans[0];

  const videos = allMedia.filter((m) => m.kind === 'video');
  const primaryVideo =
    videos[0] ||
    (unit.videoReelUrl || project.youtubeWalkthroughUrl
      ? {
          id: `video-reel-${unit.id}`,
          url: unit.videoReelUrl || project.youtubeWalkthroughUrl,
          kind: 'video' as const,
          title: `${project.projectName} ${unit.bhk} BHK Host Walkthrough Tour`,
          hostName: advisor.fullName || 'Suhel Patel',
          hostRole: 'Senior Property Specialist • ZamZam Properties',
          duration: '1:15',
          posterUrl:
            photos[0]?.url ||
            project.coverImageUrl ||
            '/images/projects/today-callisto-taloja-phase-2-sec21/cover.jpg',
        }
      : null);

  // Active Tab: 'photos' | 'video' | 'floorplan'
  const [activeTab, setActiveTab] = useState<'photos' | 'video' | 'floorplan'>('photos');
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    sendTelemetry('PHOTO_SWIPE', unit.id);
    setActivePhotoIdx((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    sendTelemetry('PHOTO_SWIPE', unit.id);
    setActivePhotoIdx((prev) => (prev + 1) % photos.length);
  };

  const currentPhoto = photos[activePhotoIdx] || photos[0];

  return (
    <div className="bg-slate-50/80 p-3 sm:p-5 lg:p-6 space-y-3.5 sm:space-y-4 border-b border-slate-200">
      {/* Category Tab Switcher with spring animation */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Photo Tab Button */}
          <button
            type="button"
            onClick={() => setActiveTab('photos')}
            className={`relative inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'photos'
                ? 'bg-gradient-to-r from-[#B38A38] to-[#8C641E] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>HD Photos ({photos.length})</span>
          </button>

          {/* Video Tour Tab Button */}
          {primaryVideo && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('video');
                sendTelemetry('VIDEO_PLAY', unit.id);
              }}
              className={`relative inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'video'
                  ? 'bg-gradient-to-r from-[#B38A38] to-[#8C641E] text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200/90 hover:bg-slate-50'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-red-600" />
              <span>Host Video Tour</span>
            </button>
          )}

          {/* Floor Plan Tab Button */}
          {primaryFloorPlan && (
            <button
              type="button"
              onClick={() => setActiveTab('floorplan')}
              className={`relative inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'floorplan'
                  ? 'bg-gradient-to-r from-[#B38A38] to-[#8C641E] text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200/90 hover:bg-slate-50'
              }`}
            >
              <Ruler className="w-3.5 h-3.5 text-[#8C641E]" />
              <span>Sanctioned Floor Plan</span>
            </button>
          )}
        </div>

        {/* Verified Ground Footing Pill */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#8C641E] font-medium bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
          <YoutubeIcon className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <span>Ground Audited by ZamZam</span>
        </div>
      </div>

      {/* TAB 1: HD PHOTO GALLERY */}
      {activeTab === 'photos' && (
        <div className="space-y-2.5 sm:space-y-3">
          <div className="relative aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9] rounded-2xl overflow-hidden group border border-slate-200 bg-slate-950 shadow-inner">
            {photos.length > 0 ? (
              <>
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentPhoto?.url || activePhotoIdx}
                    src={currentPhoto?.url}
                    alt={currentPhoto?.title || `${project.projectName} Photo`}
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0.6 }}
                    transition={{ duration: 0.25 }}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 cursor-pointer"
                    onClick={() => onOpenLightbox(photos, activePhotoIdx)}
                  />
                </AnimatePresence>

                {/* Top Badges */}
                <div className="absolute left-3 top-3 flex flex-wrap gap-2 z-10">
                  <span className="px-3 py-1 rounded-xl bg-white/95 border border-amber-300 text-[#8C641E] font-bold text-xs backdrop-blur-md shadow-sm font-serif">
                    {unit.bhk} BHK • {unit.carpetAreaSqft} sq.ft
                  </span>
                  <span className="hidden xs:inline-block px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-semibold text-xs backdrop-blur-md shadow-sm">
                    🟢 Ready OC (0% GST)
                  </span>
                </div>

                {/* Bottom Caption Overlay with Fullscreen Button */}
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent px-4 pb-3.5 pt-16">
                  <div className="min-w-0">
                    <p className="truncate text-xs sm:text-base font-bold text-white font-serif">
                      {currentPhoto?.title || `${project.projectName} • Unit ${unit.unitNumber || 'Selected'}`}
                    </p>
                    <p className="mt-0.5 text-[11px] sm:text-xs text-slate-200 line-clamp-1">
                      {currentPhoto?.caption || 'Verified architectural perspective • Kharghar & Taloja Corridor'}
                    </p>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => onOpenLightbox(photos, activePhotoIdx)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/40 bg-black/60 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md hover:bg-black/80 transition-all shrink-0 shadow-sm cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Zoom HD</span>
                  </motion.button>
                </div>

                {/* Navigation Arrows */}
                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Previous photo"
                      onClick={handlePrevPhoto}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 grid place-items-center rounded-full bg-white/90 hover:bg-white text-slate-900 shadow-lg transition-all active:scale-90 border border-slate-200 cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next photo"
                      onClick={handleNextPhoto}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 grid place-items-center rounded-full bg-white/90 hover:bg-white text-slate-900 shadow-lg transition-all active:scale-90 border border-slate-200 cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs text-white font-mono border border-white/20 shadow-sm">
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
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 pt-1">
              {photos.map((photo, pIdx) => (
                <button
                  key={photo.id || pIdx}
                  type="button"
                  onClick={() => {
                    setActivePhotoIdx(pIdx);
                    sendTelemetry('PHOTO_SWIPE', unit.id);
                  }}
                  className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    activePhotoIdx === pIdx
                      ? 'border-[#8C641E] ring-2 ring-amber-300 scale-[1.03] shadow-xs'
                      : 'border-slate-200 opacity-60 hover:opacity-100'
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
          <div className="relative aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden border border-amber-200 bg-slate-900 group shadow-md">
            <img
              src={
                primaryVideo.posterUrl ||
                photos[0]?.url ||
                '/images/projects/today-callisto-taloja-phase-2-sec21/cover.jpg'
              }
              alt={primaryVideo.title}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-75"
            />

            {/* Play Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-6 text-center bg-black/40 backdrop-blur-[2px]">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => onOpenVideoPlayer(primaryVideo)}
                className="w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full bg-gradient-to-tr from-[#DFBA73] via-[#B38A38] to-[#8C641E] flex items-center justify-center text-white shadow-2xl transition-all border-2 border-white cursor-pointer"
                aria-label="Play Host Video Walkthrough"
              >
                <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-white text-white ml-1" />
              </motion.button>

              <div className="mt-3 sm:mt-4 max-w-lg">
                <h4 className="text-sm sm:text-lg lg:text-xl font-bold text-white font-serif">
                  {primaryVideo.title}
                </h4>
                <p className="mt-1 text-xs text-slate-200">
                  Watch full ground walkthrough review by ZamZam Properties
                </p>
              </div>

              <div className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/95 border border-slate-200 text-xs text-slate-800 shadow-sm">
                <UserCheck className="w-3.5 h-3.5 text-[#8C641E]" />
                <span>
                  Presented by:{' '}
                  <strong className="text-[#8C641E]">
                    {primaryVideo.hostName || advisor.fullName || 'Suhel Patel'}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FLOOR PLAN & DIMENSIONS */}
      {activeTab === 'floorplan' && (
        <div className="space-y-3 sm:space-y-4">
          {primaryFloorPlan && (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-white p-3 sm:p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-[#8C641E] font-mono text-xs font-bold">
                    SANCTIONED PLAN
                  </span>
                  <span className="text-xs sm:text-sm text-slate-900 font-serif font-bold">
                    {unit.bhk} BHK Layout ({unit.carpetAreaSqft} sq.ft)
                  </span>
                </div>
                <div className="text-xs text-[#8C641E] font-mono font-semibold">
                  Vastu Facing: <strong className="text-slate-900">{unit.facing?.replace('_', ' ')}</strong>
                </div>
              </div>

              <div className="relative aspect-[16/10] w-full rounded-xl bg-slate-50 border border-slate-200 p-3 overflow-hidden flex items-center justify-center group">
                <img
                  src={primaryFloorPlan.url}
                  alt={primaryFloorPlan.title || 'Floor Plan'}
                  className="max-h-full max-w-full object-contain cursor-pointer transition-transform group-hover:scale-105"
                  onClick={() => onOpenLightbox([primaryFloorPlan], 0)}
                />
                <div className="absolute bottom-3 right-3">
                  <button
                    type="button"
                    onClick={() => onOpenLightbox([primaryFloorPlan], 0)}
                    className="px-3 py-1.5 rounded-xl bg-white/95 border border-slate-200 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer backdrop-blur"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-[#8C641E]" />
                    <span>Expand Blueprint</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Room Dimensions Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Living &amp; Dining</span>
              <strong className="text-xs sm:text-sm font-bold text-slate-900 block mt-0.5 font-serif">
                11&apos;0&quot; × 17&apos;6&quot;
              </strong>
              <span className="text-[10px] text-slate-500">Balcony attached</span>
            </div>
            <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Master Bedroom</span>
              <strong className="text-xs sm:text-sm font-bold text-slate-900 block mt-0.5 font-serif">
                11&apos;0&quot; × 13&apos;0&quot;
              </strong>
              <span className="text-[10px] text-slate-500">Attached bathroom</span>
            </div>
            <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Modular Kitchen</span>
              <strong className="text-xs sm:text-sm font-bold text-slate-900 block mt-0.5 font-serif">
                8&apos;0&quot; × 10&apos;0&quot;
              </strong>
              <span className="text-[10px] text-slate-500">Dry utility area</span>
            </div>
            <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">French Balcony</span>
              <strong className="text-xs sm:text-sm font-bold text-[#8C641E] block mt-0.5 font-serif">
                5&apos;0&quot; × 11&apos;0&quot;
              </strong>
              <span className="text-[10px] text-slate-500">Open scenic view</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
