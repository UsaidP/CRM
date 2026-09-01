import { describe, it, expect, beforeAll } from 'bun:test';
import { GET as getLeadsHandler } from '@/app/api/v1/leads/route';
import { GET as getProjectsHandler } from '@/app/api/v1/inventory/projects/route';
import { ensureTestOrganization } from '../helpers/test-db';
import { createTestSessionCookie } from '../helpers/test-setup';
import { performance } from 'perf_hooks';

describe('Performance: API Latency & SLA Percentiles (p50/p95/p99)', () => {
  let adminCookie: string;

  beforeAll(async () => {
    await ensureTestOrganization();
    adminCookie = await createTestSessionCookie('admin');
  }, 30000);

  it('measures GET /api/v1/leads latency under SLA threshold', async () => {
    const latencies: number[] = [];
    const iterations = 5;

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const req = new Request('http://localhost:3000/api/v1/leads?page=1&limit=20', {
        headers: { cookie: adminCookie },
      });
      const res = await getLeadsHandler(req);
      const duration = performance.now() - start;
      expect(res.status).toBe(200);
      latencies.push(duration);
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(iterations * 0.50)];
    const p95 = latencies[Math.floor(iterations * 0.95)];

    console.log(`\n  ⚡ [Benchmark] GET /api/v1/leads -> p50: ${p50.toFixed(2)}ms | p95: ${p95.toFixed(2)}ms`);
    expect(p50).toBeLessThan(3000); // remote Supabase pooler SLA
  }, 30000);

  it('measures GET /api/v1/inventory/projects latency under SLA threshold', async () => {
    const latencies: number[] = [];
    const iterations = 5;

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const req = new Request('http://localhost:3000/api/v1/inventory/projects', {
        headers: { cookie: adminCookie },
      });
      const res = await getProjectsHandler(req);
      const duration = performance.now() - start;
      expect(res.status).toBe(200);
      latencies.push(duration);
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(iterations * 0.50)];
    const p95 = latencies[Math.floor(iterations * 0.95)];

    console.log(`  ⚡ [Benchmark] GET /api/v1/inventory/projects -> p50: ${p50.toFixed(2)}ms | p95: ${p95.toFixed(2)}ms`);
    expect(p50).toBeLessThan(3000);
  }, 30000);
});
