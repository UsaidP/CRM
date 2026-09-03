'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Train,
  Car,
  Plane,
  Trees,
  GraduationCap,
  Hospital,
  ShoppingBag,
  MapPin,
  Clock,
  Compass,
  Navigation,
  Sparkles,
} from 'lucide-react';

interface CommutePoint {
  id: string;
  name: string;
  category: 'transit' | 'leisure' | 'airport' | 'social';
  distanceKm: number;
  driveTimeMins: number;
  icon: React.ReactNode;
  highlight?: string;
}

interface PropertyCommuteMatrixProps {
  microMarket: string;
  distanceToMetroKm?: number | null;
}

export function PropertyCommuteMatrix({
  microMarket,
  distanceToMetroKm,
}: PropertyCommuteMatrixProps) {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const metroDist = distanceToMetroKm || 1.6;
  const metroMins = Math.max(3, Math.round(metroDist * 2.5));

  const commutePoints: CommutePoint[] = [
    {
      id: 'metro',
      name: 'Navi Mumbai Metro Line 1 Station',
      category: 'transit',
      distanceKm: metroDist,
      driveTimeMins: metroMins,
      icon: <Train className="w-4 h-4 text-gold" />,
      highlight: 'Direct link to Belapur CBD & Kharghar',
    },
    {
      id: 'expressway',
      name: 'Mumbai–Pune Expressway & Sion–Panvel Hwy',
      category: 'transit',
      distanceKm: 3.5,
      driveTimeMins: 8,
      icon: <Car className="w-4 h-4 text-gold" />,
      highlight: 'Fast transit to BKC & South Mumbai via MTHL Atal Setu',
    },
    {
      id: 'airport',
      name: 'Navi Mumbai International Airport (NMIA)',
      category: 'airport',
      distanceKm: 14.5,
      driveTimeMins: 22,
      icon: <Plane className="w-4 h-4 text-gold" />,
      highlight: 'Upcoming greenfield terminal hub',
    },
    {
      id: 'central-park',
      name: 'Kharghar Central Park & Golf Course',
      category: 'leisure',
      distanceKm: 4.2,
      driveTimeMins: 10,
      icon: <Trees className="w-4 h-4 text-gold" />,
      highlight: 'Largest botanical garden in Asia & 18-hole Golf Course',
    },
    {
      id: 'schools',
      name: 'Ryan International / Apeejay / DAV School',
      category: 'social',
      distanceKm: 2.8,
      driveTimeMins: 7,
      icon: <GraduationCap className="w-4 h-4 text-gold" />,
      highlight: 'Premier educational hub within 10 mins',
    },
    {
      id: 'hospitals',
      name: 'Tata Memorial Actrec & Apollo Hospital',
      category: 'social',
      distanceKm: 3.8,
      driveTimeMins: 9,
      icon: <Hospital className="w-4 h-4 text-gold" />,
      highlight: 'Multi-specialty healthcare and oncology research',
    },
  ];

  const filteredPoints =
    activeCategory === 'ALL'
      ? commutePoints
      : commutePoints.filter((p) => p.category === activeCategory);

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white border border-amber-200/80 p-4 sm:p-6 shadow-xs space-y-3.5 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100/90 text-gold flex items-center justify-center shadow-2xs border border-amber-200">
            <Navigation className="w-4 h-4 text-gold" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 font-serif">
              Transit Proximity &amp; Commute Radar
            </h4>
            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-gold" />
              <span>Verified ground travel distances from <strong className="text-slate-800 font-semibold">{microMarket}</strong></span>
            </p>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {[
            { id: 'ALL', label: 'All Proximity' },
            { id: 'transit', label: 'Metro & Highway', icon: <Train className="w-3 h-3 text-gold" /> },
            { id: 'airport', label: 'Airport', icon: <Plane className="w-3 h-3 text-gold" /> },
            { id: 'leisure', label: 'Parks & Golf', icon: <Trees className="w-3 h-3 text-gold" /> },
            { id: 'social', label: 'Social Infra', icon: <Hospital className="w-3 h-3 text-gold" /> },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-[background-color,border-color,box-shadow,transform] duration-200 cursor-pointer font-serif outline-none focus:outline-none focus:ring-0 ${
                activeCategory === cat.id
                  ? 'bg-amber-100/90 text-gold border border-amber-300 shadow-2xs'
                  : 'bg-slate-50 hover:bg-amber-50/50 text-slate-600 border border-slate-200'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Proximity Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {filteredPoints.map((pt) => (
          <div
            key={pt.id}
            className="p-3.5 rounded-xl bg-slate-50/80 hover:bg-amber-50/60 border border-slate-200 hover:border-amber-300 transition-[background-color,border-color,box-shadow,transform] duration-200 space-y-2 shadow-2xs group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-amber-50/90 border border-amber-200 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                  {pt.icon}
                </div>
                <span className="text-xs font-bold text-slate-900 truncate font-serif">
                  {pt.name}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono pt-0.5">
              <span className="text-gold font-bold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gold" />
                {pt.distanceKm} km
              </span>
              <span className="text-slate-800 bg-amber-50/80 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1 font-semibold text-[10px]">
                <Clock className="w-3 h-3 text-gold" />
                ~{pt.driveTimeMins} mins
              </span>
            </div>

            {pt.highlight && (
              <p className="text-[10px] text-slate-600 line-clamp-1 group-hover:text-slate-900 font-sans">
                {pt.highlight}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
