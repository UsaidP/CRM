import { describe, it, expect } from 'bun:test';
import {
  parseJsonArray,
  parseBhkPreferences,
  parsePreferredBhk,
  parseTargetLocations,
  parsePreferredMicroMarket,
  resolveBuyerPreference,
} from '@/lib/domain/buyer-preference';

/**
 * Regression guard for buyer-preference decoding.
 *
 * The console read `requirements[0].maxBudget` and
 * `requirements[0].preferredMicroMarket`. Neither exists on BuyerRequirement —
 * the real columns are `budgetMax` and `targetLocationsJson` — and /api/v1/leads
 * returns raw requirement rows without the flattened `budgetCeiling` /
 * `preferredBhk` / `preferredMicroMarket` aliases. Every path therefore resolved
 * to undefined, so real buyers showed hardcoded defaults.
 *
 * Shapes below are copied from live BuyerRequirement rows:
 *   { budgetMax: 12000000, bhkPreferencesJson: "[2,3]", targetLocationsJson: "[\"Bandra West\"]" }
 *   { budgetMax: 7500000,  bhkPreferencesJson: "[2]",   targetLocationsJson: "[\"Taloja Phase 1\",\"Taloja Phase 2\"]" }
 *   { budgetMax: 5000000,  bhkPreferencesJson: "[0]",   targetLocationsJson: "[\"Taloja Phase 1\",\"Taloja Phase 2\"]" }
 */

describe('parseJsonArray', () => {
  it('parses a JSON array column', () => {
    expect(parseJsonArray('[2,3]')).toEqual([2, 3]);
  });

  it('returns [] for null/undefined/empty', () => {
    expect(parseJsonArray(null)).toEqual([]);
    expect(parseJsonArray(undefined)).toEqual([]);
    expect(parseJsonArray('')).toEqual([]);
  });

  it('does not throw on malformed JSON', () => {
    expect(parseJsonArray('{not json')).toEqual([]);
    expect(parseJsonArray('[2,')).toEqual([]);
  });

  it('returns [] for a non-array JSON scalar', () => {
    expect(parseJsonArray('42')).toEqual([]);
    expect(parseJsonArray('"text"')).toEqual([]);
  });
});

describe('parseBhkPreferences', () => {
  it('returns all numeric BHK preferences', () => {
    expect(parseBhkPreferences('[2,3]')).toEqual([2, 3]);
    expect(parseBhkPreferences('[2]')).toEqual([2]);
  });

  it('drops non-positive entries ("0 BHK" is not a real configuration)', () => {
    expect(parseBhkPreferences('[0]')).toEqual([]);
  });

  it('drops non-numeric entries', () => {
    expect(parseBhkPreferences('["2a",2]')).toEqual([2]);
  });
});

describe('parsePreferredBhk', () => {
  it('takes the first preference', () => {
    expect(parsePreferredBhk('[2,3]')).toBe(2);
    expect(parsePreferredBhk('[2]')).toBe(2);
  });

  it('returns null when there is no usable BHK', () => {
    expect(parsePreferredBhk('[0]')).toBeNull();
    expect(parsePreferredBhk(null)).toBeNull();
    expect(parsePreferredBhk('garbage')).toBeNull();
  });
});

describe('parseTargetLocations / parsePreferredMicroMarket', () => {
  it('returns all trimmed non-empty locations', () => {
    expect(parseTargetLocations('["Taloja Phase 1","Taloja Phase 2"]')).toEqual([
      'Taloja Phase 1',
      'Taloja Phase 2',
    ]);
    expect(parseTargetLocations('["  Bandra West  "]')).toEqual(['Bandra West']);
  });

  it('takes the first location as the micro-market', () => {
    expect(parsePreferredMicroMarket('["Taloja Phase 1","Taloja Phase 2"]')).toBe('Taloja Phase 1');
    expect(parsePreferredMicroMarket('["Bandra West"]')).toBe('Bandra West');
  });

  it('returns null when absent', () => {
    expect(parsePreferredMicroMarket(null)).toBeNull();
    expect(parsePreferredMicroMarket('[]')).toBeNull();
  });
});

