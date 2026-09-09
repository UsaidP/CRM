import { describe, it, expect } from 'bun:test';
import {
  ingestBrochure,
  sanitizeBrochureFilename,
  normalizeBrochureMimeType,
  BrochureIngestionError,
} from '@/lib/domain/brochure-ingestion';

describe('Brochure Ingestion Domain Pipeline (ingestBrochure)', () => {
  describe('Helper Utilities', () => {
    it('sanitizes unsafe filename characters and path traversal', () => {
      expect(sanitizeBrochureFilename('../../etc/passwd')).toBe('passwd');
      expect(sanitizeBrochureFilename('sub/dir/Tower_A.pdf')).toBe('Tower_A.pdf');
      expect(sanitizeBrochureFilename('Godrej  Skyline - Tower A (Draft).pdf')).toBe('Godrej__Skyline_-_Tower_A__Draft_.pdf');
      expect(sanitizeBrochureFilename('')).toBe('Developer_Brochure.pdf');
      expect(sanitizeBrochureFilename(null)).toBe('Developer_Brochure.pdf');
    });

    it('normalizes supported MIME types and defaults unknown ones to application/pdf', () => {
      expect(normalizeBrochureMimeType('application/pdf')).toBe('application/pdf');
      expect(normalizeBrochureMimeType('IMAGE/JPEG')).toBe('image/jpeg');
      expect(normalizeBrochureMimeType('image/png')).toBe('image/png');
      expect(normalizeBrochureMimeType('image/webp')).toBe('image/webp');
      expect(normalizeBrochureMimeType('application/octet-stream')).toBe('application/pdf');
      expect(normalizeBrochureMimeType(null)).toBe('application/pdf');
    });
  });

  describe('Validation & Invariants', () => {
    const dummyContext = {
      organizationId: 'org-test-1',
      userId: 'usr-test-1',
    };

    it('rejects empty binary buffer with 400 error', async () => {
      try {
        await ingestBrochure(
          { kind: 'buffer', buffer: Buffer.alloc(0), filename: 'empty.pdf' },
          dummyContext
        );
        expect(true).toBe(false); // Should have thrown
      } catch (err: any) {
        expect(err).toBeInstanceOf(BrochureIngestionError);
        expect(err.statusCode).toBe(400);
        expect(err.message).toContain('Empty brochure buffer');
      }
    });

    it('rejects text payload with fewer than 10 characters', async () => {
      try {
        await ingestBrochure(
          { kind: 'text', text: 'too short' },
          dummyContext
        );
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err).toBeInstanceOf(BrochureIngestionError);
        expect(err.statusCode).toBe(400);
        expect(err.message).toContain('at least 10 characters');
      }
    });

    it('processes brochure text through the regex extraction path', async () => {
      const sampleText = `
        Welcome to Godrej Horizon Kharghar Sector 35.
        MahaRERA Registration Number: P52000018920.
        Offering luxurious 2 BHK and 3 BHK residences across 32 storeys.
        2 BHK carpet area: 780 sq.ft.
        3 BHK carpet area: 1050 sq.ft.
        Starting from 1.45 Cr onwards.
      `;

      const result = await ingestBrochure(
        { kind: 'text', text: sampleText, filename: 'godrej-horizon.txt' },
        dummyContext
      );

      expect(result.extractionMethod).toBe('REGEX_FALLBACK');
      expect(result.data).toBeDefined();
      expect(result.data.projectName).toBeDefined();
      expect(Array.isArray(result.data.units)).toBe(true);
    }, 30000);
  });
});
