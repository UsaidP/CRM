import { describe, it, expect, beforeAll } from 'bun:test';
import { GET as repPerformanceHandler } from '@/app/api/v1/analytics/rep-performance/route';
import { GET as digestGetHandler, POST as digestPostHandler } from '@/app/api/v1/cron/daily-call-digest/route';
import { ensureTestOrganization } from '../helpers/test-db';
import { createTestSessionCookie } from '../helpers/test-setup';

describe('API Integration: Sales Rep Performance & Daily WhatsApp Digest', () => {
  let adminCookie: string;

  beforeAll(async () => {
    await ensureTestOrganization();
    adminCookie = await createTestSessionCookie('admin');
  }, 30000);

  describe('GET /api/v1/analytics/rep-performance', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const req = new Request('http://localhost:3000/api/v1/analytics/rep-performance');
      const res = await repPerformanceHandler(req);
      expect(res.status).toBe(401);
    });

    it('returns overall call metrics, rep performance leaderboard, and recent calls for authenticated sessions', async () => {
      const req = new Request('http://localhost:3000/api/v1/analytics/rep-performance?timeRange=week', {
        headers: { cookie: adminCookie },
      });
      const res = await repPerformanceHandler(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.timeRange).toBe('week');
      expect(body.overall).toBeDefined();
      expect(typeof body.overall.totalCalls).toBe('number');
      expect(typeof body.overall.connectionRatePercent).toBe('number');
      expect(Array.isArray(body.repPerformance)).toBe(true);
      expect(Array.isArray(body.recentCalls)).toBe(true);
    }, 30000);
  });

  describe('GET /api/v1/cron/daily-call-digest (Preview)', () => {
    it('returns preview of today\'s WhatsApp daily digest with valid session', async () => {
      const req = new Request('http://localhost:3000/api/v1/cron/daily-call-digest', {
        headers: { cookie: adminCookie },
      });
      const res = await digestGetHandler(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.preview).toBe(true);
      expect(body.digestText).toContain('Lucky CRM Daily Call Intelligence Report');
      expect(body.digestData).toBeDefined();
    }, 30000);
  });

  describe('POST /api/v1/cron/daily-call-digest (Dispatch)', () => {
    it('executes digest dispatch and returns recipient confirmations', async () => {
      const req = new Request('http://localhost:3000/api/v1/cron/daily-call-digest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: adminCookie,
        },
        body: JSON.stringify({
          targetPhones: ['+917977552011'],
        }),
      });
      const res = await digestPostHandler(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.recipients).toContain('+917977552011');
      expect(body.digestText).toContain('Lucky CRM Daily Call Intelligence Report');
      expect(Array.isArray(body.results)).toBe(true);
    }, 30000);
  });
});
