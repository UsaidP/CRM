import { describe, it, expect } from 'bun:test';
import {
  formatIndianRupees,
  formatLakhCr,
  formatPriceFull,
} from '../src/lib/money';

describe('Indian money formatting', () => {
  it('groups digits the Indian way (lakh/crore grouping)', () => {
    expect(formatIndianRupees(15808000)).toBe('₹1,58,08,000');
    expect(formatIndianRupees(109748)).toBe('₹1,09,748');
    expect(formatIndianRupees(45000)).toBe('₹45,000');
  });

  it('reads in Lakh and Crore', () => {
    expect(formatLakhCr(15808000)).toBe('₹1.58 Cr');
    expect(formatLakhCr(13265000)).toBe('₹1.33 Cr');
    expect(formatLakhCr(1580800)).toBe('₹15.81 Lakh');
    expect(formatLakhCr(45000)).toBe('₹45,000');
  });

  it('shows both for hero prices', () => {
    expect(formatPriceFull(15808000)).toBe('₹1.58 Cr (₹1,58,08,000)');
  });

  it('handles junk input without crashing', () => {
    expect(formatIndianRupees(null)).toBe('₹0');
    expect(formatLakhCr(undefined)).toBe('₹0');
    expect(formatLakhCr(NaN)).toBe('₹0');
  });
});
