import { NextRequest, NextResponse } from 'next/server';
import { extractAndProcessBrochure } from '@/lib/services/brochure-extractor';
import { persistBrochureExtraction } from '@/lib/services/brochure-persistence';
import { prisma } from '@/lib/db/prisma';
import { requireSession, orgScope } from '@/lib/services/api-auth';

export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  try {
    const contentType = req.headers.get('content-type') || '';
    let projectId = '';
    let brochureBuffer: Buffer;
    let fileName = 'Project_Brochure.pdf';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      projectId = (formData.get('projectId') as string) || '';

      if (!file) {
        return NextResponse.json(
          { error: 'No brochure PDF uploaded. Please attach a file under key "file".' },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      brochureBuffer = Buffer.from(bytes);
      fileName = file.name || fileName;
    } else {
      const body = await req.json();
      projectId = body.projectId || '';
      if (!body.brochureBase64) {
        return NextResponse.json(
          { error: 'No brochureBase64 provided in request body.' },
          { status: 400 }
        );
      }
      brochureBuffer = Buffer.from(body.brochureBase64, 'base64');
      fileName = body.fileName || fileName;
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId. Please provide the project ID to extract brochure assets for.' },
        { status: 400 }
      );
    }

    const project = await prisma.developerProject.findFirst({
      where: { id: projectId, ...orgScope(auth.session) },
      include: { units: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: `DeveloperProject not found with ID: ${projectId}` },
        { status: 404 }
      );
    }

    const result = await extractAndProcessBrochure(brochureBuffer, fileName, {
      projectId: project.id,
      projectName: project.projectName,
      developerName: project.developerName,
      reraNumber: project.reraNumber,
      totalFloors: project.totalFloors,
      microMarket: project.microMarket,
    });

    // The extractor is pure — persist structured media + BHK-matched unit pre-fill here.
    const { project: persistedProject, unitsUpdated } = await persistBrochureExtraction(project.id, result);

    return NextResponse.json({
      success: true,
      result,
      persistedProject,
      unitsUpdated,
      message: `Extracted ${result.elevations.length} Elevation renders and ${result.floorPlans.length} Floor Plans from brochure for ${project.projectName}! Persisted to project and ${unitsUpdated} unit(s) pre-filled.`,
    });
  } catch (error: any) {
    console.error('[EXTRACT_BROCHURE_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract brochure media assets.' },
      { status: 500 }
    );
  }
}
