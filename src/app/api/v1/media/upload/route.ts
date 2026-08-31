import { NextRequest, NextResponse } from 'next/server';
import { uploadMediaAsset, type MediaCategory } from '@/lib/services/cloud-media-service';
import { prisma } from '@/lib/db/prisma';
import { requireSession } from '@/lib/services/api-auth';

export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as MediaCategory) || 'general';
    const projectId = formData.get('projectId') as string | null;
    const unitId = formData.get('unitId') as string | null;
    const isCover = formData.get('isCover') === 'true';
    const isFloorPlan = formData.get('isFloorPlan') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded. Please attach a file in the form-data under key "file".' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name || 'upload.jpg';
    const mimeType = file.type || 'image/jpeg';

    const asset = await uploadMediaAsset(buffer, fileName, category, mimeType);

    // If projectId is provided, update project records
    if (projectId) {
      if (isCover || category === 'elevations') {
        await prisma.developerProject.update({
          where: { id: projectId },
          data: {
            coverImageUrl: asset.secureUrl || asset.url,
          },
        });
      } else if (category === 'brochures' || mimeType === 'application/pdf') {
        await prisma.developerProject.update({
          where: { id: projectId },
          data: {
            brochureUrl: asset.secureUrl || asset.url,
          },
        });
      }
    }

    // If unitId is provided and isFloorPlan, update unit floor plan
    if (unitId && (isFloorPlan || category === 'floor-plans')) {
      await prisma.propertyUnit.update({
        where: { id: unitId },
        data: {
          floorPlanUrl: asset.secureUrl || asset.url,
        },
      });
    }

    return NextResponse.json({
      success: true,
      asset,
      message: `File uploaded successfully to ${asset.storageProvider} (${category})`,
    });
  } catch (error: any) {
    console.error('[MEDIA_UPLOAD_API_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload media asset.' },
      { status: 500 }
    );
  }
}
