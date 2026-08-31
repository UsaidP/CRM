'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Share2,
  Check,
  PhoneCall,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { YoutubeIcon, InstagramIcon } from '@/components/icons/SocialIcons';

interface PortalHeaderProps {
  portal: any;
  advisor: {
    fullName?: string;
    phoneE164?: string;
    email?: string;
  };
  onShare: () => void;
  copiedLink: boolean;
  onOpenComparison?: () => void;
  unitsCount: number;
  sendTelemetry: (action: string) => void;
}

export function PortalHeader({
  portal,
  advisor,
  onShare,
  copiedLink,
  onOpenComparison,
  unitsCount,
  sendTelemetry,
}: PortalHeaderProps) {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-amber-200/70 shadow-[0_4px_20px_-4px_rgba(140,100,30,0.06)]"
    >
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand Identity & Advisory Badge */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <BrandLogo
            variant="light"
            mode="horizontal"
            size="sm"
            withRera
            reraNumber={
              portal.organization?.reraBrokerRegistration
                ? `MahaRERA: ${portal.organization.reraBrokerRegistration}`
                : 'MahaRERA A52000028714'
            }
          />
          <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-50 to-amber-100/60 px-3 py-1 text-[11px] font-semibold text-[#8C641E] border border-amber-300/80 shadow-2xs shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-[#8C641E]" />
            <span>Verified Advisory Portfolio</span>
          </div>
        </div>

        {/* Right: Actions Suite */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Compare Button (if multiple units) */}
          {unitsCount > 1 && onOpenComparison && (
            <button
              type="button"
              onClick={onOpenComparison}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/90 bg-amber-50/80 hover:bg-amber-100/80 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-[#8C641E] transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
              title="Compare all properties side-by-side"
            >
              <Layers className="w-3.5 h-3.5 text-[#8C641E]" />
              <span className="hidden sm:inline">Compare ({unitsCount})</span>
            </button>
          )}

          {/* Social Proof Pills */}
          <div className="hidden md:flex items-center gap-1.5 border-r border-slate-200/80 pr-2.5 mr-0.5">
            <a
              href="https://www.youtube.com/@zamzamproperties6354"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-50/80 hover:bg-red-100/80 border border-red-200/80 text-red-700 text-xs font-semibold transition-all hover:scale-[1.02] shadow-2xs"
              title="Watch video tours on YouTube"
            >
              <YoutubeIcon className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span className="hidden xl:inline">YouTube</span>
            </a>
            <a
              href="https://www.instagram.com/zamzamproperties5531/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-pink-50/80 hover:bg-pink-100/80 border border-pink-200/80 text-pink-700 text-xs font-semibold transition-all hover:scale-[1.02] shadow-2xs"
              title="View reels on Instagram"
            >
              <InstagramIcon className="w-3.5 h-3.5 text-pink-600 shrink-0" />
              <span className="hidden xl:inline">Instagram</span>
            </a>
          </div>

          {/* Share Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onShare}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-amber-50/40 hover:border-amber-300 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
            title="Share this curated portfolio"
          >
            <AnimatePresence mode="wait">
              {copiedLink ? (
                <motion.span
                  key="copied"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="inline-flex items-center gap-1 text-emerald-700 font-bold"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px] sm:text-xs">Copied!</span>
                </motion.span>
              ) : (
                <motion.span
                  key="share"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="inline-flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden xs:inline text-[11px] sm:text-xs font-medium">Share</span>
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Direct Call Button */}
          <motion.a
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            href={`tel:${advisor.phoneE164 || '+919967731071'}`}
            onClick={() => sendTelemetry('CALL_CLICK')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white px-3 sm:px-4 py-1.5 text-xs font-bold transition-all shadow-xs shadow-emerald-700/20"
            title={`Call Advisor: ${advisor.fullName || 'Suhel Patel'}`}
          >
            <PhoneCall className="w-3.5 h-3.5 text-white shrink-0" />
            <span className="text-[11px] sm:text-xs">Call Advisor</span>
          </motion.a>
        </div>
      </div>
    </motion.header>
  );
}
