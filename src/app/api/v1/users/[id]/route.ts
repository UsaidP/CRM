import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole, orgScope } from '@/lib/services/api-auth';

export const dynamic = 'force-dynamic';

// Only Super Admins and Admins may deactivate/restore team members.
const MANAGEMENT_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const;

/**
 * DELETE /api/v1/users/[id] — remove a team member's access.
 *
 * Soft-delete: deactivates the account and clears any pending invite token,
 * preserving the user's historical lead/deal/visit records. Hard-deleting
 * would orphan or cascade those records.
 *
 * Guards:
 *  - caller must hold a management role in the SAME organization
 *  - a caller cannot remove themselves
 *  - the last active SUPER_ADMIN of an organization cannot be removed
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(req, [...MANAGEMENT_ROLES]);
    if (!auth.ok) return auth.response;
    const { session } = auth;

    const { id } = await params;

    const target = await prisma.user.findFirst({
      where: orgScope(session, { id }),
    });

    if (!target) {
      return NextResponse.json(
        { success: false, error: 'User not found in your organization' },
        { status: 404 }
      );
    }

    if (target.id === session.userId) {
      return NextResponse.json(
        { success: false, error: 'You cannot remove your own access' },
        { status: 400 }
      );
    }

    if (target.role === 'SUPER_ADMIN' && target.isActive) {
      const otherActiveSuperAdmins = await prisma.user.count({
        where: orgScope(session, {
          id: { not: target.id },
          role: 'SUPER_ADMIN',
          isActive: true,
        }),
      });
      if (otherActiveSuperAdmins === 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Cannot remove the last active Super Admin of the organization',
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        isActive: false,
        inviteToken: null,
        inviteTokenExpiresAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        fullName: updated.fullName,
        isActive: updated.isActive,
      },
      message: `${updated.fullName}'s access has been removed. Their history is preserved — restore access any time.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to remove user' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/users/[id] — restore a removed team member's access
 * (soft-delete undo).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(req, [...MANAGEMENT_ROLES]);
    if (!auth.ok) return auth.response;
    const { session } = auth;

    const { id } = await params;

    const target = await prisma.user.findFirst({
      where: orgScope(session, { id }),
    });

    if (!target) {
      return NextResponse.json(
        { success: false, error: 'User not found in your organization' },
        { status: 404 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { isActive: true },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        fullName: updated.fullName,
        isActive: updated.isActive,
      },
      message: `${updated.fullName}'s access has been restored. Generate a Set-Password link if they need a new one.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to restore user' },
      { status: 500 }
    );
  }
}
