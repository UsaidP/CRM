'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  MessageSquare,
  Car,
  Filter,
  RefreshCw,
  Search,
  Check,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Trash2,
  CalendarDays,
  ListOrdered,
  Layers,
  MapPin,
  X,
  Building2,
  CalendarRange,
  Edit3,
  Save,
  PhoneCall,
  MessageCircle,
  CalendarClock,
  User,
  Eye,
  CheckSquare,
  FileText
} from 'lucide-react';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { SourceEvidenceDrawer } from '@/components/leads/SourceEvidenceDrawer';

interface CalendarEvent {
  id: string;
  rawId: string;
  sourceType: 'REMINDER' | 'SITE_VISIT';
  reminderType: string;
  title: string;
  start: string;
  end: string;
  priority: string;
  status: string;
  isPastDue?: boolean;
  notes?: string | null;
  leadId: string;
  leadName: string;
  brokerName?: string | null;
  phoneE164?: string | null;
  sourceCode?: string | null;
  leadStage?: string;
  timeSlot?: string;
  pickupLocation?: string;
  itinerary?: any[];
  lead?: any;
}

interface CalendarViewClientProps {
  initialEvents: CalendarEvent[];
  initialLeads: Array<{ id: string; fullName: string | null; phoneE164: string | null; sourceCode: string | null }>;
}

type ViewMode = 'MONTH' | 'WEEK' | 'AGENDA';
type FilterType = 'ALL' | 'OVERDUE' | 'TODAY' | 'CALL' | 'WHATSAPP' | 'SITE_VISIT' | 'COMPLETED';

