'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  X,
  Building2,
  MapPin,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Ruler,
  Calculator,
  PhoneCall,
  Send,
  FileCheck,
} from 'lucide-react';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { formatLakhCr, formatIndianRupees } from '@/lib/money';

interface PortalDossierModalProps {
  dossierUnit: any | null;
  portal: any;
  advisor: any;
  onClose: () => void;
  onWhatsAppInquiry: (unit: any) => void;
}

export function PortalDossierModal({
  dossierUnit,
  portal,
  advisor,
  onClose,
  onWhatsAppInquiry,
}: PortalDossierModalProps) {
  if (!dossierUnit) return null;

  const project = dossierUnit.project || {};
  const agreementVal = dossierUnit.agreementValue || dossierUnit.allInTotalCost || 4500000;
  const stampDutyRate = dossierUnit.stampDutyRate ?? 6.0;
  const stampDutyAmount = Math.round(agreementVal * (stampDutyRate / 100));
  const registrationFee = dossierUnit.registrationFee ?? 30000;
  const totalAllIn = dossierUnit.allInTotalCost || agreementVal + stampDutyAmount + registrationFee;

  return (
    <AccessibleDialog
      open={Boolean(dossierUnit)}
      onClose={onClose}
      titleId="dossier-modal-title"
      descriptionId="dossier-modal-description"
      size="xl"
      panelClassName="p-0 rounded-2xl sm:rounded-3xl border border-amber-300 shadow-2xl overflow-hidden bg-white max-h-[90vh] flex flex-col text-slate-900"
    >
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Dossier Header */}
        <div className="p-3.5 sm:p-6 bg-gradient-to-r from-[#FFFDF9] via-[#FAF6EE] to-[#F5EEDB] border-b border-amber-200/80 flex items-center justify-between gap-2 sm:gap-3 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
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
            <div className="hidden sm:block border-l border-amber-300 pl-3">
              <h3 id="dossier-modal-title" className="text-sm font-bold text-slate-900 font-serif">
                Official Property Dossier &amp; Factsheet
              </h3>
              <p id="dossier-modal-description" className="text-[11px] text-gold font-medium font-mono">
                ZamZam Verified • Sanctioned MahaRERA Records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-bold shadow-2xs transition-[background-color,border-color,box-shadow,transform] duration-200 flex items-center gap-1.5 cursor-pointer"
              title="Print or Save as PDF"
            >
              <Download className="w-3.5 h-3.5 text-gold" />
              <span className="hidden xs:inline">Print / Save PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/90 hover:bg-white border border-amber-300 grid place-items-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              aria-label="Close dossier"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dossier Content Body */}
        <div className="p-4 sm:p-7 space-y-5 sm:space-y-6">
          {/* Project Headline & MahaRERA Verification */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-gold text-xs font-bold font-serif mb-1.5">
                <Sparkles className="w-3 h-3 text-gold" />
                {dossierUnit.bhk} BHK Luxury Residence
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif">
                {project.projectName}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 flex items-center gap-1.5 mt-1">
                <MapPin className="w-4 h-4 text-gold shrink-0" />
                <span>
                  {project.microMarket} • {project.distanceToMetroKm ? `${project.distanceToMetroKm} km to Metro` : 'Near Metro Station'}
                </span>
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-1.5">
              <a
                href="https://maharera.maharashtra.gov.in/projects-search-result"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition text-xs shadow-2xs"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  MahaRERA: <strong>{project.reraNumber}</strong>
                </span>
                <ExternalLink className="w-3 h-3 text-emerald-600 opacity-70 shrink-0" />
              </a>
              <span className="text-[10px] text-slate-400 font-mono">
                Government Registered &amp; Title Verified
              </span>
            </div>
          </div>

          {/* Elevation & Floor Plan Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Elevation View */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gold font-serif flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Building Elevation &amp; Façade
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-mono">
                  {project.totalFloors || 7} Storeys
                </span>
              </div>
              <div className="aspect-[16/10] rounded-xl overflow-hidden bg-slate-900 border border-slate-200 relative">
                <img
                  src={
                    project.coverImageUrl ||
                    '/images/projects/today-callisto-taloja-phase-2-sec21/cover.jpg'
                  }
                  alt={project.projectName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Floor Plan Blueprint */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gold font-serif flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5" /> Unit Floor Plan Layout
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-gold font-mono font-bold">
                  {dossierUnit.carpetAreaSqft} Sq.Ft RERA Carpet
                </span>
              </div>
              <div className="aspect-[16/10] rounded-xl overflow-hidden bg-white border border-slate-200 p-2 flex items-center justify-center">
                <img
                  src={
                    dossierUnit.floorPlanUrl ||
                    '/images/projects/today-callisto-taloja-phase-2-sec21/cover.jpg'
                  }
                  alt={`${dossierUnit.bhk} BHK Floor Plan`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* Transparent Statutory Financial Breakdown */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50/70 to-white border border-amber-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gold font-serif flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-gold" />
                Transparent On-Road Financial Breakdown
              </h4>
              <strong className="text-sm sm:text-base lg:text-lg font-extrabold text-gold font-mono break-words">
                Total All-In: {formatLakhCr(totalAllIn)}{' '}
                <span className="text-xs font-normal text-slate-600 block sm:inline">
                  ({formatIndianRupees(totalAllIn)})
                </span>
              </strong>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-amber-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-mono">Agreement Value</span>
                <strong className="text-slate-900 font-bold font-mono block truncate">
                  {formatLakhCr(agreementVal)}
                </strong>
                <span className="text-[10px] text-slate-500 font-mono block truncate">
                  {formatIndianRupees(agreementVal)}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-amber-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-mono">Stamp Duty ({stampDutyRate}%)</span>
                <strong className="text-slate-900 font-bold font-mono block truncate">
                  {formatIndianRupees(stampDutyAmount)}
                </strong>
                <span className="text-[10px] text-slate-500">Maha. Gov Stamp</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-amber-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-mono">Registration Fee</span>
                <strong className="text-slate-900 font-bold font-mono block truncate">
                  {formatIndianRupees(registrationFee)}
                </strong>
                <span className="text-[10px] text-slate-500">Gov. Flat Receipt</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-amber-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-mono">GST Status</span>
                <strong className="text-emerald-700 font-bold font-mono block truncate">
                  0% GST
                </strong>
                <span className="text-[10px] text-emerald-700">OC Received</span>
              </div>
            </div>
          </div>

          {/* Lifestyle Amenities */}
          {dossierUnit.amenities?.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono block">
                Sanctioned Amenities &amp; Specifications:
              </span>
              <div className="flex flex-wrap gap-2">
                {dossierUnit.amenities.map((am: string, i: number) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium"
                  >
                    ✨ {am}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dedicated Broker Advisor Action Card */}
          {(() => {
            const initials = (advisor.fullName || '')
              .trim()
              .split(/\s+/)
              .map((n: string) => n[0])
              .filter(Boolean)
              .join('')
              .slice(0, 2)
              .toUpperCase() || 'PA';

            return (
              <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-gold-lighter to-gold p-0.5 shrink-0">
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-amber-300 font-serif">
                      {initials}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block font-serif">
                      {advisor.fullName || 'Property Advisor'}
                    </span>
                    <span className="text-xs text-amber-300">
                      Senior Real Estate Advisor • {portal.organization?.name || 'ZamZam Properties'} Advisory Desk
                    </span>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {advisor.phoneE164 || '+91 99677 31071'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <a
                    href={`tel:${(advisor.phoneE164 || '+919967731071').replace(/\s+/g, '')}`}
                    className="flex-1 sm:flex-initial px-4.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call Advisor</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onWhatsAppInquiry(dossierUnit);
                    }}
                    className="flex-1 sm:flex-initial px-4.5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </AccessibleDialog>
  );
}
