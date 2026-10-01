import { apiGet, apiPost, apiPatch, apiDelete } from './api';

/** Calendar events + reminders. The calendar/events endpoint returns its own `events` shape. */

export async function fetchCalendarEvents(): Promise<unknown[]> {
  try {
    const res = await apiGet<any>('/api/v1/calendar/events');
    if (Array.isArray(res)) return res;
    if (res?.events && Array.isArray(res.events)) return res.events;
    if (res?.data && Array.isArray(res.data)) return res.data;
    return [];
  } catch (err) {
    console.error('Error fetching calendar events:', err);
    return [];
  }
}

/** Minimal shape of a reminder row as returned by GET /api/v1/reminders. */
export interface ReminderListItem {
  id: string;
  leadId: string;
  title: string;
  reminderType: string;
  dueAt: string;
  priority: string;
  status: string;
  notes?: string | null;
  lead?: {
    id?: string;
    fullName?: string | null;
    phoneE164?: string | null;
    currentStage?: string | null;
    contact?: { fullName?: string | null; phoneE164?: string | null } | null;
  } | null;
}

export async function fetchReminders(params: {
  timeframe?: 'today' | 'overdue' | 'upcoming' | 'all';
  status?: string;
  leadId?: string;
  reminderType?: string;
} = {}): Promise<ReminderListItem[]> {
  const query = new URLSearchParams();
  if (params.timeframe) query.set('timeframe', params.timeframe);
  if (params.status) query.set('status', params.status);
  if (params.leadId) query.set('leadId', params.leadId);
  if (params.reminderType) query.set('reminderType', params.reminderType);

  const suffix = query.toString() ? `?${query.toString()}` : '';
  try {
    const res = await apiGet<any>(`/api/v1/reminders${suffix}`);
    if (Array.isArray(res)) return res as ReminderListItem[];
    if (Array.isArray(res?.data)) return res.data as ReminderListItem[];
    return [];
  } catch (err) {
    console.error('Error fetching reminders:', err);
    return [];
  }
}

export async function createReminder(payload: Record<string, unknown>): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const data = await apiPost('/api/v1/reminders', payload);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateReminder(id: string, payload: Record<string, unknown>): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const data = await apiPatch(`/api/v1/reminders/${id}`, payload);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteReminder(id: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const data = await apiDelete(`/api/v1/reminders/${id}`);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
