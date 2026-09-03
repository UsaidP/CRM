'use client';

import React, { useState, useEffect } from 'react';
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
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setScrollProgress(max > 0 ? Math.min(1, doc.scrollTop / max) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-40 bg-white/90 backdrop-blur-2xl border-b border-amber-200/75 shadow-[0_4px_25px_-4px_rgba(180,130,50,0.08)]"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand Identity & Advisory Badge */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
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
          <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-50/90 via-amber-100/60 to-amber-50/90 px-3 py-1 text-[11px] font-bold text-gold border border-amber-300/90 shadow-2xs shrink-0 tracking-wide font-serif">
            <ShieldCheck className="w-3.5 h-3.5 text-gold" />
            <span>Verified Advisory Portfolio</span>
          </div>
        </div>

        {/* Right: Actions Suite */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Compare Button (if multiple units) */}
          {unitsCount > 1 && onOpenComparison && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={onOpenComparison}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/90 bg-gradient-to-r from-amber-50 to-amber-100/70 hover:from-amber-100 hover:to-amber-200/80 px-2.5 sm:px-3.5 py-1.5 text-xs font-bold text-gold transition-[background-color,border-color,box-shadow] duration-200 shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer font-serif"
              aria-label={`Compare all ${unitsCount} properties side-by-side`}
              title="Compare all properties side-by-side"
            >
              <Layers className="w-3.5 h-3.5 text-gold" />
              <span className="hidden sm:inline">Compare ({unitsCount})</span>
            </motion.button>
          )}

          {/* Social Walkthrough Video Links */}
          <div className="hidden md:flex items-center gap-1.5 border-r border-slate-200/80 pr-2.5 mr-0.5">
            <a
              href="https://www.youtube.com/@zamzamproperties6354"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-50/90 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold transition-[background-color,border-color,box-shadow,transform] duration-200 hover:scale-[1.02] shadow-2xs"
              title="Watch high-definition property tours on YouTube"
            >
              <YoutubeIcon className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span className="hidden xl:inline">YouTube</span>
            </a>
            <a
              href="https://www.instagram.com/zamzamproperties5531/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-pink-50/90 hover:bg-pink-100 border border-pink-200 text-pink-700 text-xs font-bold transition-[background-color,border-color,box-shadow,transform] duration-200 hover:scale-[1.02] shadow-2xs"
              title="Watch reels and live site walkthroughs on Instagram"
            >
              <InstagramIcon className="w-3.5 h-3.5 text-pink-600 shrink-0" />
              <span className="hidden xl:inline">Instagram</span>
            </a>
          </div>

          {/* Share Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onShare}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-amber-50/50 hover:border-amber-300 px-2.5 sm:px-3.5 py-1.5 text-xs font-bold text-slate-700 transition-[background-color,border-color,box-shadow] duration-200 shadow-2xs hover:shadow-xs cursor-pointer"
            title="Share this curated portfolio link"
          >
            <AnimatePresence mode="wait">
              {copiedLink ? (
                <motion.span
                  key="copied"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="inline-flex items-center gap-1 text-emerald-700 font-extrabold"
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
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white px-3 sm:px-4 py-1.5 text-xs font-extrabold transition-[background-color,border-color,box-shadow] duration-200 shadow-xs shadow-emerald-700/25"
            title={`Call Advisor: ${advisor.fullName || 'Property Advisor'}`}
          >
            <PhoneCall className="w-3.5 h-3.5 text-white shrink-0" />
            <span className="text-[11px] sm:text-xs font-serif">
              Call <span className="hidden sm:inline">Advisor</span>
            </span>
          </motion.a>
        </div>
      </div>
      {/* Scroll Progress Hairline */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-gold-lighter via-gold-light to-gold transition-[width] duration-150 ease-out"
        style={{ width: `${scrollProgress * 100}%` }}
      />
    </motion.header>
  );
}
