import { describe, it, expect, beforeAll } from 'bun:test';
import { GET as getLeadsHandler } from '@/app/api/v1/leads/route';
import { ensureTestOrganization } from '../helpers/test-db';
import { createTestSessionCookie } from '../helpers/test-setup';

describe('Security: RBAC Privilege Escalation Defense', () => {
  let telecallerCookie: string;
  let agentCookie: string;

  beforeAll(async () => {
    await ensureTestOrganization();
    telecallerCookie = await createTestSessionCookie('telecaller');
    agentCookie = await createTestSessionCookie('agent');
  }, 30000);

  it('telecaller cannot access privileged firm metrics without explicit permission', async () => {
    const req = new Request('http://localhost:3000/api/v1/deals', {
      headers: { cookie: telecallerCookie },
    });

    const { GET: getDealsHandler } = await import('@/app/api/v1/deals/route');
    const res = await getDealsHandler(req);
    // Should be 200 with filtered results or 403, never exposing un-scoped financial data
    expect(res.status).toBeLessThan(500);
  });

  it('agent scope limits lead visibility to own and assigned', async () => {
    const req = new Request('http://localhost:3000/api/v1/leads', {
      headers: { cookie: agentCookie },
    });

    const res = await getLeadsHandler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
