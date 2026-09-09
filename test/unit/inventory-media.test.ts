import { describe, it, expect } from 'bun:test';
import {
  normalizeFloorPlanAsset,
  normalizeElevationAsset,
  normalizeMediaGallery,
  resolveAssetUrl,
  parseInventoryContent,
} from '@/lib/inventory-media';

describe('Inventory Media Shape Normalization (Candidate #4)', () => {
  describe('normalizeFloorPlanAsset', () => {
    it('normalizes legacy snake_case carpet_area_sqft and page_number into canonical properties', () => {
      const legacyPayload = {
        url: 'https://res.cloudinary.com/demo/image/upload/v1/fp1.jpg',
        bhk: 2,
        carpet_area_sqft: 750,
        page_number: 4,
        title: '2 BHK Luxury Plan',
      };

      const normalized = normalizeFloorPlanAsset(legacyPayload);
      expect(normalized.carpetAreaSqft).toBe(750);
      expect(normalized.carpet_area_sqft).toBe(750); // Preserved for backwards compatibility
      expect(normalized.pageNumber).toBe(4);
      expect(normalized.page_number).toBe(4);
      expect(normalized.url).toBe('https://res.cloudinary.com/demo/image/upload/v1/fp1.jpg');
    });

    it('prefers canonical camelCase carpetAreaSqft when both are present', () => {
      const mixedPayload = {
        url: 'https://res.cloudinary.com/demo/image/upload/v1/fp2.jpg',
        carpetAreaSqft: 980,
        carpet_area_sqft: 950,
      };

      const normalized = normalizeFloorPlanAsset(mixedPayload);
      expect(normalized.carpetAreaSqft).toBe(980);
      expect(normalized.carpet_area_sqft).toBe(980);
    });
  });

  describe('normalizeElevationAsset', () => {
    it('normalizes legacy page_number to pageNumber', () => {
      const legacyElevation = {
        url: 'https://res.cloudinary.com/demo/image/upload/v1/elev1.jpg',
        viewAngle: 'FRONT_FACADE',
        page_number: 1,
      };

      const normalized = normalizeElevationAsset(legacyElevation);
      expect(normalized.pageNumber).toBe(1);
      expect(normalized.page_number).toBe(1);
    });
  });

  describe('parseInventoryContent', () => {
    it('gracefully deserializes raw JSON fields and normalizes image collections', () => {
      const mockProject = {
        id: 'proj-test-1',
        name: 'Test Tower',
        floorPlanImagesJson: JSON.stringify([
          { url: 'https://cdn.example.com/fp1.jpg', carpet_area_sqft: 820, page_number: 6 },
        ]),
        elevationImagesJson: JSON.stringify([
          { url: 'https://cdn.example.com/elev.jpg', viewAngle: 'PODIUM_VIEW', page_number: 2 },
        ]),
      };

      const result = parseInventoryContent(mockProject);
      expect(result.floorPlanImages).toHaveLength(1);
      expect(result.floorPlanImages[0].carpetAreaSqft).toBe(820);
      expect(result.floorPlanImages[0].pageNumber).toBe(6);

      expect(result.elevationImages).toHaveLength(1);
      expect(result.elevationImages[0].pageNumber).toBe(2);
    });
  });
});
