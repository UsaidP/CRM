'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  MapPin,
  ShieldCheck,
  Send,
  PhoneCall,
  Calendar,
  Download,
  Check,
  Play,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Compass,
  FileText,
  Layout,
  Navigation,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PropertyMediaHub } from './PropertyMediaHub';
import { PropertyPricingBreakdown } from './PropertyPricingBreakdown';
import { PropertyCommuteMatrix } from './PropertyCommuteMatrix';
import { PropertyFloorplanHotspots } from './PropertyFloorplanHotspots';
import { PortalEmiCalculator } from './PortalEmiCalculator';
import { InventoryMediaAsset } from '@/lib/inventory-media';

interface PropertyCardProps {
  item: any;
  index: number;
  totalCount: number;
  advisor: any;
  onOpenLightbox: (unit: any, photos: InventoryMediaAsset[], index: number) => void;
  onOpenVideoPlayer: (unit: any, videoAsset?: InventoryMediaAsset) => void;
  onOpenDossier: (unit: any) => void;
  onOpenBooking: (unit: any) => void;
  onWhatsAppInquiry: (unit: any) => void;
  sendTelemetry: (action: string, unitId?: string) => void;
}

export function PropertyCard({
  item,
  index,
  totalCount,
  advisor,
  onOpenLightbox,
  onOpenVideoPlayer,
  onOpenDossier,
  onOpenBooking,
  onWhatsAppInquiry,
  sendTelemetry,
}: PropertyCardProps) {
  const unit = item.propertyUnit;
  const project = unit.project;

  const [activeExtraView, setActiveExtraView] = useState<'NONE' | 'ROOMS' | 'COMMUTE'>('NONE');

  return (
    <motion.article
      id={`property-card-${unit.id}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-3xl border border-slate-200/90 bg-white shadow-md overflow-hidden transition-all hover:border-amber-300/90 hover:shadow-lg space-y-0 text-slate-900"
    >
      {/* Top Option Ribbon */}
      <div className="bg-gradient-to-r from-amber-50/90 via-white to-amber-50/90 border-b border-amber-200/80 px-4 py-3.5 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="rounded-full bg-white border border-amber-300 px-3.5 py-1 text-xs font-extrabold text-[#8C641E] font-serif shadow-2xs">
            Option {String(index + 1).padStart(2, '0')} of {String(totalCount).padStart(2, '0')}
          </span>
          {item.brokerHighlight && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/70 border border-amber-300 text-[#8C641E] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#8C641E]" />
              {item.brokerHighlight}
            </span>
          )}
        </div>

        {/* MahaRERA Statutory Pill with External Link */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-600">
          <a
            href="https://maharera.maharashtra.gov.in/projects-search-result"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-2xs max-w-full truncate"
            title="Verify this project directly on the official Government of Maharashtra MahaRERA portal"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">
              MahaRERA: <strong className="text-emerald-950 font-bold">{project.reraNumber}</strong>
            </span>
            <ExternalLink className="w-3 h-3 text-emerald-600 opacity-70 shrink-0" />
          </a>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/60 px-2.5 py-1 rounded-xl border border-emerald-200/70 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Verified
          </span>
        </div>
      </div>

      {/* Media Hub (Photos, Host Walkthrough Video, Sanctioned Floor Plan) */}
      <PropertyMediaHub
        unit={unit}
        project={project}
        advisor={advisor}
        onOpenLightbox={(photos, idx) => onOpenLightbox(unit, photos, idx)}
        onOpenVideoPlayer={(videoAsset) => onOpenVideoPlayer(unit, videoAsset)}
        sendTelemetry={sendTelemetry}
      />

      {/* Property Details, Pricing Breakdown & Advisor Insights */}
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Project Title & Micro-Market */}
        <div className="space-y-1 sm:space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-bold uppercase tracking-wider text-[#8C641E] font-serif">
              {unit.bhk} BHK • Unit {unit.unitNumber || 'Selected'}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Ready Possession with Full OC
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 font-serif tracking-tight">
            {project.projectName}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#8C641E] shrink-0" />
            <span>
              {project.microMarket} • {project.distanceToMetroKm ? `${project.distanceToMetroKm} km to Metro` : 'Near Metro Station'}
            </span>
          </p>
        </div>

        {/* Transparent On-Road Price Ledger */}
        <PropertyPricingBreakdown unit={unit} project={project} />

        {/* Advisor Checklist & Specs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 pt-2">
          {/* Left: Advisor Checklist Highlights */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C641E] font-serif flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#8C641E]" />
              Advisor Checklist &amp; Key Highlights
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-700">
              <li className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Full Occupancy Certificate (OC):</strong> 100% legal title clearance with 0% GST liability.
                </span>
              </li>
              <li className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Prime Connectivity:</strong> Only {project.distanceToMetroKm || 1.6} km from Metro Station &amp; central 24m arterial road.
                </span>
              </li>
              <li className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Vastu Compliant:</strong> {unit.facing?.replace('_', ' ')} entrance orientation with natural cross-ventilation.
                </span>
              </li>
              <li className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Floor Level:</strong> High floor ({unit.floorNumber} of {unit.totalFloors}) with panoramic green views.
                </span>
              </li>
            </ul>

            {unit.description && (
              <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/80 text-xs text-slate-700 leading-relaxed">
                <strong className="text-slate-900 block mb-1 font-serif">
                  Advisor&apos;s Specific Observation:
                </strong>
                {unit.description}
              </div>
            )}
          </div>

          {/* Right: Key Specs 6-Grid */}
          <div className="space-y-3 self-start">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase text-slate-400 font-mono block font-semibold truncate">
                  Configuration
                </span>
                <strong className="text-xs sm:text-sm font-bold text-slate-900 block mt-0.5 truncate font-serif">
                  {unit.bhk} BHK Luxury
                </strong>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase text-slate-400 font-mono block font-semibold truncate">
                  Carpet Area
                </span>
                <strong className="text-xs sm:text-sm font-bold text-[#8C641E] block mt-0.5 truncate font-serif">
                  {unit.carpetAreaSqft} sq.ft
                </strong>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase text-slate-400 font-mono block font-semibold truncate">
                  Baths / Deck
                </span>
                <strong className="text-xs sm:text-sm font-bold text-slate-900 block mt-0.5 truncate">
                  {unit.bathrooms} Baths • {unit.balconies} Deck
                </strong>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase text-slate-400 font-mono block font-semibold truncate">
                  Floor Level
                </span>
                <strong className="text-xs sm:text-sm font-bold text-slate-900 block mt-0.5 truncate">
                  Floor {unit.floorNumber} / {unit.totalFloors}
                </strong>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase text-slate-400 font-mono block font-semibold truncate">
                  Facing
                </span>
                <strong className="text-xs sm:text-sm font-bold text-[#8C641E] block mt-0.5 truncate">
                  {unit.facing?.replace('_', ' ')}
                </strong>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase text-slate-400 font-mono block font-semibold truncate">
                  Metro Distance
                </span>
                <strong className="text-xs sm:text-sm font-bold text-slate-900 block mt-0.5 truncate">
                  {project.distanceToMetroKm || 1.6} km
                </strong>
              </div>
            </div>

            {/* Extra Exploratory Toggles: Room Explorer & Commute Radar */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  setActiveExtraView(activeExtraView === 'ROOMS' ? 'NONE' : 'ROOMS')
                }
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                  activeExtraView === 'ROOMS'
                    ? 'bg-amber-100 border-amber-300 text-[#8C641E]'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Layout className="w-3.5 h-3.5 text-[#8C641E]" />
                <span>Room Dimensions</span>
                {activeExtraView === 'ROOMS' ? (
                  <ChevronUp className="w-3.5 h-3.5 ml-auto" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 ml-auto" />
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveExtraView(activeExtraView === 'COMMUTE' ? 'NONE' : 'COMMUTE')
                }
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                  activeExtraView === 'COMMUTE'
                    ? 'bg-amber-100 border-amber-300 text-[#8C641E]'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Navigation className="w-3.5 h-3.5 text-[#8C641E]" />
                <span>Commute Radar</span>
                {activeExtraView === 'COMMUTE' ? (
                  <ChevronUp className="w-3.5 h-3.5 ml-auto" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 ml-auto" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Exploratory Views */}
        <AnimatePresence>
          {activeExtraView === 'ROOMS' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <PropertyFloorplanHotspots unit={unit} />
            </motion.div>
          )}

          {activeExtraView === 'COMMUTE' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <PropertyCommuteMatrix
                microMarket={project.microMarket}
                distanceToMetroKm={project.distanceToMetroKm}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Interactive Home Loan & EMI Simulator */}
        <PortalEmiCalculator
          unit={unit}
          projectName={project.projectName}
          advisorPhone={advisor.phoneE164}
        />

        {/* Society & Clubhouse Amenities */}
        {unit.amenities?.length > 0 && (
          <div className="space-y-2 pt-1">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
              Clubhouse &amp; Podium Amenities:
            </span>
            <div className="flex flex-wrap gap-2">
              {unit.amenities.map((am: string, i: number) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium shadow-2xs"
                >
                  ✨ {am}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons Hub */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => onOpenDossier(unit)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 px-4.5 py-3 text-xs font-bold text-slate-700 transition-all shadow-xs cursor-pointer"
            title="Download or Print Verified Property Factsheet (PDF)"
          >
            <Download className="w-4 h-4 text-[#8C641E]" />
            <span>{project.brochureUrl ? 'Download Brochure (PDF)' : 'Export Property Dossier (PDF)'}</span>
          </motion.button>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Schedule Physical Site Visit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => onOpenBooking(unit)}
              className="flex-1 sm:flex-initial rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100/80 hover:from-amber-100 hover:to-amber-200/80 px-4.5 py-3 text-xs font-bold text-[#8C641E] flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer min-w-[150px]"
            >
              <Calendar className="w-4 h-4 text-[#8C641E]" />
              <span>Book Physical Visit</span>
            </motion.button>

            {/* Ask on WhatsApp Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => onWhatsAppInquiry(unit)}
              className="w-full xs:w-auto flex-1 sm:flex-initial rounded-2xl bg-gradient-to-r from-[#B38A38] to-[#8C641E] px-5 py-3 text-xs font-extrabold text-white shadow-md hover:brightness-105 flex items-center justify-center gap-2 transition-all cursor-pointer min-w-[150px]"
            >
              <Send className="w-4 h-4" />
              <span>Ask on WhatsApp</span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
