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
