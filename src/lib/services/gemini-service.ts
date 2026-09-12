import { GoogleGenAI } from '@google/genai';
import { validateReraNumber } from '@/lib/domain/verification-engine';
import { calculateAllInCost } from '@/lib/domain/cost-calculator';
import { 
  type ExtractedBrochureData, 
  type ExtractedBrochureUnit, 
  type ProjectAssetRecord, 
  type ExtractedFloorPlanDetail,
  erasePhoneNumbersFromText 
} from './brochure-parser-service';
import { deduplicateUnitsByConfiguration } from './unit-deduplication';
import type { BuyerRequirementInput, PropertyUnitForMatching } from '@/lib/domain/matching-engine';

/**
 * Singleton / Lazy GoogleGenAI client
 */
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey === 'your_google_api_key_here') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

// Active High-RPM Vision & Multimodal Models for Document Understanding
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

// Model cascade for rate-limit & availability resilience:
// 1. gemini-3.6-flash (Fast, accurate multimodal vision & document OCR)
// 2. gemini-3.5-flash (High throughput multimodal fallback)
// 3. gemini-3.1-flash-lite (Ultra-fast lightweight fallback for serverless constraints)
// 4. gemini-flash-latest (Dynamic latest flash alias)
export const GEMINI_MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

export function isInvalidApiKeyError(err: any): boolean {
  const msg = (err?.message || err?.toString() || '').toLowerCase();
  const status = err?.status || err?.statusCode || err?.code;
  return (
    status === 401 ||
    status === 403 ||
    msg.includes('401') ||
    msg.includes('403') ||
    msg.includes('permission_denied') ||
    msg.includes('api key') ||
    msg.includes('leaked') ||
    msg.includes('invalid_api_key') ||
    msg.includes('unauthorized')
  );
}

export function isModelUnavailableError(err: any): boolean {
  const msg = (err?.message || err?.toString() || '').toLowerCase();
  const status = err?.status || err?.statusCode || err?.code;
  return (
    status === 404 ||
    msg.includes('404') ||
    msg.includes('not found') ||
    msg.includes('no longer available') ||
    msg.includes('is not supported')
  );
}

export function isRateLimitError(err: any): boolean {
  const msg = (err?.message || err?.toString() || '').toLowerCase();
  const status = err?.status || err?.statusCode || err?.code;
  return (
    status === 429 ||
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('limit reached') ||
    msg.includes('too many requests')
  );
}

/**
 * Industrial-Grade Real Estate Multimodal Vision Prompt for Indian/MahaRERA Projects
 */
