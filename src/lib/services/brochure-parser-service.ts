/**
 * Real Estate Developer Brochure (PDF) Semantic Parser & AI Extraction Engine
 * 
 * Extracts from developer brochures & floor plan leaflets:
 * 1. Project Identity (Project Name, Developer Name, MahaRERA Number)
 * 2. Location & Micro-Market (Kharghar, Taloja, Ulwe, Panvel, Transit proximity)
 * 3. Architectural Elevation & Structure (G+7, G+24 Storey, Tower/Wing count, Podiums, Façade)
 * 4. Floor Plans & Typical Floor Plates (Floor 1-7, Flat 101-708 layout distribution)
 * 5. Typologies & Configurations (1 BHK, 2 BHK, 3 BHK, Carpet Area in sq.ft, Floor Plans)
 * 6. Luxury Amenities & Technical Specifications (Flooring, Kitchen, Plumbing, Electrical)
 * 7. Possession Timeline & Statutory Status (RERA completion date, OC status)
 * 8. Sales Contact & Professional Consultants
 */

import { validateReraNumber } from '@/lib/domain/verification-engine';
import { calculateAllInCost } from '@/lib/domain/cost-calculator';
import { extractBrochureWithAI } from './gemini-service';

export interface ConfidentialBrokerData {
  developerSalesPocName?: string;
  developerSalesPocPhone?: string;
  developerEmail?: string;
  siteAddress?: string;
  officeAddress?: string;
  architects?: string;
  rccConsultants?: string;
  standardCommissionPercent: number;
  brokerShieldActive: boolean;
  notes?: string;
}

export interface ProjectAssetRecord {
  asset_id: string;
  project_id?: string;
  asset_type: 
    | 'elevation' 
    | 'floor_plan' 
    | 'ground_floor_plan' 
    | 'first_floor_plan' 
    | 'typical_floor_plan' 
    | 'unit_floor_plan' 
    | 'site_plan' 
    | 'master_plan' 
    | 'location_map' 
    | 'connectivity_map'
    | 'amenity' 
    | 'exterior' 
    | 'interior' 
    | 'logo' 
    | 'diagram'
    | 'table'
    | 'other';
  subtype: string;
  title: string;
  file_url: string;
  page_number: number;
  original: boolean;
  display_position: string;
  sort_order: number;
  confidence?: number;
  source_position?: string;
  bbox?: { x: number; y: number; width: number; height: number };
  bhk?: number;
  carpetAreaSqft?: number;
  description?: string;
}

export interface ExtractedFloorPlanDetail {
  floor: string;
  plan_type: string;
  page_number: number;
  image_asset?: string;
  file_url?: string;
  units?: any[];
  orientation?: string;
  original_image: boolean;
  title?: string;
  room_dimensions?: Record<string, string>;
}

export interface ClassifiedMediaSummary {
  elevationsCount: number;
  floorPlansCount: number;
  hasMasterPlan: boolean;
  elevations?: Array<{ title: string; viewAngle: string; url?: string; description?: string; page_number?: number }>;
  floorPlans?: Array<{ bhk: number; carpetAreaSqft: number; title: string; url?: string; description?: string; page_number?: number }>;
  groundFloorPlans?: Array<{ title: string; url?: string; page_number?: number }>;
  firstFloorPlans?: Array<{ title: string; url?: string; page_number?: number }>;
  typicalFloorPlans?: Array<{ title: string; url?: string; page_number?: number }>;
  locationMaps?: Array<{ title: string; url?: string; page_number?: number }>;
  amenities?: Array<{ title: string; url?: string; page_number?: number }>;
}

