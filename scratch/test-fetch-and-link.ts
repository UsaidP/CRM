import { ensureTestOrganization } from '../test/helpers/test-db';
import { TEST_ORG_ID, createTestSessionCookie } from '../test/helpers/test-setup';
import { POST as fetchCertHandler } from '@/app/api/v1/inventory/rera/fetch-certificate/route';
import { prisma } from '@/lib/db/prisma';

async function main() {
  await ensureTestOrganization();
  const adminCookie = await createTestSessionCookie('admin');

  const targetProjectId = '2cb65a43-4680-4ce8-9b26-200906936f74';
  const crossTenantProjectId = '526e2492-7704-4f3b-93bb-9afd16705966';

  console.log('--- 1. Calling POST /api/v1/inventory/rera/fetch-certificate with authentic RERA P51700000002 ---');
  const req = new Request('http://localhost:3000/api/v1/inventory/rera/fetch-certificate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: adminCookie,
    },
    body: JSON.stringify({
      reraNumber: 'P51700000002',
      projectId: targetProjectId,
      projectName: 'UNNATHI WOODS PHASE VII A',
    }),
  });

  const start = performance.now();
  const res = await fetchCertHandler(req);
  const duration = performance.now() - start;
  const status = res.status;
  const json = await res.json();

  console.log(`HTTP Status: ${status} (${duration.toFixed(0)}ms)`);
  console.log('Response body:', JSON.stringify(json, null, 2));

  console.log('\n--- 2. Verifying Database Record for Target Project ---');
  const project = await prisma.developerProject.findUnique({
    where: { id: targetProjectId },
    select: {
      id: true,
      projectName: true,
      reraNumber: true,
      reraCertificateUrl: true,
      reraRegisteredName: true,
      reraProjectStatus: true,
      reraVerificationDate: true,
    },
  });
  console.log('Database Project Record:', JSON.stringify(project, null, 2));

  console.log('\n--- 3. Testing Cross-Tenant Guard on Project Linking ---');
  // Attempt linking to project in different org
  const crossTenantReq = new Request('http://localhost:3000/api/v1/inventory/rera/fetch-certificate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: adminCookie,
    },
    body: JSON.stringify({
      reraNumber: 'P51700000002',
      projectId: crossTenantProjectId,
      projectName: 'Cross Tenant Attempt',
    }),
  });

  const crossRes = await fetchCertHandler(crossTenantReq);
  console.log(`Cross-tenant attempt status: ${crossRes.status}`);
  const otherProject = await prisma.developerProject.findUnique({
    where: { id: crossTenantProjectId },
    select: { id: true, reraCertificateUrl: true, organizationId: true },
  });
  console.log('Cross-tenant project after attempt (should be unchanged):', JSON.stringify(otherProject, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
