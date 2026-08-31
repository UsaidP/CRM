'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, UserCheck, Play } from 'lucide-react';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { YoutubeIcon, InstagramIcon } from '@/components/icons/SocialIcons';
import { InventoryMediaAsset } from '@/lib/inventory-media';

interface VideoModalData {
  unit: any;
  videoAsset?: InventoryMediaAsset;
  videoUrl: string;
  title: string;
  hostName?: string;
  hostRole?: string;
  isYouTube?: boolean;
  isInstagram?: boolean;
}

interface PortalVideoModalProps {
  activeVideoModal: VideoModalData | null;
  onClose: () => void;
  onScheduleVisit: (unit: any) => void;
}

export function PortalVideoModal({
  activeVideoModal,
  onClose,
  onScheduleVisit,
}: PortalVideoModalProps) {
  if (!activeVideoModal) return null;

  return (
    <AccessibleDialog
      open={Boolean(activeVideoModal)}
      onClose={onClose}
      titleId="video-modal-title"
      descriptionId="video-modal-description"
      size="xl"
      panelClassName="p-0 rounded-3xl border border-slate-200 shadow-2xl overflow-hidden bg-white"
    >
      <div>
        {/* Header */}
        <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
              <YoutubeIcon className="w-4 h-4 text-red-600" />
            </div>
            <div className="min-w-0">
              <h3 id="video-modal-title" className="text-sm sm:text-base font-bold text-slate-900 font-serif truncate">
                {activeVideoModal.title}
              </h3>
              <p id="video-modal-description" className="text-xs text-[#8C641E] font-medium truncate">
                Presented by {activeVideoModal.hostName} ({activeVideoModal.hostRole})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 grid place-items-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
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

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <a
              href="https://www.youtube.com/@zamzamproperties6354"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-xs font-semibold transition-all shadow-2xs"
            >
              <YoutubeIcon className="w-3.5 h-3.5 text-red-600" />
              <span>YouTube Channel</span>
            </a>
            <a
              href="https://www.instagram.com/zamzamproperties5531/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-50 border border-pink-200 text-pink-700 hover:bg-pink-100 text-xs font-semibold transition-all shadow-2xs"
            >
              <InstagramIcon className="w-3.5 h-3.5 text-pink-600" />
              <span>Instagram Reels</span>
            </a>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => onScheduleVisit(activeVideoModal.unit)}
            className="px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-[#B38A38] to-[#8C641E] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer hover:brightness-105 transition-all"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Schedule Physical Site Visit</span>
          </motion.button>
        </div>
      </div>
    </AccessibleDialog>
  );
}
