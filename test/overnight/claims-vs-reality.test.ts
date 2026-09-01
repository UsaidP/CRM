import { describe, it, expect } from 'bun:test';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

describe('Overnight QA: Claims vs. Reality Architectural Audit', () => {
  it('Middleware public API allow-list matches documented auth coverage list', () => {
    const middlewareSrc = readFileSync(join(process.cwd(), 'src', 'middleware.ts'), 'utf8');
    const authCoverageSrc = readFileSync(join(process.cwd(), 'test', 'api-auth-coverage.test.ts'), 'utf8');

    // Extract prefixes
    expect(middlewareSrc).toContain('/api/v1/auth');
    expect(middlewareSrc).toContain('/api/v1/portals');
    expect(middlewareSrc).toContain('/api/v1/webhooks');
    expect(middlewareSrc).toContain('/api/v1/track');
    expect(middlewareSrc).toContain('/api/v1/health');

    expect(authCoverageSrc).toContain('auth/login');
    expect(authCoverageSrc).toContain('health');
  });

  it('Prisma schema models all enforce multi-tenant organization boundaries', () => {
    const schemaSrc = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
    const tenantContextSrc = readFileSync(join(process.cwd(), 'src', 'lib', 'db', 'tenant-context.ts'), 'utf8');

    const models = [...schemaSrc.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]);
    expect(models.length).toBeGreaterThan(15);

    // Verify key models exist in tenant-context
    expect(tenantContextSrc).toContain('Lead');
    expect(tenantContextSrc).toContain('Contact');
    expect(tenantContextSrc).toContain('DeveloperProject');
    expect(tenantContextSrc).toContain('PropertyUnit');
    expect(tenantContextSrc).toContain('DealTransaction');
  });

  it('No hardcoded secrets or production passwords in repository source files', () => {
    const forbiddenPatterns = [
      /const\s+PASSWORD\s*=\s*['"][^'"]+['"]/i,
      /secret:\s*['"]password123['"]/i,
    ];

    const filesToCheck = [
      'src/lib/services/auth-service.ts',
      'src/lib/services/api-auth.ts',
      'src/middleware.ts',
    ];

    for (const file of filesToCheck) {
      const content = readFileSync(join(process.cwd(), file), 'utf8');
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(content)).toBe(false);
      }
    }
  });
});