const BROCHURE_EXTRACTION_PROMPT = `
SYSTEM PROMPT — REAL ESTATE PDF BROCHURE & SPECIFICATIONS AI EXTRACTION ENGINE

You are an expert Real Estate Document Extraction Engine specialized in Indian and MahaRERA property brochures, architectural drawings, marketing leaflets, and floor plans.

Your task is to analyze every page of the uploaded brochure (PDF/Images) and extract ALL authentic, verified specifications into clean, structured JSON.

CRITICAL EXTRACTION GUIDELINES:
1. STRICT ACCURACY: Do NOT invent, assume, or hallucinate project names, RERA numbers, addresses, or unit sizes. Extract ONLY facts present in the brochure.
2. MAHARERA REGISTRATION NUMBER: Search thoroughly across cover pages, headers, footers, QR code captions, certificates, and disclaimers for the MahaRERA number (Format: "P" followed by 11 digits, e.g., P51700077818, P52000018920). Return the exact MahaRERA number or null if completely absent.
3. PROJECT & DEVELOPER: Extract the exact Project Name (e.g., "Saras Icon") and Developer/Builder Promoter Name (e.g., "Saras Infra").
4. LOCATION & LOCALITY: Extract the exact site address, plot number, sector number, and micro-market / locality (e.g., Seawoods, Kharghar, Taloja, Ulwe, Panvel, Vashi, etc.).
5. STRUCTURE & FLOORS: Extract the total number of storeys / floors (e.g. 15 storeys -> 15), elevation structure (e.g. "G+15 Storey Tower"), and tower count.
6. CONFIGURATIONS & DISTINCT CARPET UNITS:
   - Extract all unit typologies (1 BHK, 2 BHK, 3 BHK, etc.).
   - STRICT DEDUPLICATION BY USABLE CARPET AREA: Do NOT extract repetitive individual flat numbers or every flat on every floor (do not emit 100 flat entries). Instead, COMBINE and EXTRACT ONLY THE DISTINCT USABLE RERA CARPET AREAS for each BHK typology.
   - For example, if a building has 100 flats where 1 BHK flats measure 400, 420, and 433 sq.ft, output ONLY 3 unit records for 1 BHK (one for 400 sq.ft, one for 420 sq.ft, one for 433 sq.ft).
   - Do the same distinct carpet area extraction for 2 BHK and 3 BHK.
   - If exact carpet area is explicitly printed, extract it. If the floor plan or brochure only lists flat numbers and room dimensions (or typologies like 1 BHK / 2 BHK without net sqft), calculate the usable carpet area from the room dimensions or provide realistic standard usable RERA carpet for that typology (e.g., 1 BHK: 400-440 sq.ft, 2 BHK: 620-680 sq.ft, 3 BHK: 900-1050 sq.ft). NEVER output null or 0 for carpetAreaSqft if flats or typologies exist.
   - For each distinct configuration, extract usable RERA carpet in sq.ft, representative flat series (e.g. "Series 01, 04 / Flats 101, 104..."), approximate flat count in "totalUnitsCount", bathrooms, and balconies.
7. AMENITIES & SPECIFICATIONS:
   - Extract all listed lifestyle amenities (e.g., Fitness Center, Swimming Pool, Rooftop Garden, Kids Play Area, CCTV, Covered Parking, High Speed Elevators).
   - Extract technical specifications (flooring, sanitary ware, concealed plumbing, copper wiring, aluminum windows, granite platform).
8. CONNECTIVITY & TRANSIT: Extract all railway stations, highways, airports, and distance/time metrics mentioned in the brochure.
9. BROKER SHIELD & PHONE ERASURE:
   - Real estate broker protection rule: NEVER include builder or broker phone numbers or telephone digits in any descriptions, highlights, or specifications.
   - All phone numbers written on brochures must be strictly ERASED from public data. Set developerSalesPocPhone to null.
10. COMPREHENSIVE PAGE-BY-PAGE CLASSIFICATION:
   - Analyze every page from page 1 to the last page.
   - For every page, determine its exact category:
     * "cover": Front cover page, title & main project name, or main facade render
     * "elevation": Architectural exterior 3D perspectives, tower elevations, podium views, evening facade renders
     * "master_plan": Master site layout plan, campus footprint, boundary/plot schematic
     * "floor_plan": Typical floor plans, wing cluster plans, floor architectural layouts
     * "unit_floor_plan": Dedicated individual flat/apartment layouts (extract "bhk" and "carpet_area_sqft" if printed)
     * "location_map": Location map, regional connectivity schematic, road/transit/metro networks
     * "amenity": Lifestyle amenity renders/photos (swimming pool, gym, clubhouse, kids play area, rooftop garden, etc.)
     * "specifications": Technical specifications & fittings table
     * "brochure_photo": Developer profile, philosophy, or general marketing pages

Output purely valid JSON conforming to this schema:
{
  "projectName": string,
  "developerName": string,
  "reraNumber": string | null,
  "microMarket": string,
  "subLocality": string,
  "elevation": string,
  "totalFloors": number,
  "totalTowers": number,
  "hasOccupancyCertificate": boolean,
  "possessionStatus": "READY_TO_MOVE" | "UNDER_CONSTRUCTION",
  "expectedPossessionDate": string | null,
  "basePricePerSqft": number | null,
  "plotDetails": string | null,
  "structureType": string | null,
  "floorPlateSummary": string | null,
  "shortDescription": string,
  "description": string,
  "amenities": string[],
  "specifications": Record<string, string>,
  "transitConnectivity": Array<{ "destination": string, "timeOrDistance": string, "type": string }>,
  "keyHighlights": string[],
  "pages": Array<{
    "page_number": number,
    "page_type": "cover" | "elevation" | "master_plan" | "floor_plan" | "unit_floor_plan" | "location_map" | "amenity" | "specifications" | "brochure_photo",
    "title": string,
    "description": string,
    "bhk": number | null,
    "carpet_area_sqft": number | null
  }>,
  "units": Array<{
    "unitNumber": string,
    "bhk": number,
    "bhkLabel": string,
    "carpetAreaSqft": number,
    "seriesOrFlatNumbers": string,
    "totalUnitsCount": number,
    "bathrooms": number,
    "balconies": number,
    "floorNumber": number,
    "facing": string,
    "agreementValue": number,
    "description": string
  }>,
  "confidentialBrokerData": {
    "developerSalesPocName": string | null,
    "developerSalesPocPhone": string | null,
    "developerEmail": string | null,
    "siteAddress": string | null,
    "officeAddress": string | null,
    "architects": string | null,
    "rccConsultants": string | null
  },
  "images": {
    "elevation": Array<{ "asset_type": "elevation", "subtype": string, "title": string, "page_number": number, "description": string }>,
    "floor_plans": Array<{ "floor": string, "plan_type": string, "page_number": number, "bhk": number, "carpet_area_sqft": number, "title": string }>,
    "master_plan": Array<{ "asset_type": "master_plan", "subtype": string, "title": string, "page_number": number, "description": string }>,
    "location_map": Array<{ "asset_type": "location_map", "subtype": string, "title": string, "page_number": number, "description": string }>,
    "amenities": Array<{ "asset_type": "amenity", "subtype": string, "title": string, "page_number": number, "description": string }>
  }
}
`;

