import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  createSessionToken,
  SESSION_MAX_AGE_SECONDS,
  type CrmRole
} from '@/lib/services/auth-service';
import { getUserEffectivePermissions } from '@/lib/domain/rbac-engine';

export const dynamic = 'force-dynamic';

/** Organization fields joined onto the session user response. */
const ORGANIZATION_SELECT = {
  select: {
    id: true,
    name: true,
    slug: true,
    reraBrokerRegistration: true,
  },
} as const;

const USER_INCLUDE = {
  organization: ORGANIZATION_SELECT,
  team: { select: { id: true, name: true } },
} as const;

/**
 * Session introspection endpoint.
 *
 * SECURITY POLICY (docs/adr/0001): sessions are ONLY minted by the login
 * routes. This endpoint verifies an existing session and, at most, refreshes
 * the cookie for an already-authenticated user whose id/org still resolves.
 * A missing, invalid, or stale token returns 401 — it must never fall back
 * to another user record or set a session cookie.
 */
export async function GET(req: Request) {
  try {
    let sessionCookie: string | undefined;

    if (req) {
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
      sessionCookie = match ? match[1] : undefined;
    }

    if (!sessionCookie) {
      try {
        const cookieStore = await cookies();
        sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      } catch {
        // Outside Next.js server context
      }
    }

    // No cookie or invalid signature → unauthenticated. Never fall back.
    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const payload = await verifySessionToken(sessionCookie);
    if (!payload || !payload.userId) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    // Fetch the up-to-date user record. If it no longer exists (e.g. DB
    // re-seeded), the session is stale — force re-login instead of minting
    // a session for a different user.
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: USER_INCLUDE,
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const isSuperAdmin =
      user.role === 'SUPER_ADMIN' ||
      (!!process.env.SUPER_ADMIN_EMAIL && user.email === process.env.SUPER_ADMIN_EMAIL);

    const res = NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneE164: user.phoneE164,
        role: user.role,
        teamId: user.teamId,
        team: user.team,
        isSuperAdmin,
        organization: user.organization,
        customPermissionsJson: user.customPermissionsJson,
        effectivePermissions: getUserEffectivePermissions(user),
      },
    });

    // Refresh the cookie for an already-valid session whose org binding, team,
    // or assigned role changed in the database. User identity never changes here.
    if (
      user.organizationId !== payload.organizationId ||
      user.teamId !== payload.teamId ||
      user.role !== payload.role
    ) {
      const newToken = await createSessionToken({
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role as CrmRole,
        organizationId: user.organizationId,
        teamId: user.teamId,
        isSuperAdmin,
      });

      res.cookies.set(SESSION_COOKIE_NAME, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE_SECONDS,
        path: '/',
      });
    }

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

