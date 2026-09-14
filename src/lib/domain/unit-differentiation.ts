import { resolveAssetUrl, parseGalleryUrls } from '@/lib/inventory-media';

export interface UnitConfigurationGroup {
  key: string;
  bhk: number;
  carpetAreaSqft: number;
  label: string;
  count: number;
  units: any[];
}

export interface ConcentricAreaOverrides {
  traditionalCarpetSqft?: number;
  reraCarpetAreaSqft?: number;
  internalWallsSqft?: number;
  balconyTerraceSqft?: number;
  externalWallsSqft?: number;
  builtUpSqft?: number;
  proportionateCommonSqft?: number;
}

export interface UnitAreaMatrix {
  // 1. Usable / Salable Carpet Area
  traditionalCarpetSqft: number;
  internalWallsSqft: number;

  // 2. RERA Carpet Area (Optional / Not Compulsory)
  reraCarpetAreaSqft?: number;
  carpetAreaSqft: number;

  // 3. Built-Up Area
  balconyTerraceSqft: number;
  externalWallsSqft: number;
  builtUpSqft: number;

  // 4. Super Built-Up Area (Saleable Area)
  proportionateCommonSqft: number;
  superBuiltUpSqft: number;

  // Internal loading percentage for calculation
  loadingPercentage: number;
}

export interface AreaDefinitionItem {
  id: 'carpet' | 'rera' | 'builtup' | 'superbuiltup';
  name: string;
  shortName: string;
  badge: string;
  definition: string;
  included: string[];
  excluded: string[];
  formula: string;
}

export const CORE_AREA_DEFINITIONS: AreaDefinitionItem[] = [
  {
    id: 'carpet',
    name: 'Carpet Area',
    shortName: 'Carpet Area',
    badge: 'Net Usable Area',
    definition: 'The net usable floor space within the apartment walls where you can literally lay a carpet.',
    included: ['Bedrooms', 'Living room', 'Kitchen', 'Bathrooms', 'Internal staircases'],
    excluded: ['External walls', 'Balconies', 'Terraces', 'Common corridors', 'Lobby'],
    formula: 'Net usable floor space within partition walls',
  },
  {
    id: 'rera',
    name: 'RERA Carpet Area',
    shortName: 'RERA Carpet',
    badge: 'Optional (Not Compulsory)',
    definition: 'Section 2(k) legal standard (usable floor area plus internal walls). Optional to specify for this property.',
    included: ['Net usable floor area', 'Thickness of internal partition walls'],
    excluded: ['External walls', 'Balconies', 'Verandahs', 'Open/exclusive terraces', 'Flower beds'],
    formula: 'Carpet Area + Internal Wall Thickness (Optional)',
  },
  {
    id: 'builtup',
    name: 'Built-Up Area',
    shortName: 'Built-Up Area',
    badge: 'Flat Boundaries',
    definition: 'Total space enclosed by the outer boundaries of your individual flat including private balconies.',
    included: ['Carpet Area', 'Thickness of outer walls', 'Private balconies/terraces'],
    excluded: ['Common corridors', 'Lifts', 'Staircases', 'Clubhouse', 'Parking space'],
    formula: 'Carpet Area + External Wall Thickness + Balconies & Terraces',
  },
  {
    id: 'superbuiltup',
    name: 'Super Built-Up Area',
    shortName: 'Super Built-Up (Saleable)',
    badge: 'Total Salable Area',
    definition: "Total salable area including the flat's built-up space plus proportionate share of common facilities.",
    included: ['Built-up area', 'Lobbies', 'Lifts', 'Stairwells', 'Clubhouse', 'Security rooms', 'Generator space'],
    excluded: ['Open play areas', 'Driveways', 'Unbuilt garden space'],
    formula: 'Built-Up Area + Proportionate Common Facilities Area',
  },
];

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
 * Computes exact usable RERA carpet, built-up (15% load), and super built-up (40% load),
 * along with the complete 4-layer concentric measurement system.
 */
