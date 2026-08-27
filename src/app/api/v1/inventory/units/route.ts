import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import { createUnitSchema } from '@/lib/validators/inventory-schemas';
import { calculateAllInCost } from '@/lib/domain/cost-calculator';
import { assessUnitFreshness, validateReraNumber } from '@/lib/domain/verification-engine';
import { parseInventoryContent } from '@/lib/inventory-media';
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

    // Compute exact statutory all-in cost
    const costResult = calculateAllInCost({
      agreementValue: validated.agreementValue,
      hasOccupancyCertificate: project.hasOccupancyCertificate,
      floorNumber: validated.floorNumber,
      carpetAreaSqft: validated.carpetAreaSqft,
      parkingCharges: validated.parkingCharges,
      societyDevCharges: validated.societyDevelopmentCharges,
    });

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
        possessionStatus: validated.possessionStatus,
        possessionDate: parseSafeDate(validated.possessionDate),
        description: validated.description,
        featureHighlightsJson: JSON.stringify(validated.featureHighlights || []),
        floorPlanUrl: validated.floorPlanUrl || null,
        mediaGalleryJson: JSON.stringify(validated.mediaGallery || []),
        
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
        photoGalleryJson: JSON.stringify(validated.photoGallery || []),
        videoReelUrl: validated.videoReelUrl,
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
        photoGallery: parseInventoryContent(unit).mediaGallery.map((asset) => asset.url),
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.errors || error.message || 'Failed to create unit' },
      { status: 400 }
    );
  }
}
