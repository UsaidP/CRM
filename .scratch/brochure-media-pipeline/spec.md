# Brochure & Media Extraction Pipeline Spec

## 1. Overview & Problem Statement
The Real Estate CRM inventory module ingests developer brochure documents (PDFs and high-resolution images) to extract architectural elevations, sanctioned floor plans, master layout blueprints, MahaRERA statutory registrations, and developer POC data.

Previously, prototype code in `pdf-image-extractor.ts` and `brochure-parser-service.ts` included mock mappings and hardcoded fallback assumptions (such as fallback MahaRERA registration number `P52000079818`, hardcoded 445/650 sqft carpet areas, and hardcoded statutory parking/society charges).

This specification establishes zero-fabrication standards across the extraction pipeline, provides unified asset URL resolution and gallery parsing, implements direct signed uploads for large brochures, and coordinates atomic server-side project persistence.

---

## 2. Architectural Decisions & Seams

### 2.1 Zero-Fabrication Policy
- **MahaRERA Registration**: If no valid 12-character format (`P\d{11}`) is discovered in the brochure text or vision stream, `reraNumber` is returned as `undefined`. No default/placeholder registration number is generated.
- **Unit Layouts & Carpet Areas**: Units are only generated for BHK configurations explicitly discovered in the document. Carpet area is populated only when explicitly detected (otherwise `0`), and statutory calculations only run when valid carpet areas and prices exist.
- **Dynamic Extraction**: In `pdf-image-extractor.ts`, rendered page scans and raw PDF image streams are extracted purely dynamically using `pdftoppm` / `pdfimages` without project-specific file mappings.

### 2.2 Shared Media Utilities (`src/lib/inventory-media.ts`)
- `resolveAssetUrl(asset)`: Accepts strings, uploaded media asset objects (`{ secureUrl, url, file_url }`), and nested asset structures, returning a clean trimmed URL.
- `parseGalleryUrls(value)`: Gracefully parses strings, JSON arrays, or object arrays into a clean `string[]` of URLs.

### 2.3 Direct Signed Cloudinary Upload & Body Size Limits
- Brochures larger than 4MB can be signed via `/api/v1/media/sign-upload` and directly uploaded from the browser to Cloudinary.
- The resulting remote URL is passed to `/api/v1/inventory/upload-brochure` as `{ brochureUrl: string, projectId?: string }`, avoiding client memory bloat.
- Next 16's `proxyClientMaxBodySize: '100mb'` in `next.config.js` is preserved for large multi-part requests.

### 2.4 Server-Side Atomic Sync
- When `projectId` is passed to `/api/v1/inventory/upload-brochure`, the route extracts all specifications, fetches the existing database project record, merges galleries, updates cover images, master plan URLs, and developer POCs, and writes to SQLite/Prisma atomically.
- Returns `data.updatedProject` to eliminate redundant client-side PUT calls.

---

## 3. UI Token Standards & Accessible Dialogs
- High-contrast dialogs and lightboxes use semantic design tokens: `bg-surface`, `bg-surface-raised`, `border-border`, `text-content`, `text-content-muted`, and `bg-accent` / `text-white` for action buttons.
- `CustomSelect` options return labels cleanly without fragile regex stripping.
