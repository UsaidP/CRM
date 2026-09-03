import { describe, it, expect, mock, beforeAll } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fromAny } from '@total-typescript/shoehorn';

/**
 * Regression tests for the auth bypass in GET /api/v1/auth/session.
 *
 * The old "self-healing fallback" minted a valid admin session cookie for
 * ANY anonymous visitor: no/garbage cookie → payload null → fallback picked
 * the first active (ADMIN) user → returned authenticated:true + Set-Cookie.
 *
 * Policy under test (per docs/adr/0001): sessions are ONLY minted by the
 * login routes. /auth/session must never Set-Cookie unless the incoming
 * request carried a valid, resolvable session.
 */

// Mutable cookie store the mocked next/headers reads from.
let cookieJar: Record<string, string> = {};

mock.module('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieJar ? { name, value: cookieJar[name] } : undefined,
  }),
}));

const ROUTE_SRC = readFileSync(
  join(process.cwd(), 'src', 'app', 'api', 'v1', 'auth', 'session', 'route.ts'),
  'utf8'
);

async function callGet(): Promise<Response> {
  const { GET } = await import('../src/app/api/v1/auth/session/route');
  const res = await GET();
  return fromAny(res);
}

describe('GET /api/v1/auth/session must never mint sessions for unauthenticated callers', () => {
  beforeAll(() => {
    cookieJar = {};
  });

  it('rejects an anonymous request (no cookie) with 401 and no Set-Cookie', async () => {
    cookieJar = {};
    const res = await callGet();
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
    const body = await res.json();
    expect(body.authenticated).toBe(false);
    expect(body.user).toBeNull();
  });

  it('rejects a garbage/tampered cookie with 401 and no Set-Cookie', async () => {
    cookieJar = { zamzam_session: 'aaa.bbb.ccc' };
    const res = await callGet();
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('rejects a valid token pointing at a deleted user with 401 and no Set-Cookie', async () => {
    const { createSessionToken } = await import(
      '../src/lib/services/auth-service'
    );
    const token = await createSessionToken({
      userId: 'nonexistent-user-id-after-reseed',
      email: 'ghost@example.com',
      fullName: 'Ghost',
      role: 'ADMIN',
      organizationId: 'nonexistent-org',
      isSuperAdmin: false,
    });
    cookieJar = { zamzam_session: token };
    const res = await callGet();
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('accepts a valid token for a live user without rewriting the cookie', async () => {
    const { createSessionToken } = await import(
      '../src/lib/services/auth-service'
    );
    const { prisma } = await import('../src/lib/db/prisma');
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('  (no users in db — skipping live-user test)');
      return;
    }
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as any,
      organizationId: user.organizationId,
      isSuperAdmin: user.role === 'SUPER_ADMIN',
    });
    cookieJar = { zamzam_session: token };
    const res = await callGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.authenticated).toBe(true);
    expect(body.user.id).toBe(user.id);
  });

  it('source invariant: the session route never uses findFirst fallbacks', () => {
    expect(ROUTE_SRC.includes('findFirst')).toBe(false);
  });

  it('source invariant: ADMIN role is not treated as super admin', () => {
    expect(ROUTE_SRC).not.toMatch(/role\s*===\s*'ADMIN'/);
  });
});
