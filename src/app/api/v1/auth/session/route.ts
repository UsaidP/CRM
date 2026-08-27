import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/services/auth-service';
import { getUserEffectivePermissions } from '@/lib/domain/rbac-engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    const payload = await verifySessionToken(sessionCookie);
    if (!payload) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    // Fetch up-to-date user record from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            reraBrokerRegistration: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    return NextResponse.json({
      success: true,
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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch session' },
      { status: 500 }
    );
  }
}
