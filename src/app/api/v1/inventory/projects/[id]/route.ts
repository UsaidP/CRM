import { NextResponse } from 'next/server';
import { requireSession, orgScope } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import { updateProjectSchema } from '@/lib/validators/inventory-schemas';
import { validateReraNumber, checkReraCompliance } from '@/lib/domain/verification-engine';
import { parseInventoryContent } from '@/lib/inventory-media';
import { parseSafeDate } from '@/lib/date-utils';
import { handleApiError } from '@/lib/services/api-handler';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const project = await prisma.developerProject.findFirst({
      where: { id, ...orgScope(auth.session) },
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
  } catch (error) {
    return handleApiError(error, 'Failed to fetch project');
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const body = await req.json();
    const validated = updateProjectSchema.parse(body);
    const existing = await prisma.developerProject.findFirst({ where: { id, ...orgScope(auth.session) } });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const nextRera = validated.reraNumber !== undefined ? validated.reraNumber : existing.reraNumber;
    const nextSqm = validated.plotSizeSqMeters !== undefined ? validated.plotSizeSqMeters : existing.plotSizeSqMeters;
    const nextSqft = validated.plotSizeSqFt !== undefined ? validated.plotSizeSqFt : existing.plotSizeSqFt;

    const compliance = checkReraCompliance({
      reraNumber: nextRera,
      plotSizeSqMeters: nextSqm,
      plotSizeSqFt: nextSqft,
    });

    if (!compliance.isCompliant) {
      return NextResponse.json({ success: false, error: compliance.description }, { status: 422 });
    }

    const data: Record<string, unknown> = {
      plotSizeSqMeters: compliance.plotSizeSqMeters,
      plotSizeSqFt: compliance.plotSizeSqFt,
      isReraExempt: compliance.isExempt,
      reraStatus: compliance.status,
    };
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
    if ('reraNumber' in validated) {
      data.reraNumber = compliance.validation?.normalized || (validated.reraNumber || '').trim();
    }
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

    if ('hasOccupancyCertificate' in validated) {
      const isOc = Boolean(validated.hasOccupancyCertificate);
      await prisma.propertyUnit.updateMany({
        where: { projectId: id },
        data: {
          possessionStatus: isOc ? 'READY_TO_MOVE' : 'UNDER_CONSTRUCTION',
          gstRate: isOc ? 0.0 : 5.0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Developer project updated successfully',
      data: { ...project, ...parseInventoryContent(project) },
    });
  } catch (error) {
    return handleApiError(error, 'Failed to update project');
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const { id } = await params;

    const existing = await prisma.developerProject.findFirst({
      where: { id, ...orgScope(auth.session) },
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
  } catch (error) {
    return handleApiError(error, 'Failed to delete project');
  }
}
