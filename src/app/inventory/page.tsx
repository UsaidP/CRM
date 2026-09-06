import { prisma } from '@/lib/db/prisma';
import { withDbRetry } from '@/lib/db/db-retry';
import { InventoryClient } from '@/components/inventory/InventoryClient';
import { assessUnitFreshness } from '@/lib/domain/verification-engine';
import { getServerSession } from '@/lib/services/server-auth';
import { runWithTenant } from '@/lib/db/tenant-context';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function InventoryPage() {
  const session = await getServerSession();

  let initialUnits: any[] = [];
  let initialProjects: any[] = [];

  try {
    const [rawUnits, projects] = await withDbRetry(async () => {
      return runWithTenant(session.organizationId, async () => {
        return Promise.all([
          prisma.propertyUnit.findMany({
            where: { project: { organizationId: session.organizationId } },
            include: {
              project: true,
              verifiedBy: true,
            },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.developerProject.findMany({
            where: { organizationId: session.organizationId },
            orderBy: { projectName: 'asc' },
          }),
        ]);
      });
    });

    initialUnits = JSON.parse(
      JSON.stringify(
        rawUnits.map((u) => {
          const freshness = assessUnitFreshness(u.verificationStatus, u.lastVerifiedAt);
          return {
            ...u,
            freshness,
          };
        })
      )
    );

    initialProjects = JSON.parse(JSON.stringify(projects));
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
