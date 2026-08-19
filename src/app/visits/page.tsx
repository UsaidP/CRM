'use client';

import React, { useState, useEffect } from 'react';
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
  Share2
} from 'lucide-react';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';

export default function SiteVisitsPage() {
  const [visits, setVisits] = useState<any[]>([]);
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#b59658]/20">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1b202c] text-[#ccb67b] border border-[#b59658]/40 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#b59658]" /> ESCORTED LOGISTICS DISPATCHER
            </span>
            <HallmarkStamp type="rera" label="Multi-Project Tour Protocol" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-display">
            Site Visit Tours &amp; Agenda
          </h1>
          <p className="text-slate-400 text-xs mt-0.5 font-mono">
            Timed Kharghar &amp; Taloja multi-stop routes, cab driver dispatch, Google Maps itineraries, and post-tour outcomes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => { setActionError(null); setShowScheduleModal(true); }}
            className="min-h-11 px-4 py-2 rounded-lg bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] hover:opacity-95 text-[#12151f] text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-[#b59658]/20 border border-[#ccb67b]/60"
          >
            <Plus className="w-3.5 h-3.5 text-[#12151f]" />
            Schedule Site Tour
          </button>
          <button
            type="button"
            onClick={fetchVisitsAndData}
            disabled={loading}
            aria-label="Refresh site visits"
            className="min-h-11 min-w-11 px-3 py-2 rounded-lg bg-[#12151f] hover:bg-[#1b202c] text-slate-300 border border-[#b59658]/20 text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {requestError && (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-200">
          <p>{requestError}</p>
          <button type="button" onClick={fetchVisitsAndData} className="mt-1 min-h-11 font-bold text-white underline underline-offset-2">Retry site visit data</button>
        </div>
      )}

      {/* Filter and Status Bar */}
      <div className="p-3 rounded-xl bg-[#1b202c]/90 border border-[#b59658]/30 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <fieldset className="flex min-w-0 max-w-full items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <legend className="sr-only">Filter site visits by status</legend>
          {[
            { id: 'ALL', label: 'All Tours' },
            { id: 'SCHEDULED', label: 'Scheduled' },
            { id: 'CONFIRMED', label: 'Confirmed' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((st) => (
            <button
              type="button"
              key={st.id}
              onClick={() => setSelectedStatus(st.id)}
              aria-pressed={selectedStatus === st.id}
              className={`min-h-11 px-2.5 py-1.5 rounded text-[11px] whitespace-nowrap ${
                selectedStatus === st.id
                  ? 'bg-gradient-to-r from-[#8a6f3c] to-[#ccb67b] text-[#12151f] font-bold shadow-sm'
                  : 'bg-[#12151f] text-slate-400 hover:text-white border border-[#b59658]/20'
              }`}
            >
              {st.label}
            </button>
          ))}
        </fieldset>

        <div className="text-slate-400 text-xs">
          Showing <strong className="text-white">{filteredVisits.length}</strong> planned tours
        </div>
      </div>

      {/* Agenda & Tour Itineraries Stream */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-mono flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#ccb67b]" />
          <span>Loading scheduled site visits...</span>
        </div>
      ) : !requestError && filteredVisits.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#1b202c]/90 border border-[#b59658]/30 text-center text-slate-400 text-xs font-mono space-y-2">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-white font-semibold">No scheduled site visit tours found.</p>
          <p>Click &quot;Schedule Site Tour&quot; above to dispatch a multi-stop itinerary.</p>
        </div>
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
            const waShareText = `ZamZam Properties Site Tour Itinerary for ${visit.lead?.fullName}:\nDate: ${dateStr} • ${visit.timeSlot}\nPickup: ${visit.pickupLocation}\nCab: ${visit.cabDetails || 'Assigned Cab'}\nStops:\n${stops.map((s: any, idx: number) => `${idx + 1}. ${s.projectName} (${s.bhk} BHK) - ${s.expectedTime}`).join('\n')}`;

            return (
              <div
                key={visit.id}
                className="p-5 rounded-2xl bg-[#1b202c]/90 border border-[#b59658]/30 shadow-xl space-y-4 font-mono text-xs"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#b59658]/10">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white font-sans text-base">{visit.lead?.fullName}</span>
                      <span className="text-[#ccb67b] font-bold">({visit.lead?.phoneE164})</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isCompleted
                          ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-950/70 text-amber-300 border border-amber-500/40'
                      }`}>
                        {visit.status}
                      </span>
                    </div>

                    <div className="text-slate-400 text-xs mt-1 flex flex-wrap items-center gap-3">
                      <span className="text-white font-bold">{dateStr} • {visit.timeSlot}</span>
                      <span>•</span>
                      <span>Advisor: <strong className="text-slate-200">{visit.assignedBroker?.fullName || 'Assigned Broker'}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`https://wa.me/${(visit.lead?.phoneE164 || '').replace(/\+/g, '')}?text=${encodeURIComponent(waShareText)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      WhatsApp Itinerary
                    </a>

                    {!isCompleted && (
                      <button
                        onClick={() => { setActionError(null); setFeedbackVisit(visit); }}
                        className="min-h-11 px-3 py-1.5 rounded-lg bg-[#12151f] hover:bg-[#2a3040] text-[#ccb67b] border border-[#b59658]/30 font-semibold text-xs flex items-center gap-1"
                      >
                        <Star className="w-3.5 h-3.5 text-[#b59658]" />
                        Log Outcome
                      </button>
                    )}
                  </div>
                </div>

                {/* Logistics Bar */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 p-2.5 rounded-xl bg-[#12151f] border border-[#b59658]/20">
                  <div className="flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-[#ccb67b]" />
                    <span>Pickup: <strong className="text-white">{visit.pickupLocation}</strong></span>
                  </div>
                  <span>•</span>
                  <div>
                    <span>Cab &amp; Driver: <strong className="text-slate-200">{visit.cabDetails || 'Not specified'}</strong></span>
                  </div>
                </div>

                {/* Itinerary Stops */}
                <div className="space-y-2">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    Escorted Route Stops ({stops.length} Projects):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {stops.map((stop: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-[#12151f] border border-[#b59658]/20 space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-[#ccb67b] font-bold">
                          <span>Stop #{idx + 1}</span>
                          <span>{stop.expectedTime}</span>
                        </div>
                        <strong className="text-white text-xs block font-sans">{stop.projectName}</strong>
                        <div className="text-[10px] text-slate-400 flex justify-between">
                          <span>{stop.bhk} BHK • {stop.microMarket}</span>
                          {stop.developerPocName && <span>POC: {stop.developerPocName}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Post-Visit Logged Outcome */}
                {visit.feedbackNotes && (
                  <div className="p-3 rounded-xl bg-[#12151f] border border-emerald-500/30 text-xs text-slate-300 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Outcome: {visit.feedbackOutcome?.replace('_', ' ')}
                      </span>
                      <span className="text-amber-400 font-bold">
                        {'★'.repeat(visit.feedbackRating || 5)} ({visit.feedbackRating}/5)
                      </span>
                    </div>
                    <p className="italic text-slate-400 text-[11px]">&quot;{visit.feedbackNotes}&quot;</p>
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
        panelClassName="max-w-lg bg-[#1b202c] border border-[#b59658]/40 rounded-2xl p-6 space-y-4 shadow-2xl font-mono text-xs"
      >
            <div className="flex items-center justify-between pb-3 border-b border-[#b59658]/20">
              <div>
              <h2 id="schedule-visit-title" className="font-bold text-white text-base font-display flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#b59658]" />
                Schedule multi-project site visit
              </h2>
              <p id="schedule-visit-description" className="mt-1 text-[11px] text-slate-400">Choose a buyer, stops, and dispatch details for the itinerary.</p>
              </div>
              <button type="button" data-dialog-close aria-label="Close schedule site visit" onClick={() => setShowScheduleModal(false)} className="min-h-11 min-w-11 text-slate-400 hover:text-white">✕</button>
            </div>

            {actionError && <div role="alert" className="rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-200">{actionError}</div>}

            <form onSubmit={handleScheduleVisit} className="space-y-3.5">
              <div>
                <label htmlFor="visit-lead" className="text-slate-300 block mb-1">Purchaser lead:</label>
                <select
                  id="visit-lead"
                  name="leadId"
                  data-dialog-autofocus
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.fullName} ({l.phoneE164})
                    </option>
                  ))}
                </select>
              </div>

              <fieldset>
                <legend className="text-slate-300 block mb-1">
                  Select Units to Inspect ({selectedUnitIds.length} Selected):
                </legend>
                <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 rounded-lg bg-[#12151f] border border-[#b59658]/30">
                  {units.map((u) => {
                    const isSelected = selectedUnitIds.includes(u.id);
                    return (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => toggleUnitSelection(u.id)}
                        aria-pressed={isSelected}
                        className={`w-full text-left min-h-11 p-2 rounded flex justify-between items-center ${
                          isSelected ? 'bg-[#1b202c] border border-[#b59658]/50 text-white font-bold' : 'text-slate-400'
                        }`}
                      >
                        <div>
                          <span>{u.project?.projectName}</span>
                          <span className="text-[10px] text-slate-400 block">{u.bhk} BHK • Unit {u.unitNumber}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#ccb67b]" />}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="visit-date" className="text-slate-300 block mb-1">Visit date:</label>
                  <input
                    id="visit-date"
                    name="scheduledDate"
                    required
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label htmlFor="visit-time" className="text-slate-300 block mb-1">Time slot:</label>
                  <input
                    id="visit-time"
                    name="timeSlot"
                    required
                    type="text"
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="visit-pickup" className="text-slate-300 block mb-1">Pickup location:</label>
                <input
                  id="visit-pickup"
                  name="pickupLocation"
                  required
                  type="text"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label htmlFor="visit-cab" className="text-slate-300 block mb-1">Cab and driver logistics:</label>
                <input
                  id="visit-cab"
                  name="cabDetails"
                  type="text"
                  value={cabDetails}
                  onChange={(e) => setCabDetails(e.target.value)}
                  className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="min-h-11 px-3 py-1.5 rounded-lg bg-[#12151f] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-11 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] text-[#12151f] font-bold shadow-md"
                >
                  {submitting ? 'Dispatching…' : 'Dispatch tour itinerary'}
                </button>
              </div>
            </form>
      </AccessibleDialog>

      {/* MODAL: Post-Visit Feedback */}
      <AccessibleDialog
        open={Boolean(feedbackVisit)}
        onClose={() => setFeedbackVisit(null)}
        titleId="visit-feedback-title"
        descriptionId="visit-feedback-description"
        panelClassName="max-w-md bg-[#1b202c] border border-[#b59658]/40 rounded-2xl p-6 space-y-4 shadow-2xl font-mono text-xs"
      >
        {feedbackVisit && (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-[#b59658]/20">
              <div>
                <h2 id="visit-feedback-title" className="font-bold text-white text-base font-display">Log post-tour outcome</h2>
                <p id="visit-feedback-description" className="mt-1 text-[11px] text-slate-400">Record the buyer’s response and the next follow-up signal.</p>
              </div>
              <button type="button" data-dialog-close aria-label="Close post-tour outcome" onClick={() => setFeedbackVisit(null)} className="min-h-11 min-w-11 text-slate-400 hover:text-white">✕</button>
            </div>

            {actionError && <div role="alert" className="rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-200">{actionError}</div>}

            <form onSubmit={handleSaveFeedback} className="space-y-3.5">
              <div>
                <label htmlFor="feedback-outcome" className="text-slate-300 block mb-1">Outcome status:</label>
                <select
                  id="feedback-outcome"
                  name="feedbackOutcome"
                  data-dialog-autofocus
                  value={feedbackOutcome}
                  onChange={(e) => setFeedbackOutcome(e.target.value)}
                  className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                >
                  <option value="HIGH_INTEREST">HIGH_INTEREST (Moving to Token)</option>
                  <option value="OFFER_MADE">OFFER_MADE (Negotiating price)</option>
                  <option value="FOLLOW_UP_REQUIRED">FOLLOW_UP_REQUIRED</option>
                  <option value="REJECTED">REJECTED (Budget/layout mismatch)</option>
                </select>
              </div>

              <fieldset>
                <legend className="text-slate-300 block mb-1">Client enthusiasm rating (1–5):</legend>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFeedbackRating(r)}
                      aria-pressed={feedbackRating === r}
                      aria-label={`Rate client enthusiasm ${r} out of 5`}
                      className={`min-h-11 flex-1 py-1.5 rounded-lg border font-bold ${
                        feedbackRating >= r ? 'bg-amber-500 text-black border-amber-400' : 'bg-[#12151f] text-slate-400 border-slate-700'
                      }`}
                    >
                      ★ {r}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="feedback-notes" className="text-slate-300 block mb-1">Broker inspection notes:</label>
                <textarea
                  id="feedback-notes"
                  name="feedbackNotes"
                  rows={3}
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  placeholder="e.g. Liked the 12th-floor unit and requested a revised payment schedule…"
                  className="w-full bg-[#12151f] border border-[#b59658]/30 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFeedbackVisit(null)}
                  className="min-h-11 px-3 py-1.5 rounded-lg bg-[#12151f] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFeedback}
                  className="min-h-11 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] text-[#12151f] font-bold shadow-md"
                >
                  {savingFeedback ? 'Saving…' : 'Save outcome'}
                </button>
              </div>
            </form>
          </>
        )}
      </AccessibleDialog>
    </div>
  );
}
