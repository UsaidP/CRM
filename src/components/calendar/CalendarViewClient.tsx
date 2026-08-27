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
import { CustomSelect, type CustomSelectOption } from '@/components/ui/CustomSelect';
import { SourceEvidenceDrawer } from '@/components/leads/SourceEvidenceDrawer';
import { formatDateTime, formatTimeShort } from '@/lib/date-utils';

const ACTION_TYPE_OPTIONS: CustomSelectOption[] = [
  { value: 'CALL', label: '📞 Phone Call' },
  { value: 'WHATSAPP', label: '💬 WhatsApp' },
  { value: 'SITE_VISIT_FOLLOWUP', label: '🚗 Site Visit Follow-up' },
  { value: 'TOKEN_FOLLOWUP', label: '💰 Token / Booking' },
  { value: 'REQUIREMENT_CHECK', label: '📑 Requirements' },
  { value: 'GENERAL', label: '📝 General Task' },
];

const NEW_ACTION_TYPE_OPTIONS: CustomSelectOption[] = [
  { value: 'CALL', label: '📞 Phone Call' },
  { value: 'WHATSAPP', label: '💬 WhatsApp Message' },
  { value: 'SITE_VISIT_FOLLOWUP', label: '🚗 Site Visit Follow-up' },
  { value: 'TOKEN_FOLLOWUP', label: '💰 Token / Booking Follow-up' },
  { value: 'REQUIREMENT_CHECK', label: '📑 Requirement Check' },
  { value: 'GENERAL', label: '📝 General Reminder' },
];

const PRIORITY_OPTIONS: CustomSelectOption[] = [
  { value: 'URGENT', label: '🔴 Urgent', dotColor: 'bg-red-500' },
  { value: 'HIGH', label: '🟡 High', dotColor: 'bg-amber-500' },
  { value: 'MEDIUM', label: '⚪ Medium', dotColor: 'bg-blue-500' },
  { value: 'LOW', label: '🟢 Low', dotColor: 'bg-emerald-500' },
];

const NEW_PRIORITY_OPTIONS: CustomSelectOption[] = [
  { value: 'URGENT', label: '🔴 Urgent', dotColor: 'bg-red-500' },
  { value: 'HIGH', label: '🟡 High Priority', dotColor: 'bg-amber-500' },
  { value: 'MEDIUM', label: '⚪ Medium', dotColor: 'bg-blue-500' },
  { value: 'LOW', label: '🟢 Low', dotColor: 'bg-emerald-500' },
];

const SITE_VISIT_STATUS_OPTIONS: CustomSelectOption[] = [
  { value: 'SCHEDULED', label: '🗓️ Scheduled', dotColor: 'bg-blue-500' },
  { value: 'CONFIRMED', label: '✅ Confirmed', dotColor: 'bg-emerald-500' },
  { value: 'IN_PROGRESS', label: '🚗 In Progress', dotColor: 'bg-purple-500' },
  { value: 'COMPLETED', label: '🏁 Completed', dotColor: 'bg-emerald-600' },
  { value: 'CANCELLED', label: '❌ Cancelled', dotColor: 'bg-red-500' },
  { value: 'NO_SHOW', label: '⚠️ No Show', dotColor: 'bg-amber-500' },
];

const REMINDER_STATUS_OPTIONS: CustomSelectOption[] = [
  { value: 'PENDING', label: '⏳ Pending', dotColor: 'bg-amber-500' },
  { value: 'COMPLETED', label: '✅ Completed', dotColor: 'bg-emerald-500' },
  { value: 'SNOOZED', label: '⏰ Snoozed', dotColor: 'bg-purple-500' },
  { value: 'CANCELLED', label: '❌ Cancelled', dotColor: 'bg-red-500' },
];

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

