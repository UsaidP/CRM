import { PrismaClient } from '@prisma/client';
import { runWithTenant } from '@/lib/db/tenant-context';
import { ensureTestOrganization } from '../test/helpers/test-db';
import { TEST_ORG_ID } from '../test/helpers/test-setup';
import { GET as getLeadsHandler } from '@/app/api/v1/leads/route';
import { GET as getProjectsHandler } from '@/app/api/v1/inventory/projects/route';
import { createTestSessionCookie } from '../test/helpers/test-setup';

interface QueryEvent {
  query: string;
  params: string;
  duration: number;
  timestamp: Date;
}

async function main() {
  await ensureTestOrganization();
  const adminCookie = await createTestSessionCookie('admin');

  const queryEvents: QueryEvent[] = [];
  const instrumentedPrisma = new PrismaClient({
    log: [{ emit: 'event', level: 'query' }],
  });

  (instrumentedPrisma as any).$on('query', (e: QueryEvent) => {
    queryEvents.push(e);
  });

  console.log('--- 1. Direct Prisma Query Duration for Lead Index Test ---');
  // Clear events
  queryEvents.length = 0;
  const directStart = performance.now();

  const [total, leads] = await Promise.all([
    instrumentedPrisma.lead.count({
      where: { organizationId: TEST_ORG_ID },
    }),
    instrumentedPrisma.lead.findMany({
      relationLoadStrategy: 'join',
      where: { organizationId: TEST_ORG_ID },
      skip: 0,
      take: 20,
      include: {
        contact: { include: { identities: true } },
        campaign: {
          select: { id: true, campaignName: true, channelType: true, customSlug: true, sourceCode: true },
        },
        assignedBroker: {
          select: { id: true, fullName: true, email: true, phoneE164: true },
        },
        requirements: true,
        communications: { orderBy: { createdAt: 'desc' }, take: 5 },
        portals: { include: { telemetryLogs: true } },
        reminders: { orderBy: { dueAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const directWallClock = performance.now() - directStart;
  const directDbDurationTotal = queryEvents.reduce((acc, q) => acc + q.duration, 0);

  console.log(`Direct Prisma Queries Executed: ${queryEvents.length}`);
  queryEvents.forEach((q, idx) => {
    console.log(`  [Query #${idx + 1}] DB Duration: ${q.duration}ms | Table/Action: ${q.query.slice(0, 80)}...`);
  });
  console.log(`\nDirect Lead Query Aggregate:`);
  console.log(`  Total DB Engine Duration (sum): ${directDbDurationTotal}ms`);
  console.log(`  Total Wall-Clock Time: ${directWallClock.toFixed(2)}ms`);
  console.log(`  Network / Transport Overhead: ${(directWallClock - directDbDurationTotal).toFixed(2)}ms (${(((directWallClock - directDbDurationTotal) / directWallClock) * 100).toFixed(1)}%)`);

  console.log('\n--- 2. Full HTTP Handler: GET /api/v1/leads ---');
  const reqLeads = new Request('http://localhost:3000/api/v1/leads?page=1&limit=20', {
    headers: { cookie: adminCookie },
  });
  const handlerStart = performance.now();
  const resLeads = await getLeadsHandler(reqLeads);
  const handlerWallClock = performance.now() - handlerStart;
  console.log(`HTTP GET /api/v1/leads status: ${resLeads.status} in ${handlerWallClock.toFixed(2)}ms`);

  console.log('\n--- 3. Full HTTP Handler: GET /api/v1/inventory/projects ---');
  const reqProjects = new Request('http://localhost:3000/api/v1/inventory/projects', {
    headers: { cookie: adminCookie },
  });
  const projStart = performance.now();
  const resProjects = await getProjectsHandler(reqProjects);
  const projWallClock = performance.now() - projStart;
  console.log(`HTTP GET /api/v1/inventory/projects status: ${resProjects.status} in ${projWallClock.toFixed(2)}ms`);

  await instrumentedPrisma.$disconnect();
}

main().catch(console.error);
