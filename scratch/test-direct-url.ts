import { PrismaClient } from '@prisma/client';
import { TEST_ORG_ID } from '../test/helpers/test-setup';

interface QueryEvent {
  query: string;
  params: string;
  duration: number;
  timestamp: Date;
}

async function main() {
  const directUrl = process.env.DIRECT_URL;
  console.log('Testing DIRECT_URL (Port 5432) Query Performance...');
  console.log('DIRECT_URL host:', directUrl?.replace(/:[^:@]*@/, ':***@'));

  const queryEvents: QueryEvent[] = [];
  const directPrisma = new PrismaClient({
    datasourceUrl: directUrl,
    log: [{ emit: 'event', level: 'query' }],
  });

  (directPrisma as any).$on('query', (e: QueryEvent) => {
    queryEvents.push(e);
  });

  const start = performance.now();
  const [total, leads] = await Promise.all([
    directPrisma.lead.count({
      where: { organizationId: TEST_ORG_ID },
    }),
    directPrisma.lead.findMany({
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

  const wallClock = performance.now() - start;
  const dbDurationTotal = queryEvents.reduce((acc, q) => acc + q.duration, 0);

  console.log(`\nDirect Connection (Port 5432) Results:`);
  console.log(`Total Queries Executed: ${queryEvents.length}`);
  queryEvents.forEach((q, idx) => {
    console.log(`  [Query #${idx + 1}] DB Duration: ${q.duration}ms | Table/Action: ${q.query.slice(0, 80)}...`);
  });
  console.log(`\nAggregate:`);
  console.log(`  Total DB Engine Duration: ${dbDurationTotal}ms`);
  console.log(`  Total Wall-Clock Time: ${wallClock.toFixed(2)}ms`);

  await directPrisma.$disconnect();
}

main().catch(console.error);
