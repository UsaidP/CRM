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

const USER_INCLUDE = { organization: ORGANIZATION_SELECT } as const;

/**
 * Session introspection endpoint.
 *
 * SECURITY POLICY (docs/adr/0001): sessions are ONLY minted by the login
 * routes. This endpoint verifies an existing session and, at most, refreshes
 * the cookie for an already-authenticated user whose id/org still resolves.
 * A missing, invalid, or stale token returns 401 — it must never fall back
 * to another user record or set a session cookie.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    // No cookie or invalid signature → unauthenticated. Never fall back.
    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const payload = await verifySessionToken(sessionCookie);
    if (!payload) {
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
        isSuperAdmin,
        organization: user.organization,
        customPermissionsJson: user.customPermissionsJson,
        effectivePermissions: getUserEffectivePermissions(user),
      },
    });

    // Refresh the cookie only for an already-valid session whose org binding
    // changed (e.g. user moved organizations). User identity never changes here.
    if (user.organizationId !== payload.organizationId) {
      const newToken = await createSessionToken({
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role as CrmRole,
        organizationId: user.organizationId,
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

