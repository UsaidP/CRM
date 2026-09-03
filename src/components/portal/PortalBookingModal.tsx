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
import { CustomSelect } from '@/components/ui/CustomSelect';
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
      panelClassName="p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-amber-300 shadow-2xl space-y-4 bg-white text-slate-900 max-h-[90vh] overflow-y-auto"
    >
      <div>
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100/80 text-gold flex items-center justify-center shadow-2xs">
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
                  <strong className="text-gold font-bold">
                    {formatLakhCr(bookingUnit.allInTotalCost)}
                  </strong>
                </div>
              </div>

              {/* Slot Picker */}
              <div className="space-y-1.5">
                <CustomSelect
                  id="visit-slot-select"
                  label="Select Preferred Timing Slot"
                  value={selectedSlot}
                  onChange={(val) => setSelectedSlot(val)}
                  options={[
                    { value: 'This Saturday (11:00 AM)', label: 'This Saturday (11:00 AM)', description: 'Morning Prime Slot' },
                    { value: 'This Saturday (04:00 PM)', label: 'This Saturday (04:00 PM)', description: 'Sunset View Tour' },
                    { value: 'This Sunday (11:00 AM)', label: 'This Sunday (11:00 AM)', description: 'Weekend Morning Slot' },
                    { value: 'This Sunday (04:00 PM)', label: 'This Sunday (04:00 PM)', description: 'Weekend Afternoon Tour' },
                    { value: 'Weekday Evening (06:00 PM)', label: 'Weekday Evening (06:00 PM)', description: 'After Office Hours' },
                  ]}
                />
              </div>

              {/* Complimentary Station Cab Toggle */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="station-cab-checkbox"
                  checked={needsCab}
                  onChange={(e) => setNeedsCab(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-gold rounded cursor-pointer"
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
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-gold-light to-gold text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer hover:brightness-105 transition-[background-color,border-color,box-shadow] duration-200"
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
