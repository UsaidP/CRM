import { randomUUID } from 'node:crypto';
import { requireSession } from '@/lib/services/api-auth';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { parseBrochureAsync, parseBrochureText } from '@/lib/services/brochure-parser-service';
import { downloadAndSaveMahaReraCertificate } from '@/lib/services/maharera-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_PDF_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const contentType = req.headers.get('content-type') || '';

    // Flow 1: Raw JSON text payload (for direct text paste or quick inspection)
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const text = body.text || body.content || '';
      const filename = body.filename || 'Developer_Brochure.pdf';

      if (!text || text.trim().length < 10) {
        return NextResponse.json(
          { success: false, error: 'Please provide valid brochure text to parse.' },
          { status: 400 }
        );
      }

      const extracted = parseBrochureText(text, filename);
      return NextResponse.json({
        success: true,
        data: extracted,
        extractionMethod: 'REGEX_FALLBACK',
        brochureUrl: body.brochureUrl || null,
        filename,
      });
    }

    // Flow 2: Multipart Form Data with PDF / Image File Upload
    const formData = await req.formData();
    const file = formData.get('file') || formData.get('brochure');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Please select a developer brochure PDF or floor plan image to upload.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Brochure file exceeds the 50 MB maximum size limit.' },
        { status: 413 }
      );
    }

    // Read buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save file to public/uploads/brochures/
    const uploadId = randomUUID();
    const sanitizedName = file.name.toLowerCase().replace(/[^a-z0-9.]/g, '_');
    const storedFileName = `${uploadId}_${sanitizedName}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'brochures');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, storedFileName), buffer);

    const brochureUrl = `/uploads/brochures/${storedFileName}`;

    // Process with AI-first multimodal parsing
    const { data: extracted, extractionMethod, modelUsed, note } = await parseBrochureAsync(
      buffer,
      file.type || 'application/pdf',
      file.name
    );

    // Automated MahaRERA Registry Search & Official Certificate Download
    let reraCertificateUrl: string | undefined;
    let reraVerification: any = null;

    if (extracted?.reraNumber) {
      try {
        const certResult = await downloadAndSaveMahaReraCertificate(
          extracted.reraNumber,
          extracted.projectName,
          extracted.developerName
        );
        reraCertificateUrl = certResult.certificateUrl;
        reraVerification = certResult.projectRecord;
      } catch (reraErr: any) {
        console.warn('MahaRERA certificate auto-fetch warning:', reraErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...extracted,
        brochureUrl,
        reraCertificateUrl,
        reraVerification,
      },
      extractionMethod,
      modelUsed,
      note,
      brochureUrl,
      reraCertificateUrl,
      filename: file.name,
      fileSizeBytes: file.size,
    });
  } catch (error: any) {
    console.error('Upload brochure error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process and parse developer brochure PDF.' },
      { status: 500 }
    );
  }
}

