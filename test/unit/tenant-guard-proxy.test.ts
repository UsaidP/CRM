import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { prisma } from '@/lib/db/prisma';
import { runWithTenant } from '@/lib/db/tenant-context';
import { ensureTestOrganization, cleanupTestEntities } from '../helpers/test-db';
import { TEST_ORG_ID, TEST_ORG_B_ID, testCleanup } from '../helpers/test-setup';

async function expectForbidden(action: () => Promise<unknown> | any) {
  let err: any = null;
  try {
    await action();
  } catch (e: any) {
    err = e;
  }
  expect(err).not.toBeNull();
  expect(err?.message).toContain('FORBIDDEN_CROSS_TENANT');
}

describe('Unit / Integration: Prisma tenant-guard proxy enforcement', () => {
  let orgAProjectId: string;
  let orgALeadId: string;
  let orgAReminderId: string;
  let orgAVisitId: string;
  let orgACommLogId: string;
  let orgAContactId: string;
  let orgAPortalId: string;

  beforeAll(async () => {
    await ensureTestOrganization();

    // 1. Seed Org A Project
    const project = await prisma.developerProject.create({
      data: {
        organizationId: TEST_ORG_ID,
        developerName: 'Godrej Properties',
        projectName: 'Godrej Highlands',
        reraNumber: 'P52000028714',
        microMarket: 'Kharghar Sector 35',
        basePricePerSqft: 9500.0,
        totalTowers: 3,
        totalFloors: 25,
      },
    });
    orgAProjectId = project.id;
    testCleanup.register('developerProject', orgAProjectId);

    // 2. Seed Org A Lead
    const lead = await prisma.lead.create({
      data: {
        organizationId: TEST_ORG_ID,
        fullName: 'Guard Test Lead Org A',
        phoneE164: '+919988776655',
        leadSource: 'MANUAL_ENTRY',
      },
    });
    orgALeadId = lead.id;
    testCleanup.register('lead', orgALeadId);

    // 3. Seed Org A LeadReminder (direct org-scoped)
    const reminder = await prisma.leadReminder.create({
      data: {
        organizationId: TEST_ORG_ID,
        leadId: orgALeadId,
        title: 'Initial Discovery Call',
        reminderType: 'CALL',
        dueAt: new Date(Date.now() + 86400000),
        status: 'PENDING',
      },
    });
    orgAReminderId = reminder.id;
    testCleanup.register('leadReminder', orgAReminderId);

    // 4. Seed Org A SiteVisit (direct org-scoped)
    const visit = await prisma.siteVisit.create({
      data: {
        organizationId: TEST_ORG_ID,
        leadId: orgALeadId,
        scheduledDate: new Date(Date.now() + 172800000),
        timeSlot: 'Sunday 11:00 AM',
        pickupLocation: 'Central Park Metro',
        itineraryUnitsJson: '[]',
        status: 'SCHEDULED',
      },
    });
    orgAVisitId = visit.id;
    testCleanup.register('siteVisit', orgAVisitId);

    // 5. Seed Org A CommunicationLog (parent-scoped via lead)
    const commLog = await prisma.communicationLog.create({
      data: {
        leadId: orgALeadId,
        channel: 'WHATSAPP',
        direction: 'INBOUND',
        messageContent: 'Interested in 2BHK pricing and possession dates',
      },
    });
    orgACommLogId = commLog.id;
    testCleanup.register('communicationLog', orgACommLogId);

    // 6. Seed Org A Contact (direct org-scoped)
    const contact = await prisma.contact.create({
      data: {
        organizationId: TEST_ORG_ID,
        primaryName: 'Org A Confidential Contact',
        companyName: 'Acme Real Estate Holdings',
      },
    });
    orgAContactId = contact.id;
    testCleanup.register('contact', orgAContactId);

    // 7. Seed Org A ClientPortal (direct org-scoped)
    const portal = await prisma.clientPortal.create({
      data: {
        organizationId: TEST_ORG_ID,
        leadId: orgALeadId,
        token: `org-a-portal-token-${Date.now()}`,
        title: 'Confidential Client Portal Org A',
      },
    });
    orgAPortalId = portal.id;
    testCleanup.register('clientPortal', orgAPortalId);
  }, 35000);

  afterAll(async () => {
    await cleanupTestEntities();
  }, 35000);

  describe('DeveloperProject (Direct Org-Scoped Model)', () => {
    it('findUnique: Org B cannot read Org A project by ID (returns null)', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        const found = await prisma.developerProject.findUnique({
          where: { id: orgAProjectId },
        });
        expect(found).toBeNull();
      });
    });

    it('findUnique: Org A CAN read its own project by ID', async () => {
      await runWithTenant(TEST_ORG_ID, async () => {
        const found = await prisma.developerProject.findUnique({
          where: { id: orgAProjectId },
        });
        expect(found).not.toBeNull();
        expect(found?.id).toBe(orgAProjectId);
      });
    });

    it('findMany: Org B query never lists Org A project', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        const projects = await prisma.developerProject.findMany({
          where: { id: orgAProjectId },
        });
        expect(projects.length).toBe(0);
      });
    });

    it('update: Org B cannot mutate Org A project (throws FORBIDDEN_CROSS_TENANT)', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        await expectForbidden(() =>
          prisma.developerProject.update({
            where: { id: orgAProjectId },
            data: { projectName: 'Malicious Project Hijack' },
          })
        );
      });
    });

    it('delete: Org B cannot delete Org A project (throws FORBIDDEN_CROSS_TENANT)', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        await expectForbidden(() =>
          prisma.developerProject.delete({
            where: { id: orgAProjectId },
          })
        );
      });
    });

    it('upsert: Org B cannot upsert into Org A project (throws FORBIDDEN_CROSS_TENANT)', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        await expectForbidden(() =>
          prisma.developerProject.upsert({
            where: { id: orgAProjectId },
            update: { projectName: 'Malicious Upsert Overwrite' },
            create: {
              developerName: 'Fake Developer',
              projectName: 'Fake Project',
              reraNumber: 'P51700099999',
              microMarket: 'Thane West',
              basePricePerSqft: 8000.0,
            },
          })
        );
      });
    });

    it('create: rejecting cross-tenant organizationId injection', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        await expectForbidden(() =>
          prisma.developerProject.create({
            data: {
              organizationId: TEST_ORG_ID, // Mismatched org!
              developerName: 'Attacker Dev',
              projectName: 'Injected Org A Project',
              reraNumber: 'P52000011111',
              microMarket: 'Kharghar Sector 10',
              basePricePerSqft: 8500.0,
            },
          })
        );
      });
    });

    it('findUniqueOrThrow: Org B throws on cross-tenant read', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        let err: any = null;
        try {
          await prisma.developerProject.findUniqueOrThrow({
            where: { id: orgAProjectId },
          });
        } catch (e) {
          err = e;
        }
        expect(err).not.toBeNull();
      });
    });

    it('updateMany / deleteMany: Org B cannot touch Org A projects in bulk', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        const updateRes = await prisma.developerProject.updateMany({
          where: { id: orgAProjectId },
          data: { projectName: 'Bulk Hack' },
        });
        expect(updateRes.count).toBe(0);

        const deleteRes = await prisma.developerProject.deleteMany({
          where: { id: orgAProjectId },
        });
        expect(deleteRes.count).toBe(0);
      });
    });

    it('unscoped model: Organization queries pass through untouched in tenant context', async () => {
      await runWithTenant(TEST_ORG_ID, async () => {
        const org = await prisma.organization.findFirst({
          where: { id: TEST_ORG_ID },
        });
        expect(org?.id).toBe(TEST_ORG_ID);
      });
    });
  });

  describe('LeadReminder (Direct Org-Scoped Model)', () => {
    it('findUnique: Org B cannot read Org A reminder (returns null)', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        const found = await prisma.leadReminder.findUnique({
          where: { id: orgAReminderId },
        });
        expect(found).toBeNull();
      });
    });

    it('findUnique: Org A CAN read its own reminder', async () => {
      await runWithTenant(TEST_ORG_ID, async () => {
        const found = await prisma.leadReminder.findUnique({
          where: { id: orgAReminderId },
        });
        expect(found).not.toBeNull();
        expect(found?.id).toBe(orgAReminderId);
      });
    });

    it('update: Org B cannot update Org A reminder (throws FORBIDDEN_CROSS_TENANT)', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        await expectForbidden(() =>
          prisma.leadReminder.update({
            where: { id: orgAReminderId },
            data: { title: 'Compromised Reminder Title' },
          })
        );
      });
    });

    it('delete: Org B cannot delete Org A reminder (throws FORBIDDEN_CROSS_TENANT)', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        await expectForbidden(() =>
          prisma.leadReminder.delete({
            where: { id: orgAReminderId },
          })
        );
      });
    });
  });

  describe('SiteVisit (Direct Org-Scoped Model)', () => {
    it('findUnique: Org B cannot read Org A site visit (returns null)', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        const found = await prisma.siteVisit.findUnique({
          where: { id: orgAVisitId },
        });
        expect(found).toBeNull();
      });
    });

    it('findUnique: Org A CAN read its own site visit', async () => {
      await runWithTenant(TEST_ORG_ID, async () => {
        const found = await prisma.siteVisit.findUnique({
          where: { id: orgAVisitId },
        });
        expect(found).not.toBeNull();
        expect(found?.id).toBe(orgAVisitId);
      });
    });

    it('update: Org B cannot update Org A site visit (throws FORBIDDEN_CROSS_TENANT)', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        await expectForbidden(() =>
          prisma.siteVisit.update({
            where: { id: orgAVisitId },
            data: { status: 'CANCELLED' },
          })
        );
      });
    });

    it('delete: Org B cannot delete Org A site visit (throws FORBIDDEN_CROSS_TENANT)', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        await expectForbidden(() =>
          prisma.siteVisit.delete({
            where: { id: orgAVisitId },
          })
        );
      });
    });
  });

  describe('CommunicationLog (Parent-Scoped Model via Lead)', () => {
    it('findUnique: Org B cannot read Org A comm log (returns null)', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        const found = await prisma.communicationLog.findUnique({
          where: { id: orgACommLogId },
        });
        expect(found).toBeNull();
      });
    });

    it('findUnique: Org A CAN read its own comm log', async () => {
      await runWithTenant(TEST_ORG_ID, async () => {
        const found = await prisma.communicationLog.findUnique({
          where: { id: orgACommLogId },
        });
        expect(found).not.toBeNull();
        expect(found?.id).toBe(orgACommLogId);
      });
    });

    it('create: Org B cannot attach communicationLog to Org A lead (throws FORBIDDEN_CROSS_TENANT)', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        await expectForbidden(() =>
          prisma.communicationLog.create({
            data: {
              leadId: orgALeadId,
              channel: 'WHATSAPP',
              direction: 'OUTBOUND',
              messageContent: 'Unauthorized message injection',
            },
          })
        );
      });
    });

    it('update: Org B cannot update Org A comm log (throws FORBIDDEN_CROSS_TENANT)', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        await expectForbidden(() =>
          prisma.communicationLog.update({
            where: { id: orgACommLogId },
            data: { messageContent: 'Tampered message text' },
          })
        );
      });
    });

    it('delete: Org B cannot delete Org A comm log (throws FORBIDDEN_CROSS_TENANT)', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        await expectForbidden(() =>
          prisma.communicationLog.delete({
            where: { id: orgACommLogId },
          })
        );
      });
    });
  });

  describe('Contact (Direct Org-Scoped Model)', () => {
    it('findUnique: Org B cannot read Org A contact by ID (returns null)', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        const found = await prisma.contact.findUnique({
          where: { id: orgAContactId },
        });
        expect(found).toBeNull();
      });
    });

    it('findUnique: Org A CAN read its own contact by ID', async () => {
      await runWithTenant(TEST_ORG_ID, async () => {
        const found = await prisma.contact.findUnique({
          where: { id: orgAContactId },
        });
        expect(found).not.toBeNull();
        expect(found?.id).toBe(orgAContactId);
      });
    });

    it('findMany: Org B query never lists Org A contact', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        const contacts = await prisma.contact.findMany({
          where: { id: orgAContactId },
        });
        expect(contacts.length).toBe(0);
      });
    });

    it('update: Org B cannot update Org A contact (throws FORBIDDEN_CROSS_TENANT)', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        await expectForbidden(() =>
          prisma.contact.update({
            where: { id: orgAContactId },
            data: { primaryName: 'Tampered Contact Name' },
          })
        );
      });
    });

    it('delete: Org B cannot delete Org A contact (throws FORBIDDEN_CROSS_TENANT)', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        await expectForbidden(() =>
          prisma.contact.delete({
            where: { id: orgAContactId },
          })
        );
      });
    });

    it('upsert: Org B cannot upsert into Org A contact (throws FORBIDDEN_CROSS_TENANT)', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        await expectForbidden(() =>
          prisma.contact.upsert({
            where: { id: orgAContactId },
            update: { primaryName: 'Tampered Contact Upsert' },
            create: {
              primaryName: 'Injected Contact',
            },
          })
        );
      });
    });
  });

  describe('ClientPortal (Direct Org-Scoped Model)', () => {
    it('findUnique: Org B cannot read Org A client portal by ID (returns null)', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        const found = await prisma.clientPortal.findUnique({
          where: { id: orgAPortalId },
        });
        expect(found).toBeNull();
      });
    });

    it('findUnique: Org A CAN read its own client portal by ID', async () => {
      await runWithTenant(TEST_ORG_ID, async () => {
        const found = await prisma.clientPortal.findUnique({
          where: { id: orgAPortalId },
        });
        expect(found).not.toBeNull();
        expect(found?.id).toBe(orgAPortalId);
      });
    });

    it('update: Org B cannot update Org A client portal (throws FORBIDDEN_CROSS_TENANT)', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        await expectForbidden(() =>
          prisma.clientPortal.update({
            where: { id: orgAPortalId },
            data: { title: 'Compromised Portal Title' },
          })
        );
      });
    });

    it('delete: Org B cannot delete Org A client portal (throws FORBIDDEN_CROSS_TENANT)', async () => {
      await runWithTenant(TEST_ORG_B_ID, async () => {
        await expectForbidden(() =>
          prisma.clientPortal.delete({
            where: { id: orgAPortalId },
          })
        );
      });
    });
  });
});