export interface ExtractedBrochureData {
  projectName: string;
  developerName: string;
  reraNumber?: string;
  microMarket: string;
  subLocality?: string;
  coverImageUrl?: string;
  masterPlanUrl?: string;
  elevation: string;
  totalTowers: number;
  totalFloors: number;
  podiumLevels?: number;
  hasOccupancyCertificate: boolean;
  expectedPossessionDate?: string;
  possessionStatus: 'READY_TO_MOVE' | 'UNDER_CONSTRUCTION';
  basePricePerSqft: number;
  plotDetails?: string;
  structureType?: string;
  floorPlateSummary?: string;
  shortDescription: string;
  description: string;
  amenities: string[];
  specifications?: Record<string, string>;
  transitConnectivity?: Array<{ destination: string; timeOrDistance: string; type: string }>;
  keyHighlights: string[];
  developerSalesPocName?: string;
  developerSalesPocPhone?: string;
  developerEmail?: string;
  siteAddress?: string;
  officeAddress?: string;
  architects?: string;
  rccConsultants?: string;
  commercialShops?: Array<{ shopNumber: string; carpetAreaSqft: number; agreementValue?: number; description?: string }>;
  standardCommissionPercent: number;
  confidentialBrokerData?: ConfidentialBrokerData;
  classifiedMedia?: ClassifiedMediaSummary;
  assetRecords?: ProjectAssetRecord[];
  floorPlansList?: ExtractedFloorPlanDetail[];
  imagesCategorized?: Record<string, ProjectAssetRecord[]>;
  pages?: Array<{ page_number: number; page_title?: string; page_type: string; visual_assets?: any[] }>;
  extractionMetadata?: {
    total_pages?: number;
    images_extracted?: number;
    text_extracted?: boolean;
    original_images_preserved?: boolean;
  };
  units: ExtractedBrochureUnit[];
  rawTextPreview?: string;
}

export interface ExtractedBrochureUnit {
  unitNumber?: string;
  bhk: number;
  bhkLabel: string;
  carpetAreaSqft: number;
  saleableAreaSqft?: number;
  builtUpAreaSqft?: number;
  loadingPercentage?: number;
  seriesOrFlatNumbers?: string;
  totalUnitsCount?: number;
  bathrooms: number;
  balconies: number;
  floorNumber: number;
  totalFloors: number;
  facing: 'EAST' | 'WEST' | 'NORTH' | 'SOUTH' | 'NORTH_EAST' | 'NORTH_WEST' | 'SOUTH_EAST' | 'SOUTH_WEST';
  agreementValue: number;
  stampDutyRate: number;
  stampDutyAmount: number;
  registrationFee: number;
  gstRate: number;
  gstAmount: number;
  parkingCharges: number;
  societyDevelopmentCharges: number;
  allInTotalCost: number;
  possessionStatus: 'READY_TO_MOVE' | 'UNDER_CONSTRUCTION';
  description?: string;
  featureHighlights: string[];
}

/**
 * Standard Amenities Dictionary for Navi Mumbai Real Estate Projects
 */
