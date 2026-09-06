import { describe, it, expect } from 'bun:test';
import {
  evaluatePropertyMatch,
  rankMatchingProperties,
  type BuyerRequirementInput,
  type PropertyUnitForMatching,
} from '@/lib/domain/matching-engine';

function createMockProperty(overrides: Partial<PropertyUnitForMatching> = {}): PropertyUnitForMatching {
  return {
    id: 'unit-test-1',
    unitNumber: '1402',
    bhk: 2,
    carpetAreaSqft: 680,
    floorNumber: 14,
    totalFloors: 25,
    agreementValue: 7500000,
    allInTotalCost: 8200000,
    verificationStatus: 'VERIFIED_RECENT',
    lastVerifiedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago (fresh)
    possessionStatus: 'READY_TO_MOVE',
    possessionDate: null,
    isHotDeal: true,
    isExclusive: true,
    project: {
      id: 'proj-1',
      projectName: 'Highland Park',
      developerName: 'Godrej Properties',
      reraNumber: 'P52000028714',
      microMarket: 'Kharghar Sector 35',
      distanceToMetroKm: 0.4,
      hasOccupancyCertificate: true,
    },
    ...overrides,
  };
}

describe('Domain: Multi-Factor AI Matching Engine', () => {
  const baseRequirement: BuyerRequirementInput = {
    budgetMin: 7000000,
    budgetMax: 8500000,
    bhkPreferences: [2],
    targetLocations: ['Kharghar Sector 35'],
    possessionPreference: 'READY_TO_MOVE',
    minCarpetSqft: 650,
  };

  describe('Hard Disqualifiers (Score = 0% and Tier = DISQUALIFIED)', () => {
    it('disqualifies listing when stale/unverified for >14 days', () => {
      const staleProp = createMockProperty({
        verificationStatus: 'UNVERIFIED',
        lastVerifiedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      });

      const result = evaluatePropertyMatch(baseRequirement, staleProp);
      expect(result.tier).toBe('DISQUALIFIED');
      expect(result.totalScore).toBe(0);
      expect(result.disqualificationReason).toContain('Listing unverified for >14 days');
    });

    it('disqualifies listing when all-in cost exceeds max budget by >5% ceiling', () => {
      const overBudgetProp = createMockProperty({
        allInTotalCost: 8500000 * 1.06, // 6% over budgetMax
      });

      const result = evaluatePropertyMatch(baseRequirement, overBudgetProp);
      expect(result.tier).toBe('DISQUALIFIED');
      expect(result.totalScore).toBe(0);
      expect(result.disqualificationReason).toContain('exceeds buyer max budget ceiling');
    });

    it('disqualifies listing when BHK is not in accepted preferences', () => {
      const wrongBhkProp = createMockProperty({
        bhk: 3,
      });

      const result = evaluatePropertyMatch(baseRequirement, wrongBhkProp);
      expect(result.tier).toBe('DISQUALIFIED');
      expect(result.totalScore).toBe(0);
      expect(result.disqualificationReason).toContain('Unit is 3 BHK, but buyer strictly requested 2 BHK');
    });

    it('disqualifies when buyer requires READY_TO_MOVE but project has no OC', () => {
      const noOcProp = createMockProperty({
        project: {
          ...createMockProperty().project,
          hasOccupancyCertificate: false,
        },
      });

      const result = evaluatePropertyMatch(
        { ...baseRequirement, possessionPreference: 'READY_TO_MOVE' },
        noOcProp
      );
      expect(result.tier).toBe('DISQUALIFIED');
      expect(result.totalScore).toBe(0);
      expect(result.disqualificationReason).toContain('Buyer requires Ready-to-Move with OC');
    });
  });

  describe('Weighted Scoring & Tier Stratification', () => {
    it('evaluates PRIME_MATCH (>=88%) for ideal high-floor property near metro within budget', () => {
      const idealProp = createMockProperty({
        allInTotalCost: 8200000,
        carpetAreaSqft: 750,
        floorNumber: 18,
        isHotDeal: true,
        project: {
          ...createMockProperty().project,
          distanceToMetroKm: 0.3,
          hasOccupancyCertificate: true,
        },
      });

      const result = evaluatePropertyMatch(baseRequirement, idealProp);
      expect(result.tier).toBe('PRIME_MATCH');
      expect(result.totalScore).toBeGreaterThanOrEqual(88);
      expect(result.matchingHighlights.length).toBeGreaterThan(0);
      expect(result.matchingHighlights.some((h) => h.includes('under max budget'))).toBe(true);
      expect(result.matchingHighlights.some((h) => h.includes('Prime Metro TOD'))).toBe(true);
      expect(result.matchingHighlights.some((h) => h.includes('High Floor'))).toBe(true);
    });

    it('evaluates STRONG_ALTERNATIVE (>=74% and <88%) for moderate match with trade-offs', () => {
      const altProp = createMockProperty({
        allInTotalCost: 8800000, // stretch within 5%
        carpetAreaSqft: 520, // 520 / 650 = 0.80
        floorNumber: 4,
        isHotDeal: false,
        project: {
          ...createMockProperty().project,
          distanceToMetroKm: 2.5, // 1.0 - 2.5 * 0.15 = 0.625
          hasOccupancyCertificate: true,
        },
      });

      const result = evaluatePropertyMatch(baseRequirement, altProp);
      expect(result.tier).toBe('STRONG_ALTERNATIVE');
      expect(result.totalScore).toBeGreaterThanOrEqual(74);
      expect(result.totalScore).toBeLessThan(88);
      expect(result.tradeOffs.length).toBeGreaterThan(0);
    });

    it('evaluates COMPROMISE (<74%) for properties with multiple compounding trade-offs', () => {
      const compromiseProp = createMockProperty({
        allInTotalCost: 8900000, // stretch
        carpetAreaSqft: 350, // very compact -> 0.538
        floorNumber: 2,
        isHotDeal: false,
        project: {
          ...createMockProperty().project,
          distanceToMetroKm: 4.5, // far from metro -> 0.325
          hasOccupancyCertificate: false,
        },
      });

      const result = evaluatePropertyMatch(
        { ...baseRequirement, possessionPreference: 'ANY' },
        compromiseProp
      );
      expect(result.tier).toBe('COMPROMISE');
      expect(result.totalScore).toBeLessThan(74);
      expect(result.tradeOffs.some((t) => t.includes('km from nearest Metro station'))).toBe(true);
      expect(result.tradeOffs.some((t) => t.includes('Compact'))).toBe(true);
    });

    it('handles UNDER_CONSTRUCTION and ANY possession preferences correctly', () => {
      const ucProp = createMockProperty({
        project: {
          ...createMockProperty().project,
          hasOccupancyCertificate: false,
        },
      });

      const reqUc: BuyerRequirementInput = {
        ...baseRequirement,
        possessionPreference: 'UNDER_CONSTRUCTION',
      };

      const result = evaluatePropertyMatch(reqUc, ucProp);
      expect(result.tier).not.toBe('DISQUALIFIED');
      expect(result.possessionScore).toBe(0.9);
      expect(result.matchingHighlights.some((h) => h.includes('Stage-linked payment flexibility'))).toBe(true);
    });

    it('uses fallback carpet thresholds for 1BHK, 2BHK, 3BHK when minCarpetSqft is not specified', () => {
      const reqNoCarpet: BuyerRequirementInput = {
        budgetMax: 10000000,
        bhkPreferences: [1, 2, 3],
      };

      const prop1Bhk = createMockProperty({ bhk: 1, carpetAreaSqft: 450 });
      const result1 = evaluatePropertyMatch(reqNoCarpet, prop1Bhk);
      expect(result1.carpetScore).toBe(1.0); // 450 / 400 > 1.0

      const prop3Bhk = createMockProperty({ bhk: 3, carpetAreaSqft: 750 });
      const result3 = evaluatePropertyMatch(reqNoCarpet, prop3Bhk);
      expect(result3.carpetScore).toBeLessThan(1.0); // 750 / 850 < 1.0
    });
  });

  describe('rankMatchingProperties', () => {
    it('sorts eligible properties by totalScore descending and omits disqualified properties', () => {
      const prime = createMockProperty({
        id: 'prime-1',
        allInTotalCost: 8000000,
        carpetAreaSqft: 750,
        floorNumber: 15,
        isHotDeal: true,
      });

      const alternative = createMockProperty({
        id: 'alt-1',
        allInTotalCost: 8600000,
        carpetAreaSqft: 650,
        floorNumber: 4,
        isHotDeal: false,
        project: {
          ...createMockProperty().project,
          distanceToMetroKm: 0.8,
        },
      });

      const disqualified = createMockProperty({
        id: 'disq-1',
        bhk: 4, // BHK mismatch
      });

      const ranked = rankMatchingProperties(baseRequirement, [alternative, disqualified, prime]);
      expect(ranked.length).toBe(2);
      expect(ranked[0].unit.id).toBe('prime-1');
      expect(ranked[1].unit.id).toBe('alt-1');
      expect(ranked[0].score.totalScore).toBeGreaterThan(ranked[1].score.totalScore);
    });
  });
});
