import { prisma } from '@/lib/db/prisma';
import { TEST_ORG_ID, TEST_ORG_B_ID, PRESET_TEST_USERS, testCleanup } from './test-setup';

let isSeeded = false;

// Precomputed PBKDF2 SHA-512 hash for 'SafeTestPassword123!'
const STATIC_TEST_PASSWORD_HASH = 'pbkdf2:sha512:100000:c67b4145b23c178df8313be17115edc1:8be6c266fd3fef4759893db9c07f5f80e5810eefa65b88d33b9fbada758d83baa8834cd192ca0696431ccd1c020ac743ab7e7164631c34960de4bd2fa6e80d5c';

export async function ensureTestOrganization(): Promise<{ orgAId: string; orgBId: string }> {
  if (isSeeded) {
    return { orgAId: TEST_ORG_ID, orgBId: TEST_ORG_B_ID };
  }

  try {
    // 1. Ensure Primary Test Organization
    await prisma.organization.upsert({
      where: { id: TEST_ORG_ID },
      update: { name: 'ZamZam Test Automation Org' },
      create: {
        id: TEST_ORG_ID,
        name: 'ZamZam Test Automation Org',
        slug: 'zamzam-test-org',
        reraBrokerRegistration: 'A52000099999',
        settingsJson: JSON.stringify({ currency: 'INR', state: 'Maharashtra' }),
      },
    });

    // 2. Ensure Secondary Isolation Test Organization
    await prisma.organization.upsert({
      where: { id: TEST_ORG_B_ID },
      update: { name: 'Foreign Test Org' },
      create: {
        id: TEST_ORG_B_ID,
        name: 'Foreign Test Org',
        slug: 'foreign-test-org',
        reraBrokerRegistration: 'A52000088888',
        settingsJson: JSON.stringify({ currency: 'INR', state: 'Maharashtra' }),
      },
    });

    // 3. Ensure Test Users exist
    for (const user of Object.values(PRESET_TEST_USERS)) {
      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          role: user.role,
          fullName: user.fullName,
          organizationId: user.organizationId || TEST_ORG_ID,
          isActive: true,
        },
        create: {
          id: user.userId,
          email: user.email,
          fullName: user.fullName,
          phoneE164: '+919999999999',
          role: user.role,
          organizationId: user.organizationId || TEST_ORG_ID,
          passwordHash: STATIC_TEST_PASSWORD_HASH,
          isActive: true,
        },
      });
    }

    isSeeded = true;
  } catch (err) {
    console.warn('[test-db] ensureTestOrganization warning:', err);
  }

  return { orgAId: TEST_ORG_ID, orgBId: TEST_ORG_B_ID };
}

export async function cleanupTestEntities(): Promise<void> {
  try {
    const leadIds = testCleanup.getRegistered('lead');
    const contactIds = testCleanup.getRegistered('contact');
    const projectIds = testCleanup.getRegistered('project');
    const dealIds = testCleanup.getRegistered('deal');
    const portalIds = testCleanup.getRegistered('portal');

    if (dealIds.length > 0) {
      await prisma.dealTransaction.deleteMany({ where: { id: { in: dealIds } } });
    }
    if (portalIds.length > 0) {
      await prisma.clientPortal.deleteMany({ where: { id: { in: portalIds } } });
    }
    if (leadIds.length > 0) {
      await prisma.lead.deleteMany({ where: { id: { in: leadIds } } });
    }
    if (contactIds.length > 0) {
      await prisma.contact.deleteMany({ where: { id: { in: contactIds } } });
    }
    if (projectIds.length > 0) {
      await prisma.developerProject.deleteMany({ where: { id: { in: projectIds } } });
    }

    testCleanup.clear();
  } catch (err) {
    console.warn('[test-db] Warning during cleanup:', err);
  }
}