const AMENITIES_CATALOG: Array<{ key: string; name: string; patterns: RegExp[] }> = [
  { key: 'swimming_pool', name: 'Infinity Edge Swimming Pool & Kids Splash Pool', patterns: [/swimming\s*pool/i, /lap\s*pool/i, /infinity\s*pool/i, /splash\s*pool/i] },
  { key: 'gymnasium', name: 'State-of-the-Art Fitness Center & Gymnasium', patterns: [/gymnasium/i, /fitness\s*center/i, /health\s*club/i, /gym/i, /crossfit/i] },
  { key: 'clubhouse', name: 'Grand Lifestyle Clubhouse & Community Hall', patterns: [/club\s*house/i, /clubhouse/i, /community\s*hall/i, /banquet\s*hall/i] },
  { key: 'sky_deck', name: 'Rooftop Sky Lounge & Stargazing Deck', patterns: [/sky\s*deck/i, /sky\s*lounge/i, /rooftop\s*deck/i, /terrace\s*garden/i, /stargazing/i] },
  { key: 'kids_play', name: 'Children\'s Adventure Play Park & Sandpit', patterns: [/kids?\s*play\s*area/i, /children'?s?\s*play/i, /sand\s*pit/i, /toddler/i] },
  { key: 'jogging_track', name: 'Acupressure Walkway & Jogging Track', patterns: [/jogging\s*track/i, /walking\s*track/i, /acupressure/i, /pathway/i] },
  { key: 'indoor_games', name: 'Indoor Games Arcade (Table Tennis, Snooker, Chess)', patterns: [/indoor\s*games/i, /snooker/i, /table\s*tennis/i, /billiards/i, /chess/i] },
  { key: 'yoga_meditation', name: 'Yoga Deck & Zen Meditation Pavilion', patterns: [/yoga\s*deck/i, /meditation/i, /zen\s*garden/i, /aerobics/i] },
  { key: 'grand_lobby', name: 'Taste-Fully Designed Entrance & Floor Lobbies', patterns: [/entrance\s*lobby/i, /designer\s*lobby/i, /grand\s*lobby/i, /floor\s*lobbies/i, /reception/i] },
  { key: 'high_speed_lifts', name: 'Branded High-Speed Passenger Elevators', patterns: [/high[\s-]*speed\s*lifts?/i, /high[\s-]*speed\s*elevators?/i, /automatic\s*elevators?/i, /branded\s*high\s*speed/i, /schindler/i, /otis/i, /kone/i] },
  { key: 'ev_charging', name: 'EV Car Charging Infrastructure Stations', patterns: [/ev\s*charg/i, /electric\s*vehicle/i, /charging\s*point/i] },
  { key: 'security_cctv', name: '3-Tier High-Tech Security with 24/7 CCTV & Intercom', patterns: [/cctv/i, /3[\s-]*tier\s*security/i, /24x7\s*security/i, /intercom\s*facility/i, /intercom/i, /video\s*door\s*phone/i] },
  { key: 'landscaped_gardens', name: 'Manicured Landscaped Podium Gardens with Gazebo', patterns: [/landscap/i, /podium\s*garden/i, /gazebo/i, /lawn/i, /lush\s*green/i] },
  { key: 'power_backup', name: 'Power Backup for Lifts & Common Area', patterns: [/power\s*backup/i, /generator\s*backup/i, /dg\s*backup/i] },
  { key: 'fire_fighting', name: 'Advanced Automatic Fire Fighting & Sprinkler System', patterns: [/fire\s*fighting/i, /sprinkler/i, /fire\s*alarm/i, /smoke\s*detector/i] },
  { key: 'rainwater_harvesting', name: 'Rainwater Harvesting System & Eco Water Management', patterns: [/rain\s*water\s*harvesting/i, /rainwater/i, /solar/i, /eco[\s-]*friendly/i, /sewage\s*treatment/i] },
  { key: 'podium_parking', name: 'Multi-Level Secure Covered Podium Car Parking', patterns: [/podium\s*parking/i, /covered\s*parking/i, /stack\s*parking/i, /multi[\s-]*level\s*parking/i, /parking/i] },
  { key: 'vitrified_flooring', name: '2\'x2\' Vitrified Flooring Tiles in All Rooms', patterns: [/vitrified\s*flooring/i, /2x2\s*vitrified/i, /flooring\s*tiles/i] },
  { key: 'granite_kitchen', name: 'Granite Kitchen Platform with Stainless Steel Sink & Dado Tiles', patterns: [/granite\s*kitchen/i, /kitchen\s*platform/i, /stainless\s*steel\s*sink/i] },
  { key: 'designer_doors', name: 'Decorative Laminated Main Door with Quality Fixtures & Marble Frames', patterns: [/decorative\s*lamination/i, /main\s*door/i, /marble\s*frame/i, /wooden\s*door/i] },
  { key: 'aluminum_windows', name: 'Powder Coated Aluminum Sliding Windows', patterns: [/powder\s*coated\s*aluminum/i, /sliding\s*windows/i, /aluminum\s*louvers/i] },
  { key: 'concealed_wiring', name: 'Concealed Copper Wiring with Modular Switches & TV/Cable Points', patterns: [/concealed\s*copper\s*wiring/i, /modular\s*switches/i, /copper\s*wiring/i] },
  { key: 'china_chips_waterproofing', name: 'Special Terrace Water Proofing Treatment with China Chips', patterns: [/water\s*proofing/i, /china\s*chips/i, /terrace\s*water/i] },
];

/**
 * Micro-Market matchers for Navi Mumbai
 */
const MICRO_MARKETS = [
  { match: /taloja\s*phase\s*(\d+|ii|i)/i, format: (m: RegExpMatchArray) => `Taloja Phase ${m[1].toUpperCase() === 'II' ? '2' : m[1].toUpperCase() === 'I' ? '1' : m[1]}` },
  { match: /taloja\s*sector\s*(\d+)/i, format: (m: RegExpMatchArray) => `Taloja Sector ${m[1]}` },
  { match: /sector[\s-]*(\d+)[,\s]+taloja/i, format: (m: RegExpMatchArray) => `Taloja Sector ${m[1]}` },
  { match: /taloja/i, format: () => 'Taloja' },
  { match: /kharghar\s*sector\s*(\d+)/i, format: (m: RegExpMatchArray) => `Kharghar Sector ${m[1]}` },
  { match: /sector[\s-]*(\d+)[,\s]+kharghar/i, format: (m: RegExpMatchArray) => `Kharghar Sector ${m[1]}` },
  { match: /kharghar/i, format: () => 'Kharghar' },
  { match: /ulwe\s*sector\s*(\d+)/i, format: (m: RegExpMatchArray) => `Ulwe Sector ${m[1]}` },
  { match: /ulwe/i, format: () => 'Ulwe' },
  { match: /panvel/i, format: () => 'Panvel' },
  { match: /roadpali/i, format: () => 'Roadpali' },
  { match: /dronagiri/i, format: () => 'Dronagiri' },
  { match: /kamothe/i, format: () => 'Kamothe' },
  { match: /seawoods/i, format: () => 'Seawoods' },
  { match: /nerul/i, format: () => 'Nerul' },
  { match: /vashi/i, format: () => 'Vashi' },
  { match: /belapur/i, format: () => 'CBD Belapur' },
];

/**
 * Extracts plain text from raw PDF buffer without external native binary dependencies
 */
export function extractTextFromPdfBuffer(buffer: Buffer): string {
  try {
    const raw = buffer.toString('binary');
    const textChunks: string[] = [];

    const btRegex = /BT[\s\S]*?ET/g;
    let match;
    while ((match = btRegex.exec(raw)) !== null) {
      const block = match[0];
      const strRegex = /\((.*?)\)\s*Tj/g;
      let strMatch;
      while ((strMatch = strRegex.exec(block)) !== null) {
        textChunks.push(strMatch[1]);
      }
      
      const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
      let tjMatch;
      while ((tjMatch = tjArrayRegex.exec(block)) !== null) {
        const inner = tjMatch[1];
        const innerStrs = inner.match(/\((.*?)\)/g);
        if (innerStrs) {
          textChunks.push(innerStrs.map(s => s.slice(1, -1)).join(''));
        }
      }
    }

    let extracted = textChunks.join(' ').replace(/\\(\d{3}|.)/g, ' ').replace(/\s+/g, ' ').trim();
    if (extracted.length < 50) {
      const printableMatches = raw.match(/[A-Za-z0-9\s.,;:'"()&/-]{4,}/g);
      if (printableMatches) {
        extracted = printableMatches.join(' ').replace(/\s+/g, ' ').trim();
      }
    }

    return extracted;
  } catch (err) {
    console.error('extractTextFromPdfBuffer failed:', err);
    return '';
  }
}

/**
 * Deterministic Semantic Parsing Engine for Real Estate Brochures
 */
export function parseBrochureText(rawText: string, filename: string = 'brochure.pdf'): ExtractedBrochureData {
  const normalizedText = rawText.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');

  // 1. PROJECT NAME & DEVELOPER
  let projectName = '';
  let developerName = '';

  // Pattern A: "DEVELOPER PRESENTS PROJECT"
  const presentsMatch = normalizedText.match(/^([A-Za-z0-9\s&.,'-]+?)\s+PRESENTS\s+([A-Za-z0-9\s&.,'-]+?)(?:\s+(?:an\s+|a\s+|ultra|luxury|residential|commercial|plot|sector|maharera|reg|location|$))/i);
  if (presentsMatch) {
    developerName = presentsMatch[1].replace(/^(?:welcome\s+to|introducing|upcoming|prestigious)\s+/i, '').trim();
    projectName = presentsMatch[2].trim();
  }

  // Pattern B: "A Project By: Developer"
  const projByMatch = normalizedText.match(/(?:a\s+project\s+by|project\s+by|developer|promoter)[:\s]+([^;\n\r|]+?)(?:\s+(?:office|site|email|architect|contact|rcc|tel|ph|$))/i);
  if (projByMatch && (!developerName || developerName === 'Premier Group')) {
    developerName = projByMatch[1].trim();
  }

  // Pattern C: "Project by Developer"
  if (!projectName || !developerName) {
    const byMatch = normalizedText.match(/(.+?)\s+by\s+([A-Za-z0-9\s&.,'-]+?)(?:\s+(?:presents|presents\s+a|luxury|residential|plot|sector|maharera|reg))/i);
    if (byMatch) {
      if (!projectName) projectName = byMatch[1].replace(/^(?:welcome\s+to|introducing|upcoming|prestigious)\s+/i, '').trim();
      if (!developerName) developerName = byMatch[2].trim();
    }
  }

  // Pattern D: Heading line before Plot / Sector / MahaRERA
  if (!projectName) {
    const headingMatch = normalizedText.match(/^([A-Z0-9\s&'-]{3,40}?)(?:\s+(?:Plot|Sector|MahaRERA|ABOUT|Near|G\+))/i);
    if (headingMatch) {
      projectName = headingMatch[1].trim();
    } else {
      const titleMatch = normalizedText.match(/^(?:a\s+project\s+by\s+)?([A-Z0-9\s&'-]{3,40})/);
      projectName = titleMatch ? titleMatch[1].trim() : filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    }
  }

  if (!developerName) {
    developerName = 'Premier Group';
  }

  // Clean title-case for project and developer if ALL CAPS
  const toTitleCase = (s: string) => s.split(' ').map(w => w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w).join(' ');
  if (projectName === projectName.toUpperCase() && projectName.length > 3) {
    projectName = toTitleCase(projectName);
  }
  if (developerName === developerName.toUpperCase() && developerName.length > 3) {
    developerName = toTitleCase(developerName);
  }

  // 2. MAHARERA NUMBER
  const reraMatch = normalizedText.match(/\b(P\d{11})\b/i);
  let reraNumber: string | undefined;
  if (reraMatch) {
    const reraCheck = validateReraNumber(reraMatch[1].toUpperCase());
    if (reraCheck.isValid && reraCheck.normalized) {
      reraNumber = reraCheck.normalized;
    }
  }

  // 3. MICRO-MARKET & SUB-LOCALITY
  let microMarket = 'Navi Mumbai';
  for (const m of MICRO_MARKETS) {
    const match = normalizedText.match(m.match);
    if (match) {
      microMarket = m.format(match);
      break;
    }
  }

  let subLocality = '';
  const sectorMatch = normalizedText.match(/Sector[\s-]*(\d+[A-Za-z]?)/i);
  const plotMatch = normalizedText.match(/Plot\s*(?:No\.?)?\s*([A-Za-z0-9-]+)/i);
  if (sectorMatch && plotMatch) {
    subLocality = `Plot ${plotMatch[1]}, Sector ${sectorMatch[1]}`;
  } else if (sectorMatch) {
    subLocality = `Sector ${sectorMatch[1]}`;
  }

  // 4. ELEVATION & FLOORS
  let elevation = 'Residential Project';
  let totalFloors = 1;
  const elevationMatch = normalizedText.match(/(G\s*\+\s*(\d+))\s*(?:storey|floor|slab|tower|building)?/i);
  if (elevationMatch) {
    const floorsCount = parseInt(elevationMatch[2], 10);
    totalFloors = Math.max(floorsCount, 1);
    elevation = `${elevationMatch[1].replace(/\s+/g, '')} Storey Residential & Commercial Project`;
  }

  const totalTowers = /twin\s*towers?/i.test(normalizedText) ? 2 : 1;

  // 5. POSSESSION & OC STATUS
  const hasOccupancyCertificate = /occupancy\s*certificate|oc\s*received|ready\s*to\s*move/i.test(normalizedText);
  const possessionStatus = hasOccupancyCertificate ? 'READY_TO_MOVE' : 'UNDER_CONSTRUCTION';

  let expectedPossessionDate: string | undefined;
  const dateMatch = normalizedText.match(/(?:possession|completion|rera\s*target|target\s*date)[:\s]+([A-Za-z]+\s+\d{4}|\d{2}[/-]\d{2}[/-]\d{4})/i);
  if (dateMatch) {
    expectedPossessionDate = dateMatch[1].trim();
  }

  // 6. AMENITIES EXTRACTION
  const extractedAmenities: string[] = [];
  for (const am of AMENITIES_CATALOG) {
    for (const pat of am.patterns) {
      if (pat.test(normalizedText)) {
        extractedAmenities.push(am.name);
        break;
      }
    }
  }

  // 7. DEVELOPER POC & CONSULTANTS
  let developerSalesPocName: string | undefined;
  let developerSalesPocPhone: string | undefined;
  let developerEmail: string | undefined;
  let architects: string | undefined;
  let rccConsultants: string | undefined;

  const phoneMatch = normalizedText.match(/(?:contact|booking|call|mob|ph)[:\s]+(?:for\s*booking[:\s]*)?([A-Za-z\s]+)?[-:\s]*(\+?91[\s-]?[6-9]\d{9}|[6-9]\d{9})/i);
  if (phoneMatch) {
    if (phoneMatch[1] && phoneMatch[1].trim().length > 2) {
      developerSalesPocName = phoneMatch[1].trim();
    }
    developerSalesPocPhone = phoneMatch[2].replace(/\s+/g, '');
  }

  const emailMatch = normalizedText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    developerEmail = emailMatch[1];
  }

  const archMatch = normalizedText.match(/architects?[:\s]+([^|;\n\r]+?)(?:\s*[|;]|\s+(?:rcc|consultant|advocate|email|contact|legal))/i);
  if (archMatch) architects = archMatch[1].trim();

  const rccMatch = normalizedText.match(/rcc(?:\s*consultants?)?[:\s]+([^|;\n\r]+?)(?:\s*[|;]|\s+(?:architect|advocate|email|contact|legal))/i);
  if (rccMatch) rccConsultants = rccMatch[1].trim();

  // 8. BASE PRICING PER SQFT
  let basePricePerSqft = 0;
  const rateMatch = normalizedText.match(/(?:base\s*rate|base\s*price|rate|price)[:\s]*(?:rs\.?|₹)?\s*([\d,]+)\s*(?:\/|\s*per)?\s*sq\.?\s*ft/i);
  if (rateMatch) {
    basePricePerSqft = parseInt(rateMatch[1].replace(/,/g, ''), 10);
  } else {
    // Zero-fabrication default: only set if discovered
    basePricePerSqft = 0;
  }

  // 9. FLOOR PLANS & DISTINCT CARPET AREA MATRIX GENERATION
  const units: ExtractedBrochureUnit[] = [];
  const detectedBhks = new Set<number>();

  if (/1\s*(?:BHK|Bed)/i.test(normalizedText)) detectedBhks.add(1);
  if (/2\s*(?:BHK|Bed)/i.test(normalizedText)) detectedBhks.add(2);
  if (/3\s*(?:BHK|Bed)/i.test(normalizedText)) detectedBhks.add(3);

  // Extract all distinct carpet areas per BHK (e.g. 1 BHK 400, 420, 433 sqft)
  const extractAreasForBhk = (bhkNum: number): number[] => {
    const areas = new Set<number>();
    
    // Pattern 1: Multi-area listing e.g. "1 BHK: 400, 420, 433 sqft" or "1 BHK (400, 420 & 433 sqft)"
    const listRegex = new RegExp(`${bhkNum}\\s*(?:BHK|Bed)[^\\w\\d]{1,10}(?:carpet|area|size|sizes)?[:\\s]*([\\d,\\s/&]+)\\s*(?:sq\\.?\\s*ft|sqft)`, 'i');
    const listMatch = normalizedText.match(listRegex);
    if (listMatch && listMatch[1]) {
      const nums = listMatch[1].match(/\b\d{3,4}\b/g);
      if (nums) {
        nums.forEach((n) => {
          const val = parseInt(n, 10);
          if (val >= 200 && val <= 4000) areas.add(val);
        });
      }
    }

    // Pattern 2: Global occurrences of "X BHK ... Y sqft"
    const globalRegex = new RegExp(`${bhkNum}\\s*(?:BHK|Bed)[^\\d]{1,40}(\\d{3,4})\\s*(?:sq\\.?\\s*ft|sqft)`, 'gi');
    let gMatch;
    while ((gMatch = globalRegex.exec(normalizedText)) !== null) {
      const val = parseInt(gMatch[1], 10);
      if (val >= 200 && val <= 4000) areas.add(val);
    }

    return Array.from(areas).sort((a, b) => a - b);
  };

  const carpetAreaMap: Record<number, number[]> = {
    1: extractAreasForBhk(1),
    2: extractAreasForBhk(2),
    3: extractAreasForBhk(3),
  };

  let unitIndex = 1;
  for (const bhk of Array.from(detectedBhks).sort()) {
    const areasForThisBhk = carpetAreaMap[bhk]?.length > 0 ? carpetAreaMap[bhk] : [0];

    for (let areaIdx = 0; areaIdx < areasForThisBhk.length; areaIdx++) {
      const carpetArea = areasForThisBhk[areaIdx];
      const floorNumber = Math.min(totalFloors, Math.max(1, bhk === 1 ? 1 : 2));
      const agreementValue = carpetArea > 0 && basePricePerSqft > 0 ? Math.round(carpetArea * basePricePerSqft) : 0;

      // Calculate statutory costs with 1% GST <= 45L, 5% > 45L, and 40% builder loading
      const statutory = agreementValue > 0 ? calculateAllInCost({
        agreementValue,
        isFemaleBuyer: false,
        hasOccupancyCertificate,
        floorNumber,
        carpetAreaSqft: carpetArea,
        parkingCharges: 0,
        societyDevCharges: 0,
        builderLoadingPercentage: 40,
      }) : {
        stampDutyRate: 0.06,
        stampDutyAmount: 0,
        registrationFee: 30000,
        gstRate: hasOccupancyCertificate ? 0 : (agreementValue <= 4500000 ? 0.01 : 0.05),
        gstAmount: 0,
        parkingCharges: 0,
        societyDevCharges: 0,
        totalAllInCost: 0,
        saleableAreaSqft: Math.round(carpetArea * 1.40),
        builtUpAreaSqft: Math.round(carpetArea * 1.15),
        loadingPercentage: 40,
      };

      const highlights: string[] = [];
      if (carpetArea > 0) highlights.push(`${carpetArea} sq.ft RERA Carpet Area`);
      if (statutory.saleableAreaSqft > 0) highlights.push(`${statutory.saleableAreaSqft} sq.ft Saleable Area (40% Loading)`);
      if (reraNumber) highlights.push(`MahaRERA ID: ${reraNumber}`);
      highlights.push(`Available across typical floors (Total ${totalFloors} Storeys)`);

      const configLetter = String.fromCharCode(65 + areaIdx); // Config A, Config B, Config C
      const configLabel = areasForThisBhk.length > 1
        ? `${bhk} BHK • ${carpetArea} sq.ft (Config ${configLetter})`
        : `${bhk} BHK Residential Unit`;

      units.push({
        unitNumber: areasForThisBhk.length > 1 ? `${bhk}BHK-${configLetter} (${carpetArea} sqft)` : `Unit ${floorNumber}0${unitIndex}`,
        bhk,
        bhkLabel: configLabel,
        carpetAreaSqft: carpetArea,
        saleableAreaSqft: statutory.saleableAreaSqft,
        builtUpAreaSqft: statutory.builtUpAreaSqft,
        loadingPercentage: 40,
        seriesOrFlatNumbers: `Config ${configLetter} Series`,
        bathrooms: bhk >= 2 ? 2 : 1,
        balconies: bhk >= 2 ? 2 : 1,
        floorNumber,
        totalFloors,
        facing: unitIndex % 2 === 0 ? 'EAST' : 'WEST',
        agreementValue,
        stampDutyRate: statutory.stampDutyRate,
        stampDutyAmount: statutory.stampDutyAmount,
        registrationFee: statutory.registrationFee,
        gstRate: statutory.gstRate,
        gstAmount: statutory.gstAmount,
        parkingCharges: statutory.parkingCharges,
        societyDevelopmentCharges: statutory.societyDevCharges,
        allInTotalCost: statutory.totalAllInCost,
        possessionStatus,
        description: `${bhk} BHK residential apartment (${carpetArea} sq.ft usable carpet, ${statutory.saleableAreaSqft} sq.ft saleable) in ${projectName}.`,
        featureHighlights: highlights,
      });

      unitIndex++;
    }
  }

  const shortDescription = `${elevation} situated at ${microMarket} (${subLocality}). Featuring premium ${Array.from(detectedBhks).map(b => `${b} BHK`).join(' & ')} flats with balconies and ground floor commercial shops.`;
  const description = `${projectName} by ${developerName}${subLocality ? ` located at ${subLocality}, ${microMarket}` : ` located in ${microMarket}`}${reraNumber ? `. Approved under MahaRERA Reg No: ${reraNumber}.` : '.'}`;

  return {
    projectName,
    developerName,
    reraNumber,
    microMarket,
    subLocality,
    elevation,
    totalTowers,
    totalFloors,
    podiumLevels: 0,
    hasOccupancyCertificate,
    expectedPossessionDate,
    possessionStatus,
    basePricePerSqft,
    plotDetails: undefined,
    structureType: undefined,
    floorPlateSummary: undefined,
    shortDescription,
    description,
    amenities: Array.from(new Set(extractedAmenities)),
    specifications: {},
    transitConnectivity: [],
    keyHighlights: [
      ...(reraNumber ? [`MahaRERA Registered Project: ${reraNumber}`] : []),
      ...(elevation ? [`Elevation: ${elevation}`] : []),
      ...(subLocality ? [`Location: ${subLocality}`] : []),
      ...(detectedBhks.size > 0 ? [`Typologies: ${Array.from(detectedBhks).map(b => `${b} BHK`).join(' & ')}`] : []),
    ],
    developerSalesPocName,
    developerSalesPocPhone,
    developerEmail,
    architects,
    rccConsultants,
    standardCommissionPercent: 2.5,
    confidentialBrokerData: {
      developerSalesPocName,
      developerSalesPocPhone,
      developerEmail,
      siteAddress: subLocality ? `Site Address: ${subLocality}, ${microMarket}` : undefined,
      officeAddress: undefined,
      architects,
      rccConsultants,
      standardCommissionPercent: 2.5,
      brokerShieldActive: true,
      notes: 'Direct builder booking contacts and site office address are secured for internal CRM broker use only.',
    },
    classifiedMedia: {
      elevationsCount: 0,
      floorPlansCount: 0,
      hasMasterPlan: false,
      elevations: [],
      floorPlans: [],
    },
    units,
    rawTextPreview: normalizedText.slice(0, 500) + '...',
  };
}

/**
 * Universal Unified Async Parser
 */
export async function parseBrochureAsync(
  buffer: Buffer,
  mimeType: string = 'application/pdf',
  filename: string = 'brochure.pdf'
): Promise<{ data: ExtractedBrochureData; extractionMethod: 'GEMINI_AI' | 'REGEX_FALLBACK'; modelUsed?: string; note?: string }> {
  try {
    const aiData = await extractBrochureWithAI(buffer, mimeType, filename);
    return {
      data: aiData,
      extractionMethod: 'GEMINI_AI',
      modelUsed: aiData.modelUsed || 'Gemini Vision AI',
    };
  } catch (error: any) {
    console.warn('Gemini AI brochure extraction encountered rate limits or network issue, using smart local parser:', error.message || error);
    const rawText = extractTextFromPdfBuffer(buffer) || `Project: ${filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')}`;
    const fallbackData = parseBrochureText(rawText, filename);
    return {
      data: fallbackData,
      extractionMethod: 'REGEX_FALLBACK',
      modelUsed: 'Smart Local Parser (Quota Safe)',
      note: 'AI rate limit or network issue. Parsed using local text extraction engine.',
    };
  }
}
