import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { GET as getDealsHandler, POST as createDealHandler } from '@/app/api/v1/deals/route';
import { ensureTestOrganization, cleanupTestEntities } from '../helpers/test-db';
import { createTestSessionCookie, testCleanup } from '../helpers/test-setup';

describe('API Integration: Deals Transactions (/api/v1/deals)', () => {
  let adminCookie: string;

  beforeAll(async () => {
    await ensureTestOrganization();
    adminCookie = await createTestSessionCookie('admin');
  }, 30000);

  afterAll(async () => {
    await cleanupTestEntities();
  }, 30000);

  describe('GET /api/v1/deals', () => {
    it('rejects unauthenticated request with 401', async () => {
      const req = new Request('http://localhost:3000/api/v1/deals');
      const res = await getDealsHandler(req);
      expect(res.status).toBe(401);
    });

    it('returns deals ledger with financial summary for authenticated user', async () => {
      const req = new Request('http://localhost:3000/api/v1/deals?page=1&limit=20', {
        headers: { cookie: adminCookie },
      });
      const res = await getDealsHandler(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.summary).toBeDefined();
      expect(typeof body.summary.totalGrossBrokerage).toBe('number');
    });
  });

  describe('POST /api/v1/deals', () => {
    it('returns 422 for malformed payload with non-UUID identifiers', async () => {
      const req = new Request('http://localhost:3000/api/v1/deals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: adminCookie,
        },
        body: JSON.stringify({
          leadId: 'invalid-id',
          propertyUnitId: 'invalid-unit',
        }),
      });

      const res = await createDealHandler(req);
      expect(res.status).toBe(422);
    });
  });
});