export function CalendarViewClient({ initialEvents = [], initialLeads = [] }: CalendarViewClientProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [leads] = useState(initialLeads);
  const [viewMode, setViewMode] = useState<ViewMode>('MONTH');
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Detail & Add Modals
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [drawerLead, setDrawerLead] = useState<any | null>(null);

  // Scheduled Action Details Form (Edit State)
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState('CALL');
  const [editPriority, setEditPriority] = useState('HIGH');
  const [editStatus, setEditStatus] = useState('PENDING');
  const [editDueDate, setEditDueDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editTimeSlot, setEditTimeSlot] = useState('');
  const [editPickupLocation, setEditPickupLocation] = useState('');
  const [editCabDetails, setEditCabDetails] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // New Reminder Form State
  const [newLeadId, setNewLeadId] = useState(initialLeads[0]?.id || '');
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('CALL');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPriority, setNewPriority] = useState('HIGH');
  const [newNotes, setNewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/calendar/events');
      const data = await res.json();
      if (res.ok && data.success) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error('Failed to refresh calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  // Quick reminder time presets
  const applyDatePreset = (preset: '1H' | 'TODAY_4PM' | 'TOMORROW_10AM' | 'TOMORROW_4PM' | 'WEEKEND') => {
    const now = new Date();
    let target = new Date();

    if (preset === '1H') {
      target = new Date(now.getTime() + 60 * 60 * 1000);
    } else if (preset === 'TODAY_4PM') {
      target.setHours(16, 0, 0, 0);
      if (target.getTime() <= now.getTime()) {
        target = new Date(target.getTime() + 24 * 60 * 60 * 1000);
      }
    } else if (preset === 'TOMORROW_10AM') {
      target.setDate(target.getDate() + 1);
      target.setHours(10, 0, 0, 0);
    } else if (preset === 'TOMORROW_4PM') {
      target.setDate(target.getDate() + 1);
      target.setHours(16, 0, 0, 0);
    } else if (preset === 'WEEKEND') {
      const day = target.getDay();
      const daysUntilSaturday = (6 - day + 7) % 7 || 7;
      target.setDate(target.getDate() + daysUntilSaturday);
      target.setHours(11, 0, 0, 0);
    }

    // Format to datetime-local YYYY-MM-DDTHH:mm
    const tzOffset = target.getTimezoneOffset() * 60000;
    const localISOTime = new Date(target.getTime() - tzOffset).toISOString().slice(0, 16);
    setNewDueDate(localISOTime);
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newLeadId) {
      setFormError('Please select a client lead for this reminder.');
      return;
    }
    if (!newTitle.trim()) {
      setFormError('Please enter a task description or reminder title.');
      return;
    }
    if (!newDueDate) {
      setFormError('Please select a due date and time.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: newLeadId,
          title: newTitle,
          reminderType: newType,
          dueAt: new Date(newDueDate).toISOString(),
          priority: newPriority,
          notes: newNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to schedule reminder');
      }

      setShowAddModal(false);
      setNewTitle('');
      setNewNotes('');
      setNewDueDate('');
      await fetchEvents();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save reminder');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleComplete = async (event: CalendarEvent) => {
    if (event.sourceType !== 'REMINDER') return;
    const newStatus = event.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';

    try {
      const res = await fetch(`/api/v1/reminders/${event.rawId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setEvents((prev) =>
          prev.map((e) => (e.id === event.id ? { ...e, status: newStatus, isPastDue: false } : e))
        );
        if (selectedEvent?.id === event.id) {
          setSelectedEvent((prev) => (prev ? { ...prev, status: newStatus, isPastDue: false } : null));
        }
      }
    } catch (err) {
      console.error('Failed to toggle reminder status:', err);
    }
  };

  const handleSnooze = async (event: CalendarEvent, minutes: number) => {
    if (event.sourceType !== 'REMINDER') return;

    try {
      const res = await fetch(`/api/v1/reminders/${event.rawId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snoozeMinutes: minutes }),
      });

      if (res.ok) {
        await fetchEvents();
        setSelectedEvent(null);
      }
    } catch (err) {
      console.error('Failed to snooze reminder:', err);
    }
  };

  const handleDeleteReminder = async (event: CalendarEvent) => {
    if (event.sourceType !== 'REMINDER') return;
    if (!confirm('Are you sure you want to delete this reminder?')) return;

    try {
      const res = await fetch(`/api/v1/reminders/${event.rawId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== event.id));
        setSelectedEvent(null);
      }
    } catch (err) {
      console.error('Failed to delete reminder:', err);
    }
  };

  const openEventDetails = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEditingEvent(false);
    setEditTitle(event.title || '');
    setEditType(event.reminderType || 'CALL');
    setEditPriority(event.priority || 'HIGH');
    setEditStatus(event.status || 'PENDING');
    setEditNotes(event.notes || '');
    setEditTimeSlot(event.timeSlot || 'Saturday 11:00 AM');
    setEditPickupLocation(event.pickupLocation || 'Kharghar Railway Station (East)');
    setEditCabDetails((event as any).cabDetails || '');

    if (event.start) {
      const d = new Date(event.start);
      if (!isNaN(d.getTime())) {
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localStr = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
        setEditDueDate(localStr);
      } else {
        setEditDueDate('');
      }
    } else {
      setEditDueDate('');
    }
    setEditError('');
    setEditSuccess('');
  };

  const applyEditDatePreset = (preset: '1H' | 'TODAY_4PM' | 'TOMORROW_10AM' | 'TOMORROW_4PM' | 'WEEKEND' | '1W') => {
    const now = new Date();
    let target = new Date();

    if (preset === '1H') {
      target = new Date(now.getTime() + 60 * 60 * 1000);
    } else if (preset === 'TODAY_4PM') {
      target.setHours(16, 0, 0, 0);
      if (target.getTime() <= now.getTime()) {
        target = new Date(target.getTime() + 24 * 60 * 60 * 1000);
      }
    } else if (preset === 'TOMORROW_10AM') {
      target.setDate(target.getDate() + 1);
      target.setHours(10, 0, 0, 0);
    } else if (preset === 'TOMORROW_4PM') {
      target.setDate(target.getDate() + 1);
      target.setHours(16, 0, 0, 0);
    } else if (preset === 'WEEKEND') {
      const day = target.getDay();
      const daysUntilSaturday = (6 - day + 7) % 7 || 7;
      target.setDate(target.getDate() + daysUntilSaturday);
      target.setHours(11, 0, 0, 0);
    } else if (preset === '1W') {
      target = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const tzOffset = target.getTimezoneOffset() * 60000;
    const localISOTime = new Date(target.getTime() - tzOffset).toISOString().slice(0, 16);
    setEditDueDate(localISOTime);
  };

  const handleSaveEventDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setSavingEdit(true);
    setEditError('');
    setEditSuccess('');

    try {
      if (selectedEvent.sourceType === 'REMINDER') {
        const payload: any = {
          title: editTitle.trim(),
          reminderType: editType,
          priority: editPriority,
          status: editStatus,
          notes: editNotes.trim() || null,
        };
        if (editDueDate) {
          payload.dueAt = new Date(editDueDate).toISOString();
        }

        const res = await fetch(`/api/v1/reminders/${selectedEvent.rawId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to update reminder');
        }

        setEditSuccess('Scheduled action updated successfully!');
        await fetchEvents();
        setTimeout(() => {
          setIsEditingEvent(false);
          setEditSuccess('');
          setSelectedEvent((prev) =>
            prev
              ? {
                  ...prev,
                  title: editTitle.trim(),
                  reminderType: editType,
                  priority: editPriority,
                  status: editStatus,
                  notes: editNotes.trim() || null,
                  start: editDueDate ? new Date(editDueDate).toISOString() : prev.start,
                }
              : null
          );
        }, 500);
      } else if (selectedEvent.sourceType === 'SITE_VISIT') {
        const payload: any = {
          status: editStatus,
          timeSlot: editTimeSlot,
          pickupLocation: editPickupLocation,
          cabDetails: editCabDetails,
          feedbackNotes: editNotes.trim() || undefined,
        };
        if (editDueDate) {
          payload.scheduledDate = new Date(editDueDate).toISOString();
        }

        const res = await fetch(`/api/v1/visits/${selectedEvent.rawId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to update site visit tour');
        }

        setEditSuccess('Site visit tour updated successfully!');
        await fetchEvents();
        setTimeout(() => {
          setIsEditingEvent(false);
          setEditSuccess('');
          setSelectedEvent((prev) =>
            prev
              ? {
                  ...prev,
                  status: editStatus,
                  timeSlot: editTimeSlot,
                  pickupLocation: editPickupLocation,
                  start: editDueDate ? new Date(editDueDate).toISOString() : prev.start,
                }
              : null
          );
        }, 500);
      }
    } catch (err: any) {
      setEditError(err.message || 'Error updating scheduled action');
    } finally {
      setSavingEdit(false);
    }
  };

  // Calendar Date Math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Compute Days for Month Grid
  const monthDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: Array<{ date: Date; isCurrentMonth: boolean; isToday: boolean }> = [];
    const todayStr = new Date().toDateString();

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      days.push({ date: d, isCurrentMonth: false, isToday: d.toDateString() === todayStr });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, isCurrentMonth: true, isToday: d.toDateString() === todayStr });
    }

    // Next month padding to fill complete grid (multiples of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false, isToday: d.toDateString() === todayStr });
    }

    return days;
  }, [year, month]);

  // Filter and Search Events
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();

    return events.filter((e) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          e.title.toLowerCase().includes(q) ||
          e.leadName.toLowerCase().includes(q) ||
          (e.phoneE164 && e.phoneE164.includes(q)) ||
          (e.sourceCode && e.sourceCode.toLowerCase().includes(q)) ||
          (e.notes && e.notes.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Filter Type
      if (filterType === 'OVERDUE') {
        return e.status === 'PENDING' && new Date(e.start).getTime() < now.getTime();
      }
      if (filterType === 'TODAY') {
        return new Date(e.start).toDateString() === todayStr && e.status !== 'COMPLETED';
      }
      if (filterType === 'CALL') {
        return e.reminderType === 'CALL' && e.status !== 'COMPLETED';
      }
      if (filterType === 'WHATSAPP') {
        return e.reminderType === 'WHATSAPP' && e.status !== 'COMPLETED';
      }
      if (filterType === 'SITE_VISIT') {
        return e.sourceType === 'SITE_VISIT';
      }
      if (filterType === 'COMPLETED') {
        return e.status === 'COMPLETED';
      }

      return true;
    });
  }, [events, filterType, searchQuery]);

  // Counts for Badges
  const counts = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();

    const overdue = events.filter((e) => e.status === 'PENDING' && new Date(e.start).getTime() < now.getTime()).length;
    const today = events.filter((e) => new Date(e.start).toDateString() === todayStr && e.status !== 'COMPLETED').length;
    const calls = events.filter((e) => e.reminderType === 'CALL' && e.status !== 'COMPLETED').length;
    const whatsapps = events.filter((e) => e.reminderType === 'WHATSAPP' && e.status !== 'COMPLETED').length;
    const visits = events.filter((e) => e.sourceType === 'SITE_VISIT').length;
    const completed = events.filter((e) => e.status === 'COMPLETED').length;

    return { overdue, today, calls, whatsapps, visits, completed, total: events.length };
  }, [events]);

  const getEventBadgeColor = (e: CalendarEvent) => {
    if (e.status === 'COMPLETED') {
      return 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60 line-through';
    }
    if (e.sourceType === 'SITE_VISIT') {
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30';
    }
    if (e.isPastDue || (e.status === 'PENDING' && new Date(e.start).getTime() < Date.now())) {
      return 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30 animate-pulse';
    }
    if (e.reminderType === 'WHATSAPP') {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30';
    }
    if (e.reminderType === 'CALL') {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30';
    }
    return 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30';
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'CANCELLED':
      case 'NO_SHOW':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'IN_PROGRESS':
      case 'CONFIRMED':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'SNOOZED':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      default:
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  const getEventIcon = (type: string, sourceType: string) => {
    if (sourceType === 'SITE_VISIT') return <Car className="w-3 h-3 text-cyan-400 shrink-0" />;
    if (type === 'WHATSAPP') return <MessageSquare className="w-3 h-3 text-emerald-400 shrink-0" />;
    if (type === 'CALL') return <Phone className="w-3 h-3 text-amber-400 shrink-0" />;
    return <Clock className="w-3 h-3 text-blue-400 shrink-0" />;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-zinc-100 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-surface border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-content flex items-center gap-2.5">
              Firm Reminders &amp; Site Tour Calendar
              <span className="text-xs uppercase font-mono font-bold px-2.5 py-0.5 rounded-full bg-accent-soft text-accent-text border border-accent/20">
                Multi-Broker View
              </span>
            </h1>
          </div>
          <p className="text-xs text-content-secondary mt-1">
            Real-time follow-up tasks, scheduled call promises, and escorted site visits across all firm leads.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              applyDatePreset('TODAY_4PM');
              setShowAddModal(true);
            }}
            className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Reminder</span>
          </button>

          <button
            onClick={fetchEvents}
            disabled={loading}
            className="p-2.5 bg-surface hover:bg-surface-subtle border border-border text-content-secondary hover:text-content rounded-xl transition-all shadow-xs disabled:opacity-50"
            title="Refresh Calendar Feed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => setFilterType('OVERDUE')}
          className={`p-4 rounded-xl cursor-pointer transition-all border shadow-xs ${
            filterType === 'OVERDUE' ? 'bg-status-danger-surface border-status-danger ring-1 ring-status-danger/30' : 'bg-surface border-status-danger/30 hover:border-status-danger/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase font-bold tracking-wider text-content-secondary">Overdue Follow-ups</p>
              <h3 className="text-2xl font-bold text-status-danger mt-1">{counts.overdue}</h3>
              <p className="text-[11px] text-content-muted mt-0.5">Missed client call promises</p>
            </div>
            <div className="p-3 rounded-xl bg-status-danger-surface text-status-danger border border-status-danger/30">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div 
          onClick={() => setFilterType('TODAY')}
          className={`p-4 rounded-xl cursor-pointer transition-all border shadow-xs ${
            filterType === 'TODAY' ? 'bg-accent-soft border-accent ring-1 ring-accent/30' : 'bg-surface border-border hover:border-accent/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase font-bold tracking-wider text-content-secondary">Scheduled Today</p>
              <h3 className="text-2xl font-bold text-accent mt-1">{counts.today}</h3>
              <p className="text-[11px] text-content-muted mt-0.5">Due before end of day</p>
            </div>
            <div className="p-3 rounded-xl bg-accent-soft text-accent border border-accent/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div 
          onClick={() => setFilterType('SITE_VISIT')}
          className={`p-4 rounded-xl cursor-pointer transition-all border shadow-xs ${
            filterType === 'SITE_VISIT' ? 'bg-status-info-surface border-status-info ring-1 ring-status-info/30' : 'bg-surface border-status-info/30 hover:border-status-info/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase font-bold tracking-wider text-content-secondary">Escorted Site Tours</p>
              <h3 className="text-2xl font-bold text-status-info mt-1">{counts.visits}</h3>
              <p className="text-[11px] text-content-muted mt-0.5">Physical multi-project visits</p>
            </div>
            <div className="p-3 rounded-xl bg-status-info-surface text-status-info border border-status-info/30">
              <Car className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div 
          onClick={() => setFilterType('COMPLETED')}
          className={`p-4 rounded-xl cursor-pointer transition-all border shadow-xs ${
            filterType === 'COMPLETED' ? 'bg-status-success-surface border-status-success ring-1 ring-status-success/30' : 'bg-surface border-status-success/30 hover:border-status-success/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase font-bold tracking-wider text-content-secondary">Completed Tasks</p>
              <h3 className="text-2xl font-bold text-status-success mt-1">{counts.completed}</h3>
              <p className="text-[11px] text-content-muted mt-0.5">Resolved firm touchpoints</p>
            </div>
            <div className="p-3 rounded-xl bg-status-success-surface text-status-success border border-status-success/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Controls & Filters */}
      <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Month / Year Navigator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-surface-subtle border border-border rounded-xl p-1">
              <button
                onClick={prevMonth}
                className="p-1.5 hover:bg-surface text-content-secondary hover:text-content rounded-lg transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-xs font-bold text-accent hover:bg-surface rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 hover:bg-surface text-content-secondary hover:text-content rounded-lg transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <h2 className="text-base font-bold text-content tracking-tight flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-accent" />
              <span>{monthNames[month]} {year}</span>
            </h2>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-surface-subtle border border-border rounded-xl p-1">
              <button
                onClick={() => setViewMode('MONTH')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'MONTH' ? 'bg-accent text-white font-bold shadow-xs' : 'text-content-secondary hover:text-content'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                Month
              </button>
              <button
                onClick={() => setViewMode('AGENDA')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'AGENDA' ? 'bg-accent text-white font-bold shadow-xs' : 'text-content-secondary hover:text-content'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                Agenda List
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2 border-t border-zinc-800/60">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                filterType === 'ALL'
                  ? 'bg-zinc-800 text-white border-amber-500/50'
                  : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              All Events ({counts.total})
            </button>
            <button
              onClick={() => setFilterType('OVERDUE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                filterType === 'OVERDUE'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                  : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-rose-400'
              }`}
            >
              🔔 Overdue ({counts.overdue})
            </button>
            <button
              onClick={() => setFilterType('TODAY')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                filterType === 'TODAY'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                  : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-amber-400'
              }`}
            >
              📅 Today ({counts.today})
            </button>
            <button
              onClick={() => setFilterType('CALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                filterType === 'CALL'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                  : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-amber-400'
              }`}
            >
              📞 Calls ({counts.calls})
            </button>
            <button
              onClick={() => setFilterType('WHATSAPP')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                filterType === 'WHATSAPP'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                  : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-emerald-400'
              }`}
            >
              💬 WhatsApp ({counts.whatsapps})
            </button>
            <button
              onClick={() => setFilterType('SITE_VISIT')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                filterType === 'SITE_VISIT'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                  : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-cyan-400'
              }`}
            >
              🚗 Tours ({counts.visits})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search tasks, clients, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>
        </div>
      </div>

      {/* Main View Render */}
      {viewMode === 'MONTH' ? (
        <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-xs">
          {/* Day of Week Header */}
          <div className="grid grid-cols-7 border-b border-border bg-surface-subtle text-center text-[11px] font-bold text-content-secondary uppercase tracking-wider py-3">
            {daysOfWeek.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Month Calendar Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border bg-surface">
            {monthDays.map(({ date, isCurrentMonth, isToday }, idx) => {
              const dateStr = date.toDateString();
              const dayEvents = filteredEvents.filter(
                (e) => new Date(e.start).toDateString() === dateStr
              );

              return (
                <div
                  key={idx}
                  onClick={() => {
                    const localISO = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 10);
                    setNewDueDate(`${localISO}T11:00`);
                    setShowAddModal(true);
                  }}
                  className={`min-h-[110px] p-2.5 transition-colors group relative cursor-pointer ${
                    !isCurrentMonth ? 'bg-surface-subtle/40 text-content-muted' : 'bg-surface text-content'
                  } ${isToday ? 'bg-accent-soft/30 ring-2 ring-inset ring-accent/40' : 'hover:bg-surface-subtle'}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold rounded-lg px-2 py-0.5 ${
                        isToday
                          ? 'bg-accent text-white font-extrabold shadow-2xs'
                          : isCurrentMonth
                          ? 'text-content'
                          : 'text-content-muted'
                      }`}
                    >
                      {date.getDate()}
                    </span>

                    {isCurrentMonth && (
                      <span className="opacity-0 group-hover:opacity-100 text-[10px] text-amber-400/80 transition-opacity">
                        + Add
                      </span>
                    )}
                  </div>

                  {/* Day Event List */}
                  <div className="space-y-1 overflow-y-auto max-h-[80px]">
                    {dayEvents.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        onClick={(evt) => {
                          evt.stopPropagation();
                          openEventDetails(e);
                        }}
                        className={`text-[10px] px-1.5 py-1 rounded border transition-all flex items-center gap-1 cursor-pointer truncate ${getEventBadgeColor(
                          e
                        )}`}
                        title={`${e.title} - ${e.leadName}`}
                      >
                        {getEventIcon(e.reminderType, e.sourceType)}
                        <span suppressHydrationWarning className="font-semibold truncate">
                          {isMounted ? new Date(e.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        <span className="truncate">{e.leadName}</span>
                      </div>
                    ))}

                    {dayEvents.length > 3 && (
                      <p className="text-[9px] font-semibold text-amber-400/90 pl-1">
                        +{dayEvents.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Agenda Queue View */
        <div className="space-y-3">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => {
              const isOverdue =
                event.status === 'PENDING' && new Date(event.start).getTime() < Date.now();
              const eventDate = new Date(event.start);

              return (
                <div
                  key={event.id}
                  onClick={() => openEventDetails(event)}
                  className={`p-4 rounded-2xl bg-surface border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group shadow-xs ${
                    isOverdue
                      ? 'border-status-danger/50 hover:border-status-danger bg-status-danger-surface/30'
                      : event.status === 'COMPLETED'
                      ? 'border-border opacity-70 bg-surface-subtle/50'
                      : 'border-border hover:border-accent/50'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${
                        event.sourceType === 'SITE_VISIT'
                          ? 'bg-status-info-surface border-status-info/30 text-status-info'
                          : event.reminderType === 'WHATSAPP'
                          ? 'bg-status-success-surface border-status-success/30 text-status-success'
                          : isOverdue
                          ? 'bg-status-danger-surface border-status-danger/30 text-status-danger animate-pulse'
                          : 'bg-accent-soft border-accent/20 text-accent-text'
                      }`}
                    >
                      {getEventIcon(event.reminderType, event.sourceType)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-xs font-bold ${
                            isOverdue
                              ? 'text-status-danger'
                              : event.status === 'COMPLETED'
                              ? 'text-content-muted line-through'
                              : 'text-content'
                          }`}
                        >
                          {event.title}
                        </span>


                        {event.priority === 'URGENT' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            URGENT
                          </span>
                        )}

                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
                            event.status === 'COMPLETED'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {event.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="text-zinc-300 font-medium">{event.leadName}</span>
                          {event.sourceCode && (
                            <span className="text-[10px] font-mono px-1 py-0.2 bg-zinc-800 text-zinc-400 rounded">
                              {event.sourceCode}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-zinc-400">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          <span suppressHydrationWarning>
                            {isMounted
                              ? new Date(event.start).toLocaleString([], {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })
                              : ''}
                          </span>
                        </div>
                      </div>

                      {event.notes && (
                        <p className="text-xs text-zinc-400 line-clamp-1 italic bg-zinc-950/60 px-2 py-1 rounded border border-zinc-800/60 max-w-xl">
                          "{event.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div
                    className="flex items-center gap-2 self-end md:self-center shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {event.phoneE164 && (
                      <>
                        <a
                          href={`https://wa.me/${event.phoneE164.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Hi ${event.leadName}, following up regarding your property inquiry at ZamZam Properties.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all"
                          title="WhatsApp Client"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </a>
                        <a
                          href={`tel:${event.phoneE164}`}
                          className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 transition-all"
                          title="Call Client"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      </>
                    )}

                    {event.sourceType === 'REMINDER' && (
                      <button
                        onClick={() => handleToggleComplete(event)}
                        className={`p-2 rounded-xl border transition-all ${
                          event.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-zinc-900 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/40 border-zinc-800'
                        }`}
                        title={event.status === 'COMPLETED' ? 'Mark Incomplete' : 'Mark Completed'}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-16 bg-[#0c0e16] border border-zinc-800 rounded-2xl p-8 space-y-3">
              <CalendarIcon className="w-12 h-12 text-zinc-600 mx-auto" />
              <h3 className="text-base font-semibold text-zinc-300">No Scheduled Events Found</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                No reminders or tours match the selected filter criteria. Use the schedule button above to add a task.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Scheduled Action Details Dialog & Form */}
      {selectedEvent && (
        <AccessibleDialog
          open={true}
          onClose={() => setSelectedEvent(null)}
          titleId="event-details-dialog-title"
          size="lg"
        >
          <div className="space-y-4">
            {/* Modal Header with Mode Switch */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-amber-400" />
                <h2 id="event-details-dialog-title" className="text-base font-bold text-white">
                  Scheduled Action Details
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingEvent(!isEditingEvent)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                    isEditingEvent
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:text-white'
                  }`}
                >
                  {isEditingEvent ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                  <span>{isEditingEvent ? 'View Details' : 'Edit Details'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Action Contact Bar */}
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {selectedEvent.phoneE164 ? (
                  <>
                    <a
                      href={`tel:${selectedEvent.phoneE164}`}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition-all flex items-center gap-1.5"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Call {selectedEvent.phoneE164}</span>
                    </a>
                    <a
                      href={`https://wa.me/${selectedEvent.phoneE164.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `Hi ${selectedEvent.leadName}, following up regarding ${selectedEvent.title} with ZamZam Properties.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </>
                ) : (
                  <span className="text-xs text-zinc-500 italic">No phone number on file</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedEvent.leadId && (
                  <button
                    type="button"
                    onClick={() => {
                      const foundLead = leads.find((l) => l.id === selectedEvent.leadId);
                      if (foundLead) {
                        setDrawerLead(foundLead);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-semibold transition-all flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Lead Profile</span>
                  </button>
                )}

                {selectedEvent.sourceType === 'REMINDER' && (
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(selectedEvent)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      selectedEvent.status === 'COMPLETED'
                        ? 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white'
                        : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{selectedEvent.status === 'COMPLETED' ? 'Mark Incomplete' : 'Mark Done'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* VIEW DETAILS MODE */}
            {!isEditingEvent ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {selectedEvent.sourceType === 'SITE_VISIT' ? 'Escorted Site Visit' : 'Client Reminder'}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-1.5">{selectedEvent.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-bold border ${getStatusBadgeColor(
                          selectedEvent.status
                        )}`}
                      >
                        {selectedEvent.status}
                      </span>
                      {selectedEvent.priority && (
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-bold border ${getPriorityBadge(
                            selectedEvent.priority
                          )}`}
                        >
                          {selectedEvent.priority}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-zinc-800">
                    <div>
                      <p className="text-zinc-500">Target Client</p>
                      <p className="font-semibold text-zinc-200 mt-0.5 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        <span>{selectedEvent.leadName}</span>
                      </p>
                    </div>

                    <div>
                      <p className="text-zinc-500">Scheduled Time</p>
                      <p className="font-semibold text-zinc-200 mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span suppressHydrationWarning>
                          {new Date(selectedEvent.start).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </p>
                    </div>

                    <div>
                      <p className="text-zinc-500">Assigned Broker / Rep</p>
                      <p className="font-semibold text-zinc-200 mt-0.5">
                        {selectedEvent.brokerName || 'Primary Broker'}
                      </p>
                    </div>

                    <div>
                      <p className="text-zinc-500">Category / Type</p>
                      <p className="font-semibold text-zinc-200 mt-0.5">
                        {selectedEvent.sourceType === 'SITE_VISIT'
                          ? 'Escorted Site Visit Tour'
                          : `${selectedEvent.reminderType} Follow-up`}
                      </p>
                    </div>
                  </div>

                  {selectedEvent.sourceType === 'SITE_VISIT' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-zinc-800">
                      {selectedEvent.pickupLocation && (
                        <div>
                          <p className="text-zinc-500">Pickup Location</p>
                          <p className="font-semibold text-zinc-200 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-cyan-400" />
                            {selectedEvent.pickupLocation}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedEvent.notes && (
                    <div className="pt-2 text-xs border-t border-zinc-800">
                      <p className="text-zinc-500 mb-1">Notes / Instructions</p>
                      <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-300 text-xs whitespace-pre-wrap">
                        {selectedEvent.notes}
                      </div>
                    </div>
                  )}
                </div>

                {/* Snooze Options */}
                {selectedEvent.sourceType === 'REMINDER' && selectedEvent.status !== 'COMPLETED' && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-zinc-400">Quick Snooze Reminder</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSnooze(selectedEvent, 60)}
                        className="py-2 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs transition-all text-center"
                      >
                        +1 Hour
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSnooze(selectedEvent, 1440)}
                        className="py-2 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs transition-all text-center"
                      >
                        +Tomorrow
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSnooze(selectedEvent, 10080)}
                        className="py-2 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs transition-all text-center"
                      >
                        +1 Week
                      </button>
                    </div>
                  </div>
                )}

                {/* Edit & Delete Action Row */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsEditingEvent(true)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Schedule Details</span>
                  </button>

                  {selectedEvent.sourceType === 'REMINDER' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteReminder(selectedEvent)}
                      className="w-full sm:w-auto text-xs text-rose-400 hover:text-rose-300 flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl hover:bg-rose-950/20 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Reminder</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* EDIT FORM MODE */
              <form onSubmit={handleSaveEventDetails} className="space-y-4 pt-1">
                {editError && (
                  <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                {editSuccess && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{editSuccess}</span>
                  </div>
                )}

                {/* Title / Promise */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Task Title / Description *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="e.g. Follow up with client regarding 2BHK builder VP discount"
                    className="w-full px-3.5 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  />
                </div>

                {/* Type, Priority, Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Action Type</label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      disabled={selectedEvent.sourceType === 'SITE_VISIT'}
                      className="w-full px-3 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 disabled:opacity-50 transition-all"
                    >
                      <option value="CALL">📞 Phone Call</option>
                      <option value="WHATSAPP">💬 WhatsApp</option>
                      <option value="SITE_VISIT_FOLLOWUP">🚗 Site Visit Follow-up</option>
                      <option value="TOKEN_FOLLOWUP">💰 Token / Booking</option>
                      <option value="REQUIREMENT_CHECK">📑 Requirements</option>
                      <option value="GENERAL">📝 General Task</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Priority</label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                    >
                      <option value="URGENT">🔴 Urgent</option>
                      <option value="HIGH">🟡 High</option>
                      <option value="MEDIUM">⚪ Medium</option>
                      <option value="LOW">🟢 Low</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                    >
                      {selectedEvent.sourceType === 'SITE_VISIT' ? (
                        <>
                          <option value="SCHEDULED">🗓️ Scheduled</option>
                          <option value="CONFIRMED">✅ Confirmed</option>
                          <option value="IN_PROGRESS">🚗 In Progress</option>
                          <option value="COMPLETED">🏁 Completed</option>
                          <option value="CANCELLED">❌ Cancelled</option>
                          <option value="NO_SHOW">⚠️ No Show</option>
                        </>
                      ) : (
                        <>
                          <option value="PENDING">⏳ Pending</option>
                          <option value="COMPLETED">✅ Completed</option>
                          <option value="SNOOZED">⏰ Snoozed</option>
                          <option value="CANCELLED">❌ Cancelled</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* Quick Presets for Edit */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Quick Reschedule Presets</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyEditDatePreset('1H')}
                      className="py-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-all text-center"
                    >
                      +1 Hour
                    </button>
                    <button
                      type="button"
                      onClick={() => applyEditDatePreset('TODAY_4PM')}
                      className="py-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-all text-center"
                    >
                      Today 4 PM
                    </button>
                    <button
                      type="button"
                      onClick={() => applyEditDatePreset('TOMORROW_10AM')}
                      className="py-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-all text-center"
                    >
                      Tmrw 10 AM
                    </button>
                    <button
                      type="button"
                      onClick={() => applyEditDatePreset('TOMORROW_4PM')}
                      className="py-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-all text-center"
                    >
                      Tmrw 4 PM
                    </button>
                    <button
                      type="button"
                      onClick={() => applyEditDatePreset('WEEKEND')}
                      className="py-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-all text-center"
                    >
                      Sat 11 AM
                    </button>
                    <button
                      type="button"
                      onClick={() => applyEditDatePreset('1W')}
                      className="py-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-all text-center"
                    >
                      +1 Week
                    </button>
                  </div>
                </div>

                {/* Scheduled Due Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Due Date &amp; Time *</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  />
                </div>

                {/* Site Visit Specific Fields */}
                {selectedEvent.sourceType === 'SITE_VISIT' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">Pickup Location</label>
                      <input
                        type="text"
                        value={editPickupLocation}
                        onChange={(e) => setEditPickupLocation(e.target.value)}
                        placeholder="e.g. Kharghar Railway Station (East)"
                        className="w-full px-3.5 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">Cab &amp; Driver Details</label>
                      <input
                        type="text"
                        value={editCabDetails}
                        onChange={(e) => setEditCabDetails(e.target.value)}
                        placeholder="e.g. Ertiga MH-46-AZ-1234 (Ramesh)"
                        className="w-full px-3.5 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Notes & Talking Points */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Notes &amp; Instructions</label>
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Add instructions, client feedback, or negotiation points..."
                    className="w-full px-3.5 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  />
                </div>

                {/* Form Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsEditingEvent(false)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold transition-all"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingEdit ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </AccessibleDialog>
      )}

      {/* Schedule Reminder Modal */}
      {showAddModal && (
        <AccessibleDialog
          open={true}
          onClose={() => setShowAddModal(false)}
          titleId="schedule-reminder-dialog-title"
          size="md"
        >
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <CalendarClock className="w-4 h-4" />
              </div>
              <div>
                <h2 id="schedule-reminder-dialog-title" className="text-base font-bold text-white tracking-tight">
                  Schedule Client Reminder
                </h2>
                <p className="text-[11px] text-zinc-400">Set targeted callback promises and follow-up deadlines</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateReminder} className="space-y-4 pt-3">
            {formError && (
              <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Select Client Lead */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Client Lead *</span>
              </label>
              <select
                value={newLeadId}
                onChange={(e) => setNewLeadId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
              >
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.fullName || 'Client'} ({l.phoneE164 || 'No Phone'}) {l.sourceCode ? `[${l.sourceCode}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Title / Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Reminder Title / Promise *</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Call to discuss Kharghar Sec 35 floor plans & builder discount"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
              />
            </div>

            {/* Type & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Action Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                >
                  <option value="CALL">📞 Phone Call</option>
                  <option value="WHATSAPP">💬 WhatsApp Message</option>
                  <option value="SITE_VISIT_FOLLOWUP">🚗 Site Visit Follow-up</option>
                  <option value="TOKEN_FOLLOWUP">💰 Token / Booking Follow-up</option>
                  <option value="REQUIREMENT_CHECK">📑 Requirement Check</option>
                  <option value="GENERAL">📝 General Reminder</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                >
                  <option value="URGENT">🔴 Urgent</option>
                  <option value="HIGH">🟡 High Priority</option>
                  <option value="MEDIUM">⚪ Medium</option>
                  <option value="LOW">🟢 Low</option>
                </select>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Quick Schedule Presets</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                <button
                  type="button"
                  onClick={() => applyDatePreset('1H')}
                  className="py-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-all text-center"
                >
                  +1 Hour
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('TODAY_4PM')}
                  className="py-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-all text-center"
                >
                  Today 4 PM
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('TOMORROW_10AM')}
                  className="py-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-all text-center"
                >
                  Tmrw 10 AM
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('TOMORROW_4PM')}
                  className="py-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-all text-center"
                >
                  Tmrw 4 PM
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('WEEKEND')}
                  className="py-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-all text-center col-span-3 sm:col-span-1"
                >
                  Sat 11 AM
                </button>
              </div>
            </div>

            {/* Due Date Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Due Date &amp; Time *</span>
              </label>
              <input
                type="datetime-local"
                required
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Notes / Talking Points</label>
              <textarea
                rows={3}
                placeholder="Mention developer VP negotiation, 2BHK corner unit carpet area..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{submitting ? 'Scheduling...' : 'Save Reminder'}</span>
              </button>
            </div>
          </form>
        </AccessibleDialog>
      )}

      {/* Slide-over Lead Evidence Drawer */}
      {drawerLead && (
        <SourceEvidenceDrawer
          lead={drawerLead}
          onClose={() => setDrawerLead(null)}
          onOpenMergeModal={() => {}}
          onLeadUpdated={fetchEvents}
        />
      )}
    </div>
  );
}
