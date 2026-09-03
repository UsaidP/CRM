import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { GET as getLeadsHandler, POST as createLeadHandler } from '@/app/api/v1/leads/route';
import { ensureTestOrganization, cleanupTestEntities } from '../helpers/test-db';
import { createTestSessionCookie, PRESET_TEST_USERS, testCleanup } from '../helpers/test-setup';

describe('API Integration: Leads CRUD (/api/v1/leads)', () => {
  let adminCookie: string;
  let agentCookie: string;

  beforeAll(async () => {
    await ensureTestOrganization();
    adminCookie = await createTestSessionCookie('admin');
    agentCookie = await createTestSessionCookie('agent');
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
});
