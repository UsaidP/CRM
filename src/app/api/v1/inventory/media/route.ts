import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';
import { uploadMediaAsset } from '@/lib/services/cloud-media-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_BYTES = 300 * 1024 * 1024;

export async function POST(req: Request) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  try {
    const formData = await req.formData();
    const files = formData.getAll('files').filter((value): value is File => value instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ success: false, error: 'Choose at least one image or video.' }, { status: 400 });
    }
    if (files.length > 12) {
      return NextResponse.json({ success: false, error: 'Upload up to 12 files at a time.' }, { status: 400 });
    }

    const uploaded = [];
    for (const file of files) {
      const kind = IMAGE_TYPES.has(file.type) ? 'image' : VIDEO_TYPES.has(file.type) ? 'video' : null;
      if (!kind) {
        return NextResponse.json({ success: false, error: `${file.name} is not a supported image or video format.` }, { status: 415 });
      }
      const maxBytes = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
      if (file.size > maxBytes) {
        return NextResponse.json({ success: false, error: `${file.name} exceeds the ${kind === 'image' ? '50 MB image' : '300 MB video'} limit.` }, { status: 413 });
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const asset = await uploadMediaAsset(fileBuffer, file.name, 'gallery', file.type);
      uploaded.push({
        id: asset.publicId,
        url: asset.secureUrl || asset.url,
        kind,
        title: file.name.replace(/\.[^/.]+$/, '').slice(0, 120),
        alt: file.name.replace(/\.[^/.]+$/, '').slice(0, 240),
        mimeType: file.type,
        bytes: file.size,
      });
    }

    return NextResponse.json({ success: true, data: uploaded }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Media upload failed.' }, { status: 400 });
  }
}
