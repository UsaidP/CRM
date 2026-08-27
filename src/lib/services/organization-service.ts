import { prisma } from '@/lib/db/prisma';

/**
 * Retrieves the primary organization or creates the default ZamZam Properties organization
 * if the database was wiped/cleared.
 */
export async function getOrCreateDefaultOrganization() {
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'ZamZam Properties & Real Estate Suite',
        slug: 'zamzam-properties',
        reraBrokerRegistration: 'R-51700060081',
        settingsJson: JSON.stringify({
          currency: 'INR',
          state: 'Maharashtra',
          primaryMarkets: ['Kharghar', 'Taloja Phase 1', 'Taloja Phase 2'],
        }),
      },
    });
  }
  return org;
}
