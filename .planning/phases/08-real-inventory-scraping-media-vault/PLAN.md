# Phase 8 Plan: Full-Scale Real Estate Scraping & Local Media Vault (Kharghar & Taloja All Sectors)

**Phase**: 08  
**Name**: Full-Scale Real Estate Scraping & Local Media Vault (All Kharghar & Taloja Sectors)  
**Agents**: `/agency-software-architect`, `/agency-backend-architect`, `/agency-data-engineer`  
**Status**: Ready for Execution  

---

## 1. Executive Summary & Full-Scale Scope

Phase 8 scrapes, extracts, downloads locally, cleans, and ingests **ALL real estate developments across every single sector of Kharghar and Taloja from start to finish**:

- **Kharghar Node (Sectors 1 to 40+)**:
  - Lower/Station Belt: Sectors 1, 2, 3, 4
  - Utsav Chowk / Belpada / Little World Belt: Sectors 5, 6, 7
  - Central Park / ISKCON / Golf Course / Valley: Sectors 19, 20, 21, 22, 23
  - Shilp Chowk / Hiranandani Complex / Prime Central: Sectors 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18
  - Sector 24 through 33 (Prime Mid-to-High Rise Corridor)
  - Upper Kharghar Hill View & Mega-Township Belt: Sectors 34 (A/B/C/D/E), 35 (D/E/F/G/I), 36, 37, 38, 39, 40+
- **Taloja Node (Phase 1 & Phase 2)**:
  - Taloja Phase 1: Sectors 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16
  - Taloja Phase 2: Sectors 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 39 (Panchnand, Koynavale, Pendhar Metro Connectivity Belt, CIDCO Mega Housing & Private Townships)

---

## 2. Pipeline Execution Steps

### Step 1: Sector-by-Sector Scraping Engine
- Build `scripts/scrape-all-kharghar-taloja.ts`
- Iterates sector by sector across all Kharghar & Taloja sectors.
- Extracts real MahaRERA numbers, developer legal entities, exact GPS coordinates, possession dates, floor counts, unit configurations (1, 2, 3, 4 BHK), carpet areas, agreement values, statutory charges, amenities, and developer sales contacts.
- Saves raw sector JSON dumps in `data/scraped/raw/[node]/[sector]/[project-slug].json`.

### Step 2: Local Laptop Storage & Media Vault
- Build `scripts/download-all-project-media.ts`
- Downloads genuine high-resolution building elevations, master layout maps, and 2D floor plans directly into `public/images/projects/[project-slug]/`.
- Strictly excludes generic interior furniture/staging photos.

### Step 3: Data Cleaning & Normalization
- Build `scripts/clean-master-inventory.ts`
- Normalizes area matrices (RERA carpet in sqft/sqm, built-up, super-built-up with transparent CIDCO loading).
- Computes exact statutory all-inclusive pricing ($C_{\text{all-in}}$ with 6% Stamp Duty, ₹30,000 Registration, GST 5% for under-construction vs 0% for OC, parking and society development fees).
- Compiles the master consolidated JSON: `data/scraped/master_kharghar_taloja_inventory.json`.

### Step 4: CRM Database Ingestion & UI Integration
- Ingest master inventory into Prisma (`DeveloperProject`, `PropertyUnit`).
- Update `src/lib/domain/property-scraper.ts` and `prisma/seed.js`.
- Update `InventoryClient`, `ProjectDetailsModal`, `ScraperControlModal`, and client portals with sector-level filtering and local image rendering.
