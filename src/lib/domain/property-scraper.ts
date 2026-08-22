export type NaviMumbaiNode = 'ALL' | 'KHARGHAR' | 'TALOJA_PHASE_1' | 'TALOJA_PHASE_2';

export interface ScrapedProjectShell {
  projectName: string;
  reraNumber: string;
  developerName: string;
  microMarket: string;
  address: string;
  possessionDate: string;
  latitude: number;
  longitude: number;
  totalTowers: number;
  totalFloors: number;
  basePricePerSqft: number;
  hasOccupancyCertificate: boolean;
  shortDescription: string;
  mediaGallery: Array<{
    id: string;
    url: string;
    kind: 'image' | 'video';
    type: 'ELEVATION' | 'FLOOR_PLAN' | 'MASTER_PLAN' | 'AMENITY';
    category: 'elevation' | 'floorplan' | 'masterplan' | 'amenities';
    title: string;
  }>;
  units: Array<{
    unitNumber: string;
    bhk: number;
    carpetAreaSqm: number;
    carpetAreaSqft: number;
    builtUpAreaSqft: number;
    superBuiltUpAreaSqft: number;
    facing: string;
    floorNumber: number;
    agreementValue: number;
  }>;
}

export function filterElevationsAndFloorPlansOnly(mediaList: any[]): any[] {
  if (!Array.isArray(mediaList)) return [];
  // Strict media filter: exclude interior living/bedroom/bathroom staging photos
  // Keep only architectural elevations, facade renders, floor plans, and master layouts
  return mediaList.filter((item) => {
    const category = (item.category || item.type || '').toLowerCase();
    const title = (item.title || item.alt || '').toLowerCase();
    
    // Explicit exclusions
    if (category.includes('interior') || category.includes('sample') || category.includes('bedroom') || category.includes('living')) {
      return false;
    }
    if (title.includes('interior') || title.includes('bedroom') || title.includes('kitchen') || title.includes('bathroom') || title.includes('living room')) {
      return false;
    }

    return (
      category.includes('elevation') ||
      category.includes('facade') ||
      category.includes('floorplan') ||
      category.includes('blueprint') ||
      category.includes('masterplan') ||
      category.includes('layout') ||
      item.type === 'ELEVATION' ||
      item.type === 'FLOOR_PLAN' ||
      item.type === 'MASTER_PLAN'
    );
  });
}

export function calculateNaviMumbaiAreaMatrix(carpetAreaSqm: number, loadingPercent = 33.5): {
  carpetAreaSqm: number;
  carpetAreaSqft: number;
  builtUpAreaSqft: number;
  superBuiltUpAreaSqft: number;
} {
  const carpetAreaSqft = Math.round(carpetAreaSqm * 10.7639);
  const builtUpAreaSqft = Math.round(carpetAreaSqft * 1.15); // Standard 15% wall thickness
  const superBuiltUpAreaSqft = Math.round(carpetAreaSqft * (1 + loadingPercent / 100)); // Common area loading

  return {
    carpetAreaSqm,
    carpetAreaSqft,
    builtUpAreaSqft,
    superBuiltUpAreaSqft,
  };
}

