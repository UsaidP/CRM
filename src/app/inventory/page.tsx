import { prisma } from '@/lib/db/prisma';
import { InventoryClient } from '@/components/inventory/InventoryClient';
import { assessUnitFreshness } from '@/lib/domain/verification-engine';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  let initialUnits: any[] = [];
  let initialProjects: any[] = [];

  try {
    const [rawUnits, projects] = await Promise.all([
      prisma.propertyUnit.findMany({
        include: {
          project: true,
          verifiedBy: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.developerProject.findMany({
        orderBy: { projectName: 'asc' },
      }),
    ]);

    initialUnits = rawUnits.map((u) => {
      const freshness = assessUnitFreshness(u.verificationStatus, u.lastVerifiedAt);
      return {
        ...u,
        freshness,
      };
    });

    initialProjects = projects;
  } catch (err) {
    console.error('Error loading initial inventory:', err);
  }

  return (
    <InventoryClient
      initialUnits={initialUnits}
      initialProjects={initialProjects}
    />
  );
}
