import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { GET as getProjectsHandler, POST as createProjectHandler } from '@/app/api/v1/inventory/projects/route';
import { ensureTestOrganization, cleanupTestEntities } from '../helpers/test-db';
import { createTestSessionCookie, testCleanup } from '../helpers/test-setup';

describe('API Integration: Inventory Projects (/api/v1/inventory/projects)', () => {
  let adminCookie: string;

  beforeAll(async () => {
    await ensureTestOrganization();
    adminCookie = await createTestSessionCookie('admin');
  }, 30000);

  afterAll(async () => {
    await cleanupTestEntities();
  }, 30000);

  describe('GET /api/v1/inventory/projects', () => {
    it('rejects unauthenticated request with 401', async () => {
      const req = new Request('http://localhost:3000/api/v1/inventory/projects');
      const res = await getProjectsHandler(req);
      expect(res.status).toBe(401);
    });

    it('returns projects list for authenticated user', async () => {
      const req = new Request('http://localhost:3000/api/v1/inventory/projects', {
        headers: { cookie: adminCookie },
      });
      const res = await getProjectsHandler(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('POST /api/v1/inventory/projects', () => {
    it('creates a project with valid MahaRERA registration', async () => {
      const timestamp = Date.now();
      const payload = {
        developerName: 'Godrej Properties',
        projectName: `Godrej Kharghar Test ${timestamp}`,
        reraNumber: 'P52000018920',
        microMarket: 'Kharghar Sector 35',
        basePricePerSqft: 11500,
        totalTowers: 2,
        totalFloors: 24,
      };

      const req = new Request('http://localhost:3000/api/v1/inventory/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: adminCookie,
        },
        body: JSON.stringify(payload),
      });

      const res = await createProjectHandler(req);
      expect([200, 201]).toContain(res.status);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.projectName).toBe(payload.projectName);

      testCleanup.register('project', body.data.id);
    });

    it('rejects project creation with invalid MahaRERA number with 422', async () => {
      const req = new Request('http://localhost:3000/api/v1/inventory/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: adminCookie,
        },
        body: JSON.stringify({
          developerName: 'Fake Developer',
          projectName: 'Fake Project',
          reraNumber: 'INVALID_RERA_123',
          microMarket: 'Kharghar Sector 35',
          basePricePerSqft: 10000,
        }),
      });

      const res = await createProjectHandler(req);
      expect(res.status).toBe(422);
    });
  });
});
