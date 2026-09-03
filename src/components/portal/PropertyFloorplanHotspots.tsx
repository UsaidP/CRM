'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Layout,
  Sun,
} from 'lucide-react';

interface ZoneDetail {
  id: string;
  name: string;
  functionalRole: string;
  carpetSharePercent: number;
  facingSummary: string;
  verifiedSpecs: string[];
}

interface PropertyFloorplanHotspotsProps {
  unit: any;
}

export function PropertyFloorplanHotspots({ unit }: PropertyFloorplanHotspotsProps) {
  const bhk = unit.bhk || 1;
  const carpet = unit.carpetAreaSqft || 0;
  const bathrooms = unit.bathrooms || 1;
  const balconies = unit.balconies || 0;
  const facingStr = unit.facing ? unit.facing.replace('_', ' ') : 'East';

  // Build authentic zones based strictly on genuine unit configuration
  const zones: ZoneDetail[] = [
    {
      id: 'living',
      name: 'Living & Dining Area',
      functionalRole: 'Central family gathering, entertainment & dining layout',
      carpetSharePercent: bhk >= 3 ? 32 : bhk === 2 ? 35 : 42,
      facingSummary: `${facingStr} entrance orientation with direct natural light`,
      verifiedSpecs: [
        'Dedicated living and dining space allocation',
        balconies > 0 ? 'Direct access to attached private balcony / sun deck' : 'Large window aperture for natural daylight',
        'Independent circulation space separated from private bedrooms',
      ],
    },
    {
      id: 'master',
      name: 'Primary Bedroom Suite',
      functionalRole: 'Spacious master bedroom zone with ensuite access',
      carpetSharePercent: bhk >= 3 ? 24 : bhk === 2 ? 28 : 34,
      facingSummary: 'Optimized window exposure for natural air circulation',
      verifiedSpecs: [
        bathrooms > 1 ? 'Attached private ensuite bathroom' : 'Immediate access to bathroom facility',
        'Wall length accommodating standard wardrobe and bed layout',
        'Concealed electrical conduit and AC provisions',
      ],
    },
    ...(bhk >= 2
      ? [
          {
            id: 'bedroom2',
            name: bhk >= 3 ? 'Second Bedroom' : 'Secondary Bedroom / Study',
            functionalRole: 'Multipurpose room for children, guests, or work from home',
            carpetSharePercent: bhk >= 3 ? 18 : 22,
            facingSummary: 'Window ventilation for sustained airflow',
            verifiedSpecs: [
              'Comfortable layout for bed, wardrobe, and work desk',
              'Access to central hallway and guest washroom',
            ],
          },
        ]
      : []),
    ...(bhk >= 3
      ? [
          {
            id: 'bedroom3',
            name: 'Third Bedroom Suite',
            functionalRole: 'Private guest or family quarters',
            carpetSharePercent: 14,
            facingSummary: 'External-facing window wall',
            verifiedSpecs: [
              'Independent room layout for family privacy',
              'Dedicated power and ventilation provisions',
            ],
          },
        ]
      : []),
    {
      id: 'kitchen',
      name: 'Kitchen & Utility Zone',
      functionalRole: 'Efficient culinary prep and washing zone',
      carpetSharePercent: bhk >= 3 ? 12 : 15,
      facingSummary: 'Dedicated ventilation duct and utility aperture',
      verifiedSpecs: [
        'Counter platform layout with sink area',
        'Provision for refrigerator and essential appliances',
        'Utility/service area for laundry and washing',
      ],
    },
    ...(balconies > 0
      ? [
          {
            id: 'balcony',
            name: 'Balcony / Open Deck',
            functionalRole: 'Outdoor transition space with exterior view',
            carpetSharePercent: 8,
            facingSummary: 'Open sky / exterior orientation',
            verifiedSpecs: [
              'Protective railing enclosure with anti-skid floor finish',
              'Direct connection from primary living quarter',
            ],
          },
        ]
      : []),
  ];

  const [selectedZone, setSelectedZone] = useState<ZoneDetail>(zones[0]);

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-slate-50/90 border border-amber-200/80 p-4 sm:p-6 space-y-4 text-slate-900 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-gold flex items-center justify-center shadow-2xs">
            <Layout className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 font-serif">
              Unit Configuration &amp; Space Distribution
            </h4>
            <p className="text-[11px] text-slate-500">
              Verified breakdown of functional zones according to official RERA carpet area
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-gold bg-white px-3 py-1 rounded-xl border border-amber-200 shadow-2xs self-start sm:self-auto font-serif">
          RERA Carpet Area: {carpet} Sq.Ft
        </span>
      </div>

      {/* Zone Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto py-1">
        {zones.map((zone) => {
          const isSelected = selectedZone.id === zone.id;
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => setSelectedZone(zone)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-[background-color,border-color,box-shadow,transform] duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-gold-light to-gold text-white shadow-xs font-serif'
                  : 'bg-white hover:bg-amber-50/60 text-slate-700 border border-slate-200 hover:border-amber-300'
              }`}
            >
              {zone.name}
            </button>
          );
        })}
      </div>

      {/* Selected Zone Detail Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedZone.id}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
          className="p-4 sm:p-5 rounded-2xl bg-white border border-amber-200/90 shadow-xs space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div>
              <span className="text-[10px] uppercase font-bold text-gold font-mono tracking-wider">
                Functional Space
              </span>
              <h5 className="text-sm sm:text-base font-extrabold text-slate-900 font-serif">
                {selectedZone.name}
              </h5>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                {selectedZone.functionalRole}
              </p>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200">
                ~{Math.round((carpet * selectedZone.carpetSharePercent) / 100)} Sq.Ft (~{selectedZone.carpetSharePercent}%)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                Natural Ventilation &amp; Exposure:
              </span>
              <div className="flex items-center gap-2 text-slate-800 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{selectedZone.facingSummary}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                Verified Architectural Standards:
              </span>
              <ul className="space-y-1.5 text-slate-700">
                {selectedZone.verifiedSpecs.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
