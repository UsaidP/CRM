import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { requireSession } from '@/lib/services/api-auth';
import { handleApiError } from '@/lib/services/api-handler';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No audio file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'recordings');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.name) || '.mp3';
    const cleanId = crypto.randomUUID();
    const fileName = `call_${cleanId}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/recordings/${fileName}`;

    return NextResponse.json({
      success: true,
      secure_url: publicUrl,
      url: publicUrl,
      fileName,
      fileSizeBytes: buffer.length,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to save audio file');
  }
}
