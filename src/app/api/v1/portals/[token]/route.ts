import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { parseInventoryContent } from '@/lib/inventory-media';
import { requirePermissionWithScope, forbidden } from '@/lib/services/api-auth';
import { getTeamMemberIds } from '@/lib/services/team-service';
import { handleApiError } from '@/lib/services/api-handler';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const portal = await prisma.clientPortal.findFirst({
      where: { token },
      include: {
        organization: {
          select: {
            name: true,
            slug: true,
            reraBrokerRegistration: true,
          },
        },
        lead: {
          select: {
            id: true,
            fullName: true,
          },
        },
        createdBy: {
          select: {
            fullName: true,
            phoneE164: true,
          },
        },
        portalUnits: {
          orderBy: { displayOrder: 'asc' },
          include: {
            propertyUnit: {
              include: {
                project: true,
              },
            },
          },
        },
      },
    });

    if (!portal || !portal.isActive || (portal.expiresAt && portal.expiresAt < new Date())) {
      return NextResponse.json(
        { success: false, error: 'Portal not found or has expired' },
        { status: 404 }
      );
    }

    // Increment portal view counter
    await prisma.clientPortal.update({
      where: { id: portal.id },
      data: {
        totalViews: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });

    // Format units photoGallery JSON
    const formattedUnits = portal.portalUnits.map((pu) => {
      const project = parseInventoryContent(pu.propertyUnit.project);
      const propertyUnit = parseInventoryContent(pu.propertyUnit);
      return {
      ...pu,
        propertyUnit: {
        ...propertyUnit,
        project,
        amenities: project.amenities,
        photoGallery: propertyUnit.mediaGallery.filter((asset) => asset.kind === 'image').map((asset) => asset.url),
      },
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        ...portal,
        portalUnits: formattedUnits,
      },
    });
  } catch (error) {
    return handleApiError(error, 'Failed to retrieve client portal');
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const auth = await requirePermissionWithScope(req, 'portals:delete');
    if (!auth.ok) return auth.response;

    const { token } = await params;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Portal identifier is required' }, { status: 400 });
    }

    // Lookup portal by token OR by id
    const portal = await prisma.clientPortal.findFirst({
      where: {
        organizationId: auth.session.organizationId,
        OR: [{ token }, { id: token }],
      },
      include: {
        lead: {
          select: {
            id: true,
            fullName: true,
            assignedBrokerId: true,
          },
        },
      },
    });

    if (!portal) {
      return NextResponse.json({ success: false, error: 'Portal not found or already deleted' }, { status: 404 });
    }

    // RBAC Scope Check
    if (auth.scope === 'OWN') {
      const isCreator = portal.createdById === auth.session.userId;
      const isAssigned = portal.lead?.assignedBrokerId === auth.session.userId;
      if (!isCreator && !isAssigned) {
        return forbidden('You can only delete portals created by or assigned to you');
      }
    } else if (auth.scope === 'OWN_AND_ASSIGNED') {
      const isCreator = portal.createdById === auth.session.userId;
      const isAssigned = portal.lead?.assignedBrokerId === auth.session.userId;
      if (!isCreator && !isAssigned) {
        const hasAssignment = await prisma.leadAssignment.findFirst({
          where: {
            leadId: portal.leadId,
            userId: auth.session.userId,
            unassignedAt: null,
          },
        });
        if (!hasAssignment) {
          return forbidden('You do not have permission to delete this portal');
        }
      }
    } else if (auth.scope === 'TEAM') {
      const teamMemberIds = await getTeamMemberIds(auth.session.userId);
      const isCreatorInTeam = portal.createdById && teamMemberIds.includes(portal.createdById);
      const isAssignedInTeam = portal.lead?.assignedBrokerId && teamMemberIds.includes(portal.lead.assignedBrokerId);
      if (!isCreatorInTeam && !isAssignedInTeam) {
        return forbidden('You can only delete portals within your team scope');
      }
    }

    await prisma.clientPortal.delete({
      where: { id: portal.id },
    });

    return NextResponse.json({
      success: true,
      message: `Client portal for ${portal.lead?.fullName || 'buyer'} deleted successfully`,
      deletedId: portal.id,
      token: portal.token,
      leadId: portal.leadId,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to delete client portal');
  }
}

