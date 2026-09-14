import { NextResponse } from 'next/server';
import { requirePermissionWithScope, forbidden } from '@/lib/services/api-auth';
import { getTeamMemberIds } from '@/lib/services/team-service';
import { prisma } from '@/lib/db/prisma';
import { evaluateEngagementTier } from '@/lib/domain/portal-generator';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await requirePermissionWithScope(req, 'portals:view_telemetry');
    if (!auth.ok) return auth.response;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { organizationId: auth.session.organizationId };

    if (auth.scope === 'OWN') {
      where.OR = [
        { createdById: auth.session.userId },
        { lead: { assignedBrokerId: auth.session.userId } },
      ];
    } else if (auth.scope === 'OWN_AND_ASSIGNED') {
      where.OR = [
        { createdById: auth.session.userId },
        { lead: { assignedBrokerId: auth.session.userId } },
        { lead: { assignments: { some: { userId: auth.session.userId, unassignedAt: null } } } },
      ];
    } else if (auth.scope === 'TEAM') {
      const teamMemberIds = await getTeamMemberIds(auth.session.userId);
      where.OR = [
        { createdById: { in: teamMemberIds } },
        { lead: { assignedBrokerId: { in: teamMemberIds } } },
      ];
    }

    const [total, portals] = await Promise.all([
      prisma.clientPortal.count({ where }),
      prisma.clientPortal.findMany({
        where,
        skip,
        take: limit,
        include: {
          lead: {
            select: {
              id: true,
              fullName: true,
              phoneE164: true,
              currentStage: true,
            },
          },
          createdBy: {
            select: {
              fullName: true,
              email: true,
            },
          },
          portalUnits: {
            include: {
              propertyUnit: {
                include: {
                  project: {
                    select: {
                      projectName: true,
                      microMarket: true,
                    },
                  },
                },
              },
            },
          },
          telemetryLogs: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const formattedPortals = portals.map((portal) => {
      const engagement = evaluateEngagementTier(portal.telemetryLogs);
      return {
        id: portal.id,
        token: portal.token,
        title: portal.title,
        isActive: portal.isActive,
        totalViews: portal.totalViews,
        lastViewedAt: portal.lastViewedAt,
        createdAt: portal.createdAt,
        lead: portal.lead,
        createdBy: portal.createdBy,
        propertyCount: portal.portalUnits.length,
        portalUnits: portal.portalUnits,
        telemetryLogs: portal.telemetryLogs || [],
        projects: portal.portalUnits.map((pu) => ({
          unitId: pu.propertyUnit.id,
          unitNumber: pu.propertyUnit.unitNumber,
          bhk: pu.propertyUnit.bhk,
          projectName: pu.propertyUnit.project.projectName,
          microMarket: pu.propertyUnit.project.microMarket,
          allInTotalCost: pu.propertyUnit.allInTotalCost,
        })),
        engagement,
      };
    });

    return NextResponse.json({
      success: true,
      count: formattedPortals.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: formattedPortals,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requirePermissionWithScope(req, 'portals:delete');
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id') || searchParams.get('portalId');
    let token = searchParams.get('token');

    // Also check JSON body if not provided in searchParams
    if (!id && !token) {
      try {
        const body = await req.json();
        id = body.id || body.portalId;
        token = body.token;
      } catch {}
    }

    if (!id && !token) {
      return NextResponse.json(
        { success: false, error: 'Portal id or token is required for deletion' },
        { status: 400 }
      );
    }

    // Find the portal scoped to current organization
    const where: any = {
      organizationId: auth.session.organizationId,
      ...(id ? { id } : { token }),
    };

    const portal = await prisma.clientPortal.findFirst({
      where,
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
      return NextResponse.json(
        { success: false, error: 'Client portal not found or already deleted' },
        { status: 404 }
      );
    }

    // Enforce data visibility scope
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

    // Permanently delete portal (cascades to ClientPortalUnit and PortalTelemetryLog)
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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

