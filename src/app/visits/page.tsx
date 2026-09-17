'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  MapPin, 
  Send, 
  Check, 
  Plus, 
  Clock, 
  Car, 
  Users, 
  Building2, 
  Sparkles, 
  RefreshCw, 
  Star, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  MessageSquare,
  ChevronRight,
  Navigation,
  Share2,
  Printer,
  Download,
  UserCheck,
  RotateCcw,
  AlertTriangle,
  Play
} from 'lucide-react';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { CustomSelect, type CustomSelectOption } from '@/components/ui/CustomSelect';
import { formatSiteVisitWhatsApp } from '@/lib/export-utils';
import { FeedbackAlert } from '@/components/ui/FeedbackAlert';
import { EmptyState } from '@/components/ui/EmptyState';
import { calculateVisitKpis } from '@/lib/domain/visit-analytics';

export default function SiteVisitsPage() {
  const [visits, setVisits] = useState<any[]>([]);
  const [passportVisit, setPassportVisit] = useState<any | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [requestError, setRequestError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Schedule Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState('2026-08-22');
  const [timeSlot, setTimeSlot] = useState('Saturday 11:00 AM');
  const [pickupLocation, setPickupLocation] = useState('Kharghar Railway Station (East)');
  const [cabDetails, setCabDetails] = useState('Ertiga MH-46-AZ-1234 (Driver: Ramesh 9820011223)');
  const [submitting, setSubmitting] = useState(false);

  // Post-Visit Feedback Modal State
  const [feedbackVisit, setFeedbackVisit] = useState<any | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackOutcome, setFeedbackOutcome] = useState('HIGH_INTEREST');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);

  // Lifecycle Action State (Confirm, No-Show, Reschedule)
  const [updatingVisitId, setUpdatingVisitId] = useState<string | null>(null);
  const [noShowVisit, setNoShowVisit] = useState<any | null>(null);
  const [noShowReason, setNoShowReason] = useState('UNREACHABLE');
  const [rescheduleVisit, setRescheduleVisit] = useState<any | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTimeSlot, setRescheduleTimeSlot] = useState('Saturday 11:00 AM');

  const fetchVisitsAndData = async () => {
    setLoading(true);
    setRequestError(null);
    try {
      const [visitRes, leadRes, unitRes] = await Promise.all([
        fetch('/api/v1/visits'),
        fetch('/api/v1/leads'),
        fetch('/api/v1/inventory/units'),
      ]);
      const visitData = await visitRes.json();
      const leadData = await leadRes.json();
      const unitData = await unitRes.json();

      if (!visitRes.ok || !visitData.success) throw new Error(visitData.error || 'Site visits could not be loaded.');
      if (!leadRes.ok || !leadData.success) throw new Error(leadData.error || 'Lead profiles could not be loaded.');
      if (!unitRes.ok || !unitData.success) throw new Error(unitData.error || 'Inventory units could not be loaded.');
      setVisits(visitData.data);
      if (leadData.success) {
        setLeads(leadData.data);
        if (leadData.data.length > 0 && !selectedLeadId) {
          setSelectedLeadId(leadData.data[0].id);
        }
      }
      if (unitData.success) {
        setUnits(unitData.data);
        if (unitData.data.length > 0 && selectedUnitIds.length === 0) {
          setSelectedUnitIds(unitData.data.slice(0, 2).map((u: any) => u.id));
        }
      }
    } catch (err: any) {
      setRequestError(err.message || 'Site visit data could not be loaded. Check your connection, then try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitsAndData();
  }, []);

  const handleScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || selectedUnitIds.length === 0) {
      setActionError('Select a lead and at least one property unit before dispatching the tour.');
      return;
    }
    setActionError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLeadId,
          unitIds: selectedUnitIds,
          scheduledDate,
          timeSlot,
          pickupLocation,
          cabDetails,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowScheduleModal(false);
        fetchVisitsAndData();
      } else {
        setActionError(data.error || 'The site tour could not be scheduled. Review the itinerary, then try again.');
      }
    } catch (err: any) {
      setActionError(err.message || 'The tour request could not be completed. Check your connection, then try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackVisit) return;
    setActionError(null);
    setSavingFeedback(true);
    try {
      const res = await fetch(`/api/v1/visits/${feedbackVisit.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackRating,
          feedbackOutcome,
          feedbackNotes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbackVisit(null);
        fetchVisitsAndData();
      } else {
        setActionError(data.error || 'The tour outcome could not be saved. Review the notes, then try again.');
      }
    } catch (err: any) {
      setActionError(err.message || 'The outcome request could not be completed. Check your connection, then try again.');
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleUpdateVisit = async (visitId: string, payload: any) => {
    setActionError(null);
    setUpdatingVisitId(visitId);
    try {
      const res = await fetch(`/api/v1/visits/${visitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNoShowVisit(null);
        setRescheduleVisit(null);
        await fetchVisitsAndData();
      } else {
        setActionError(data.error || 'Failed to update tour status.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Network error updating visit.');
    } finally {
      setUpdatingVisitId(null);
    }
  };

  const handleConfirmNoShow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noShowVisit) return;
    await handleUpdateVisit(noShowVisit.id, {
      status: 'NO_SHOW',
      noShowReason,
    });
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleVisit || !rescheduleDate) {
      setActionError('Please select a new date for the site visit.');
      return;
    }
    await handleUpdateVisit(rescheduleVisit.id, {
      scheduledDate: rescheduleDate,
      timeSlot: rescheduleTimeSlot,
    });
  };

  const toggleUnitSelection = (unitId: string) => {
    if (selectedUnitIds.includes(unitId)) {
      if (selectedUnitIds.length > 1) {
        setSelectedUnitIds(selectedUnitIds.filter((id) => id !== unitId));
      }
    } else {
      setSelectedUnitIds([...selectedUnitIds, unitId]);
    }
  };

  const filteredVisits = visits.filter((v) => {
    if (selectedStatus === 'ALL') return true;
    return v.status === selectedStatus;
  });

  const kpis = useMemo(() => calculateVisitKpis(visits), [visits]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-content font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-surface border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-soft text-accent-text border border-accent/20 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-accent" /> ESCORTED LOGISTICS DISPATCHER
            </span>
            <HallmarkStamp type="rera" label="Multi-Project Tour Protocol" />
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-content font-display">
            Site Visit Tours &amp; Agenda
          </h1>
          <p className="text-content-secondary text-xs mt-1">
            Timed Kharghar &amp; Taloja multi-stop routes, cab driver dispatch, Google Maps itineraries, and post-tour outcomes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={() => { setActionError(null); setShowScheduleModal(true); }}
            className="flex-1 md:flex-initial justify-center px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Tour</span>
          </button>
          <button
            type="button"
            onClick={fetchVisitsAndData}
            disabled={loading}
            aria-label="Refresh site visits"
            className="p-2.5 rounded-xl bg-surface hover:bg-surface-subtle text-content-secondary hover:text-content border border-border text-xs font-semibold shadow-2xs transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent' : ''}`} />
          </button>
        </div>
      </div>

      {requestError && (
        <FeedbackAlert
          variant="error"
          error={requestError}
          actionLabel="Retry Tours"
          onAction={fetchVisitsAndData}
          onDismiss={() => setRequestError(null)}
        />
      )}

      {/* ─── SITE VISIT PRIMARY METRICS STRIP ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase text-content-muted">
              Total Tours
            </span>
            <Calendar className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <span className="text-xl sm:text-2xl font-black font-display text-content block">
            {kpis.totalVisits}
          </span>
          <span className="text-[10px] text-content-secondary block mt-0.5">
            {kpis.scheduledCount} upcoming • {kpis.completedCount} attended
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase text-content-muted">
              Confirmation Rate
            </span>
            <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <span className="text-xl sm:text-2xl font-black font-display text-indigo-500 block">
            {kpis.confirmationRate}%
          </span>
          <span className="text-[10px] text-content-secondary block mt-0.5">
            {kpis.confirmedCount} buyer-confirmed slots
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase text-content-muted">
              Completed Tours
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
          </div>
          <span className="text-xl sm:text-2xl font-black font-display text-status-success block">
            {kpis.completionRate}%
          </span>
          <span className="text-[10px] text-content-secondary block mt-0.5">
            {kpis.completedCount} escorted tours done
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase text-content-muted">
              No-Show Rate
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <span className={`text-xl sm:text-2xl font-black font-display block ${kpis.noShowRate > 25 ? 'text-rose-500' : 'text-content'}`}>
            {kpis.noShowRate}%
          </span>
          <span className="text-[10px] text-content-secondary block mt-0.5">
            {kpis.noShowCount} missed appointments
          </span>
        </div>
      </div>

      {/* Filter and Status Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-surface border border-border shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
        <fieldset className="flex min-w-0 max-w-full items-center gap-1.5 sm:gap-2 overflow-x-auto touch-scroll no-scrollbar w-full sm:w-auto">
          <legend className="sr-only">Filter site visits by status</legend>
          {[
            { id: 'ALL', label: 'All Tours' },
            { id: 'SCHEDULED', label: 'Scheduled' },
            { id: 'CONFIRMED', label: 'Confirmed' },
            { id: 'IN_PROGRESS', label: 'In Progress' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'NO_SHOW', label: 'No Show' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((st) => (
            <button
              type="button"
              key={st.id}
              onClick={() => setSelectedStatus(st.id)}
              aria-pressed={selectedStatus === st.id}
              className={`px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                selectedStatus === st.id
                  ? 'bg-accent text-white font-bold shadow-xs'
                  : 'bg-surface text-content-secondary border border-border hover:bg-surface-subtle hover:text-content'
              }`}
            >
              {st.label}
            </button>
          ))}
        </fieldset>

        <div className="text-content-secondary text-xs">
          Showing <strong className="text-content font-mono font-bold">{filteredVisits.length}</strong> planned tours
        </div>
      </div>

      {/* Agenda & Tour Itineraries Stream */}
      {loading ? (
        <div className="p-12 text-center text-content-muted text-xs flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-accent" />
          <span>Loading scheduled site visits...</span>
        </div>
      ) : !requestError && filteredVisits.length === 0 ? (
        <EmptyState
          type="filter"
          title="No Scheduled Site Tours"
          description="No property tours match the selected status category. Click 'Schedule Site Tour' above to create a curated buyer itinerary."
          actionLabel="Schedule Site Tour"
          onAction={() => setShowScheduleModal(true)}
          secondaryActionLabel="Show All Tours"
          onSecondaryAction={() => setSelectedStatus('ALL')}
        />
      ) : (
        <div className="space-y-4">
          {filteredVisits.map((visit) => {
            const stops = JSON.parse(visit.itineraryUnitsJson || '[]');
            const isCompleted = visit.status === 'COMPLETED';
            const dateStr = new Date(visit.scheduledDate).toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            const waShareText = formatSiteVisitWhatsApp({
              clientName: visit.lead?.fullName || 'Valued Purchaser',
              clientPhone: visit.lead?.phoneE164 || '',
              scheduledDateStr: dateStr,
              timeSlot: visit.timeSlot,
              pickupLocation: visit.pickupLocation,
              cabDetails: visit.cabDetails,
              assignedBrokerName: visit.assignedBroker?.fullName,
              stops: stops.map((s: any) => ({
                projectName: s.projectName,
                bhk: s.bhk,
                microMarket: s.microMarket || 'Kharghar / Taloja',
                expectedTime: s.expectedTime,
                developerPocName: s.developerPocName,
              })),
            });

            return (
              <div
                key={visit.id}
                className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-4 text-xs font-sans hover:border-accent/40 transition-all"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-content font-sans text-base">{visit.lead?.fullName}</span>
                      <span className="text-accent-text font-mono font-bold">({visit.lead?.phoneE164})</span>
                      {visit.status === 'CONFIRMED' && (
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold border font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800">
                          CONFIRMED ({visit.confirmedVia || 'CALL'})
                        </span>
                      )}
                      {visit.status === 'SCHEDULED' && (
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold border font-mono bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800">
                          SCHEDULED
                        </span>
                      )}
                      {visit.status === 'IN_PROGRESS' && (
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold border font-mono bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                          IN PROGRESS
                        </span>
                      )}
                      {visit.status === 'COMPLETED' && (
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold border font-mono bg-status-success-surface text-status-success border-status-success/40">
                          COMPLETED
                        </span>
                      )}
                      {visit.status === 'NO_SHOW' && (
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold border font-mono bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800">
                          NO SHOW: {visit.noShowReason || 'UNREACHABLE'}
                        </span>
                      )}
                      {visit.status === 'CANCELLED' && (
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold border font-mono bg-surface-subtle text-content-secondary border-border">
                          CANCELLED
                        </span>
                      )}
                      {visit.rescheduleCount > 0 && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Rescheduled {visit.rescheduleCount}x
                        </span>
                      )}
                    </div>

                    <div className="text-content-muted text-xs mt-1 flex flex-wrap items-center gap-3">
                      <span className="text-content font-bold font-mono">{dateStr} • {visit.timeSlot}</span>
                      <span>•</span>
                      <span>Advisor: <strong className="text-content">{visit.assignedBroker?.fullName || 'Assigned Broker'}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Confirm Button */}
                    {visit.status === 'SCHEDULED' && (
                      <button
                        type="button"
                        disabled={updatingVisitId === visit.id}
                        onClick={() => handleUpdateVisit(visit.id, { status: 'CONFIRMED', confirmedVia: 'PHONE_CALL' })}
                        className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                        title="Buyer confirmed they will attend the scheduled tour"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Confirm Visit</span>
                      </button>
                    )}

                    {/* Start Tour Button */}
                    {visit.status === 'CONFIRMED' && (
                      <button
                        type="button"
                        disabled={updatingVisitId === visit.id}
                        onClick={() => handleUpdateVisit(visit.id, { status: 'IN_PROGRESS' })}
                        className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                        title="Start physical escort walkthrough"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Start Tour</span>
                      </button>
                    )}

                    {/* Reschedule Button */}
                    {['SCHEDULED', 'CONFIRMED', 'NO_SHOW'].includes(visit.status) && (
                      <button
                        type="button"
                        onClick={() => {
                          setRescheduleDate(new Date(visit.scheduledDate).toISOString().split('T')[0]);
                          setRescheduleTimeSlot(visit.timeSlot || 'Saturday 11:00 AM');
                          setRescheduleVisit(visit);
                        }}
                        className="px-3 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content-secondary hover:text-content border border-border text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                        title="Reschedule this site tour slot"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-accent" />
                        <span>Reschedule</span>
                      </button>
                    )}

                    {/* Mark No-Show Button */}
                    {['SCHEDULED', 'CONFIRMED'].includes(visit.status) && (
                      <button
                        type="button"
                        onClick={() => {
                          setNoShowReason('UNREACHABLE');
                          setNoShowVisit(visit);
                        }}
                        className="px-3 py-2 rounded-xl bg-surface hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 border border-border hover:border-rose-300 text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                        title="Mark tour as buyer no-show"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>No-Show</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setPassportVisit(visit)}
                      className="px-3 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content-secondary hover:text-content border border-border hover:border-accent/40 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                      title="View & Print Official VIP Inspection Passport"
                    >
                      <Printer className="w-3.5 h-3.5 text-accent" />
                      <span>Passport</span>
                    </button>

                    <a
                      href={`https://wa.me/${(visit.lead?.phoneE164 || '').replace(/\+/g, '')}?text=${encodeURIComponent(waShareText)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-xl bg-status-success hover:opacity-90 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>

                    {!isCompleted && visit.status !== 'NO_SHOW' && (
                      <button
                        onClick={() => { setActionError(null); setFeedbackVisit(visit); }}
                        className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-accent-text border border-border hover:border-accent/40 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 text-accent" />
                        <span>Log Outcome</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Logistics Bar */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-content-secondary p-3 rounded-xl bg-surface-subtle border border-border">
                  <div className="flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-accent" />
                    <span>Pickup: <strong className="text-content">{visit.pickupLocation}</strong></span>
                  </div>
                  <span>•</span>
                  <div>
                    <span>Cab &amp; Driver: <strong className="text-content">{visit.cabDetails || 'Not specified'}</strong></span>
                  </div>
                </div>

                {/* Itinerary Stops */}
                <div className="space-y-2">
                  <div className="text-[10px] text-content-muted uppercase tracking-wider font-bold">
                    Escorted Route Stops ({stops.length} Projects):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {stops.map((stop: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-surface-subtle border border-border space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-accent-text font-bold font-mono">
                          <span>Stop #{idx + 1}</span>
                          <span>{stop.expectedTime}</span>
                        </div>
                        <strong className="text-content text-xs block font-sans">{stop.projectName}</strong>
                        <div className="text-[11px] text-content-muted flex justify-between">
                          <span>{stop.bhk} BHK • {stop.microMarket}</span>
                          {stop.developerPocName && <span>POC: {stop.developerPocName}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Post-Visit Logged Outcome */}
                {visit.feedbackNotes && (
                  <div className="p-3.5 rounded-xl bg-status-success-surface border border-status-success/30 text-xs text-content-secondary space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-status-success flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Outcome: {visit.feedbackOutcome?.replace('_', ' ')}
                      </span>
                      <span className="text-status-warning font-bold font-mono">
                        {'★'.repeat(visit.feedbackRating || 5)} ({visit.feedbackRating}/5)
                      </span>
                    </div>
                    <p className="italic text-content-secondary text-xs mt-1">&quot;{visit.feedbackNotes}&quot;</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Schedule Tour */}
      <AccessibleDialog
        open={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        titleId="schedule-visit-title"
        descriptionId="schedule-visit-description"
        size="lg"
      >
        <div className="space-y-4 text-content font-sans">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 id="schedule-visit-title" className="font-bold text-content text-base font-display flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" />
                Schedule Multi-Project Site Visit
              </h2>
              <p id="schedule-visit-description" className="mt-1 text-xs text-content-secondary">Choose a buyer, stops, and dispatch details for the itinerary.</p>
            </div>
            <button type="button" data-dialog-close aria-label="Close schedule site visit" onClick={() => setShowScheduleModal(false)} className="p-1 rounded-lg text-content-muted hover:text-content">✕</button>
          </div>

          {actionError && (
            <FeedbackAlert
              variant="error"
              error={actionError}
              onDismiss={() => setActionError(null)}
            />
          )}

          <form onSubmit={handleScheduleVisit} className="space-y-3.5 pt-2 text-xs">
            <div>
              <label htmlFor="visit-lead" className="text-content-secondary font-medium block mb-1">Purchaser Lead:</label>
              <CustomSelect
                options={leads.map((l) => ({
                  value: l.id,
                  label: `${l.fullName} (${l.phoneE164})`,
                }))}
                value={selectedLeadId}
                onChange={(val) => setSelectedLeadId(val)}
                className="w-full"
                placeholder="Select lead for site visit..."
              />
            </div>

            <fieldset>
              <legend className="text-content-secondary font-medium block mb-1">
                Select Units to Inspect ({selectedUnitIds.length} Selected):
              </legend>
              <div className="space-y-1 max-h-36 overflow-y-auto p-2 rounded-xl bg-surface-subtle border border-border">
                {units.map((u) => {
                  const isSelected = selectedUnitIds.includes(u.id);
                  return (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => toggleUnitSelection(u.id)}
                      aria-pressed={isSelected}
                      className={`w-full text-left p-2 rounded-lg flex justify-between items-center transition-all cursor-pointer ${
                        isSelected ? 'bg-surface border border-accent text-content font-bold shadow-2xs' : 'text-content-secondary hover:bg-surface'
                      }`}
                    >
                      <div>
                        <span>{u.project?.projectName}</span>
                        <span className="text-[11px] text-content-muted block">{u.bhk} BHK • Unit {u.unitNumber}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-accent" />}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="visit-date" className="text-content-secondary font-medium block mb-1">Visit Date:</label>
                <input
                  id="visit-date"
                  name="scheduledDate"
                  required
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label htmlFor="visit-time" className="text-content-secondary font-medium block mb-1">Time Slot:</label>
                <input
                  id="visit-time"
                  name="timeSlot"
                  required
                  type="text"
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="visit-pickup" className="text-content-secondary font-medium block mb-1">Pickup Location:</label>
              <input
                id="visit-pickup"
                name="pickupLocation"
                required
                type="text"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label htmlFor="visit-cab" className="text-content-secondary font-medium block mb-1">Cab and Driver Logistics:</label>
              <input
                id="visit-cab"
                name="cabDetails"
                type="text"
                value={cabDetails}
                onChange={(e) => setCabDetails(e.target.value)}
                className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content focus:outline-none focus:border-accent"
              />
            </div>

            <div className="pt-3 flex flex-col-reverse sm:flex-row justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-semibold shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                {submitting ? 'Dispatching…' : 'Dispatch Tour Itinerary'}
              </button>
            </div>
          </form>
        </div>
      </AccessibleDialog>

      {/* MODAL: Post-Visit Feedback */}
      <AccessibleDialog
        open={Boolean(feedbackVisit)}
        onClose={() => setFeedbackVisit(null)}
        titleId="visit-feedback-title"
        descriptionId="visit-feedback-description"
        size="md"
      >
        {feedbackVisit && (
          <div className="space-y-4 text-content font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 id="visit-feedback-title" className="font-bold text-content text-base font-display">Log Post-Tour Outcome</h2>
                <p id="visit-feedback-description" className="mt-1 text-xs text-content-secondary">Record the buyer’s response and the next follow-up signal.</p>
              </div>
              <button type="button" data-dialog-close aria-label="Close post-tour outcome" onClick={() => setFeedbackVisit(null)} className="p-1 rounded-lg text-content-muted hover:text-content">✕</button>
            </div>

            {actionError && (
              <FeedbackAlert
                variant="error"
                error={actionError}
                onDismiss={() => setActionError(null)}
              />
            )}

            <form onSubmit={handleSaveFeedback} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="feedback-outcome" className="text-content-secondary font-medium block mb-1">Outcome Status:</label>
                <CustomSelect
                  options={[
                    { value: 'HIGH_INTEREST', label: 'HIGH_INTEREST (Moving to Token)', dotColor: 'bg-emerald-500' },
                    { value: 'OFFER_MADE', label: 'OFFER_MADE (Negotiating price)', dotColor: 'bg-blue-500' },
                    { value: 'FOLLOW_UP_REQUIRED', label: 'FOLLOW_UP_REQUIRED', dotColor: 'bg-amber-500' },
                    { value: 'REJECTED', label: 'REJECTED (Budget/layout mismatch)', dotColor: 'bg-rose-500' },
                  ]}
                  value={feedbackOutcome}
                  onChange={(val) => setFeedbackOutcome(val)}
                  className="w-full"
                />
              </div>

              <fieldset>
                <legend className="text-content-secondary font-medium block mb-1">Client Enthusiasm Rating (1–5):</legend>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFeedbackRating(r)}
                      aria-pressed={feedbackRating === r}
                      aria-label={`Rate client enthusiasm ${r} out of 5`}
                      className={`py-2 flex-1 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        feedbackRating >= r ? 'bg-accent text-white border-accent shadow-xs' : 'bg-surface text-content-muted border-border hover:bg-surface-subtle'
                      }`}
                    >
                      ★ {r}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="feedback-notes" className="text-content-secondary font-medium block mb-1">Broker Inspection Notes:</label>
                <textarea
                  id="feedback-notes"
                  name="feedbackNotes"
                  rows={3}
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  placeholder="e.g. Liked the 12th-floor unit and requested a revised payment schedule…"
                  className="w-full bg-surface-inset border border-border rounded-xl p-2.5 text-xs text-content focus:outline-none focus:border-accent"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFeedbackVisit(null)}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-semibold shadow-2xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFeedback}
                  className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  {savingFeedback ? 'Saving…' : 'Save Outcome'}
                </button>
              </div>
            </form>
          </div>
        )}
      </AccessibleDialog>

      {/* MODAL 3: OFFICIAL ZAMZAM VIP PROPERTY TOUR PASSPORT */}
      <AccessibleDialog
        open={Boolean(passportVisit)}
        onClose={() => setPassportVisit(null)}
        titleId="tour-passport-title"
        size="lg"
      >
        {passportVisit && (() => {
          const stops = JSON.parse(passportVisit.itineraryUnitsJson || '[]');
          const dateStr = new Date(passportVisit.scheduledDate).toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });

          return (
            <div className="space-y-4 text-xs font-sans">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center font-bold font-mono">
                    ZP
                  </div>
                  <div>
                    <h2 id="tour-passport-title" className="text-base font-bold text-content font-display">
                      ZamZam Properties — Escorted Property Tour Passport
                    </h2>
                    <p className="text-[10px] text-content-muted font-mono">
                      VIP Inspection Dossier &amp; Route Schedule • MahaRERA Reg: A52000028714
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  data-dialog-close
                  aria-label="Close passport"
                  onClick={() => setPassportVisit(null)}
                  className="p-1 rounded-lg text-content-muted hover:text-content cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Printable Tour Passport Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-4 text-slate-900 bg-white">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="font-extrabold text-lg text-[#1B4332] font-display">ZAMZAM PROPERTIES</h3>
                    <p className="text-[10px] text-slate-500 font-mono">VIP Escorted Logistics &amp; Property Tour Protocol</p>
                    <p className="text-[10px] text-slate-500">MahaRERA Reg: A52000028714 • Kharghar &amp; Taloja Hub</p>
                  </div>
                  <div className="text-right font-mono text-[10px] space-y-0.5">
                    <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold">
                      INSPECTION PASSPORT
                    </span>
                    <p className="mt-1 font-bold text-slate-800">Date: {dateStr}</p>
                    <p className="text-slate-500">Time: {passportVisit.timeSlot}</p>
                  </div>
                </div>

                {/* Logistics & Guest Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[10px]">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono">Guest / Purchaser:</span>
                    <p className="font-bold text-slate-800 text-xs">{passportVisit.lead?.fullName}</p>
                    <p className="text-slate-600 font-mono">Phone: {passportVisit.lead?.phoneE164}</p>
                    <p className="text-slate-600">Pickup: <strong>{passportVisit.pickupLocation}</strong></p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono">Escort &amp; Chauffeur Details:</span>
                    <p className="font-bold text-slate-800 text-xs">Advisor: {passportVisit.assignedBroker?.fullName || 'Senior Consultant'}</p>
                    <p className="text-slate-600">Assigned Vehicle: <strong>{passportVisit.cabDetails || 'ZamZam Chauffeur Vehicle'}</strong></p>
                    <p className="text-slate-600">Emergency Support: <strong>+91 98201 23456</strong></p>
                  </div>
                </div>

                {/* Itinerary Table */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase text-[#1B4332] font-mono mb-1.5">
                    Scheduled Development Inspection Stops:
                  </h4>
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 uppercase font-mono text-[9px]">
                        <th className="py-2 px-2.5 text-center" style={{ width: '8%' }}>Stop</th>
                        <th className="py-2 px-2.5 text-left" style={{ width: '22%' }}>Arrival Time</th>
                        <th className="py-2 px-2.5 text-left" style={{ width: '40%' }}>Project &amp; Typology</th>
                        <th className="py-2 px-2.5 text-left" style={{ width: '30%' }}>Developer Contact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stops.map((stop: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-2.5 text-center font-bold text-[#1B4332]">#{idx + 1}</td>
                          <td className="py-2.5 px-2.5 font-mono font-bold text-slate-700">{stop.expectedTime || 'As scheduled'}</td>
                          <td className="py-2.5 px-2.5">
                            <strong className="text-slate-800 text-xs">{stop.projectName}</strong>
                            <div className="text-[10px] text-slate-500">{stop.bhk} BHK • {stop.microMarket || 'Kharghar/Taloja'}</div>
                          </td>
                          <td className="py-2.5 px-2.5 text-slate-600">
                            {stop.developerPocName ? <span>POC: {stop.developerPocName}</span> : 'Site Sales Desk'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Physical Inspection Checklist */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[9.5pt] space-y-1.5">
                  <span className="text-[8.5pt] font-bold text-slate-700 uppercase font-mono block">On-Site Verification Checklist:</span>
                  <div className="grid grid-cols-2 gap-2 text-[8pt] text-slate-600">
                    <div>☑ Sanctioned RERA Carpet vs Actual Layout</div>
                    <div>☑ Natural Sunlight &amp; Cross-Ventilation</div>
                    <div>☑ Lift / Lobby / Fire Safety Systems</div>
                    <div>☑ Water Pressure &amp; Overhead Tank Supply</div>
                  </div>
                </div>

                {/* Footer Signatures */}
                <div className="grid grid-cols-2 pt-4 gap-6 text-[8pt] border-t border-slate-200">
                  <div>
                    <p className="text-slate-400">Client Signature:</p>
                    <div className="h-6 border-b border-slate-300" />
                  </div>
                  <div>
                    <p className="text-slate-400">Escorting Advisor Sign &amp; Stamp:</p>
                    <div className="h-6 border-b border-slate-300" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setPassportVisit(null)}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print VIP Tour Passport</span>
                </button>
              </div>
            </div>
          );
        })()}
      </AccessibleDialog>

      {/* MODAL: Mark No-Show */}
      <AccessibleDialog
        open={!!noShowVisit}
        onClose={() => setNoShowVisit(null)}
        titleId="no-show-title"
        descriptionId="no-show-desc"
        size="md"
      >
        <form onSubmit={handleConfirmNoShow} className="space-y-4 text-content font-sans">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 id="no-show-title" className="font-bold text-content text-base font-display flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Record Buyer No-Show
              </h2>
              <p id="no-show-desc" className="text-xs text-content-secondary mt-0.5">
                Tour with {noShowVisit?.lead?.fullName || 'the buyer'} was missed. Log the reason to trigger automated re-engagement.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNoShowVisit(null)}
              className="p-1 rounded-lg text-content-muted hover:text-content"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-content">Reason for Missed Tour</label>
            <CustomSelect
              value={noShowReason}
              onChange={(val) => setNoShowReason(val)}
              options={[
                { value: 'UNREACHABLE', label: 'Buyer Unreachable (Phone Switch-off / No Answer)' },
                { value: 'CANCELLED_LAST_MINUTE', label: 'Cancelled Last Minute by Buyer' },
                { value: 'PERSONAL_EMERGENCY', label: 'Personal Emergency / Work Conflict' },
                { value: 'WEATHER', label: 'Weather / Transit Inconvenience' },
                { value: 'UNKNOWN', label: 'Unknown / Other Reasons' },
              ]}
            />
          </div>

          <p className="text-[11px] text-content-muted bg-surface-subtle p-3 rounded-xl border border-border">
            Marking as No-Show will automatically generate a follow-up reminder for tomorrow morning and record a timeline communication log.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setNoShowVisit(null)}
              className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatingVisitId === noShowVisit?.id}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              {updatingVisitId === noShowVisit?.id ? 'Recording...' : 'Confirm No-Show'}
            </button>
          </div>
        </form>
      </AccessibleDialog>

      {/* MODAL: Reschedule Tour */}
      <AccessibleDialog
        open={!!rescheduleVisit}
        onClose={() => setRescheduleVisit(null)}
        titleId="reschedule-title"
        descriptionId="reschedule-desc"
        size="md"
      >
        <form onSubmit={handleConfirmReschedule} className="space-y-4 text-content font-sans">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 id="reschedule-title" className="font-bold text-content text-base font-display flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-accent" />
                Reschedule Site Tour
              </h2>
              <p id="reschedule-desc" className="text-xs text-content-secondary mt-0.5">
                Set a new date and time slot for {rescheduleVisit?.lead?.fullName || 'the buyer'}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRescheduleVisit(null)}
              className="p-1 rounded-lg text-content-muted hover:text-content"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-content">New Tour Date</label>
              <input
                type="date"
                required
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border text-xs font-sans text-content focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-content">New Time Slot</label>
              <CustomSelect
                value={rescheduleTimeSlot}
                onChange={(val) => setRescheduleTimeSlot(val)}
                options={[
                  { value: 'Saturday 11:00 AM', label: 'Saturday 11:00 AM' },
                  { value: 'Saturday 03:00 PM', label: 'Saturday 03:00 PM' },
                  { value: 'Sunday 11:00 AM', label: 'Sunday 11:00 AM' },
                  { value: 'Sunday 03:00 PM', label: 'Sunday 03:00 PM' },
                  { value: 'Weekday 11:30 AM', label: 'Weekday 11:30 AM' },
                  { value: 'Weekday 04:30 PM', label: 'Weekday 04:30 PM' },
                ]}
              />
            </div>
          </div>

          <p className="text-[11px] text-content-muted bg-surface-subtle p-3 rounded-xl border border-border">
            Rescheduling will update the itinerary, increment the tour reschedule count ({((rescheduleVisit?.rescheduleCount || 0) + 1)}x), and log an outbound communication note.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setRescheduleVisit(null)}
              className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatingVisitId === rescheduleVisit?.id}
              className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              {updatingVisitId === rescheduleVisit?.id ? 'Rescheduling...' : 'Save New Slot'}
            </button>
          </div>
        </form>
      </AccessibleDialog>
    </div>
  );
}
