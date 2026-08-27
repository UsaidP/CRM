import { CrmRole } from '@/types/crm';

export const SESSION_COOKIE_NAME = 'zamzam_session';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface SessionPayload {
  userId: string;
  email: string;
  fullName: string;
  role: CrmRole;
  organizationId: string;
  isSuperAdmin: boolean;
  iat?: number;
  exp?: number;
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Fail fast in production — a missing secret means sessions can be forged.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'JWT_SECRET environment variable is required in production. Generate one with: openssl rand -hex 32'
      );
    }
    console.warn(
      '[AUTH] JWT_SECRET not set — using insecure dev fallback. NEVER run in production like this.'
    );
    return new TextEncoder().encode('zamzam-crm-default-fallback-secret-key-32-chars-long');
  }
  return new TextEncoder().encode(secret);
}

// ==========================================
// 1. SECURE PASSWORD HASHING (PBKDF2 SHA-512)
// ==========================================

export async function hashPassword(password: string): Promise<string> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password) as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedKey = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-512',
    },
    keyMaterial,
    512
  );

  const hashHex = Array.from(new Uint8Array(derivedKey))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `pbkdf2:sha512:100000:${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || !storedHash.startsWith('pbkdf2:sha512:')) {
    return false;
  }

  const parts = storedHash.split(':');
  if (parts.length !== 5) {
    return false;
  }

  const iterations = parseInt(parts[2], 10);
  const saltHex = parts[3];
  const expectedHashHex = parts[4];

  const saltBytes = new Uint8Array(
    saltHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );

  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password) as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedKey = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as BufferSource,
      iterations,
      hash: 'SHA-512',
    },
    keyMaterial,
    512
  );

  const computedHashHex = Array.from(new Uint8Array(derivedKey))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return computedHashHex === expectedHashHex;
}

// ==========================================
// 2. EDGE-COMPATIBLE SIGNED SESSION TOKENS
// ==========================================

function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

export async function createSessionToken(payload: Omit<SessionPayload, 'iat' | 'exp'>): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    getJwtSecret() as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(dataToSign) as BufferSource
  );

  const signatureBytes = Array.from(new Uint8Array(signature))
    .map((b) => String.fromCharCode(b))
    .join('');
  const encodedSignature = base64UrlEncode(signatureBytes);

  return `${dataToSign}.${encodedSignature}`;
}

export async function verifySessionToken(token?: string | null): Promise<SessionPayload | null> {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  try {
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      getJwtSecret() as BufferSource,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const rawSignatureStr = base64UrlDecode(encodedSignature);
    const signatureBytes = new Uint8Array(
      rawSignatureStr.split('').map((c) => c.charCodeAt(0))
    );

    const isValid = await globalThis.crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes as BufferSource,
      new TextEncoder().encode(dataToSign) as BufferSource
    );

    if (!isValid) return null;

    const payload: SessionPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

// ==========================================
// 3. SUPER ADMIN MASTER KEY CHECK (timing-safe)
// ==========================================

/**
 * Compares two secrets without leaking length or content via timing.
 */
function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Validates a Super Admin master key.
 *
 * The key must be configured via the SUPER_ADMIN_KEY env variable and be a
 * hex string of at least 64 characters (32 bytes of entropy). Generate one:
 *   openssl rand -hex 32
 */
export function verifySuperAdminKey(providedKey: string): boolean {
  // Strip optional surrounding quotes (common in .env files) and whitespace.
  const clean = (v: string) => v.trim().replace(/^["']|["']$/g, '');
  const expectedKey = process.env.SUPER_ADMIN_KEY;
  if (!expectedKey || !providedKey) return false;

  // Enforce strong hex keys — reject weak/misconfigured values outright.
  const isStrongHexKey = /^[0-9a-fA-F]{64,}$/.test(clean(expectedKey));
  if (!isStrongHexKey) {
    console.error(
      '[AUTH] SUPER_ADMIN_KEY is missing or too weak. It must be at least 64 hex chars. Generate: openssl rand -hex 32'
    );
    return false;
  }

  return timingSafeStringEqual(clean(providedKey), clean(expectedKey));
}

// ==========================================
// 4. SECURE RANDOM TOKEN GENERATOR
// ==========================================

export function generateSecureToken(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
