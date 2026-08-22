import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { parseInventoryContent } from '@/lib/inventory-media';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const portal = await prisma.clientPortal.findUnique({
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
            phoneE164: true,
          },
        },
        createdBy: {
          select: {
            fullName: true,
            phoneE164: true,
            email: true,
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

    if (!portal || !portal.isActive) {
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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
