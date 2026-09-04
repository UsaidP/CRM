import { resolveAssetUrl, parseGalleryUrls } from '@/lib/inventory-media';

export interface UnitConfigurationGroup {
  key: string;
  bhk: number;
  carpetAreaSqft: number;
  label: string;
  count: number;
  units: any[];
}

export interface UnitAreaMatrix {
  carpetAreaSqft: number;
  builtUpSqft: number;
  superBuiltUpSqft: number;
  loadingPercentage: number;
}

export interface UnitResolvedMedia {
  floorPlanUrl: string | null;
  floorPlanImages: Array<{ url: string; title?: string; bhk?: number; carpetAreaSqft?: number }>;
  photos: string[];
  mediaGallery: Array<{ id?: string; url: string; title?: string; kind: 'image' | 'video'; category?: string }>;
  videos: Array<{ id?: string; url: string; title?: string }>;
}

const KNOWN_DUMMY_URL_PATTERNS = [
  'images.unsplash.com/photo-1600585154340-be6161a56a0c',
  'images.unsplash.com/photo-1574362848149-11496d93a7c7',
  'images.unsplash.com/photo-1545324418-cc1a3fa10c00',
  'images.unsplash.com/photo-1486406146926-c627a92ad1ab',
  'images.unsplash.com/photo-1504307651254-35680f356dfd',
  'images.unsplash.com/photo-1582407947304-fd86f028f716',
  'images.unsplash.com/photo-1560518883-ce09059eeffa',
  'images.unsplash.com/photo-1512917774080-9991f1c4c750',
];

/**
 * Checks whether an image URL is a hardcoded or generic Unsplash dummy/placeholder
 */
export function isDummyOrPlaceholderUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  return KNOWN_DUMMY_URL_PATTERNS.some((pattern) => url.includes(pattern));
}

/**
 * Filters out hardcoded placeholder/dummy URLs to maintain zero-fabrication integrity
 */
export function filterAuthenticUrls(urls: string[]): string[] {
  return urls.filter((url) => url && !isDummyOrPlaceholderUrl(url));
}

/**
 * Groups units by distinct configuration: BHK + Carpet Area
 * e.g., "1 BHK (450 sq.ft.)", "2 BHK (685 sq.ft.)", "2 BHK (720 sq.ft.)"
 */
export function groupUnitsByConfiguration(units: any[]): UnitConfigurationGroup[] {
  if (!Array.isArray(units) || units.length === 0) return [];

  const groupsMap = new Map<string, UnitConfigurationGroup>();

  for (const unit of units) {
    const bhk = Number(unit.bhk) || 1;
    const carpet = Number(unit.carpetAreaSqft) || 500;
    const key = `${bhk}_BHK_${carpet}`;

    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        key,
        bhk,
        carpetAreaSqft: carpet,
        label: `${bhk} BHK • ${carpet} sq.ft.`,
        count: 0,
        units: [],
      });
    }

    const group = groupsMap.get(key)!;
    group.count += 1;
    group.units.push(unit);
  }

  // Sort by BHK ascending, then carpet area ascending
  return Array.from(groupsMap.values()).sort((a, b) => {
    if (a.bhk !== b.bhk) return a.bhk - b.bhk;
    return a.carpetAreaSqft - b.carpetAreaSqft;
  });
}

/**
 * Computes exact usable RERA carpet, built-up (15% load), and super built-up (40% load)
 */
export function calculateUnitAreaMatrix(carpetAreaSqft: number, loadingPercentage = 40): UnitAreaMatrix {
  const carpet = Math.max(0, Number(carpetAreaSqft) || 0);
  const builtUpSqft = Math.round(carpet * 1.15);
  const superBuiltUpSqft = Math.round(carpet * (1 + loadingPercentage / 100));

  return {
    carpetAreaSqft: carpet,
    builtUpSqft,
    superBuiltUpSqft,
    loadingPercentage,
  };
}

/**
 * Resolves all authentic media assets strictly belonging to a single unit.
 * Prevents cross-contamination and excludes placeholder dummy stock photos.
 */
