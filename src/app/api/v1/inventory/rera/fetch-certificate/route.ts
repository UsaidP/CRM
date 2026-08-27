import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import { downloadAndSaveMahaReraCertificate, searchMahaReraProject } from '@/lib/services/maharera-service';
import { validateReraNumber } from '@/lib/domain/verification-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { reraNumber, projectName, developerName, projectId } = body;

    if (!reraNumber || typeof reraNumber !== 'string') {
      return NextResponse.json(
        { success: false, error: 'MahaRERA registration number is required.' },
        { status: 400 }
      );
    }

    const validation = validateReraNumber(reraNumber);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid MahaRERA registration number.' },
        { status: 400 }
      );
    }

    // Execute autonomous certificate pipeline
    const { projectRecord, certificateUrl, fileName, fileSizeBytes } =
      await downloadAndSaveMahaReraCertificate(reraNumber, projectName, developerName);

    // If a specific project record ID was provided, sync certificate into DB
    if (projectId && typeof projectId === 'string') {
      try {
        await prisma.developerProject.update({
          where: { id: projectId },
          data: {
            reraCertificateUrl: certificateUrl,
            reraRegisteredName: projectRecord.projectName,
            reraProjectStatus: projectRecord.projectStatus,
            reraValidUntil: projectRecord.validUntil ? new Date(projectRecord.validUntil) : undefined,
            reraVerificationDate: new Date(),
            reraCertDataJson: JSON.stringify(projectRecord),
          },
        });
      } catch (dbErr: any) {
        console.warn(`Could not link RERA certificate to project ${projectId}:`, dbErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        certificateUrl,
        fileName,
        fileSizeBytes,
        projectRecord,
        officialPortalUrl: projectRecord.officialPortalUrl,
        directSearchUrl: projectRecord.directSearchUrl,
      },
      message: `MahaRERA Certificate for ${projectRecord.projectName} (${projectRecord.reraNumber}) synchronized successfully.`,
    });
  } catch (error: any) {
    console.error('Fetch RERA Certificate error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch and process MahaRERA certificate.' },
      { status: 500 }
    );
  }
}
