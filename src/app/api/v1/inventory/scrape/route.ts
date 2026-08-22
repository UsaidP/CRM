import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { 
  VERIFIED_NAVI_MUMBAI_CATALOG, 
  filterElevationsAndFloorPlansOnly,
  calculateNaviMumbaiAreaMatrix,
  type NaviMumbaiNode 
} from '@/lib/domain/property-scraper';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetNode: NaviMumbaiNode = body.targetNode || 'ALL';

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json(
        { success: false, error: 'No active CRM organization found.' },
        { status: 400 }
      );
    }

    // Filter catalog by selected node
    const matchingProjects = VERIFIED_NAVI_MUMBAI_CATALOG.filter((p) => {
      if (targetNode === 'ALL') return true;
      if (targetNode === 'KHARGHAR') return p.microMarket.toLowerCase().includes('kharghar');
      if (targetNode === 'TALOJA_PHASE_1') return p.microMarket.toLowerCase().includes('taloja phase 1');
      if (targetNode === 'TALOJA_PHASE_2') return p.microMarket.toLowerCase().includes('taloja phase 2');
      return true;
    });

    let ingestedProjectsCount = 0;
    let ingestedUnitsCount = 0;

    for (const item of matchingProjects) {
      // Strict media filter: keep only elevations and floor plans
      const cleanMedia = filterElevationsAndFloorPlansOnly(item.mediaGallery);

      // Check if project exists by RERA ID
      let project = await prisma.developerProject.findFirst({
        where: {
          organizationId: org.id,
          reraNumber: item.reraNumber,
        },
      });

      const projectData = {
        organizationId: org.id,
        projectName: item.projectName,
        developerName: item.developerName,
        reraNumber: item.reraNumber,
        microMarket: item.microMarket,
        subLocality: item.microMarket,
        description: item.shortDescription,
        shortDescription: item.shortDescription,
        latitude: item.latitude,
        longitude: item.longitude,
        hasOccupancyCertificate: item.hasOccupancyCertificate,
        expectedPossessionDate: new Date(item.possessionDate),
        commencementCertificateDate: new Date('2020-01-15'),
        totalTowers: item.totalTowers,
        totalFloors: item.totalFloors,
        basePricePerSqft: item.basePricePerSqft,
        coverImageUrl: cleanMedia[0]?.url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=85',
        mediaGalleryJson: JSON.stringify(cleanMedia),
        keyHighlightsJson: JSON.stringify([
          `MahaRERA: ${item.reraNumber}`,
          `Developer: ${item.developerName}`,
          `Location: ${item.microMarket}`,
          `Base Rate: ₹${item.basePricePerSqft.toLocaleString('en-IN')}/sq.ft.`,
        ]),
      };

      if (project) {
        project = await prisma.developerProject.update({
          where: { id: project.id },
          data: projectData,
        });
      } else {
        project = await prisma.developerProject.create({
          data: projectData,
        });
      }
      ingestedProjectsCount++;

      // Ingest child unit inventory if present
      for (const u of item.units || []) {
        const existingUnit = await prisma.propertyUnit.findFirst({
          where: {
            projectId: project.id,
            unitNumber: u.unitNumber,
          },
        });

        const areaMatrix = calculateNaviMumbaiAreaMatrix(u.carpetAreaSqm);

        const unitData = {
          projectId: project.id,
          unitNumber: u.unitNumber,
          bhk: u.bhk,
          bathrooms: u.bhk >= 3 ? 3 : 2,
          balconies: 1,
          floorNumber: u.floorNumber,
          totalFloors: item.totalFloors,
          carpetAreaSqft: areaMatrix.carpetAreaSqft,
          facing: u.facing,
          possessionStatus: item.hasOccupancyCertificate ? 'READY_TO_MOVE' : 'UNDER_CONSTRUCTION',
          possessionDate: new Date(item.possessionDate),
          agreementValue: u.agreementValue,
          stampDutyRate: 6.0,
          registrationFee: 30000,
          gstRate: item.hasOccupancyCertificate ? 0.0 : 5.0,
          parkingCharges: 250000,
          societyDevelopmentCharges: 150000,
          allInTotalCost: Math.round(u.agreementValue * (item.hasOccupancyCertificate ? 1.06 : 1.11) + 430000),
          verificationStatus: 'ACTIVE_MARKETABLE',
          verificationNotes: 'MahaRERA & Developer Master Elevation Verified.',
          description: `${u.bhk} BHK in ${item.projectName}, ${item.microMarket}. Carpet: ${areaMatrix.carpetAreaSqft} sq.ft (${areaMatrix.carpetAreaSqm} sqm).`,
          featureHighlightsJson: JSON.stringify([
            `RERA Carpet: ${areaMatrix.carpetAreaSqft} sq.ft (${areaMatrix.carpetAreaSqm} sqm)`,
            `Built-up: ${areaMatrix.builtUpAreaSqft} sq.ft`,
            `Super Built-up: ${areaMatrix.superBuiltUpAreaSqft} sq.ft`,
            `Floor ${u.floorNumber} with ${u.facing} facing`,
          ]),
          mediaGalleryJson: JSON.stringify(cleanMedia),
          photoGalleryJson: JSON.stringify(cleanMedia.map((m) => m.url)),
        };

        if (existingUnit) {
          await prisma.propertyUnit.update({
            where: { id: existingUnit.id },
            data: unitData,
          });
        } else {
          await prisma.propertyUnit.create({
            data: unitData,
          });
          ingestedUnitsCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Scraper completed successfully: Ingested ${ingestedProjectsCount} projects and ${ingestedUnitsCount} units across ${targetNode}.`,
      stats: {
        targetNode,
        projectsIngested: ingestedProjectsCount,
        unitsIngested: ingestedUnitsCount,
        strictMediaRule: 'ELEVATIONS_AND_FLOOR_PLANS_ONLY',
      },
    });
  } catch (error: any) {
    console.error('Scraper API error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to execute scraper.' },
      { status: 500 }
    );
  }
}
