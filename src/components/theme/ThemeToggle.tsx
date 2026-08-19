'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';
import { Sparkles, CircleDot, Zap } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-toggle flex items-center justify-between gap-1 text-[11px] font-semibold w-full">
      <button
        type="button"
        onClick={() => setTheme('gold-ink')}
        aria-pressed={theme === 'gold-ink'}
        title="Signature Gold on Dark Ink"
        className={`theme-toggle__button flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg ${
          theme === 'gold-ink' ? 'is-selected' : ''
        }`}
      >
        <Sparkles className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">Gold</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('monochrome')}
        aria-pressed={theme === 'monochrome'}
        title="High-Contrast Black & White"
        className={`theme-toggle__button flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg ${
          theme === 'monochrome' ? 'is-selected' : ''
        }`}
      >
        <CircleDot className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">Mono</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('cobalt')}
        aria-pressed={theme === 'cobalt'}
        title="Electric Cobalt Modern Minimal"
        className={`theme-toggle__button flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg ${
          theme === 'cobalt' ? 'is-selected' : ''
        }`}
      >
        <Zap className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">Cobalt</span>
      </button>
    </div>
  );
}

