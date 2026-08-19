import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { updateProjectSchema } from '@/lib/validators/inventory-schemas';
import { validateReraNumber } from '@/lib/domain/verification-engine';
import { parseInventoryContent } from '@/lib/inventory-media';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
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
      'standardCommissionPercent',
    ] as const;
    for (const field of scalarFields) {
      if (field in validated) data[field] = validated[field];
    }
    if ('reraNumber' in validated) data.reraNumber = reraValidation.normalized || nextRera;
    if ('commencementCertificateDate' in validated) {
      data.commencementCertificateDate = validated.commencementCertificateDate ? new Date(validated.commencementCertificateDate) : null;
    }
    if ('expectedPossessionDate' in validated) {
      data.expectedPossessionDate = validated.expectedPossessionDate ? new Date(validated.expectedPossessionDate) : null;
    }
    if ('brochureUrl' in validated) data.brochureUrl = validated.brochureUrl || null;
    if ('youtubeWalkthroughUrl' in validated) data.youtubeWalkthroughUrl = validated.youtubeWalkthroughUrl || null;
    if ('masterPlanUrl' in validated) data.masterPlanUrl = validated.masterPlanUrl || null;
    if ('coverImageUrl' in validated) data.coverImageUrl = validated.coverImageUrl || null;
    if ('amenities' in validated) data.amenitiesJson = JSON.stringify(validated.amenities || []);
    if ('keyHighlights' in validated) data.keyHighlightsJson = JSON.stringify(validated.keyHighlights || []);
    if ('mediaGallery' in validated) data.mediaGalleryJson = JSON.stringify(validated.mediaGallery || []);

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
    const { id } = await params;
    await prisma.developerProject.delete({
      where: { id },
    });
    return NextResponse.json({ success: true, message: 'Project deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
