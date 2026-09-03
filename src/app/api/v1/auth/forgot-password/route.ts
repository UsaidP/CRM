import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generateSecureToken } from '@/lib/services/auth-service';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/security/rate-limiter';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Enforce rate limiting: max 3 forgot-password requests per 15 min per IP
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`forgot:${clientIp}`, 3, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSec);
    }

    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email address is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    const genericSuccessResponse = {
      success: true,
      message: 'If an account exists with this email, instructions have been sent.',
    };

    if (!user) {
      // Return identical ambiguous message to prevent email enumeration
      return NextResponse.json(genericSuccessResponse);
    }

    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiresAt: expiresAt,
      },
    });

    const resetUrl = `/reset-password?token=${token}`;

    // In local development only, print the reset link to stdout for manual QA
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[DEV AUTH] Password reset link for ${user.email}: ${resetUrl}`);
    }

    // Security: NEVER expose the reset token or resetUrl in the HTTP response body
    return NextResponse.json(genericSuccessResponse);
  } catch (error: unknown) {
    console.error('[AUTH] Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process forgot password request' },
      { status: 500 }
    );
  }
}
