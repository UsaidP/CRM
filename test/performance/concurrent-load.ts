import { ensureTestOrganization } from '../helpers/test-db';
import { TEST_ORG_ID, TEST_ORG_B_ID, createTestSessionCookie } from '../helpers/test-setup';
import { GET as getLeadsHandler, POST as postLeadHandler } from '@/app/api/v1/leads/route';
import { GET as getDealsHandler } from '@/app/api/v1/deals/route';
import { GET as getProjectsHandler } from '@/app/api/v1/inventory/projects/route';

interface RequestMetrics {
  endpoint: string;
  org: 'Org A' | 'Org B';
  method: string;
  status: number;
  durationMs: number;
  success: boolean;
  isolationValid: boolean;
  error?: string;
}

function computePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

export async function runConcurrentLoadTest(totalRequests: number = 100, concurrency: number = 50) {
  console.log('================================================================');
  console.log('  ZAMZAM CRM — MULTI-BROKER CONCURRENT LOAD & ISOLATION HARNESS  ');
  console.log('================================================================');
  console.log(`Target Concurrency: ${concurrency} Virtual Workers`);
  console.log(`Total Requests:     ${totalRequests}`);
  console.log(`Simulated Brokers:  Org A (${TEST_ORG_ID.slice(0, 12)}...) & Org B (${TEST_ORG_B_ID.slice(0, 12)}...)`);
  console.log('----------------------------------------------------------------\n');

  await ensureTestOrganization();

  // Create real session cookies for Org A and Org B users
  const orgACookie = await createTestSessionCookie('admin');
  const orgBCookie = await createTestSessionCookie('foreignOrgAgent');

  const metrics: RequestMetrics[] = [];
  const operations = [
    { type: 'READ_LEADS', endpoint: '/api/v1/leads?limit=10', weight: 40 },
    { type: 'READ_DEALS', endpoint: '/api/v1/deals', weight: 25 },
    { type: 'READ_PROJECTS', endpoint: '/api/v1/inventory/projects', weight: 20 },
    { type: 'CREATE_LEAD', endpoint: '/api/v1/leads', weight: 15 },
  ];

  let reqIndex = 0;
  const startTimestamp = performance.now();

  // Worker task queue
  async function worker(workerId: number) {
    while (true) {
      const currentReqNum = reqIndex++;
      if (currentReqNum >= totalRequests) break;

      // Alternate between Org A and Org B
      const isOrgA = currentReqNum % 2 === 0;
      const orgName = isOrgA ? 'Org A' : 'Org B';
      const cookie = isOrgA ? orgACookie : orgBCookie;
      const expectedOrgId = isOrgA ? TEST_ORG_ID : TEST_ORG_B_ID;

      // Select operation based on modulo
      const opIndex = currentReqNum % operations.length;
      const op = operations[opIndex];

      const reqStart = performance.now();
      let status = 0;
      let success = false;
      let isolationValid = true;
      let errMsg: string | undefined;

      try {
        if (op.type === 'READ_LEADS') {
          const req = new Request(`http://localhost:3000${op.endpoint}`, {
            headers: { cookie },
          });
          const res = await getLeadsHandler(req);
          status = res.status;
          const body = await res.json();
          success = status === 200 && body.success === true;

          // Cross-tenant leakage check under concurrent stress
          if (Array.isArray(body.data)) {
            for (const item of body.data) {
              if (item.organizationId && item.organizationId !== expectedOrgId) {
                isolationValid = false;
                errMsg = `CROSS_TENANT_LEAK: ${orgName} received lead belonging to ${item.organizationId}`;
                break;
              }
            }
          }
        } else if (op.type === 'READ_DEALS') {
          const req = new Request(`http://localhost:3000${op.endpoint}`, {
            headers: { cookie },
          });
          const res = await getDealsHandler(req);
          status = res.status;
          const body = await res.json();
          success = status === 200 && body.success === true;

          const deals = body.data || body.deals || [];
          if (Array.isArray(deals)) {
            for (const deal of deals) {
              if (deal.organizationId && deal.organizationId !== expectedOrgId) {
                isolationValid = false;
                errMsg = `CROSS_TENANT_LEAK: ${orgName} received deal belonging to ${deal.organizationId}`;
                break;
              }
            }
          }
        } else if (op.type === 'READ_PROJECTS') {
          const req = new Request(`http://localhost:3000${op.endpoint}`, {
            headers: { cookie },
          });
          const res = await getProjectsHandler(req);
          status = res.status;
          const body = await res.json();
          success = status === 200 && body.success === true;

          const projects = body.data || body.projects || [];
          if (Array.isArray(projects)) {
            for (const proj of projects) {
              if (proj.organizationId && proj.organizationId !== expectedOrgId) {
                isolationValid = false;
                errMsg = `CROSS_TENANT_LEAK: ${orgName} received project belonging to ${proj.organizationId}`;
                break;
              }
            }
          }
        } else if (op.type === 'CREATE_LEAD') {
          const req = new Request('http://localhost:3000/api/v1/leads', {
            method: 'POST',
            headers: { 'content-type': 'application/json', cookie },
            body: JSON.stringify({
              fullName: `Load Test ${orgName} #${currentReqNum}`,
              phone: `+9199${String(10000000 + currentReqNum).slice(-8)}`,
              leadSource: 'whatsapp_group',
              currentStage: 'new_uncontacted',
            }),
          });
          const res = await postLeadHandler(req);
          status = res.status;
          const body = await res.json();
          success = (status === 200 || status === 201) && body.success === true;

          if (!success) {
            errMsg = body?.error || `HTTP ${status}`;
          }

          if (body.data?.organizationId && body.data.organizationId !== expectedOrgId) {
            isolationValid = false;
            errMsg = `CROSS_TENANT_WRITE_LEAK: ${orgName} created lead with org ${body.data.organizationId}`;
          }
        }
      } catch (err: any) {
        status = 500;
        success = false;
        errMsg = err.message;
      }

      const durationMs = performance.now() - reqStart;
      metrics.push({
        endpoint: op.endpoint,
        org: orgName,
        method: op.type === 'CREATE_LEAD' ? 'POST' : 'GET',
        status,
        durationMs,
        success,
        isolationValid,
        error: errMsg,
      });

      process.stdout.write(`\r[Worker pool] Completed ${metrics.length}/${totalRequests} requests...`);
    }
  }

  // Launch virtual workers
  const workerPromises = Array.from({ length: Math.min(concurrency, totalRequests) }, (_, i) => worker(i));
  await Promise.all(workerPromises);

  const totalWallClock = performance.now() - startTimestamp;
  process.stdout.write('\n\n');

  // Compute metrics
  const durations = metrics.map((m) => m.durationMs).sort((a, b) => a - b);
  const successCount = metrics.filter((m) => m.success).length;
  const failureCount = metrics.filter((m) => !m.success).length;
  const isolationViolations = metrics.filter((m) => !m.isolationValid).length;

  const minDuration = durations[0] || 0;
  const maxDuration = durations[durations.length - 1] || 0;
  const avgDuration = durations.reduce((sum, d) => sum + d, 0) / (durations.length || 1);
  const p50 = computePercentile(durations, 50);
  const p90 = computePercentile(durations, 90);
  const p95 = computePercentile(durations, 95);
  const p99 = computePercentile(durations, 99);
  const rps = (totalRequests / (totalWallClock / 1000)).toFixed(2);

  console.log('================================================================');
  console.log('                     CONCURRENCY LOAD METRICS                    ');
  console.log('================================================================');
  console.log(`Total Requests Completed:   ${metrics.length}`);
  console.log(`Success Rate:               ${((successCount / metrics.length) * 100).toFixed(2)}% (${successCount}/${metrics.length})`);
  console.log(`HTTP Errors / Failures:     ${failureCount}`);
  console.log(`Cross-Tenant Violations:    ${isolationViolations} (CRITICAL ISOLATION CHECK)`);
  console.log(`Total Wall Clock:           ${(totalWallClock / 1000).toFixed(2)}s`);
  console.log(`Throughput:                 ${rps} requests/sec`);
  console.log('----------------------------------------------------------------');
  console.log(`Latency Breakdown:`);
  console.log(`  Min:                      ${minDuration.toFixed(2)}ms`);
  console.log(`  Average:                  ${avgDuration.toFixed(2)}ms`);
  console.log(`  p50 (Median):             ${p50.toFixed(2)}ms`);
  console.log(`  p90:                      ${p90.toFixed(2)}ms`);
  console.log(`  p95:                      ${p95.toFixed(2)}ms`);
  console.log(`  p99:                      ${p99.toFixed(2)}ms`);
  console.log(`  Max:                      ${maxDuration.toFixed(2)}ms`);
  if (failureCount > 0) {
    console.log('Failed Requests Breakdown:');
    metrics.filter((m) => !m.success).forEach((m, idx) => {
      console.log(`  [Fail #${idx + 1}] ${m.method} ${m.endpoint} -> Status ${m.status}: ${m.error}`);
    });
  }

  if (isolationViolations > 0) {
    console.error('CRITICAL DEFECT DETECTED: Cross-tenant data was exposed during concurrent load!');
    metrics.filter((m) => !m.isolationValid).forEach((m) => console.error(`  - ${m.error}`));
    throw new Error('CONCURRENT_LOAD_ISOLATION_FAILURE');
  }

  return {
    totalRequests,
    concurrency,
    successCount,
    failureCount,
    isolationViolations,
    rps: Number(rps),
    p50,
    p90,
    p95,
    p99,
  };
}

if (import.meta.main) {
  runConcurrentLoadTest(50, 25).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
