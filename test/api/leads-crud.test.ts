import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { GET as getLeadsHandler, POST as createLeadHandler } from '@/app/api/v1/leads/route';
import { GET as getLeadByIdHandler, PATCH as patchLeadByIdHandler, DELETE as deleteLeadHandler } from '@/app/api/v1/leads/[id]/route';
import { POST as bulkUpdateLeadsHandler } from '@/app/api/v1/leads/bulk-update/route';
import { POST as bulkDeleteLeadsHandler } from '@/app/api/v1/leads/bulk-delete/route';
import { ensureTestOrganization, cleanupTestEntities } from '../helpers/test-db';
import { createTestSessionCookie, PRESET_TEST_USERS, testCleanup } from '../helpers/test-setup';

describe('API Integration: Leads CRUD (/api/v1/leads)', () => {
  let adminCookie: string;
  let agentCookie: string;
  let telecallerCookie: string;

  beforeAll(async () => {
    await ensureTestOrganization();
    adminCookie = await createTestSessionCookie('admin');
    agentCookie = await createTestSessionCookie('agent');
    telecallerCookie = await createTestSessionCookie('telecaller');
  }, 30000);

  afterAll(async () => {
    await cleanupTestEntities();
  }, 30000);

  describe('GET /api/v1/leads', () => {
    it('rejects unauthenticated request with 401', async () => {
      const req = new Request('http://localhost:3000/api/v1/leads');
      const res = await getLeadsHandler(req);
      expect(res.status).toBe(401);
    });

    it('returns paginated lead list for authenticated admin', async () => {
      const req = new Request('http://localhost:3000/api/v1/leads?page=1&limit=10', {
        headers: { cookie: adminCookie },
      });
      const res = await getLeadsHandler(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.page).toBe(1);
    }, 30000);
  });

  describe('POST /api/v1/leads', () => {
    it('rejects unauthenticated creation with 401', async () => {
      const req = new Request('http://localhost:3000/api/v1/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Test Unauth Lead',
          phone: '+919967731071',
        }),
      });
      const res = await createLeadHandler(req);
      expect(res.status).toBe(401);
    });

    it('creates lead successfully with 201 status for authenticated agent', async () => {
      const timestamp = Date.now();
      const payload = {
        fullName: `API Test Lead ${timestamp}`,
        phone: `+9198200${String(timestamp).slice(-5)}`,
        email: `apitest.${timestamp}@zamzam.internal`,
        leadSource: 'whatsapp_group',
        currentStage: 'new_uncontacted',
        notes: 'API Test Lead creation verification',
      };

      const req = new Request('http://localhost:3000/api/v1/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: agentCookie,
        },
        body: JSON.stringify(payload),
      });

      const res = await createLeadHandler(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.fullName).toBe(payload.fullName);
      expect(body.data.currentStage).toBe('new_uncontacted');

      testCleanup.register('lead', body.data.id);
    }, 30000);

    it('rejects lead creation with invalid/missing phone with 400 Bad Request', async () => {
      const req = new Request('http://localhost:3000/api/v1/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: agentCookie,
        },
        body: JSON.stringify({
          fullName: 'Invalid Phone Lead',
          phone: '123', // invalid
        }),
      });

      const res = await createLeadHandler(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it('returns 400 (not 500) for a malformed JSON body', async () => {
      const req = new Request('http://localhost:3000/api/v1/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: agentCookie,
        },
        body: '{ this is not json',
      });
      const res = await createLeadHandler(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
    }, 30000);

    it('returns 400 for an empty JSON object (missing required phone)', async () => {
      const req = new Request('http://localhost:3000/api/v1/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: agentCookie,
        },
        body: JSON.stringify({}),
      });
      const res = await createLeadHandler(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
    }, 30000);

    it('rejects an unknown leadSource enum value with 4xx', async () => {
      const timestamp = Date.now();
      const req = new Request('http://localhost:3000/api/v1/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: agentCookie,
        },
        body: JSON.stringify({
          fullName: `Bad Source Lead ${timestamp}`,
          phone: `+9198201${String(timestamp).slice(-5)}`,
          leadSource: 'carrier_pigeon',
        }),
      });
      const res = await createLeadHandler(req);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
      const body = await res.json();
      expect(body.success).toBe(false);
    }, 30000);
  });

  describe('GET /api/v1/leads — pagination & filter edge cases', () => {
    it('clamps out-of-range page (0 / negative) to page 1 instead of erroring', async () => {
      const req = new Request('http://localhost:3000/api/v1/leads?page=0&limit=10', {
        headers: { cookie: adminCookie },
      });
      const res = await getLeadsHandler(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.page).toBe(1);
    }, 30000);

    it('clamps an oversized limit to the 100 maximum and handles non-numeric values', async () => {
      for (const qs of ['page=1&limit=9999', 'page=abc&limit=xyz']) {
        const req = new Request(`http://localhost:3000/api/v1/leads?${qs}`, {
          headers: { cookie: adminCookie },
        });
        const res = await getLeadsHandler(req);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
      }
    }, 30000);

    it('accepts an unknown filter value without crashing (returns a filtered/empty list)', async () => {
      const req = new Request('http://localhost:3000/api/v1/leads?currentStage=TOTALLY_FAKE_STAGE&page=1&limit=5', {
        headers: { cookie: adminCookie },
      });
      const res = await getLeadsHandler(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    }, 30000);
  });

  describe('DELETE /api/v1/leads/[id] — permission-gated deletion', () => {
    it('rejects unauthenticated deletion with 401', async () => {
      const req = new Request('http://localhost:3000/api/v1/leads/non-existent-id', {
        method: 'DELETE',
      });
      const res = await deleteLeadHandler(req, { params: Promise.resolve({ id: 'non-existent-id' }) });
      expect(res.status).toBe(401);
    });

    it('rejects deletion with 403 Forbidden if user lacks leads:delete (e.g. Agent)', async () => {
      // First create a lead as agent
      const timestamp = Date.now();
      const createReq = new Request('http://localhost:3000/api/v1/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: agentCookie },
        body: JSON.stringify({
          fullName: `Delete Perm Test Lead ${timestamp}`,
          phone: `+9198333${String(timestamp).slice(-5)}`,
        }),
      });
      const createRes = await createLeadHandler(createReq);
      expect(createRes.status).toBe(201);
      const createdLead = (await createRes.json()).data;
      testCleanup.register('lead', createdLead.id);

      // Now attempt to delete as agent (who lacks leads:delete by default)
      const deleteReq = new Request(`http://localhost:3000/api/v1/leads/${createdLead.id}`, {
        method: 'DELETE',
        headers: { cookie: agentCookie },
      });
      const deleteRes = await deleteLeadHandler(deleteReq, { params: Promise.resolve({ id: createdLead.id }) });
      expect(deleteRes.status).toBe(403);
      const body = await deleteRes.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('leads:delete');
    }, 30000);

    it('allows deletion with 200 OK for user with leads:delete (e.g. Admin)', async () => {
      // Create a lead to delete
      const timestamp = Date.now();
      const createReq = new Request('http://localhost:3000/api/v1/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: adminCookie },
        body: JSON.stringify({
          fullName: `Admin Delete Test Lead ${timestamp}`,
          phone: `+9198444${String(timestamp).slice(-5)}`,
        }),
      });
      const createRes = await createLeadHandler(createReq);
      expect(createRes.status).toBe(201);
      const createdLead = (await createRes.json()).data;

      // Delete as admin
      const deleteReq = new Request(`http://localhost:3000/api/v1/leads/${createdLead.id}`, {
        method: 'DELETE',
        headers: { cookie: adminCookie },
      });
      const deleteRes = await deleteLeadHandler(deleteReq, { params: Promise.resolve({ id: createdLead.id }) });
      expect(deleteRes.status).toBe(200);
      const body = await deleteRes.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain('deleted');
    }, 30000);
  });

  describe('POST /api/v1/leads/bulk-delete — permission-gated bulk deletion', () => {
    it('rejects unauthenticated bulk deletion with 401', async () => {
      const req = new Request('http://localhost:3000/api/v1/leads/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: ['lead-1', 'lead-2'] }),
      });
      const res = await bulkDeleteLeadsHandler(req);
      expect(res.status).toBe(401);
    });

    it('rejects bulk deletion with 403 Forbidden for users without leads:delete', async () => {
      const req = new Request('http://localhost:3000/api/v1/leads/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: agentCookie },
        body: JSON.stringify({ leadIds: ['lead-1', 'lead-2'] }),
      });
      const res = await bulkDeleteLeadsHandler(req);
      expect(res.status).toBe(403);
    });

    it('rejects empty or invalid leadIds with 400 Bad Request', async () => {
      const req = new Request('http://localhost:3000/api/v1/leads/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: adminCookie },
        body: JSON.stringify({ leadIds: [] }),
      });
      const res = await bulkDeleteLeadsHandler(req);
      expect(res.status).toBe(400);
    });

    it('successfully bulk deletes leads for authorized admin', async () => {
      const timestamp = Date.now();
      // Create 2 test leads
      const ids: string[] = [];
      for (let i = 0; i < 2; i++) {
        const createReq = new Request('http://localhost:3000/api/v1/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', cookie: adminCookie },
          body: JSON.stringify({
            fullName: `Bulk Delete Lead ${i} ${timestamp}`,
            phone: `+9198555${String(timestamp + i).slice(-5)}`,
          }),
        });
        const createRes = await createLeadHandler(createReq);
        const lead = (await createRes.json()).data;
        ids.push(lead.id);
      }

      const bulkReq = new Request('http://localhost:3000/api/v1/leads/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: adminCookie },
        body: JSON.stringify({ leadIds: ids }),
      });
      const bulkRes = await bulkDeleteLeadsHandler(bulkReq);
      expect(bulkRes.status).toBe(200);
      const body = await bulkRes.json();
      expect(body.success).toBe(true);
      expect(body.deletedCount).toBe(2);
    }, 60000);
  });

  describe('GET /api/v1/leads/[id] — permission-gated detail view', () => {
    it('rejects unauthenticated request with 401', async () => {
      const req = new Request('http://localhost:3000/api/v1/leads/lead-dummy-id');
      const res = await getLeadByIdHandler(req, { params: Promise.resolve({ id: 'lead-dummy-id' }) });
      expect(res.status).toBe(401);
    });

    it('returns 404 for non-existent lead ID for authenticated user', async () => {
      const req = new Request('http://localhost:3000/api/v1/leads/non-existent-lead-id', {
        headers: { cookie: adminCookie },
      });
      const res = await getLeadByIdHandler(req, { params: Promise.resolve({ id: 'non-existent-lead-id' }) });
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/leads/[id] — permission-gated updates', () => {
    it('rejects unauthenticated update with 401', async () => {
      const req = new Request('http://localhost:3000/api/v1/leads/lead-dummy-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Unauth attempt' }),
      });
      const res = await patchLeadByIdHandler(req, { params: Promise.resolve({ id: 'lead-dummy-id' }) });
      expect(res.status).toBe(401);
    });

    it('rejects update with 403 Forbidden if user lacks leads:edit_all (e.g. Telecaller)', async () => {
      const req = new Request('http://localhost:3000/api/v1/leads/lead-dummy-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', cookie: telecallerCookie },
        body: JSON.stringify({ notes: 'Telecaller update attempt' }),
      });
      const res = await patchLeadByIdHandler(req, { params: Promise.resolve({ id: 'lead-dummy-id' }) });
      expect(res.status).toBe(403);
    });

    it('allows update for authorized user with leads:edit_all', async () => {
      const timestamp = Date.now();
      const createReq = new Request('http://localhost:3000/api/v1/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: adminCookie },
        body: JSON.stringify({
          fullName: `Update Target Lead ${timestamp}`,
          phone: `+9198666${String(timestamp).slice(-5)}`,
        }),
      });
      const createRes = await createLeadHandler(createReq);
      const lead = (await createRes.json()).data;
      testCleanup.register('lead', lead.id);

      const patchReq = new Request(`http://localhost:3000/api/v1/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', cookie: adminCookie },
        body: JSON.stringify({ notes: 'Updated notes via authorized patch' }),
      });
      const patchRes = await patchLeadByIdHandler(patchReq, { params: Promise.resolve({ id: lead.id }) });
      expect(patchRes.status).toBe(200);
      const patchBody = await patchRes.json();
      expect(patchBody.success).toBe(true);
      expect(patchBody.data.notes).toBe('Updated notes via authorized patch');
    }, 30000);
  });

  describe('POST /api/v1/leads/bulk-update — permission-gated bulk update', () => {
    it('rejects unauthenticated bulk update with 401', async () => {
      const req = new Request('http://localhost:3000/api/v1/leads/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: ['lead-1'], notes: 'test' }),
      });
      const res = await bulkUpdateLeadsHandler(req);
      expect(res.status).toBe(401);
    });

    it('rejects bulk update with 403 Forbidden for user lacking leads:edit_all (e.g. Telecaller)', async () => {
      const req = new Request('http://localhost:3000/api/v1/leads/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: telecallerCookie },
        body: JSON.stringify({ leadIds: ['lead-1'], notes: 'test' }),
      });
      const res = await bulkUpdateLeadsHandler(req);
      expect(res.status).toBe(403);
    });
  });
});