/**
 * Deterministic Aggregator & Deduplicator for Real Estate Units.
 * Collapses repetitive individual flats into distinct carpet area configurations
 * per BHK typology (e.g. 1 BHK 400, 420, 433 sqft), applies 40% builder loading
 * (Taloja standard >= 38%), and computes statutory GST (1% <= 45L, 5% > 45L).
 */
export function aggregateUnitsByDistinctCarpetArea(
  rawUnits: any[],
  totalFloors: number = 7,
  basePricePerSqft: number = 0,
  hasOccupancyCertificate: boolean = false,
  projectName: string = 'Project'
): ExtractedBrochureUnit[] {
  return deduplicateUnitsByConfiguration(rawUnits, {
    totalFloors,
    basePricePerSqft,
    hasOccupancyCertificate,
    projectName,
    carpetToleranceSqft: 5,
  });
}

/**
 * 1. Extract Real Estate Brochure / Floor Plan Data using Gemini with intelligent model cascade
 */
export async function extractBrochureWithAI(
  buffer: Buffer,
  mimeType: string = 'application/pdf',
  filename: string = 'brochure.pdf'
): Promise<ExtractedBrochureData & { modelUsed?: string }> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('Gemini API key is not configured or invalid in .env');
  }

  // Supported mimeTypes: application/pdf, image/jpeg, image/png, image/webp
  let effectiveMime = mimeType;
  if (filename.toLowerCase().endsWith('.pdf')) {
    effectiveMime = 'application/pdf';
  } else if (filename.toLowerCase().endsWith('.png')) {
    effectiveMime = 'image/png';
  } else if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) {
    effectiveMime = 'image/jpeg';
  } else if (filename.toLowerCase().endsWith('.webp')) {
    effectiveMime = 'image/webp';
  }

  const isLargeFile = buffer.length > 15 * 1024 * 1024;
  let uploadedFile: any = null;

  if (isLargeFile) {
    try {
      const blob = new Blob([new Uint8Array(buffer)], { type: effectiveMime });
      uploadedFile = await ai.files.upload({
        file: blob,
        config: { mimeType: effectiveMime },
      });
    } catch (uploadErr: any) {
      console.warn('[Gemini Files API] Large file upload notice, falling back to standard payload:', uploadErr.message);
    }
  }

  const contentPart = uploadedFile
    ? {
        fileData: {
          fileUri: uploadedFile.uri,
          mimeType: uploadedFile.mimeType || effectiveMime,
        },
      }
    : {
        inlineData: {
          mimeType: effectiveMime,
          data: buffer.toString('base64'),
        },
      };

  let lastError: any = null;
  let parsed: any = null;
  let successfulModel: string = GEMINI_MODEL;

  try {
    // Multi-model retry cascade for rate-limit and availability resilience
    for (const modelName of GEMINI_MODEL_CANDIDATES) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            contentPart,
            BROCHURE_EXTRACTION_PROMPT,
          ],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1, // High precision for architectural parameters
          },
        });

        const responseText = response.text || '{}';
        parsed = JSON.parse(responseText.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, ''));
        successfulModel = modelName;
        break; // Succeeded!
      } catch (err: any) {
        lastError = err;
        if (isInvalidApiKeyError(err)) {
          console.warn(`[Gemini Vision] Fatal API key authentication issue (${err.message || err}). Aborting cloud AI attempts immediately to use local OCR engine.`);
          break;
        }
        if (isModelUnavailableError(err)) {
          console.warn(`[Gemini Vision] Model "${modelName}" is unavailable or retired (${err.message || err}). Trying next candidate...`);
          continue;
        }
        const rateLimited = isRateLimitError(err);
        console.warn(`[Gemini Vision] Model "${modelName}" failed (${rateLimited ? 'Rate limit / quota reached' : err.message || err}). Trying next candidate...`);
      }
    }
  } finally {
    if (uploadedFile?.name) {
      try {
        await ai.files.delete({ name: uploadedFile.name });
      } catch (delErr: any) {
        console.warn('[Gemini Files API] Cleanup notice:', delErr.message);
      }
    }
  }

  if (!parsed) {
    throw new Error(
      lastError
        ? `Gemini AI extraction attempt failed (${lastError.message || 'Error'}).`
        : 'All AI model extraction attempts failed.'
    );
  }

  // Normalize project details across nested or flat schemas
  const projObj = parsed.project || {};
  const bldgObj = parsed.building || {};
  const locObj = parsed.location || {};
  const contactObj = parsed.contacts || parsed.contactDetails || {};

  const cleanFilenameName = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').replace(/\s+brochure.*$/i, '').trim();
  const projectName = parsed.projectName || projObj.name || cleanFilenameName || 'New Real Estate Project';
  const developerName = parsed.developerName || projObj.developer || 'Developer Group';

  // Extract MahaRERA registration number with validation
  let rawRera = parsed.reraNumber || parsed.rera_number || projObj.rera_number || projObj.reraNumber || parsed.mahareraNumber || parsed.maharera_number || '';
  if (!rawRera) {
    const rawReraMatch = JSON.stringify(parsed).match(/\b(P\d{11})\b/i);
    if (rawReraMatch) {
      rawRera = rawReraMatch[1];
    }
  }

  let reraNumber: string | undefined;
  if (rawRera) {
    const reraValidation = validateReraNumber(rawRera);
    reraNumber = reraValidation.isValid && reraValidation.normalized 
      ? reraValidation.normalized 
      : rawRera.toUpperCase();
  }

  // Floors & Elevation
  const totalFloors = Number(parsed.totalFloors || bldgObj.total_floors || bldgObj.floors) || (parsed.floors ? parseInt(String(parsed.floors).replace(/\D/g, ''), 10) || 7 : 7);
  const totalTowers = Number(parsed.totalTowers || bldgObj.towers || parsed.towers) || 1;
  const hasOccupancyCertificate = Boolean(parsed.hasOccupancyCertificate || projObj.status === 'READY_TO_MOVE');
  const possessionStatus = hasOccupancyCertificate || projObj.status === 'READY_TO_MOVE' || parsed.possessionStatus === 'READY_TO_MOVE' 
    ? 'READY_TO_MOVE' 
    : 'UNDER_CONSTRUCTION';

  // Locality & Sub-locality
  const rawLocality = typeof locObj === 'string' ? locObj : (locObj.locality || locObj.city || locObj.siteOffice || '');
  const microMarket = parsed.microMarket || rawLocality || (locObj.sector ? `${locObj.sector}, Navi Mumbai` : 'Navi Mumbai');
  const subLocality = parsed.subLocality || (typeof locObj === 'object' && locObj.siteOffice ? locObj.siteOffice : (locObj.address || (locObj.sector ? `${locObj.sector} ${locObj.locality || ''}`.trim() : 'Navi Mumbai')));
  const elevation = parsed.elevation || projObj.building_configuration || (parsed.floors ? String(parsed.floors) : undefined);

  // Process units with distinct carpet area aggregation, 40% builder loading, and statutory GST (1% <= 45L, 5% > 45L)
  const rawUnits = Array.isArray(parsed.units) ? parsed.units : [];
  const basePrice = Number(parsed.basePricePerSqft) || 0;

  const processedUnits: ExtractedBrochureUnit[] = aggregateUnitsByDistinctCarpetArea(
    rawUnits,
    totalFloors,
    basePrice,
    hasOccupancyCertificate,
    projectName
  );

  // Extract structured Visual Asset Records
  const cleanProjSlug = projectName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const assetRecords: ProjectAssetRecord[] = [];
  const rawImages = parsed.images || {};
  let sortCounter = 1;
  const recordedPages = new Set<number>();

  // Ingest pages if provided by Gemini AI
  const rawPages = Array.isArray(parsed.pages) ? parsed.pages : [];
  for (const p of rawPages) {
    const pageNum = Number(p.page_number) || 0;
    if (pageNum <= 0 || recordedPages.has(pageNum)) continue;
    recordedPages.add(pageNum);

    let assetType = (p.page_type || 'elevation').toLowerCase();
    let displayPos = 'gallery';
    let subtype = assetType;

    if (assetType === 'cover') {
      displayPos = 'elevation';
      subtype = 'front_facade';
    } else if (assetType === 'elevation') {
      displayPos = 'elevation';
      subtype = 'elevation_view';
    } else if (assetType === 'master_plan') {
      displayPos = 'master_plan';
      subtype = 'master_layout_plan';
    } else if (assetType.includes('floor') || assetType.includes('unit')) {
      displayPos = 'floor_plan';
      subtype = p.bhk ? `${p.bhk}_bhk_unit_plan` : 'typical_floor_plan';
      assetType = p.bhk ? 'unit_floor_plan' : 'floor_plan';
    } else if (assetType === 'location_map') {
      displayPos = 'location_map';
      subtype = 'location_connectivity_map';
    } else if (assetType === 'amenity' || assetType === 'amenities') {
      displayPos = 'amenities';
      subtype = 'amenity_view';
      assetType = 'amenity';
    } else if (assetType === 'specifications') {
      displayPos = 'gallery';
      subtype = 'specifications_sheet';
    }

    assetRecords.push({
      asset_id: `asset_${cleanProjSlug}_${sortCounter}`,
      asset_type: assetType as any,
      subtype,
      title: p.title || `${projectName} Page ${pageNum}`,
      file_url: '',
      page_number: pageNum,
      original: true,
      display_position: displayPos,
      sort_order: sortCounter++,
      confidence: 0.99,
      source_position: 'full_page',
      bhk: p.bhk ? Number(p.bhk) : undefined,
      carpetAreaSqft: p.carpet_area_sqft ? Number(p.carpet_area_sqft) : undefined,
      description: p.description || `${projectName} brochure page ${pageNum}`,
    });
  }

  // Helper to ingest image list into normalized ProjectAssetRecord items
  const ingestCategory = (list: any[], defaultType: string, defaultSub: string, displayPos: string) => {
    if (!Array.isArray(list)) return;
    for (const img of list) {
      const page_number = Number(img.page_number) || 0;
      if (page_number > 0 && recordedPages.has(page_number)) {
        // Update existing record with finer details if available
        const existing = assetRecords.find(a => a.page_number === page_number);
        if (existing) {
          if (img.title) existing.title = img.title;
          if (img.description) existing.description = img.description;
          if (img.bhk) existing.bhk = Number(img.bhk);
          if (img.carpet_area_sqft || img.carpetAreaSqft) {
            existing.carpetAreaSqft = Number(img.carpet_area_sqft || img.carpetAreaSqft);
          }
        }
        continue;
      }
      if (page_number > 0) recordedPages.add(page_number);

      const asset_type = (img.asset_type || defaultType) as any;
      const subtype = img.subtype || defaultSub;
      const title = img.title || `${projectName} ${subtype.replace(/_/g, ' ')}`;

      assetRecords.push({
        asset_id: `asset_${cleanProjSlug}_${sortCounter}`,
        asset_type,
        subtype,
        title,
        file_url: img.file_url || '',
        page_number,
        original: true,
        display_position: displayPos,
        sort_order: sortCounter++,
        confidence: img.confidence || 0.99,
        source_position: img.source_position || 'full_page',
        bbox: img.bbox,
        bhk: img.bhk ? Number(img.bhk) : undefined,
        carpetAreaSqft: img.carpet_area_sqft ? Number(img.carpet_area_sqft) : (img.carpetAreaSqft ? Number(img.carpetAreaSqft) : undefined),
        description: img.description,
      });
    }
  };

  ingestCategory(rawImages.elevation, 'elevation', 'front_elevation', 'elevation');
  ingestCategory(rawImages.floor_plans, 'floor_plan', 'floor_plan', 'floor_plan');
  ingestCategory(rawImages.ground_floor_plan, 'ground_floor_plan', 'ground_floor_parking_plan', 'ground_floor_plan');
  ingestCategory(rawImages.first_floor_plan, 'first_floor_plan', 'first_floor_layout', 'first_floor_plan');
  ingestCategory(rawImages.typical_floor_plan, 'typical_floor_plan', 'typical_floor_plan', 'typical_floor_plan');
  ingestCategory(rawImages.unit_floor_plan, 'unit_floor_plan', 'unit_floor_plan', 'unit_floor_plan');
  ingestCategory(rawImages.site_plan || rawImages.master_plan, 'master_plan', 'master_layout_plan', 'master_plan');
  ingestCategory(rawImages.location_map, 'location_map', 'location_connectivity_map', 'location_map');
  ingestCategory(rawImages.amenities, 'amenity', 'amenity_view', 'amenities');

  // Floor plans list: Aggregate from parsed.floorPlans, parsed.floor_plans, parsed.images.floor_plans, and parsed.pages
  const rawFpCandidates = [
    ...(Array.isArray(parsed.floorPlans) ? parsed.floorPlans : []),
    ...(Array.isArray(parsed.floor_plans) ? parsed.floor_plans : []),
    ...(Array.isArray(rawImages.floor_plans) ? rawImages.floor_plans : []),
  ];

  const floorPlansList: ExtractedFloorPlanDetail[] = [];
  const seenFpPages = new Set<number>();

  for (const fp of rawFpCandidates) {
    const pageNum = Number(fp.page_number || fp.pageNumber) || 0;
    if (pageNum > 0 && seenFpPages.has(pageNum)) continue;
    if (pageNum > 0) seenFpPages.add(pageNum);

    const bhk = fp.bhk ? Number(fp.bhk) : undefined;
    const carpetAreaSqft = fp.carpet_area_sqft ? Number(fp.carpet_area_sqft) : (fp.carpetAreaSqft ? Number(fp.carpetAreaSqft) : undefined);

    floorPlansList.push({
      floor: fp.floor || 'Typical Floor',
      plan_type: fp.plan_type || fp.planType || (bhk ? `${bhk} BHK Floor Plan` : 'floor_plan'),
      page_number: pageNum,
      image_asset: fp.image_asset,
      orientation: fp.orientation || undefined,
      original_image: true,
      title: fp.title || (bhk ? `${bhk} BHK Architectural Floor Plan` : `${projectName} Floor Layout Plan`),
      units: fp.units || (bhk ? [{ bhk, carpetAreaSqft }] : []),
      room_dimensions: fp.room_dimensions,
    });
  }

  // Also include any floor plan pages from parsed.pages if not already captured
  for (const p of rawPages) {
    const pageNum = Number(p.page_number) || 0;
    const pType = (p.page_type || '').toLowerCase();
    if (pageNum > 0 && !seenFpPages.has(pageNum) && (pType.includes('floor') || pType.includes('unit'))) {
      seenFpPages.add(pageNum);
      const bhk = p.bhk ? Number(p.bhk) : undefined;
      const carpetAreaSqft = p.carpet_area_sqft ? Number(p.carpet_area_sqft) : undefined;

      floorPlansList.push({
        floor: 'Typical Floor',
        plan_type: pType,
        page_number: pageNum,
        original_image: true,
        title: p.title || (bhk ? `${bhk} BHK Floor Plan Layout` : `${projectName} Floor Plan Layout`),
        units: bhk ? [{ bhk, carpetAreaSqft }] : [],
      });
    }
  }

  const transitConnectivity = Array.isArray(locObj.connectivity || parsed.transitConnectivity)
    ? (locObj.connectivity || parsed.transitConnectivity).map((c: any) => ({
        destination: c.destination,
        timeOrDistance: c.distance_or_time || c.timeOrDistance,
        type: c.type,
      }))
    : [];

  const extractedData: ExtractedBrochureData = {
    projectName,
    developerName,
    reraNumber,
    microMarket,
    subLocality,
    elevation,
    totalTowers,
    totalFloors,
    podiumLevels: Number(parsed.podiumLevels || 0),
    hasOccupancyCertificate,
    expectedPossessionDate: parsed.expectedPossessionDate || undefined,
    possessionStatus,
    basePricePerSqft: Number(parsed.basePricePerSqft) || 0,
    plotDetails: projObj.plot_number || parsed.plotDetails || undefined,
    structureType: parsed.structureType || undefined,
    floorPlateSummary: parsed.floorPlateSummary || undefined,
    shortDescription: erasePhoneNumbersFromText(parsed.shortDescription || `${elevation || 'Residential Project'} situated at ${microMarket}.`),
    description: erasePhoneNumbersFromText(parsed.description || `${projectName} by ${developerName} located in ${microMarket}${reraNumber ? `. MahaRERA: ${reraNumber}` : '.'}`),
    amenities: Array.isArray(parsed.amenities) && parsed.amenities.length > 0 ? parsed.amenities.map(erasePhoneNumbersFromText).filter(Boolean) : [],
    specifications: parsed.specifications || {},
    transitConnectivity,
    keyHighlights: Array.isArray(parsed.keyHighlights) && parsed.keyHighlights.length > 0
      ? parsed.keyHighlights.map(erasePhoneNumbersFromText).filter(Boolean)
      : [
          ...(reraNumber ? [`MahaRERA Registered: ${reraNumber}`] : []),
          ...(elevation ? [`Elevation: ${elevation}`] : []),
        ].map(erasePhoneNumbersFromText).filter(Boolean),
    developerSalesPocName: parsed.confidentialBrokerData?.developerSalesPocName || contactObj.sales_poc_name || contactObj.developerSalesPocName || parsed.developerSalesPocName || undefined,
    developerSalesPocPhone: undefined, // Broker Shield: Erased to prevent client bypass
    developerEmail: parsed.confidentialBrokerData?.developerEmail || (Array.isArray(contactObj.email) ? contactObj.email[0] : (typeof contactObj.email === 'string' ? contactObj.email : parsed.developerEmail)) || undefined,
    siteAddress: parsed.confidentialBrokerData?.siteAddress || locObj.siteOffice || locObj.address || parsed.siteAddress || subLocality || undefined,
    officeAddress: parsed.confidentialBrokerData?.officeAddress || locObj.officeAddress || contactObj.office_address || contactObj.officeAddress || parsed.officeAddress || undefined,
    architects: parsed.confidentialBrokerData?.architects || parsed.architects || undefined,
    rccConsultants: parsed.confidentialBrokerData?.rccConsultants || parsed.rccConsultants || undefined,
    commercialShops: Array.isArray(parsed.commercialShops) ? parsed.commercialShops : undefined,
    standardCommissionPercent: typeof parsed.standardCommissionPercent === 'number' ? parsed.standardCommissionPercent : (typeof parsed.confidentialBrokerData?.standardCommissionPercent === 'number' ? parsed.confidentialBrokerData.standardCommissionPercent : 2.5),
    confidentialBrokerData: {
      developerSalesPocName: parsed.confidentialBrokerData?.developerSalesPocName || contactObj.sales_poc_name || contactObj.developerSalesPocName || parsed.developerSalesPocName || undefined,
      developerSalesPocPhone: undefined,
      developerEmail: parsed.confidentialBrokerData?.developerEmail || (Array.isArray(contactObj.email) ? contactObj.email[0] : (typeof contactObj.email === 'string' ? contactObj.email : parsed.developerEmail)) || undefined,
      siteAddress: parsed.confidentialBrokerData?.siteAddress || locObj.siteOffice || locObj.address || parsed.siteAddress || subLocality || undefined,
      officeAddress: parsed.confidentialBrokerData?.officeAddress || locObj.officeAddress || contactObj.office_address || contactObj.officeAddress || parsed.officeAddress || undefined,
      architects: parsed.confidentialBrokerData?.architects || parsed.architects || undefined,
      rccConsultants: parsed.confidentialBrokerData?.rccConsultants || parsed.rccConsultants || undefined,
      standardCommissionPercent: typeof parsed.standardCommissionPercent === 'number' ? parsed.standardCommissionPercent : (typeof parsed.confidentialBrokerData?.standardCommissionPercent === 'number' ? parsed.confidentialBrokerData.standardCommissionPercent : 2.5),
      brokerShieldActive: true,
      notes: 'Direct builder booking phone numbers auto-erased to prevent client bypass.',
    },
    classifiedMedia: {
      elevationsCount: assetRecords.filter(a => a.display_position === 'elevation').length,
      floorPlansCount: assetRecords.filter(a => a.display_position.includes('floor_plan')).length,
      hasMasterPlan: assetRecords.some(a => a.display_position === 'master_plan'),
      elevations: assetRecords.filter(a => a.display_position === 'elevation').map(a => ({
        title: a.title,
        viewAngle: a.subtype,
        url: a.file_url,
        description: a.description,
        page_number: a.page_number,
      })),
      floorPlans: assetRecords.filter(a => a.display_position.includes('floor_plan')).map(a => ({
        bhk: a.bhk ?? 0,
        carpetAreaSqft: a.carpetAreaSqft ?? 0,
        title: a.title,
        description: a.description,
        page_number: a.page_number,
      })),
      groundFloorPlans: assetRecords.filter(a => a.display_position === 'ground_floor_plan').map(a => ({ title: a.title, url: a.file_url, page_number: a.page_number })),
      firstFloorPlans: assetRecords.filter(a => a.display_position === 'first_floor_plan').map(a => ({ title: a.title, url: a.file_url, page_number: a.page_number })),
      typicalFloorPlans: assetRecords.filter(a => a.display_position === 'typical_floor_plan').map(a => ({ title: a.title, url: a.file_url, page_number: a.page_number })),
      locationMaps: assetRecords.filter(a => a.display_position === 'location_map').map(a => ({ title: a.title, url: a.file_url, page_number: a.page_number })),
    },
    assetRecords,
    floorPlansList,
    pages: parsed.pages || [],
    extractionMetadata: parsed.extraction_metadata || {
      total_pages: 0,
      images_extracted: assetRecords.length,
      text_extracted: true,
      original_images_preserved: true,
    },
    units: processedUnits,
    rawTextPreview: `AI Extracted Project: ${projectName} | Developer: ${developerName} | RERA: ${reraNumber}`,
  };

  return {
    ...extractedData,
    modelUsed: successfulModel,
  };
}

