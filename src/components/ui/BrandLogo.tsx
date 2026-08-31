'use client';

import React from 'react';
import Image from 'next/image';

export interface BrandLogoProps {
  variant?: 'dark' | 'light' | 'auto';
  mode?: 'horizontal' | 'stacked' | 'icon' | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  withRera?: boolean;
  reraNumber?: string;
  className?: string;
  alt?: string;
}

export function BrandLogo({
  variant = 'auto',
  mode = 'horizontal',
  size = 'md',
  withRera = false,
  reraNumber = 'MahaRERA A52000028714',
  className = '',
  alt = 'Zam Zam Properties',
}: BrandLogoProps) {
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

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Exact Brand Logo Image */}
      <div className="relative shrink-0 flex items-center justify-center">
        {/* Dark Mode Image */}
        <Image
          src="/images/zamzam-logo-dark.png"
          alt={alt}
          width={pixelSize}
          height={pixelSize}
          className={`rounded-xl object-contain shadow-xs ${
            variant === 'light' ? 'hidden' : variant === 'dark' ? 'block' : 'hidden dark:block'
          }`}
          priority
        />
        {/* Light Mode Image */}
        <Image
          src="/images/zamzam-logo-light.png"
          alt={alt}
          width={pixelSize}
          height={pixelSize}
          className={`rounded-xl object-contain shadow-xs ${
            variant === 'dark' ? 'hidden' : variant === 'light' ? 'block' : 'block dark:hidden'
          }`}
          priority
        />
      </div>

      {/* Optional MahaRERA Registration Label beside logo */}
      {withRera && (
        <div className="flex flex-col justify-center min-w-0">
          <span className="font-extrabold text-sm tracking-wide text-content font-serif truncate">
            Zam Zam Properties
          </span>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-content-muted truncate font-mono mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse shrink-0" />
            <span className="truncate">{reraNumber}</span>
          </div>
        </div>
      )}
    </div>
  );
}
