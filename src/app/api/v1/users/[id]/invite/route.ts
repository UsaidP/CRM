import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import { generateSecureToken } from '@/lib/services/auth-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const inviteToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.user.update({
      where: { id: user.id },
      data: {
        inviteToken,
        inviteTokenExpiresAt: expiresAt,
      },
    });

    const inviteUrl = `/set-password?token=${inviteToken}`;

    return NextResponse.json({
      success: true,
      message: `Generated fresh activation link for ${user.fullName}`,
      inviteToken,
      inviteUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to generate invitation link' },
      { status: 500 }
    );
  }
}
