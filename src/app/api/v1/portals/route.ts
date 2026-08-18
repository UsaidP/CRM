import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { evaluateEngagementTier } from '@/lib/domain/portal-generator';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const [total, portals] = await Promise.all([
      prisma.clientPortal.count(),
      prisma.clientPortal.findMany({
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
