import { uploadMediaAsset, type UploadedMediaAsset } from '@/lib/services/cloud-media-service';
import { prisma } from '@/lib/db/prisma';
import type { ProjectAssetRecord, ExtractedFloorPlanDetail } from '@/lib/services/brochure-parser-service';
import { resolveAssetUrl } from '@/lib/inventory-media';

export interface ExtractedBrochureAsset {
  type: 'ELEVATION' | 'FLOOR_PLAN' | 'MASTER_PLAN' | 'BROCHURE_PDF';
  title: string;
  description: string;
  bhk?: number;
  carpetAreaSqft?: number;
  viewAngle?: 'FRONT_FACADE' | 'PODIUM_VIEW' | 'NIGHT_AERIAL' | 'CLUBHOUSE';
  page_number?: number;
  mediaAsset: UploadedMediaAsset;
}

export interface BrochureExtractionResult {
  projectName: string;
  developerName: string;
  reraNumber?: string;
  brochureAsset?: UploadedMediaAsset;
  elevations: ExtractedBrochureAsset[];
  floorPlans: ExtractedBrochureAsset[];
  masterPlan?: ExtractedBrochureAsset;
  assetRecords?: ProjectAssetRecord[];
  confidentialBrokerData?: {
    developerSalesPocName?: string;
    developerSalesPocPhone?: string;
    developerEmail?: string;
    siteAddress?: string;
    officeAddress?: string;
    brokerShieldActive: boolean;
  };
  extractedAt: string;
}

/**
 * Universal Brochure Asset Extractor
 * Extracts genuine original images and rendered pages from developer brochures.
 * ZERO-FABRICATION POLICY: Never generates artificial SVG blueprints or synthetic vector elevations.
 */
