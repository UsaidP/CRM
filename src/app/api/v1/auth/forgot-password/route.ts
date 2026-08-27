import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generateSecureToken } from '@/lib/services/auth-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email address is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Return ambiguous message for security or explicit for dev
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been generated.',
      });
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

    return NextResponse.json({
      success: true,
      message: 'Password reset link has been generated successfully.',
      resetUrl,
      email: user.email,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process forgot password request' },
      { status: 500 }
    );
  }
}
