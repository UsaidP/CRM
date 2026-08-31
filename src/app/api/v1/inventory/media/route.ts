import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;

function extensionFor(type: string, originalName: string) {
  const extension = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, '');
  if (extension) return extension;
  const fallback: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/avif': '.avif',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
  };
  return fallback[type] || '';
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
      const kind = IMAGE_TYPES.has(file.type) ? 'image' : VIDEO_TYPES.has(file.type) ? 'video' : null;
      if (!kind) {
        return NextResponse.json({ success: false, error: `${file.name} is not a supported image or video format.` }, { status: 415 });
      }
      const maxBytes = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
      if (file.size > maxBytes) {
        return NextResponse.json({ success: false, error: `${file.name} exceeds the ${kind === 'image' ? '25 MB image' : '250 MB video'} limit.` }, { status: 413 });
      }

      const id = randomUUID();
      const directory = path.join(process.cwd(), 'public', 'uploads', 'inventory');
      await mkdir(directory, { recursive: true });
      const filename = `${id}${extensionFor(file.type, file.name)}`;
      await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
      uploaded.push({
        id,
        url: `/uploads/inventory/${filename}`,
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
