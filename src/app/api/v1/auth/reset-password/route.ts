import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/services/auth-service';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/security/rate-limiter';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Enforce rate limiting: max 5 reset attempts per 15 min per IP
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`reset:${clientIp}`, 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSec);
    }

    const body = await req.json().catch(() => ({}));
    const { token, newPassword } = body;

    if (!token || !newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    // 2. Production password policy: min 10 chars, with uppercase, lowercase, and numeric characters
    const hasLength = newPassword.length >= 10;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasDigit = /[0-9]/.test(newPassword);

    if (!hasLength || !hasUpper || !hasLower || !hasDigit) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Password must be at least 10 characters long and include uppercase, lowercase, and numeric characters.',
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired password reset link. Please request a new one.' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error: unknown) {
    console.error('[AUTH] Reset password error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
