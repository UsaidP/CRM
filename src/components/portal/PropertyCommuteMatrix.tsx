'use client';

import React, { useState } from 'react';
import {
  Train,
  Car,
  Plane,
  Trees,
  GraduationCap,
  Hospital,
  MapPin,
  Clock,
  Navigation,
} from 'lucide-react';

interface CommutePoint {
  id: string;
  name: string;
  category: 'transit' | 'leisure' | 'airport' | 'social';
  distanceText: string;
  driveTimeText: string;
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

  const hasMetro = typeof distanceToMetroKm === 'number' && distanceToMetroKm > 0;
  const metroMins = hasMetro ? Math.max(3, Math.round(distanceToMetroKm * 3)) : null;

  const commutePoints: CommutePoint[] = [
    ...(hasMetro
      ? [
          {
            id: 'metro',
            name: 'Rapid Metro Station',
            category: 'transit' as const,
            distanceText: `${distanceToMetroKm} km`,
            driveTimeText: `~${metroMins} mins`,
            icon: <Train className="w-4 h-4 text-gold" />,
            highlight: 'Direct link to key commercial centers & suburban network',
          },
        ]
      : [
          {
            id: 'metro-corridor',
            name: 'Transit Arterial Road',
            category: 'transit' as const,
            distanceText: 'Direct Access',
            driveTimeText: '~5 mins',
            icon: <Train className="w-4 h-4 text-gold" />,
            highlight: `Connected to primary road artery serving ${microMarket}`,
          },
        ]),
    {
      id: 'expressway',
      name: 'Highway & Arterial Network',
      category: 'transit',
      distanceText: 'Regional Link',
      driveTimeText: '~10-15 mins',
      icon: <Car className="w-4 h-4 text-gold" />,
      highlight: 'Connecting to Mumbai-Pune Expressway, Sion-Panvel & MTHL corridors',
    },
    {
      id: 'airport',
      name: 'Navi Mumbai International Airport (NMIA)',
      category: 'airport',
      distanceText: 'Regional Corridor',
      driveTimeText: '~25-35 mins',
      icon: <Plane className="w-4 h-4 text-gold" />,
      highlight: 'Upcoming major civil aviation hub for MMR region',
    },
    {
      id: 'cbd',
      name: 'Commercial & Business Districts',
      category: 'social',
      distanceText: 'Direct Arterial',
      driveTimeText: '~15-20 mins',
      icon: <Trees className="w-4 h-4 text-gold" />,
      highlight: `Commercial districts and corporate hubs accessible from ${microMarket}`,
    },
    {
      id: 'schools',
      name: 'Reputed Schools & Colleges',
      category: 'social',
      distanceText: 'Local Radius',
      driveTimeText: '~5-10 mins',
      icon: <GraduationCap className="w-4 h-4 text-gold" />,
      highlight: `Educational institutions serving the ${microMarket} catchment`,
    },
    {
      id: 'hospitals',
      name: 'Multi-Specialty Medical Facilities',
      category: 'social',
      distanceText: 'Local Radius',
      driveTimeText: '~10-15 mins',
      icon: <Hospital className="w-4 h-4 text-gold" />,
      highlight: 'Established healthcare centers and emergency care facilities',
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
              Transit Proximity &amp; Regional Connectivity
            </h4>
            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-gold" />
              <span>Travel corridor overview for <strong className="text-slate-800 font-semibold">{microMarket}</strong></span>
            </p>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {[
            { id: 'ALL', label: 'All Proximity' },
            { id: 'transit', label: 'Transit & Road', icon: <Train className="w-3 h-3 text-gold" /> },
            { id: 'airport', label: 'Airport', icon: <Plane className="w-3 h-3 text-gold" /> },
            { id: 'social', label: 'Social Infrastructure', icon: <Hospital className="w-3 h-3 text-gold" /> },
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
                {pt.distanceText}
              </span>
              <span className="text-slate-800 bg-amber-50/80 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1 font-semibold text-[10px]">
                <Clock className="w-3 h-3 text-gold" />
                {pt.driveTimeText}
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
