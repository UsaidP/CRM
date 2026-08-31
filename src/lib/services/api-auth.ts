import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  type SessionPayload,
} from '@/lib/services/auth-service';
import type { CrmRole, PermissionScope } from '@/types/crm';
import { PermissionKey } from '@/types/crm';
import { hasPermission, getPermissionScope } from '@/lib/domain/rbac-engine';
import { bindTenant } from '@/lib/db/tenant-context';
import { getTeamMemberIds } from '@/lib/services/team-service';

/**
 * Central API authentication & tenant-scoping guards.
 *
 * Usage in a route handler:
 *   const auth = await requireSession(req);
 *   if (!auth.ok) return auth.response;
 *   const { session } = auth;
 *
 * Then scope every Prisma query by session.organizationId (use orgScope()).
 */

export type ApiAuthResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse };

export type ApiAuthWithScopeResult =
  | { ok: true; session: SessionPayload; scope: PermissionScope }
  | { ok: false; response: NextResponse };

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return part.slice(idx + 1).trim();
      }
    }
  }
  return null;
}

export async function getSessionFromRequest(req: Request): Promise<SessionPayload | null> {
  const token = readCookie(req, SESSION_COOKIE_NAME);
  if (!token) return null;
  return verifySessionToken(token);
}

export function unauthorized(message = 'Authentication required'): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

export function forbidden(message = 'You do not have permission to perform this action'): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

/** Require a valid session cookie. Returns the session or a ready-to-return 401. */
export async function requireSession(req: Request): Promise<ApiAuthResult> {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return { ok: false, response: unauthorized() };
  }

  // Stale-session guard: if the session's organization no longer exists
  // (e.g. DB was re-seeded), the session cannot be trusted — force re-login.
  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
  });

  if (!org) {
    return {
      ok: false,
      response: unauthorized('Session is stale — please sign in again'),
    };
  }

  // Bind the tenant for the remainder of this request's async context so the
  // Prisma tenant guard (src/lib/db/tenant-guard.ts) auto-scopes every query.
  bindTenant(session.organizationId);

  return { ok: true, session };
}

/** Require a valid session whose role is one of the allowed roles. */
export async function requireRole(
  req: Request,
  allowedRoles: CrmRole[]
): Promise<ApiAuthResult> {
  const result = await requireSession(req);
  if (!result.ok) return result;
  if (!allowedRoles.includes(result.session.role)) {
    return { ok: false, response: forbidden() };
  }
  return result;
}

/** Require an authenticated Super Admin. */
export async function requireSuperAdmin(req: Request): Promise<ApiAuthResult> {
  const result = await requireSession(req);
  if (!result.ok) return result;
  if (!result.session.isSuperAdmin && result.session.role !== 'SUPER_ADMIN') {
    return { ok: false, response: forbidden('Super Admin access required') };
  }
  return result;
}

/**
 * Require an authenticated user holding a specific RBAC permission.
 *
 * This is the ONLY seam routes should use for permission checks — it
 * delegates to the rbac-engine matrix (role defaults + per-user custom
 * overrides). Prefer it over requireRole when the question is "may this
 * user do X" rather than "is this user role Y".
 */
export async function requirePermission(
  req: Request,
  permission: PermissionKey
): Promise<ApiAuthResult> {
  const result = await requireSession(req);
  if (!result.ok) return result;
  const { session } = result;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true, customPermissionsJson: true },
  });

  if (!hasPermission(user, permission)) {
    return { ok: false, response: forbidden(`Missing permission: ${permission}`) };
  }

  return result;
}

/**
 * Require a permission AND return the resolved scope for data filtering.
 *
 * Usage:
 *   const auth = await requirePermissionWithScope(req, 'leads:view_all');
 *   if (!auth.ok) return auth.response;
 *   const { session, scope } = auth;
 *   const where = await scopedLeadFilter(session, scope);
 */
export async function requirePermissionWithScope(
  req: Request,
  permission: PermissionKey
): Promise<ApiAuthWithScopeResult> {
  const result = await requireSession(req);
  if (!result.ok) return result;
  const { session } = result;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true, customPermissionsJson: true, teamId: true },
  });

  if (!hasPermission(user, permission)) {
    return { ok: false, response: forbidden(`Missing permission: ${permission}`) };
  }

  const scope = getPermissionScope(user, permission);

  return { ok: true, session: { ...session, teamId: user?.teamId }, scope };
}

/**
 * Build a Prisma where clause for leads based on scope.
 *
 * GLOBAL       → {} (no additional filter beyond org)
 * ORGANIZATION → { organizationId } (existing behavior)
 * TEAM         → assignedBrokerId IN [team member IDs]
 * OWN_AND_ASSIGNED → assignedBrokerId = userId OR has active LeadAssignment
 * OWN          → assignedBrokerId = userId
 */
export async function scopedLeadFilter(
  session: SessionPayload,
  scope: PermissionScope
): Promise<Record<string, unknown>> {
  const base: Record<string, unknown> = { organizationId: session.organizationId };

  switch (scope) {
    case 'GLOBAL':
    case 'ORGANIZATION':
      // Full org access — no additional filter
      return base;

    case 'TEAM': {
      const teamMemberIds = await getTeamMemberIds(session.userId);
      return {
        ...base,
        assignedBrokerId: { in: teamMemberIds },
      };
    }

    case 'OWN_AND_ASSIGNED': {
      return {
        ...base,
        OR: [
          { assignedBrokerId: session.userId },
          {
            assignments: {
              some: {
                userId: session.userId,
                unassignedAt: null,
              },
            },
          },
        ],
      };
    }

    case 'OWN':
    default:
      return {
        ...base,
        assignedBrokerId: session.userId,
      };
  }
}

/**
 * Multi-tenant scope helper. ALWAYS pass this into Prisma `where` clauses so
 * queries can never cross organization boundaries.
 *
 *   prisma.lead.findMany({ where: { ...orgScope(session), currentStage: 'NEW' } })
 */
export function orgScope(
  session: SessionPayload,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return { organizationId: session.organizationId, ...extra };
}

/**
 * Throws if a mutation targets a record outside the caller's organization.
 * Fetch the record first, then verify ownership before updating/deleting.
 */
export function assertSameOrganization(
  session: SessionPayload,
  recordOrganizationId: string | null | undefined
): void {
  if (!recordOrganizationId || recordOrganizationId !== session.organizationId) {
    throw new Error('FORBIDDEN_CROSS_TENANT');
  }
}