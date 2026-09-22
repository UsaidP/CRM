'use client';

import React, { useState } from 'react';
import Image from 'next/image';

export interface BrandLogoProps {
  variant?: 'dark' | 'light' | 'auto';
  mode?: 'horizontal' | 'stacked' | 'icon' | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  withRera?: boolean;
  showFirmName?: boolean;
  reraNumber?: string;
  firmName?: string;
  className?: string;
  alt?: string;
}

export function BrandLogo({
  variant = 'auto',
  mode = 'horizontal',
  size = 'md',
  withRera = false,
  showFirmName,
  reraNumber = 'Verified Real Estate Advisory',
  firmName = 'Lucky CRM',
  className = '',
  alt = 'Firm Brand Logo',
}: BrandLogoProps) {
  const [imageError, setImageError] = useState(false);

  // Numeric size resolution
  const pixelSize = typeof size === 'number'
    ? size
    : size === 'xs'
    ? 28
    : size === 'sm'
    ? 36
    : size === 'md'
    ? 44
    : size === 'lg'
    ? 56
    : 72; // 'xl'

  const isLight = variant === 'light';
  const isDark = variant === 'dark';

  // Text color resolution with WCAG 2.1 AA compliant contrast (>= 4.5:1)
  const titleColor = isLight
    ? 'text-slate-900'
    : isDark
    ? 'text-white'
    : 'text-slate-900 dark:text-white';

  const subtitleColor = isLight
    ? 'text-slate-600'
    : isDark
    ? 'text-slate-300'
    : 'text-slate-600 dark:text-slate-300';

  const isLuckyBrand = firmName.toLowerCase().includes('lucky');
  const isZamZamBrand = firmName.toLowerCase().includes('zam');

  // Compute initials for generic custom firms
  const initials = firmName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'LC';

  // Responsive mode flags
  const isIconOnly = mode === 'icon';
  const isStacked = mode === 'stacked';
  // If showFirmName is explicitly specified, use it; otherwise show text if withRera is true and not icon-only
  const shouldRenderText = !isIconOnly && (showFirmName ?? withRera);

  return (
    <div
      className={`inline-flex min-w-0 transition-colors ${
        isStacked
          ? 'flex-col items-center text-center gap-2'
          : 'flex-row items-center gap-2.5 sm:gap-3'
      } ${className}`}
      role="banner"
      aria-label={firmName}
    >
      {/* Brand Mark Icon / Tile */}
      <div
        className="relative shrink-0 flex items-center justify-center rounded-xl overflow-hidden shadow-xs select-none transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none focus-within:ring-2 focus-within:ring-amber-500/50"
        style={{ width: pixelSize, height: pixelSize }}
        role="img"
        aria-label={`${firmName} insignia`}
      >
        {isLuckyBrand ? (
          // Bespoke Lucky CRM Luxury Monogram Mark
          <div
            className="w-full h-full rounded-xl bg-gradient-to-br from-[#0B1120] via-[#1E293B] to-[#0F172A] border border-amber-400/40 dark:border-amber-400/50 flex items-center justify-center p-1 shadow-xs"
            title={firmName}
          >
            <svg
              viewBox="0 0 32 32"
              fill="none"
              className="w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="luckyGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FDE047" />
                  <stop offset="45%" stopColor="#EAB308" />
                  <stop offset="100%" stopColor="#CA8A04" />
                </linearGradient>
              </defs>
              <path
                d="M18 3L7 16H16L14 29L25 15H17L18 3Z"
                fill="url(#luckyGoldGrad)"
                stroke="#CA8A04"
                strokeWidth="0.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ) : isZamZamBrand && !imageError ? (
          // ZamZam Luxury Gold Monogram Badge on Dark Canvas
          <div className="w-full h-full rounded-xl bg-[#0B111E] border border-amber-400/35 dark:border-amber-400/50 flex items-center justify-center p-1 shadow-xs">
            <Image
              src="/images/zamzam-logo-dark.png"
              alt={alt}
              width={pixelSize}
              height={pixelSize}
              className="w-full h-full rounded-lg object-contain"
              priority
              onError={() => setImageError(true)}
            />
          </div>
        ) : isZamZamBrand ? (
          // ZamZam SVG Monogram Fallback
          <div className="w-full h-full rounded-xl bg-[#0B111E] border border-amber-400/40 dark:border-amber-400/50 flex items-center justify-center p-1 shadow-xs">
            <svg viewBox="0 0 200 200" fill="none" className="w-[80%] h-[80%]" aria-hidden="true">
              <defs>
                <linearGradient id="zamGoldFallback" x1="40" y1="40" x2="160" y2="160" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#DFBA73" />
                  <stop offset="50%" stopColor="#C5A059" />
                  <stop offset="100%" stopColor="#9E7A36" />
                </linearGradient>
              </defs>
              <g fill="url(#zamGoldFallback)">
                <path d="M 44 48 L 156 48 L 156 60 L 76 140 L 156 140 L 156 152 L 44 152 L 44 140 L 124 60 L 44 60 Z" />
                <path d="M 68 76 L 82 62 L 142 122 L 128 136 Z" />
              </g>
            </svg>
          </div>
        ) : (
          // Generic Firm Custom Initials Badge
          <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-amber-400/30 dark:border-amber-400/40 flex items-center justify-center shadow-xs">
            <span
              className="font-extrabold font-display text-amber-300 tracking-wider"
              style={{ fontSize: Math.max(11, Math.round(pixelSize * 0.38)) }}
            >
              {initials}
            </span>
          </div>
        )}
      </div>

      {/* Firm Identity & Optional MahaRERA Registration Label */}
      {shouldRenderText && (
        <div
          className={`flex flex-col justify-center min-w-0 ${
            isStacked ? 'items-center text-center' : 'items-start flex-1 overflow-hidden'
          }`}
        >
          <span
            className={`font-bold tracking-tight ${titleColor} font-display truncate leading-tight block ${
              pixelSize >= 56 ? 'text-base sm:text-lg' : pixelSize >= 44 ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
            }`}
            title={firmName}
          >
            {firmName}
          </span>
          {withRera && (
            <div
              className={`flex items-center gap-1.5 font-medium ${subtitleColor} truncate font-mono mt-0.5 ${
                pixelSize >= 56 ? 'text-xs' : 'text-[10px]'
              }`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0 motion-reduce:animate-none"
                aria-hidden="true"
              />
              <span className="sr-only">RERA Registration Status: Active. </span>
              <span className="truncate font-semibold">{reraNumber}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

