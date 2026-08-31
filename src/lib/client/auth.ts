import { apiGet } from './api';

/**
 * Auth endpoints.
 * Provides safe session fetching and auth actions.
 */

interface AuthEnvelope {
  success?: boolean;
  authenticated?: boolean;
  error?: string;
  message?: string;
  user?: unknown;
  resetUrl?: string;
  [key: string]: unknown;
}

async function post(path: string, body?: unknown): Promise<AuthEnvelope> {
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return res.json();
}

export function login(payload: Record<string, unknown>) {
  return post('/api/v1/auth/login', payload);
}

export async function logout(): Promise<void> {
  try {
    await post('/api/v1/auth/logout');
  } catch {
    // Network errors during logout are non-blocking
  }
}

export async function fetchSession(): Promise<unknown | null> {
  try {
    const res = await apiGet<AuthEnvelope>('/api/v1/auth/session');
    if (res?.user) return res.user;
    if (res?.authenticated && res.user) return res.user;
    return null;
  } catch {
    return null;
  }
}

export function forgotPassword(email: string) {
  return post('/api/v1/auth/forgot-password', { email });
}

export function resetPassword(token: string, newPassword: string) {
  return post('/api/v1/auth/reset-password', { token, newPassword });
}

export function setPassword(token: string, newPassword: string) {
  return post('/api/v1/auth/set-password', { token, newPassword });
}
