import { describe, it, expect } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Systematic API Authorization & Tenant Guard Invariant Test:
 * 
 * Asserts that:
 * 1. Every mutating API route handler (POST, PATCH, PUT, DELETE) across src/app/api
 *    invokes an authentication/authorization seam (requireSession, requireRole,
 *    requireSuperAdmin, requirePermission, requirePermissionWithScope) unless
 *    it appears on the explicit public allow-list.
 * 2. High-privilege administrative or financial mutation endpoints enforce strict
 *    role or RBAC permission checks rather than generic un-permissioned access.
 * 3. Every non-public route handler ensures tenant-scoping is bound and active.
 */

const API_ROOT = join(process.cwd(), 'src', 'app', 'api');

const PUBLIC_MUTATION_ALLOW_LIST = [
  'v1/auth/login',
  'v1/auth/logout',
  'v1/auth/forgot-password',
  'v1/auth/reset-password',
  'v1/auth/set-password',
  'v1/webhooks/telephony',
  'v1/webhooks/whatsapp',
  'v1/webhooks/instagram',
  'v1/portals/[token]/telemetry',
];

function listRouteFiles(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = prefix ? `${prefix}/${entry}` : entry;
    if (statSync(full).isDirectory()) {
      out.push(...listRouteFiles(full, rel));
    } else if (entry === 'route.ts') {
      out.push(rel.replace(/\/route\.ts$/, ''));
    }
  }
  return out;
}

describe('API Authorization & Tenant Guard Systematic Coverage', () => {
  const routes = listRouteFiles(API_ROOT);

  it('scans all registered API routes', () => {
    expect(routes.length).toBeGreaterThan(40);
  });

  it('every mutating route (POST/PATCH/PUT/DELETE) is authenticated or explicitly allow-listed', () => {
    const unauthenticatedMutations: { route: string; method: string }[] = [];

    for (const route of routes) {
      const src = readFileSync(join(API_ROOT, route, 'route.ts'), 'utf8');
      const mutatingMethods = ['POST', 'PATCH', 'PUT', 'DELETE'].filter((m) =>
        new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b`).test(src)
      );

      const isPublic = PUBLIC_MUTATION_ALLOW_LIST.includes(route);

      for (const method of mutatingMethods) {
        const hasAuth =
          src.includes('requireSession') ||
          src.includes('requireRole') ||
          src.includes('requireSuperAdmin') ||
          src.includes('requirePermission') ||
          src.includes('requirePermissionWithScope');

        if (!hasAuth && !isPublic) {
          unauthenticatedMutations.push({ route, method });
        }
      }
    }

    expect(unauthenticatedMutations).toEqual([]);
  });

  it('financial and deal mutating endpoints enforce strict RBAC permissions', () => {
    const dealsRoute = readFileSync(join(API_ROOT, 'v1', 'deals', 'route.ts'), 'utf8');
    expect(dealsRoute).toContain("requirePermissionWithScope(req, 'deals:create')");

    const dealIdRoute = readFileSync(join(API_ROOT, 'v1', 'deals', '[id]', 'route.ts'), 'utf8');
    expect(dealIdRoute).toContain("requirePermissionWithScope(req, 'deals:advance_stage')");
  });

  it('user management mutating endpoints enforce administrative role gating', () => {
    const usersRoute = readFileSync(join(API_ROOT, 'v1', 'users', 'route.ts'), 'utf8');
    expect(usersRoute).toContain('requireRole(req, [...ADMIN_ROLES])');

    const inviteRoute = readFileSync(join(API_ROOT, 'v1', 'users', '[id]', 'invite', 'route.ts'), 'utf8');
    expect(inviteRoute).toContain('requireRole(req, [...ADMIN_ROLES])');

    const usersIdRoute = readFileSync(join(API_ROOT, 'v1', 'users', '[id]', 'route.ts'), 'utf8');
    expect(usersIdRoute).toContain('requireRole(req, [...MANAGEMENT_ROLES])');
  });

  it('no route handler accesses tenant-scoped models via findUnique without tenant filter', () => {
    // Models that are tenant-scoped:
    const scopedEntities = [
      'lead',
      'contact',
      'clientPortal',
      'dealTransaction',
      'propertyUnit',
      'developerProject',
      'siteVisit',
      'leadReminder',
      'communicationLog',
    ];

    const violations: { route: string; violation: string }[] = [];

    for (const route of routes) {
      if (PUBLIC_MUTATION_ALLOW_LIST.includes(route)) continue;
      const src = readFileSync(join(API_ROOT, route, 'route.ts'), 'utf8');

      for (const entity of scopedEntities) {
        // Look for prisma.<entity>.findUnique
        const regex = new RegExp(`prisma\\.${entity}\\.findUnique\\s*\\(`, 'g');
        if (regex.test(src)) {
          violations.push({
            route,
            violation: `Calls prisma.${entity}.findUnique directly instead of findFirst with orgScope`,
          });
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