export async function extractAndProcessBrochure(
  brochureBuffer: Buffer | ArrayBuffer,
  fileName: string,
  projectInfo: {
    projectId?: string;
    projectName: string;
    developerName: string;
    reraNumber?: string;
    totalFloors?: number;
    microMarket?: string;
    units?: Array<{ bhk: number; carpetAreaSqft?: number; title?: string }>;
    confidentialBrokerData?: {
      developerSalesPocName?: string;
      developerSalesPocPhone?: string;
      developerEmail?: string;
      siteAddress?: string;
      officeAddress?: string;
      brokerShieldActive?: boolean;
    };
    assetRecords?: ProjectAssetRecord[];
    floorPlansList?: ExtractedFloorPlanDetail[];
    pages?: Array<{ page_number: number; page_type: string; title?: string }>;
  }
): Promise<BrochureExtractionResult> {
  const {
    projectName,
    developerName,
    reraNumber,
    units: customUnits,
    confidentialBrokerData,
    assetRecords: aiAssetHints,
    floorPlansList,
    pages,
  } = projectInfo;

  // Determine appropriate MIME type from file extension
  const ext = fileName.toLowerCase().split('.').pop() || 'pdf';
  let mimeType = 'application/pdf';
  if (['png'].includes(ext)) mimeType = 'image/png';
  else if (['jpg', 'jpeg'].includes(ext)) mimeType = 'image/jpeg';
  else if (['webp'].includes(ext)) mimeType = 'image/webp';

  // 1. Upload original brochure/spec document to Cloud/Local Media Vault
  const brochureAsset = await uploadMediaAsset(
    brochureBuffer,
    fileName,
    'brochures',
    mimeType
  );

  const elevations: ExtractedBrochureAsset[] = [];
  const floorPlans: ExtractedBrochureAsset[] = [];
  let masterPlan: ExtractedBrochureAsset | undefined;
  const assetRecords: ProjectAssetRecord[] = [];
  let sortCounter = 1;
  const cleanProjSlug = projectName.toLowerCase().replace(/[^a-z0-9]/g, '_');

  // 2. Extract Real High-Resolution Raster Pages & Embedded Images from PDF
  let realPdfAssets: any[] = [];
  const bBuffer = Buffer.isBuffer(brochureBuffer) ? brochureBuffer : Buffer.from(brochureBuffer);

  if (mimeType === 'application/pdf' || ext === 'pdf') {
    try {
      const { extractRealImagesFromPdf } = await import('@/lib/services/pdf-image-extractor');
      realPdfAssets = await extractRealImagesFromPdf(bBuffer, fileName, projectName, {
        customUnits,
        aiAssetHints,
        floorPlansList,
        pages,
      });
    } catch (err: any) {
      console.warn('[BROCHURE] Real PDF extraction notice:', err.message);
    }
  }

  // 3. Process and Upload Real Extracted JPEG/PNG Images
  if (realPdfAssets && realPdfAssets.length > 0) {
    for (const item of realPdfAssets) {
      const isFloorPlan = item.assetType.includes('floor') || item.assetType.includes('unit');
      const isElevationOrCover = item.assetType.includes('elevation') || item.assetType === 'cover';
      const category = isFloorPlan ? 'floor-plans' : isElevationOrCover ? 'elevations' : 'gallery';

      const uploaded = await uploadMediaAsset(item.buffer, item.fileName, category, item.mimeType || 'image/jpeg');

      const assetObj: ExtractedBrochureAsset = {
        type: item.assetType === 'master_plan' ? 'MASTER_PLAN' : isFloorPlan ? 'FLOOR_PLAN' : 'ELEVATION',
        title: item.title,
        description: item.description,
        bhk: item.bhk,
        carpetAreaSqft: item.carpetAreaSqft,
        viewAngle: item.viewAngle,
        page_number: item.pageNumber,
        mediaAsset: uploaded,
      };

      if (item.assetType === 'master_plan' || item.assetType === 'location_map') {
        masterPlan = assetObj;
      } else if (isFloorPlan) {
        floorPlans.push(assetObj);
      } else {
        elevations.push(assetObj);
      }

      assetRecords.push({
        asset_id: `asset_${cleanProjSlug}_${sortCounter}`,
        project_id: projectInfo.projectId,
        asset_type: item.assetType as any,
        subtype: item.subtype,
        title: item.title,
        file_url: uploaded.secureUrl || uploaded.url,
        page_number: item.pageNumber,
        original: true,
        display_position: item.assetType,
        sort_order: sortCounter++,
        confidence: 0.99,
        bhk: item.bhk,
        carpetAreaSqft: item.carpetAreaSqft,
        description: item.description,
      });
    }
  }

  // 4. Fallback for image-based single uploads (PNG/JPG)
  if (assetRecords.length === 0 && (mimeType.startsWith('image/'))) {
    elevations.push({
      type: 'ELEVATION',
      title: `${projectName} Main Image`,
      description: `Original uploaded asset for ${projectName}`,
      mediaAsset: brochureAsset,
    });

    assetRecords.push({
      asset_id: `asset_${cleanProjSlug}_1`,
      project_id: projectInfo.projectId,
      asset_type: 'elevation',
      subtype: 'original_image',
      title: `${projectName} Main Image`,
      file_url: resolveAssetUrl(brochureAsset),
      page_number: 1,
      original: true,
      display_position: 'elevation',
      sort_order: 1,
      confidence: 1.0,
      description: `Original uploaded document image.`,
    });
  }

  // 5. If projectId provided, attach the extracted original cover elevation, gallery, and floor plans to DB
  if (projectInfo.projectId) {
    try {
      const coverUrl = resolveAssetUrl(elevations[0]?.mediaAsset) || resolveAssetUrl(brochureAsset);
      const mpUrl = resolveAssetUrl(masterPlan?.mediaAsset) || null;

      await prisma.developerProject.update({
        where: { id: projectInfo.projectId },
        data: {
          brochureUrl: resolveAssetUrl(brochureAsset),
          coverImageUrl: coverUrl || undefined,
          masterPlanUrl: mpUrl || undefined,
          mediaGalleryJson: JSON.stringify(assetRecords),
          developerSalesPocName: confidentialBrokerData?.developerSalesPocName || undefined,
          developerSalesPocPhone: confidentialBrokerData?.developerSalesPocPhone || undefined,
        },
      });

      // Also attach floor plans to matching units
      const units = await prisma.propertyUnit.findMany({
        where: { projectId: projectInfo.projectId },
      });

      for (const unit of units) {
        const matchingPlan = floorPlans.find((fp) => fp.bhk === unit.bhk) || floorPlans[0];
        if (matchingPlan) {
          await prisma.propertyUnit.update({
            where: { id: unit.id },
            data: {
              floorPlanUrl: resolveAssetUrl(matchingPlan.mediaAsset),
            },
          });
        }
      }
    } catch (dbErr: any) {
      console.warn(`[BROCHURE] Failed to auto-attach assets to database: ${dbErr.message}`);
    }
  }

  return {
    projectName,
    developerName,
    reraNumber,
    brochureAsset,
    elevations,
    floorPlans,
    masterPlan,
    assetRecords,
    confidentialBrokerData: confidentialBrokerData ? {
      ...confidentialBrokerData,
      brokerShieldActive: true,
    } : {
      brokerShieldActive: true,
    },
    extractedAt: new Date().toISOString(),
  };
}
