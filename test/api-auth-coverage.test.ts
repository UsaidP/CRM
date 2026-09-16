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

import { PUBLIC_API_ALLOW_LIST } from '@/lib/constants/public-routes';

const API_ROOT = join(process.cwd(), 'src', 'app', 'api');

/** Route paths that are public BY DESIGN (such as auth/login, health, etc.). */
const PUBLIC_ALLOW_LIST = [...PUBLIC_API_ALLOW_LIST];

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
