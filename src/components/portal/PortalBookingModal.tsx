'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  CheckCircle2,
  Car,
  MapPin,
  Clock,
  Sparkles,
  PhoneCall,
  Send,
  X,
} from 'lucide-react';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { formatLakhCr } from '@/lib/money';

interface PortalBookingModalProps {
  bookingUnit: any | null;
  advisor: any;
  onClose: () => void;
  onSubmitBooking: (unit: any, slot: string, needsCab: boolean) => void;
}

export function PortalBookingModal({
  bookingUnit,
  advisor,
  onClose,
  onSubmitBooking,
}: PortalBookingModalProps) {
  const [selectedSlot, setSelectedSlot] = useState('This Saturday (11:00 AM)');
  const [needsCab, setNeedsCab] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!bookingUnit) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitBooking(bookingUnit, selectedSlot, needsCab);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 2600);
  };

  return (
    <AccessibleDialog
      open={Boolean(bookingUnit)}
      onClose={onClose}
      titleId="booking-modal-title"
      descriptionId="booking-modal-description"
      size="md"
      panelClassName="p-6 rounded-3xl border border-amber-300 shadow-2xl space-y-4 bg-white text-slate-900"
    >
      <div>
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100/80 text-[#8C641E] flex items-center justify-center shadow-2xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 id="booking-modal-title" className="font-bold text-slate-900 text-base font-serif">
                Schedule Physical Site Visit
              </h2>
              <p id="booking-modal-description" className="text-xs text-slate-500">
                Escorted sample flat tour with dedicated ZamZam Advisor
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 grid place-items-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            aria-label="Close site visit scheduler"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success vs Form */}
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="py-8 text-center space-y-3"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-900 text-lg font-serif">
                Visit Request Confirmed!
              </h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                Your dedicated advisor <strong>{advisor.fullName || 'your property advisor'}</strong> has received your preferred slot ({selectedSlot}) and will WhatsApp your driver details &amp; itinerary shortly.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
              {/* Selected Property Preview */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 to-white border border-amber-200/90 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-mono font-bold block">
                  Shortlisted Property
                </span>
                <strong className="text-slate-900 text-sm block font-serif">
                  {bookingUnit.project?.projectName}
                </strong>
                <div className="flex items-center justify-between text-xs text-slate-600 font-mono">
                  <span>
                    {bookingUnit.bhk} BHK • {bookingUnit.project?.microMarket}
                  </span>
                  <strong className="text-[#8C641E] font-bold">
                    {formatLakhCr(bookingUnit.allInTotalCost)}
                  </strong>
                </div>
              </div>

              {/* Slot Picker */}
              <div className="space-y-1.5">
                <label htmlFor="visit-slot-select" className="font-bold text-slate-800 block">
                  Select Preferred Timing Slot
                </label>
                <select
                  id="visit-slot-select"
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs cursor-pointer font-medium"
                >
                  <option value="This Saturday (11:00 AM)">This Saturday (11:00 AM) — Morning Prime</option>
                  <option value="This Saturday (04:00 PM)">This Saturday (04:00 PM) — Sunset Tour</option>
                  <option value="This Sunday (11:00 AM)">This Sunday (11:00 AM) — Weekend Morning</option>
                  <option value="This Sunday (04:00 PM)">This Sunday (04:00 PM) — Weekend Afternoon</option>
                  <option value="Weekday Evening (06:00 PM)">Weekday Evening (06:00 PM) — After Office</option>
                </select>
              </div>

              {/* Complimentary Station Cab Toggle */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="station-cab-checkbox"
                  checked={needsCab}
                  onChange={(e) => setNeedsCab(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#8C641E] rounded cursor-pointer"
                />
                <label htmlFor="station-cab-checkbox" className="text-xs text-slate-700 cursor-pointer select-none">
                  <strong>🚗 Complimentary Station Cab Pickup:</strong> Include free AC cab pickup &amp; drop from Kharghar, Mansarovar, or Khandeshwar station for your family.
                </label>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#B38A38] to-[#8C641E] text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer hover:brightness-105 transition-all"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Confirm Visit Reservation</span>
                </motion.button>
              </div>
            </form>
          )}
        </AnimatePresence>
      </div>
    </AccessibleDialog>
  );
}
