/**
 * Navi Mumbai Real Estate Micro-Market Definitions & Pricing Benchmarks
 * 
 * Stratification:
 * 1. Kharghar Sectors 1-20 (Core Established, high end-use, avg ₹17,500/sqft)
 * 2. Kharghar Sectors 34-36 (Upper Kharghar, Transit-oriented new launches, avg ₹14,850/sqft)
 * 3. Taloja Phase 1 & 2 (Affordable growth corridor, Metro Line 1 connected, avg ₹8,700/sqft)
 */

export interface MicroMarketMetadata {
  id: string;
  name: string;
  category: 'CORE_PREMIUM' | 'UPPER_TRANSIT' | 'GROWTH_AFFORDABLE';
  averagePricePerSqft: number;
  rtmPricePerSqft: number;
  underConstructionPricePerSqft: number;
  metroConnectivity: 'DIRECT' | 'FEEDER' | 'PLANNED';
  keyHighlights: string[];
}

export const NAVI_MUMBAI_MICRO_MARKETS: Record<string, MicroMarketMetadata> = {
  'Kharghar Sector 35': {
    id: 'kh-sec-35',
    name: 'Kharghar Sector 35',
    category: 'UPPER_TRANSIT',
    averagePricePerSqft: 14850,
    rtmPricePerSqft: 16200,
    underConstructionPricePerSqft: 13500,
    metroConnectivity: 'DIRECT',
    keyHighlights: ['Adjacent to Metro Line 1 Station', 'High-rise premium towers', 'Valley facing views'],
  },
  'Kharghar Sector 36': {
    id: 'kh-sec-36',
    name: 'Kharghar Sector 36',
    category: 'UPPER_TRANSIT',
    averagePricePerSqft: 14200,
    rtmPricePerSqft: 15500,
    underConstructionPricePerSqft: 13000,
    metroConnectivity: 'DIRECT',
    keyHighlights: ['New launch corridor', 'Modern township amenities', 'Wide 24m CIDCO roads'],
  },
  'Kharghar Sector 20': {
    id: 'kh-sec-20',
    name: 'Kharghar Sector 20 (Core)',
    category: 'CORE_PREMIUM',
    averagePricePerSqft: 17500,
    rtmPricePerSqft: 18500,
    underConstructionPricePerSqft: 16000,
    metroConnectivity: 'FEEDER',
    keyHighlights: ['Established social infrastructure', 'Central Park proximity', 'High rental yield'],
  },
  'Taloja Phase 1': {
    id: 'taloja-ph-1',
    name: 'Taloja Phase 1',
    category: 'GROWTH_AFFORDABLE',
    averagePricePerSqft: 8700,
    rtmPricePerSqft: 11000,
    underConstructionPricePerSqft: 7600,
    metroConnectivity: 'DIRECT',
    keyHighlights: ['Metro Line 1 Terminal', 'Entry-level budget segment', 'High MIDC tenant demand'],
  },
  'Taloja Phase 2': {
    id: 'taloja-ph-2',
    name: 'Taloja Phase 2',
    category: 'GROWTH_AFFORDABLE',
    averagePricePerSqft: 7800,
    rtmPricePerSqft: 9500,
    underConstructionPricePerSqft: 6800,
    metroConnectivity: 'FEEDER',
    keyHighlights: ['Highest 5-year capital appreciation potential', 'Large township developments', 'Upcoming link road'],
  },
  'Ulwe Sector 19': {
    id: 'ulwe-sec-19',
    name: 'Ulwe Sector 19 (Airport Corridor)',
    category: 'GROWTH_AFFORDABLE',
    averagePricePerSqft: 9800,
    rtmPricePerSqft: 11500,
    underConstructionPricePerSqft: 8900,
    metroConnectivity: 'DIRECT',
    keyHighlights: ['NMIA Airport adjacency', 'Bamandongri / Kharkopar Railway', 'Trans-Harbour link access'],
  },
  'Panvel Core': {
    id: 'panvel-core',
    name: 'Panvel (New Launch Corridor)',
    category: 'GROWTH_AFFORDABLE',
    averagePricePerSqft: 8500,
    rtmPricePerSqft: 10200,
    underConstructionPricePerSqft: 7400,
    metroConnectivity: 'FEEDER',
    keyHighlights: ['Mega integrated townships', 'Multi-modal transit hub', 'NAINA growth boundary'],
  },
  'Seawoods Grand': {
    id: 'seawoods-grand',
    name: 'Seawoods Sector 58',
    category: 'CORE_PREMIUM',
    averagePricePerSqft: 21000,
    rtmPricePerSqft: 23500,
    underConstructionPricePerSqft: 19500,
    metroConnectivity: 'DIRECT',
    keyHighlights: ['Grand Central Mall & Seawoods Station', 'Ultra-luxury high rises', 'Waterfront promenade'],
  },
  'Vashi Sector 17': {
    id: 'vashi-sec-17',
    name: 'Vashi (Commercial Core)',
    category: 'CORE_PREMIUM',
    averagePricePerSqft: 22500,
    rtmPricePerSqft: 25000,
    underConstructionPricePerSqft: 21000,
    metroConnectivity: 'DIRECT',
    keyHighlights: ['CBD Gateway of Navi Mumbai', 'Premium established infrastructure', 'Highest commercial rental yield'],
  },
};
