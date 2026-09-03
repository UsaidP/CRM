import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
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
 * Helper to compute SHA256 hash of a buffer
 */
function computeHash(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
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
    floorPlansList?: any[];
    pages?: any[];
  }
): Promise<ExtractedRealAsset[]> {
  const cleanSlug = projectName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const tempDir = path.join(os.tmpdir(), `crm_pdf_extract_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const seenHashes = new Set<string>();

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
          const pageBuf = fs.readFileSync(p);
          const h = computeHash(pageBuf);
          if (!seenHashes.has(h)) {
            seenHashes.add(h);
            renderedPages.push({
              pageNum,
              buffer: pageBuf,
              filePath: p,
            });
          }
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
            const imgBuf = fs.readFileSync(p);
            const h = computeHash(imgBuf);
            if (!seenHashes.has(h)) {
              seenHashes.add(h);
              rawImages.push({
                buffer: imgBuf,
                fileName: f,
                size: stat.size,
              });
            }
          }
        }
      } catch (imgErr: any) {
        console.warn('[PDF-EXTRACT] pdfimages extraction warning:', imgErr.message);
      }
    }

    const finalAssets: ExtractedRealAsset[] = [];
    const aiHints = options?.aiAssetHints || [];
    const floorPlansList = options?.floorPlansList || [];
    const pageTypes = options?.pages || [];
    const totalRendered = renderedPages.length;

    // Map rendered pages to real assets using genuine AI hints and structural analysis
    for (const page of renderedPages) {
      const { pageNum, buffer } = page;
      const matchingHint = aiHints.find((h) => (h as any).page_number === pageNum || (h as any).pageNumber === pageNum);
      const matchingFp = floorPlansList.find((fp) => Number(fp.page_number) === pageNum);
      const matchingPageType = pageTypes.find((p) => p.page_number === pageNum);

      let assetType: ExtractedRealAsset['assetType'] = 'elevation';
      let subtype = 'brochure_page';
      let title = `${projectName} Page ${pageNum}`;
      let description = `High-resolution original brochure page ${pageNum} for ${projectName}.`;
      let bhk = matchingHint?.bhk || matchingFp?.units?.[0]?.bhk;
      let carpetAreaSqft = matchingHint?.carpetAreaSqft || matchingFp?.units?.[0]?.carpetAreaSqft;

      if (matchingHint) {
        assetType = ((matchingHint as any).asset_type || (matchingHint as any).assetType || (pageNum === 1 ? 'cover' : 'elevation')) as any;
        subtype = matchingHint.subtype || 'brochure_page';
        title = matchingHint.title || `${projectName} Page ${pageNum}`;
        description = matchingHint.description || description;
      } else if (matchingFp) {
        assetType = (matchingFp.plan_type || 'floor_plan') as any;
        subtype = matchingFp.plan_type || 'typical_floor_plan';
        title = matchingFp.title || `${projectName} ${matchingFp.floor || 'Floor'} Layout Plan`;
        description = `${matchingFp.floor || 'Typical'} floor architectural layout extracted from developer brochure.`;
      } else if (matchingPageType) {
        const pt = matchingPageType.page_type.toLowerCase();
        if (pt.includes('floor') || pt.includes('unit') || pt.includes('layout')) {
          assetType = pt.includes('ground') ? 'ground_floor_plan' : pt.includes('first') ? 'first_floor_plan' : pt.includes('typical') ? 'typical_floor_plan' : 'floor_plan';
          subtype = pt;
          title = matchingPageType.page_title || `${projectName} Floor Layout (Page ${pageNum})`;
        } else if (pt.includes('map') || pt.includes('connect')) {
          assetType = 'location_map';
          subtype = 'location_connectivity_map';
          title = `${projectName} Location & Connectivity Map`;
        } else if (pt.includes('master') || pt.includes('site')) {
          assetType = 'master_plan';
          subtype = 'master_layout_plan';
          title = `${projectName} Master Site Layout`;
        } else if (pt.includes('amenit')) {
          assetType = 'amenity';
          subtype = 'amenities_page';
          title = `${projectName} Lifestyle Amenities`;
        } else if (pt.includes('cover')) {
          assetType = 'cover';
          subtype = 'front_facade';
          title = `${projectName} Main Cover & Facade`;
        }
      } else if (pageNum === 1) {
        assetType = 'cover';
        subtype = 'cover_page';
        title = `${projectName} Main Brochure Cover`;
        description = `Official developer brochure cover and elevation for ${projectName}.`;
      } else if (totalRendered >= 4 && pageNum === totalRendered) {
        assetType = 'location_map';
        subtype = 'location_connectivity_map';
        title = `${projectName} Location & Transit Map`;
        description = `Official location and connectivity map from developer brochure.`;
      } else if (totalRendered >= 6 && pageNum >= Math.floor(totalRendered * 0.6)) {
        assetType = 'floor_plan';
        subtype = 'typical_floor_plan';
        title = `${projectName} Floor Plan Layout (Page ${pageNum})`;
        description = `Architectural floor plan layout from developer brochure.`;
      }

      finalAssets.push({
        pageNumber: pageNum,
        assetType,
        subtype,
        title,
        description,
        buffer,
        fileName: `${cleanSlug}_page_${String(pageNum).padStart(2, '0')}.jpg`,
        mimeType: 'image/jpeg',
        bhk,
        carpetAreaSqft,
        viewAngle: pageNum === 1 ? 'FRONT_FACADE' : undefined,
      });
    }

    // Attach high-res raw embedded images if extracted
    if (rawImages.length > 0) {
      rawImages.forEach((img, idx) => {
        // If we didn't have any rendered pages, or if it's additional embedded image
        if (finalAssets.length === 0 || img.size > 80000) {
          finalAssets.push({
            pageNumber: finalAssets.length + 1,
            assetType: finalAssets.length === 0 && idx === 0 ? 'cover' : 'elevation',
            subtype: 'embedded_image',
            title: `${projectName} Photo ${idx + 1}`,
            description: `High-resolution original asset extracted from ${originalFilename}.`,
            buffer: img.buffer,
            fileName: `${cleanSlug}_extracted_${idx + 1}.jpg`,
            mimeType: 'image/jpeg',
          });
        }
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
