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
  Home,
  Layers,
  Banknote,
  PhoneCall,
  UserCheck,
} from 'lucide-react';
import { formatLakhCr } from '@/lib/money';

interface PortalHeroProps {
  portal: any;
  advisor: {
    fullName?: string;
    phoneE164?: string;
    email?: string;
    role?: string;
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
  const advisorName = advisor.fullName || 'Suhel Patel';

  // Determine microMarket / configuration summary
  const configs = Array.from(
    new Set(portal.portalUnits?.map((u: any) => `${u.propertyUnit?.bhk} BHK`) || ['2 BHK'])
  ).join(', ');

  const primaryLocality =
    portal.portalUnits?.[0]?.propertyUnit?.project?.microMarket || 'Kharghar & Taloja • Navi Mumbai';

  const customGreeting =
    portal.customMessage ||
    `Dear ${clientName}, based on your shortlisted preferences for carpet efficiency, natural sunlight, and budget, your dedicated advisor ${advisorName} has curated this verified comparative portfolio in ${primaryLocality}.`;

  // Organization name cleanup to avoid duplicate "Advisory Advisory Desk"
  const rawOrgName = portal.organization?.name || 'ZamZam Properties';
  const cleanOrgName = rawOrgName.replace(/\s*advisory\s*$/i, '');

  const initials = (advisor.fullName || '')
    .trim()
    .split(/\s+/)
    .map((n: string) => n[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PA';

  const roleLabel =
    advisor.role === 'SUPER_ADMIN' || advisor.role === 'ADMIN'
      ? 'Principal Real Estate Advisor'
      : advisor.role === 'MANAGER'
      ? 'Senior Portfolio Manager'
      : advisor.role === 'TELECALLER'
      ? 'Client Relationship Executive'
      : 'Senior Property Advisor';

  // Formatted price string
  const formattedPrice =
    priceRange.min === priceRange.max || !priceRange.max
      ? `${formatLakhCr(priceRange.min)}`
      : `${formatLakhCr(priceRange.min)} – ${formatLakhCr(priceRange.max)}`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFFDF9] via-[#FAF5EB] to-[#F3E9D5] border border-amber-300/85 p-5 sm:p-8 lg:p-10 shadow-[0_12px_40px_-12px_rgba(180,130,50,0.12)] text-slate-900"
    >
      {/* Subtle Luxury Architectural Backdrop Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-amber-300/25 via-amber-200/10 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-radial from-emerald-200/20 to-transparent rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-6 max-w-4xl">
        {/* Top VIP Client Badges */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <motion.span
            whileHover={{ scale: 1.03 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-md px-4 py-1 text-xs font-bold text-gold border border-amber-300/90 shadow-2xs font-serif tracking-wide"
          >
            <Sparkles className="w-3.5 h-3.5 text-gold animate-pulse" />
            <span>Private Dossier Prepared For: <strong>{clientName}</strong></span>
          </motion.span>

          <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-mono bg-white/80 backdrop-blur-md px-3.5 py-1 rounded-full border border-amber-200/90 shadow-2xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block ring-2 ring-emerald-300 animate-pulse" />
            <strong className="text-slate-900 font-bold">{unitsCount} Verified</strong> {unitsCount === 1 ? 'Property' : 'Properties'}
          </span>
        </div>

        {/* Personalized Headline & Intro Message */}
        <div className="space-y-2.5">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 font-serif leading-tight">
            {portal.title || `Curated Property Portfolio for ${clientName}`}
          </h1>
          <p className="text-xs sm:text-sm lg:text-base text-slate-700 leading-relaxed max-w-3xl font-sans">
            {customGreeting}
          </p>
        </div>

        {/* Dedicated Advisor Concierge Card */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4.5 sm:p-5.5 rounded-2xl bg-white/95 backdrop-blur-md border border-amber-200/90 shadow-xs"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative">
              <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-gold-lighter via-gold-light to-gold p-0.5 shadow-sm shrink-0">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-extrabold text-sm text-gold font-serif">
                  {initials}
                </div>
              </div>
              <span
                className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-2xs"
                title="Advisor Online & Ready for Site Visit"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm sm:text-base font-bold text-slate-900 font-serif">
                  {advisor.fullName || 'Property Advisor'}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-gold font-bold bg-amber-50/90 px-2 py-0.5 rounded-md border border-amber-200 font-serif">
                  <Award className="w-3 h-3 text-gold" />
                  {roleLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                Direct:{' '}
                <span className="font-mono font-semibold text-slate-800">
                  {advisor.phoneE164 || '+91 99677 31071'}
                </span>{' '}
                • {cleanOrgName} Private Desk
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href={`tel:${(advisor.phoneE164 || '+919967731071').replace(/\s+/g, '')}`}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition shadow-2xs cursor-pointer shrink-0"
              title={`Call ${advisor.fullName || 'Advisor'}`}
            >
              <PhoneCall className="w-3.5 h-3.5 text-slate-700" />
              <span className="hidden xs:inline">Call</span>
            </a>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={onWhatsAppAdvisor}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-white text-xs font-bold shadow-xs transition-[background-color,border-color,box-shadow] duration-200 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Message on WhatsApp</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Portfolio Key Stats Matrix */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 pt-1">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-amber-200/80 shadow-2xs hover:border-amber-300 transition-colors">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono block truncate flex items-center gap-1">
              <Home className="w-3 h-3 text-gold" />
              Handpicked Homes
            </span>
            <strong className="text-base sm:text-lg font-extrabold text-slate-900 block mt-1 truncate font-serif">
              {unitsCount} Verified Units
            </strong>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-amber-200/80 shadow-2xs hover:border-amber-300 transition-colors">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono block truncate flex items-center gap-1">
              <Banknote className="w-3 h-3 text-gold" />
              All-In Price Range
            </span>
            <strong className="text-base sm:text-lg font-extrabold text-gold block mt-1 truncate font-mono">
              {formattedPrice}
            </strong>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-amber-200/80 shadow-2xs hover:border-amber-300 transition-colors">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono block truncate flex items-center gap-1">
              <Layers className="w-3 h-3 text-gold" />
              Configuration
            </span>
            <strong className="text-base sm:text-lg font-extrabold text-slate-900 block mt-1 truncate font-serif">
              {configs} Layouts
            </strong>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-amber-200/80 shadow-2xs hover:border-amber-300 transition-colors">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono block truncate flex items-center gap-1">
              <MapPin className="w-3 h-3 text-gold" />
              Target Locality
            </span>
            <strong className="text-base sm:text-lg font-extrabold text-slate-900 block mt-1 truncate font-serif">
              {primaryLocality}
            </strong>
          </div>
        </div>

        {/* Advisory Trust Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 px-1 text-xs text-slate-600 font-serif border-t border-amber-200/60">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>100% MahaRERA Sanctioned Records</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>0% GST on Ready Possession Homes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-gold shrink-0" />
            <span>Zero Hidden Developer Charges</span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
