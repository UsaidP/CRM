import { NextResponse } from 'next/server';
import { requireRole, orgScope } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import { generateSecureToken, hashToken } from '@/lib/services/auth-service';
import { handleApiError } from '@/lib/services/api-handler';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(req, [...ADMIN_ROLES]);
    if (!auth.ok) return auth.response;
    const { session } = auth;
    const { id } = await params;
    const user = await prisma.user.findFirst({
      where: orgScope(session, { id }),
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
        inviteToken: hashToken(inviteToken),
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
  } catch (error) {
    return handleApiError(error, 'Failed to generate invitation link');
  }
}
