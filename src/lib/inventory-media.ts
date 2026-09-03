export type InventoryMediaKind = 'image' | 'video';

export interface InventoryMediaAsset {
  id: string;
  url: string;
  kind: InventoryMediaKind;
  title?: string;
  alt?: string;
  caption?: string;
  posterUrl?: string;
  thumbnailUrl?: string;
  duration?: string;
  durationSeconds?: number;
  hostName?: string;
  hostRole?: string;
  category?: 'interior' | 'exterior' | 'floorplan' | 'walkthrough' | 'amenity' | 'view';
  mimeType?: string;
  bytes?: number;
  width?: number;
  height?: number;
}

export function parseJsonArray<T>(value: string | null | undefined, fallback: T[] = []): T[] {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export interface ElevationMediaAsset {
  id?: string;
  url: string;
  title?: string;
  viewAngle?: 'FRONT_FACADE' | 'PODIUM_VIEW' | 'NIGHT_AERIAL' | 'CLUBHOUSE' | string;
  description?: string;
  page_number?: number;
}

export interface FloorPlanMediaAsset {
  id?: string;
  url: string;
  title?: string;
  bhk?: number;
  carpetAreaSqft?: number;
  carpet_area_sqft?: number;
  description?: string;
  page_number?: number;
}

export interface BrochurePhotoMediaAsset {
  id?: string;
  url: string;
  title?: string;
  category?: string;
  description?: string;
}

export interface VideoMediaAsset {
  id?: string;
  url: string;
  title?: string;
  mimeType?: string;
  bytes?: number;
  durationSeconds?: number;
  posterUrl?: string;
}

export function normalizeMediaGallery(
  mediaGalleryJson: string | null | undefined,
  legacyPhotoGalleryJson?: string | null,
): InventoryMediaAsset[] {
  const media = parseJsonArray<InventoryMediaAsset | string>(mediaGalleryJson);
  if (media.length > 0) {
    return media
      .map((asset, index) => typeof asset === 'string'
        ? { id: `legacy-${index}`, url: asset, kind: 'image' as const }
        : asset)
      .filter((asset) => asset?.url);
  }

  return parseJsonArray<string>(legacyPhotoGalleryJson).map((url, index) => ({
    id: `legacy-photo-${index}`,
    url,
    kind: 'image' as const,
  }));
}

export function parseInventoryContent<T extends {
  amenities?: string[];
  keyHighlights?: string[];
  featureHighlights?: string[];
  mediaGallery?: InventoryMediaAsset[];
  elevationImages?: ElevationMediaAsset[];
  floorPlanImages?: FloorPlanMediaAsset[];
  brochurePhotos?: BrochurePhotoMediaAsset[];
  videos?: VideoMediaAsset[];
  photoGallery?: string[];
}>(
  record: T & {
    amenitiesJson?: string | null;
    keyHighlightsJson?: string | null;
    featureHighlightsJson?: string | null;
    mediaGalleryJson?: string | null;
    photoGalleryJson?: string | null;
    elevationImagesJson?: string | null;
    floorPlanImagesJson?: string | null;
    brochurePhotosJson?: string | null;
    videosJson?: string | null;
    videoReelUrl?: string | null;
  },
) {
  const parsedVideos = parseJsonArray<VideoMediaAsset | string>(record.videosJson).map((v, idx) => {
    if (typeof v === 'string') return { id: `video-${idx}`, url: v, title: `Video ${idx + 1}` };
    return { ...v, url: resolveAssetUrl(v) };
  }).filter((v) => Boolean(v.url));

  // If videosJson was empty but legacy videoReelUrl exists, include it
  if (parsedVideos.length === 0 && record.videoReelUrl) {
    parsedVideos.push({ id: 'video-reel-legacy', url: record.videoReelUrl, title: 'Video Walkthrough' });
  }

  return {
    ...record,
    amenities: record.amenities ?? parseJsonArray<string>(record.amenitiesJson),
    keyHighlights: record.keyHighlights ?? parseJsonArray<string>(record.keyHighlightsJson),
    featureHighlights: record.featureHighlights ?? parseJsonArray<string>(record.featureHighlightsJson),
    mediaGallery: record.mediaGallery ?? normalizeMediaGallery(record.mediaGalleryJson, record.photoGalleryJson),
    elevationImages: record.elevationImages ?? parseJsonArray<ElevationMediaAsset>(record.elevationImagesJson),
    floorPlanImages: record.floorPlanImages ?? parseJsonArray<FloorPlanMediaAsset>(record.floorPlanImagesJson),
    brochurePhotos: record.brochurePhotos ?? parseJsonArray<BrochurePhotoMediaAsset>(record.brochurePhotosJson),
    videos: record.videos ?? parsedVideos,
    photoGallery: record.photoGallery ?? parseGalleryUrls(record.photoGalleryJson),
  };
}

/**
 * Resolves a valid URL string from any media asset object or string shape
 */
export function resolveAssetUrl(asset: any): string {
  if (!asset) return '';
  if (typeof asset === 'string') return asset.trim();
  return (
    asset.secureUrl ||
    asset.secure_url ||
    asset.url ||
    asset.file_url ||
    asset.mediaAsset?.secureUrl ||
    asset.mediaAsset?.secure_url ||
    asset.mediaAsset?.url ||
    asset.mediaAsset?.file_url ||
    ''
  ).trim();
}

/**
 * Robustly parses a gallery that might be a JSON string, array, or object into an array of clean URL strings
 */
export function parseGalleryUrls(value: any): string[] {
  if (!value) return [];
  let array: any[] = [];
  if (Array.isArray(value)) {
    array = value;
  } else if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      array = Array.isArray(parsed) ? parsed : [value];
    } catch {
      array = value ? [value] : [];
    }
  } else if (typeof value === 'object') {
    array = [value];
  }
  return array.map(resolveAssetUrl).filter(Boolean);
}
