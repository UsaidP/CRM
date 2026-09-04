import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import { createUnitSchema } from '@/lib/validators/inventory-schemas';
import { calculateAllInCost } from '@/lib/domain/cost-calculator';
import { assessUnitFreshness, validateReraNumber } from '@/lib/domain/verification-engine';
import { parseInventoryContent, resolveAssetUrl } from '@/lib/inventory-media';
import { parseSafeDate } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const { searchParams } = new URL(req.url);
    const bhk = searchParams.get('bhk');
    const microMarket = searchParams.get('microMarket');
    const maxAllInCost = searchParams.get('maxAllInCost');
    const verificationStatus = searchParams.get('verificationStatus');
    const possessionStatus = searchParams.get('possessionStatus');

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (bhk && bhk !== 'ALL') {
      where.bhk = Number(bhk);
    }
    if (possessionStatus && possessionStatus !== 'ALL') {
      where.possessionStatus = possessionStatus;
    }
    if (microMarket && microMarket !== 'ALL') {
      where.project = { microMarket };
    }
    if (maxAllInCost) {
      where.allInTotalCost = { lte: Number(maxAllInCost) };
    }
    if (verificationStatus && verificationStatus !== 'ALL') {
      where.verificationStatus = verificationStatus;
    }

    const [total, units] = await Promise.all([
      prisma.propertyUnit.count({ where }),
      prisma.propertyUnit.findMany({
        where,
        skip,
        take: limit,
        include: {
          project: {
            select: {
              id: true,
              projectName: true,
              developerName: true,
              reraNumber: true,
              microMarket: true,
              distanceToMetroKm: true,
              hasOccupancyCertificate: true,
              brochureUrl: true,
              youtubeWalkthroughUrl: true,
            },
          },
          verifiedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: { allInTotalCost: 'asc' },
      }),
    ]);

    const enrichedUnits = units.map((u) => {
      const freshness = assessUnitFreshness(u.verificationStatus, u.lastVerifiedAt);
      return {
        ...parseInventoryContent(u),
        photoGallery: parseInventoryContent(u).mediaGallery.map((asset) => asset.url),
        freshness,
      };
    });

    return NextResponse.json({
      success: true,
      count: enrichedUnits.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: enrichedUnits,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch property units' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const body = await req.json();
    const validated = createUnitSchema.parse(body);

    const project = await prisma.developerProject.findUnique({
      where: { id: validated.projectId },
    });

    if (!project) {
      return NextResponse.json({ success: false, error: 'Target project does not exist' }, { status: 404 });
    }

    // Verify RERA rule if attempting ACTIVE_MARKETABLE
    if (validated.verificationStatus === 'ACTIVE_MARKETABLE') {
      const reraCheck = validateReraNumber(project.reraNumber);
      if (!reraCheck.isValid) {
        return NextResponse.json(
          { success: false, error: 'Cannot create unit as ACTIVE_MARKETABLE: Parent project has invalid RERA number.' },
          { status: 422 }
        );
      }
    }

    // Compute exact statutory all-in cost synced with project OC and unit possession status
    const isOcReady = Boolean(project.hasOccupancyCertificate || validated.possessionStatus === 'READY_TO_MOVE');
    const costResult = calculateAllInCost({
      agreementValue: validated.agreementValue,
      hasOccupancyCertificate: isOcReady,
      floorNumber: validated.floorNumber,
      carpetAreaSqft: validated.carpetAreaSqft,
      parkingCharges: validated.parkingCharges,
      societyDevCharges: validated.societyDevelopmentCharges,
      customFloorRiseCharges: validated.floorRiseCharges,
    });

    // Determine pre-filled media from project if not provided explicitly
    let elevationImages = validated.elevationImages || [];
    let floorPlanImages = validated.floorPlanImages || [];
    let floorPlanUrl = validated.floorPlanUrl || null;

    if (elevationImages.length === 0 && project.elevationImagesJson) {
      try {
        elevationImages = JSON.parse(project.elevationImagesJson);
      } catch {}
    }

    if (floorPlanImages.length === 0 && project.floorPlanImagesJson) {
      try {
        const allProjFloorPlans: any[] = JSON.parse(project.floorPlanImagesJson);
        const matchingBhkPlans = allProjFloorPlans.filter((fp: any) => Number(fp.bhk) === Number(validated.bhk));
        floorPlanImages = matchingBhkPlans.length > 0 ? matchingBhkPlans : allProjFloorPlans;
      } catch {}
    }

    if (!floorPlanUrl && floorPlanImages.length > 0) {
      floorPlanUrl = resolveAssetUrl(floorPlanImages[0]) || null;
    }

    // Auto-extract videos and photos from mediaGallery if not explicitly partitioned
    let videos = validated.videos || [];
    if (videos.length === 0 && Array.isArray(validated.mediaGallery)) {
      videos = validated.mediaGallery.filter((item: any) => typeof item === 'object' && item.kind === 'video');
    }

    let videoReelUrl = validated.videoReelUrl || null;
    if (!videoReelUrl && videos.length > 0) {
      videoReelUrl = resolveAssetUrl(videos[0]) || null;
    }

    let photoGallery = validated.photoGallery || [];
    if (photoGallery.length === 0 && Array.isArray(validated.mediaGallery)) {
      photoGallery = validated.mediaGallery
        .filter((item: any) => typeof item === 'string' || (typeof item === 'object' && item.kind === 'image'))
        .map((item: any) => resolveAssetUrl(item))
        .filter(Boolean);
    }

    const unit = await prisma.propertyUnit.create({
      data: {
        projectId: validated.projectId,
        unitNumber: validated.unitNumber,
        bhk: validated.bhk,
        bathrooms: validated.bathrooms,
        balconies: validated.balconies,
        floorNumber: validated.floorNumber,
        totalFloors: validated.totalFloors,
        carpetAreaSqft: validated.carpetAreaSqft,
        facing: validated.facing,
        possessionStatus: isOcReady ? 'READY_TO_MOVE' : validated.possessionStatus,
        possessionDate: parseSafeDate(validated.possessionDate),
        description: validated.description,
        featureHighlightsJson: JSON.stringify(validated.featureHighlights || []),
        floorPlanUrl,
        mediaGalleryJson: JSON.stringify(validated.mediaGallery || []),
        elevationImagesJson: JSON.stringify(elevationImages),
        floorPlanImagesJson: JSON.stringify(floorPlanImages),
        videosJson: JSON.stringify(videos),
        
        agreementValue: costResult.agreementValue,
        stampDutyRate: costResult.stampDutyRate,
        registrationFee: costResult.registrationFee,
        gstRate: costResult.gstRate,
        floorRiseCharges: costResult.floorRiseCharges,
        parkingCharges: costResult.parkingCharges,
        societyDevelopmentCharges: costResult.societyDevCharges,
        allInTotalCost: costResult.totalAllInCost,

        verificationStatus: validated.verificationStatus,
        lastVerifiedAt: new Date(),
        verificationNotes: validated.verificationNotes,
        photoGalleryJson: JSON.stringify(photoGallery),
        videoReelUrl,
        isHotDeal: validated.isHotDeal,
        isExclusive: validated.isExclusive,
      },
      include: {
        project: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Property unit listed successfully',
      data: {
        ...unit,
        ...parseInventoryContent(unit),
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('[INVENTORY_UNIT_CREATE_ERROR]', error);
    const errorMessage = error?.issues
      ? error.issues.map((i: any) => `${i.path.join('.') || 'field'}: ${i.message}`).join('; ')
      : error?.message || 'Failed to create unit';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 400 }
    );
  }
}
