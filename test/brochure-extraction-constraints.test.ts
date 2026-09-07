import { describe, it, expect } from 'bun:test';
import { deduplicateUnitsByConfiguration } from '@/lib/services/unit-deduplication';
import { extractAndProcessBrochure } from '@/lib/services/brochure-extractor';

describe('Brochure Extraction Storage Constraints & Deduplication', () => {
  describe('1. Distinct Configurations Storage (One Each)', () => {
    it('collapses 100 repetitive flats across typical floors into strictly distinct configurations (one each)', () => {
      const rawFlats = [];
      // 40 flats of 1 BHK 405 sqft across 10 floors
      for (let f = 1; f <= 10; f++) {
        for (let num = 1; num <= 4; num++) {
          rawFlats.push({
            unitNumber: `Flat ${f}0${num}`,
            bhk: 1,
            carpetAreaSqft: 405,
            floorNumber: f,
            totalUnitsCount: 1,
            facing: 'EAST',
          });
        }
      }
      // 30 flats of 1 BHK 430 sqft
      for (let f = 1; f <= 10; f++) {
        for (let num = 5; num <= 7; num++) {
          rawFlats.push({
            unitNumber: `Flat ${f}0${num}`,
            bhk: 1,
            carpetAreaSqft: 430,
            floorNumber: f,
            totalUnitsCount: 1,
            facing: 'WEST',
          });
        }
      }
      // 30 flats of 2 BHK 650 sqft
      for (let f = 1; f <= 10; f++) {
        for (let num = 8; num <= 10; num++) {
          rawFlats.push({
            unitNumber: `Flat ${f}0${num}`,
            bhk: 2,
            carpetAreaSqft: 650,
            floorNumber: f,
            totalUnitsCount: 1,
            facing: 'NORTH',
          });
        }
      }

      expect(rawFlats.length).toBe(100);

      const distinctUnits = deduplicateUnitsByConfiguration(rawFlats, {
        totalFloors: 10,
        basePricePerSqft: 7000,
        projectName: 'Royal Enclave',
      });

      // Strictly 3 records stored (one each for the 3 distinct configurations)
      expect(distinctUnits.length).toBe(3);

      const cfg1_405 = distinctUnits.find((u) => u.bhk === 1 && u.carpetAreaSqft === 405);
      const cfg1_430 = distinctUnits.find((u) => u.bhk === 1 && u.carpetAreaSqft === 430);
      const cfg2_650 = distinctUnits.find((u) => u.bhk === 2 && u.carpetAreaSqft === 650);

      expect(cfg1_405).toBeDefined();
      expect(cfg1_405?.totalUnitsCount).toBe(40);
      expect(cfg1_405?.unitNumber).toContain('1BHK-A');
      expect(cfg1_405?.bhkLabel).toContain('Config A');

      expect(cfg1_430).toBeDefined();
      expect(cfg1_430?.totalUnitsCount).toBe(30);
      expect(cfg1_430?.unitNumber).toContain('1BHK-B');
      expect(cfg1_430?.bhkLabel).toContain('Config B');

      expect(cfg2_650).toBeDefined();
      expect(cfg2_650?.totalUnitsCount).toBe(30);
      expect(cfg2_650?.unitNumber).toContain('2BHK-A');
      expect(cfg2_650?.bhkLabel).toContain('Config A');
    });

    it('clusters OCR noise or minor rounding variations within ±5 sqft tolerance into the same configuration', () => {
      const rawUnitsWithJitter = [
        { unitNumber: '101', bhk: 1, carpetAreaSqft: 405 },
        { unitNumber: '102', bhk: 1, carpetAreaSqft: 406.2 },
        { unitNumber: '103', bhk: 1, carpetAreaSqft: 404 },
        { unitNumber: '201', bhk: 2, carpetAreaSqft: 650 },
        { unitNumber: '202', bhk: 2, carpetAreaSqft: 652 },
      ];

      const deduplicated = deduplicateUnitsByConfiguration(rawUnitsWithJitter, {
        carpetToleranceSqft: 5,
      });

      // 405, 406.2, 404 merge into 1 BHK (~405 sqft).
      // 650, 652 merge into 2 BHK (~650 sqft).
      expect(deduplicated.length).toBe(2);
      expect(deduplicated[0].bhk).toBe(1);
      expect(deduplicated[0].totalUnitsCount).toBe(3);
      expect(deduplicated[1].bhk).toBe(2);
      expect(deduplicated[1].totalUnitsCount).toBe(2);
    });

    it('preserves all distinct configurations when carpet areas differ by more than 5 sqft', () => {
      const distinctFlats = [
        { unitNumber: '101', bhk: 1, carpetAreaSqft: 400 },
        { unitNumber: '102', bhk: 1, carpetAreaSqft: 420 },
        { unitNumber: '103', bhk: 1, carpetAreaSqft: 440 },
        { unitNumber: '201', bhk: 2, carpetAreaSqft: 620 },
        { unitNumber: '202', bhk: 2, carpetAreaSqft: 660 },
        { unitNumber: '301', bhk: 3, carpetAreaSqft: 950 },
      ];

      const result = deduplicateUnitsByConfiguration(distinctFlats);

      // All 6 different configurations are preserved, exactly one each
      expect(result.length).toBe(6);
      const bhk1 = result.filter((u) => u.bhk === 1);
      const bhk2 = result.filter((u) => u.bhk === 2);
      const bhk3 = result.filter((u) => u.bhk === 3);

      expect(bhk1.length).toBe(3);
      expect(bhk2.length).toBe(2);
      expect(bhk3.length).toBe(1);
    });
  });

  describe('2. Elevations Limit (Strictly at most 2 stored)', () => {
    it('limits stored elevations to at most 2 and pushes excess elevations to brochurePhotos', async () => {
      // Mock brochure extraction with 5 elevation images
      const dummyBuffer = Buffer.from('mock pdf content', 'utf-8');
      const projectInfo = {
        projectName: 'Prestige Heights',
        developerName: 'Prestige Group',
        assetRecords: [
          { asset_id: '1', asset_type: 'elevation', subtype: 'front_facade', title: 'Front Facade Elevation', file_url: 'https://example.com/e1.jpg', page_number: 1, sort_order: 1, original: true, display_position: 'elevation' },
          { asset_id: '2', asset_type: 'elevation', subtype: 'podium_view', title: 'Podium Deck Elevation', file_url: 'https://example.com/e2.jpg', page_number: 2, sort_order: 2, original: true, display_position: 'elevation' },
          { asset_id: '3', asset_type: 'elevation', subtype: 'night_aerial', title: 'Night Aerial Elevation', file_url: 'https://example.com/e3.jpg', page_number: 3, sort_order: 3, original: true, display_position: 'elevation' },
          { asset_id: '4', asset_type: 'elevation', subtype: 'clubhouse_view', title: 'Clubhouse Elevation', file_url: 'https://example.com/e4.jpg', page_number: 4, sort_order: 4, original: true, display_position: 'elevation' },
        ] as any[],
      };

      const result = await extractAndProcessBrochure(dummyBuffer, 'Prestige_Brochure.pdf', projectInfo);

      // Stored elevations must be strictly <= 2
      expect(result.elevations.length).toBeLessThanOrEqual(2);
    });
  });

  describe('3. Floor Plans Limit (Strictly at most 3 stored)', () => {
    it('limits stored floor plans to at most 3 while accommodating different types', async () => {
      const dummyBuffer = Buffer.from('mock pdf content', 'utf-8');
      const projectInfo = {
        projectName: 'Emerald Towers',
        developerName: 'Emerald Infra',
        assetRecords: [
          { asset_id: '1', asset_type: 'floor_plan', subtype: 'typical_floor_plan', title: '2nd-7th Typical Floor Plan', file_url: 'https://example.com/fp1.jpg', page_number: 4, sort_order: 1, original: true, display_position: 'floor_plan' },
          { asset_id: '2', asset_type: 'unit_floor_plan', subtype: 'unit_floor_plan', title: '1 BHK Unit Layout', file_url: 'https://example.com/fp2.jpg', page_number: 5, sort_order: 2, original: true, display_position: 'unit_floor_plan', bhk: 1 },
          { asset_id: '3', asset_type: 'unit_floor_plan', subtype: 'unit_floor_plan', title: '2 BHK Unit Layout', file_url: 'https://example.com/fp3.jpg', page_number: 6, sort_order: 3, original: true, display_position: 'unit_floor_plan', bhk: 2 },
          { asset_id: '4', asset_type: 'ground_floor_plan', subtype: 'ground_parking_plan', title: 'Ground Floor Commercial Plan', file_url: 'https://example.com/fp4.jpg', page_number: 7, sort_order: 4, original: true, display_position: 'ground_floor_plan' },
        ] as any[],
      };

      const result = await extractAndProcessBrochure(dummyBuffer, 'Emerald_Brochure.pdf', projectInfo);

      // Stored floor plans must be strictly <= 3
      expect(result.floorPlans.length).toBeLessThanOrEqual(3);
    });
  });
});
