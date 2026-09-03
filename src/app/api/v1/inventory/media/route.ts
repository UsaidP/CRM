import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';
import { uploadMediaAsset, type MediaCategory } from '@/lib/services/cloud-media-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KNOWN_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
  'image/heic',
  'image/heif',
  'image/bmp',
]);

const KNOWN_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
  'video/m4v',
  'video/x-matroska',
  'video/mkv',
  'video/avi',
  'video/x-msvideo',
  'video/ogg',
]);

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'svg', 'gif', 'heic', 'heif', 'bmp']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'm4v', 'mkv', 'avi', 'wmv', '3gp']);

const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_BYTES = 300 * 1024 * 1024;

function detectMediaKindAndMime(file: File): { kind: 'image' | 'video' | null; mimeType: string } {
  const rawType = (file.type || '').toLowerCase().trim();
  const ext = (file.name || '').split('.').pop()?.toLowerCase().trim() || '';

  if (KNOWN_IMAGE_TYPES.has(rawType) || IMAGE_EXTENSIONS.has(ext) || rawType.startsWith('image/')) {
    const mime = rawType || (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg');
    return { kind: 'image', mimeType: mime };
  }

  if (KNOWN_VIDEO_TYPES.has(rawType) || VIDEO_EXTENSIONS.has(ext) || rawType.startsWith('video/')) {
    const mime = rawType || (ext === 'webm' ? 'video/webm' : ext === 'mov' ? 'video/quicktime' : ext === 'mkv' ? 'video/x-matroska' : 'video/mp4');
    return { kind: 'video', mimeType: mime };
  }

  return { kind: null, mimeType: rawType || 'application/octet-stream' };
}

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
      const { kind, mimeType } = detectMediaKindAndMime(file);
      if (!kind) {
        return NextResponse.json(
          { success: false, error: `"${file.name}" is not a recognized image or video format.` },
          { status: 415 }
        );
      }
      const maxBytes = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
      if (file.size > maxBytes) {
        return NextResponse.json(
          {
            success: false,
            error: `"${file.name}" exceeds the ${kind === 'image' ? '50 MB photo' : '300 MB walkthrough video'} limit.`,
          },
          { status: 413 }
        );
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const category: MediaCategory = kind === 'video' ? 'videos' : 'gallery';
      const asset = await uploadMediaAsset(fileBuffer, file.name, category, mimeType);

      uploaded.push({
        id: asset.publicId,
        url: asset.secureUrl || asset.url,
        kind,
        title: file.name.replace(/\.[^/.]+$/, '').slice(0, 120),
        alt: file.name.replace(/\.[^/.]+$/, '').slice(0, 240),
        mimeType,
        bytes: file.size,
      });
    }

    return NextResponse.json({ success: true, data: uploaded }, { status: 201 });
  } catch (error: any) {
    console.error('[INVENTORY_MEDIA_UPLOAD_ERROR]', error);
    return NextResponse.json({ success: false, error: error.message || 'Media upload failed.' }, { status: 400 });
  }
}
