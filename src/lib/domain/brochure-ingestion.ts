/**
 * Brochure Ingestion Domain Pipeline
 *
 * Consolidates the multi-step developer brochure ingestion lifecycle:
 * 1. Transport-agnostic source extraction (Binary buffer, Cloud stream, or text)
 * 2. Broker Shield: Phone number erasure on brochure PDFs
 * 3. AI Multimodal Vision extraction & specification parsing
 * 4. Vault media persistence (original document, architectural elevations, floor plans)
 * 5. MahaRERA certificate resolution and verification binding
 * 6. Unit configuration deduplication and BHK floor plan binding
 * 7. Server-side atomic project synchronization
 *
 * Implements ADR-0001: Domain pipelines live in src/lib/domain, routes stay thin adapters.
 */

import path from 'path';
import { prisma } from '@/lib/db/prisma';
import { parseBrochureAsync, parseBrochureText } from '@/lib/services/brochure-parser-service';
import { downloadAndSaveMahaReraCertificate } from '@/lib/services/maharera-service';
import { extractAndProcessBrochure } from '@/lib/services/brochure-extractor';
import { persistBrochureExtraction } from '@/lib/services/brochure-persistence';
import { deduplicateUnitsByConfiguration } from '@/lib/services/unit-deduplication';
import { uploadMediaAsset } from '@/lib/services/cloud-media-service';
import { resolveAssetUrl, parseInventoryContent } from '@/lib/inventory-media';

export const MAX_BROCHURE_BYTES = 100 * 1024 * 1024; // 100 MB

export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function sanitizeBrochureFilename(name?: string | null): string {
  if (!name) return 'Developer_Brochure.pdf';
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.slice(0, 100) || 'Developer_Brochure.pdf';
}

export function normalizeBrochureMimeType(mime?: string | null): string {
  if (mime && ALLOWED_MIME_TYPES.has(mime.toLowerCase())) {
    return mime.toLowerCase();
  }
  return 'application/pdf';
}

export type BrochureSource =
  | {
      kind: 'buffer';
      buffer: Buffer;
      filename?: string;
      mimeType?: string;
      brochureUrl?: string | null;
    }
  | {
      kind: 'text';
      text: string;
      filename?: string;
      brochureUrl?: string | null;
    };

export interface IngestionContext {
  organizationId: string;
  userId?: string;
  projectId?: string | null;
}

export interface IngestionResult {
  data: Record<string, any>;
  extractionMethod: string;
  modelUsed?: string;
  note?: string;
  phoneNumbersErased?: boolean;
  brochureUrl?: string | null;
  reraCertificateUrl?: string;
  filename: string;
  fileSizeBytes?: number;
}

export class BrochureIngestionError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'BrochureIngestionError';
    this.statusCode = statusCode;
  }
}

/**
 * Executes the complete brochure ingestion pipeline.
 */
