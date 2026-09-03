import { prisma } from '@/lib/db/prisma';
import { resolveAssetUrl, parseJsonArray } from '@/lib/inventory-media';
import type { ExtractedBrochureAsset } from './brochure-extractor';
import type { ProjectAssetRecord } from './brochure-parser-service';

export interface BrochureMediaForPersistence {
  elevations?: ExtractedBrochureAsset[];
  floorPlans?: ExtractedBrochureAsset[];
  brochurePhotos?: ExtractedBrochureAsset[];
  masterPlan?: ExtractedBrochureAsset;
  brochureAsset?: unknown;
  assetRecords?: ProjectAssetRecord[];
}

/**
 * BHK-only floor plan matching. Zero-fabrication: when no plan matches the
 * unit's BHK configuration, we return an empty list instead of broadcasting
 * mismatched plans into the unit's gallery.
 */
export function matchFloorPlansForUnit<T extends { bhk?: number | null }>(
  unitBhk: number,
  floorPlans: T[]
): T[] {
  return floorPlans.filter((fp) => Number(fp.bhk) === Number(unitBhk));
}

/**
 * Single authoritative persistence step for brochure extraction results.
 *
 * Responsibilities (previously duplicated between brochure-extractor.ts and
 * upload-brochure/route.ts):
 *  1. Writes structured media fields on the project:
 *     elevationImagesJson / floorPlanImagesJson / brochurePhotosJson
 *  2. Merges mediaGalleryJson while PRESERVING assetRecords metadata objects
 *     (asset_type etc.) required for future backfills — dedup by URL.
 *  3. Pre-fills units: elevations go to all units; floor plans are matched
 *     strictly by BHK (no broadcast fallback).
 *
 * Scalar project spec sync (amenities, floors, pricing...) remains the
 * caller's responsibility.
 */
export async function persistBrochureExtraction(
  projectId: string,
  media: BrochureMediaForPersistence
): Promise<{ project: any; unitsUpdated: number }> {
  const project = await prisma.developerProject.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new Error(`DeveloperProject not found with ID: ${projectId}`);
  }

  const elevationImagesData = (media.elevations || [])
    .map((e, idx) => ({
      id: e.mediaAsset?.publicId || `elev_${idx + 1}`,
      url: resolveAssetUrl(e.mediaAsset),
      title: e.title,
      viewAngle: e.viewAngle,
      description: e.description,
      page_number: e.page_number,
    }))
    .filter((a) => Boolean(a.url));

  const floorPlanImagesData = (media.floorPlans || [])
    .map((fp, idx) => ({
      id: fp.mediaAsset?.publicId || `fp_${idx + 1}`,
      url: resolveAssetUrl(fp.mediaAsset),
      title: fp.title,
      bhk: fp.bhk,
      carpetAreaSqft: fp.carpetAreaSqft,
      description: fp.description,
      page_number: fp.page_number,
    }))
    .filter((a) => Boolean(a.url));

  const brochurePhotosData = (media.brochurePhotos || [])
    .map((bp, idx) => ({
      id: bp.mediaAsset?.publicId || `photo_${idx + 1}`,
      url: resolveAssetUrl(bp.mediaAsset),
      title: bp.title,
      description: bp.description,
    }))
    .filter((a) => Boolean(a.url));

  // Merge gallery while keeping asset metadata objects; dedup by resolved URL.
  const galleryByUrl = new Map<string, unknown>();
  for (const item of parseJsonArray<unknown>(project.mediaGalleryJson)) {
    const url = resolveAssetUrl(item);
    if (url) galleryByUrl.set(url, item);
  }
  for (const rec of media.assetRecords || []) {
    const url = resolveAssetUrl(rec);
    if (url && !galleryByUrl.has(url)) galleryByUrl.set(url, rec);
  }
  const mergedGallery = Array.from(galleryByUrl.values());

  const data: Record<string, unknown> = {
    mediaGalleryJson: JSON.stringify(mergedGallery),
    // Only overwrite structured fields when the extraction actually produced assets
    elevationImagesJson: elevationImagesData.length > 0 ? JSON.stringify(elevationImagesData) : project.elevationImagesJson,
    floorPlanImagesJson: floorPlanImagesData.length > 0 ? JSON.stringify(floorPlanImagesData) : project.floorPlanImagesJson,
    brochurePhotosJson: brochurePhotosData.length > 0 ? JSON.stringify(brochurePhotosData) : project.brochurePhotosJson,
    // Existing cover/master plan win — never downgrade what the broker curated
    coverImageUrl: project.coverImageUrl || elevationImagesData[0]?.url || resolveAssetUrl(media.brochureAsset) || null,
    masterPlanUrl: project.masterPlanUrl || resolveAssetUrl(media.masterPlan?.mediaAsset) || null,
  };
  const brochureUrl = resolveAssetUrl(media.brochureAsset);
  if (brochureUrl) data.brochureUrl = brochureUrl;

  const updatedProject = await prisma.developerProject.update({
    where: { id: projectId },
    data,
  });

  // Unit pre-fill: elevations to all units; floor plans BHK-matched only.
  const units = await prisma.propertyUnit.findMany({ where: { projectId } });
  let unitsUpdated = 0;
  for (const unit of units) {
    const matchingPlans = matchFloorPlansForUnit(unit.bhk, floorPlanImagesData);
    if (elevationImagesData.length === 0 && matchingPlans.length === 0) continue;

    const unitData: Record<string, unknown> = {};
    if (elevationImagesData.length > 0) {
      unitData.elevationImagesJson = JSON.stringify(elevationImagesData);
    }
    if (matchingPlans.length > 0) {
      unitData.floorPlanImagesJson = JSON.stringify(matchingPlans);
      unitData.floorPlanUrl = matchingPlans[0].url;
    }

    // Populate unit's mediaGalleryJson & photoGalleryJson with floor plan and elevation assets
    const existingUnitGallery = parseJsonArray<any>(unit.mediaGalleryJson);
    const existingUrls = new Set(existingUnitGallery.map((item: any) => resolveAssetUrl(item)).filter(Boolean));
    const newUnitGallery = [...existingUnitGallery];

    if (matchingPlans.length > 0) {
      for (const fp of matchingPlans) {
        if (fp.url && !existingUrls.has(fp.url)) {
          existingUrls.add(fp.url);
          newUnitGallery.push({
            id: fp.id || `fp_${unit.bhk}`,
            url: fp.url,
            title: fp.title || `${unit.bhk} BHK Floor Plan Layout`,
            kind: 'image',
            category: 'floor-plans',
            bhk: unit.bhk,
          });
        }
      }
    }

    if (elevationImagesData.length > 0 && elevationImagesData[0]?.url && !existingUrls.has(elevationImagesData[0].url)) {
      existingUrls.add(elevationImagesData[0].url);
      newUnitGallery.push({
        id: elevationImagesData[0].id || 'elev_cover',
        url: elevationImagesData[0].url,
        title: elevationImagesData[0].title || 'Architectural Elevation',
        kind: 'image',
        category: 'elevations',
      });
    }

    unitData.mediaGalleryJson = JSON.stringify(newUnitGallery);
    unitData.photoGalleryJson = JSON.stringify(newUnitGallery.filter((a: any) => a.kind === 'image').map((a: any) => resolveAssetUrl(a)));

    await prisma.propertyUnit.update({ where: { id: unit.id }, data: unitData });
    unitsUpdated++;
  }

  return { project: updatedProject, unitsUpdated };
}