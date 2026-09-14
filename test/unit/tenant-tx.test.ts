import { describe, it, expect } from 'bun:test';
import { prisma } from '@/lib/db/prisma';
import { runWithTenant } from '@/lib/db/tenant-context';
import { TEST_ORG_ID, testCleanup } from '../helpers/test-setup';
import { ensureTestOrganization } from '../helpers/test-db';

describe('Tenant Guard in Transactions', () => {
  it('creates project and child unit within interactive transaction', async () => {
    await ensureTestOrganization();
    await runWithTenant(TEST_ORG_ID, async () => {
      const result = await prisma.$transaction(async (tx) => {
        const project = await tx.developerProject.create({
          data: {
            organizationId: TEST_ORG_ID,
            developerName: 'Tx Dev',
            projectName: 'Tx Project ' + Date.now(),
            microMarket: 'Tx Market',
            basePricePerSqft: 10000,
          },
        });
        testCleanup.register('project', project.id);

        const unit = await tx.propertyUnit.create({
          data: {
            projectId: project.id,
            unitNumber: 'TX-101',
            bhk: 2,
            floorNumber: 2,
            totalFloors: 15,
            possessionStatus: 'UNDER_CONSTRUCTION',
            carpetAreaSqft: 650,
            agreementValue: 6500000,
            allInTotalCost: 7000000,
          },
        });
        testCleanup.register('unit', unit.id);

        return { project, unit };
      });

      expect(result.project).toBeDefined();
      expect(result.unit).toBeDefined();
      expect(result.unit.projectId).toBe(result.project.id);
    });
  }, 30000);
});