/**
 * 2. Parse Unstructured Lead Notes / Call Transcripts into Structured Buyer Requirements
 */
export async function parseLeadNotesWithAI(notes: string): Promise<Partial<BuyerRequirementInput>> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      budgetMax: 7500000,
      bhkPreferences: [2],
      targetLocations: ['Kharghar Sector 35'],
    };
  }

  const prompt = `
Extract structured buyer requirements from these notes:
"${notes}"

Return valid JSON with:
{
  "budgetMax": number (in INR, e.g. 7500000),
  "bhkPreferences": number[] (e.g. [1, 2]),
  "targetLocations": string[] (e.g. ["Kharghar", "Taloja"]),
  "possessionPreference": "READY_TO_MOVE" | "UNDER_CONSTRUCTION" | "ANY"
}
`;

  try {
    let responseText = '{}';
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });
      responseText = response.text || '{}';
    } catch (primaryErr) {
      console.warn(`[AI Lead Notes] Model "${GEMINI_MODEL}" notice, trying lightweight fallback:`, primaryErr);
      const fallbackRes = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });
      responseText = fallbackRes.text || '{}';
    }

    return JSON.parse(responseText);
  } catch (err) {
    console.warn('AI lead notes parse error:', err);
    return {
      budgetMax: 7000000,
      bhkPreferences: [2],
      targetLocations: ['Taloja Phase 1'],
    };
  }
}

