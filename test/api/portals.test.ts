import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { GET as listPortalsHandler } from '@/app/api/v1/portals/route';
import { GET as getPublicPortalHandler } from '@/app/api/v1/portals/[token]/route';
import { ensureTestOrganization, cleanupTestEntities } from '../helpers/test-db';
import { createTestSessionCookie, testCleanup } from '../helpers/test-setup';

describe('API Integration: Client Portals (/api/v1/portals/*)', () => {
  let adminCookie: string;

  beforeAll(async () => {
    await ensureTestOrganization();
    adminCookie = await createTestSessionCookie('admin');
  }, 30000);

  afterAll(async () => {
    await cleanupTestEntities();
  }, 30000);

  describe('GET /api/v1/portals', () => {
    it('rejects unauthenticated request with 401', async () => {
      const req = new Request('http://localhost:3000/api/v1/portals');
      const res = await listPortalsHandler(req);
      expect(res.status).toBe(401);
    });

    it('returns portal list for authenticated user', async () => {
      const req = new Request('http://localhost:3000/api/v1/portals', {
        headers: { cookie: adminCookie },
      });
      const res = await listPortalsHandler(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/portals/[token]', () => {
    it('returns 404 for non-existent public portal token without leaking auth error', async () => {
      const req = new Request('http://localhost:3000/api/v1/portals/nonexistent-token-xyz');
      const res = await getPublicPortalHandler(req, {
        params: Promise.resolve({ token: 'nonexistent-token-xyz' }),
      });
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.success).toBe(false);
    });
  });
});
