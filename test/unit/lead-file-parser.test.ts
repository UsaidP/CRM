import { describe, it, expect } from 'bun:test';
import {
  detectDelimiter,
  isLikelyDataRow,
  parseDelimitedText,
  parseUnstructuredText,
  parseJSONContent,
  parseUniversalLeadData,
} from '@/lib/domain/lead-file-parser';

describe('Universal Lead File Parser Unit Tests', () => {
  describe('Delimiter Detection', () => {
    it('detects comma delimiter in standard CSV headers', () => {
      const line = 'Full Name,Phone Number,Email Address,Budget,City';
      expect(detectDelimiter(line)).toBe(',');
    });

    it('detects tab delimiter in TSV headers', () => {
      const line = 'Full Name\tPhone Number\tEmail\tCity';
      expect(detectDelimiter(line)).toBe('\t');
    });

    it('detects pipe delimiter', () => {
      const line = 'Name|Mobile|Requirement|Location';
      expect(detectDelimiter(line)).toBe('|');
    });

    it('handles quoted commas properly without throwing off delimiter count', () => {
      const line = '"Sharma, Rahul",+919967731071,"Kharghar, Sector 35"';
      expect(detectDelimiter(line)).toBe(',');
    });
  });

  describe('Data Row Detection', () => {
    it('identifies rows with valid phone numbers as data rows', () => {
      const row = ['Rahul Sharma', '9820011223', 'rahul@gmail.com', 'Kharghar'];
      expect(isLikelyDataRow(row)).toBe(true);
    });

    it('identifies header rows as NOT data rows', () => {
      const row = ['Full Name', 'Phone Number', 'Email Address', 'Location'];
      expect(isLikelyDataRow(row)).toBe(false);
    });
  });

  describe('Delimited CSV/TSV Text Parsing', () => {
    it('parses standard CSV text with header normalization', () => {
      const csvContent = `Name,Mobile,Email,Budget,City\nSameer Khan,9820011223,sameer@example.com,75 Lakhs,Navi Mumbai\nVikram Mehta,+919967731071,vikram@example.com,1.2 Cr,Kharghar`;
      const result = parseDelimitedText(csvContent, 'csv');
      
      expect(result.totalRows).toBe(2);
      expect(result.readyCount).toBeGreaterThanOrEqual(1);
      expect(result.leads.length).toBe(2);
      expect(result.leads[0].phoneE164).toContain('9820011223');
    });

    it('handles empty or blank CSV text gracefully', () => {
      const result = parseDelimitedText('', 'csv');
      expect(result.totalRows).toBe(0);
      expect(result.leads.length).toBe(0);
    });
  });

  describe('Unstructured Text Parsing', () => {
    it('extracts lead details from WhatsApp message copy-paste', () => {
      const rawText = `
        Hi Safwan bhai, please check this lead:
        Name: Imran Qureshi
        Phone: +91 98199 44332
        Looking for: 2 BHK ready to move in Kharghar Sector 20
        Budget: around 85L max
      `;
      const result = parseUnstructuredText(rawText);
      expect(result.leads.length).toBeGreaterThan(0);
      const lead = result.leads[0];
      expect(lead.phoneE164).toContain('9819944332');
    });
  });

  describe('JSON / Universal Ingestion', () => {
    it('parses JSON array of leads', () => {
      const jsonData = JSON.stringify([
        { name: 'Aditi Rao', phone: '9920033441', budget: 9000000 },
        { name: 'Karan Joshi', phone: '9833011229', budget: 12000000 },
      ]);
      const result = parseJSONContent(jsonData);
      expect(result.totalRows).toBe(2);
      expect(result.leads.length).toBe(2);
    });

    it('handles malformed JSON gracefully', () => {
      const malformed = '{ invalid json string...';
      const result = parseJSONContent(malformed);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
