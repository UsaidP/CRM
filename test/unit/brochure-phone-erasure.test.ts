import { describe, it, expect } from 'bun:test';
import { erasePhoneNumbersFromText, parseBrochureText } from '@/lib/services/brochure-parser-service';
import { sanitizeBrochurePdfBuffer } from '@/lib/services/pdf-image-extractor';
import fs from 'fs';
import path from 'path';

describe('Brochure Phone Number Erasure Engine (Broker Shield)', () => {
  describe('erasePhoneNumbersFromText', () => {
    it('erases 10-digit Indian mobile numbers', () => {
      const input = 'Call 9820123456 for exclusive preview and site visit bookings.';
      const output = erasePhoneNumbersFromText(input);
      expect(output).not.toContain('9820123456');
      expect(output).toContain('exclusive preview and site visit bookings.');
    });

    it('erases mobile numbers with country code (+91)', () => {
      const input = 'Site Office: +91 99205 40484 or +91-8451928090. Visit today!';
      const output = erasePhoneNumbersFromText(input);
      expect(output).not.toContain('99205');
      expect(output).not.toContain('8451928090');
      expect(output).toContain('Visit today!');
    });

    it('erases landline numbers with STD code (022)', () => {
      const input = 'Corporate Desk: 022-27741234. Head Office at Kharghar.';
      const output = erasePhoneNumbersFromText(input);
      expect(output).not.toContain('022-27741234');
      expect(output).toContain('Head Office at Kharghar.');
    });

    it('erases broker stamp with name and phone number', () => {
      const input = 'Marketed by MOHD SAQLAIN-9920540484 with zero brokerage.';
      const output = erasePhoneNumbersFromText(input);
      expect(output).not.toContain('9920540484');
      expect(output).not.toContain('MOHD SAQLAIN');
    });

    it('strictly preserves MahaRERA registration numbers', () => {
      const input = 'Approved under MahaRERA Reg No: P51700077818. Call 9820011223.';
      const output = erasePhoneNumbersFromText(input);
      expect(output).toContain('P51700077818');
      expect(output).not.toContain('9820011223');
    });

    it('strictly preserves carpet areas, storeys, and pricing', () => {
      const input = 'G+24 Storey Tower offering 1 BHK (450 sqft) & 2 BHK (685 sq.ft) at ₹10,500/sqft. Contact: 9819000000.';
      const output = erasePhoneNumbersFromText(input);
      expect(output).toContain('G+24');
      expect(output).toContain('450 sqft');
      expect(output).toContain('685 sq.ft');
      expect(output).toContain('10,500');
      expect(output).not.toContain('9819000000');
    });

    it('strictly preserves 4-digit calendar years', () => {
      const input = 'Possession Target Date: December 2027. Phone: 9833012345.';
      const output = erasePhoneNumbersFromText(input);
      expect(output).toContain('2027');
      expect(output).not.toContain('9833012345');
    });
  });

  describe('parseBrochureText Phone Scrubbing', () => {
    it('erases developerSalesPocPhone and sanitizes descriptions and previews', () => {
      const sampleBrochure = `
        PARADISE GROUP PRESENTS CROWN HEIGHTS
        MahaRERA Registration Number: P52000028714
        Location: Sector 35, Kharghar
        Elevation: G+24 Storey Magnificent Tower
        1 BHK: 450 sqft
        2 BHK: 685 sqft
        Base Rate: ₹10,500/sqft
        Contact Sales: Site Sales Office (+91 98201 23456)
        Call 9920540484 for direct developer allotment discounts.
      `;

      const result = parseBrochureText(sampleBrochure, 'Crown_Heights.pdf');

      expect(result.projectName).toContain('Crown Heights');
      expect(result.reraNumber).toBe('P52000028714');
      expect(result.developerSalesPocPhone).toBeUndefined();
      expect(result.confidentialBrokerData?.developerSalesPocPhone).toBeUndefined();
      expect(result.rawTextPreview).not.toContain('98201 23456');
      expect(result.rawTextPreview).not.toContain('9920540484');
      expect(result.shortDescription).not.toContain('98201');
      expect(result.description).not.toContain('98201');
    });
  });

  describe('PDF Buffer Sanitization (Real Scanned Brochures)', () => {
    it('sanitizes City Avenue PDF by erasing phone number on Page 8', () => {
      const samplePdfPath = path.join(process.cwd(), 'data', 'Project Data', 'City Avenue.pdf');
      if (!fs.existsSync(samplePdfPath)) {
        console.warn('City Avenue.pdf not found in data directory, skipping integration test.');
        return;
      }

      const rawBuffer = fs.readFileSync(samplePdfPath);
      const { buffer: sanitizedBuffer, erasedCount } = sanitizeBrochurePdfBuffer(rawBuffer);

      expect(sanitizedBuffer).toBeDefined();
      expect(sanitizedBuffer.length).toBeGreaterThan(0);
      expect(erasedCount).toBeGreaterThanOrEqual(1);
    }, 60000);
  });
});
