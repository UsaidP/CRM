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

  it('treats Infinity and non-numeric junk as ₹0', () => {
    expect(formatIndianRupees(Infinity)).toBe('₹0');
    expect(formatLakhCr(-Infinity)).toBe('₹0');
    expect(formatPriceFull('twelve crore')).toBe('₹0');
    expect(formatPriceFull({})).toBe('₹0');
    expect(formatIndianRupees([])).toBe('₹0');
  });

  it('formats zero explicitly', () => {
    expect(formatIndianRupees(0)).toBe('₹0');
    expect(formatLakhCr(0)).toBe('₹0');
    expect(formatPriceFull(0)).toBe('₹0');
  });

  it('rounds fractional paise before display', () => {
    expect(formatIndianRupees(45000.6)).toBe('₹45,001');
    expect(formatIndianRupees(45000.4)).toBe('₹45,000');
  });

  it('handles exact Lakh and Crore boundaries without rounding errors', () => {
    expect(formatLakhCr(100000)).toBe('₹1 Lakh');
    expect(formatLakhCr(99999)).toBe('₹99,999');
    expect(formatLakhCr(10000000)).toBe('₹1.00 Cr');
    expect(formatLakhCr(9999999)).toBe('₹100.00 Lakh');
  });

  it('shows negative amounts without crashing (refund/correction paths)', () => {
    expect(formatIndianRupees(-5000)).toBe('₹-5,000');
  });

  it('accepts numeric strings from form/CSV input', () => {
    expect(formatIndianRupees('45000')).toBe('₹45,000');
    expect(formatLakhCr('15808000')).toBe('₹1.58 Cr');
  });

  it('keeps sub-lakh amounts out of the Lakh/Crore compact form in formatPriceFull', () => {
    expect(formatPriceFull(45000)).toBe('₹45,000');
    expect(formatPriceFull(100000)).toBe('₹1 Lakh (₹1,00,000)');
  });
});
