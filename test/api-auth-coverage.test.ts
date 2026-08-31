import { describe, it, expect } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Auth coverage invariant (see docs/auth-coverage.md):
 * every API route handler must either call an auth guard
 * (requireSession / requireRole / requireSuperAdmin) or appear on the
 * explicit public allow-list below. Routes that fail this test either
 * need a guard added or need to be consciously allow-listed.
 */

const API_ROOT = join(process.cwd(), 'src', 'app', 'api');

/** Route paths that are public BY DESIGN (each must verify its own credential). */
const PUBLIC_ALLOW_LIST = [
  // Auth endpoints are the credential issuers themselves
  'auth/login',
  'auth/logout',
  'auth/session',
  'auth/forgot-password',
  'auth/reset-password',
  'auth/set-password',
  // Liveness probe
  'health',
  // Inbound webhooks (must verify provider signatures in-handler)
  'webhooks/telephony',
  'webhooks/whatsapp',
  'webhooks/instagram',
  // Public client portals + tracking pixels (token-authenticated in-handler)
  'portals/[token]',
  'portals/[token]/telemetry',
  'track/[slug]',
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

describe('API auth coverage', () => {
  const routes = listRouteFiles(API_ROOT);

  it('found a plausible number of routes', () => {
    expect(routes.length).toBeGreaterThan(40);
  });

  it('every route is either guarded or explicitly allow-listed', () => {
    const unguarded = routes.filter((route) => {
      const src = readFileSync(join(API_ROOT, route, 'route.ts'), 'utf8');
      const hasGuard =
        src.includes('requireSession') ||
        src.includes('requireRole') ||
        src.includes('requireSuperAdmin') ||
        src.includes('requirePermission') ||
        src.includes('requirePermissionWithScope');
      const isPublic = PUBLIC_ALLOW_LIST.some(
        (p) => route === p || route === `v1/${p}`
      );
      return !hasGuard && !isPublic;
    });
    expect(unguarded).toEqual([]);
  });
});
