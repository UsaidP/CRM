import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { GET as getLeadsHandler, POST as createLeadHandler } from '@/app/api/v1/leads/route';
import { ensureTestOrganization, cleanupTestEntities } from '../helpers/test-db';
import { createTestSessionCookie, testCleanup, TEST_ORG_ID, TEST_ORG_B_ID } from '../helpers/test-setup';

describe('API Integration: Multi-Tenant Data Isolation', () => {
  let orgACookie: string;
  let orgBCookie: string;
  let orgALeadId: string;

  beforeAll(async () => {
    await ensureTestOrganization();
    orgACookie = await createTestSessionCookie('agent'); // Org A
    orgBCookie = await createTestSessionCookie('foreignOrgAgent'); // Org B

    // Create a lead in Org A
    const req = new Request('http://localhost:3000/api/v1/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: orgACookie,
      },
      body: JSON.stringify({
        fullName: 'Tenant A Exclusive Lead',
        phone: '+919967731071',
        leadSource: 'whatsapp_group',
      }),
    });

    const res = await createLeadHandler(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    orgALeadId = body.data.id;
    testCleanup.register('lead', orgALeadId);
  }, 30000);

  afterAll(async () => {
    await cleanupTestEntities();
  }, 30000);

  it('Org B user CANNOT see Org A leads in listing', async () => {
    const req = new Request('http://localhost:3000/api/v1/leads', {
      headers: { cookie: orgBCookie },
    });

    const res = await getLeadsHandler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    
    // The list of leads returned for Org B must not contain Org A's lead
    const foundOrgALead = body.data.some((l: any) => l.id === orgALeadId);
    expect(foundOrgALead).toBe(false);
  });
});
