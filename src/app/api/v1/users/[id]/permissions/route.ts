import { NextResponse } from 'next/server';
import { requireRole, orgScope } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import { getUserEffectivePermissions } from '@/lib/domain/rbac-engine';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(req, [...ADMIN_ROLES]);
    if (!auth.ok) return auth.response;
    const { session } = auth;
    const { id } = await params;
    const body = await req.json();
    const { role, customPermissions, isActive, teamId } = body;

    const existingUser = await prisma.user.findFirst({
      where: orgScope(session, { id }),
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found in your organization' },
        { status: 404 }
      );
    }

    // 1. Safeguard: prevent accidental self-demotion / self-lockout
    if (existingUser.id === session.userId && role !== undefined && role !== existingUser.role) {
      return NextResponse.json(
        {
          success: false,
          error: 'You cannot change your own administrative role. Another administrator must modify your role to prevent accidental lockout.',
        },
        { status: 400 }
      );
    }

    // 2. Safeguard: prevent demoting the last active Super Admin
    if (existingUser.role === 'SUPER_ADMIN' && role !== undefined && role !== 'SUPER_ADMIN') {
      const otherSuperAdmins = await prisma.user.count({
        where: orgScope(session, {
          id: { not: existingUser.id },
          role: 'SUPER_ADMIN',
          isActive: true,
        }),
      });
      if (otherSuperAdmins === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot demote the last active Super Admin of the organization.',
          },
          { status: 400 }
        );
      }
    }

    // 3. Safeguard: prevent demoting the last administrator in the organization
    if (
      (existingUser.role === 'ADMIN' || existingUser.role === 'SUPER_ADMIN') &&
      role !== undefined &&
      role !== 'ADMIN' &&
      role !== 'SUPER_ADMIN'
    ) {
      const otherAdmins = await prisma.user.count({
        where: orgScope(session, {
          id: { not: existingUser.id },
          role: { in: ['SUPER_ADMIN', 'ADMIN'] },
          isActive: true,
        }),
      });
      if (otherAdmins === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot demote the last administrator of the organization. At least one active admin must remain.',
          },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (teamId !== undefined) updateData.teamId = teamId || null;
    if (customPermissions !== undefined) {
      updateData.customPermissionsJson = JSON.stringify(customPermissions);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        team: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        ...updatedUser,
        effectivePermissions: getUserEffectivePermissions(updatedUser),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update user permissions' },
      { status: 500 }
    );
  }
}
