import { describe, it, expect } from 'bun:test';
import {
  groupUnitsByConfiguration,
  resolveUnitMediaAssets,
  calculateUnitAreaMatrix,
  differentiateUnitTitle,
  isDummyOrPlaceholderUrl,
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
});
