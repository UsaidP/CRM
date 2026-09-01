import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import type { ProjectAssetRecord } from '@/lib/services/brochure-parser-service';

export interface ExtractedRealAsset {
  pageNumber: number;
  assetType: 'elevation' | 'floor_plan' | 'ground_floor_plan' | 'first_floor_plan' | 'typical_floor_plan' | 'unit_floor_plan' | 'master_plan' | 'location_map' | 'amenity' | 'cover';
  subtype: string;
  title: string;
  description: string;
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  bhk?: number;
  carpetAreaSqft?: number;
  viewAngle?: 'FRONT_FACADE' | 'PODIUM_VIEW' | 'NIGHT_AERIAL' | 'CLUBHOUSE';
}

/**
 * Check if poppler pdftoppm or pdfimages are available on system
 */
function findExecutable(name: string): string | null {
  const commonPaths = [
    `/usr/local/bin/${name}`,
    `/opt/homebrew/bin/${name}`,
    `/usr/bin/${name}`,
    name,
  ];

  for (const p of commonPaths) {
    try {
      execFileSync(p, ['-v'], { stdio: 'ignore' });
      return p;
    } catch (err: any) {
      if (err.status === 0 || err.status === 1 || err.code !== 'ENOENT') {
        return p;
      }
    }
  }
  return null;
}

/**
 * Extracts genuine high-resolution JPEG images and rendered pages from any PDF brochure dynamically.
 * Zero-fabrication policy: Never invents carpet areas, bhk numbers, or customer-specific mappings.
 */
export async function extractRealImagesFromPdf(
  pdfBuffer: Buffer,
  originalFilename: string,
  projectName: string,
  options?: {
    customUnits?: Array<{ bhk: number; carpetAreaSqft?: number; title?: string }>;
    aiAssetHints?: ProjectAssetRecord[];
  }
): Promise<ExtractedRealAsset[]> {
  const cleanSlug = projectName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const tempDir = path.join(os.tmpdir(), `crm_pdf_extract_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

  try {
    fs.mkdirSync(tempDir, { recursive: true });
    const tempPdfPath = path.join(tempDir, 'brochure.pdf');
    fs.writeFileSync(tempPdfPath, pdfBuffer);

    // Step 1: Execute pdftoppm to render every page of the PDF as a real 150 DPI JPEG
    const pdftoppmBin = findExecutable('pdftoppm');
    const renderedPages: Array<{ pageNum: number; buffer: Buffer; filePath: string }> = [];

    if (pdftoppmBin) {
      const pagePrefix = path.join(tempDir, 'page');
      try {
        execFileSync(pdftoppmBin, ['-jpeg', '-r', '150', tempPdfPath, pagePrefix], {
          timeout: 60000,
          maxBuffer: 50 * 1024 * 1024,
        });

        const generatedFiles = fs.readdirSync(tempDir)
          .filter(f => f.startsWith('page-') && (f.endsWith('.jpg') || f.endsWith('.jpeg')))
          .sort((a, b) => {
            const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
            const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
            return numA - numB;
          });

        for (const f of generatedFiles) {
          const p = path.join(tempDir, f);
          const pageNum = parseInt(f.replace(/[^0-9]/g, ''), 10) || 1;
          renderedPages.push({
            pageNum,
            buffer: fs.readFileSync(p),
            filePath: p,
          });
        }
      } catch (ppmErr: any) {
        console.warn('[PDF-EXTRACT] pdftoppm rendering warning:', ppmErr.message);
      }
    }

    // Step 2: Extract embedded raw bitmap images using pdfimages
    const pdfimagesBin = findExecutable('pdfimages');
    const rawImages: Array<{ buffer: Buffer; fileName: string; size: number }> = [];

    if (pdfimagesBin) {
      const rawPrefix = path.join(tempDir, 'rawimg');
      try {
        execFileSync(pdfimagesBin, ['-j', '-png', tempPdfPath, rawPrefix], {
          timeout: 60000,
          maxBuffer: 50 * 1024 * 1024,
        });

        const rawFiles = fs.readdirSync(tempDir)
          .filter(f => f.startsWith('rawimg-') && (f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.jpeg')))
          .sort();

        for (const f of rawFiles) {
          const p = path.join(tempDir, f);
          const stat = fs.statSync(p);
          // Filter out tiny UI icons / decorative artifacts < 20KB
          if (stat.size > 20000) {
            rawImages.push({
              buffer: fs.readFileSync(p),
              fileName: f,
              size: stat.size,
            });
          }
        }
      } catch (imgErr: any) {
        console.warn('[PDF-EXTRACT] pdfimages extraction warning:', imgErr.message);
      }
    }

    const finalAssets: ExtractedRealAsset[] = [];
    const aiHints = options?.aiAssetHints || [];

    // Map rendered pages to real assets using genuine AI hints where available
    for (const page of renderedPages) {
      const { pageNum, buffer } = page;
      const matchingHint = aiHints.find((h) => (h as any).page_number === pageNum || (h as any).pageNumber === pageNum);

      if (matchingHint) {
        const aType = ((matchingHint as any).asset_type || (matchingHint as any).assetType || (pageNum === 1 ? 'cover' : 'elevation')) as any;
        finalAssets.push({
          pageNumber: pageNum,
          assetType: aType,
          subtype: matchingHint.subtype || 'brochure_page',
          title: matchingHint.title || `${projectName} Page ${pageNum}`,
          description: matchingHint.description || `Page ${pageNum} of ${projectName} developer brochure.`,
          buffer,
          fileName: `${cleanSlug}_page_${String(pageNum).padStart(2, '0')}.jpg`,
          mimeType: 'image/jpeg',
          bhk: matchingHint.bhk,
          carpetAreaSqft: matchingHint.carpetAreaSqft,
          viewAngle: (matchingHint as any).viewAngle,
        });
      } else if (pageNum === 1) {
        finalAssets.push({
          pageNumber: 1,
          assetType: 'cover',
          subtype: 'cover_page',
          title: `${projectName} Brochure Cover (Page 1)`,
          description: `Brochure cover page for ${projectName}.`,
          buffer,
          fileName: `${cleanSlug}_page_01_cover.jpg`,
          mimeType: 'image/jpeg',
          viewAngle: 'FRONT_FACADE',
        });
      } else {
        finalAssets.push({
          pageNumber: pageNum,
          assetType: 'elevation',
          subtype: 'brochure_page',
          title: `${projectName} Brochure Page ${pageNum}`,
          description: `Page ${pageNum} of ${projectName} developer brochure.`,
          buffer,
          fileName: `${cleanSlug}_page_${String(pageNum).padStart(2, '0')}.jpg`,
          mimeType: 'image/jpeg',
        });
      }
    }

    // Attach raw images if no full pages were rendered
    if (finalAssets.length === 0 && rawImages.length > 0) {
      rawImages.forEach((img, idx) => {
        finalAssets.push({
          pageNumber: idx + 1,
          assetType: idx === 0 ? 'cover' : 'elevation',
          subtype: 'embedded_image',
          title: `${projectName} Image ${idx + 1}`,
          description: `High-resolution asset extracted from ${originalFilename}.`,
          buffer: img.buffer,
          fileName: `${cleanSlug}_extracted_${idx + 1}.jpg`,
          mimeType: 'image/jpeg',
        });
      });
    }

    return finalAssets;
  } finally {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}
  }
}
