import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole, orgScope } from '@/lib/services/api-auth';

export const dynamic = 'force-dynamic';

// Only Super Admins and Admins (Admin and above) may deactivate, restore, or delete team members.
const MANAGEMENT_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const;

/**
 * DELETE /api/v1/users/[id] — Permanently delete a team member.
 *
 * Cleans up foreign keys and assignments across the organization,
 * cascades broker phone numbers, and deletes the user record from the database.
 *
 * Guards:
 *  - Caller must hold a management role (Super Admin, Admin) in the SAME organization
 *  - A caller cannot delete their own account
 *  - The last Super Admin of an organization cannot be deleted
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
        { success: false, error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    if (target.role === 'SUPER_ADMIN') {
      const otherSuperAdmins = await prisma.user.count({
        where: orgScope(session, {
          id: { not: target.id },
          role: 'SUPER_ADMIN',
        }),
      });
      if (otherSuperAdmins === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot delete the last Super Admin of the organization',
          },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete broker phone numbers (also covered by cascade)
      await tx.brokerPhoneNumber.deleteMany({
        where: { brokerId: target.id },
      });

      // 2. Clean up lead assignments
      await tx.leadAssignment.deleteMany({
        where: { userId: target.id },
      });
      await tx.leadAssignment.updateMany({
        where: { assignedById: target.id },
        data: { assignedById: null },
      });

      // 3. Unassign contacts & leads
      await tx.contact.updateMany({
        where: { assignedBrokerId: target.id },
        data: { assignedBrokerId: null },
      });
      await tx.lead.updateMany({
        where: { assignedBrokerId: target.id },
        data: { assignedBrokerId: null },
      });

      // 4. Unassign site visits & deal transactions
      await tx.siteVisit.updateMany({
        where: { assignedBrokerId: target.id },
        data: { assignedBrokerId: null },
      });
      await tx.dealTransaction.updateMany({
        where: { closingBrokerId: target.id },
        data: { closingBrokerId: null },
      });

      // 5. Unassign campaigns, portals, merges, units, and teams
      await tx.inboundCampaign.updateMany({
        where: { assignedBrokerId: target.id },
        data: { assignedBrokerId: null },
      });
      await tx.clientPortal.updateMany({
        where: { createdById: target.id },
        data: { createdById: null },
      });
      await tx.contactMergeAudit.updateMany({
        where: { mergedByUserId: target.id },
        data: { mergedByUserId: null },
      });
      await tx.propertyUnit.updateMany({
        where: { verifiedByUserId: target.id },
        data: { verifiedByUserId: null },
      });
      await tx.inventoryAuditLog.deleteMany({
        where: { auditorUserId: target.id },
      });
      await tx.team.updateMany({
        where: { managerId: target.id },
        data: { managerId: null },
      });

      // 6. Delete the user record
      await tx.user.delete({
        where: { id: target.id },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Team member ${target.fullName} has been permanently deleted.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/users/[id] — update team member status (deactivate or restore access).
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

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty if callers pass no body
    }

    const nextIsActive = body.isActive !== undefined ? Boolean(body.isActive) : !target.isActive;

    if (!nextIsActive && target.id === session.userId) {
      return NextResponse.json(
        { success: false, error: 'You cannot deactivate your own access' },
        { status: 400 }
      );
    }

    if (!nextIsActive && target.role === 'SUPER_ADMIN' && target.isActive) {
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
            error: 'Cannot deactivate the last active Super Admin of the organization',
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        isActive: nextIsActive,
        ...(nextIsActive ? {} : { inviteToken: null, inviteTokenExpiresAt: null }),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        fullName: updated.fullName,
        isActive: updated.isActive,
      },
      message: nextIsActive
        ? `${updated.fullName}'s access has been restored.`
        : `${updated.fullName}'s access has been deactivated. Their history is preserved — restore access any time.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update user status' },
      { status: 500 }
    );
  }
}
