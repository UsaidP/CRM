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
