import { requireSession } from '@/lib/services/api-auth';
import { NextResponse } from 'next/server';
import path from 'path';
import { prisma } from '@/lib/db/prisma';
import { parseBrochureAsync, parseBrochureText } from '@/lib/services/brochure-parser-service';
import { downloadAndSaveMahaReraCertificate } from '@/lib/services/maharera-service';
import { extractAndProcessBrochure } from '@/lib/services/brochure-extractor';
import { persistBrochureExtraction } from '@/lib/services/brochure-persistence';
import { uploadMediaAsset } from '@/lib/services/cloud-media-service';
import { resolveAssetUrl } from '@/lib/inventory-media';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.slice(0, 100) || 'Developer_Brochure.pdf';
}

function normalizeMimeType(mime?: string | null): string {
  if (mime && ALLOWED_MIME_TYPES.has(mime.toLowerCase())) {
    return mime.toLowerCase();
  }
  return 'application/pdf';
}

export async function POST(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const contentType = req.headers.get('content-type') || '';

    let buffer: Buffer | null = null;
    let filename = 'Developer_Brochure.pdf';
    let mimeType = 'application/pdf';
    let brochureUrl: string | null = null;
    let pastedText: string | null = null;
    let projectId: string | null = null;

    // Flow 1: JSON payload (direct Cloudinary URL, Base64 document payload, or raw text paste)
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const rawFilename = body.filename || 'Developer_Brochure.pdf';
      filename = sanitizeFilename(rawFilename);
      brochureUrl = body.brochureUrl || null;
      mimeType = normalizeMimeType(body.mimeType);
      projectId = body.projectId || null;

      // 1. Prefer direct Base64 document payload (immediate in-memory decoding)
      if (body.fileBase64 || body.base64) {
        const rawBase64 = String(body.fileBase64 || body.base64);
        const cleanBase64 = rawBase64.replace(/^data:[^;]+;base64,/, '');
        buffer = Buffer.from(cleanBase64, 'base64');
      }

      // 2. If no buffer yet but brochureUrl provided, fetch remote stream
      if (!buffer && brochureUrl && typeof brochureUrl === 'string' && brochureUrl.startsWith('http')) {
        try {
          const fetched = await fetch(brochureUrl);
          if (fetched.ok) {
            const ab = await fetched.arrayBuffer();
            buffer = Buffer.from(ab);
            mimeType = normalizeMimeType(fetched.headers.get('content-type') || mimeType);
          }
        } catch (fetchErr: any) {
          console.warn('[BROCHURE] Could not fetch buffer from brochureUrl:', fetchErr.message);
        }
      }

      // 3. Fallback check for local project files in data/Project Data and uploads
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
            if (fs.existsSync(p)) {
              buffer = fs.readFileSync(p);
              break;
            }
          }
        } catch (fsErr: any) {
          console.warn('[BROCHURE] Local file fallback check error:', fsErr.message);
        }
      }

      if (body.text || body.content) {
        pastedText = body.text || body.content;
      }
    } else {
      // Flow 2: Multipart Form Data or Direct Binary Stream
      try {
        const formData = await req.formData();
        const file = formData.get('file') || formData.get('brochure');
        projectId = (formData.get('projectId') as string) || null;

        if (file && file instanceof File) {
          filename = sanitizeFilename(file.name);
          mimeType = normalizeMimeType(file.type);
          const ab = await file.arrayBuffer();
          buffer = Buffer.from(ab);
        }
      } catch (formErr: any) {
        console.warn('[BROCHURE] req.formData() failed, attempting arrayBuffer fallback:', formErr.message);
        try {
          const ab = await req.arrayBuffer();
          if (ab && ab.byteLength > 0) {
            buffer = Buffer.from(ab);
            mimeType = normalizeMimeType(contentType);
          }
        } catch (abErr: any) {
          console.warn('[BROCHURE] req.arrayBuffer() fallback failed:', abErr.message);
        }
      }
    }

    // Process from Binary Buffer (AI Multimodal Vision Extraction)
    if (buffer && buffer.length > 0) {
      if (buffer.length > MAX_FILE_BYTES) {
        return NextResponse.json(
          { success: false, error: 'Brochure file exceeds the 100 MB maximum size limit.' },
          { status: 413 }
        );
      }

      // 1. AI-first multimodal parsing to identify project facts & specifications
      const { data: extracted, extractionMethod, modelUsed, note } = await parseBrochureAsync(
        buffer,
        mimeType,
        filename
      );

      const targetProjectName = extracted?.projectName || filename.replace(/\.[^/.]+$/, '');

      // 2. Upload original brochure document into the project's folder in Cloudinary/Vault
      if (!brochureUrl) {
        try {
          const brochureAsset = await uploadMediaAsset(
            buffer,
            filename,
            'brochures',
            mimeType,
            targetProjectName
          );
          brochureUrl = resolveAssetUrl(brochureAsset);
        } catch (uploadErr: any) {
          console.warn('[BROCHURE] Cloud media vault upload warning:', uploadErr.message);
        }
      }

      let reraCertificateUrl: string | undefined;
      let reraVerification: any = null;

      if (extracted?.reraNumber) {
        try {
          const certResult = await downloadAndSaveMahaReraCertificate(
            extracted.reraNumber,
            extracted.projectName,
            extracted.developerName,
            targetProjectName
          );
          reraCertificateUrl = certResult.certificateUrl;
          reraVerification = certResult.projectRecord;
        } catch (reraErr: any) {
          console.warn('[BROCHURE] MahaRERA certificate auto-fetch warning:', reraErr.message);
        }
      }

      // 3. Extract and upload all genuine architectural elevations, floor plans, and renders to project folder
      const mediaResult = await extractAndProcessBrochure(
        buffer,
        filename,
        {
          projectId: projectId || undefined,
          projectName: extracted.projectName,
          developerName: extracted.developerName,
          reraNumber: extracted.reraNumber,
          totalFloors: extracted.totalFloors,
          microMarket: extracted.microMarket,
          units: (extracted.units || []).map((u: any) => ({ bhk: u.bhk, carpetAreaSqft: u.carpetAreaSqft, title: u.bhkLabel })),
          confidentialBrokerData: extracted.confidentialBrokerData,
          assetRecords: extracted.assetRecords,
          floorPlansList: extracted.floorPlansList,
          pages: extracted.pages,
        }
      );

      const primaryElevationUrl = resolveAssetUrl(mediaResult.elevations[0]) || null;
      const primaryMasterPlanUrl = resolveAssetUrl(mediaResult.masterPlan) || null;

      // 4. Enrich extracted distinct units by pre-binding BHK & carpet-matched brochure floor plans
      const enrichedUnits = (extracted.units || []).map((u: any, idx: number) => {
        const bhkPlans = (mediaResult.floorPlans || []).filter((fp: any) => Number(fp.bhk) === Number(u.bhk));
        let matchingPlan = bhkPlans.find((fp: any) => fp.carpetAreaSqft && Math.abs(Number(fp.carpetAreaSqft) - Number(u.carpetAreaSqft)) <= 25);
        if (!matchingPlan && bhkPlans.length > 0) {
          matchingPlan = bhkPlans[0];
        }
        const unitFloorPlanUrl = u.floorPlanUrl || resolveAssetUrl(matchingPlan) || null;
        return {
          ...u,
          unitNumber: u.unitNumber || `${u.bhk} BHK (${u.carpetAreaSqft || 500} sqft)`,
          floorPlanUrl: unitFloorPlanUrl,
        };
      });

      // Server-side atomic sync if projectId was provided.
      let updatedProject: any = null;
      if (projectId) {
        try {
          const { project: persistedProject } = await persistBrochureExtraction(projectId, mediaResult);

          updatedProject = await prisma.developerProject.update({
            where: { id: projectId },
            data: {
              totalTowers: extracted.totalTowers ? parseInt(String(extracted.totalTowers), 10) : undefined,
              totalFloors: extracted.totalFloors ? parseInt(String(extracted.totalFloors), 10) : undefined,
              basePricePerSqft: extracted.basePricePerSqft ? parseFloat(String(extracted.basePricePerSqft)) : undefined,
              amenitiesJson: extracted.amenities?.length ? JSON.stringify(extracted.amenities) : undefined,
              keyHighlightsJson: extracted.keyHighlights?.length ? JSON.stringify(extracted.keyHighlights) : undefined,
              developerSalesPocName: extracted.confidentialBrokerData?.developerSalesPocName || undefined,
              developerSalesPocPhone: extracted.confidentialBrokerData?.developerSalesPocPhone || undefined,
              coverImageUrl: primaryElevationUrl || undefined,
              masterPlanUrl: primaryMasterPlanUrl || undefined,
            },
          });
          void persistedProject;
        } catch (syncErr: any) {
          console.warn('[BROCHURE] Server-side atomic project sync warning:', syncErr.message);
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          ...extracted,
          coverImageUrl: primaryElevationUrl || extracted.coverImageUrl || null,
          masterPlanUrl: primaryMasterPlanUrl || extracted.masterPlanUrl || null,
          brochureUrl,
          reraCertificateUrl,
          reraVerification,
          elevations: mediaResult.elevations,
          floorPlans: mediaResult.floorPlans,
          brochurePhotos: mediaResult.brochurePhotos,
          masterPlan: mediaResult.masterPlan,
          assetRecords: mediaResult.assetRecords || extracted.assetRecords || [],
          confidentialBrokerData: extracted.confidentialBrokerData,
          units: enrichedUnits,
          updatedProject,
        },
        extractionMethod,
        modelUsed,
        note,
        brochureUrl,
        reraCertificateUrl,
        filename,
        fileSizeBytes: buffer.length,
      });
    }

    // Process from Pasted Text (Regex Fallback)
    if (pastedText && pastedText.trim().length >= 10) {
      const extracted = parseBrochureText(pastedText, filename);

      const mediaResult = await extractAndProcessBrochure(
        Buffer.from(pastedText, 'utf-8'),
        filename,
        {
          projectId: projectId || undefined,
          projectName: extracted.projectName,
          developerName: extracted.developerName,
          reraNumber: extracted.reraNumber,
          totalFloors: extracted.totalFloors,
          microMarket: extracted.microMarket,
          units: (extracted.units || []).map((u: any) => ({ bhk: u.bhk, carpetAreaSqft: u.carpetAreaSqft, title: u.bhkLabel })),
          confidentialBrokerData: extracted.confidentialBrokerData,
        }
      );

      // Persist structured media + unit pre-fill when a project context exists
      // (the extractor is pure; persistence lives in the shared helper).
      if (projectId) {
        try {
          await persistBrochureExtraction(projectId, mediaResult);
        } catch (persistErr: any) {
          console.warn('[BROCHURE] Pasted-text media persistence warning:', persistErr.message);
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          ...extracted,
          elevations: mediaResult.elevations,
          floorPlans: mediaResult.floorPlans,
          masterPlan: mediaResult.masterPlan,
          assetRecords: mediaResult.assetRecords || extracted.assetRecords || [],
        },
        extractionMethod: 'REGEX_FALLBACK',
        brochureUrl: brochureUrl || null,
        filename,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Please select a valid brochure file (PDF/Image) or paste brochure text to extract specifications.',
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[BROCHURE] Upload brochure error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process and parse developer brochure document.' },
      { status: 500 }
    );
  }
}
