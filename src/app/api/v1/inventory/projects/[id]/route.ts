import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import { updateProjectSchema } from '@/lib/validators/inventory-schemas';
import { validateReraNumber } from '@/lib/domain/verification-engine';
import { parseInventoryContent } from '@/lib/inventory-media';
import { parseSafeDate } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const project = await prisma.developerProject.findUnique({
      where: { id },
      include: {
        units: {
          orderBy: { floorNumber: 'asc' },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...project,
        ...parseInventoryContent(project),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const body = await req.json();
    const validated = updateProjectSchema.parse(body);
    const existing = await prisma.developerProject.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const nextRera = validated.reraNumber ?? existing.reraNumber;
    const reraValidation = validateReraNumber(nextRera);
    if (!reraValidation.isValid) {
      return NextResponse.json({ success: false, error: reraValidation.error }, { status: 422 });
    }

    const data: Record<string, unknown> = {};
    const scalarFields = [
      'organizationId', 'developerName', 'projectName', 'microMarket', 'subLocality',
      'shortDescription', 'description', 'locationDescription', 'latitude', 'longitude',
      'distanceToMetroKm', 'hasOccupancyCertificate', 'totalTowers', 'totalFloors',
      'basePricePerSqft', 'developerSalesPocName', 'developerSalesPocPhone',
      'standardCommissionPercent', 'reraCertificateUrl', 'reraRegisteredName',
      'reraProjectStatus', 'reraCertDataJson',
    ] as const;
    for (const field of scalarFields) {
      if (field in validated) data[field] = validated[field];
    }
    if ('reraNumber' in validated) data.reraNumber = reraValidation.normalized || nextRera;
    if ('commencementCertificateDate' in validated) {
      data.commencementCertificateDate = parseSafeDate(validated.commencementCertificateDate);
    }
    if ('expectedPossessionDate' in validated) {
      data.expectedPossessionDate = parseSafeDate(validated.expectedPossessionDate);
    }
    if ('reraValidUntil' in validated) {
      data.reraValidUntil = parseSafeDate(validated.reraValidUntil);
    }
    if ('reraVerificationDate' in validated) {
      data.reraVerificationDate = parseSafeDate(validated.reraVerificationDate);
    }
    if ('brochureUrl' in validated) data.brochureUrl = validated.brochureUrl || null;
    if ('youtubeWalkthroughUrl' in validated) data.youtubeWalkthroughUrl = validated.youtubeWalkthroughUrl || null;
    if ('masterPlanUrl' in validated) data.masterPlanUrl = validated.masterPlanUrl || null;
    if ('coverImageUrl' in validated) data.coverImageUrl = validated.coverImageUrl || null;
    if ('amenities' in validated) data.amenitiesJson = JSON.stringify(validated.amenities || []);
    if ('keyHighlights' in validated) data.keyHighlightsJson = JSON.stringify(validated.keyHighlights || []);
    if ('mediaGallery' in validated) data.mediaGalleryJson = JSON.stringify(validated.mediaGallery || []);
    if ('elevationImages' in validated) data.elevationImagesJson = JSON.stringify(validated.elevationImages || []);
    if ('floorPlanImages' in validated) data.floorPlanImagesJson = JSON.stringify(validated.floorPlanImages || []);
    if ('brochurePhotos' in validated) data.brochurePhotosJson = JSON.stringify(validated.brochurePhotos || []);

    const project = await prisma.developerProject.update({ where: { id }, data });
    return NextResponse.json({
      success: true,
      message: 'Developer project updated successfully',
      data: { ...project, ...parseInventoryContent(project) },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.errors || error.message || 'Failed to update project' },
      { status: 400 },
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const { id } = await params;

    const existing = await prisma.developerProject.findUnique({
      where: { id },
      include: { units: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    await prisma.developerProject.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Project "${existing.projectName}" and its associated units were deleted successfully`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
