'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';
import { Sparkles, CircleDot } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-1 rounded-xl bg-black/60 border border-[#b59658]/25 backdrop-blur-md flex items-center justify-between gap-1 text-[11px] font-semibold w-full">
      <button
        onClick={() => setTheme('gold-ink')}
        title="Signature Gold on Dark Ink"
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
          theme === 'gold-ink'
            ? 'bg-[#1b202c] text-[#ccb67b] border border-[#b59658]/50 shadow-sm font-bold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5 text-[#b59658]" />
        <span>Gold &amp; Ink</span>
      </button>

      <button
        onClick={() => setTheme('monochrome')}
        title="High-Contrast Black & White"
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
          theme === 'monochrome'
            ? 'bg-white text-black border border-white font-extrabold shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <CircleDot className="w-3.5 h-3.5 text-white" />
        <span>B&amp;W Mono</span>
      </button>
    </div>
  );
}
