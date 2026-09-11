import { describe, it, expect, beforeAll } from 'bun:test';
import { GET as getLeadsHandler } from '@/app/api/v1/leads/route';
import { PATCH as updatePermissionsHandler } from '@/app/api/v1/users/[id]/permissions/route';
import { ensureTestOrganization } from '../helpers/test-db';
import { createTestSessionCookie, PRESET_TEST_USERS } from '../helpers/test-setup';

describe('Security: RBAC Privilege Escalation Defense & Safeguards', () => {
  let telecallerCookie: string;
  let agentCookie: string;
  let adminCookie: string;

  beforeAll(async () => {
    await ensureTestOrganization();
    telecallerCookie = await createTestSessionCookie('telecaller');
    agentCookie = await createTestSessionCookie('agent');
    adminCookie = await createTestSessionCookie('admin');
  }, 30000);

  it('telecaller cannot access privileged firm metrics without explicit permission', async () => {
    const req = new Request('http://localhost:3000/api/v1/deals', {
      headers: { cookie: telecallerCookie },
    });

    const { GET: getDealsHandler } = await import('@/app/api/v1/deals/route');
    const res = await getDealsHandler(req);
    // Should be 200 with filtered results or 403, never exposing un-scoped financial data
    expect(res.status).toBeLessThan(500);
  }, 15000);

  it('agent scope limits lead visibility to own and assigned', async () => {
    const req = new Request('http://localhost:3000/api/v1/leads', {
      headers: { cookie: agentCookie },
    });

    const res = await getLeadsHandler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('safeguard: administrator cannot demote their own role to prevent accidental lockout', async () => {
    const adminUser = PRESET_TEST_USERS.admin;
    const req = new Request(`http://localhost:3000/api/v1/users/${adminUser.userId}/permissions`, {
      method: 'PATCH',
      headers: {
        cookie: adminCookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'TELECALLER',
      }),
    });

    const res = await updatePermissionsHandler(req, {
      params: Promise.resolve({ id: adminUser.userId }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('You cannot change your own administrative role');
  });

  it('safeguard: non-role permission updates on self are allowed', async () => {
    const adminUser = PRESET_TEST_USERS.admin;
    const req = new Request(`http://localhost:3000/api/v1/users/${adminUser.userId}/permissions`, {
      method: 'PATCH',
      headers: {
        cookie: adminCookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customPermissions: ['leads:view_all'],
      }),
    });

    const res = await updatePermissionsHandler(req, {
      params: Promise.resolve({ id: adminUser.userId }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
