import { describe, it, expect } from 'bun:test';
import {
  normalizeLeadStage,
  parseIndianBudget,
  extractBhkPreferences,
  resolveMicroMarket,
  sanitizeName,
  classifyLeadSource,
  autoAdjustLeadRow,
  detectLeadColumnMapping,
} from '@/lib/domain/lead-auto-adjuster';

describe('Lead Auto Adjuster & Stage Normalizer Unit Tests', () => {
  describe('Stage Normalization', () => {
    it('normalizes various colloquial stage strings to canonical stage keys', () => {
      expect(normalizeLeadStage('New Lead')).toBe('new_uncontacted');
      expect(normalizeLeadStage('fresh')).toBe('new_uncontacted');
      expect(normalizeLeadStage('Discovery Done')).toBe('discovery_call');
      expect(normalizeLeadStage('Site Visit Done')).toBe('visit_done');
      expect(normalizeLeadStage('Costing and Token')).toBe('negotiation_token');
      expect(normalizeLeadStage('Registered Deal')).toBe('closed_won');
      expect(normalizeLeadStage('Lost / Junk')).toBe('closed_lost');
    });

    it('returns default new_uncontacted for undefined or empty stage', () => {
      expect(normalizeLeadStage(null)).toBe('new_uncontacted');
      expect(normalizeLeadStage('')).toBe('new_uncontacted');
    });
  });

  describe('Indian Currency & Budget Parsing', () => {
    it('parses Lakhs and Crores into raw numerical values', () => {
      const parsedLakhs = parseIndianBudget('75 Lakhs');
      expect(parsedLakhs.max).toBe(7500000);

      const parsedCrores = parseIndianBudget('1.45 Cr');
      expect(parsedCrores.max).toBe(14500000);

      const parsedRange = parseIndianBudget('60L - 80L');
      expect(parsedRange.min).toBe(6000000);
      expect(parsedRange.max).toBe(8000000);
    });

    it('handles numeric numbers directly without error', () => {
      const parsed = parseIndianBudget(9500000);
      expect(parsed.max).toBe(9500000);
    });
  });

  describe('BHK & Micro-Market Resolution', () => {
    it('extracts BHK numbers from strings', () => {
      expect(extractBhkPreferences('2 BHK')).toEqual([2]);
      expect(extractBhkPreferences('2 & 3 BHK')).toEqual([2, 3]);
      expect(extractBhkPreferences('Studio / 1RK')).toEqual([1]);
    });

    it('resolves Navi Mumbai micro-markets with high confidence', () => {
      const kharghar = resolveMicroMarket('Sector 35 Kharghar near metro');
      expect(kharghar.canonical).toBe('Kharghar Sector 35');
      expect(kharghar.region).toBe('KHARGHAR');

      const taloja = resolveMicroMarket('Taloja MIDC');
      expect(taloja.canonical).toBe('Taloja Phase 1');
      expect(taloja.region).toBe('TALOJA_1');
    });
  });

  describe('Name Sanitization & Source Classification', () => {
    it('cleans up raw names and salutations', () => {
      expect(sanitizeName('Mr. Rahul Sharma')).toBe('Rahul Sharma');
      expect(sanitizeName('  DR. SAMEER KHAN   ')).toBe('Sameer Khan');
    });

    it('classifies lead sources from marketing campaigns', () => {
      const source = classifyLeadSource('Instagram Reel', 'reel-kharghar-2bhk');
      expect(source.leadSource).toBe('META_ADS');
      expect(source.sourceConfidence).toBe('EXACT');
    });
  });

  describe('Full Row Auto-Adjustment Pipeline', () => {
    it('auto-adjusts a complete messy lead row', () => {
      const headers = ['Full Name', 'Contact Number', 'Email', 'Budget', 'Location', 'Stage'];
      const mapping = detectLeadColumnMapping(headers);
      const rawRow = {
        'Full Name': 'Mr. Asif Shaikh',
        'Contact Number': '9820011223',
        'Email': 'asif@gmail.com',
        'Budget': '1.25 Cr',
        'Location': 'Kharghar Sector 20',
        'Stage': 'Site Visit Scheduled',
      };

      const adjusted = autoAdjustLeadRow(rawRow, mapping);
      expect(adjusted.fullName).toBe('Asif Shaikh');
      expect(adjusted.phoneE164).toBe('+919820011223');
      expect(adjusted.stage).toBe('visit_scheduled');
      expect(adjusted.budgetMax).toBe(12500000);
      expect(adjusted.status).toBe('READY');
    });
  });
});
