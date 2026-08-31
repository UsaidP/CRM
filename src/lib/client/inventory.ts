import { apiGet, apiPost, apiPut, apiDelete } from './api';

/**
 * Inventory units/projects + brochure extraction.
 * Consistent response envelopes for UI consumption.
 */

export async function listUnits(): Promise<{ success: boolean; data: any[]; error?: string }> {
  try {
    const data = await apiGet<any[]>('/api/v1/inventory/units');
    return { success: true, data: Array.isArray(data) ? data : (data as any)?.data || [] };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}

export async function listProjects(): Promise<{ success: boolean; data: any[]; error?: string }> {
  try {
    const data = await apiGet<any[]>('/api/v1/inventory/projects');
    return { success: true, data: Array.isArray(data) ? data : (data as any)?.data || [] };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}

export async function createProject(payload: Record<string, unknown>): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const data = await apiPost('/api/v1/inventory/projects', payload);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function verifyUnit(id: string, payload: Record<string, unknown>): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const data = await apiPost(`/api/v1/inventory/units/${id}/verify`, payload);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createUnit(payload: Record<string, unknown>): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const data = await apiPost('/api/v1/inventory/units', payload);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateUnit(id: string, payload: Record<string, unknown>): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const data = await apiPut(`/api/v1/inventory/units/${id}`, payload);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteUnit(id: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const data = await apiDelete(`/api/v1/inventory/units/${id}`);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function parseBrochureText(text: string, filename: string) {
  return apiPost('/api/v1/inventory/upload-brochure', { text, filename: 'Developer_Brochure.pdf' });
}

export function lookupRera(reraNumber: string) {
  return apiPost('/api/v1/inventory/rera/verify', { reraInput: reraNumber });
}

export function calculateAllInCost(payload: Record<string, unknown>) {
  return apiPost('/api/v1/inventory/calculator', payload);
}
