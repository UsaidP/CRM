import { apiGet, apiPost } from './api';

/** Campaign attribution management. */

export async function listCampaigns(): Promise<unknown[]> {
  try {
    const res = await apiGet<unknown[]>('/api/v1/attribution/campaigns');
    return Array.isArray(res) ? res : (res as any)?.data ?? [];
  } catch {
    return [];
  }
}

export async function createCampaign(payload: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const data = await apiPost('/api/v1/attribution/campaigns', payload);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
