/**
 * Thin HTTP client for the CRM's own /api/v1 endpoints.
 *
 * Handles: same-origin credentials, the `{ success, data, error }` envelope,
 * error propagation. Domain modules (./leads.ts, ./inventory.ts, …) build on
 * this so components never call fetch() directly.
 */

import { toUserMessage } from './user-feedback';

export class ApiError extends Error {
  public readonly userMessage: { title: string; description: string };

  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.userMessage = toUserMessage(message);
  }
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: 'same-origin' });
  return handleResponse<T>(res);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(path, { method: 'DELETE', credentials: 'same-origin' });
  return handleResponse<T>(res);
}

async function handleResponse<T>(res: Response): Promise<T> {
  let payload: Envelope<T> | null = null;
  try {
    payload = (await res.json()) as Envelope<T>;
  } catch {
    // non-JSON body
  }

  if (!res.ok || payload?.success === false) {
    const errorString =
      payload?.error ||
      (res.status === 404
        ? 'The requested record or endpoint could not be found.'
        : res.status === 401 || res.status === 403
        ? 'You do not have authorization to view or edit this resource.'
        : res.status >= 500
        ? 'The server encountered a temporary issue. Please try again.'
        : `Request could not be processed (Status ${res.status})`);

    throw new ApiError(errorString, res.status, payload);
  }

  return (payload?.data !== undefined ? payload.data : (payload as unknown)) as T;
}