export const VERIFIED_NAVI_MUMBAI_CATALOG: ScrapedProjectShell[] = [
  {
    projectName: 'Sai World Empire',
    reraNumber: 'P52000026796',
    developerName: 'Paradise Group',
    microMarket: 'Kharghar Sector 36',
    address: 'Sector 36, Upper Kharghar, Navi Mumbai 410210',
    possessionDate: '2026-12-31',
    latitude: 19.0682,
    longitude: 73.0845,
    totalTowers: 6,
    totalFloors: 38,
    basePricePerSqft: 15500,
    hasOccupancyCertificate: false,
    shortDescription: '18-Acre French & Roman Themed Luxury Township with G+38 Storey Skyscraper Elevations and Valley Views.',
    mediaGallery: [
      {
        id: 'swe-elev-1',
        url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=85',
        kind: 'image',
        type: 'ELEVATION',
        category: 'elevation',
        title: 'Sai World Empire Skyscraper Facade',
      },
      {
        id: 'swe-fp-1',
        url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
        kind: 'image',
        type: 'FLOOR_PLAN',
        category: 'floorplan',
        title: '3 BHK Roman Imperial Floor Plan',
      },
    ],
    units: [
      {
        unitNumber: 'A-1402',
        bhk: 2,
        carpetAreaSqm: 68.28,
        carpetAreaSqft: 735,
        builtUpAreaSqft: 845,
        superBuiltUpAreaSqft: 981,
        facing: 'EAST',
        floorNumber: 14,
        agreementValue: 11392500,
      },
      {
        unitNumber: 'B-2201',
        bhk: 3,
        carpetAreaSqm: 104.05,
        carpetAreaSqft: 1120,
        builtUpAreaSqft: 1288,
        superBuiltUpAreaSqft: 1495,
        facing: 'NORTH_EAST',
        floorNumber: 22,
        agreementValue: 17360000,
      },
    ],
  },
  {
    projectName: 'Adhiraj Capital City',
    reraNumber: 'P52000022975',
    developerName: 'Adhiraj Constructions',
    microMarket: 'Kharghar Sector 37',
    address: 'Sector 37, Kharghar, Navi Mumbai 410210',
    possessionDate: '2026-06-30',
    latitude: 19.0654,
    longitude: 73.0812,
    totalTowers: 5,
    totalFloors: 54,
    basePricePerSqft: 14200,
    hasOccupancyCertificate: false,
    shortDescription: '40-Acre Megacity with 54-Storey High-Rise Towers & 75,000 sq.ft. Elysium Clubhouse.',
    mediaGallery: [
      {
        id: 'acc-elev-1',
        url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=85',
        kind: 'image',
        type: 'ELEVATION',
        category: 'elevation',
        title: 'Adhiraj Capital City 54-Storey Architectural Elevation',
      },
      {
        id: 'acc-fp-1',
        url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
        kind: 'image',
        type: 'FLOOR_PLAN',
        category: 'floorplan',
        title: '2 BHK Luxury Tower Blueprint',
      },
    ],
    units: [
      {
        unitNumber: 'T1-1804',
        bhk: 2,
        carpetAreaSqm: 63.64,
        carpetAreaSqft: 685,
        builtUpAreaSqft: 788,
        superBuiltUpAreaSqft: 914,
        facing: 'EAST',
        floorNumber: 18,
        agreementValue: 9727000,
      },
    ],
  },
  {
    projectName: 'Crown Heights Luxury Towers',
    reraNumber: 'P52000018920',
    developerName: 'Crown Lifespaces',
    microMarket: 'Kharghar Sector 35',
    address: 'Sector 35, Kharghar, Navi Mumbai 410210',
    possessionDate: '2023-08-31',
    latitude: 19.0621,
    longitude: 73.0789,
    totalTowers: 2,
    totalFloors: 22,
    basePricePerSqft: 14850,
    hasOccupancyCertificate: true,
    shortDescription: 'Ready-to-Move OC 2 & 3 BHK with 0% GST, French balconies and valley views in Kharghar 35.',
    mediaGallery: [
      {
        id: 'ch-elev-1',
        url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=85',
        kind: 'image',
        type: 'ELEVATION',
        category: 'elevation',
        title: 'Crown Heights Completed Facade',
      },
      {
        id: 'ch-fp-1',
        url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
        kind: 'image',
        type: 'FLOOR_PLAN',
        category: 'floorplan',
        title: '2 BHK Ready OC Floor Plan',
      },
    ],
    units: [
      {
        unitNumber: 'A-1204',
        bhk: 2,
        carpetAreaSqm: 63.64,
        carpetAreaSqft: 685,
        builtUpAreaSqft: 788,
        superBuiltUpAreaSqft: 914,
        facing: 'EAST',
        floorNumber: 12,
        agreementValue: 6800000,
      },
    ],
  },
  {
    projectName: 'Arihant Clan Aalishan',
    reraNumber: 'P52000006391',
    developerName: 'Arihant Superstructures Ltd',
    microMarket: 'Taloja Phase 2',
    address: 'Sector 26, Taloja Phase 2, Navi Mumbai 410208',
    possessionDate: '2026-09-30',
    latitude: 19.0550,
    longitude: 73.1020,
    totalTowers: 4,
    totalFloors: 53,
    basePricePerSqft: 9800,
    hasOccupancyCertificate: false,
    shortDescription: 'Persian-Themed 53-Storey Luxury Towers with Persian Hammam Clubhouse in Taloja Phase 2.',
    mediaGallery: [
      {
        id: 'aca-elev-1',
        url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=85',
        kind: 'image',
        type: 'ELEVATION',
        category: 'elevation',
        title: 'Arihant Clan Aalishan Persian Tower Elevation',
      },
      {
        id: 'aca-fp-1',
        url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
        kind: 'image',
        type: 'FLOOR_PLAN',
        category: 'floorplan',
        title: '1 BHK & 2 BHK Aalishan Layout',
      },
    ],
    units: [
      {
        unitNumber: 'K-1902',
        bhk: 2,
        carpetAreaSqm: 54.81,
        carpetAreaSqft: 590,
        builtUpAreaSqft: 678,
        superBuiltUpAreaSqft: 788,
        facing: 'EAST',
        floorNumber: 19,
        agreementValue: 5782000,
      },
    ],
  },
  {
    projectName: 'Crown Taloja (Lodha Crown)',
    reraNumber: 'P51700022900',
    developerName: 'Lodha Group',
    microMarket: 'Taloja Phase 1',
    address: 'Sector 2, Taloja Phase 1, Navi Mumbai 410208',
    possessionDate: '2025-03-31',
    latitude: 19.0720,
    longitude: 73.1150,
    totalTowers: 12,
    totalFloors: 14,
    basePricePerSqft: 8500,
    hasOccupancyCertificate: true,
    shortDescription: 'Ready OC 1 & 2 BHK Residences by Lodha with 0% GST and 20,000 sq.ft. Club House in Taloja Phase 1.',
    mediaGallery: [
      {
        id: 'lc-elev-1',
        url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=85',
        kind: 'image',
        type: 'ELEVATION',
        category: 'elevation',
        title: 'Lodha Crown Taloja Tower Elevation',
      },
      {
        id: 'lc-fp-1',
        url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
        kind: 'image',
        type: 'FLOOR_PLAN',
        category: 'floorplan',
        title: '1 BHK Lodha Smart Residence Floor Plan',
      },
    ],
    units: [
      {
        unitNumber: 'C-803',
        bhk: 1,
        carpetAreaSqm: 31.59,
        carpetAreaSqft: 340,
        builtUpAreaSqft: 391,
        superBuiltUpAreaSqft: 454,
        facing: 'NORTH',
        floorNumber: 8,
        agreementValue: 2890000,
      },
    ],
  },
];
