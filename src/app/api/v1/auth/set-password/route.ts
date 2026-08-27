import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/services/auth-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Activation token and password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        inviteToken: token,
        OR: [
          { inviteTokenExpiresAt: null },
          { inviteTokenExpiresAt: { gt: new Date() } },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired activation link. Please contact your Super Administrator.' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        inviteToken: null,
        inviteTokenExpiresAt: null,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Account activated for ${user.fullName}! You can now log in.`,
      email: user.email,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to activate account and set password' },
      { status: 500 }
    );
  }
}