describe('resolveBuyerPreference', () => {
  it('decodes from the real requirement columns (the /api/v1/leads path)', () => {
    const lead = {
      city: 'Navi Mumbai',
      requirements: [
        { budgetMax: 12000000, bhkPreferencesJson: '[2,3]', targetLocationsJson: '["Bandra West"]' },
      ],
    };
    expect(resolveBuyerPreference(lead)).toEqual({
      preferredBhk: 2,
      budgetCeiling: 12000000,
      preferredMicroMarket: 'Bandra West',
    });
  });

  it('picks the FIRST location from a multi-location preference', () => {
    const lead = {
      requirements: [
        {
          budgetMax: 7500000,
          bhkPreferencesJson: '[2]',
          targetLocationsJson: '["Taloja Phase 1","Taloja Phase 2"]',
        },
      ],
    };
    expect(resolveBuyerPreference(lead)).toEqual({
      preferredBhk: 2,
      budgetCeiling: 7500000,
      preferredMicroMarket: 'Taloja Phase 1',
    });
  });

  it('falls back to city when no target location is captured', () => {
    const lead = { city: 'Panvel', requirements: [{ budgetMax: 5000000, targetLocationsJson: '[]' }] };
    expect(resolveBuyerPreference(lead).preferredMicroMarket).toBe('Panvel');
  });

  it('does NOT render "0 BHK" for a [0] preference', () => {
    const lead = { requirements: [{ budgetMax: 5000000, bhkPreferencesJson: '[0]' }] };
    expect(resolveBuyerPreference(lead).preferredBhk).toBeNull();
  });

  it('prefers already-decoded aliases (the /api/v1/search path)', () => {
    const lead = {
      preferredBhk: 3,
      budgetCeiling: 20000000,
      preferredMicroMarket: 'Kharghar',
      requirements: [
        { budgetMax: 999, bhkPreferencesJson: '[2]', targetLocationsJson: '["Elsewhere"]' },
      ],
    };
    expect(resolveBuyerPreference(lead)).toEqual({
      preferredBhk: 3,
      budgetCeiling: 20000000,
      preferredMicroMarket: 'Kharghar',
    });
  });

  it('ignores inactive requirements when an active one exists', () => {
    const lead = {
      requirements: [
        {
          budgetMax: 100,
          bhkPreferencesJson: '[1]',
          targetLocationsJson: '["Old"]',
          isActive: false,
        },
        {
          budgetMax: 9000000,
          bhkPreferencesJson: '[4]',
          targetLocationsJson: '["Current"]',
          isActive: true,
        },
      ],
    };
    expect(resolveBuyerPreference(lead)).toEqual({
      preferredBhk: 4,
      budgetCeiling: 9000000,
      preferredMicroMarket: 'Current',
    });
  });

  it('returns all-nulls for a lead with no preference data', () => {
    expect(resolveBuyerPreference({})).toEqual({
      preferredBhk: null,
      budgetCeiling: null,
      preferredMicroMarket: null,
    });
  });

  it('handles null / undefined sources without throwing', () => {
    const empty = { preferredBhk: null, budgetCeiling: null, preferredMicroMarket: null };
    expect(resolveBuyerPreference(null)).toEqual(empty);
    expect(resolveBuyerPreference(undefined)).toEqual(empty);
    expect(resolveBuyerPreference({ requirements: null })).toEqual(empty);
  });

  it('survives a malformed JSON column (the old search route threw and 500d)', () => {
    const lead = {
      requirements: [{ budgetMax: 7500000, bhkPreferencesJson: '{bad', targetLocationsJson: '{bad' }],
    };
    expect(resolveBuyerPreference(lead)).toEqual({
      preferredBhk: null,
      budgetCeiling: 7500000,
      preferredMicroMarket: null,
    });
  });
});
