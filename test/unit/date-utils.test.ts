import { describe, it, expect } from 'bun:test';
import {
  formatDateShort,
  formatDateFull,
  formatDateWithWeekday,
  formatTimeShort,
  formatDateTime,
  parseSafeDate,
} from '@/lib/date-utils';

describe('Date Utils — Edge Cases', () => {
  // Construct dates with local-time constructors so tests are timezone-independent.
  const d = new Date(2026, 8, 15, 14, 5); // Sep 15 2026, 14:05 local

  describe('formatters', () => {
    it('formats short / full / weekday variants', () => {
      expect(formatDateShort(d)).toBe('15 Sep');
      expect(formatDateFull(d)).toBe('15 Sep 2026');
      expect(formatDateWithWeekday(d)).toBe('Tue, 15 Sep');
      expect(formatTimeShort(d)).toBe('02:05 PM');
    });

    it('formats midnight and noon correctly (12 AM / 12 PM, not 00)', () => {
      expect(formatTimeShort(new Date(2026, 0, 1, 0, 0))).toBe('12:00 AM');
      expect(formatTimeShort(new Date(2026, 0, 1, 12, 0))).toBe('12:00 PM');
      expect(formatTimeShort(new Date(2026, 0, 1, 23, 59))).toBe('11:59 PM');
    });

    it('zero-pads single-digit minutes and hours', () => {
      expect(formatTimeShort(new Date(2026, 0, 1, 1, 7))).toBe('01:07 AM');
      expect(formatTimeShort(new Date(2026, 0, 1, 9, 0))).toBe('09:00 AM');
    });

    it('accepts ISO strings and epoch numbers', () => {
      const local = new Date(2026, 8, 15);
      expect(formatDateFull(d.toISOString())).toBe('15 Sep 2026');
      expect(formatDateFull(local.getTime())).toBe('15 Sep 2026');
    });

    it('returns empty string for null, undefined, empty, and invalid inputs', () => {
      for (const bad of [null, undefined, '', 'not-a-date', '2026-99-99']) {
        expect(formatDateShort(bad as any)).toBe('');
        expect(formatDateFull(bad as any)).toBe('');
        expect(formatDateWithWeekday(bad as any)).toBe('');
        expect(formatTimeShort(bad as any)).toBe('');
        expect(formatDateTime(bad as any)).toBe('');
      }
      expect(formatDateTime(d)).toBe('15 Sep, 02:05 PM');
    });
  });

  describe('parseSafeDate', () => {
    it('parses ISO strings, Date objects, and epoch numbers', () => {
      // Assert on UTC components — date-only ISO strings parse as UTC midnight,
      // which can be the previous local day in UTC-negative timezones.
      const iso = parseSafeDate('2026-09-15')!;
      expect(iso.getUTCFullYear()).toBe(2026);
      expect(iso.getUTCMonth()).toBe(8);
      expect(iso.getUTCDate()).toBe(15);
      expect(parseSafeDate(d)).toEqual(d);
      expect(parseSafeDate(d.getTime())!.getTime()).toBe(d.getTime());
    });

    it('returns null for null-ish and placeholder strings', () => {
      for (const bad of [null, undefined, '', '   ', 'null', 'NULL', 'undefined', 'n/a', 'N/A']) {
        expect(parseSafeDate(bad as any)).toBeNull();
      }
    });

    it('returns null for an invalid Date instance instead of throwing', () => {
      expect(parseSafeDate(new Date('not-a-date'))).toBeNull();
    });

    it('returns null for non-string/number types without throwing', () => {
      expect(parseSafeDate({} as any)).toBeNull();
      expect(parseSafeDate([] as any)).toBeNull();
      expect(parseSafeDate(true as any)).toBeNull();
    });

    it('parses "Month YYYY" formats (long and abbreviated)', () => {
      expect(parseSafeDate('December 2026')!.getMonth()).toBe(11);
      expect(parseSafeDate('December 2026')!.getFullYear()).toBe(2026);
      expect(parseSafeDate('Dec 2026')!.getMonth()).toBe(11);
    });

    it('parses MM/YYYY and MM-YYYY formats', () => {
      const r = parseSafeDate('12/2026')!;
      expect(r.getMonth()).toBe(11);
      expect(r.getFullYear()).toBe(2026);
      expect(parseSafeDate('03-2027')!.getMonth()).toBe(2);
    });

    it('parses a bare year as start-of-year (1 Jan UTC)', () => {
      // NOTE: new Date('2026') direct-parses to Jan 1 UTC, so the dedicated
      // "bare year -> 31 Dec" branch (step 4 in parseSafeDate) is dead code
      // for plain years. This documents the actual behavior.
      const r = parseSafeDate('2026')!;
      expect(r.getUTCFullYear()).toBe(2026);
      expect(r.getUTCMonth()).toBe(0);
      expect(r.getUTCDate()).toBe(1);
    });

    it('parses unambiguous DD/MM/YYYY (day-first when day > 12)', () => {
      // NOTE: ambiguous dates like 05/03/2026 are consumed by the direct-parse
      // step as US MM/DD (May 3) before the DD/MM/YYYY branch runs — existing
      // behavior, documented here. Only day > 12 exercises the day-first path.
      const r = parseSafeDate('31-01-2027')!;
      expect(r.getUTCDate()).toBe(31);
      expect(r.getUTCMonth()).toBe(0); // January, not swapped
      expect(r.getUTCFullYear()).toBe(2027);
      const slash = parseSafeDate('25/12/2026')!;
      expect(slash.getUTCDate()).toBe(25);
      expect(slash.getUTCMonth()).toBe(11);
    });

    it('returns null for impossible day/month combos', () => {
      expect(parseSafeDate('32/01/2026')).toBeNull();
      expect(parseSafeDate('15/13/2026')).toBeNull();
    });

    it('returns null for pure garbage without throwing', () => {
      expect(parseSafeDate('sometime next week maybe')).toBeNull();
      expect(parseSafeDate('!!!')).toBeNull();
    });

    it('handles whitespace-trimmed inputs', () => {
      expect(parseSafeDate('  2026  ')).not.toBeNull();
    });
  });
});