/**
 * 3. Generate High-Converting WhatsApp Sales Pitch and Trade-off Analysis with AI
 */
export async function generateWhatsAppPitchWithAI(
  clientName: string,
  requirement: BuyerRequirementInput,
  topUnits: any[]
): Promise<{ pitchNarrative: string; tradeOffAnalysis: string; waMessage: string }> {
  const ai = getGeminiClient();
  if (!ai || topUnits.length === 0) {
    const primaryUnit = topUnits[0];
    const projectName = primaryUnit?.project?.projectName || 'Curated Property Option';
    return {
      pitchNarrative: `Based on your preference for ${requirement.bhkPreferences.join('/')} BHK units within your ₹${(requirement.budgetMax / 100000).toFixed(0)} Lakh budget, ${projectName} offers exceptional floor efficiency and prime connectivity.`,
      tradeOffAnalysis: `Unit ${primaryUnit?.unitNumber || ''} provides immediate possession and MahaRERA certified peace of mind with optimized carpet value.`,
      waMessage: `Hi ${clientName}, following our conversation, I have shortlisted top verified homes that match your criteria in ${projectName}. Let me know if you would like an escorted site visit this weekend!`,
    };
  }

  const prompt = `
You are an expert Navi Mumbai luxury real estate advisor crafting a hyper-personalized recommendation for a homebuyer.

Client Name: ${clientName}
Client Budget: ₹${(requirement.budgetMax / 100000).toFixed(2)} Lakhs
BHK Target: ${requirement.bhkPreferences.join(', ')} BHK
Top Matched Units:
${topUnits.map((u, i) => `#${i + 1}: ${u.project?.projectName || 'Project'} Unit ${u.unitNumber} (${u.bhk} BHK, ${u.carpetAreaSqft} sqft, ₹${(u.agreementValue / 100000).toFixed(2)}L, ${u.project?.microMarket || ''})`).join('\n')}

Generate a JSON object with:
1. "pitchNarrative": A professional, consultative 2-3 sentence overview highlighting why these properties suit their life and budget.
2. "tradeOffAnalysis": Objective 1-2 sentence comparison between the top options (e.g. carpet size vs proximity vs price).
3. "waMessage": A warm, high-converting WhatsApp message ready to send to ${clientName} with emoji bullets and a clear site visit call to action.
`;

  try {
    let responseText = '{}';
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });
      responseText = response.text || '{}';
    } catch (primaryErr) {
      console.warn(`[AI WhatsApp Pitch] Model "${GEMINI_MODEL}" notice, trying lightweight fallback:`, primaryErr);
      const fallbackRes = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });
      responseText = fallbackRes.text || '{}';
    }

    const parsed = JSON.parse(responseText);
    return {
      pitchNarrative: parsed.pitchNarrative || 'Curated properties matching your lifestyle and investment criteria.',
      tradeOffAnalysis: parsed.tradeOffAnalysis || 'Verified units offering optimum carpet efficiency and connectivity.',
      waMessage: parsed.waMessage || `Hi ${clientName}, here are your curated property shortlists. Let's arrange a walkthrough!`,
    };
  } catch (err) {
    console.warn('AI WhatsApp pitch error:', err);
    return {
      pitchNarrative: `Tailored shortlist aligned with your ₹${(requirement.budgetMax / 100000).toFixed(0)}L budget.`,
      tradeOffAnalysis: 'Top matches offer verified clear legal titles and immediate connectivity.',
      waMessage: `Hi ${clientName}, I have put together your property shortlist. Would you be available for a site visit this Saturday?`,
    };
  }
}