export function calculateUnitAreaMatrix(
  carpetAreaSqft: number,
  loadingPercentage = 40,
  customSaleableSqft?: number,
  overrides?: ConcentricAreaOverrides
): UnitAreaMatrix {
  const carpet = Math.max(0, Number(carpetAreaSqft) || 0);

  // 1. Layer 1: Traditional Carpet & Internal Walls (RERA Carpet = Traditional Carpet + Internal Wall Thickness)
  let internalWallsSqft = overrides?.internalWallsSqft;
  let traditionalCarpetSqft = overrides?.traditionalCarpetSqft;

  if (internalWallsSqft !== undefined && traditionalCarpetSqft === undefined) {
    traditionalCarpetSqft = Math.max(0, carpet - internalWallsSqft);
  } else if (traditionalCarpetSqft !== undefined && internalWallsSqft === undefined) {
    internalWallsSqft = Math.max(0, carpet - traditionalCarpetSqft);
  } else if (internalWallsSqft === undefined && traditionalCarpetSqft === undefined) {
    // Typical standard internal walls are ~3.5% of RERA carpet area
    internalWallsSqft = carpet > 0 ? Math.max(1, Math.round(carpet * 0.035)) : 0;
    traditionalCarpetSqft = Math.max(0, carpet - internalWallsSqft);
  } else {
    // Both provided
    traditionalCarpetSqft = Number(traditionalCarpetSqft) || 0;
    internalWallsSqft = Number(internalWallsSqft) || 0;
  }

  // 2. Layer 3: Built-Up Area (RERA Carpet + External Wall Thickness + Balconies & Terraces)
  let builtUpSqft = overrides?.builtUpSqft !== undefined
    ? Number(overrides.builtUpSqft)
    : Math.round(carpet * 1.15);

  let externalWallsSqft = overrides?.externalWallsSqft;
  let balconyTerraceSqft = overrides?.balconyTerraceSqft;

  const totalBuiltUpDiff = Math.max(0, builtUpSqft - carpet);

  if (externalWallsSqft !== undefined && balconyTerraceSqft === undefined) {
    balconyTerraceSqft = Math.max(0, totalBuiltUpDiff - externalWallsSqft);
  } else if (balconyTerraceSqft !== undefined && externalWallsSqft === undefined) {
    externalWallsSqft = Math.max(0, totalBuiltUpDiff - balconyTerraceSqft);
  } else if (externalWallsSqft === undefined && balconyTerraceSqft === undefined) {
    // Typically external walls are ~6.5% and balconies/terraces ~8.5%
    externalWallsSqft = carpet > 0 ? Math.round(carpet * 0.065) : 0;
    balconyTerraceSqft = Math.max(0, totalBuiltUpDiff - externalWallsSqft);
  } else {
    externalWallsSqft = Number(externalWallsSqft) || 0;
    balconyTerraceSqft = Number(balconyTerraceSqft) || 0;
    // If both specified and no explicit builtUpSqft override, sum them up
    if (overrides?.builtUpSqft === undefined) {
      builtUpSqft = carpet + externalWallsSqft + balconyTerraceSqft;
    }
  }

  // 3. Layer 4: Super Built-Up Area (Built-Up Area + Proportionate Common Area OR Carpet * (1 + Loading))
  const superBuiltUpSqft = customSaleableSqft && customSaleableSqft > 0
    ? customSaleableSqft
    : Math.round(carpet * (1 + loadingPercentage / 100));

  const effectiveLoading = customSaleableSqft && carpet > 0
    ? Math.round(((customSaleableSqft - carpet) / carpet) * 100)
    : loadingPercentage;

  const proportionateCommonSqft = overrides?.proportionateCommonSqft !== undefined
    ? Number(overrides.proportionateCommonSqft)
    : Math.max(0, superBuiltUpSqft - builtUpSqft);

  return {
    traditionalCarpetSqft,
    internalWallsSqft,
    reraCarpetAreaSqft: overrides?.reraCarpetAreaSqft,
    carpetAreaSqft: carpet,
    balconyTerraceSqft,
    externalWallsSqft,
    builtUpSqft,
    proportionateCommonSqft,
    superBuiltUpSqft,
    loadingPercentage: effectiveLoading,
  };
}

/**
 * Formats concentric area matrix into highlight strings for featureHighlightsJson persistence
 */
export function formatConcentricHighlights(matrix: UnitAreaMatrix, existingHighlights: string[] = []): string[] {
  const cleanExisting = existingHighlights.filter((h) => {
    if (typeof h !== 'string') return false;
    return (
      !h.includes('sq.ft Carpet Area') &&
      !h.includes('sq.ft Usable RERA Carpet') &&
      !h.includes('sq.ft RERA Carpet Area') &&
      !h.includes('sq.ft Traditional Carpet') &&
      !h.includes('sq.ft Built-Up Area') &&
      !h.includes('sq.ft Saleable Area') &&
      !h.includes('sq.ft Super Built-Up') &&
      !h.startsWith('CONCENTRIC_MATRIX:')
    );
  });

  const matrixPayload = JSON.stringify({
    traditionalCarpetSqft: matrix.traditionalCarpetSqft,
    reraCarpetAreaSqft: matrix.reraCarpetAreaSqft,
    internalWallsSqft: matrix.internalWallsSqft,
    balconyTerraceSqft: matrix.balconyTerraceSqft,
    externalWallsSqft: matrix.externalWallsSqft,
    builtUpSqft: matrix.builtUpSqft,
    proportionateCommonSqft: matrix.proportionateCommonSqft,
    superBuiltUpSqft: matrix.superBuiltUpSqft,
    loadingPercentage: matrix.loadingPercentage,
  });

  const items = [
    `${matrix.carpetAreaSqft} sq.ft Carpet Area`,
    matrix.reraCarpetAreaSqft ? `${matrix.reraCarpetAreaSqft} sq.ft RERA Carpet Area (Optional)` : null,
    `${matrix.builtUpSqft} sq.ft Built-Up Area`,
    `${matrix.superBuiltUpSqft} sq.ft Super Built-Up Area (Saleable)`,
    `CONCENTRIC_MATRIX:${matrixPayload}`,
    ...cleanExisting,
  ].filter(Boolean) as string[];

  return items;
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
      // Also merge image into photos if not already present (excluding floor plans so blueprints stay distinct)
      const cat = String(item.category || '').toLowerCase();
      const isFloorPlan = cat.includes('floor') || cat.includes('plan') || cat.includes('blueprint');
      if (item.kind !== 'video' && !isFloorPlan && !photos.includes(url)) {
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
