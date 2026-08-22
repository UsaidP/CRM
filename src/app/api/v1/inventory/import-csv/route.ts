import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { parseProjectsCSV } from '@/lib/domain/inventory-csv-parser';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let csvText = '';
    let requireProjectFilter = true;
    let organizationId = '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      csvText = body.csvText || '';
      requireProjectFilter = body.requireProjectFilter !== false;
      organizationId = body.organizationId || '';
    } else {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (file) {
        csvText = await file.text();
      } else {
        csvText = (formData.get('csvText') as string) || '';
      }
      requireProjectFilter = formData.get('requireProjectFilter') !== 'false';
      organizationId = (formData.get('organizationId') as string) || '';
    }

    if (!csvText || csvText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'No CSV content provided. Please upload a file or paste CSV text.' },
        { status: 400 }
      );
    }

    // Parse CSV records
    const parseResult = parseProjectsCSV(csvText, requireProjectFilter);
    if (parseResult.errors.length > 0 && parseResult.projects.length === 0) {
      return NextResponse.json(
        { success: false, error: parseResult.errors.join(', ') },
        { status: 400 }
      );
    }

    // Resolve organization
    if (!organizationId) {
      const firstOrg = await prisma.organization.findFirst();
      organizationId = firstOrg?.id || '';
    }

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'No active CRM organization found to attach imported projects.' },
        { status: 400 }
      );
    }

    let createdCount = 0;
    let updatedCount = 0;
    const importedProjects = [];

    for (const item of parseResult.projects) {
      // Deduplicate using MahaRERA ID as Idempotency Key
      const existing = await prisma.developerProject.findFirst({
        where: {
          organizationId,
          reraNumber: item.reraNumber,
        },
      });

      const parsedPossession = item.possessionDate && !isNaN(Date.parse(item.possessionDate))
        ? new Date(item.possessionDate)
        : new Date('2026-12-31');

      const isReadyToMove = parsedPossession.getTime() <= Date.now();

      const projectData = {
        organizationId,
        projectName: item.projectName,
        developerName: item.developerName,
        reraNumber: item.reraNumber,
        microMarket: item.microMarket,
        subLocality: item.subLocality || item.microMarket,
        description: item.shortDescription || `${item.projectName} by ${item.developerName}`,
        shortDescription: item.shortDescription,
        latitude: item.latitude,
        longitude: item.longitude,
        hasOccupancyCertificate: isReadyToMove,
        expectedPossessionDate: parsedPossession,
        commencementCertificateDate: new Date('2020-01-15'),
        totalTowers: item.totalTowers || 2,
        totalFloors: item.totalFloors || 20,
        basePricePerSqft: item.basePricePerSqft || 12000,
        coverImageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=85',
        mediaGalleryJson: JSON.stringify([
          {
            id: `elev-import-${item.reraNumber}-1`,
            url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=85',
            kind: 'image',
            type: 'ELEVATION',
            category: 'elevation',
            title: `${item.projectName} Tower Elevation`,
          },
          {
            id: `fp-import-${item.reraNumber}-1`,
            url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
            kind: 'image',
            type: 'FLOOR_PLAN',
            category: 'floorplan',
            title: `${item.projectName} Master Layout Plan`,
          },
        ]),
        keyHighlightsJson: JSON.stringify([
          `MahaRERA Registered: ${item.reraNumber}`,
          `Developer: ${item.developerName}`,
          `Location: ${item.microMarket}`,
          `Base Rate: ₹${item.basePricePerSqft?.toLocaleString('en-IN')}/sq.ft.`,
        ]),
      };

      if (existing) {
        const updated = await prisma.developerProject.update({
          where: { id: existing.id },
          data: projectData,
        });
        updatedCount++;
        importedProjects.push(updated);
      } else {
        const created = await prisma.developerProject.create({
          data: projectData,
        });
        createdCount++;
        importedProjects.push(created);
      }
    }

    return NextResponse.json({
      success: true,
      message: `CSV Import completed: ${createdCount} new project shells created, ${updatedCount} updated, ${parseResult.filteredOutCount} broker resale listings filtered out.`,
      stats: {
        totalRowsParsed: parseResult.totalRows,
        filteredOutBrokerListings: parseResult.filteredOutCount,
        validProjectShells: parseResult.projects.length,
        createdCount,
        updatedCount,
      },
      projects: importedProjects,
    });
  } catch (error: any) {
    console.error('Error importing projects CSV:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process CSV import.' },
      { status: 500 }
    );
  }
}
