'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Send,
  Building2,
  MapPin,
  ShieldCheck,
  Award,
  CheckCircle2,
  Clock,
  Compass,
} from 'lucide-react';
import { formatLakhCr } from '@/lib/money';

interface PortalHeroProps {
  portal: any;
  advisor: {
    fullName?: string;
    phoneE164?: string;
    email?: string;
  };
  unitsCount: number;
  priceRange: { min: number; max: number };
  onWhatsAppAdvisor: () => void;
}

export function PortalHero({
  portal,
  advisor,
  unitsCount,
  priceRange,
  onWhatsAppAdvisor,
}: PortalHeroProps) {
  const clientName = portal.lead?.fullName || 'Valued Client';
  const customGreeting =
    portal.customMessage ||
    `Welcome ${clientName}. Based on your shortlisted preferences for carpet efficiency, sunlight orientation, and budget, our advisory team has curated this verified comparative portfolio of premier homes in Kharghar and Taloja.`;

  // Determine microMarket / configuration summary
  const configs = Array.from(
    new Set(portal.portalUnits?.map((u: any) => `${u.propertyUnit?.bhk} BHK`) || ['2 BHK'])
  ).join(', ');

  const primaryLocality =
    portal.portalUnits?.[0]?.propertyUnit?.project?.microMarket || 'Kharghar & Taloja • Navi Mumbai';

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFFDF9] via-[#FAF6ED] to-[#F4ECDA] border border-amber-300/80 p-5 sm:p-8 lg:p-10 shadow-[0_10px_30px_-10px_rgba(180,130,50,0.08)] text-slate-900"
    >
      {/* Subtle Luxury Architectural Backdrop Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-amber-200/30 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-radial from-emerald-100/20 to-transparent rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-6 max-w-4xl">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <motion.span
            whileHover={{ scale: 1.03 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-[#8C641E] border border-amber-300 shadow-2xs font-serif"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#8C641E] animate-pulse" />
            <span>Private Curated Selection</span>
          </motion.span>

          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-mono bg-amber-100/60 px-3 py-1 rounded-full border border-amber-200/80">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
            <strong className="text-slate-900 font-bold">{unitsCount} Verified</strong> {unitsCount === 1 ? 'Property' : 'Properties'}
          </span>
        </div>

        {/* Personalized Headline & Intro Message */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 font-serif leading-tight">
            {portal.title || `Curated Property Portfolio for ${clientName}`}
          </h1>
          <p className="text-xs sm:text-sm lg:text-base text-slate-700 leading-relaxed max-w-3xl font-sans">
            {customGreeting}
          </p>
        </div>

        {/* Dedicated Advisor Card */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-amber-200/90 shadow-sm"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#DFBA73] via-[#B38A38] to-[#8C641E] p-0.5 shadow-sm shrink-0">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-bold text-sm text-[#8C641E] font-serif">
                  {advisor.fullName
                    ?.split(' ')
                    .map((n: string) => n[0])
                    .join('') || 'SP'}
                </div>
              </div>
              <span
                className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-2xs"
                title="Advisor Online & Available"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-bold text-slate-900 font-serif">{advisor.fullName || 'Suhel Patel'}</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-[#8C641E] font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  <Award className="w-3 h-3 text-[#8C641E]" />
                  Senior Property Advisor
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                Direct: <span className="font-mono text-slate-700">{advisor.phoneE164 || '+91 99677 31071'}</span> • ZamZam Private Desk
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onWhatsAppAdvisor}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold shadow-xs shadow-emerald-700/20 transition-all cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Message on WhatsApp</span>
          </motion.button>
        </motion.div>

        {/* Portfolio Key Stats Matrix */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 pt-1">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-amber-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono block truncate">
              Handpicked Homes
            </span>
            <strong className="text-base sm:text-lg font-extrabold text-slate-900 block mt-0.5 truncate font-serif">
              {unitsCount} Verified Units
            </strong>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-amber-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono block truncate">
              All-In Price Range
            </span>
            <strong className="text-base sm:text-lg font-extrabold text-[#8C641E] block mt-0.5 truncate font-mono">
              {formatLakhCr(priceRange.min)} – {formatLakhCr(priceRange.max)}
            </strong>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-amber-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono block truncate">
              Configuration
            </span>
            <strong className="text-base sm:text-lg font-extrabold text-slate-900 block mt-0.5 truncate font-serif">
              {configs} Layouts
            </strong>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-amber-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono block truncate">
              Target Micro-Market
            </span>
            <strong className="text-base sm:text-lg font-extrabold text-slate-900 block mt-0.5 truncate font-serif">
              {primaryLocality}
            </strong>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
