'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Layers,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Building2,
  Maximize2,
  Ruler,
  Compass,
  Train,
  Calculator,
  X,
  Send,
  Calendar,
} from 'lucide-react';
import { formatLakhCr, formatIndianRupees } from '@/lib/money';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';

interface PortalComparisonTrayProps {
  portal: any;
  onScrollToUnit: (unitId: string) => void;
  isOpenModal?: boolean;
  onCloseModal?: () => void;
  onSelectUnitForBooking?: (unit: any) => void;
  onWhatsAppInquiry?: (unit: any) => void;
}

export function PortalComparisonTray({
  portal,
  onScrollToUnit,
  isOpenModal,
  onCloseModal,
  onSelectUnitForBooking,
  onWhatsAppInquiry,
}: PortalComparisonTrayProps) {
  const units = portal.portalUnits || [];
  if (units.length <= 1) return null;

  return (
    <>
      {/* INLINE COMPARISON GLANCE SECTION */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-100 text-gold shadow-2xs">
                <Layers className="w-4 h-4" />
              </span>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 font-serif">
                Quick Comparison at a Glance
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Compare your curated options side-by-side to find the ideal match for your lifestyle &amp; budget.
            </p>
          </div>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 ${units.length > 2 ? 'lg:grid-cols-3' : ''}`}>
          {units.map((item: any, idx: number) => {
            const u = item.propertyUnit;
            const p = u.project;
            const photos = (u.mediaGallery || []).filter((m: any) => m.kind === 'image');
            const coverImg =
              photos[0]?.url ||
              p.coverImageUrl ||
              '/images/projects/today-callisto-taloja-phase-2-sec21/cover.jpg';

            return (
              <motion.div
                key={u.id}
                role="button"
                tabIndex={0}
                aria-label={`View details for ${p.projectName}, option ${idx + 1}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onScrollToUnit(u.id);
                  }
                }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                onClick={() => onScrollToUnit(u.id)}
                className="rounded-3xl bg-white border border-amber-200/90 hover:border-amber-400 outline-none focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 p-4.5 sm:p-5 transition-[background-color,border-color,box-shadow] duration-200 shadow-[0_4px_20px_-4px_rgba(140,100,30,0.06)] hover:shadow-lg space-y-3.5 group cursor-pointer text-slate-900 flex flex-col justify-between select-none"
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden bg-slate-900 shrink-0 border border-amber-200 relative shadow-2xs">
                      <img
                        src={coverImg}
                        alt={p.projectName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-[#0F172A]/90 text-amber-300 text-[10px] font-bold font-mono border border-amber-400/40 shadow-xs">
                        #{idx + 1}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 truncate font-serif">
                          {p.projectName}
                        </span>
                        {item.brokerHighlight && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100/90 text-gold border border-amber-300 font-bold truncate font-serif shadow-2xs">
                            <Sparkles className="w-2.5 h-2.5 text-gold shrink-0" />
                            <span>{item.brokerHighlight}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gold shrink-0" />
                        <span className="truncate">{p.microMarket}</span>
                      </p>
                      <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
                        <strong className="text-base sm:text-lg font-extrabold text-gold font-mono">
                          {formatLakhCr(u.allInTotalCost)}
                        </strong>
                        <span className="text-[10px] text-slate-500 font-mono">All-Inclusive</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                    <div className="truncate">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold font-mono">
                        Carpet Area
                      </span>
                      <strong className="text-slate-800 font-medium truncate block font-serif">
                        {u.carpetAreaSqft} sq.ft
                      </strong>
                    </div>
                    <div className="truncate">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold font-mono">
                        Floor & Facing
                      </span>
                      <strong className="text-slate-800 font-medium truncate block">
                        Fl {u.floorNumber} • {u.facing?.replace('_', ' ')}
                      </strong>
                    </div>
                    <div className="truncate">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold font-mono">
                        To Metro
                      </span>
                      <strong className="text-slate-800 font-medium truncate block">
                        {p.distanceToMetroKm || 1.6} km
                      </strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onScrollToUnit(u.id);
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-50/80 group-hover:bg-amber-50 group-hover:text-gold text-xs font-bold text-slate-700 border border-slate-200 group-hover:border-amber-300 flex items-center justify-center gap-1.5 transition-[background-color,border-color,box-shadow,transform] duration-200 cursor-pointer font-serif"
                >
                  <span>Explore Unit Specs &amp; Tour</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gold shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* FULL COMPARISON MODAL DIALOG (Triggered from Header button) */}
      {isOpenModal && (
        <AccessibleDialog
          open={isOpenModal}
          onClose={onCloseModal || (() => {})}
          titleId="comparison-modal-title"
          descriptionId="comparison-modal-description"
          size="xl"
          panelClassName="p-0 rounded-3xl border border-amber-300 shadow-2xl overflow-hidden bg-white max-h-[90vh] flex flex-col"
        >
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 bg-gradient-to-r from-amber-50/90 via-white to-amber-50/90 border-b border-amber-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gold text-white flex items-center justify-center shadow-2xs">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="comparison-modal-title" className="text-base sm:text-lg font-bold text-slate-900 font-serif">
                    Side-by-Side Property Comparison Matrix
                  </h3>
                  <p id="comparison-modal-description" className="text-xs text-slate-600">
                    Comparing {units.length} verified curated options for {portal.lead?.fullName || 'Client'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onCloseModal}
                className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 grid place-items-center text-slate-600 hover:text-slate-900 cursor-pointer"
                aria-label="Close comparison"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Matrix Table */}
            <div className="p-4 sm:p-6 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-3 px-3 w-40 font-mono uppercase text-[10px] font-bold">Comparison Metric</th>
                    {units.map((item: any, i: number) => (
                      <th key={item.id} className="py-3 px-3 font-serif font-bold text-slate-900 text-sm">
                        Option #{i + 1}: {item.propertyUnit.project.projectName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-500 font-mono text-[11px]">All-In Total Cost</td>
                    {units.map((item: any) => (
                      <td key={item.id} className="py-3 px-3 font-mono font-extrabold text-base text-gold">
                        {formatLakhCr(item.propertyUnit.allInTotalCost)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-500 font-mono text-[11px]">RERA Carpet Area</td>
                    {units.map((item: any) => (
                      <td key={item.id} className="py-3 px-3 font-medium text-slate-900">
                        {item.propertyUnit.carpetAreaSqft} sq.ft ({item.propertyUnit.bhk} BHK)
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-500 font-mono text-[11px]">Micro-Market</td>
                    {units.map((item: any) => (
                      <td key={item.id} className="py-3 px-3 text-slate-800">
                        {item.propertyUnit.project.microMarket}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-500 font-mono text-[11px]">Possession &amp; OC</td>
                    {units.map((item: any) => {
                      const isOc = Boolean(
                        item.propertyUnit.project?.hasOccupancyCertificate ||
                        item.propertyUnit.possessionStatus === 'READY_TO_MOVE'
                      );
                      return (
                        <td key={item.id} className="py-3 px-3 font-semibold">
                          {isOc ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Ready OC (0% GST)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800">
                              <Calendar className="w-3.5 h-3.5 text-amber-600" />
                              Under Construction (5% GST)
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-500 font-mono text-[11px]">Floor &amp; Facing</td>
                    {units.map((item: any) => (
                      <td key={item.id} className="py-3 px-3 text-slate-800">
                        Floor {item.propertyUnit.floorNumber} of {item.propertyUnit.totalFloors} • {item.propertyUnit.facing?.replace('_', ' ')}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-500 font-mono text-[11px]">Distance to Metro</td>
                    {units.map((item: any) => (
                      <td key={item.id} className="py-3 px-3 text-slate-800">
                        {item.propertyUnit.project.distanceToMetroKm || 1.6} km
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-500 font-mono text-[11px]">MahaRERA Reg.</td>
                    {units.map((item: any) => (
                      <td key={item.id} className="py-3 px-3 font-mono text-emerald-900 text-[11px] font-bold">
                        {item.propertyUnit.project.reraNumber}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-500 font-mono text-[11px]">Action</td>
                    {units.map((item: any) => (
                      <td key={item.id} className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onCloseModal?.();
                              onScrollToUnit(item.propertyUnit.id);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-gold border border-amber-200 text-xs font-bold transition cursor-pointer font-serif"
                          >
                            View Card
                          </button>
                          {onWhatsAppInquiry && (
                            <button
                              type="button"
                              onClick={() => {
                                onCloseModal?.();
                                onWhatsAppInquiry(item.propertyUnit);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </AccessibleDialog>
      )}
    </>
  );
}
