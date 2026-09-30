import { NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/services/otp-service';
import { normalizePhoneE164 } from '@/lib/domain/phone-normalizer';
import { prisma } from '@/lib/db/prisma';
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from '@/lib/services/auth-service';
import { getUserEffectivePermissions } from '@/lib/domain/rbac-engine';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/security/rate-limiter';
import type { CrmRole } from '@/types/crm';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/auth/otp/verify
 *
 * Verifies the OTP and creates a session.
 * Rate limited: 10 verify attempts per IP per 15 minutes.
 *
 * Request body:
 *   { phone: "+917977552011", otp: "482913" }
 *   { phone: "+917977552011", otp: "482913", returnToken: true }  ← for mobile apps
 *
 * Response (web — sets httpOnly cookie):
 *   { success: true, user: { ... } }
 *
 * Response (mobile — returnToken: true):
 *   { success: true, user: { ... }, token: "eyJ..." }
 */
export async function POST(req: Request) {
  try {
    // 1. Rate limit by IP — 10 verify attempts per 15 minutes
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`otp-verify:${clientIp}`, 10, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSec);
    }

    const body = await req.json();
    const { phone, otp, returnToken } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    if (!otp || typeof otp !== 'string' || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid 6-digit OTP' },
        { status: 400 }
      );
    }

    // 2. Normalize phone
    const phoneE164 = normalizePhoneE164(phone);
    if (!phoneE164) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // 3. Verify OTP
    const result = await verifyOtp(phoneE164, otp, 'LOGIN');

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    // 4. Fetch user to create session
    const bareDigits = phoneE164.replace(/^\+91/, '');
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phoneE164 },
          { phoneE164: bareDigits },
        ],
        isActive: true,
      },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        team: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No active account found for this phone number.' },
        { status: 401 }
      );
    }

    // 5. Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 6. Create session token
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    const sessionToken = await createSessionToken({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as CrmRole,
      organizationId: user.organizationId,
      teamId: user.teamId,
      isSuperAdmin,
    });

    const userData = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phoneE164: user.phoneE164,
      role: user.role,
      teamId: user.teamId,
      team: user.team,
      isSuperAdmin,
      organization: user.organization,
      effectivePermissions: getUserEffectivePermissions(user),
    };

    // 7. For mobile apps: return token in body (no cookie)
    if (returnToken) {
      return NextResponse.json({
        success: true,
        user: userData,
        token: sessionToken,
      });
    }

    // 8. For web: set httpOnly cookie
    const response = NextResponse.json({
      success: true,
      user: userData,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error: any) {
    console.error('[AUTH] OTP verify error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed. Please try again.' },
      { status: 500 }
    );
  }
}
