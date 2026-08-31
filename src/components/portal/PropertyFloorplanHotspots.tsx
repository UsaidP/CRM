'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ruler,
  Sun,
  Wind,
  Maximize2,
  CheckCircle2,
  Sparkles,
  Layout,
  Compass,
} from 'lucide-react';

interface RoomDetail {
  id: string;
  name: string;
  dimensionsImperial: string;
  dimensionsMetric: string;
  carpetAreaSqft: number;
  sunlightDirection: string;
  features: string[];
}

interface PropertyFloorplanHotspotsProps {
  unit: any;
}

export function PropertyFloorplanHotspots({ unit }: PropertyFloorplanHotspotsProps) {
  const is2Bhk = unit.bhk >= 2;
  const is3Bhk = unit.bhk >= 3;

  const rooms: RoomDetail[] = [
    {
      id: 'living',
      name: 'Living & Dining Hall',
      dimensionsImperial: '11\'0" × 17\'6"',
      dimensionsMetric: '3.35m × 5.33m',
      carpetAreaSqft: Math.round(unit.carpetAreaSqft * 0.32),
      sunlightDirection: 'Morning East Light',
      features: [
        'Vitrified 800×800mm flooring',
        'Attached 5ft wide sun deck',
        'Cross-ventilation dining nook',
      ],
    },
    {
      id: 'master',
      name: 'Master Suite Bedroom',
      dimensionsImperial: '11\'0" × 13\'0"',
      dimensionsMetric: '3.35m × 3.96m',
      carpetAreaSqft: Math.round(unit.carpetAreaSqft * 0.25),
      sunlightDirection: 'East-West Natural Breeze',
      features: [
        'Attached master washroom with premium CP fittings',
        'Dedicated wardrobe recess',
        'AC point pre-installed',
      ],
    },
    {
      id: 'kitchen',
      name: 'Modular Granite Kitchen',
      dimensionsImperial: '8\'0" × 10\'0"',
      dimensionsMetric: '2.44m × 3.05m',
      carpetAreaSqft: Math.round(unit.carpetAreaSqft * 0.14),
      sunlightDirection: 'Well-lit Dry Yard',
      features: [
        'Parallel black granite platform with SS sink',
        'Enclosed utility dry balcony for washing machine',
        'Piped gas provision line',
      ],
    },
    ...(is2Bhk
      ? [
          {
            id: 'bedroom2',
            name: 'Children / Guest Bedroom',
            dimensionsImperial: '10\'0" × 11\'0"',
            dimensionsMetric: '3.05m × 3.35m',
            carpetAreaSqft: Math.round(unit.carpetAreaSqft * 0.18),
            sunlightDirection: 'Afternoon Soft Sun',
            features: [
              'Large french window with safety grill',
              'Space for study desk and king bed',
              'Adjacent common bathroom access',
            ],
          },
        ]
      : []),
    {
      id: 'balcony',
      name: 'Scenic French Balcony Deck',
      dimensionsImperial: '5\'0" × 11\'0"',
      dimensionsMetric: '1.52m × 3.35m',
      carpetAreaSqft: Math.round(unit.carpetAreaSqft * 0.11),
      sunlightDirection: 'Unobstructed Horizon View',
      features: [
        'Anti-skid ceramic tiles with toughened glass railing',
        'Overlooking internal podium garden or hill landscape',
      ],
    },
  ];

  const [selectedRoom, setSelectedRoom] = useState<RoomDetail>(rooms[0]);

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-slate-50 border border-slate-200 p-4 sm:p-6 space-y-4 text-slate-900 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-[#8C641E] flex items-center justify-center shadow-2xs">
            <Layout className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 font-serif">
              Interactive Room-by-Room Dimension Explorer
            </h4>
            <p className="text-[11px] text-slate-500">
              Click any room to inspect exact carpet sqft, layout metrics, and sunlight orientation
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-[#8C641E] bg-white px-2.5 py-1 rounded-xl border border-amber-200 shadow-2xs self-start sm:self-auto">
          Total Carpet: {unit.carpetAreaSqft} Sq.Ft
        </span>
      </div>

      {/* Room Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto py-1">
        {rooms.map((room) => {
          const isSelected = selectedRoom.id === room.id;
          return (
            <button
              key={room.id}
              type="button"
              onClick={() => setSelectedRoom(room)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-[#B38A38] to-[#8C641E] text-white shadow-xs'
                  : 'bg-white hover:bg-amber-50/60 text-slate-700 border border-slate-200 hover:border-amber-300'
              }`}
            >
              {room.name}
            </button>
          );
        })}
      </div>

      {/* Selected Room Detail Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedRoom.id}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
          className="p-4 sm:p-5 rounded-2xl bg-white border border-amber-200/90 shadow-xs space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#8C641E] font-mono tracking-wider">
                Selected Living Zone
              </span>
              <h5 className="text-sm sm:text-base font-extrabold text-slate-900 font-serif">
                {selectedRoom.name}
              </h5>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-[#8C641E] font-bold text-xs border border-amber-200">
                {selectedRoom.dimensionsImperial} ({selectedRoom.dimensionsMetric})
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
                ~{selectedRoom.carpetAreaSqft} Sq.Ft Carpet
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                Sunlight &amp; Ventilation:
              </span>
              <div className="flex items-center gap-1.5 text-slate-800 font-medium bg-slate-50 p-2 rounded-xl border border-slate-200">
                <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{selectedRoom.sunlightDirection}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                Architectural Specifications:
              </span>
              <ul className="space-y-1 text-slate-700">
                {selectedRoom.features.map((feat, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
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
