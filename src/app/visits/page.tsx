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
  ChevronRight
} from 'lucide-react';

export default function SiteVisitsPage() {
  const [visits, setVisits] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('ALL');

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
    try {
      const [visitRes, leadRes, unitRes] = await Promise.all([
        fetch('/api/v1/visits'),
        fetch('/api/v1/leads'),
        fetch('/api/v1/inventory/units'),
      ]);
      const visitData = await visitRes.json();
      const leadData = await leadRes.json();
      const unitData = await unitRes.json();

      if (visitData.success) setVisits(visitData.data);
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
    } catch (err) {
      console.error('Error fetching visits:', err);
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
      alert('Please select a lead and at least 1 property unit.');
      return;
    }
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
      if (data.success) {
        setShowScheduleModal(false);
        fetchVisitsAndData();
      } else {
        alert(data.error || 'Failed to schedule site visit');
      }
    } catch (err: any) {
      alert(err.message || 'Error scheduling site visit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackVisit) return;
    setSavingFeedback(true);
    try {
      const res = await fetch(`/api/v1/visits/${feedbackVisit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          feedbackRating,
          feedbackOutcome,
          feedbackNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackVisit(null);
        fetchVisitsAndData();
      } else {
        alert(data.error || 'Failed to save feedback');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving feedback');
    } finally {
      setSavingFeedback(false);
    }
  };

  const toggleUnitSelection = (id: string) => {
    setSelectedUnitIds((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((u) => u !== id) : prev) : [...prev, id]
    );
  };

  const filteredVisits = visits.filter((v) => {
    if (selectedStatus !== 'ALL' && v.status !== selectedStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#b59658]/20">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1b202c] border border-[#b59658]/40 text-[#ccb67b] text-xs font-semibold mb-2">
            <Calendar className="w-3.5 h-3.5 text-[#b59658]" />
            Site Visit Dispatcher &amp; Tour Logistics
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white font-display">
            Physical Inspection Itinerary Dispatcher
          </h1>
          <p className="text-slate-400 text-xs mt-0.5 font-sans">
            Build multi-stop Saturday tours across Kharghar &amp; Taloja with cab coordination, Google Maps routes, and post-visit feedback.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchVisitsAndData}
            className="p-2.5 rounded-xl bg-[#1b202c] hover:bg-[#2a3040] text-slate-300 hover:text-white border border-[#b59658]/30 transition-all flex items-center gap-2 text-xs font-semibold shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] hover:opacity-95 text-[#12151f] text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-lg shadow-[#b59658]/20 border border-[#ccb67b]/60"
          >
            <Plus className="w-4 h-4 text-[#12151f]" />
            Schedule New Tour
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Total Scheduled Tours</span>
          <div className="text-2xl font-bold text-white mt-1">{visits.length}</div>
          <span className="text-[10px] text-slate-400">Kharghar &amp; Taloja Corridor</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-amber-900/50">
          <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider block flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Upcoming Weekend Visits
          </span>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {visits.filter((v) => v.status === 'SCHEDULED' || v.status === 'CONFIRMED').length}
          </div>
          <span className="text-[10px] text-amber-300/80">Cab pickup pre-assigned</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-[#b59658]/30">
          <span className="text-[11px] text-[#ccb67b] font-bold uppercase tracking-wider block flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#b59658]" />
            Completed Inspections
          </span>
          <div className="text-2xl font-bold text-[#ccb67b] mt-1 font-display">
            {visits.filter((v) => v.status === 'COMPLETED').length}
          </div>
          <span className="text-[10px] text-[#ccb67b]/80">Feedback logged</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-purple-900/40">
          <span className="text-[11px] text-purple-400 font-bold uppercase tracking-wider block flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Token Submissions
          </span>
          <div className="text-2xl font-bold text-purple-400 mt-1 font-display">
            {visits.filter((v) => v.feedbackOutcome === 'TOKEN_SUBMITTED').length}
          </div>
          <span className="text-[10px] text-purple-300/80">Ready for deal closing ledger</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="glass-panel p-3.5 rounded-2xl flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400 font-semibold text-[11px] mr-1">Filter Status:</span>
        {[
          { id: 'ALL', label: 'All Visits' },
          { id: 'SCHEDULED', label: 'Scheduled' },
          { id: 'COMPLETED', label: 'Completed' },
          { id: 'CANCELLED', label: 'Cancelled' },
        ].map((st) => (
          <button
            key={st.id}
            onClick={() => setSelectedStatus(st.id)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              selectedStatus === st.id
                ? 'bg-[#1b202c] text-[#ccb67b] border border-[#b59658]/50 shadow-sm font-bold'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* Visits Stream */}
      {loading ? (
        <div className="glass-panel p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#ccb67b]" />
          <span>Loading scheduled site visits...</span>
        </div>
      ) : filteredVisits.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-400 text-sm space-y-2">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-white font-semibold">No site visits found matching this filter.</p>
          <p className="text-xs text-slate-400">Click &quot;Schedule New Tour&quot; above to organize a multi-project Saturday itinerary.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVisits.map((visit) => {
            const stops = visit.itineraryStops || [];
            const isCompleted = visit.status === 'COMPLETED';
            const leadPhone = (visit.lead?.phoneE164 || '').replace(/\+/g, '');

            return (
              <div
                key={visit.id}
                className="glass-panel p-5 rounded-3xl border border-slate-800 hover:border-[#b59658]/40 transition-all space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <Users className="w-4 h-4 text-[#ccb67b]" />
                      </span>
                      <h3 className="font-bold text-white text-base font-display">
                        {visit.lead?.fullName}
                      </h3>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                        {visit.lead?.phoneE164}
                      </span>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        {visit.timeSlot}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1 font-mono">
                      <span className="flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-amber-400" />
                        Pickup: <strong>{visit.pickupLocation}</strong>
                      </span>
                      {visit.cabDetails && (
                        <span className="text-slate-400 font-mono text-[11px]">
                          ({visit.cabDetails})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Badge & Feedback Trigger */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs border ${
                        isCompleted
                          ? 'bg-[#1b202c] text-[#ccb67b] border-[#b59658]/50'
                          : 'bg-amber-950 text-amber-300 border-amber-800'
                      }`}
                    >
                      {visit.status}
                    </span>

                    {!isCompleted && (
                      <button
                        onClick={() => setFeedbackVisit(visit)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[#ccb67b] font-bold text-xs border border-[#b59658]/30 transition-all flex items-center gap-1.5"
                      >
                        <Star className="w-3.5 h-3.5 text-[#b59658]" />
                        Log Feedback
                      </button>
                    )}
                  </div>
                </div>

                {/* Multi-Project Stops Timeline */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2.5">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block font-display">
                    Tour Itinerary ({stops.length} Project Stops):
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {stops.map((stop: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#ccb67b] font-mono text-[11px]">
                            Stop {idx + 1} • {stop.expectedTime}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                            {stop.bhk} BHK
                          </span>
                        </div>
                        <strong className="text-white text-xs block font-display">{stop.projectName}</strong>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {stop.microMarket}
                        </p>
                        {stop.developerPocName && (
                          <span className="text-[10px] text-slate-400 block pt-1 font-mono">
                            POC: {stop.developerPocName}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Logged Feedback Callout */}
                {visit.feedbackNotes && (
                  <div className="p-3 rounded-xl bg-[#1b202c] border border-[#b59658]/40 text-xs text-slate-300 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#ccb67b] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#b59658]" />
                        Post-Visit Outcome: {visit.feedbackOutcome?.replace('_', ' ')}
                      </span>
                      <span className="text-amber-400 font-bold">
                        {'★'.repeat(visit.feedbackRating || 5)} ({visit.feedbackRating}/5)
                      </span>
                    </div>
                    <p className="text-slate-300 italic text-[11px]">&quot;{visit.feedbackNotes}&quot;</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Schedule Multi-Project Tour */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full p-6 rounded-3xl border border-slate-700 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2 font-display">
                <Calendar className="w-4 h-4 text-[#b59658]" />
                Schedule Physical Site Visit Tour
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleVisit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Select Buyer Lead</label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ccb67b]"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.fullName} ({l.phoneE164})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1.5">
                  Select Inspection Units for Multi-Project Tour ({selectedUnitIds.length} Selected):
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 bg-slate-900/80 rounded-xl border border-slate-800">
                  {units.map((u) => {
                    const isSelected = selectedUnitIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleUnitSelection(u.id)}
                        className={`p-2 rounded-lg cursor-pointer flex items-center justify-between text-xs transition-all ${
                          isSelected ? 'bg-[#1b202c] border border-[#b59658]/50 text-white' : 'bg-slate-950 text-slate-400'
                        }`}
                      >
                        <div>
                          <strong className="font-display">{u.project.projectName}</strong> ({u.bhk} BHK • Unit {u.unitNumber})
                          <span className="text-[10px] text-slate-400 block font-mono">{u.project.microMarket}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#ccb67b]" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Visit Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Time Slot</label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Saturday 11:00 AM">Saturday 11:00 AM</option>
                    <option value="Saturday 03:30 PM">Saturday 03:30 PM</option>
                    <option value="Sunday 11:00 AM">Sunday 11:00 AM</option>
                    <option value="Sunday 03:30 PM">Sunday 03:30 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Pickup Point</label>
                <select
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="Kharghar Railway Station (East)">Kharghar Railway Station (East)</option>
                  <option value="Central Park Metro Station (Sector 34)">Central Park Metro Station (Sector 34)</option>
                  <option value="Mansarovar Station (Taloja Link)">Mansarovar Station (Taloja Link)</option>
                  <option value="Client Residence Pickup">Client Residence Pickup</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] hover:opacity-95 text-[#12151f] text-xs font-extrabold shadow-md flex items-center gap-1.5"
                >
                  {submitting ? 'Generating Tour...' : 'Schedule & Build Itinerary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Post-Visit Feedback */}
      {feedbackVisit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-3xl border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2 font-display">
                <Star className="w-4 h-4 text-amber-400" />
                Log Post-Visit Feedback
              </h3>
              <button onClick={() => setFeedbackVisit(null)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFeedback} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Client Name:</span>
                <strong className="text-white text-sm block font-display">{feedbackVisit.lead?.fullName}</strong>
                <span className="text-[11px] text-slate-400 font-mono">{feedbackVisit.timeSlot} • {feedbackVisit.pickupLocation}</span>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Client Sentiment Rating (1-5)</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className={`p-2 rounded-xl text-sm font-bold border transition-all ${
                        feedbackRating >= star
                          ? 'bg-amber-950 text-amber-400 border-amber-700'
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}
                    >
                      ★ {star}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Inspection Outcome</label>
                <select
                  value={feedbackOutcome}
                  onChange={(e) => setFeedbackOutcome(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="TOKEN_SUBMITTED">Token Submitted (Booking in Progress)</option>
                  <option value="HIGH_INTEREST">High Interest (Shortlisted for 2nd family visit)</option>
                  <option value="PRICE_OBJECTION">Price Objection (Wants developer discount)</option>
                  <option value="LAYOUT_OBJECTION">Layout / Carpet Objection</option>
                  <option value="NEEDS_MORE_OPTIONS">Wants more options in Sector 36</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Advisor Notes</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Liked Crown Heights 12th floor view. Negotiating ₹50k parking concession with developer VP."
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setFeedbackVisit(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFeedback}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8a6f3c] via-[#b59658] to-[#ccb67b] hover:opacity-95 text-[#12151f] text-xs font-extrabold shadow-md"
                >
                  {savingFeedback ? 'Saving...' : 'Save Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
