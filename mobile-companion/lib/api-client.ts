import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const KEYS = {
  SERVER_URL: 'lucky_server_url',
  AUTH_TOKEN: 'lucky_auth_token',
  BROKER_PHONE: 'lucky_broker_phone',
  USER_NAME: 'lucky_user_name',
} as const;

/**
 * Resolve the appropriate backend server URL for the current environment:
 * - Web: http://localhost:3000
 * - Physical Phone via Expo: extracts the Metro host LAN IP (e.g. http://10.189.221.87:3000)
 * - Fallback: http://10.189.221.87:3000
 */
export function getDefaultServerUrl(): string {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  }

  // 1. Try to extract the Metro dev host IP from Expo Constants
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).expoGoConfig?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:3000`;
    }
  }

  // 2. Default to current Wi-Fi LAN IP
  return 'http://10.189.221.87:3000';
}

/**
 * Normalizes any server URL format:
 * - Prepends http:// if scheme is missing (e.g. 10.189.221.87:3000 -> http://10.189.221.87:3000)
 * - Removes trailing slashes
 */
export function normalizeServerUrl(url: string): string {
  let cleaned = (url || '').trim();
  if (!cleaned) return '';
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `http://${cleaned}`;
  }
  return cleaned.replace(/\/+$/, '');
}

/** Diagnostic result returned by testConnection() */
export interface ConnectionDiagnostic {
  ok: boolean;
  serverReachable: boolean;
  authenticated: boolean;
  statusCode?: number;
  message: string;
  serverUrl: string;
}

async function safeGetItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return typeof window !== 'undefined' && window.localStorage
        ? window.localStorage.getItem(key)
        : null;
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    console.warn(`[Storage] Failed to read ${key}:`, err);
    return null;
  }
}

async function safeSetItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {}
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (err) {
    console.warn(`[Storage] Failed to write ${key}:`, err);
  }
}

async function safeDeleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (err) {
    console.warn(`[Storage] Failed to delete ${key}:`, err);
  }
}

/** CallEvent payload from the native module */
export interface CallEventPayload {
  callerNumber: string;
  callerName?: string;
  contactedBrokerNumber: string;
  direction: 'INCOMING' | 'OUTGOING' | 'MISSED';
  durationSeconds: number;
  callRecordingUrl?: string;
  clientCallId: string;
  notes?: string;
  callOutcome?: string;
}

/** Upload ticket from the CRM API */
interface UploadTicket {
  success: boolean;
  provider: string;
  uploadUrl: string;
  fields?: Record<string, string>;
}

/**
 * CRM API Client — TypeScript equivalent of the Kotlin CrmApiClient.
 * Handles auth token, upload tickets, audio file uploads, and call event dispatch.
 */
class CrmApiClient {
  private serverUrl: string = '';
  private authToken: string = '';

  private brokerPhone: string = '';
  private userName: string = '';

  async init(): Promise<{ serverUrl: string; authToken: string; brokerPhone: string; userName: string }> {
    let savedUrl = (await safeGetItem(KEYS.SERVER_URL)) || '';
    if (!savedUrl || savedUrl.includes('10.0.2.2')) {
      savedUrl = getDefaultServerUrl();
    }
    this.serverUrl = normalizeServerUrl(savedUrl);
    this.authToken = (await safeGetItem(KEYS.AUTH_TOKEN)) || '';
    this.brokerPhone = (await safeGetItem(KEYS.BROKER_PHONE)) || '';
    this.userName = (await safeGetItem(KEYS.USER_NAME)) || '';
    return {
      serverUrl: this.serverUrl,
      authToken: this.authToken,
      brokerPhone: this.brokerPhone,
      userName: this.userName,
    };
  }

  async setCredentials(serverUrl: string, authToken: string, brokerPhone?: string, userName?: string): Promise<void> {
    this.serverUrl = normalizeServerUrl(serverUrl);
    this.authToken = authToken;
    if (brokerPhone) this.brokerPhone = brokerPhone;
    if (userName) this.userName = userName;

    await safeSetItem(KEYS.SERVER_URL, this.serverUrl);
    await safeSetItem(KEYS.AUTH_TOKEN, this.authToken);
    if (brokerPhone) await safeSetItem(KEYS.BROKER_PHONE, brokerPhone);
    if (userName) await safeSetItem(KEYS.USER_NAME, userName);
  }

  async clearCredentials(): Promise<void> {
    this.serverUrl = '';
    this.authToken = '';
    this.brokerPhone = '';
    this.userName = '';
    await safeDeleteItem(KEYS.SERVER_URL);
    await safeDeleteItem(KEYS.AUTH_TOKEN);
    await safeDeleteItem(KEYS.BROKER_PHONE);
    await safeDeleteItem(KEYS.USER_NAME);
  }

  getServerUrl(): string {
    return this.serverUrl;
  }

  getAuthToken(): string {
    return this.authToken;
  }

  getBrokerPhone(): string {
    return this.brokerPhone;
  }

  getUserName(): string {
    return this.userName;
  }

  isConfigured(): boolean {
    return this.serverUrl.length > 0 && this.authToken.length > 0;
  }

