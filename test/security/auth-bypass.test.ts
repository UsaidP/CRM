import { describe, it, expect, beforeAll } from 'bun:test';
import { GET as getLeadsHandler } from '@/app/api/v1/leads/route';
import { GET as getProjectsHandler } from '@/app/api/v1/inventory/projects/route';
import { ensureTestOrganization } from '../helpers/test-db';
import { createTestSessionToken, PRESET_TEST_USERS, TEST_ORG_ID } from '../helpers/test-setup';
import { SESSION_COOKIE_NAME } from '@/lib/services/auth-service';

describe('Security: Authentication & Token Bypass Resistance', () => {
  beforeAll(async () => {
    await ensureTestOrganization();
  }, 30000);

  it('rejects tampered JWT signature with 401', async () => {
    const validToken = await createTestSessionToken('admin');
    const parts = validToken.split('.');
    
    // Tamper with payload (second segment)
    const tamperedPayload = btoa(JSON.stringify({
      userId: PRESET_TEST_USERS.superAdmin.userId,
      email: PRESET_TEST_USERS.superAdmin.email,
      fullName: 'Forged Super Admin',
      role: 'SUPER_ADMIN',
      organizationId: TEST_ORG_ID,
      isSuperAdmin: true,
    })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const forgedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const req = new Request('http://localhost:3000/api/v1/leads', {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${forgedToken}` },
    });

    const res = await getLeadsHandler(req);
    expect(res.status).toBe(401);
  });

  it('rejects expired session token with 401', async () => {
    // Expired token with timestamp in the past
    const expiredPayload = {
      userId: PRESET_TEST_USERS.admin.userId,
      email: PRESET_TEST_USERS.admin.email,
      fullName: PRESET_TEST_USERS.admin.fullName,
      role: 'ADMIN' as const,
      organizationId: TEST_ORG_ID,
      isSuperAdmin: false,
      iat: Math.floor(Date.now() / 1000) - 100000,
      exp: Math.floor(Date.now() / 1000) - 50000, // expired 50k seconds ago
    };

    const headerB64 = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const payloadB64 = btoa(JSON.stringify(expiredPayload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    // Sign with arbitrary string
    const expiredToken = `${headerB64}.${payloadB64}.fakesignature`;

    const req = new Request('http://localhost:3000/api/v1/inventory/projects', {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${expiredToken}` },
    });

    const res = await getProjectsHandler(req);
    expect(res.status).toBe(401);
  });

  it('rejects malformed / non-JWT cookie strings with 401', async () => {
    const garbageCookies = [
      'null',
      'undefined',
      'Bearer abc',
      '../../etc/passwd',
      '123456',
      '',
    ];

    for (const cookie of garbageCookies) {
      const req = new Request('http://localhost:3000/api/v1/leads', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${cookie}` },
      });
      const res = await getLeadsHandler(req);
      expect(res.status).toBe(401);
    }
  });
});
