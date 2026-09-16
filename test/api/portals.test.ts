import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { GET as listPortalsHandler, DELETE as deletePortalsHandler } from '@/app/api/v1/portals/route';
import { GET as getPublicPortalHandler, DELETE as deletePublicPortalHandler } from '@/app/api/v1/portals/[token]/route';
import { ensureTestOrganization, cleanupTestEntities } from '../helpers/test-db';
import { createTestSessionCookie, testCleanup, TEST_ORG_ID, PRESET_TEST_USERS } from '../helpers/test-setup';
import { prisma } from '@/lib/db/prisma';

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

    it('returns portal with creator phone for client card, but strips lead phoneE164', async () => {
      const ts = Date.now();
      const testLead = await prisma.lead.create({
        data: {
          organizationId: TEST_ORG_ID,
          fullName: `Portal Public Lead ${ts}`,
          phoneE164: `+9197200${String(ts).slice(-5)}`,
          sourceCode: 'ORGANIC_PORTAL_TEST',
          leadSource: 'direct_call',
          assignedBrokerId: PRESET_TEST_USERS.admin.userId,
        },
      });
      testCleanup.register('lead', testLead.id);

      const token = `token-public-view-${ts}`;
      const testPortal = await prisma.clientPortal.create({
        data: {
          organizationId: TEST_ORG_ID,
          leadId: testLead.id,
          token,
          title: `Public Portal ${ts}`,
          createdById: PRESET_TEST_USERS.admin.userId,
        },
      });
      testCleanup.register('portal', testPortal.id);

      const req = new Request(`http://localhost:3000/api/v1/portals/${token}`);
      const res = await getPublicPortalHandler(req, {
        params: Promise.resolve({ token }),
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.token).toBe(token);
      // Lead phone must be stripped
      expect(body.data.lead.phoneE164).toBeUndefined();
      // Creator info must be exposed for contact card
      expect(body.data.createdBy).toBeDefined();
      expect(body.data.createdBy.fullName).toBeDefined();
    });

    it('rejects expired portals with 410 Gone', async () => {
      const ts = Date.now();
      const testLead = await prisma.lead.create({
        data: {
          organizationId: TEST_ORG_ID,
          fullName: `Expired Lead ${ts}`,
          phoneE164: `+9197300${String(ts).slice(-5)}`,
          sourceCode: 'ORGANIC_PORTAL_TEST',
          leadSource: 'direct_call',
        },
      });
      testCleanup.register('lead', testLead.id);

      const token = `token-expired-${ts}`;
      const testPortal = await prisma.clientPortal.create({
        data: {
          organizationId: TEST_ORG_ID,
          leadId: testLead.id,
          token,
          title: `Expired Portal ${ts}`,
          createdById: PRESET_TEST_USERS.admin.userId,
          expiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
        },
      });
      testCleanup.register('portal', testPortal.id);

      const req = new Request(`http://localhost:3000/api/v1/portals/${token}`);
      const res = await getPublicPortalHandler(req, {
        params: Promise.resolve({ token }),
      });
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('expired');
    });
  });

  describe('DELETE /api/v1/portals', () => {
    it('rejects unauthenticated delete request with 401', async () => {
      const req = new Request('http://localhost:3000/api/v1/portals?id=sample', {
        method: 'DELETE',
      });
      const res = await deletePortalsHandler(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 if neither id nor token is provided', async () => {
      const req = new Request('http://localhost:3000/api/v1/portals', {
        method: 'DELETE',
        headers: { cookie: adminCookie },
      });
      const res = await deletePortalsHandler(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it('returns 404 for non-existent portal id', async () => {
      const req = new Request('http://localhost:3000/api/v1/portals?id=nonexistent-portal-uuid', {
        method: 'DELETE',
        headers: { cookie: adminCookie },
      });
      const res = await deletePortalsHandler(req);
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it('deletes an existing client portal and cascades to telemetry logs', async () => {
      const ts = Date.now();
      const testLead = await prisma.lead.create({
        data: {
          organizationId: TEST_ORG_ID,
          fullName: `Portal Lead ${ts}`,
          phoneE164: `+9197000${String(ts).slice(-5)}`,
          sourceCode: 'ORGANIC_PORTAL_TEST',
          leadSource: 'direct_call',
          assignedBrokerId: PRESET_TEST_USERS.admin.userId,
        },
      });
      testCleanup.register('lead', testLead.id);

      const testPortal = await prisma.clientPortal.create({
        data: {
          organizationId: TEST_ORG_ID,
          leadId: testLead.id,
          token: `token-delete-test-${ts}`,
          title: `Test Portal ${ts}`,
          createdById: PRESET_TEST_USERS.admin.userId,
          telemetryLogs: {
            create: [
              { actionType: 'PORTAL_OPEN', dwellTimeSec: 45 },
              { actionType: 'PHOTO_SWIPE', dwellTimeSec: 20 },
            ],
          },
        },
      });

      const req = new Request(`http://localhost:3000/api/v1/portals?id=${testPortal.id}`, {
        method: 'DELETE',
        headers: { cookie: adminCookie },
      });
      const res = await deletePortalsHandler(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.deletedId).toBe(testPortal.id);

      // Verify portal is purged from database
      const foundPortal = await prisma.clientPortal.findUnique({
        where: { id: testPortal.id },
      });
      expect(foundPortal).toBeNull();

      // Verify cascading deletion of telemetry logs
      const foundLogs = await prisma.portalTelemetryLog.findMany({
        where: { portalId: testPortal.id },
      });
      expect(foundLogs.length).toBe(0);
    }, 30000);
  });

  describe('DELETE /api/v1/portals/[token]', () => {
    it('deletes portal via /api/v1/portals/[token]', async () => {
      const ts = Date.now();
      const testLead = await prisma.lead.create({
        data: {
          organizationId: TEST_ORG_ID,
          fullName: `Portal Token Lead ${ts}`,
          phoneE164: `+9197100${String(ts).slice(-5)}`,
          sourceCode: 'ORGANIC_PORTAL_TEST',
          leadSource: 'direct_call',
          assignedBrokerId: PRESET_TEST_USERS.admin.userId,
        },
      });
      testCleanup.register('lead', testLead.id);

      const token = `token-param-del-${ts}`;
      const testPortal = await prisma.clientPortal.create({
        data: {
          organizationId: TEST_ORG_ID,
          leadId: testLead.id,
          token,
          title: `Token Param Portal ${ts}`,
          createdById: PRESET_TEST_USERS.admin.userId,
        },
      });

      const req = new Request(`http://localhost:3000/api/v1/portals/${token}`, {
        method: 'DELETE',
        headers: { cookie: adminCookie },
      });
      const res = await deletePublicPortalHandler(req, {
        params: Promise.resolve({ token }),
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.deletedId).toBe(testPortal.id);

      const foundPortal = await prisma.clientPortal.findUnique({
        where: { id: testPortal.id },
      });
      expect(foundPortal).toBeNull();
    }, 30000);
  });
});

