import { describe, it, expect } from 'bun:test';
import {
  groupUnitsByConfiguration,
  resolveUnitMediaAssets,
  calculateUnitAreaMatrix,
  differentiateUnitTitle,
  isDummyOrPlaceholderUrl,
  CORE_AREA_DEFINITIONS,
  formatConcentricHighlights,
} from '@/lib/domain/unit-differentiation';

describe('Unit Differentiation & Per-Unit Media Management', () => {
  const sampleUnits: any[] = [
    {
      id: 'unit-101',
      projectId: 'proj-1',
      unitNumber: '101',
      bhk: 1,
      carpetAreaSqft: 450,
      floorNumber: 1,
      totalFloors: 14,
      facing: 'EAST',
      possessionStatus: 'UNDER_CONSTRUCTION',
      agreementValue: 4200000,
      allInTotalCost: 4750000,
      floorPlanUrl: 'https://cloudinary.com/proj/floorplans/1bhk_450_unit101.jpg',
      photoGalleryJson: JSON.stringify([
        'https://cloudinary.com/proj/units/101_living.jpg',
        'https://cloudinary.com/proj/units/101_bedroom.jpg',
      ]),
    },
    {
      id: 'unit-102',
      projectId: 'proj-1',
      unitNumber: '102',
      bhk: 2,
      carpetAreaSqft: 685,
      floorNumber: 1,
      totalFloors: 14,
      facing: 'NORTH_EAST',
      possessionStatus: 'READY_TO_MOVE',
      agreementValue: 7200000,
      allInTotalCost: 7920000,
      floorPlanUrl: 'https://cloudinary.com/proj/floorplans/2bhk_685_unit102.jpg',
      photoGalleryJson: JSON.stringify([
        'https://cloudinary.com/proj/units/102_balcony.jpg',
      ]),
    },
    {
      id: 'unit-201',
      projectId: 'proj-1',
      unitNumber: '201',
      bhk: 2,
      carpetAreaSqft: 720,
      floorNumber: 2,
      totalFloors: 14,
      facing: 'WEST',
      possessionStatus: 'UNDER_CONSTRUCTION',
      agreementValue: 7600000,
      allInTotalCost: 8350000,
      floorPlanUrl: null,
      photoGalleryJson: '[]',
    },
  ];

  it('groups units into differentiable configurations based on BHK and carpet area', () => {
    const grouped = groupUnitsByConfiguration(sampleUnits);

    expect(grouped).toHaveLength(3);
    const bhk1 = grouped.find((g) => g.bhk === 1);
    expect(bhk1).toBeDefined();
    expect(bhk1?.carpetAreaSqft).toBe(450);
    expect(bhk1?.units).toHaveLength(1);
    expect(bhk1?.units[0].unitNumber).toBe('101');

    const bhk2_685 = grouped.find((g) => g.bhk === 2 && g.carpetAreaSqft === 685);
    expect(bhk2_685).toBeDefined();
    expect(bhk2_685?.units[0].unitNumber).toBe('102');

    const bhk2_720 = grouped.find((g) => g.bhk === 2 && g.carpetAreaSqft === 720);
    expect(bhk2_720).toBeDefined();
    expect(bhk2_720?.units[0].unitNumber).toBe('201');
  });

  it('isolates unit-specific media without cross-unit leakage or dummy placeholders', () => {
    const unit101Media = resolveUnitMediaAssets(sampleUnits[0]);
    expect(unit101Media.floorPlanUrl).toBe('https://cloudinary.com/proj/floorplans/1bhk_450_unit101.jpg');
    expect(unit101Media.photos).toHaveLength(2);
    expect(unit101Media.photos).toContain('https://cloudinary.com/proj/units/101_living.jpg');

    const unit102Media = resolveUnitMediaAssets(sampleUnits[1]);
    expect(unit102Media.floorPlanUrl).toBe('https://cloudinary.com/proj/floorplans/2bhk_685_unit102.jpg');
    expect(unit102Media.photos).toHaveLength(1);
    expect(unit102Media.photos[0]).toBe('https://cloudinary.com/proj/units/102_balcony.jpg');

    // Unit 201 has no uploaded media; it must NOT inherit unit 101 or 102 media, nor dummy unsplash images
    const unit201Media = resolveUnitMediaAssets(sampleUnits[2]);
    expect(unit201Media.floorPlanUrl).toBeNull();
    expect(unit201Media.photos).toHaveLength(0);
  });

  it('correctly detects and flags generic Unsplash dummy/placeholder URLs', () => {
    expect(isDummyOrPlaceholderUrl('https://images.unsplash.com/photo-1600585154340-be6161a56a0c')).toBe(true);
    expect(isDummyOrPlaceholderUrl('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00')).toBe(true);
    expect(isDummyOrPlaceholderUrl('https://res.cloudinary.com/zamzam/image/upload/v1/unit_101.jpg')).toBe(false);
    expect(isDummyOrPlaceholderUrl(null)).toBe(false);
  });

  it('calculates exact RERA carpet, built-up, and super built-up area matrix', () => {
    const matrix = calculateUnitAreaMatrix(685);
    expect(matrix.carpetAreaSqft).toBe(685);
    expect(matrix.builtUpSqft).toBe(Math.round(685 * 1.15)); // 788
    expect(matrix.superBuiltUpSqft).toBe(Math.round(685 * 1.40)); // 959
    expect(matrix.loadingPercentage).toBe(40);
  });

  it('generates rich, differentiable titles for units', () => {
    expect(differentiateUnitTitle(sampleUnits[0])).toBe('Unit 101 • 1 BHK (450 sq.ft.)');
    expect(differentiateUnitTitle(sampleUnits[1])).toBe('Unit 102 • 2 BHK (685 sq.ft.)');
    expect(differentiateUnitTitle({ bhk: 3, carpetAreaSqft: 1050 })).toBe('3 BHK (1050 sq.ft.)');
  });

  it('preserves 1RK typology and prefix in deduplicateUnitsByConfiguration', async () => {
    const { deduplicateUnitsByConfiguration } = await import('@/lib/services/unit-deduplication');
    const raw = [
      {
        unitNumber: '1RK-B (182 sqft)',
        bhk: 1,
        carpetAreaSqft: 182,
        facing: 'WEST',
      },
      {
        unitNumber: '1BHK-A (162 sqft)',
        bhk: 1,
        carpetAreaSqft: 162,
        facing: 'EAST',
      },
    ];

    const deduplicated = deduplicateUnitsByConfiguration(raw, {
      totalFloors: 7,
      basePricePerSqft: 6000,
    });

    expect(deduplicated).toHaveLength(2);
    const rkUnit = deduplicated.find((u) => u.carpetAreaSqft === 182);
    expect(rkUnit).toBeDefined();
    expect(rkUnit?.unitNumber).toContain('1RK-');
    expect(rkUnit?.typology).toBe('1RK');
    expect(rkUnit?.bhkLabel).toContain('1 RK');

    const bhkUnit = deduplicated.find((u) => u.carpetAreaSqft === 162);
    expect(bhkUnit).toBeDefined();
    expect(bhkUnit?.unitNumber).toContain('1BHK-');
    expect(bhkUnit?.typology).toBe('1BHK');
    expect(bhkUnit?.bhkLabel).toContain('1 BHK');
  });

  it('supports custom saleable area and custom builder loading percentage', () => {
    // Default 40% loading
    const defaultMatrix = calculateUnitAreaMatrix(500);
    expect(defaultMatrix.carpetAreaSqft).toBe(500);
    expect(defaultMatrix.builtUpSqft).toBe(575); // 500 * 1.15
    expect(defaultMatrix.superBuiltUpSqft).toBe(700); // 500 * 1.40
    expect(defaultMatrix.loadingPercentage).toBe(40);

    // Custom loading percentage (35%)
    const customLoadingMatrix = calculateUnitAreaMatrix(500, 35);
    expect(customLoadingMatrix.superBuiltUpSqft).toBe(675); // 500 * 1.35
    expect(customLoadingMatrix.loadingPercentage).toBe(35);

    // Direct custom saleable area (e.g. 750 sqft -> 50% loading)
    const customSaleableMatrix = calculateUnitAreaMatrix(500, 40, 750);
    expect(customSaleableMatrix.superBuiltUpSqft).toBe(750);
    expect(customSaleableMatrix.loadingPercentage).toBe(50);
  });

  it('parses custom saleable area and loading percentage from featureHighlightsJson', async () => {
    const { parseInventoryContent } = await import('@/lib/inventory-media');
    const unitRecord: any = {
      id: 'unit-custom-saleable',
      carpetAreaSqft: 400,
      featureHighlightsJson: JSON.stringify([
        '400 sq.ft Usable RERA Carpet',
        '600 sq.ft Saleable Area (50% Loading)',
        '1 Covered Stilt Parking',
      ]),
    };

    const parsed = parseInventoryContent(unitRecord);
    expect(parsed.saleableAreaSqft).toBe(600);
    expect(parsed.loadingPercentage).toBe(50);
  });

  it('validates statutory Core Area Definitions matching RERA standards', () => {
    expect(CORE_AREA_DEFINITIONS).toHaveLength(4);
    const [carpetDef, reraDef, builtUpDef, superDef] = CORE_AREA_DEFINITIONS;

    // Layer 1: Carpet Area
    expect(carpetDef.id).toBe('carpet');
    expect(carpetDef.name).toBe('Carpet Area');
    expect(carpetDef.included).toContain('Bedrooms');
    expect(carpetDef.included).toContain('Bathrooms');
    expect(carpetDef.excluded).toContain('External walls');
    expect(carpetDef.excluded).toContain('Balconies');

    // Layer 2: RERA Carpet Area (Optional / Non-Compulsory)
    expect(reraDef.id).toBe('rera');
    expect(reraDef.name).toBe('RERA Carpet Area');
    expect(reraDef.badge).toContain('Optional (Not Compulsory)');
    expect(reraDef.included).toContain('Thickness of internal partition walls');
    expect(reraDef.excluded).toContain('External walls');
    expect(reraDef.excluded).toContain('Balconies');

    // Layer 3: Built-Up Area
    expect(builtUpDef.id).toBe('builtup');
    expect(builtUpDef.name).toBe('Built-Up Area');
    expect(builtUpDef.included).toContain('Carpet Area');
    expect(builtUpDef.included).toContain('Thickness of outer walls');
    expect(builtUpDef.included).toContain('Private balconies/terraces');
    expect(builtUpDef.excluded).toContain('Common corridors');

    // Layer 4: Super Built-Up Area
    expect(superDef.id).toBe('superbuiltup');
    expect(superDef.name).toBe('Super Built-Up Area');
    expect(superDef.included).toContain('Built-up area');
    expect(superDef.included).toContain('Lobbies');
    expect(superDef.included).toContain('Lifts');
    expect(superDef.included).toContain('Clubhouse');
    expect(superDef.excluded).toContain('Open play areas');
  });

  it('computes progressive concentric layers and mathematical formulas correctly', () => {
    // Unit with 650 sqft Carpet, 35% loading
    const matrix = calculateUnitAreaMatrix(650, 35);

    // Progressive scaling assertions
    expect(matrix.carpetAreaSqft).toBe(650);
    // Layer 1: Traditional Carpet + Internal Walls = Carpet
    expect(matrix.traditionalCarpetSqft + matrix.internalWallsSqft).toBe(matrix.carpetAreaSqft);
    expect(matrix.traditionalCarpetSqft).toBeGreaterThan(0);
    expect(matrix.internalWallsSqft).toBeGreaterThan(0);

    // Layer 3: Built-Up = Carpet + External Walls + Balconies
    expect(matrix.builtUpSqft).toBe(matrix.carpetAreaSqft + matrix.externalWallsSqft + matrix.balconyTerraceSqft);
    expect(matrix.builtUpSqft).toBe(Math.round(650 * 1.15));

    // Layer 4: Super Built-Up = Built-Up + Proportionate Common Area
    expect(matrix.superBuiltUpSqft).toBe(matrix.builtUpSqft + matrix.proportionateCommonSqft);
    // Super Built-Up = Carpet * (1 + Loading Factor)
    expect(matrix.superBuiltUpSqft).toBe(Math.round(650 * 1.35));
    expect(matrix.loadingPercentage).toBe(35);
  });

  it('supports precise custom concentric overrides and back-solves formulas', () => {
    // Custom architectural blueprint:
    // Carpet: 625 sqft, Optional RERA: 640 sqft
    // External Walls: 40 sqft, Balcony: 55 sqft -> Built-Up: 720 sqft
    // Super Built-Up: 900 sqft (44% loading, Common: 180 sqft)
    const matrix = calculateUnitAreaMatrix(625, 40, 900, {
      traditionalCarpetSqft: 600,
      reraCarpetAreaSqft: 640,
      internalWallsSqft: 25,
      externalWallsSqft: 40,
      balconyTerraceSqft: 55,
      builtUpSqft: 720,
      proportionateCommonSqft: 180,
    });

    expect(matrix.carpetAreaSqft).toBe(625);
    expect(matrix.reraCarpetAreaSqft).toBe(640);
    expect(matrix.traditionalCarpetSqft).toBe(600);
    expect(matrix.internalWallsSqft).toBe(25);
    expect(matrix.externalWallsSqft).toBe(40);
    expect(matrix.balconyTerraceSqft).toBe(55);
    expect(matrix.builtUpSqft).toBe(720);
    expect(matrix.superBuiltUpSqft).toBe(900);
    expect(matrix.proportionateCommonSqft).toBe(180);
    expect(matrix.loadingPercentage).toBe(44); // (900 - 625) / 625 = 44%
  });

  it('formats and parses full concentric matrix for persistence via featureHighlightsJson', async () => {
    const { parseInventoryContent } = await import('@/lib/inventory-media');

    const matrix = calculateUnitAreaMatrix(700, 30, undefined, {
      traditionalCarpetSqft: 675,
      reraCarpetAreaSqft: 695,
      internalWallsSqft: 25,
      externalWallsSqft: 45,
      balconyTerraceSqft: 60,
      builtUpSqft: 805,
    });

    const highlights = formatConcentricHighlights(matrix, ['Sea View Facing', 'Vastu Compliant']);
    expect(highlights).toContain('700 sq.ft Carpet Area');
    expect(highlights).toContain('695 sq.ft RERA Carpet Area (Optional)');
    expect(highlights).toContain('805 sq.ft Built-Up Area');
    expect(highlights).toContain('910 sq.ft Super Built-Up Area (Saleable)');
    expect(highlights).toContain('Sea View Facing');
    expect(highlights).toContain('Vastu Compliant');

    const unitRecord: any = {
      id: 'unit-concentric-persisted',
      carpetAreaSqft: 700,
      featureHighlightsJson: JSON.stringify(highlights),
    };

    const parsed = parseInventoryContent(unitRecord);
    expect(parsed.traditionalCarpetSqft).toBe(675);
    expect(parsed.reraCarpetAreaSqft).toBe(695);
    expect(parsed.internalWallsSqft).toBe(25);
    expect(parsed.builtUpSqft).toBe(805);
    expect(parsed.balconyTerraceSqft).toBe(60);
    expect(parsed.externalWallsSqft).toBe(45);
    expect(parsed.saleableAreaSqft).toBe(Math.round(700 * 1.30));
    expect(parsed.loadingPercentage).toBe(30);
    expect(parsed.displayHighlights).toContain('Sea View Facing');
    expect(parsed.displayHighlights).toContain('Vastu Compliant');
    expect(parsed.displayHighlights.some((h: string) => h.startsWith('CONCENTRIC_MATRIX:'))).toBe(false);
  });
});

