import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  type SessionPayload,
} from '@/lib/services/auth-service';
import type { CrmRole } from '@/types/crm';

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