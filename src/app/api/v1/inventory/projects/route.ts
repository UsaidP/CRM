import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createProjectSchema } from '@/lib/validators/inventory-schemas';
import { validateReraNumber } from '@/lib/domain/verification-engine';
import { parseInventoryContent } from '@/lib/inventory-media';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const microMarket = searchParams.get('microMarket');
    const search = searchParams.get('search');

    const where: any = {};
    if (microMarket && microMarket !== 'ALL') {
      where.microMarket = microMarket;
    }
    if (search) {
      where.OR = [
        { projectName: { contains: search } },
        { developerName: { contains: search } },
        { reraNumber: { contains: search } },
      ];
    }

    const projects = await prisma.developerProject.findMany({
      where,
      include: {
        units: {
          select: {
            id: true,
            bhk: true,
            agreementValue: true,
            allInTotalCost: true,
            verificationStatus: true,
            lastVerifiedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = projects.map((p) => ({
      ...parseInventoryContent(p),
      unitCount: p.units.length,
      activeUnitCount: p.units.filter((u) => u.verificationStatus === 'ACTIVE_MARKETABLE').length,
    }));

    return NextResponse.json({ success: true, count: enriched.length, data: enriched });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch developer projects' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = createProjectSchema.parse(body);

    // Verify RERA Format
    const reraValidation = validateReraNumber(validated.reraNumber);
    if (!reraValidation.isValid) {
      return NextResponse.json(
        { success: false, error: reraValidation.error },
        { status: 422 }
      );
    }

    // Default or retrieve organization
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: 'ZamZam Properties Real Estate',
          slug: 'zamzam-properties',
          reraBrokerRegistration: 'A52000029381',
        },
      });
    }

    const project = await prisma.developerProject.create({
      data: {
        organizationId: validated.organizationId || org.id,
        developerName: validated.developerName,
        projectName: validated.projectName,
        reraNumber: reraValidation.normalized || validated.reraNumber,
        microMarket: validated.microMarket,
        subLocality: validated.subLocality,
        shortDescription: validated.shortDescription,
        description: validated.description,
        locationDescription: validated.locationDescription,
        keyHighlightsJson: JSON.stringify(validated.keyHighlights || []),
        mediaGalleryJson: JSON.stringify(validated.mediaGallery || []),
        coverImageUrl: validated.coverImageUrl || null,
        latitude: validated.latitude,
        longitude: validated.longitude,
        distanceToMetroKm: validated.distanceToMetroKm,
        hasOccupancyCertificate: validated.hasOccupancyCertificate,
        commencementCertificateDate: validated.commencementCertificateDate ? new Date(validated.commencementCertificateDate) : null,
        expectedPossessionDate: validated.expectedPossessionDate ? new Date(validated.expectedPossessionDate) : null,
        totalTowers: validated.totalTowers,
        totalFloors: validated.totalFloors,
        basePricePerSqft: validated.basePricePerSqft,
        brochureUrl: validated.brochureUrl,
        youtubeWalkthroughUrl: validated.youtubeWalkthroughUrl,
        masterPlanUrl: validated.masterPlanUrl,
        amenitiesJson: JSON.stringify(validated.amenities || []),
        developerSalesPocName: validated.developerSalesPocName,
        developerSalesPocPhone: validated.developerSalesPocPhone,
        standardCommissionPercent: validated.standardCommissionPercent,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Developer project cataloged successfully',
      data: {
        ...project,
        ...parseInventoryContent(project),
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.errors || error.message || 'Failed to create project' },
      { status: 400 }
    );
  }
}
