import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import type { ProjectAssetRecord } from '@/lib/services/brochure-parser-service';

export interface ExtractedRealAsset {
  pageNumber: number;
  assetType: 'elevation' | 'floor_plan' | 'ground_floor_plan' | 'first_floor_plan' | 'typical_floor_plan' | 'unit_floor_plan' | 'master_plan' | 'location_map' | 'amenity' | 'cover' | 'brochure_photo' | 'specifications';
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
      execFileSync(/*turbopackIgnore: true*/ p, ['-v'], { stdio: 'ignore' });
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
 * Sanitizes a PDF buffer by erasing any builder/broker phone numbers from all pages.
 */
export function sanitizeBrochurePdfBuffer(pdfBuffer: Buffer): { buffer: Buffer; erasedCount: number } {
  const tempDir = path.join(os.tmpdir(), `crm_pdf_sanitize_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  try {
    fs.mkdirSync(tempDir, { recursive: true });
    const inPath = path.join(tempDir, 'input.pdf');
    const outPath = path.join(tempDir, 'sanitized.pdf');
    fs.writeFileSync(inPath, pdfBuffer);

    const scriptPath = path.join(process.cwd(), 'scripts', 'sanitize_brochure_media.py');
    if (fs.existsSync(scriptPath)) {
      const output = execFileSync('python3', [scriptPath, inPath, outPath], {
        encoding: 'utf8',
        timeout: 60000,
        maxBuffer: 20 * 1024 * 1024,
      });
      if (fs.existsSync(outPath)) {
        const parsed = JSON.parse(output);
        const sanitizedBuf = fs.readFileSync(outPath);
        return { buffer: sanitizedBuf, erasedCount: parsed.total_erased || 0 };
      }
    }
  } catch (err: any) {
    console.warn('[PDF-SANITIZE] Phone erasure notice:', err.message);
  } finally {
    try {
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
  return { buffer: pdfBuffer, erasedCount: 0 };
}

/**
 * Extracts genuine high-resolution JPEG images and rendered pages from any PDF brochure dynamically.
 * Zero-fabrication policy: Never invents carpet areas, bhk numbers, or customer-specific mappings.
 * Phone erasure: Automatically detects and erases builder/broker phone numbers from all visual assets.
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
    alreadySanitized?: boolean;
  }
): Promise<ExtractedRealAsset[]> {
  const cleanSlug = projectName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const tempDir = path.join(os.tmpdir(), `crm_pdf_extract_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const seenHashes = new Set<string>();

  try {
    fs.mkdirSync(tempDir, { recursive: true });
    const rawPdfPath = path.join(tempDir, 'brochure_raw.pdf');
    const tempPdfPath = path.join(tempDir, 'brochure.pdf');
    fs.writeFileSync(rawPdfPath, pdfBuffer);

    // Step 0: Sanitize PDF to erase all phone numbers from pages before rendering (skip if already sanitized at ingestion)
    const sanitizeScriptPath = path.join(process.cwd(), 'scripts', 'sanitize_brochure_media.py');
    let effectivePdfPath = rawPdfPath;
    if (!options?.alreadySanitized && fs.existsSync(sanitizeScriptPath)) {
      try {
        const sanitizeOut = execFileSync('python3', [sanitizeScriptPath, rawPdfPath, tempPdfPath], {
          encoding: 'utf8',
          timeout: 60000,
          maxBuffer: 20 * 1024 * 1024,
        });
        if (fs.existsSync(tempPdfPath)) {
          effectivePdfPath = tempPdfPath;
          const parsed = JSON.parse(sanitizeOut);
          console.log(`[PDF-EXTRACT] Broker Shield erased ${parsed.total_erased || 0} phone numbers from PDF pages.`);
        }
      } catch (err: any) {
        console.warn('[PDF-EXTRACT] Phone erasure warning:', err.message);
        fs.copyFileSync(rawPdfPath, tempPdfPath);
        effectivePdfPath = tempPdfPath;
      }
    } else {
      fs.copyFileSync(rawPdfPath, tempPdfPath);
      effectivePdfPath = tempPdfPath;
    }

    // Step 1: Execute pdftoppm to render every page of the sanitized PDF as a real 150 DPI JPEG
    const pdftoppmBin = findExecutable('pdftoppm');
    const renderedPages: Array<{ pageNum: number; buffer: Buffer; filePath: string }> = [];

    if (pdftoppmBin) {
      const pagePrefix = path.join(tempDir, 'page');
      try {
        execFileSync(/*turbopackIgnore: true*/ pdftoppmBin, ['-jpeg', '-r', '150', effectivePdfPath, pagePrefix], {
          timeout: 120000,
          maxBuffer: 100 * 1024 * 1024,
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

    // Step 2: Fallback extraction of embedded bitmap images only if pdftoppm produced 0 pages
    const rawImages: Array<{ buffer: Buffer; fileName: string; size: number }> = [];

    if (renderedPages.length === 0) {
      const pdfimagesBin = findExecutable('pdfimages');
      if (pdfimagesBin) {
        const rawPrefix = path.join(tempDir, 'rawimg');
        try {
          execFileSync(/*turbopackIgnore: true*/ pdfimagesBin, ['-j', '-png', effectivePdfPath, rawPrefix], {
            timeout: 120000,
            maxBuffer: 100 * 1024 * 1024,
          });

          const rawFiles = fs.readdirSync(tempDir)
            .filter(f => f.startsWith('rawimg-') && (f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.jpeg')))
            .sort();

          for (const f of rawFiles) {
            const p = path.join(tempDir, f);
            const stat = fs.statSync(p);
            // Filter out tiny artifacts < 25KB
            if (stat.size > 25000) {
              // Sanitize and validate image: rejects black masks, standalone barcodes, and converts CMYK to sRGB
              let isValid = true;
              if (fs.existsSync(sanitizeScriptPath)) {
                try {
                  const sanitizeOut = execFileSync('python3', [sanitizeScriptPath, p, p], {
                    encoding: 'utf8',
                    timeout: 15000,
                  });
                  const parsed = JSON.parse(sanitizeOut);
                  if (parsed.valid === false) {
                    isValid = false;
                  }
                } catch {
                  // Ignore script error
                }
              }

              if (isValid && fs.existsSync(p)) {
                const imgBuf = fs.readFileSync(p);
                const h = computeHash(imgBuf);
                if (!seenHashes.has(h)) {
                  seenHashes.add(h);
                  rawImages.push({
                    buffer: imgBuf,
                    fileName: f,
                    size: imgBuf.length,
                  });
                }
              }
            }
          }
        } catch (imgErr: any) {
          console.warn('[PDF-EXTRACT] pdfimages extraction warning:', imgErr.message);
        }
      }
    }

    const finalAssets: ExtractedRealAsset[] = [];
    const aiHints = options?.aiAssetHints || [];
    const floorPlansList = options?.floorPlansList || [];
    const pageTypes = options?.pages || [];
    const totalRendered = renderedPages.length;

    // Map rendered pages to real assets using genuine AI hints, OCR page data, and structural analysis
    for (const page of renderedPages) {
      const { pageNum, buffer } = page;
      const matchingHint = aiHints.find((h) => Number((h as any).page_number || (h as any).pageNumber) === pageNum);
      const matchingFp = floorPlansList.find((fp) => Number(fp.page_number || fp.pageNumber) === pageNum);
      const matchingPageType = pageTypes.find((p) => Number(p.page_number || (p as any).pageNumber) === pageNum);

      let assetType: ExtractedRealAsset['assetType'] = 'elevation';
      let subtype = 'brochure_page';
      let title = `${projectName} Page ${pageNum}`;
      let description = `High-resolution original brochure page ${pageNum} for ${projectName}.`;
      let bhk = matchingHint?.bhk || matchingFp?.units?.[0]?.bhk || matchingFp?.bhk || matchingPageType?.bhk;
      let carpetAreaSqft = matchingHint?.carpetAreaSqft || matchingFp?.units?.[0]?.carpetAreaSqft || matchingFp?.carpetAreaSqft || matchingPageType?.carpet_area_sqft || (matchingPageType as any)?.carpetAreaSqft;

      if (matchingHint) {
        assetType = ((matchingHint as any).asset_type || (matchingHint as any).assetType || (pageNum === 1 ? 'cover' : 'elevation')) as any;
        subtype = matchingHint.subtype || 'brochure_page';
        title = matchingHint.title || `${projectName} Page ${pageNum}`;
        description = matchingHint.description || description;
      } else if (matchingFp) {
        const fpType = (matchingFp.plan_type || 'floor_plan').toLowerCase();
        assetType = bhk ? 'unit_floor_plan' : fpType.includes('typical') ? 'typical_floor_plan' : 'floor_plan';
        subtype = matchingFp.plan_type || (bhk ? `${bhk}_bhk_unit_plan` : 'typical_floor_plan');
        title = matchingFp.title || (bhk ? `${projectName} ${bhk} BHK Floor Plan Layout` : `${projectName} ${matchingFp.floor || 'Floor'} Layout Plan`);
        description = `${matchingFp.floor || 'Typical'} floor architectural layout extracted from developer brochure.`;
      } else if (matchingPageType) {
        const pt = (matchingPageType.page_type || '').toLowerCase();
        if (pt.includes('floor') || pt.includes('unit') || pt.includes('layout')) {
          assetType = pt.includes('ground') ? 'ground_floor_plan' : pt.includes('first') ? 'first_floor_plan' : pt.includes('typical') ? 'typical_floor_plan' : bhk ? 'unit_floor_plan' : 'floor_plan';
          subtype = pt;
          title = matchingPageType.title || (matchingPageType as any).page_title || (bhk ? `${projectName} ${bhk} BHK Floor Plan Layout` : `${projectName} Floor Layout (Page ${pageNum})`);
          description = matchingPageType.description || `${bhk ? `${bhk} BHK` : 'Architectural'} floor plan layout from developer brochure.`;
        } else if (pt.includes('map') || pt.includes('connect')) {
          assetType = 'location_map';
          subtype = 'location_connectivity_map';
          title = matchingPageType.title || `${projectName} Location & Connectivity Map`;
          description = matchingPageType.description || `Strategic location and connectivity map from developer brochure.`;
        } else if (pt.includes('master') || pt.includes('site')) {
          assetType = 'master_plan';
          subtype = 'master_layout_plan';
          title = matchingPageType.title || `${projectName} Master Site Layout`;
          description = matchingPageType.description || `Master site and layout plan extracted from developer brochure.`;
        } else if (pt.includes('amenit')) {
          assetType = 'amenity';
          subtype = 'amenities_page';
          title = matchingPageType.title || `${projectName} Lifestyle Amenities`;
          description = matchingPageType.description || `Curated lifestyle amenities extracted from developer brochure.`;
        } else if (pt.includes('cover')) {
          assetType = 'cover';
          subtype = 'front_facade';
          title = matchingPageType.title || `${projectName} Main Cover & Facade`;
          description = matchingPageType.description || `Official developer brochure cover and elevation for ${projectName}.`;
        } else if (pt.includes('elevation')) {
          assetType = 'elevation';
          subtype = 'elevation_view';
          title = matchingPageType.title || `${projectName} Architectural Render`;
          description = matchingPageType.description || `Architectural view from developer brochure.`;
        } else if (pt.includes('spec')) {
          assetType = 'specifications';
          subtype = 'specifications_table';
          title = matchingPageType.title || `${projectName} Technical Specifications`;
          description = `Technical specifications table extracted from brochure.`;
        } else {
          assetType = 'brochure_photo';
          subtype = 'brochure_page';
          title = matchingPageType.title || `${projectName} Page ${pageNum}`;
          description = matchingPageType.description || description;
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
      } else if (pageNum === 2 && totalRendered >= 4) {
        assetType = 'elevation';
        subtype = 'elevation_view';
        title = `${projectName} 3D Architectural Perspective`;
        description = `Architectural exterior perspective from developer brochure.`;
      } else {
        assetType = 'brochure_photo';
        subtype = 'brochure_page';
        title = `${projectName} Page ${pageNum}`;
        description = `High-resolution original brochure page ${pageNum} for ${projectName}.`;
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

    // Fallback: If no pages were rendered, populate finalAssets with validated raw images (max 10)
    if (finalAssets.length === 0 && rawImages.length > 0) {
      rawImages.slice(0, 10).forEach((img, idx) => {
        finalAssets.push({
          pageNumber: idx + 1,
          assetType: idx === 0 ? 'cover' : 'elevation',
          subtype: 'embedded_image',
          title: `${projectName} Photo ${idx + 1}`,
          description: `High-resolution original asset extracted from ${originalFilename}.`,
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