export function resolveUnitMediaAssets(unit: any): UnitResolvedMedia {
  if (!unit) {
    return {
      floorPlanUrl: null,
      floorPlanImages: [],
      photos: [],
      mediaGallery: [],
      videos: [],
    };
  }

  // 1. Resolve authentic floor plan URL
  const floorPlanUrl = isDummyOrPlaceholderUrl(unit.floorPlanUrl) ? null : (unit.floorPlanUrl || null);

  // 2. Parse unit-specific floor plan images
  let rawFloorPlanImages: any[] = [];
  try {
    if (Array.isArray(unit.floorPlanImages)) {
      rawFloorPlanImages = unit.floorPlanImages;
    } else if (unit.floorPlanImagesJson) {
      rawFloorPlanImages = typeof unit.floorPlanImagesJson === 'string'
        ? JSON.parse(unit.floorPlanImagesJson)
        : unit.floorPlanImagesJson;
    }
  } catch {}

  const floorPlanImages = (Array.isArray(rawFloorPlanImages) ? rawFloorPlanImages : [])
    .map((item) => {
      const url = resolveAssetUrl(item);
      if (!url || isDummyOrPlaceholderUrl(url)) return null;
      return {
        url,
        title: item.title || `${unit.bhk || 2} BHK Layout Blueprint`,
        bhk: item.bhk || unit.bhk,
        carpetAreaSqft: item.carpetAreaSqft || unit.carpetAreaSqft,
      };
    })
    .filter(Boolean) as Array<{ url: string; title?: string; bhk?: number; carpetAreaSqft?: number }>;

  // If unit has a standalone floorPlanUrl not in the list, add it
  if (floorPlanUrl && !floorPlanImages.some((f) => f.url === floorPlanUrl)) {
    floorPlanImages.unshift({
      url: floorPlanUrl,
      title: `Unit ${unit.unitNumber || unit.bhk + ' BHK'} Layout Blueprint`,
      bhk: unit.bhk,
      carpetAreaSqft: unit.carpetAreaSqft,
    });
  }

  // 3. Parse unit-specific photos
  const rawPhotos = parseGalleryUrls(unit.photoGalleryJson || unit.photoGallery);
  const photos = filterAuthenticUrls(rawPhotos);

  // 4. Parse media gallery
  let rawMedia: any[] = [];
  try {
    if (Array.isArray(unit.mediaGallery)) {
      rawMedia = unit.mediaGallery;
    } else if (unit.mediaGalleryJson) {
      rawMedia = typeof unit.mediaGalleryJson === 'string'
        ? JSON.parse(unit.mediaGalleryJson)
        : unit.mediaGalleryJson;
    }
  } catch {}

  const mediaGallery: Array<{ id?: string; url: string; title?: string; kind: 'image' | 'video'; category?: string }> = [];
  for (const item of Array.isArray(rawMedia) ? rawMedia : []) {
    const url = resolveAssetUrl(item);
    if (url && !isDummyOrPlaceholderUrl(url)) {
      mediaGallery.push({
        id: item.id || `media_${mediaGallery.length + 1}`,
        url,
        title: item.title || 'Unit Media Asset',
        kind: item.kind === 'video' ? 'video' : 'image',
        category: item.category || 'interior',
      });
      // Also merge image into photos if not already present
      if (item.kind !== 'video' && !photos.includes(url)) {
        photos.push(url);
      }
    }
  }

  // 5. Parse videos
  let rawVideos: any[] = [];
  try {
    if (Array.isArray(unit.videos)) {
      rawVideos = unit.videos;
    } else if (unit.videosJson) {
      rawVideos = typeof unit.videosJson === 'string'
        ? JSON.parse(unit.videosJson)
        : unit.videosJson;
    }
  } catch {}

  const videos = (Array.isArray(rawVideos) ? rawVideos : [])
    .map((v) => {
      const url = resolveAssetUrl(v);
      return url ? { id: v.id, url, title: v.title || 'Unit Video Walkthrough' } : null;
    })
    .filter(Boolean) as Array<{ id?: string; url: string; title?: string }>;

  if (unit.videoReelUrl && !videos.some((v) => v.url === unit.videoReelUrl)) {
    videos.unshift({ url: unit.videoReelUrl, title: 'Video Walkthrough Reel' });
  }

  return {
    floorPlanUrl,
    floorPlanImages,
    photos,
    mediaGallery,
    videos,
  };
}

/**
 * Returns a crisp, differentiable title for a unit
 */
export function differentiateUnitTitle(unit: any): string {
  if (!unit) return 'Property Unit';
  const unitNum = unit.unitNumber ? `Unit ${unit.unitNumber}` : '';
  const bhkStr = unit.bhk ? `${unit.bhk} BHK` : '';
  const carpetStr = unit.carpetAreaSqft ? `(${unit.carpetAreaSqft} sq.ft.)` : '';

  const parts = [unitNum, bhkStr, carpetStr].filter(Boolean);
  if (unitNum && bhkStr) {
    return `${unitNum} • ${bhkStr} ${carpetStr}`.trim();
  }
  return parts.join(' ').trim() || 'Property Unit';
}

/**
 * Currency formatter for Indian Lakhs / Crores / Thousands
 */
export function formatINR(val: number | string | null | undefined): string {
  if (val === null || val === undefined || isNaN(Number(val))) return '₹0';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}
