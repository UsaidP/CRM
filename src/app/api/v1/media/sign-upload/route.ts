import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';
import { generateCloudinaryUploadSignature, isCloudinaryConfigured, type MediaCategory } from '@/lib/services/cloud-media-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const category = (searchParams.get('category') as MediaCategory) || 'brochures';
  const fileName = searchParams.get('filename') || 'upload.pdf';
  const resourceType = (searchParams.get('resourceType') as 'image' | 'video' | 'raw' | 'auto') || 'auto';

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({
      success: false,
      configured: false,
      error: 'Cloudinary is not configured in environment.',
    });
  }

  const signed = generateCloudinaryUploadSignature(category, fileName, resourceType);
  if (!signed) {
    return NextResponse.json(
      {
        success: false,
        configured: false,
        error: 'Failed to generate upload signature.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    configured: true,
    signed,
  });
}
