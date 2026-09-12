import { uploadMediaAsset, type UploadedMediaAsset } from '@/lib/services/cloud-media-service';
import type { ProjectAssetRecord, ExtractedFloorPlanDetail } from '@/lib/services/brochure-parser-service';
import { resolveAssetUrl } from '@/lib/inventory-media';
import { persistBrochureExtraction } from '@/lib/services/brochure-persistence';

export interface ExtractedBrochureAsset {
  type: 'ELEVATION' | 'FLOOR_PLAN' | 'MASTER_PLAN' | 'BROCHURE_PHOTO' | 'BROCHURE_PDF';
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
  brochurePhotos: ExtractedBrochureAsset[];
  masterPlan?: ExtractedBrochureAsset;
  assetRecords?: ProjectAssetRecord[];
  coverImageUrl?: string;
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
    brochureUrl?: string;
    brochureAsset?: UploadedMediaAsset;
    alreadySanitized?: boolean;
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
    brochureUrl: existingBrochureUrl,
    brochureAsset: providedBrochureAsset,
    alreadySanitized,
  } = projectInfo;

  // Determine appropriate MIME type from file extension
  const ext = fileName.toLowerCase().split('.').pop() || 'pdf';
  let mimeType = 'application/pdf';
  if (['png'].includes(ext)) mimeType = 'image/png';
  else if (['jpg', 'jpeg'].includes(ext)) mimeType = 'image/jpeg';
  else if (['webp'].includes(ext)) mimeType = 'image/webp';

  let bBuffer = Buffer.isBuffer(brochureBuffer) ? brochureBuffer : Buffer.from(brochureBuffer);

  // Broker Shield: Sanitize PDF brochure to ensure phone numbers are erased on the stored document (skip if already sanitized at ingestion)
  if (!alreadySanitized && (mimeType === 'application/pdf' || ext === 'pdf')) {
    try {
      const { sanitizeBrochurePdfBuffer } = await import('@/lib/services/pdf-image-extractor');
      const sanitized = sanitizeBrochurePdfBuffer(bBuffer);
      bBuffer = sanitized.buffer;
    } catch (sanErr: any) {
      console.warn('[BROCHURE] PDF buffer pre-upload sanitization notice:', sanErr.message);
    }
  }

  // 1. Upload original brochure/spec document if not already uploaded
  let brochureAsset: UploadedMediaAsset | undefined = providedBrochureAsset;
  if (!brochureAsset && existingBrochureUrl) {
    let extractedPublicId = `brochure_${projectName}`;
    if (existingBrochureUrl.includes('res.cloudinary.com')) {
      const match = existingBrochureUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^/.]+$|$)/);
      if (match && match[1]) {
        extractedPublicId = match[1];
      }
    }
    brochureAsset = {
      url: existingBrochureUrl,
      secureUrl: existingBrochureUrl,
      publicId: extractedPublicId,
      storageProvider: existingBrochureUrl.includes('cloudinary') ? 'CLOUDINARY' : 'LOCAL',
      fileName,
      fileSizeBytes: bBuffer.length,
      mimeType,
      category: 'brochures',
      format: ext,
      createdAt: new Date().toISOString(),
    };
  } else if (!brochureAsset) {
    brochureAsset = await uploadMediaAsset(
      bBuffer,
      fileName,
      'brochures',
      mimeType,
      projectName
    );
  }

  const elevations: ExtractedBrochureAsset[] = [];
  const floorPlans: ExtractedBrochureAsset[] = [];
  const brochurePhotos: ExtractedBrochureAsset[] = [];
  let masterPlan: ExtractedBrochureAsset | undefined;
  const assetRecords: ProjectAssetRecord[] = [];
  let sortCounter = 1;
  const cleanProjSlug = projectName.toLowerCase().replace(/[^a-z0-9]/g, '_');

  // 2. Extract Real High-Resolution Raster Pages & Embedded Images from PDF
  let realPdfAssets: any[] = [];

  if (mimeType === 'application/pdf' || ext === 'pdf') {
    try {
      const { extractRealImagesFromPdf } = await import('@/lib/services/pdf-image-extractor');
      realPdfAssets = await extractRealImagesFromPdf(bBuffer, fileName, projectName, {
        customUnits,
        aiAssetHints,
        floorPlansList,
        pages,
        alreadySanitized: true,
      });
    } catch (err: any) {
      console.warn('[BROCHURE] Real PDF extraction notice:', err.message);
    }
  }

  // 3. Process and Upload Real Extracted JPEG/PNG Images to Project Folder
  const amenities: ExtractedBrochureAsset[] = [];
  let locationMap: ExtractedBrochureAsset | undefined;

  if (realPdfAssets && realPdfAssets.length > 0) {
    const uploadedAssetMap = new Map<string, UploadedMediaAsset>();

    // Parallelize image asset uploads in batches of 4 to cut latency
    const BATCH_SIZE = 4;
    for (let i = 0; i < realPdfAssets.length; i += BATCH_SIZE) {
      const batch = realPdfAssets.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (item) => {
          if (uploadedAssetMap.has(item.fileName)) return;
          const isFloorPlan = 
            item.assetType.includes('floor') || 
            item.assetType.includes('unit') || 
            item.assetType.includes('layout');
          const isElevationOrCover = item.assetType.includes('elevation') || item.assetType === 'cover';
          const category = isFloorPlan ? 'floor-plans' : isElevationOrCover ? 'elevations' : 'gallery';

          try {
            const uploaded = await uploadMediaAsset(
              item.buffer,
              item.fileName,
              category,
              item.mimeType || 'image/jpeg',
              projectName
            );
            uploadedAssetMap.set(item.fileName, uploaded);
          } catch (uploadErr: any) {
            console.warn(`[BROCHURE] Image asset upload failed for ${item.fileName}:`, uploadErr.message);
          }
        })
      );
    }

    for (const item of realPdfAssets) {
      const isMasterPlan = item.assetType === 'master_plan';
      const isLocationMap = item.assetType === 'location_map';
      const isFloorPlan = 
        item.assetType.includes('floor') || 
        item.assetType.includes('unit') || 
        item.assetType.includes('layout');
      const isElevationOrCover = item.assetType.includes('elevation') || item.assetType === 'cover';
      const isAmenity = item.assetType === 'amenity';

      const uploaded = uploadedAssetMap.get(item.fileName) || {
        url: `/uploads/projects/${cleanProjSlug}/${item.fileName}`,
        secureUrl: `/uploads/projects/${cleanProjSlug}/${item.fileName}`,
        publicId: `local_${cleanProjSlug}_${item.fileName}`,
        storageProvider: 'LOCAL' as const,
        fileName: item.fileName,
        fileSizeBytes: item.buffer?.length || 0,
        mimeType: item.mimeType || 'image/jpeg',
        category: isFloorPlan ? 'floor-plans' : isElevationOrCover ? 'elevations' : 'gallery',
        format: 'jpg',
        createdAt: new Date().toISOString(),
      };

      const assetTypeEnum: ExtractedBrochureAsset['type'] = 
        isMasterPlan ? 'MASTER_PLAN' :
        isFloorPlan ? 'FLOOR_PLAN' :
        isElevationOrCover ? 'ELEVATION' : 'BROCHURE_PHOTO';

      const assetObj: ExtractedBrochureAsset = {
        type: assetTypeEnum,
        title: item.title,
        description: item.description,
        bhk: item.bhk,
        carpetAreaSqft: item.carpetAreaSqft,
        viewAngle: item.viewAngle,
        page_number: item.pageNumber,
        mediaAsset: uploaded,
      };

      if (isMasterPlan) {
        masterPlan = assetObj;
      } else if (isLocationMap) {
        locationMap = assetObj;
        brochurePhotos.push(assetObj);
      } else if (isFloorPlan) {
        floorPlans.push(assetObj);
      } else if (isElevationOrCover) {
        elevations.push(assetObj);
      } else if (isAmenity) {
        amenities.push(assetObj);
        brochurePhotos.push(assetObj);
      } else {
        brochurePhotos.push(assetObj);
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

  // 3b. Serverless Cloud Fallback: Extract high-definition raster pages via Cloudinary multi-page transform
  if (assetRecords.length === 0 && (mimeType === 'application/pdf' || ext === 'pdf') && brochureAsset.storageProvider === 'CLOUDINARY') {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'odq6wbxe';
    const aiHints = aiAssetHints || [];
    const fpList = projectInfo.floorPlansList || [];

    const pageItems: Array<{ pageNum: number; hint?: any; fp?: any }> = [];
    if (aiHints.length > 0) {
      for (const hint of aiHints) {
        const pageNum = Number(hint.page_number || (hint as any).pageNumber) || 1;
        if (!pageItems.some((p) => p.pageNum === pageNum)) {
          pageItems.push({ pageNum, hint });
        }
      }
    }
    const rawPagesList = projectInfo.pages || [];
    if (rawPagesList.length > 0) {
      for (const p of rawPagesList) {
        const pageNum = Number(p.page_number || (p as any).pageNumber) || 1;
        if (!pageItems.some((item) => item.pageNum === pageNum)) {
          pageItems.push({ pageNum, hint: p });
        }
      }
    }
    if (!pageItems.some((p) => p.pageNum === 1)) {
      pageItems.unshift({ pageNum: 1 });
    }

    const cleanPublicId = brochureAsset.publicId.replace(/\.pdf$/i, '');

    for (const item of pageItems) {
      const pageNum = item.pageNum;
      const matchingHint = item.hint || aiHints.find((h) => Number(h.page_number) === pageNum);
      const matchingFp = fpList.find((fp) => Number(fp.page_number) === pageNum);

      let assetType: 'ELEVATION' | 'FLOOR_PLAN' | 'MASTER_PLAN' | 'BROCHURE_PHOTO' = 'BROCHURE_PHOTO';
      let title = `${projectName} Page ${pageNum}`;
      let description = `High-resolution original brochure page ${pageNum} for ${projectName}.`;
      let bhk = matchingHint?.bhk || matchingFp?.units?.[0]?.bhk;
      let carpetAreaSqft = matchingHint?.carpetAreaSqft || matchingFp?.units?.[0]?.carpetAreaSqft;

      const rawType = String(matchingHint?.asset_type || matchingHint?.assetType || matchingHint?.page_type || '').toLowerCase();
      if (pageNum === 1 || rawType.includes('elevation') || rawType.includes('cover')) {
        assetType = 'ELEVATION';
        title = matchingHint?.title || (pageNum === 1 ? `${projectName} Main Elevation Facade` : `${projectName} Architectural Render`);
      } else if (rawType.includes('floor') || rawType.includes('unit') || matchingFp) {
        assetType = 'FLOOR_PLAN';
        title = matchingHint?.title || (bhk ? `${bhk} BHK Floor Plan Layout` : `${projectName} Sanctioned Floor Plan`);
      } else if (rawType.includes('master')) {
        assetType = 'MASTER_PLAN';
        title = matchingHint?.title || `${projectName} Master Layout & Campus Schematic`;
      } else if (rawType.includes('location') || rawType.includes('map')) {
        assetType = 'BROCHURE_PHOTO';
        title = matchingHint?.title || `${projectName} Location & Connectivity Map`;
      } else if (rawType.includes('amenit')) {
        assetType = 'BROCHURE_PHOTO';
        title = matchingHint?.title || `${projectName} Lifestyle Amenities`;
      } else {
        assetType = 'BROCHURE_PHOTO';
        title = matchingHint?.title || `${projectName} Page ${pageNum}`;
      }

      const pageImgUrl = `https://res.cloudinary.com/${cloudName}/image/upload/pg_${pageNum}/${cleanPublicId}.jpg`;

      const pageMediaAsset: UploadedMediaAsset = {
        url: pageImgUrl,
        secureUrl: pageImgUrl,
        publicId: `${cleanPublicId}_pg_${pageNum}`,
        storageProvider: 'CLOUDINARY',
        fileName: `${cleanProjSlug}_page_${pageNum}.jpg`,
        fileSizeBytes: 250000,
        mimeType: 'image/jpeg',
        category: assetType === 'FLOOR_PLAN' ? 'floor-plans' : assetType === 'ELEVATION' ? 'elevations' : 'gallery',
        format: 'jpg',
        createdAt: new Date().toISOString(),
      };

      const assetObj: ExtractedBrochureAsset = {
        type: assetType,
        title,
        description: matchingHint?.description || description,
        bhk,
        carpetAreaSqft,
        viewAngle: assetType === 'ELEVATION' ? (pageNum === 1 ? 'FRONT_FACADE' : 'PODIUM_VIEW') : undefined,
        page_number: pageNum,
        mediaAsset: pageMediaAsset,
      };

      if (assetType === 'MASTER_PLAN') {
        masterPlan = assetObj;
      } else if (assetType === 'FLOOR_PLAN') {
        floorPlans.push(assetObj);
      } else if (assetType === 'ELEVATION') {
        elevations.push(assetObj);
      } else {
        brochurePhotos.push(assetObj);
      }

      assetRecords.push({
        asset_id: `asset_${cleanProjSlug}_${sortCounter}`,
        project_id: projectInfo.projectId,
        asset_type: (rawType || (assetType === 'ELEVATION' ? 'elevation' : assetType === 'FLOOR_PLAN' ? 'floor_plan' : 'brochure_page')) as any,
        subtype: 'cloud_rasterized_page',
        title,
        file_url: pageImgUrl,
        page_number: pageNum,
        original: true,
        display_position: assetType.toLowerCase(),
        sort_order: sortCounter++,
        confidence: 0.99,
        bhk,
        carpetAreaSqft,
        description: matchingHint?.description || description,
      });
    }
  }

  // 4. Fallback for image-based single uploads (PNG/JPG)
  if (assetRecords.length === 0 && (mimeType.startsWith('image/'))) {
    const singleElevation: ExtractedBrochureAsset = {
      type: 'ELEVATION',
      title: `${projectName} Main Image`,
      description: `Original uploaded asset for ${projectName}`,
      mediaAsset: brochureAsset,
    };
    elevations.push(singleElevation);

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

  // 5. Preserve all extracted elevations and floor plans (no destructive slicing)
  const primaryElevationUrl = elevations[0] ? resolveAssetUrl(elevations[0].mediaAsset) : undefined;

  const result: BrochureExtractionResult = {
    projectName,
    developerName,
    reraNumber,
    brochureAsset,
    elevations,
    floorPlans,
    brochurePhotos,
    masterPlan,
    assetRecords,
    coverImageUrl: primaryElevationUrl,
    confidentialBrokerData: confidentialBrokerData ? {
      ...confidentialBrokerData,
      brokerShieldActive: true,
    } : {
      brokerShieldActive: true,
    },
    extractedAt: new Date().toISOString(),
  };

  if (projectInfo.projectId) {
    try {
      await persistBrochureExtraction(projectInfo.projectId, {
        elevations,
        floorPlans,
        brochurePhotos,
        masterPlan,
        brochureAsset,
        assetRecords,
      });
    } catch (persistErr: any) {
      console.warn('[BROCHURE-EXTRACT] Project persistence notice:', persistErr.message);
    }
  }

  return result;
}
