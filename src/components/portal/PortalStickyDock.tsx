'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Send, Calendar, Layers, Sparkles } from 'lucide-react';
import { formatLakhCr } from '@/lib/money';

interface PortalStickyDockProps {
  unitsCount: number;
  minPrice: number;
  onOpenBooking: () => void;
  onWhatsAppInquiry: () => void;
  onOpenComparison?: () => void;
}

export function PortalStickyDock({
  unitsCount,
  minPrice,
  onOpenBooking,
  onWhatsAppInquiry,
  onOpenComparison,
}: PortalStickyDockProps) {
  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-0 inset-x-0 z-40 sm:hidden bg-white/95 backdrop-blur-2xl border-t border-amber-200/90 p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-4px_25px_-5px_rgba(140,100,30,0.15)]"
    >
      <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
        {/* Curated Price Tag */}
        <div className="min-w-0 flex-1">
          <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">
            Curated Portfolio
          </span>
          <strong className="text-xs font-extrabold text-[#8C641E] truncate block font-mono">
            {unitsCount} Options • From {formatLakhCr(minPrice)}
          </strong>
        </div>

        {/* Quick Compare button (if >1 unit) */}
        {unitsCount > 1 && onOpenComparison && (
          <button
            type="button"
            onClick={onOpenComparison}
            className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 text-xs font-bold shrink-0 cursor-pointer shadow-2xs"
            title="Compare all options"
          >
            <Layers className="w-4 h-4 text-[#8C641E]" />
          </button>
        )}

        {/* Book Visit Button */}
        <button
          type="button"
          onClick={onOpenBooking}
          className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-[#8C641E] text-xs font-bold shrink-0 shadow-2xs hover:bg-amber-100 transition-colors cursor-pointer"
        >
          Book Visit
        </button>

        {/* WhatsApp Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={onWhatsAppInquiry}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#B38A38] to-[#8C641E] text-white text-xs font-extrabold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer hover:brightness-105 transition-all"
        >
          <Send className="w-3.5 h-3.5" />
          <span>WhatsApp</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
