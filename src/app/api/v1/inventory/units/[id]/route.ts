import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import { assessUnitFreshness } from '@/lib/domain/verification-engine';
import { updateUnitSchema } from '@/lib/validators/inventory-schemas';
import { calculateAllInCost } from '@/lib/domain/cost-calculator';
import { validateReraNumber } from '@/lib/domain/verification-engine';
import { parseInventoryContent } from '@/lib/inventory-media';
import { parseSafeDate } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const unit = await prisma.propertyUnit.findUnique({
      where: { id },
      include: {
        project: true,
        verifiedBy: {
          select: { id: true, fullName: true, email: true },
        },
        auditLogs: {
          include: {
            auditorUser: { select: { fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!unit) {
      return NextResponse.json({ success: false, error: 'Property unit not found' }, { status: 404 });
    }

    const freshness = assessUnitFreshness(unit.verificationStatus, unit.lastVerifiedAt);

    return NextResponse.json({
      success: true,
      data: {
        ...unit,
        ...parseInventoryContent(unit),
        photoGallery: parseInventoryContent(unit).mediaGallery.map((asset) => asset.url),
        freshness,
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
    const validated = updateUnitSchema.parse(body);
    const existing = await prisma.propertyUnit.findUnique({ where: { id }, include: { project: true } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Property unit not found' }, { status: 404 });
    }

    const nextProjectId = validated.projectId ?? existing.projectId;
    const project = nextProjectId === existing.projectId
      ? existing.project
      : await prisma.developerProject.findUnique({ where: { id: nextProjectId } });
    if (!project) {
      return NextResponse.json({ success: false, error: 'Target project does not exist' }, { status: 404 });
    }
    const nextStatus = validated.verificationStatus ?? existing.verificationStatus;
    if (nextStatus === 'ACTIVE_MARKETABLE' && !validateReraNumber(project.reraNumber).isValid) {
      return NextResponse.json({ success: false, error: 'Cannot mark unit ACTIVE_MARKETABLE: parent project has invalid RERA number.' }, { status: 422 });
    }

    const agreementValue = validated.agreementValue ?? existing.agreementValue;
    const floorNumber = validated.floorNumber ?? existing.floorNumber;
    const carpetAreaSqft = validated.carpetAreaSqft ?? existing.carpetAreaSqft;
    const parkingCharges = validated.parkingCharges ?? existing.parkingCharges;
    const societyDevelopmentCharges = validated.societyDevelopmentCharges ?? existing.societyDevelopmentCharges;
    const isOcReady = Boolean(
      project.hasOccupancyCertificate ||
      (validated.possessionStatus ? validated.possessionStatus === 'READY_TO_MOVE' : existing.possessionStatus === 'READY_TO_MOVE')
    );
    const costResult = calculateAllInCost({
      agreementValue,
      hasOccupancyCertificate: isOcReady,
      floorNumber,
      carpetAreaSqft,
      parkingCharges,
      societyDevCharges: societyDevelopmentCharges,
    });

    const data: Record<string, unknown> = {};
    const scalarFields = [
      'unitNumber', 'bhk', 'bathrooms', 'balconies', 'floorNumber', 'totalFloors',
      'carpetAreaSqft', 'facing', 'possessionStatus', 'description', 'verificationStatus',
      'verificationNotes', 'isHotDeal', 'isExclusive',
    ] as const;
    for (const field of scalarFields) {
      if (field in validated) data[field] = validated[field];
    }
    if ('projectId' in validated) data.projectId = nextProjectId;
    if ('possessionDate' in validated) data.possessionDate = parseSafeDate(validated.possessionDate);
    if ('featureHighlights' in validated) data.featureHighlightsJson = JSON.stringify(validated.featureHighlights || []);
    if ('floorPlanUrl' in validated) data.floorPlanUrl = validated.floorPlanUrl || null;
    if ('mediaGallery' in validated) {
      data.mediaGalleryJson = JSON.stringify(validated.mediaGallery || []);
      if (!('videos' in validated) && Array.isArray(validated.mediaGallery)) {
        const extractedVideos = validated.mediaGallery.filter((item: any) => typeof item === 'object' && item.kind === 'video');
        data.videosJson = JSON.stringify(extractedVideos);
        if (!validated.videoReelUrl && extractedVideos.length > 0) {
          data.videoReelUrl = (extractedVideos[0] as any).url || null;
        }
      }
      if (!('photoGallery' in validated) && Array.isArray(validated.mediaGallery)) {
        const extractedPhotos = validated.mediaGallery
          .filter((item: any) => typeof item === 'string' || (typeof item === 'object' && item.kind === 'image'))
          .map((item: any) => (typeof item === 'string' ? item : item.url))
          .filter(Boolean);
        data.photoGalleryJson = JSON.stringify(extractedPhotos);
      }
    }
    if ('photoGallery' in validated) data.photoGalleryJson = JSON.stringify(validated.photoGallery || []);
    if ('elevationImages' in validated) data.elevationImagesJson = JSON.stringify(validated.elevationImages || []);
    if ('floorPlanImages' in validated) data.floorPlanImagesJson = JSON.stringify(validated.floorPlanImages || []);
    if ('videos' in validated) data.videosJson = JSON.stringify(validated.videos || []);
    if ('videoReelUrl' in validated) data.videoReelUrl = validated.videoReelUrl || null;
    data.agreementValue = costResult.agreementValue;
    data.stampDutyRate = costResult.stampDutyRate;
    data.registrationFee = costResult.registrationFee;
    data.gstRate = costResult.gstRate;
    data.floorRiseCharges = costResult.floorRiseCharges;
    data.parkingCharges = costResult.parkingCharges;
    data.societyDevelopmentCharges = costResult.societyDevCharges;
    data.allInTotalCost = costResult.totalAllInCost;
    data.lastVerifiedAt = new Date();

    const unit = await prisma.propertyUnit.update({ where: { id }, data, include: { project: true } });

    // Optional audit log for status/price or media modifications if user ID available
    const statusChanged = validated.verificationStatus && validated.verificationStatus !== existing.verificationStatus;
    const priceChanged = validated.agreementValue && validated.agreementValue !== existing.agreementValue;
    const mediaChanged =
      'elevationImages' in validated ||
      'floorPlanImages' in validated ||
      'mediaGallery' in validated ||
      'videos' in validated ||
      'photoGallery' in validated ||
      'floorPlanUrl' in validated ||
      'videoReelUrl' in validated;
    if (auth.session?.userId && (statusChanged || priceChanged || mediaChanged)) {
      try {
        await prisma.inventoryAuditLog.create({
          data: {
            propertyUnitId: id,
            auditorUserId: auth.session.userId,
            previousStatus: existing.verificationStatus,
            newStatus: validated.verificationStatus || existing.verificationStatus,
            priceChangedFrom: existing.agreementValue,
            priceChangedTo: validated.agreementValue || existing.agreementValue,
            auditNotes: validated.verificationNotes || [
              statusChanged && `Status: ${existing.verificationStatus} → ${validated.verificationStatus}`,
              priceChanged && `Price: ₹${existing.agreementValue} → ₹${validated.agreementValue}`,
              mediaChanged && 'Media assets updated',
            ].filter(Boolean).join('; ') || 'Unit updated.',
          },
        });
      } catch (auditErr: any) {
        console.warn(`[UNIT-AUDIT] Failed to record audit log: ${auditErr.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Property unit updated successfully',
      data: { ...unit, ...parseInventoryContent(unit) },
    });
  } catch (error: any) {
    console.error('[INVENTORY_UNIT_UPDATE_ERROR]', error);
    const errorMessage = error?.issues
      ? error.issues.map((i: any) => `${i.path.join('.') || 'field'}: ${i.message}`).join('; ')
      : error?.message || 'Failed to update property unit';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 400 },
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const { id } = await params;
    await prisma.propertyUnit.delete({
      where: { id },
    });
    return NextResponse.json({ success: true, message: 'Property unit deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
