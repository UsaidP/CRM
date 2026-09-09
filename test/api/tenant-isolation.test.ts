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
  }, 60000);

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
  }, 30000);

  it('Org B user CANNOT read Org A lead by ID (returns 404)', async () => {
    const { GET: getLeadByIdHandler } = await import('@/app/api/v1/leads/[id]/route');
    const req = new Request(`http://localhost:3000/api/v1/leads/${orgALeadId}`, {
      headers: { cookie: orgBCookie },
    });

    const res = await getLeadByIdHandler(req, { params: Promise.resolve({ id: orgALeadId }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Lead not found');
  }, 30000);

  it('Org B user CANNOT mutate Org A lead by ID (returns 404)', async () => {
    const { PATCH: patchLeadByIdHandler } = await import('@/app/api/v1/leads/[id]/route');
    const req = new Request(`http://localhost:3000/api/v1/leads/${orgALeadId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        cookie: orgBCookie,
      },
      body: JSON.stringify({ notes: 'Illegal cross-tenant mutation attempt' }),
    });

    const res = await patchLeadByIdHandler(req, { params: Promise.resolve({ id: orgALeadId }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  }, 30000);

  it('Org B user CANNOT view Org A deal financials in deals summary', async () => {
    const { GET: getDealsHandler } = await import('@/app/api/v1/deals/route');
    const req = new Request('http://localhost:3000/api/v1/deals', {
      headers: { cookie: orgBCookie },
    });

    const res = await getDealsHandler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary.totalGrossBrokerage).toBe(0);
    expect(body.summary.totalCollected).toBe(0);
    expect(body.summary.totalPending).toBe(0);
  }, 30000);

  it('Telecaller role CANNOT create a deal (returns 403 Forbidden)', async () => {
    const { POST: createDealHandler } = await import('@/app/api/v1/deals/route');
    const telecallerCookie = await createTestSessionCookie('telecaller');
    const req = new Request('http://localhost:3000/api/v1/deals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: telecallerCookie,
      },
      body: JSON.stringify({
        leadId: orgALeadId,
        propertyUnitId: 'dummy-unit-id',
        agreementValue: 10000000,
        brokeragePercent: 2,
      }),
    });

    const res = await createDealHandler(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('deals:create');
  }, 30000);
});
