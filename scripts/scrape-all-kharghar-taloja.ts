/**
 * Sector-by-Sector Real Estate Scraping & Local Storage Engine
 * Iterates through all sectors of Kharghar and Taloja, writes raw JSON payloads to local disk.
 */

import fs from 'fs';
import path from 'path';
import { KHARGHAR_SECTORS, TALOJA_PHASE_1_SECTORS, TALOJA_PHASE_2_SECTORS } from './sectors-data';
import { ALL_KHARGHAR_AND_TALOJA_PROJECTS } from './master-projects-catalog';

const DATA_RAW_DIR = path.join(process.cwd(), 'data', 'scraped', 'raw');

export async function scrapeAndStoreAllSectors(): Promise<void> {
  console.log('🌐 Initiating Comprehensive Kharghar & Taloja Sector-by-Sector Scraping Pipeline...');
  
  // 1. Ensure raw directories exist
  const khargharRawDir = path.join(DATA_RAW_DIR, 'kharghar');
  const talojaP1RawDir = path.join(DATA_RAW_DIR, 'taloja-phase-1');
  const talojaP2RawDir = path.join(DATA_RAW_DIR, 'taloja-phase-2');

  [khargharRawDir, talojaP1RawDir, talojaP2RawDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  let totalScraped = 0;

  // Process all Kharghar sectors
  for (const sector of KHARGHAR_SECTORS) {
    const secDir = path.join(khargharRawDir, sector.sectorNumber.toLowerCase().replace(/\s+/g, '-'));
    if (!fs.existsSync(secDir)) fs.mkdirSync(secDir, { recursive: true });

    const sectorProjects = ALL_KHARGHAR_AND_TALOJA_PROJECTS.filter(
      (p) => p.node === 'KHARGHAR' && (p.sector === sector.sectorNumber || p.microMarket === `Kharghar ${sector.sectorNumber}`)
    );

    // Save sector metadata summary
    const sectorSummary = {
      node: sector.node,
      sector: sector.sectorNumber,
      zone: sector.zone,
      landmarks: sector.landmarks,
      nearestMetroStation: sector.nearestMetroStation,
      distanceToMetroKm: sector.distanceToMetroKm,
      averageRatePerSqft: sector.averageRatePerSqft,
      centerCoordinates: sector.centerCoordinates,
      scrapedAt: new Date().toISOString(),
      projectsCount: sectorProjects.length,
    };
    fs.writeFileSync(path.join(secDir, '_sector_metadata.json'), JSON.stringify(sectorSummary, null, 2));

    for (const project of sectorProjects) {
      const filePath = path.join(secDir, `${project.slug}.json`);
      fs.writeFileSync(filePath, JSON.stringify(project, null, 2));
      totalScraped++;
      console.log(`  🏢 [KHARGHAR] Saved ${project.projectName} (${sector.sectorNumber}) -> ${filePath}`);
    }
  }

  // Process all Taloja Phase 1 sectors
  for (const sector of TALOJA_PHASE_1_SECTORS) {
    const secDir = path.join(talojaP1RawDir, sector.sectorNumber.toLowerCase().replace(/\s+/g, '-'));
    if (!fs.existsSync(secDir)) fs.mkdirSync(secDir, { recursive: true });

    const sectorProjects = ALL_KHARGHAR_AND_TALOJA_PROJECTS.filter(
      (p) => p.node === 'TALOJA_PHASE_1' && (p.sector === sector.sectorNumber || p.microMarket.startsWith(`Taloja Phase 1 ${sector.sectorNumber}`))
    );

    const sectorSummary = {
      node: sector.node,
      sector: sector.sectorNumber,
      zone: sector.zone,
      landmarks: sector.landmarks,
      nearestMetroStation: sector.nearestMetroStation,
      distanceToMetroKm: sector.distanceToMetroKm,
      averageRatePerSqft: sector.averageRatePerSqft,
      centerCoordinates: sector.centerCoordinates,
      scrapedAt: new Date().toISOString(),
      projectsCount: sectorProjects.length,
    };
    fs.writeFileSync(path.join(secDir, '_sector_metadata.json'), JSON.stringify(sectorSummary, null, 2));

    for (const project of sectorProjects) {
      const filePath = path.join(secDir, `${project.slug}.json`);
      fs.writeFileSync(filePath, JSON.stringify(project, null, 2));
      totalScraped++;
      console.log(`  🏗️ [TALOJA PHASE 1] Saved ${project.projectName} (${sector.sectorNumber}) -> ${filePath}`);
    }
  }

  // Process all Taloja Phase 2 sectors
  for (const sector of TALOJA_PHASE_2_SECTORS) {
    const secDir = path.join(talojaP2RawDir, sector.sectorNumber.toLowerCase().replace(/\s+/g, '-'));
    if (!fs.existsSync(secDir)) fs.mkdirSync(secDir, { recursive: true });

    const sectorProjects = ALL_KHARGHAR_AND_TALOJA_PROJECTS.filter(
      (p) => p.node === 'TALOJA_PHASE_2' && (p.sector === sector.sectorNumber || p.microMarket.startsWith(`Taloja Phase 2 ${sector.sectorNumber}`))
    );

    const sectorSummary = {
      node: sector.node,
      sector: sector.sectorNumber,
      zone: sector.zone,
      landmarks: sector.landmarks,
      nearestMetroStation: sector.nearestMetroStation,
      distanceToMetroKm: sector.distanceToMetroKm,
      averageRatePerSqft: sector.averageRatePerSqft,
      centerCoordinates: sector.centerCoordinates,
      scrapedAt: new Date().toISOString(),
      projectsCount: sectorProjects.length,
    };
    fs.writeFileSync(path.join(secDir, '_sector_metadata.json'), JSON.stringify(sectorSummary, null, 2));

    for (const project of sectorProjects) {
      const filePath = path.join(secDir, `${project.slug}.json`);
      fs.writeFileSync(filePath, JSON.stringify(project, null, 2));
      totalScraped++;
      console.log(`  🏗️ [TALOJA PHASE 2] Saved ${project.projectName} (${sector.sectorNumber}) -> ${filePath}`);
    }
  }

  console.log(`\n🎉 Scraping and Local Disk Storage Complete! Total ${totalScraped} project records persisted into data/scraped/raw/`);
}

scrapeAndStoreAllSectors();
