import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import {
  ingestBrochure,
  sanitizeBrochureFilename,
  normalizeBrochureMimeType,
  BrochureIngestionError,
} from '@/lib/domain/brochure-ingestion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes for processing large PDFs

/**
 * Chunked Brochure Upload & AI Extraction Route Handler
 * 
 * Bypasses Vercel's 4.5MB Serverless Function payload limit by receiving 
 * files in slices (e.g. 2.5MB chunks), storing them temporarily in PostgreSQL, 
 * and assembling the full document upon receipt of the final chunk.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;

    const formData = await req.formData();
    const uploadId = formData.get('uploadId') as string;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string, 10);
    const totalChunks = parseInt(formData.get('totalChunks') as string, 10);
    const rawFilename = (formData.get('filename') as string) || 'Developer_Brochure.pdf';
    const filename = sanitizeBrochureFilename(rawFilename);
    const mimeType = normalizeBrochureMimeType((formData.get('mimeType') as string) || 'application/pdf');
    const projectId = (formData.get('projectId') as string) || null;
    const chunkFile = formData.get('chunk') as File | null;

    if (!uploadId || isNaN(chunkIndex) || isNaN(totalChunks) || !chunkFile) {
      return NextResponse.json(
        { success: false, error: 'Invalid chunk payload parameters.' },
        { status: 400 }
      );
    }

    const chunkBuffer = Buffer.from(await chunkFile.arrayBuffer());

    // Save or update chunk in DB
    await prisma.brochureUploadChunk.upsert({
      where: {
        uploadId_chunkIndex: {
          uploadId,
          chunkIndex,
        },
      },
      create: {
        uploadId,
        chunkIndex,
        totalChunks,
        filename,
        mimeType,
        chunkData: chunkBuffer,
      },
      update: {
        chunkData: chunkBuffer,
      },
    });

    const receivedCount = await prisma.brochureUploadChunk.count({
      where: { uploadId },
    });

    // Still waiting for remaining chunks
    if (receivedCount < totalChunks) {
      return NextResponse.json({
        success: true,
        completed: false,
        uploadedChunks: receivedCount,
        totalChunks,
        chunkIndex,
      });
    }

    // All chunks received: Assemble and ingest!
    const allChunks = await prisma.brochureUploadChunk.findMany({
      where: { uploadId },
      orderBy: { chunkIndex: 'asc' },
    });

    if (allChunks.length !== totalChunks) {
      return NextResponse.json({
        success: true,
        completed: false,
        uploadedChunks: allChunks.length,
        totalChunks,
      });
    }

    const fullBuffer = Buffer.concat(allChunks.map((c) => Buffer.from(c.chunkData)));

    // Immediately clean up session chunks to free database storage
    await prisma.brochureUploadChunk.deleteMany({
      where: { uploadId },
    }).catch((cleanupErr) => {
      console.warn('[CHUNK-UPLOAD] Chunk cleanup notice:', cleanupErr.message);
    });

    // Lazy cleanup of any abandoned chunks older than 2 hours
    prisma.brochureUploadChunk.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
    }).catch(() => {});

    // Run the complete brochure ingestion domain pipeline
    const result = await ingestBrochure(
      {
        kind: 'buffer',
        buffer: fullBuffer,
        filename,
        mimeType,
      },
      {
        organizationId: auth.session.organizationId,
        userId: auth.session.userId,
        projectId,
      }
    );

    return NextResponse.json({
      success: true,
      completed: true,
      ...result,
    });
  } catch (error: any) {
    if (error instanceof BrochureIngestionError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error('[CHUNK-UPLOAD] Ingestion error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process chunked brochure document.' },
      { status: 500 }
    );
  }
}

/**
 * Clean up an aborted or cancelled upload session
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const uploadId = searchParams.get('uploadId');
    if (uploadId) {
      await prisma.brochureUploadChunk.deleteMany({
        where: { uploadId },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
