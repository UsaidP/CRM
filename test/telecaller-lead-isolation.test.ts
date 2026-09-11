import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { prisma } from '../src/lib/db/prisma';
import { scopedLeadFilter } from '../src/lib/services/api-auth';
import { getPermissionScope } from '../src/lib/domain/rbac-engine';
import { reassignLead, bulkReassignLeads } from '../src/lib/services/lead-assignment-service';

describe('Telecaller Lead Assignment & Data Isolation Suite', () => {
  const testPrefix = `[ISO-${Date.now()}]`;
  let orgId: string;
  let adminUser: any;
  let telecallerA: any;
  let telecallerB: any;
  let lead1: any;
  let lead2: any;
  let lead3: any;
  let lead4: any;

  beforeAll(async () => {
    // 1. Resolve or create test organization
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: 'ZamZam Test Realty',
          slug: `test-realty-${Date.now()}`,
        },
      });
    }
    orgId = org.id;

    // 2. Setup test users
    adminUser = await prisma.user.upsert({
      where: { email: `admin-iso-${Date.now()}@zamzam.internal` },
      update: {},
      create: {
        organizationId: orgId,
        fullName: 'Usaid Patel (Admin)',
        email: `admin-iso-${Date.now()}@zamzam.internal`,
        phoneE164: `+919999${Math.floor(100000 + Math.random() * 900000)}`,
        role: 'ADMIN',
      },
    });

    telecallerA = await prisma.user.upsert({
      where: { email: `telecaller-a-${Date.now()}@zamzam.internal` },
      update: {},
      create: {
        organizationId: orgId,
        fullName: 'Telecaller A (Aisha)',
        email: `telecaller-a-${Date.now()}@zamzam.internal`,
        phoneE164: `+919999${Math.floor(100000 + Math.random() * 900000)}`,
        role: 'TELECALLER',
      },
    });

    telecallerB = await prisma.user.upsert({
      where: { email: `telecaller-b-${Date.now()}@zamzam.internal` },
      update: {},
      create: {
        organizationId: orgId,
        fullName: 'Telecaller B (Bilal)',
        email: `telecaller-b-${Date.now()}@zamzam.internal`,
        phoneE164: `+919999${Math.floor(100000 + Math.random() * 900000)}`,
        role: 'TELECALLER',
      },
    });

    // 3. Create test leads
    // Lead 1: Assigned to Telecaller A
    lead1 = await prisma.lead.create({
      data: {
        organizationId: orgId,
        fullName: `${testPrefix} Lead For Telecaller A`,
        phoneE164: `+91981${Math.floor(1000000 + Math.random() * 9000000)}`,
        leadSource: 'direct_call',
        currentStage: 'discovery_call',
        assignedBrokerId: telecallerA.id,
      },
    });

    // Lead 2: Assigned to Telecaller B
    lead2 = await prisma.lead.create({
      data: {
        organizationId: orgId,
        fullName: `${testPrefix} Lead For Telecaller B`,
        phoneE164: `+91982${Math.floor(1000000 + Math.random() * 9000000)}`,
        leadSource: 'whatsapp_group',
        currentStage: 'portal_shared',
        assignedBrokerId: telecallerB.id,
      },
    });

    // Lead 3: Assigned to Admin Usaid
    lead3 = await prisma.lead.create({
      data: {
        organizationId: orgId,
        fullName: `${testPrefix} Lead For Admin Usaid`,
        phoneE164: `+91983${Math.floor(1000000 + Math.random() * 9000000)}`,
        leadSource: 'referral',
        currentStage: 'visit_scheduled',
        assignedBrokerId: adminUser.id,
      },
    });

    // Lead 4: Unassigned Firm Lead
    lead4 = await prisma.lead.create({
      data: {
        organizationId: orgId,
        fullName: `${testPrefix} Unassigned Firm Pool Lead`,
        phoneE164: `+91984${Math.floor(1000000 + Math.random() * 9000000)}`,
        leadSource: 'web_form',
        currentStage: 'new_uncontacted',
        assignedBrokerId: null,
      },
    });
  }, 30000);

  afterAll(async () => {
    // Teardown: Clean up all created fixtures
    try {
      const createdLeads = await prisma.lead.findMany({
        where: { organizationId: orgId, fullName: { startsWith: testPrefix } },
        select: { id: true },
      });
      const leadIds = createdLeads.map((l) => l.id);

      if (leadIds.length > 0) {
        await prisma.leadAssignment.deleteMany({
          where: { leadId: { in: leadIds } },
        });
        await prisma.lead.deleteMany({
          where: { id: { in: leadIds } },
        });
      }

      const userIds = [adminUser?.id, telecallerA?.id, telecallerB?.id].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.leadAssignment.deleteMany({
          where: { OR: [{ userId: { in: userIds } }, { assignedById: { in: userIds } }] },
        });
        await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }
    } catch (cleanupErr) {
      console.warn('Test cleanup notice:', cleanupErr);
    }
  }, 30000);

  test('Telecaller A has OWN scope and only sees their assigned lead', async () => {
    const scopeA = getPermissionScope(telecallerA, 'leads:view_all');
    expect(scopeA).toBe('OWN');

    const filterA = await scopedLeadFilter(
      { userId: telecallerA.id, organizationId: orgId, role: 'TELECALLER', isSuperAdmin: false, email: telecallerA.email },
      scopeA
    );

    const leadsForA = await prisma.lead.findMany({
      where: {
        ...filterA,
        fullName: { startsWith: testPrefix },
      },
    });

    expect(leadsForA.length).toBe(1);
    expect(leadsForA[0].id).toBe(lead1.id);
    expect(leadsForA.some((l) => l.id === lead2.id)).toBe(false);
    expect(leadsForA.some((l) => l.id === lead3.id)).toBe(false);
    expect(leadsForA.some((l) => l.id === lead4.id)).toBe(false);
  }, 20000);

  test('Telecaller B has OWN scope and cannot see Telecaller A or unassigned leads', async () => {
    const scopeB = getPermissionScope(telecallerB, 'leads:view_all');
    expect(scopeB).toBe('OWN');

    const filterB = await scopedLeadFilter(
      { userId: telecallerB.id, organizationId: orgId, role: 'TELECALLER', isSuperAdmin: false, email: telecallerB.email },
      scopeB
    );

    const leadsForB = await prisma.lead.findMany({
      where: {
        ...filterB,
        fullName: { startsWith: testPrefix },
      },
    });

    expect(leadsForB.length).toBe(1);
    expect(leadsForB[0].id).toBe(lead2.id);
    expect(leadsForB.some((l) => l.id === lead1.id)).toBe(false);
  }, 20000);

  test('Admin has ORGANIZATION scope and sees all leads across telecallers', async () => {
    const scopeAdmin = getPermissionScope(adminUser, 'leads:view_all');
    expect(scopeAdmin).toBe('ORGANIZATION');

    const filterAdmin = await scopedLeadFilter(
      { userId: adminUser.id, organizationId: orgId, role: 'ADMIN', isSuperAdmin: false, email: adminUser.email },
      scopeAdmin
    );

    const leadsForAdmin = await prisma.lead.findMany({
      where: {
        ...filterAdmin,
        fullName: { startsWith: testPrefix },
      },
    });

    expect(leadsForAdmin.length).toBe(4);
  }, 20000);

  test('Admin reassignLead assigns Lead 4 to Telecaller A with MANUAL_REASSIGN audit trail', async () => {
    const reassignment = await reassignLead(
      lead4.id,
      telecallerA.id,
      adminUser.id,
      'Assigned by Usaid to Aisha'
    );

    expect(reassignment.userId).toBe(telecallerA.id);
    expect(reassignment.assignedById).toBe(adminUser.id);
    expect(reassignment.assignmentType).toBe('MANUAL_REASSIGN');

    const updatedLead4 = await prisma.lead.findUnique({
      where: { id: lead4.id },
    });
    expect(updatedLead4?.assignedBrokerId).toBe(telecallerA.id);

    // Telecaller A now sees Lead 1 and Lead 4
    const filterA = await scopedLeadFilter(
      { userId: telecallerA.id, organizationId: orgId, role: 'TELECALLER', isSuperAdmin: false, email: telecallerA.email },
      'OWN'
    );
    const updatedLeadsForA = await prisma.lead.findMany({
      where: {
        ...filterA,
        fullName: { startsWith: testPrefix },
      },
    });
    expect(updatedLeadsForA.length).toBe(2);
    expect(updatedLeadsForA.some((l) => l.id === lead1.id)).toBe(true);
    expect(updatedLeadsForA.some((l) => l.id === lead4.id)).toBe(true);

    // Telecaller B still only sees Lead 2
    const filterB = await scopedLeadFilter(
      { userId: telecallerB.id, organizationId: orgId, role: 'TELECALLER', isSuperAdmin: false, email: telecallerB.email },
      'OWN'
    );
    const updatedLeadsForB = await prisma.lead.findMany({
      where: {
        ...filterB,
        fullName: { startsWith: testPrefix },
      },
    });
    expect(updatedLeadsForB.length).toBe(1);
    expect(updatedLeadsForB[0].id).toBe(lead2.id);
  }, 20000);

  test('bulkReassignLeads executes transactionally with MANUAL_REASSIGN audit records', async () => {
    const updatedCount = await bulkReassignLeads(
      [lead1.id, lead4.id],
      telecallerB.id,
      adminUser.id,
      'Bulk shifted to Telecaller B'
    );

    expect(updatedCount).toBe(2);

    // Verify audit records created with MANUAL_REASSIGN
    const activeAssignments = await prisma.leadAssignment.findMany({
      where: {
        leadId: { in: [lead1.id, lead4.id] },
        unassignedAt: null,
      },
    });
    expect(activeAssignments.length).toBe(2);
    expect(activeAssignments.every((a) => a.userId === telecallerB.id)).toBe(true);
    expect(activeAssignments.every((a) => a.assignmentType === 'MANUAL_REASSIGN')).toBe(true);
    expect(activeAssignments.every((a) => a.assignedById === adminUser.id)).toBe(true);

    // Telecaller B now sees Lead 1, Lead 2, and Lead 4
    const filterB = await scopedLeadFilter(
      { userId: telecallerB.id, organizationId: orgId, role: 'TELECALLER', isSuperAdmin: false, email: telecallerB.email },
      'OWN'
    );
    const leadsForB = await prisma.lead.findMany({
      where: {
        ...filterB,
        fullName: { startsWith: testPrefix },
      },
    });
    expect(leadsForB.length).toBe(3);
  }, 20000);

  test('Scoped filter prevents unauthorized out-of-scope lead updates in bulk-update logic', async () => {
    // If Telecaller A tries to bulk-update leads [lead1.id, lead2.id, lead3.id]
    // only leads belonging to Telecaller A's scope should be authorized
    const scopeA = getPermissionScope(telecallerA, 'leads:view_all');
    const scopeWhere = await scopedLeadFilter(
      { userId: telecallerA.id, organizationId: orgId, role: 'TELECALLER', isSuperAdmin: false, email: telecallerA.email },
      scopeA
    );

    const authorizedLeads = await prisma.lead.findMany({
      where: {
        id: { in: [lead1.id, lead2.id, lead3.id, lead4.id] },
        ...scopeWhere,
      },
      select: { id: true },
    });

    // Currently leads 1, 2, 4 are assigned to Telecaller B, and lead 3 is assigned to adminUser.
    // Telecaller A has OWN scope and owns 0 of these right now.
    expect(authorizedLeads.length).toBe(0);
  }, 20000);
});
