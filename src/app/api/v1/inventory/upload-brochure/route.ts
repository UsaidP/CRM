import { requireSession } from '@/lib/services/api-auth';
import { NextResponse } from 'next/server';
import path from 'path';
import {
  ingestBrochure,
  BrochureSource,
  BrochureIngestionError,
  sanitizeBrochureFilename,
  normalizeBrochureMimeType,
} from '@/lib/domain/brochure-ingestion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes for processing large (up to 50MB+) PDFs

/**
 * Developer Brochure Ingestion Route Handler
 *
 * Implements ADR-0001: Acts purely as an HTTP transport adapter.
 * All domain orchestration (AI vision parsing, media extraction, RERA fetching,
 * unit deduplication, and persistence) is delegated to ingestBrochure().
 */
export async function POST(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;

    const contentType = req.headers.get('content-type') || '';
    let source: BrochureSource | null = null;
    let projectId: string | null = null;

    // Flow 1: JSON payload (base64 payload, remote URL, local filename fallback, or raw text)
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      const rawFilename = body.filename || 'Developer_Brochure.pdf';
      const filename = sanitizeBrochureFilename(rawFilename);
      const mimeType = normalizeBrochureMimeType(body.mimeType);
      const brochureUrl = body.brochureUrl || null;
      projectId = body.projectId || null;

      let buffer: Buffer | null = null;

      // 1a. Base64 payload
      if (body.fileBase64 || body.base64) {
        const rawBase64 = String(body.fileBase64 || body.base64);
        const cleanBase64 = rawBase64.replace(/^data:[^;]+;base64,/, '');
        buffer = Buffer.from(cleanBase64, 'base64');
      }

      // 1b. Remote brochure URL
      if (!buffer && brochureUrl && typeof brochureUrl === 'string' && brochureUrl.startsWith('http')) {
        try {
          const fetched = await fetch(brochureUrl);
          if (fetched.ok) {
            const ab = await fetched.arrayBuffer();
            buffer = Buffer.from(ab);
          }
        } catch (fetchErr: any) {
          console.warn('[BROCHURE-ROUTE] Remote brochure fetch warning:', fetchErr.message);
        }
      }

      // 1c. Local sample file fallback (for development & demo project data)
      if (!buffer && (rawFilename || filename)) {
        try {
          const fs = await import('fs');
          const localPaths = [
            path.join(process.cwd(), 'data', 'Project Data', rawFilename),
            path.join(process.cwd(), 'data', 'Project Data', filename),
            path.join(process.cwd(), 'data', rawFilename),
            path.join(process.cwd(), 'data', filename),
            path.join(process.cwd(), 'public', 'uploads', 'brochures', rawFilename),
            path.join(process.cwd(), 'public', 'uploads', 'brochures', filename),
            path.join(process.cwd(), 'public', 'uploads', rawFilename),
            path.join(process.cwd(), 'public', 'uploads', filename),
          ];
          for (const p of localPaths) {
            if (fs.existsSync(/*turbopackIgnore: true*/ p)) {
              buffer = fs.readFileSync(/*turbopackIgnore: true*/ p);
              break;
            }
          }
        } catch (fsErr: any) {
          console.warn('[BROCHURE-ROUTE] Local file lookup warning:', fsErr.message);
        }
      }

      if (buffer && buffer.length > 0) {
        source = {
          kind: 'buffer',
          buffer,
          filename,
          mimeType,
          brochureUrl,
        };
      } else if (body.text || body.content) {
        source = {
          kind: 'text',
          text: body.text || body.content,
          filename,
          brochureUrl,
        };
      }
    } else {
      // Flow 2: Multipart Form Data or Direct Binary Stream
      let buffer: Buffer | null = null;
      let filename = 'Developer_Brochure.pdf';
      let mimeType = 'application/pdf';

      try {
        const formData = await req.formData();
        const file = formData.get('file') || formData.get('brochure');
        projectId = (formData.get('projectId') as string) || null;

        if (file && file instanceof File) {
          filename = sanitizeBrochureFilename(file.name);
          mimeType = normalizeBrochureMimeType(file.type);
          const ab = await file.arrayBuffer();
          buffer = Buffer.from(ab);
        }
      } catch (formErr: any) {
        console.warn('[BROCHURE-ROUTE] formData parse fallback:', formErr.message);
        try {
          const ab = await req.arrayBuffer();
          if (ab && ab.byteLength > 0) {
            buffer = Buffer.from(ab);
            mimeType = normalizeBrochureMimeType(contentType);
          }
        } catch (abErr: any) {
          console.warn('[BROCHURE-ROUTE] arrayBuffer fallback warning:', abErr.message);
        }
      }

      if (buffer && buffer.length > 0) {
        source = {
          kind: 'buffer',
          buffer,
          filename,
          mimeType,
        };
      }
    }

    if (!source) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please select a valid brochure file (PDF/Image) or paste brochure text to extract specifications.',
        },
        { status: 400 }
      );
    }

    const result = await ingestBrochure(source, {
      organizationId: auth.session.organizationId,
      userId: auth.session.userId,
      projectId,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    if (error instanceof BrochureIngestionError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error('[BROCHURE-ROUTE] Ingestion error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process and parse developer brochure document.' },
      { status: 500 }
    );
  }
}
