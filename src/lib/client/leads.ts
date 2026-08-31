import { apiGet, apiPost, apiPatch, apiDelete } from './api';

/**
 * Client-side data access for leads. The endpoint paths live here and
 * nowhere else — components import these functions instead of calling
 * fetch('/api/...') by hand.
 */

export interface LeadFilters {
  leadSource?: string;
  sourceConfidence?: string;
  brokerId?: string;
  currentStage?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateLeadPayload {
  fullName?: string;
  phone?: string;
  email?: string;
  leadSource?: string;
  sourceCode?: string;
  contactedBrokerNumber?: string;
  assignedBrokerId?: string | null;
  campaignId?: string | null;
  notes?: string;
  currentStage?: string;
}

function toQuery(filters: LeadFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== null) {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const leadsApi = {
  list: (filters: LeadFilters = {}) => apiGet(`/api/v1/leads${toQuery(filters)}`),
  get: (id: string) => apiGet(`/api/v1/leads/${id}`),
  create: (payload: CreateLeadPayload) => apiPost('/api/v1/leads', payload),
  update: (id: string, payload: Record<string, unknown>) => apiPatch(`/api/v1/leads/${id}`, payload),
  remove: (id: string) => apiDelete(`/api/v1/leads/${id}`),
  bulkUpdate: (payload: Record<string, unknown>) => apiPost('/api/v1/leads/bulk-update', payload),
};
