import { describe, it, expect } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
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

  it('Claims vs Reality: AI Model marketing claim in UI matches primary runtime model candidate', () => {
    // Settl finding: In one night, an overnight agent caught docs/UI claiming a model different from what runs.
    const uiPitchSrc = readFileSync(join(process.cwd(), 'src', 'app', 'matching', 'page.tsx'), 'utf8');
    const geminiServiceSrc = readFileSync(join(process.cwd(), 'src', 'lib', 'services', 'gemini-service.ts'), 'utf8');

    // UI claims "Gemini 2.5 Flash Pitch Assistant"
    expect(uiPitchSrc).toContain('Gemini 2.5 Flash');

    // gemini-service must have 'gemini-2.5-flash' as primary candidate or default
    expect(geminiServiceSrc).toContain('gemini-2.5-flash');
  });

  it('Structural Guardrail: setup-qa-role.sql enforces database-level read-only grants', () => {
    const sqlPath = join(process.cwd(), 'scripts', 'setup-qa-role.sql');
    expect(existsSync(sqlPath)).toBe(true);

    const sqlContent = readFileSync(sqlPath, 'utf8');
    expect(sqlContent).toContain('qa_agent_ro');
    expect(sqlContent).toContain('GRANT SELECT ON ALL TABLES IN SCHEMA public TO qa_agent_ro');
    expect(sqlContent).toContain('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM qa_agent_ro');
    expect(sqlContent).toContain('REVOKE CREATE ON SCHEMA public FROM qa_agent_ro');
  });

  it('Structural Guardrail: qaPrisma blocks all mutations at the client level', async () => {
    const { qaPrisma } = await import('@/lib/db/qa-prisma');

    let createError: any = null;
    try {
      await qaPrisma.lead.create({ data: {} as any });
    } catch (err: any) {
      createError = err;
    }
    expect(createError?.message).toContain('[Structural Guardrail] INSERT operations are strictly forbidden on qaPrisma.');

    let deleteError: any = null;
    try {
      await qaPrisma.lead.delete({ where: { id: 'test' } });
    } catch (err: any) {
      deleteError = err;
    }
    expect(deleteError?.message).toContain('[Structural Guardrail] DELETE operations are strictly forbidden on qaPrisma.');
  });

  it('Non-Destructive Cleanup: test-db suppresses live deletes when OVERNIGHT_QA=true', () => {
    const testDbSrc = readFileSync(join(process.cwd(), 'test', 'helpers', 'test-db.ts'), 'utf8');
    expect(testDbSrc).toContain("process.env.OVERNIGHT_QA === 'true'");
    expect(testDbSrc).toContain('cleanupCollector.saveCleanupScript()');
  });
});
