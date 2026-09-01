import { describe, it, expect } from 'bun:test';
import {
  isCompressibleImage,
  calculateAspectRatioFit,
  formatBytes,
  compressImageFile,
} from '@/lib/client/image-compressor';

describe('Client-Side Image Compressor & Storage Optimizer', () => {
  describe('isCompressibleImage format detection', () => {
    it('identifies JPG, PNG, WEBP, and AVIF as compressible', () => {
      expect(isCompressibleImage({ type: 'image/jpeg' } as File)).toBe(true);
      expect(isCompressibleImage({ type: 'image/png' } as File)).toBe(true);
      expect(isCompressibleImage({ type: 'image/webp' } as File)).toBe(true);
      expect(isCompressibleImage({ type: 'image/avif' } as File)).toBe(true);
    });

    it('rejects PDF, video, and non-image files', () => {
      expect(isCompressibleImage({ type: 'application/pdf' } as File)).toBe(false);
      expect(isCompressibleImage({ type: 'video/mp4' } as File)).toBe(false);
      expect(isCompressibleImage({ type: 'text/plain' } as File)).toBe(false);
    });
  });

  describe('calculateAspectRatioFit scaling logic', () => {
    it('keeps original dimensions if smaller than maximum bounds', () => {
      const result = calculateAspectRatioFit(1200, 800, 2048, 2048);
      expect(result.width).toBe(1200);
      expect(result.height).toBe(800);
    });

    it('downscales 4K landscape photo to max width while preserving aspect ratio', () => {
      // 3840 x 2160 (16:9 4K UHD) downscaled to max 2048px width
      const result = calculateAspectRatioFit(3840, 2160, 2048, 2048);
      expect(result.width).toBe(2048);
      expect(result.height).toBe(1152); // (2160 / 3840) * 2048 = 1152
    });

    it('downscales tall portrait photo to max height while preserving aspect ratio', () => {
      // 2000 x 4000 (1:2 portrait) downscaled to max 2048px height
      const result = calculateAspectRatioFit(2000, 4000, 2048, 2048);
      expect(result.width).toBe(1024);
      expect(result.height).toBe(2048);
    });
  });

  describe('formatBytes helper', () => {
    it('formats bytes into KB and MB cleanly', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(5242880)).toBe('5 MB');
      expect(formatBytes(14656853)).toBe('14 MB');
    });
  });

  describe('compressImageFile execution', () => {
    it('returns uncompressed file gracefully if non-image or in server environment', async () => {
      const dummyFile = new File(['test buffer content'], 'brochure.pdf', {
        type: 'application/pdf',
      });
      const result = await compressImageFile(dummyFile);
      expect(result.originalBytes).toBe(dummyFile.size);
      expect(result.compressedBytes).toBe(dummyFile.size);
      expect(result.savedPercent).toBe(0);
    });
  });
});