  private headers(): HeadersInit {
    const h: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.authToken) {
      h['Authorization'] = `Bearer ${this.authToken}`;
    }
    return h;
  }

  /**
   * Diagnostic connectivity test:
   * 1. Public /api/v1/health probe (verifies Wi-Fi / LAN connection)
   * 2. Authenticated /api/v1/calls/upload-url probe (verifies login token)
   */
  async testConnection(targetUrlOverride?: string): Promise<ConnectionDiagnostic> {
    const rawTarget = targetUrlOverride || this.serverUrl || getDefaultServerUrl();
    const targetUrl = normalizeServerUrl(rawTarget);

    if (!targetUrl) {
      return {
        ok: false,
        serverReachable: false,
        authenticated: false,
        message: 'No server URL configured.',
        serverUrl: '',
      };
    }

    // Step 1: Health check probe with 6-second timeout
    let healthOk = false;
    let healthError: string | null = null;
    let healthStatus = 0;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${targetUrl}/api/v1/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timer);
      healthStatus = res.status;
      if (res.ok) {
        healthOk = true;
      } else {
        healthError = `Server returned HTTP ${res.status}`;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        healthError = 'Connection timed out after 6 seconds. Host is unreachable.';
      } else {
        healthError = err?.message || 'Network request failed';
      }
    }

    if (!healthOk) {
      return {
        ok: false,
        serverReachable: false,
        authenticated: false,
        statusCode: healthStatus || undefined,
        message: `Cannot reach Lucky CRM at ${targetUrl}: ${healthError}. Ensure your mobile device and computer are on the same Wi-Fi network.`,
        serverUrl: targetUrl,
      };
    }

    // Step 2: Health probe succeeded! Check login authentication if token exists
    if (!this.authToken) {
      return {
        ok: true,
        serverReachable: true,
        authenticated: false,
        statusCode: 200,
        message: `Connected to Lucky CRM at ${targetUrl} (Server Online). Device is not currently signed in.`,
        serverUrl: targetUrl,
      };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const authRes = await fetch(`${targetUrl}/api/v1/calls/upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.authToken}`,
        },
        body: '{}',
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (authRes.ok) {
        return {
          ok: true,
          serverReachable: true,
          authenticated: true,
          statusCode: authRes.status,
          message: `Connected & Authenticated! Server is online and ready for automatic call sync.`,
          serverUrl: targetUrl,
        };
      }

      if (authRes.status === 401 || authRes.status === 403) {
        return {
          ok: false,
          serverReachable: true,
          authenticated: false,
          statusCode: authRes.status,
          message: `Server reachable at ${targetUrl}, but login token was rejected (HTTP ${authRes.status}). Please sign out and sign in again with OTP.`,
          serverUrl: targetUrl,
        };
      }

      return {
        ok: false,
        serverReachable: true,
        authenticated: false,
        statusCode: authRes.status,
        message: `Server online at ${targetUrl}, but upload validation returned HTTP ${authRes.status}.`,
        serverUrl: targetUrl,
      };
    } catch (err: any) {
      return {
        ok: false,
        serverReachable: true,
        authenticated: false,
        message: `Server health OK, but auth probe failed: ${err?.message || 'Error'}`,
        serverUrl: targetUrl,
      };
    }
  }

  getBaseUrl(): string {
    return normalizeServerUrl(this.serverUrl || getDefaultServerUrl());
  }

  /** Request an upload ticket (pre-signed URL or Cloudinary params) */
  async requestUploadTicket(): Promise<UploadTicket | null> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/v1/calls/upload-url`, {
        method: 'POST',
        headers: this.headers(),
        body: '{}',
      });
      if (!res.ok) return null;
      return (await res.json()) as UploadTicket;
    } catch {
      return null;
    }
  }

  /** Upload audio file using the upload ticket */
  async uploadAudioFile(
    ticket: UploadTicket,
    filePath: string,
    fileName: string
  ): Promise<string | null> {
    try {
      const targetUrl = ticket.uploadUrl.startsWith('http')
        ? ticket.uploadUrl
        : `${this.getBaseUrl()}${ticket.uploadUrl}`;

      const formData = new FormData();

      // Add ticket fields (Cloudinary signature params)
      if (ticket.fields) {
        Object.entries(ticket.fields).forEach(([k, v]) => {
          formData.append(k, v);
        });
      }

      // Add the audio file
      formData.append('file', {
        uri: filePath.startsWith('file://') ? filePath : `file://${filePath}`,
        name: fileName,
        type: 'audio/*',
      } as any);

      const headers: HeadersInit = {};
      if (this.authToken && !targetUrl.includes('cloudinary')) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const res = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await res.json();
      return data.secure_url || data.url || null;
    } catch {
      return null;
    }
  }

  /** Send call event to CRM */
  async sendCallEvent(payload: CallEventPayload): Promise<boolean> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/v1/mobile/call-events`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** OTP login: send OTP to phone number */
  async sendOtp(phone: string): Promise<{ success: boolean; error?: string; message?: string; cooldownSeconds?: number }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/v1/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      return await res.json();
    } catch {
      return { success: false, error: 'Network error connecting to server' };
    }
  }

  /** OTP login: verify OTP and get JWT token */
  async verifyOtp(
    phone: string,
    otp: string
  ): Promise<{ success: boolean; token?: string; user?: any; error?: string }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/v1/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, returnToken: true }),
      });
      return await res.json();
    } catch {
      return { success: false, error: 'Network error connecting to server' };
    }
  }
}

export const apiClient = new CrmApiClient();
