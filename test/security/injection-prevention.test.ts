import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { GET as getLeadsHandler, POST as createLeadHandler } from '@/app/api/v1/leads/route';
import { GET as getProjectsHandler } from '@/app/api/v1/inventory/projects/route';
import { ensureTestOrganization, cleanupTestEntities } from '../helpers/test-db';
import { createTestSessionCookie, testCleanup } from '../helpers/test-setup';

describe('Security: Injection Prevention (SQLi, XSS, NoSQL)', () => {
  let adminCookie: string;

  beforeAll(async () => {
    await ensureTestOrganization();
    adminCookie = await createTestSessionCookie('admin');
  }, 30000);

  afterAll(async () => {
    await cleanupTestEntities();
  }, 30000);

  describe('SQL Injection Prevention on Search Endpoints', () => {
    const sqliPayloads = [
      "1' OR '1'='1",
      "'; DROP TABLE \"Lead\"; --",
      "1 UNION SELECT null, email, passwordHash FROM \"User\"--",
      "' OR 1=1 --",
      "admin'--",
      "\" or \"\"=\"",
    ];

    for (const payload of sqliPayloads) {
      it(`handles SQL injection payload without throwing 500: ${payload}`, async () => {
        const req = new Request(`http://localhost:3000/api/v1/leads?search=${encodeURIComponent(payload)}`, {
          headers: { cookie: adminCookie },
        });

        const res = await getLeadsHandler(req);
        // Must NEVER crash or return 500 Internal Server Error
        expect(res.status).toBeLessThan(500);
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
      });
    }

    it('handles SQL injection payload on inventory search', async () => {
      const payload = "Godrej'; DROP TABLE \"DeveloperProject\"; --";
      const req = new Request(`http://localhost:3000/api/v1/inventory/projects?search=${encodeURIComponent(payload)}`, {
        headers: { cookie: adminCookie },
      });

      const res = await getProjectsHandler(req);
      expect(res.status).toBeLessThan(500);
      expect(res.status).toBe(200);
    });
  });

  describe('XSS & Malicious Input Sanitization', () => {
    it('safely stores text containing script tags without executing code', async () => {
      const timestamp = Date.now();
      const xssPayload = `<script>alert("xss-${timestamp}")</script>`;
      
      const req = new Request('http://localhost:3000/api/v1/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: adminCookie,
        },
        body: JSON.stringify({
          fullName: 'Security Test Lead',
          phone: `+9198200${String(timestamp).slice(-5)}`,
          notes: xssPayload,
        }),
      });

      const res = await createLeadHandler(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.notes).toBe(xssPayload); // safely preserved as string literal, not executed

      testCleanup.register('lead', body.data.id);
    }, 30000);
  });
});
