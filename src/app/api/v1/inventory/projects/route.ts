import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import { createProjectSchema } from '@/lib/validators/inventory-schemas';
import { validateReraNumber } from '@/lib/domain/verification-engine';
import { parseInventoryContent, resolveAssetUrl } from '@/lib/inventory-media';
import { parseSafeDate } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
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
            projectId: true,
            unitNumber: true,
            bhk: true,
            bathrooms: true,
            balconies: true,
            floorNumber: true,
            totalFloors: true,
            carpetAreaSqft: true,
            facing: true,
            possessionStatus: true,
            possessionDate: true,
            agreementValue: true,
            stampDutyRate: true,
            registrationFee: true,
            gstRate: true,
            floorRiseCharges: true,
            parkingCharges: true,
            societyDevelopmentCharges: true,
            allInTotalCost: true,
            floorPlanUrl: true,
            floorPlanImagesJson: true,
            photoGalleryJson: true,
            mediaGalleryJson: true,
            elevationImagesJson: true,
            description: true,
            featureHighlightsJson: true,
            verificationStatus: true,
            verificationNotes: true,
            lastVerifiedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = projects.map((p) => ({
      ...parseInventoryContent(p),
      units: p.units.map((u) => ({
        ...u,
        ...parseInventoryContent(u),
      })),
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
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
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

    // Check if initial units were provided (e.g. from brochure auto-extractor)
    const initialUnits: any[] = Array.isArray(body.units) ? body.units : [];
    const normalizedRera = reraValidation.normalized || validated.reraNumber;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Check for existing duplicate project by RERA number or Project Name + Location
      const existingProject = await tx.developerProject.findFirst({
        where: {
          OR: [
            { reraNumber: normalizedRera },
            {
              AND: [
                { projectName: { equals: validated.projectName } },
                {
                  OR: [
                    { developerName: { equals: validated.developerName } },
                    { microMarket: { equals: validated.microMarket } },
                  ],
                },
              ],
            },
          ],
        },
        include: {
          units: true,
        },
      });

      let projectRecord;
      let isDuplicate = false;

      if (existingProject) {
        isDuplicate = true;
        // Merge amenities
        let existingAmenities: string[] = [];
        try {
          existingAmenities = JSON.parse(existingProject.amenitiesJson || '[]');
        } catch {}
        const mergedAmenities = Array.from(new Set([...existingAmenities, ...(validated.amenities || [])]));

        // Update existing project with latest specifications
        projectRecord = await tx.developerProject.update({
          where: { id: existingProject.id },
          data: {
            developerName: validated.developerName || existingProject.developerName,
            projectName: validated.projectName || existingProject.projectName,
            microMarket: validated.microMarket || existingProject.microMarket,
            subLocality: validated.subLocality || existingProject.subLocality,
            shortDescription: validated.shortDescription || existingProject.shortDescription,
            description: validated.description || existingProject.description,
            totalTowers: validated.totalTowers || existingProject.totalTowers,
            totalFloors: validated.totalFloors || existingProject.totalFloors,
            basePricePerSqft: validated.basePricePerSqft || existingProject.basePricePerSqft,
            brochureUrl: validated.brochureUrl || existingProject.brochureUrl,
            coverImageUrl: validated.coverImageUrl || existingProject.coverImageUrl,
            masterPlanUrl: validated.masterPlanUrl || existingProject.masterPlanUrl,
            mediaGalleryJson: validated.mediaGallery && validated.mediaGallery.length > 0 ? JSON.stringify(validated.mediaGallery) : existingProject.mediaGalleryJson,
            elevationImagesJson: validated.elevationImages && validated.elevationImages.length > 0 ? JSON.stringify(validated.elevationImages) : existingProject.elevationImagesJson,
            floorPlanImagesJson: validated.floorPlanImages && validated.floorPlanImages.length > 0 ? JSON.stringify(validated.floorPlanImages) : existingProject.floorPlanImagesJson,
            brochurePhotosJson: validated.brochurePhotos && validated.brochurePhotos.length > 0 ? JSON.stringify(validated.brochurePhotos) : existingProject.brochurePhotosJson,
            amenitiesJson: JSON.stringify(mergedAmenities),
            developerSalesPocName: validated.developerSalesPocName || existingProject.developerSalesPocName,
            developerSalesPocPhone: validated.developerSalesPocPhone || existingProject.developerSalesPocPhone,
            commencementCertificateDate: parseSafeDate(validated.commencementCertificateDate) ?? existingProject.commencementCertificateDate,
            expectedPossessionDate: parseSafeDate(validated.expectedPossessionDate) ?? existingProject.expectedPossessionDate,
            reraCertificateUrl: validated.reraCertificateUrl || existingProject.reraCertificateUrl,
            reraRegisteredName: validated.reraRegisteredName || existingProject.reraRegisteredName,
            reraProjectStatus: validated.reraProjectStatus || existingProject.reraProjectStatus,
            reraValidUntil: parseSafeDate(validated.reraValidUntil) ?? existingProject.reraValidUntil,
            reraVerificationDate: validated.reraVerificationDate ? parseSafeDate(validated.reraVerificationDate) : (validated.reraCertificateUrl ? new Date() : existingProject.reraVerificationDate),
            reraCertDataJson: validated.reraCertDataJson || existingProject.reraCertDataJson,
          },
        });
      } else {
        // Create brand new project
        projectRecord = await tx.developerProject.create({
          data: {
            organizationId: validated.organizationId || org.id,
            developerName: validated.developerName,
            projectName: validated.projectName,
            reraNumber: normalizedRera,
            microMarket: validated.microMarket,
            subLocality: validated.subLocality,
            shortDescription: validated.shortDescription,
            description: validated.description,
            locationDescription: validated.locationDescription,
            keyHighlightsJson: JSON.stringify(validated.keyHighlights || []),
            mediaGalleryJson: JSON.stringify(validated.mediaGallery || []),
            elevationImagesJson: JSON.stringify(validated.elevationImages || []),
            floorPlanImagesJson: JSON.stringify(validated.floorPlanImages || []),
            brochurePhotosJson: JSON.stringify(validated.brochurePhotos || []),
            coverImageUrl: validated.coverImageUrl || null,
            latitude: validated.latitude,
            longitude: validated.longitude,
            distanceToMetroKm: validated.distanceToMetroKm,
            hasOccupancyCertificate: validated.hasOccupancyCertificate,
            commencementCertificateDate: parseSafeDate(validated.commencementCertificateDate),
            expectedPossessionDate: parseSafeDate(validated.expectedPossessionDate),
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
            reraCertificateUrl: validated.reraCertificateUrl,
            reraRegisteredName: validated.reraRegisteredName,
            reraProjectStatus: validated.reraProjectStatus || 'REGISTERED',
            reraValidUntil: parseSafeDate(validated.reraValidUntil),
            reraVerificationDate: validated.reraVerificationDate ? parseSafeDate(validated.reraVerificationDate) : (validated.reraCertificateUrl ? new Date() : undefined),
            reraCertDataJson: validated.reraCertDataJson || '{}',
          },
        });
      }

      // Sync Units without creating duplicate unit rows
      const syncedUnits: any[] = [];
      const existingUnits = existingProject?.units || [];
      const projElevationImages = validated.elevationImages || [];
      const projFloorPlanImages = validated.floorPlanImages || [];

      for (const u of initialUnits) {
        const agreementValue = Number(u.agreementValue) || Math.round(Number(u.carpetAreaSqft || 500) * validated.basePricePerSqft);
        const stampDutyRate = Number(u.stampDutyRate) || 6.0;
        const registrationFee = Number(u.registrationFee) || 30000.0;
        const gstRate = validated.hasOccupancyCertificate ? 0.0 : (Number(u.gstRate) || 5.0);
        const floorRiseCharges = Number(u.floorRiseCharges) || 0.0;
        const parkingCharges = Number(u.parkingCharges) || 250000.0;
        const societyDevelopmentCharges = Number(u.societyDevelopmentCharges) || 150000.0;

        const stampDutyAmount = (agreementValue * stampDutyRate) / 100;
        const gstAmount = (agreementValue * gstRate) / 100;
        const allInTotalCost = agreementValue + stampDutyAmount + registrationFee + gstAmount + floorRiseCharges + parkingCharges + societyDevelopmentCharges;

        const bhkNum = Math.max(1, Math.min(6, parseInt(u.bhk || 2, 10)));
        const carpetNum = Math.max(100, parseInt(u.carpetAreaSqft || 650, 10));

        // Matching floor plans for unit BHK (Zero-fabrication: only match unit's BHK)
        const matchingFloorPlans = projFloorPlanImages.filter((fp: any) => Number(fp.bhk) === bhkNum);
        const unitFloorPlanImages = matchingFloorPlans.length > 0 ? matchingFloorPlans : [];
        const defaultFloorPlanUrl = u.floorPlanUrl || resolveAssetUrl(unitFloorPlanImages[0]) || null;

        // Build unit media gallery containing its floor plan and project elevation
        const unitMediaGallery: any[] = [];
        if (defaultFloorPlanUrl) {
          unitMediaGallery.push({
            id: `unit_fp_${syncedUnits.length + 1}`,
            url: defaultFloorPlanUrl,
            title: `${bhkNum} BHK Floor Plan Layout`,
            kind: 'image',
            category: 'floor-plans',
            bhk: bhkNum,
          });
        }
        if (validated.coverImageUrl) {
          unitMediaGallery.push({
            id: `unit_elev_${syncedUnits.length + 1}`,
            url: validated.coverImageUrl,
            title: `${validated.projectName} Architectural Elevation`,
            kind: 'image',
            category: 'elevations',
          });
        }
        if (Array.isArray(u.mediaGallery)) {
          for (const item of u.mediaGallery) {
            const url = resolveAssetUrl(item);
            if (url && !unitMediaGallery.some((existing) => existing.url === url)) {
              unitMediaGallery.push(item);
            }
          }
        }

        const unitPhotos = unitMediaGallery.filter((a) => a.kind === 'image').map((a) => resolveAssetUrl(a));
        const unitVideos = u.videos || (validated.youtubeWalkthroughUrl ? [{
          id: `unit_video_${syncedUnits.length + 1}`,
          url: validated.youtubeWalkthroughUrl,
          kind: 'video',
          title: `${validated.projectName} Walkthrough Video`,
        }] : []);
        const unitVideoReel = u.videoReelUrl || validated.youtubeWalkthroughUrl || null;

        // Check if matching unit already exists
        let matchedUnit: any = null;
        if (u.unitNumber) {
          matchedUnit = existingUnits.find((ex: any) => ex.unitNumber?.toLowerCase() === u.unitNumber.toLowerCase());
        }
        if (!matchedUnit) {
          matchedUnit = existingUnits.find(
            (ex: any) => ex.bhk === bhkNum && Math.abs(ex.carpetAreaSqft - carpetNum) <= 5
          );
        }

        if (matchedUnit) {
          // Update existing unit
          const updatedUnit = await tx.propertyUnit.update({
            where: { id: matchedUnit.id },
            data: {
              agreementValue,
              stampDutyRate,
              registrationFee,
              gstRate,
              allInTotalCost,
              floorPlanUrl: defaultFloorPlanUrl || matchedUnit.floorPlanUrl,
              totalFloors: validated.totalFloors || matchedUnit.totalFloors,
              floorPlanImagesJson: unitFloorPlanImages.length > 0 ? JSON.stringify(unitFloorPlanImages) : matchedUnit.floorPlanImagesJson,
              mediaGalleryJson: unitMediaGallery.length > 0 ? JSON.stringify(unitMediaGallery) : matchedUnit.mediaGalleryJson,
              photoGalleryJson: unitPhotos.length > 0 ? JSON.stringify(unitPhotos) : matchedUnit.photoGalleryJson,
              videosJson: unitVideos.length > 0 ? JSON.stringify(unitVideos) : matchedUnit.videosJson,
              videoReelUrl: unitVideoReel || matchedUnit.videoReelUrl,
              lastVerifiedAt: new Date(),
            },
          });
          syncedUnits.push(updatedUnit);
        } else {
          // Create new unit with pre-filled media
          const newUnit: any = await tx.propertyUnit.create({
            data: {
              projectId: projectRecord.id,
              unitNumber: u.unitNumber || `Unit-${syncedUnits.length + 1}`,
              bhk: bhkNum,
              bathrooms: parseInt(u.bathrooms || (bhkNum >= 3 ? 3 : 2), 10),
              balconies: parseInt(u.balconies || 1, 10),
              floorNumber: Math.max(1, parseInt(u.floorNumber || 2, 10)),
              totalFloors: validated.totalFloors || 15,
              carpetAreaSqft: carpetNum,
              facing: u.facing || 'EAST',
              possessionStatus: validated.hasOccupancyCertificate ? 'READY_TO_MOVE' : (u.possessionStatus || 'UNDER_CONSTRUCTION'),
              agreementValue,
              stampDutyRate,
              registrationFee,
              gstRate,
              floorRiseCharges,
              parkingCharges,
              societyDevelopmentCharges,
              allInTotalCost,
              floorPlanUrl: defaultFloorPlanUrl,
              elevationImagesJson: JSON.stringify(projElevationImages),
              floorPlanImagesJson: JSON.stringify(unitFloorPlanImages),
              mediaGalleryJson: JSON.stringify(unitMediaGallery),
              photoGalleryJson: JSON.stringify(unitPhotos),
              videosJson: JSON.stringify(unitVideos),
              videoReelUrl: unitVideoReel,
              verificationStatus: 'ACTIVE_MARKETABLE',
              verificationNotes: u.verificationNotes || `Extracted from official brochure for ${validated.projectName}. Verified MahaRERA ${normalizedRera}.`,
              description: u.description || `${bhkNum} BHK residential flat in ${validated.projectName}, ${validated.microMarket}.`,
              featureHighlightsJson: JSON.stringify(u.featureHighlights || [
                `${carpetNum} sq.ft RERA Carpet Area`,
                `MahaRERA ID: ${normalizedRera}`,
                `Floor ${u.floorNumber || 2} of ${validated.totalFloors}`,
              ]),
            },
          });
          syncedUnits.push(newUnit);
        }
      }

      return { project: projectRecord, units: syncedUnits, isDuplicate };
    });

    const responseMsg = result.isDuplicate
      ? `Project "${result.project.projectName}" already exists in CRM (MahaRERA: ${result.project.reraNumber}). Specifications updated & ${result.units.length} unit configuration(s) synchronized.`
      : `Developer project and ${result.units.length} unit configuration(s) cataloged successfully.`;

    return NextResponse.json({
      success: true,
      isDuplicate: result.isDuplicate,
      message: responseMsg,
      data: {
        ...result.project,
        ...parseInventoryContent(result.project),
        unitsCount: result.units.length,
      },
    }, { status: result.isDuplicate ? 200 : 201 });
  } catch (error: any) {
    let errorMessage = 'Failed to create developer project';
    if (error?.errors && Array.isArray(error.errors)) {
      errorMessage = error.errors.map((e: any) => `${e.path?.join('.') || 'field'}: ${e.message}`).join(', ');
    } else if (typeof error?.message === 'string') {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 400 }
    );
  }
}
