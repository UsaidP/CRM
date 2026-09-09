import { describe, it, expect } from 'bun:test';
import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

describe('Brochure Barcode & QR Code Erasure Engine', () => {
  const scriptPath = path.join(process.cwd(), 'scripts', 'sanitize_brochure_media.py');

  it('detects and erases QR code from real brochure page', () => {
    const origImage = path.join(process.cwd(), 'scratch', 'saras_orig_p1.jpg');
    if (!fs.existsSync(origImage)) {
      console.warn('Skipping test: scratch/saras_orig_p1.jpg not found');
      return;
    }

    // 1. Validate original image has a QR code
    const initialValidationOut = execFileSync('python3', [scriptPath, '--validate', origImage], {
      encoding: 'utf8',
    });
    const initialVal = JSON.parse(initialValidationOut);
    expect(initialVal.valid).toBe(true);
    expect(initialVal.barcode_count).toBeGreaterThanOrEqual(1);

    // 2. Sanitize image to a temp destination
    const tempOut = path.join(os.tmpdir(), `test_qr_erased_${Date.now()}.jpg`);
    try {
      const sanitizeOut = execFileSync('python3', [scriptPath, origImage, tempOut], {
        encoding: 'utf8',
      });
      const sanitizeResult = JSON.parse(sanitizeOut);
      expect(sanitizeResult.sanitized).toBe(true);
      expect(sanitizeResult.valid).toBe(true);
      expect(sanitizeResult.erased_count).toBeGreaterThanOrEqual(1);

      // 3. Verify zero barcodes remain on the sanitized output image
      const recheckOut = execFileSync('python3', [scriptPath, '--validate', tempOut], {
        encoding: 'utf8',
      });
      const recheckVal = JSON.parse(recheckOut);
      expect(recheckVal.valid).toBe(true);
      expect(recheckVal.barcode_count).toBe(0);
    } finally {
      if (fs.existsSync(tempOut)) {
        fs.unlinkSync(tempOut);
      }
    }
  }, 60000);

  it('rejects pitch black masks and transparency silhouettes', () => {
    // Create a synthetic mostly black test image in tmp
    const tempBlackImg = path.join(os.tmpdir(), `test_black_mask_${Date.now()}.png`);
    try {
      // Use python PIL to save an all-black 200x200 image
      execFileSync('python3', [
        '-c',
        `from PIL import Image; Image.new("RGB", (200, 200), (0, 0, 0)).save("${tempBlackImg}")`,
      ]);

      const valOut = execFileSync('python3', [scriptPath, '--validate', tempBlackImg], {
        encoding: 'utf8',
      });
      const val = JSON.parse(valOut);
      expect(val.valid).toBe(false);
      expect(val.reason).toContain('black');
    } finally {
      if (fs.existsSync(tempBlackImg)) {
        fs.unlinkSync(tempBlackImg);
      }
    }
  });

  it('rejects 1-bit binary transparency masks', () => {
    const temp1BitImg = path.join(os.tmpdir(), `test_1bit_mask_${Date.now()}.png`);
    try {
      execFileSync('python3', [
        '-c',
        `from PIL import Image; Image.new("1", (200, 200), 0).save("${temp1BitImg}")`,
      ]);

      const valOut = execFileSync('python3', [scriptPath, '--validate', temp1BitImg], {
        encoding: 'utf8',
      });
      const val = JSON.parse(valOut);
      expect(val.valid).toBe(false);
      expect(val.reason).toContain('mask mode');
    } finally {
      if (fs.existsSync(temp1BitImg)) {
        fs.unlinkSync(temp1BitImg);
      }
    }
  });

  it('converts CMYK images to sRGB to prevent negative/inverted colors in browsers', () => {
    const tempCmykImg = path.join(os.tmpdir(), `test_cmyk_${Date.now()}.jpg`);
    const tempSrgbOut = path.join(os.tmpdir(), `test_srgb_${Date.now()}.jpg`);
    try {
      execFileSync('python3', [
        '-c',
        `from PIL import Image; Image.new("CMYK", (300, 300), (50, 100, 150, 0)).save("${tempCmykImg}")`,
      ]);

      const valOut = execFileSync('python3', [scriptPath, '--validate', tempCmykImg, tempSrgbOut], {
        encoding: 'utf8',
      });
      const val = JSON.parse(valOut);
      expect(val.valid).toBe(true);
      expect(val.converted_cmyk).toBe(true);

      // Verify output mode is now RGB
      const modeCheck = execFileSync('python3', [
        '-c',
        `from PIL import Image; print(Image.open("${tempSrgbOut}").mode)`,
      ], { encoding: 'utf8' }).trim();
      expect(modeCheck).toBe('RGB');
    } finally {
      if (fs.existsSync(tempCmykImg)) fs.unlinkSync(tempCmykImg);
      if (fs.existsSync(tempSrgbOut)) fs.unlinkSync(tempSrgbOut);
    }
  }, 20000);
});