export async function ingestBrochure(
  source: BrochureSource,
  context: IngestionContext
): Promise<IngestionResult> {
  const { projectId } = context;

  // Process Binary Buffer
  if (source.kind === 'buffer') {
    let buffer = source.buffer;
    const filename = sanitizeBrochureFilename(source.filename);
    const mimeType = normalizeBrochureMimeType(source.mimeType);
    let brochureUrl = source.brochureUrl || null;

    if (!buffer || buffer.length === 0) {
      throw new BrochureIngestionError('Empty brochure buffer provided.', 400);
    }

    if (buffer.length > MAX_BROCHURE_BYTES) {
      throw new BrochureIngestionError('Brochure file exceeds the 100 MB maximum size limit.', 413);
    }

    // 1. Broker Shield: Pre-sanitize PDF buffer to erase broker phone numbers from pages
    let phoneNumbersErased = false;
    if (mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
      try {
        const { sanitizeBrochurePdfBuffer } = await import('@/lib/services/pdf-image-extractor');
        const sanitized = sanitizeBrochurePdfBuffer(buffer);
        buffer = sanitized.buffer;
        phoneNumbersErased = true;
      } catch (sanErr: any) {
        console.warn('[BROCHURE-INGESTION] Buffer pre-sanitization notice:', sanErr.message);
      }
    }

    // 2. AI-first multimodal parsing
    const { data: extracted, extractionMethod, modelUsed, note } = await parseBrochureAsync(
      buffer,
      mimeType,
      filename
    );

    const targetProjectName = extracted?.projectName || filename.replace(/\.[^/.]+$/, '');

    // 3. Upload original brochure document into cloud vault
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
        console.warn('[BROCHURE-INGESTION] Cloud media vault upload warning:', uploadErr.message);
      }
    }

    // 4. MahaRERA certificate resolution
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
        console.warn('[BROCHURE-INGESTION] MahaRERA certificate auto-fetch warning:', reraErr.message);
      }
    }

    // 5. Extract architectural elevations, floor plans, and renders
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
        units: (extracted.units || []).map((u: any) => ({
          bhk: u.bhk,
          carpetAreaSqft: u.carpetAreaSqft,
          title: u.bhkLabel,
        })),
        confidentialBrokerData: extracted.confidentialBrokerData,
        assetRecords: extracted.assetRecords,
        floorPlansList: extracted.floorPlansList,
        pages: extracted.pages,
        brochureUrl: brochureUrl || undefined,
      }
    );

    const primaryElevationUrl = resolveAssetUrl(mediaResult.elevations[0]) || null;
    const primaryMasterPlanUrl = resolveAssetUrl(mediaResult.masterPlan) || null;

    // 6. Deduplicate units by configuration
    const distinctUnits = deduplicateUnitsByConfiguration(extracted.units || [], {
      totalFloors: extracted.totalFloors,
      basePricePerSqft: extracted.basePricePerSqft,
      hasOccupancyCertificate: extracted.hasOccupancyCertificate,
      projectName: extracted.projectName,
      carpetToleranceSqft: 5,
    });

    // 7. Pre-bind BHK & carpet-matched brochure floor plans
    const enrichedUnits = distinctUnits.map((u: any) => {
      const bhkPlans = (mediaResult.floorPlans || []).filter(
        (fp: any) => Number(fp.bhk) === Number(u.bhk)
      );
      let matchingPlan = bhkPlans.find(
        (fp: any) =>
          fp.carpetAreaSqft &&
          Math.abs(Number(fp.carpetAreaSqft) - Number(u.carpetAreaSqft)) <= 25
      );
      if (!matchingPlan && bhkPlans.length > 0) {
        matchingPlan = bhkPlans[0];
      }
      const unitFloorPlanUrl = u.floorPlanUrl || resolveAssetUrl(matchingPlan) || null;
      return {
        ...u,
        floorPlanUrl: unitFloorPlanUrl,
      };
    });

    // 8. Server-side atomic sync if projectId was provided
    let updatedProject: any = null;
    if (projectId) {
      try {
        await persistBrochureExtraction(projectId, mediaResult);

        await prisma.developerProject.update({
          where: { id: projectId },
          data: {
            brochureUrl: brochureUrl || undefined,
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

        const fullProject = await prisma.developerProject.findUnique({
          where: { id: projectId },
          include: { units: true },
        });

        if (fullProject) {
          updatedProject = {
            ...parseInventoryContent(fullProject),
            units: fullProject.units.map((u) => ({
              ...u,
              ...parseInventoryContent(u),
            })),
          };
        }
      } catch (syncErr: any) {
        console.warn('[BROCHURE-INGESTION] Server-side atomic project sync warning:', syncErr.message);
      }
    }

    return {
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
      phoneNumbersErased,
      brochureUrl,
      reraCertificateUrl,
      filename,
      fileSizeBytes: buffer.length,
    };
  }

  // Process Pasted Text
  if (source.kind === 'text') {
    const { text } = source;
    const filename = sanitizeBrochureFilename(source.filename);
    const brochureUrl = source.brochureUrl || null;

    if (!text || text.trim().length < 10) {
      throw new BrochureIngestionError('Pasted brochure text must contain at least 10 characters.', 400);
    }

    const extracted = parseBrochureText(text, filename);

    const mediaResult = await extractAndProcessBrochure(
      Buffer.from(text, 'utf-8'),
      filename,
      {
        projectId: projectId || undefined,
        projectName: extracted.projectName,
        developerName: extracted.developerName,
        reraNumber: extracted.reraNumber,
        totalFloors: extracted.totalFloors,
        microMarket: extracted.microMarket,
        units: (extracted.units || []).map((u: any) => ({
          bhk: u.bhk,
          carpetAreaSqft: u.carpetAreaSqft,
          title: u.bhkLabel,
        })),
        confidentialBrokerData: extracted.confidentialBrokerData,
      }
    );

    let updatedProject: any = null;
    if (projectId) {
      try {
        await persistBrochureExtraction(projectId, mediaResult);
        const fullProject = await prisma.developerProject.findUnique({
          where: { id: projectId },
          include: { units: true },
        });
        if (fullProject) {
          updatedProject = {
            ...parseInventoryContent(fullProject),
            units: fullProject.units.map((u) => ({
              ...u,
              ...parseInventoryContent(u),
            })),
          };
        }
      } catch (persistErr: any) {
        console.warn('[BROCHURE-INGESTION] Pasted-text media persistence warning:', persistErr.message);
      }
    }

    return {
      data: {
        ...extracted,
        elevations: mediaResult.elevations,
        floorPlans: mediaResult.floorPlans,
        brochurePhotos: mediaResult.brochurePhotos,
        masterPlan: mediaResult.masterPlan,
        assetRecords: mediaResult.assetRecords || extracted.assetRecords || [],
        units: deduplicateUnitsByConfiguration(extracted.units || [], {
          totalFloors: extracted.totalFloors,
          basePricePerSqft: extracted.basePricePerSqft,
          hasOccupancyCertificate: extracted.hasOccupancyCertificate,
          projectName: extracted.projectName,
          carpetToleranceSqft: 5,
        }),
        updatedProject,
      },
      extractionMethod: 'REGEX_FALLBACK',
      brochureUrl,
      filename,
      phoneNumbersErased: false,
    };
  }

  throw new BrochureIngestionError('Invalid brochure source kind.', 400);
}
