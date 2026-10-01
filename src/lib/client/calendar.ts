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

/**
 * Minimal shape of a reminder row as returned by GET /api/v1/reminders.
 *
 * Field names mirror prisma/schema.prisma exactly — `Lead.fullName`/`phoneE164`
 * are denormalised onto the lead, while a contact's name lives on
 * `Contact.primaryName` and its phone on a `PHONE_E164` ContactIdentity row.
 * Do not invent fields here: a wrong name type-checks fine and then silently
 * resolves to undefined at runtime.
 */
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
    contact?: {
      primaryName?: string | null;
      companyName?: string | null;
      identities?: { identityType: string; identityValue: string; isPrimary?: boolean }[] | null;
    } | null;
  } | null;
}

/**
 * Resolve the best display name for a reminder row.
 * Lead-level name wins; contact name is the fallback; company is last resort.
 */
export function resolveReminderLeadName(reminder: ReminderListItem): string {
  const lead = reminder.lead;
  return (
    lead?.fullName?.trim() ||
    lead?.contact?.primaryName?.trim() ||
    lead?.contact?.companyName?.trim() ||
    'Lead'
  );
}

/**
 * Resolve the best callable number for a reminder row.
 * Prefers the lead's denormalised phone, then the contact's PHONE_E164 identity.
 */
export function resolveReminderPhone(reminder: ReminderListItem): string | null {
  const lead = reminder.lead;
  if (lead?.phoneE164?.trim()) return lead.phoneE164.trim();

  const identities = lead?.contact?.identities || [];
  const phoneIdentity =
    identities.find((i) => i.identityType === 'PHONE_E164' && i.isPrimary) ||
    identities.find((i) => i.identityType === 'PHONE_E164');

  return phoneIdentity?.identityValue?.trim() || null;
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