type ViewMode = 'MONTH' | 'WEEK' | 'DAY' | 'AGENDA';
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
    setDrawerLead(null);
    setShowAddModal(false);
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

  // Calendar Date Math & Multi-View Computations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Navigation handlers per View Mode
  const prevPeriod = () => {
    if (viewMode === 'MONTH') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewMode === 'WEEK') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else if (viewMode === 'DAY') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    }
  };

  const nextPeriod = () => {
    if (viewMode === 'MONTH') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewMode === 'WEEK') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else if (viewMode === 'DAY') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  // Compute Days for Month Grid (35/42 day matrix)
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

  // Compute Days for 7-Day (Week) View
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const todayStr = new Date().toDateString();
    const days: Array<{ date: Date; isToday: boolean; dateStr: string; dayName: string }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push({
        date: d,
        isToday: d.toDateString() === todayStr,
        dateStr: d.toDateString(),
        dayName: daysOfWeek[d.getDay()],
      });
    }
    return days;
  }, [currentDate]);

  // Header Title String based on View Mode
  const currentHeaderTitle = useMemo(() => {
    if (viewMode === 'MONTH') {
      return `${monthNames[month]} ${year}`;
    }
    if (viewMode === 'WEEK') {
      const first = weekDays[0].date;
      const last = weekDays[6].date;
      const firstMonth = monthNames[first.getMonth()].slice(0, 3);
      const lastMonth = monthNames[last.getMonth()].slice(0, 3);
      if (first.getMonth() === last.getMonth()) {
        return `${firstMonth} ${first.getDate()} – ${last.getDate()}, ${first.getFullYear()}`;
      }
      return `${firstMonth} ${first.getDate()} – ${lastMonth} ${last.getDate()}, ${last.getFullYear()}`;
    }
    if (viewMode === 'DAY') {
      const isToday = currentDate.toDateString() === new Date().toDateString();
      const dayName = daysOfWeek[currentDate.getDay()];
      return `${isToday ? 'Today, ' : ''}${dayName} • ${monthNames[month]} ${currentDate.getDate()}, ${year}`;
    }
    return `Agenda Queue`;
  }, [viewMode, month, year, weekDays, currentDate]);

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

  // Single Day Events (for 1-Day View)
  const singleDayEvents = useMemo(() => {
    const targetDateStr = currentDate.toDateString();
    return filteredEvents.filter((e) => new Date(e.start).toDateString() === targetDateStr);
  }, [filteredEvents, currentDate]);

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
      return 'bg-surface-subtle text-content-muted border-border line-through';
    }
    if (e.sourceType === 'SITE_VISIT') {
      return 'bg-status-info-surface text-status-info border-status-info/40 hover:bg-status-info-surface/80';
    }
    if (e.isPastDue || (e.status === 'PENDING' && new Date(e.start).getTime() < Date.now())) {
      return 'bg-status-danger-surface text-status-danger border-status-danger/50 hover:bg-status-danger-surface/80 animate-pulse';
    }
    if (e.reminderType === 'WHATSAPP') {
      return 'bg-status-success-surface text-status-success border-status-success/40 hover:bg-status-success-surface/80';
    }
    if (e.reminderType === 'CALL') {
      return 'bg-accent-soft text-accent-text border-accent/40 hover:bg-accent-soft/80';
    }
    return 'bg-status-info-surface text-status-info border-status-info/40 hover:bg-status-info-surface/80';
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-status-success-surface text-status-success border-status-success/40';
      case 'CANCELLED':
      case 'NO_SHOW':
        return 'bg-status-danger-surface text-status-danger border-status-danger/40';
      case 'IN_PROGRESS':
      case 'CONFIRMED':
        return 'bg-status-info-surface text-status-info border-status-info/40';
      case 'SNOOZED':
        return 'bg-accent-soft text-accent-text border-accent/40';
      default:
        return 'bg-accent-soft text-accent-text border-accent/40';
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-status-danger-surface text-status-danger border-status-danger/40';
      case 'HIGH':
        return 'bg-accent-soft text-accent-text border-accent/40';
      case 'MEDIUM':
        return 'bg-status-info-surface text-status-info border-status-info/40';
      default:
        return 'bg-surface-subtle text-content-muted border-border';
    }
  };

  const getEventIcon = (type: string, sourceType: string) => {
    if (sourceType === 'SITE_VISIT') return <Car className="w-3 h-3 text-status-info shrink-0" />;
    if (type === 'WHATSAPP') return <MessageSquare className="w-3 h-3 text-status-success shrink-0" />;
    if (type === 'CALL') return <Phone className="w-3 h-3 text-accent shrink-0" />;
    return <Clock className="w-3 h-3 text-status-info shrink-0" />;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-content font-sans">
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
          {/* Month / Week / Day / Agenda Navigator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-surface-subtle border border-border rounded-xl p-1">
              <button
                onClick={prevPeriod}
                className="p-1.5 hover:bg-surface text-content-secondary hover:text-content rounded-lg transition-colors cursor-pointer"
                title={
                  viewMode === 'MONTH'
                    ? 'Previous Month'
                    : viewMode === 'WEEK'
                    ? 'Previous 7 Days'
                    : viewMode === 'DAY'
                    ? 'Previous Day'
                    : 'Previous Period'
                }
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-xs font-bold text-accent hover:bg-surface rounded-lg transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                onClick={nextPeriod}
                className="p-1.5 hover:bg-surface text-content-secondary hover:text-content rounded-lg transition-colors cursor-pointer"
                title={
                  viewMode === 'MONTH'
                    ? 'Next Month'
                    : viewMode === 'WEEK'
                    ? 'Next 7 Days'
                    : viewMode === 'DAY'
                    ? 'Next Day'
                    : 'Next Period'
                }
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <h2 className="text-base font-bold text-content tracking-tight flex items-center gap-2">
              {viewMode === 'DAY' ? (
                <CalendarClock className="w-4 h-4 text-accent" />
              ) : viewMode === 'AGENDA' ? (
                <ListOrdered className="w-4 h-4 text-accent" />
              ) : (
                <CalendarDays className="w-4 h-4 text-accent" />
              )}
              <span>{currentHeaderTitle}</span>
            </h2>
          </div>

          {/* View Mode Toggle: Month | 7 Days | 1 Day | Agenda */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-surface-subtle border border-border rounded-xl p-1 flex-wrap">
              <button
                type="button"
                onClick={() => setViewMode('MONTH')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'MONTH'
                    ? 'bg-accent text-white font-bold shadow-xs'
                    : 'text-content-secondary hover:text-content'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>Month</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('WEEK')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'WEEK'
                    ? 'bg-accent text-white font-bold shadow-xs'
                    : 'text-content-secondary hover:text-content'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>7 Days</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('DAY')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'DAY'
                    ? 'bg-accent text-white font-bold shadow-xs'
                    : 'text-content-secondary hover:text-content'
                }`}
              >
                <CalendarClock className="w-3.5 h-3.5" />
                <span>1 Day</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('AGENDA')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'AGENDA'
                    ? 'bg-accent text-white font-bold shadow-xs'
                    : 'text-content-secondary hover:text-content'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>Agenda</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-accent text-white border-accent shadow-xs'
                  : 'bg-surface-subtle text-content-secondary border-border hover:bg-surface hover:text-content'
              }`}
            >
              All Events ({counts.total})
            </button>
            <button
              onClick={() => setFilterType('OVERDUE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                filterType === 'OVERDUE'
                  ? 'bg-status-danger-surface text-status-danger border-status-danger ring-1 ring-status-danger/30'
                  : 'bg-surface-subtle text-content-secondary border-border hover:text-status-danger hover:border-status-danger/40'
              }`}
            >
              🔔 Overdue ({counts.overdue})
            </button>
            <button
              onClick={() => setFilterType('TODAY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                filterType === 'TODAY'
                  ? 'bg-accent-soft text-accent-text border-accent ring-1 ring-accent/30'
                  : 'bg-surface-subtle text-content-secondary border-border hover:text-accent hover:border-accent/40'
              }`}
            >
              📅 Today ({counts.today})
            </button>
            <button
              onClick={() => setFilterType('CALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                filterType === 'CALL'
                  ? 'bg-accent-soft text-accent-text border-accent ring-1 ring-accent/30'
                  : 'bg-surface-subtle text-content-secondary border-border hover:text-accent hover:border-accent/40'
              }`}
            >
              📞 Calls ({counts.calls})
            </button>
            <button
              onClick={() => setFilterType('WHATSAPP')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                filterType === 'WHATSAPP'
                  ? 'bg-status-success-surface text-status-success border-status-success ring-1 ring-status-success/30'
                  : 'bg-surface-subtle text-content-secondary border-border hover:text-status-success hover:border-status-success/40'
              }`}
            >
              💬 WhatsApp ({counts.whatsapps})
            </button>
            <button
              onClick={() => setFilterType('SITE_VISIT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                filterType === 'SITE_VISIT'
                  ? 'bg-status-info-surface text-status-info border-status-info ring-1 ring-status-info/30'
                  : 'bg-surface-subtle text-content-secondary border-border hover:text-status-info hover:border-status-info/40'
              }`}
            >
              🚗 Tours ({counts.visits})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64 flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search tasks, clients, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input w-full pr-3.5 py-2 bg-surface-subtle border border-border rounded-xl text-xs text-content placeholder:text-content-muted focus:outline-hidden focus:border-accent font-medium shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Main View Render: MONTH | WEEK (7 Days) | DAY (1 Day) | AGENDA */}
      {viewMode === 'MONTH' && (
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
                      <span className="opacity-0 group-hover:opacity-100 text-[10px] text-accent font-semibold transition-opacity">
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
                        <span className="font-semibold truncate">
                          {formatTimeShort(e.start)}
                        </span>
                        <span className="truncate">{e.leadName}</span>
                      </div>
                    ))}

                    {dayEvents.length > 3 && (
                      <p className="text-[9px] font-semibold text-accent pl-1">
                        +{dayEvents.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7 DAYS (WEEK) VIEW */}
      {viewMode === 'WEEK' && (
        <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-xs">
          {/* Week Days Column Header */}
          <div className="grid grid-cols-1 sm:grid-cols-7 border-b border-border bg-surface-subtle divide-y sm:divide-y-0 sm:divide-x divide-border">
            {weekDays.map(({ date, isToday, dateStr, dayName }) => {
              const dayEvents = filteredEvents.filter(
                (e) => new Date(e.start).toDateString() === dateStr
              );
              const dayVisits = dayEvents.filter((e) => e.sourceType === 'SITE_VISIT').length;

              return (
                <div
                  key={dateStr}
                  onClick={() => {
                    setCurrentDate(date);
                    setViewMode('DAY');
                  }}
                  className={`p-3 text-center cursor-pointer transition-all hover:bg-surface ${
                    isToday ? 'bg-accent-soft/30 ring-1 ring-inset ring-accent/30' : ''
                  }`}
                  title="Click to view single-day timeline"
                >
                  <span className="text-[11px] uppercase font-bold tracking-wider text-content-secondary block font-mono">
                    {dayName}
                  </span>
                  <div className="mt-1 flex items-center justify-center gap-1.5">
                    <span
                      className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                        isToday
                          ? 'bg-accent text-white font-extrabold shadow-xs'
                          : 'text-content bg-surface border border-border'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-center gap-1 flex-wrap">
                    <span className="text-[10px] font-semibold text-content-muted">
                      {dayEvents.length} {dayEvents.length === 1 ? 'task' : 'tasks'}
                    </span>
                    {dayVisits > 0 && (
                      <span className="text-[10px] px-1 py-0.5 rounded bg-status-info-surface text-status-info font-bold" title={`${dayVisits} Site Tours`}>
                        🚗 {dayVisits}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 7 Days Columns Content */}
          <div className="grid grid-cols-1 sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-border min-h-[420px] bg-surface">
            {weekDays.map(({ date, isToday, dateStr }) => {
              const dayEvents = filteredEvents.filter(
                (e) => new Date(e.start).toDateString() === dateStr
              );

              return (
                <div
                  key={dateStr}
                  className={`p-2.5 space-y-2 flex flex-col justify-between group/col transition-colors ${
                    isToday ? 'bg-accent-soft/10' : 'hover:bg-surface-subtle/30'
                  }`}
                >
                  <div className="space-y-2">
                    {dayEvents.length > 0 ? (
                      dayEvents.map((e) => {
                        const isOverdue =
                          e.status === 'PENDING' && new Date(e.start).getTime() < Date.now();
                        return (
                          <div
                            key={e.id}
                            onClick={() => openEventDetails(e)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer group/card shadow-2xs hover:shadow-xs ${
                              isOverdue
                                ? 'border-status-danger/50 bg-status-danger-surface/40 hover:border-status-danger'
                                : e.status === 'COMPLETED'
                                ? 'border-border/60 bg-surface-subtle/50 opacity-70'
                                : 'border-border hover:border-accent/40 bg-surface'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-content-secondary">
                                <Clock className="w-2.5 h-2.5" />
                                {formatTimeShort(e.start)}
                              </span>
                              {e.priority === 'URGENT' && (
                                <span className="w-2 h-2 rounded-full bg-status-danger animate-pulse" title="Urgent Priority" />
                              )}
                              {e.status === 'COMPLETED' && (
                                <Check className="w-3 h-3 text-status-success" />
                              )}
                            </div>

                            <div className="flex items-start gap-1.5">
                              <div className="mt-0.5 shrink-0">
                                {getEventIcon(e.reminderType, e.sourceType)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs font-bold leading-snug truncate ${
                                  e.status === 'COMPLETED' ? 'text-content-muted line-through' : 'text-content'
                                }`}>
                                  {e.title}
                                </p>
                                <p className="text-[11px] text-content-secondary truncate mt-0.5 font-medium">
                                  {e.leadName}
                                </p>
                              </div>
                            </div>

                            {/* Quick Action Buttons on Hover */}
                            <div
                              className="mt-2 pt-1.5 border-t border-border/40 flex items-center justify-end gap-1 opacity-80 group-hover/card:opacity-100"
                              onClick={(evt) => evt.stopPropagation()}
                            >
                              {e.phoneE164 && (
                                <>
                                  <a
                                    href={`https://wa.me/${e.phoneE164.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                      `Hi ${e.leadName}, following up regarding your property requirement with ZamZam Properties.`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded-md bg-status-success-surface hover:bg-status-success/20 text-status-success border border-status-success/30 transition-all cursor-pointer"
                                    title="WhatsApp"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                  </a>
                                  <a
                                    href={`tel:${e.phoneE164}`}
                                    className="p-1 rounded-md bg-accent-soft hover:bg-accent/20 text-accent-text border border-accent/30 transition-all cursor-pointer"
                                    title="Call"
                                  >
                                    <Phone className="w-3 h-3" />
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 px-2 text-center text-content-muted">
                        <p className="text-[11px] font-medium">No tasks</p>
                      </div>
                    )}
                  </div>

                  {/* Quick Add Button for this day */}
                  <button
                    type="button"
                    onClick={() => {
                      const localISO = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                        .toISOString()
                        .slice(0, 10);
                      setNewDueDate(`${localISO}T11:00`);
                      setShowAddModal(true);
                    }}
                    className="w-full py-1.5 rounded-lg border border-dashed border-border hover:border-accent hover:bg-accent-soft/20 text-[10px] font-bold text-content-muted hover:text-accent transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Task</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 1 DAY VIEW */}
      {viewMode === 'DAY' && (
        <div className="space-y-4">
          {/* Day Summary & Statistics Header Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-soft text-accent-text border border-accent/20 uppercase tracking-wider">
                  Single-Day Schedule
                </span>
                {currentDate.toDateString() === new Date().toDateString() && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-status-success-surface text-status-success border border-status-success/30">
                    Active Today
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-content font-display">
                {daysOfWeek[currentDate.getDay()]}, {monthNames[month]} {currentDate.getDate()}, {year}
              </h3>
              <p className="text-xs text-content-secondary">
                {singleDayEvents.length} scheduled {singleDayEvents.length === 1 ? 'task' : 'tasks'} •{' '}
                {singleDayEvents.filter((e) => e.status === 'COMPLETED').length} completed
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const localISO = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 10);
                  setNewDueDate(`${localISO}T11:00`);
                  setShowAddModal(true);
                }}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task for this Day</span>
              </button>
            </div>
          </div>

          {/* Day Schedule Segments */}
          {singleDayEvents.length > 0 ? (
            <div className="space-y-4">
              {[
                {
                  title: 'Morning (08:00 AM – 12:00 PM)',
                  icon: '🌅',
                  filter: (e: CalendarEvent) => {
                    const h = new Date(e.start).getHours();
                    return h < 12;
                  },
                },
                {
                  title: 'Afternoon (12:00 PM – 05:00 PM)',
                  icon: '☀️',
                  filter: (e: CalendarEvent) => {
                    const h = new Date(e.start).getHours();
                    return h >= 12 && h < 17;
                  },
                },
                {
                  title: 'Evening & Night (05:00 PM – 09:00 PM+)',
                  icon: '🌆',
                  filter: (e: CalendarEvent) => {
                    const h = new Date(e.start).getHours();
                    return h >= 17;
                  },
                },
              ].map((slot, sIdx) => {
                const slotEvents = singleDayEvents.filter(slot.filter);

                return (
                  <div key={sIdx} className="rounded-2xl bg-surface border border-border overflow-hidden shadow-xs">
                    <div className="px-4 py-3 bg-surface-subtle border-b border-border flex items-center justify-between">
                      <span className="text-xs font-bold text-content flex items-center gap-2">
                        <span>{slot.icon}</span>
                        <span>{slot.title}</span>
                        <span className="text-[11px] font-normal text-content-muted">
                          ({slotEvents.length} {slotEvents.length === 1 ? 'task' : 'tasks'})
                        </span>
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          const localISO = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60000)
                            .toISOString()
                            .slice(0, 10);
                          const defaultHour = sIdx === 0 ? '10:00' : sIdx === 1 ? '15:00' : '18:00';
                          setNewDueDate(`${localISO}T${defaultHour}`);
                          setShowAddModal(true);
                        }}
                        className="text-[11px] font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Quick Add</span>
                      </button>
                    </div>

                    <div className="p-4 space-y-3">
                      {slotEvents.length > 0 ? (
                        slotEvents.map((event) => {
                          const isOverdue =
                            event.status === 'PENDING' && new Date(event.start).getTime() < Date.now();

                          return (
                            <div
                              key={event.id}
                              onClick={() => openEventDetails(event)}
                              className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group shadow-2xs hover:shadow-xs ${
                                isOverdue
                                  ? 'border-status-danger/50 hover:border-status-danger bg-status-danger-surface/20'
                                  : event.status === 'COMPLETED'
                                  ? 'border-border bg-surface-subtle/50 opacity-75'
                                  : 'border-border hover:border-accent/40 bg-surface'
                              }`}
                            >
                              <div className="flex items-start gap-3.5">
                                <div
                                  className={`p-3 rounded-xl border shrink-0 mt-0.5 ${
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

                                <div className="space-y-1.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`text-sm font-bold ${
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
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-status-danger-surface text-status-danger border border-status-danger/40">
                                        URGENT
                                      </span>
                                    )}

                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                        event.status === 'COMPLETED'
                                          ? 'bg-status-success-surface text-status-success border-status-success/30'
                                          : 'bg-surface-subtle text-content-muted border-border'
                                      }`}
                                    >
                                      {event.status}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-3 text-xs text-content-muted">
                                    <div className="flex items-center gap-1.5">
                                      <User className="w-3.5 h-3.5 text-content-muted" />
                                      <span className="text-content font-semibold">{event.leadName}</span>
                                      {event.sourceCode && (
                                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-surface-subtle text-content-muted rounded-md border border-border">
                                          {event.sourceCode}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1 text-content-muted">
                                      <Clock className="w-3.5 h-3.5 text-accent" />
                                      <span className="font-semibold text-content">{formatTimeShort(event.start)}</span>
                                    </div>

                                    {event.pickupLocation && (
                                      <div className="flex items-center gap-1 text-status-info">
                                        <MapPin className="w-3.5 h-3.5" />
                                        <span>Pickup: {event.pickupLocation}</span>
                                      </div>
                                    )}
                                  </div>

                                  {event.notes && (
                                    <p className="text-xs text-content-muted italic bg-surface-subtle px-3 py-1.5 rounded-xl border border-border max-w-2xl">
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
                                      className="p-2.5 rounded-xl bg-status-success-surface hover:bg-status-success/20 text-status-success border border-status-success/30 transition-all cursor-pointer shadow-2xs"
                                      title="WhatsApp Client"
                                    >
                                      <MessageSquare className="w-4 h-4" />
                                    </a>
                                    <a
                                      href={`tel:${event.phoneE164}`}
                                      className="p-2.5 rounded-xl bg-accent-soft hover:bg-accent/20 text-accent-text border border-accent/30 transition-all cursor-pointer shadow-2xs"
                                      title="Call Client"
                                    >
                                      <Phone className="w-4 h-4" />
                                    </a>
                                  </>
                                )}

                                {event.sourceType === 'REMINDER' && (
                                  <button
                                    onClick={() => handleToggleComplete(event)}
                                    className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                                      event.status === 'COMPLETED'
                                        ? 'bg-status-success-surface text-status-success border-status-success/40'
                                        : 'bg-surface hover:bg-surface-subtle text-content-muted hover:text-status-success hover:border-status-success/40 border-border'
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
                        <div className="py-4 text-center text-content-muted text-xs">
                          No actions scheduled for this time bracket.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-surface border border-border rounded-2xl p-8 space-y-4 shadow-xs">
              <CalendarIcon className="w-12 h-12 text-content-muted mx-auto" />
              <h3 className="text-base font-bold text-content">No Events Scheduled for this Day</h3>
              <p className="text-xs text-content-muted max-w-sm mx-auto">
                No calls, WhatsApp reminders, or site tours exist for {daysOfWeek[currentDate.getDay()]}, {monthNames[month]} {currentDate.getDate()}.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const localISO = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 10);
                    setNewDueDate(`${localISO}T11:00`);
                    setShowAddModal(true);
                  }}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  + Schedule Reminder
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AGENDA QUEUE VIEW */}
      {viewMode === 'AGENDA' && (
        <div className="space-y-3">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => {
              const isOverdue =
                event.status === 'PENDING' && new Date(event.start).getTime() < Date.now();

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
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-status-danger-surface text-status-danger border border-status-danger/40">
                            URGENT
                          </span>
                        )}

                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold border ${
                            event.status === 'COMPLETED'
                              ? 'bg-status-success-surface text-status-success border-status-success/30'
                              : 'bg-surface-subtle text-content-muted border-border'
                          }`}
                        >
                          {event.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-content-muted">
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-content-muted" />
                          <span className="text-content font-medium">{event.leadName}</span>
                          {event.sourceCode && (
                            <span className="text-[10px] font-mono px-1 py-0.5 bg-surface-subtle text-content-muted rounded-md border border-border">
                              {event.sourceCode}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-content-muted">
                          <Clock className="w-3.5 h-3.5 text-content-muted" />
                          <span>
                            {formatDateTime(event.start)}
                          </span>
                        </div>
                      </div>

                      {event.notes && (
                        <p className="text-xs text-content-muted line-clamp-1 italic bg-surface-subtle px-2.5 py-1 rounded-lg border border-border max-w-xl">
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
                          className="p-2 rounded-xl bg-status-success-surface hover:bg-status-success/20 text-status-success border border-status-success/30 transition-all cursor-pointer"
                          title="WhatsApp Client"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </a>
                        <a
                          href={`tel:${event.phoneE164}`}
                          className="p-2 rounded-xl bg-accent-soft hover:bg-accent/20 text-accent-text border border-accent/30 transition-all cursor-pointer"
                          title="Call Client"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      </>
                    )}

                    {event.sourceType === 'REMINDER' && (
                      <button
                        onClick={() => handleToggleComplete(event)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          event.status === 'COMPLETED'
                            ? 'bg-status-success-surface text-status-success border-status-success/40'
                            : 'bg-surface hover:bg-surface-subtle text-content-muted hover:text-status-success hover:border-status-success/40 border-border'
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
            <div className="text-center py-16 bg-surface border border-border rounded-2xl p-8 space-y-3 shadow-xs">
              <CalendarIcon className="w-12 h-12 text-content-muted mx-auto" />
              <h3 className="text-base font-bold text-content">No Scheduled Events Found</h3>
              <p className="text-xs text-content-muted max-w-sm mx-auto">
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
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-accent" />
                <h2 id="event-details-dialog-title" className="text-base font-bold text-content font-display">
                  Scheduled Action Details
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingEvent(!isEditingEvent)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                    isEditingEvent
                      ? 'bg-accent text-white border-accent shadow-xs'
                      : 'bg-surface hover:bg-surface-subtle text-content border-border'
                  }`}
                >
                  {isEditingEvent ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                  <span>{isEditingEvent ? 'View Details' : 'Edit Details'}</span>
                </button>
                <button
                  type="button"
                  data-dialog-close
                  aria-label="Close dialog"
                  onClick={() => setSelectedEvent(null)}
                  className="p-1 rounded-lg text-content-muted hover:text-content hover:bg-surface-subtle transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Action Contact Bar */}
            <div className="p-3 rounded-2xl bg-surface-subtle border border-border flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {selectedEvent.phoneE164 ? (
                  <>
                    <a
                      href={`tel:${selectedEvent.phoneE164}`}
                      className="px-3 py-1.5 rounded-xl bg-accent-soft hover:bg-accent/20 text-accent-text border border-accent/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
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
                      className="px-3 py-1.5 rounded-xl bg-status-success-surface hover:bg-status-success/20 text-status-success border border-status-success/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </>
                ) : (
                  <span className="text-xs text-content-muted italic">No phone number on file</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedEvent.leadId && (
                  <button
                    type="button"
                    onClick={() => {
                      const foundLead = leads.find((l) => l.id === selectedEvent.leadId);
                      if (foundLead) {
                        setSelectedEvent(null);
                        setIsEditingEvent(false);
                        setDrawerLead(foundLead);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-accent" />
                    <span>Lead Profile</span>
                  </button>
                )}

                {selectedEvent.sourceType === 'REMINDER' && (
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(selectedEvent)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedEvent.status === 'COMPLETED'
                        ? 'bg-surface border-border text-content-muted hover:text-content'
                        : 'bg-status-success-surface border-status-success/40 text-status-success hover:bg-status-success/20'
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
                <div className="p-4 rounded-2xl bg-surface-subtle border border-border space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-md bg-surface text-content border border-border">
                        {selectedEvent.sourceType === 'SITE_VISIT' ? 'Escorted Site Visit' : 'Client Reminder'}
                      </span>
                      <h3 className="text-sm font-bold text-content font-display mt-1.5">{selectedEvent.title}</h3>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs border-t border-border">
                    <div>
                      <p className="text-content-muted text-[11px] font-medium">Target Client</p>
                      <p className="font-bold text-content mt-0.5 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-accent" />
                        <span>{selectedEvent.leadName}</span>
                      </p>
                    </div>

                    <div>
                      <p className="text-content-muted text-[11px] font-medium">Scheduled Time</p>
                      <p className="font-bold text-content mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-accent" />
                        <span>
                          {formatDateTime(selectedEvent.start)}
                        </span>
                      </p>
                    </div>

                    <div>
                      <p className="text-content-muted text-[11px] font-medium">Assigned Broker / Rep</p>
                      <p className="font-bold text-content mt-0.5">
                        {selectedEvent.brokerName || 'Primary Broker'}
                      </p>
                    </div>

                    <div>
                      <p className="text-content-muted text-[11px] font-medium">Category / Type</p>
                      <p className="font-bold text-content mt-0.5">
                        {selectedEvent.sourceType === 'SITE_VISIT'
                          ? 'Escorted Site Visit Tour'
                          : `${selectedEvent.reminderType} Follow-up`}
                      </p>
                    </div>
                  </div>

                  {selectedEvent.sourceType === 'SITE_VISIT' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs border-t border-border">
                      {selectedEvent.pickupLocation && (
                        <div>
                          <p className="text-content-muted text-[11px] font-medium">Pickup Location</p>
                          <p className="font-bold text-content mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-accent" />
                            {selectedEvent.pickupLocation}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedEvent.notes && (
                    <div className="pt-3 text-xs border-t border-border">
                      <p className="text-content-muted text-[11px] font-medium mb-1">Notes / Instructions</p>
                      <div className="p-3 rounded-xl bg-surface border border-border text-content text-xs whitespace-pre-wrap font-medium">
                        {selectedEvent.notes}
                      </div>
                    </div>
                  )}
                </div>

                {/* Snooze Options */}
                {selectedEvent.sourceType === 'REMINDER' && selectedEvent.status !== 'COMPLETED' && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-content">Quick Snooze Reminder</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSnooze(selectedEvent, 60)}
                        className="py-2 px-2 bg-surface hover:bg-surface-subtle border border-border text-content rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                      >
                        +1 Hour
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSnooze(selectedEvent, 1440)}
                        className="py-2 px-2 bg-surface hover:bg-surface-subtle border border-border text-content rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                      >
                        +Tomorrow
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSnooze(selectedEvent, 10080)}
                        className="py-2 px-2 bg-surface hover:bg-surface-subtle border border-border text-content rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                      >
                        +1 Week
                      </button>
                    </div>
                  </div>
                )}

                {/* Edit & Delete Action Row */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsEditingEvent(true)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Schedule Details</span>
                  </button>

                  {selectedEvent.sourceType === 'REMINDER' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteReminder(selectedEvent)}
                      className="w-full sm:w-auto text-xs text-status-danger hover:text-status-danger/80 flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl hover:bg-status-danger-surface transition-all font-bold cursor-pointer"
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
                  <div className="p-3 bg-status-danger-surface border border-status-danger/40 rounded-xl text-status-danger text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                {editSuccess && (
                  <div className="p-3 bg-status-success-surface border border-status-success/40 rounded-xl text-status-success text-xs font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{editSuccess}</span>
                  </div>
                )}

                {/* Title / Promise */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-content flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-accent" />
                    <span>Task Title / Description *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="e.g. Follow up with client regarding 2BHK builder VP discount"
                    className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent font-medium transition-all"
                  />
                </div>

                {/* Type, Priority, Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-content block">Action Type</label>
                    <CustomSelect
                      options={ACTION_TYPE_OPTIONS}
                      value={editType}
                      onChange={(val) => setEditType(val)}
                      disabled={selectedEvent.sourceType === 'SITE_VISIT'}
                      className="w-full"
                      triggerClassName="bg-surface-subtle border-border rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-content block">Priority</label>
                    <CustomSelect
                      options={PRIORITY_OPTIONS}
                      value={editPriority}
                      onChange={(val) => setEditPriority(val)}
                      className="w-full"
                      triggerClassName="bg-surface-subtle border-border rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-content block">Status</label>
                    <CustomSelect
                      options={selectedEvent.sourceType === 'SITE_VISIT' ? SITE_VISIT_STATUS_OPTIONS : REMINDER_STATUS_OPTIONS}
                      value={editStatus}
                      onChange={(val) => setEditStatus(val)}
                      className="w-full"
                      triggerClassName="bg-surface-subtle border-border rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Quick Presets for Edit */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-content">Quick Reschedule Presets</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyEditDatePreset('1H')}
                      className="py-1.5 px-2 bg-surface hover:bg-surface-subtle border border-border text-content rounded-lg text-xs font-bold transition-all text-center cursor-pointer"
                    >
                      +1 Hour
                    </button>
                    <button
                      type="button"
                      onClick={() => applyEditDatePreset('TODAY_4PM')}
                      className="py-1.5 px-2 bg-surface hover:bg-surface-subtle border border-border text-content rounded-lg text-xs font-bold transition-all text-center cursor-pointer"
                    >
                      Today 4 PM
                    </button>
                    <button
                      type="button"
                      onClick={() => applyEditDatePreset('TOMORROW_10AM')}
                      className="py-1.5 px-2 bg-surface hover:bg-surface-subtle border border-border text-content rounded-lg text-xs font-bold transition-all text-center cursor-pointer"
                    >
                      Tmrw 10 AM
                    </button>
                    <button
                      type="button"
                      onClick={() => applyEditDatePreset('TOMORROW_4PM')}
                      className="py-1.5 px-2 bg-surface hover:bg-surface-subtle border border-border text-content rounded-lg text-xs font-bold transition-all text-center cursor-pointer"
                    >
                      Tmrw 4 PM
                    </button>
                    <button
                      type="button"
                      onClick={() => applyEditDatePreset('WEEKEND')}
                      className="py-1.5 px-2 bg-surface hover:bg-surface-subtle border border-border text-content rounded-lg text-xs font-bold transition-all text-center cursor-pointer"
                    >
                      Sat 11 AM
                    </button>
                    <button
                      type="button"
                      onClick={() => applyEditDatePreset('1W')}
                      className="py-1.5 px-2 bg-surface hover:bg-surface-subtle border border-border text-content rounded-lg text-xs font-bold transition-all text-center cursor-pointer"
                    >
                      +1 Week
                    </button>
                  </div>
                </div>

                {/* Scheduled Due Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-content flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                    <span>Due Date &amp; Time *</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-content font-mono font-medium focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  />
                </div>

                {/* Site Visit Specific Fields */}
                {selectedEvent.sourceType === 'SITE_VISIT' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-content">Pickup Location</label>
                      <input
                        type="text"
                        value={editPickupLocation}
                        onChange={(e) => setEditPickupLocation(e.target.value)}
                        placeholder="e.g. Kharghar Railway Station (East)"
                        className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent font-medium transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-content">Cab &amp; Driver Details</label>
                      <input
                        type="text"
                        value={editCabDetails}
                        onChange={(e) => setEditCabDetails(e.target.value)}
                        placeholder="e.g. Ertiga MH-46-AZ-1234 (Ramesh)"
                        className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent font-medium transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Notes & Talking Points */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-content">Notes &amp; Instructions</label>
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Add instructions, client feedback, or negotiation points..."
                    className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent font-medium transition-all"
                  />
                </div>

                {/* Form Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsEditingEvent(false)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-surface border border-border hover:bg-surface-subtle text-content rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="w-full sm:w-auto px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
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
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-accent-soft border border-accent/20 text-accent">
                <CalendarClock className="w-4 h-4" />
              </div>
              <div>
                <h2 id="schedule-reminder-dialog-title" className="text-base font-bold text-content font-display tracking-tight">
                  Schedule Client Reminder
                </h2>
                <p className="text-xs text-content-muted">Set targeted callback promises and follow-up deadlines</p>
              </div>
            </div>
            <button
              type="button"
              data-dialog-close
              aria-label="Close dialog"
              onClick={() => setShowAddModal(false)}
              className="p-1.5 rounded-lg text-content-muted hover:text-content hover:bg-surface-subtle transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateReminder} className="space-y-4 pt-3">
            {formError && (
              <div className="p-3 bg-status-danger-surface border border-status-danger/40 rounded-xl text-status-danger text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Select Client Lead */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-content flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-accent" />
                <span>Client Lead *</span>
              </label>
              <CustomSelect
                options={leads.map((l) => ({
                  value: l.id,
                  label: `${l.fullName || 'Client'} (${l.phoneE164 || 'No Phone'})${l.sourceCode ? ` [${l.sourceCode}]` : ''}`,
                }))}
                value={newLeadId}
                onChange={(val) => setNewLeadId(val)}
                placeholder="Select client lead..."
                className="w-full"
                triggerClassName="bg-surface-subtle border-border rounded-xl text-xs font-medium"
              />
            </div>

            {/* Title / Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-content flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-accent" />
                <span>Reminder Title / Promise *</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Call to discuss Kharghar Sec 35 floor plans & builder discount"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent font-medium transition-all"
              />
            </div>

            {/* Type & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-content block">Action Type</label>
                <CustomSelect
                  options={NEW_ACTION_TYPE_OPTIONS}
                  value={newType}
                  onChange={(val) => setNewType(val)}
                  className="w-full"
                  triggerClassName="bg-surface-subtle border-border rounded-xl text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-content block">Priority</label>
                <CustomSelect
                  options={NEW_PRIORITY_OPTIONS}
                  value={newPriority}
                  onChange={(val) => setNewPriority(val)}
                  className="w-full"
                  triggerClassName="bg-surface-subtle border-border rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-content">Quick Schedule Presets</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                <button
                  type="button"
                  onClick={() => applyDatePreset('1H')}
                  className="py-1.5 px-2 bg-surface hover:bg-surface-subtle border border-border text-content rounded-lg text-xs font-bold transition-all text-center cursor-pointer"
                >
                  +1 Hour
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('TODAY_4PM')}
                  className="py-1.5 px-2 bg-surface hover:bg-surface-subtle border border-border text-content rounded-lg text-xs font-bold transition-all text-center cursor-pointer"
                >
                  Today 4 PM
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('TOMORROW_10AM')}
                  className="py-1.5 px-2 bg-surface hover:bg-surface-subtle border border-border text-content rounded-lg text-xs font-bold transition-all text-center cursor-pointer"
                >
                  Tmrw 10 AM
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('TOMORROW_4PM')}
                  className="py-1.5 px-2 bg-surface hover:bg-surface-subtle border border-border text-content rounded-lg text-xs font-bold transition-all text-center cursor-pointer"
                >
                  Tmrw 4 PM
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('WEEKEND')}
                  className="py-1.5 px-2 bg-surface hover:bg-surface-subtle border border-border text-content rounded-lg text-xs font-bold transition-all text-center col-span-3 sm:col-span-1 cursor-pointer"
                >
                  Sat 11 AM
                </button>
              </div>
            </div>

            {/* Due Date Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-content flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-accent" />
                <span>Due Date &amp; Time *</span>
              </label>
              <input
                type="datetime-local"
                required
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-content font-mono font-medium focus:outline-hidden focus:border-accent transition-all"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-content">Notes / Talking Points</label>
              <textarea
                rows={3}
                placeholder="Mention developer VP negotiation, 2BHK corner unit carpet area..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-content placeholder-content-muted focus:outline-hidden focus:border-accent font-medium transition-all"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 bg-surface border border-border hover:bg-surface-subtle text-content rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
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
