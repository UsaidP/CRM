import { describe, it, expect, beforeAll } from 'bun:test';
import { GET as getLeadsHandler } from '@/app/api/v1/leads/route';
import { ensureTestOrganization } from '../helpers/test-db';
import { createTestSessionCookie } from '../helpers/test-setup';

describe('Performance: Concurrency & Burst Load Handling', () => {
  let adminCookie: string;

  beforeAll(async () => {
    await ensureTestOrganization();
    adminCookie = await createTestSessionCookie('admin');
  }, 30000);

  it('handles 10 concurrent authenticated API requests without 500 errors', async () => {
    const concurrentRequests = 10;
    const requests = Array(concurrentRequests).fill(null).map(() => {
      const req = new Request('http://localhost:3000/api/v1/leads?page=1&limit=5', {
        headers: { cookie: adminCookie },
      });
      return getLeadsHandler(req);
    });

    const responses = await Promise.all(requests);
    expect(responses.length).toBe(concurrentRequests);

    for (const res of responses) {
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    }
  }, 30000);
});
