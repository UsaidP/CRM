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

export function parseInventoryContent<T extends { amenities?: string[]; keyHighlights?: string[]; featureHighlights?: string[]; mediaGallery?: InventoryMediaAsset[] }>(
  record: T & { amenitiesJson?: string | null; keyHighlightsJson?: string | null; featureHighlightsJson?: string | null; mediaGalleryJson?: string | null; photoGalleryJson?: string | null },
) {
  return {
    ...record,
    amenities: record.amenities ?? parseJsonArray<string>(record.amenitiesJson),
    keyHighlights: record.keyHighlights ?? parseJsonArray<string>(record.keyHighlightsJson),
    featureHighlights: record.featureHighlights ?? parseJsonArray<string>(record.featureHighlightsJson),
    mediaGallery: record.mediaGallery ?? normalizeMediaGallery(record.mediaGalleryJson, record.photoGalleryJson),
  };
}
