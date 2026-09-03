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
    let projectName = (formData.get('projectName') as string) || null;

    if (projectId && !projectName) {
      const project = await prisma.developerProject.findUnique({
        where: { id: projectId },
        select: { projectName: true },
      });
      if (project?.projectName) {
        projectName = project.projectName;
      }
    }

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded. Please attach a file in the form-data under key "file".' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name || 'upload.jpg';
    let mimeType = file.type || '';
    if (!mimeType) {
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      if (['mp4', 'mov', 'webm', 'm4v', 'mkv'].includes(ext)) {
        mimeType = ext === 'webm' ? 'video/webm' : ext === 'mov' ? 'video/quicktime' : 'video/mp4';
      } else if (['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(ext)) {
        mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      } else if (ext === 'pdf') {
        mimeType = 'application/pdf';
      } else {
        mimeType = 'image/jpeg';
      }
    }

    const isVideo = category === 'videos' || mimeType.startsWith('video/') || fileName.match(/\.(mp4|mov|webm|m4v)$/i);
    const finalCategory = isVideo ? 'videos' : category;

    const asset = await uploadMediaAsset(buffer, fileName, finalCategory, mimeType, projectName || undefined);
    const mediaUrl = asset.secureUrl || asset.url;

    const assetObject = {
      id: asset.publicId,
      url: mediaUrl,
      kind: isVideo ? 'video' : 'image',
      title: fileName.replace(/\.[^/.]+$/, '').slice(0, 120),
      mimeType,
      bytes: asset.fileSizeBytes,
      category: finalCategory,
    };

    // Helper to append to JSON array column
    const appendJson = (existingJson: string | null | undefined, item: any) => {
      try {
        const arr = existingJson ? JSON.parse(existingJson) : [];
        if (Array.isArray(arr)) {
          arr.push(item);
          return JSON.stringify(arr);
        }
      } catch {}
      return JSON.stringify([item]);
    };

    // If projectId is provided, update project records
    if (projectId) {
      const project = await prisma.developerProject.findUnique({ where: { id: projectId } });
      if (project) {
        const updateData: Record<string, any> = {};

        if (isVideo) {
          if (!project.youtubeWalkthroughUrl) {
            updateData.youtubeWalkthroughUrl = mediaUrl;
          }
          updateData.mediaGalleryJson = appendJson(project.mediaGalleryJson, assetObject);
        } else if (isCover || category === 'elevations') {
          if (isCover || !project.coverImageUrl) {
            updateData.coverImageUrl = mediaUrl;
          }
          updateData.elevationImagesJson = appendJson(project.elevationImagesJson, {
            url: mediaUrl,
            title: assetObject.title,
            viewAngle: 'FRONT_FACADE',
          });
          updateData.mediaGalleryJson = appendJson(project.mediaGalleryJson, assetObject);
        } else if (category === 'brochures' || mimeType === 'application/pdf') {
          updateData.brochureUrl = mediaUrl;
        } else {
          updateData.mediaGalleryJson = appendJson(project.mediaGalleryJson, assetObject);
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.developerProject.update({
            where: { id: projectId },
            data: updateData,
          });
        }
      }
    }

    // If unitId is provided, update unit records
    if (unitId) {
      const unit = await prisma.propertyUnit.findUnique({ where: { id: unitId } });
      if (unit) {
        const unitUpdate: Record<string, any> = {};

        if (isVideo) {
          if (!unit.videoReelUrl) {
            unitUpdate.videoReelUrl = mediaUrl;
          }
          unitUpdate.videosJson = appendJson(unit.videosJson, assetObject);
          unitUpdate.mediaGalleryJson = appendJson(unit.mediaGalleryJson, assetObject);
        } else if (isFloorPlan || category === 'floor-plans') {
          unitUpdate.floorPlanUrl = mediaUrl;
          unitUpdate.floorPlanImagesJson = appendJson(unit.floorPlanImagesJson, {
            url: mediaUrl,
            bhk: unit.bhk,
            carpetAreaSqft: unit.carpetAreaSqft,
            title: `${unit.bhk} BHK Layout Plan`,
          });
        } else {
          unitUpdate.mediaGalleryJson = appendJson(unit.mediaGalleryJson, assetObject);
          unitUpdate.photoGalleryJson = appendJson(unit.photoGalleryJson, mediaUrl);
        }

        if (Object.keys(unitUpdate).length > 0) {
          await prisma.propertyUnit.update({
            where: { id: unitId },
            data: unitUpdate,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      asset,
      message: `File uploaded successfully to ${asset.storageProvider} (${finalCategory})`,
    });
  } catch (error: any) {
    console.error('[MEDIA_UPLOAD_API_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload media asset.' },
      { status: 500 }
    );
  }
}
