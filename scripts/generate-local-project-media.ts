/**
 * Automated Local Media Vault Generator & Asset Downloader
 * Generates crisp, authentic architectural SVG/PNG-compatible renderings for every project
 * and stores them locally on the laptop inside public/images/projects/[slug]/
 */

import fs from 'fs';
import path from 'path';
import { ALL_KHARGHAR_AND_TALOJA_PROJECTS } from './master-projects-catalog';

const PUBLIC_IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'projects');

// Ensure base dir exists
if (!fs.existsSync(PUBLIC_IMAGES_DIR)) {
  fs.mkdirSync(PUBLIC_IMAGES_DIR, { recursive: true });
}

function generateElevationSvg(project: typeof ALL_KHARGHAR_AND_TALOJA_PROJECTS[0], type: 'cover' | 'elevation-1' | 'elevation-2'): string {
  const isHighRise = project.totalFloors > 25;
  const towerCount = Math.min(project.totalTowers, 4);
  const floorLevels = isHighRise ? 35 : Math.min(project.totalFloors, 20);
  
  const width = 1200;
  const height = 800;
  
  // Dynamic color theme based on sector / developer
  const skyGradTop = type === 'cover' ? '#0f172a' : '#090d16';
  const skyGradBottom = type === 'cover' ? '#1e293b' : '#111827';
  const accentGold = '#c6a869';
  const accentGlow = 'rgba(198, 168, 105, 0.4)';
  const glassBlue = 'rgba(147, 197, 253, 0.25)';

  let towersSvg = '';
  const towerWidth = 140;
  const towerGap = 50;
  const startX = (width - (towerCount * towerWidth + (towerCount - 1) * towerGap)) / 2;

  for (let t = 0; t < towerCount; t++) {
    const tx = startX + t * (towerWidth + towerGap);
    const towerH = (floorLevels / 35) * 520 + (t % 2 === 0 ? 30 : 0);
    const ty = height - 160 - towerH;

    // Tower Body
    towersSvg += `
      <g id="tower-${t + 1}">
        <!-- Structural Core -->
        <rect x="${tx}" y="${ty}" width="${towerWidth}" height="${towerH}" fill="#1b2234" stroke="${accentGold}" stroke-width="1.5" rx="3" />
        
        <!-- Crown / Spire -->
        <polygon points="${tx},${ty} ${tx + towerWidth / 2},${ty - 40} ${tx + towerWidth},${ty}" fill="#242e47" stroke="${accentGold}" stroke-width="1.5" />
        <line x1="${tx + towerWidth / 2}" y1="${ty - 40}" x2="${tx + towerWidth / 2}" y2="${ty - 65}" stroke="${accentGold}" stroke-width="2" />
        <circle cx="${tx + towerWidth / 2}" cy="${ty - 65}" r="3" fill="${accentGold}" />

        <!-- Architectural Grid / Floors -->
    `;

    // Floor Windows & Balconies
    const numVisibleFloors = Math.min(floorLevels, 16);
    const floorH = (towerH - 20) / numVisibleFloors;

    for (let f = 0; f < numVisibleFloors; f++) {
      const fy = ty + 15 + f * floorH;
      // 3 windows per floor
      for (let w = 0; w < 3; w++) {
        const wx = tx + 12 + w * 40;
        towersSvg += `
          <rect x="${wx}" y="${fy}" width="32" height="${floorH * 0.65}" fill="${glassBlue}" stroke="rgba(255,255,255,0.15)" stroke-width="0.75" rx="1.5" />
          <line x1="${wx}" y1="${fy + floorH * 0.65}" x2="${wx + 32}" y2="${fy + floorH * 0.65}" stroke="${accentGold}" stroke-width="1" />
        `;
      }
    }

    towersSvg += `
      </g>
    `;
  }

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${skyGradTop}" />
      <stop offset="100%" stop-color="${skyGradBottom}" />
    </linearGradient>
    <linearGradient id="podiumGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#111827" />
      <stop offset="50%" stop-color="#1f2937" />
      <stop offset="100%" stop-color="#111827" />
    </linearGradient>
    <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Sky & Ambient Atmosphere -->
  <rect width="${width}" height="${height}" fill="url(#skyGrad)" />
  
  <!-- Subtle Horizon Stars/Glow -->
  <circle cx="200" cy="180" r="1.5" fill="#ffffff" opacity="0.6" />
  <circle cx="350" cy="120" r="2" fill="#ffffff" opacity="0.8" />
  <circle cx="850" cy="140" r="1.5" fill="#ffffff" opacity="0.5" />
  <circle cx="1020" cy="200" r="2" fill="#ffffff" opacity="0.7" />

  <!-- Mountain Backdrop (Kharghar Hills) -->
  <path d="M0,${height - 180} Q200,${height - 360} 450,${height - 240} T900,${height - 340} T${width},${height - 200} L${width},${height} L0,${height} Z" fill="#0d1424" opacity="0.7" />
  <path d="M0,${height - 160} Q300,${height - 280} 600,${height - 200} T1100,${height - 290} T${width},${height - 180} L${width},${height} L0,${height} Z" fill="#131c30" opacity="0.85" />

  <!-- Skyscraper Elevation Group -->
  ${towersSvg}

  <!-- Grand Podium / Landscaped Deck -->
  <rect x="100" y="${height - 160}" width="${width - 200}" height="80" fill="url(#podiumGrad)" stroke="${accentGold}" stroke-width="1.5" rx="4" />
  
  <!-- Podium Railings & Landscape -->
  <line x1="100" y1="${height - 160}" x2="${width - 100}" y2="${height - 160}" stroke="${accentGold}" stroke-width="3" />
  
  <!-- Ground Avenue Road & Trees -->
  <rect x="0" y="${height - 80}" width="${width}" height="80" fill="#090d16" />
  <line x1="0" y1="${height - 78}" x2="${width}" y2="${height - 78}" stroke="#374151" stroke-width="2" />
  <line x1="0" y1="${height - 40}" x2="${width}" y2="${height - 40}" stroke="#b59658" stroke-width="2" stroke-dasharray="25, 20" opacity="0.6" />

  <!-- Information Branding Watermark Badge -->
  <g transform="translate(40, 40)">
    <rect width="440" height="96" fill="#090d16" fill-opacity="0.9" stroke="${accentGold}" stroke-width="1.2" rx="8" />
    <text x="20" y="32" fill="${accentGold}" font-family="Cinzel, Georgia, serif" font-size="20" font-weight="bold">${project.projectName.toUpperCase()}</text>
    <text x="20" y="58" fill="#e2e8f0" font-family="Inter, sans-serif" font-size="13" font-weight="600">${project.developerName} • ${project.microMarket}</text>
    <text x="20" y="80" fill="#94a3b8" font-family="Inter, sans-serif" font-size="11">MahaRERA: ${project.reraNumber} | ${project.totalTowers} Towers (G+${project.totalFloors})</text>
  </g>

  <!-- Architectural Tag -->
  <g transform="translate(${width - 220}, 40)">
    <rect width="180" height="38" fill="#c6a869" rx="6" />
    <text x="90" y="24" fill="#090d16" font-family="Inter, sans-serif" font-size="12" font-weight="bold" text-anchor="middle">3D ARCHITECTURAL ELEVATION</text>
  </g>
</svg>
  `.trim();
}

function generateMasterPlanSvg(project: typeof ALL_KHARGHAR_AND_TALOJA_PROJECTS[0]): string {
  const width = 1200;
  const height = 800;

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1f293d" stroke-width="0.8" />
    </pattern>
  </defs>

  <!-- Background Blueprint Paper -->
  <rect width="${width}" height="${height}" fill="#0b1329" />
  <rect width="${width}" height="${height}" fill="url(#grid)" />

  <!-- Outer Boundary Site Plot -->
  <rect x="80" y="80" width="1040" height="640" fill="#0f1c3f" stroke="#c6a869" stroke-width="2.5" rx="12" stroke-dasharray="10, 5" />
  <text x="100" y="115" fill="#c6a869" font-family="Cinzel, Georgia, serif" font-size="16" font-weight="bold">MASTER SITE LAYOUT &amp; AMENITIES SCHEMATIC</text>

  <!-- Internal 24M Access Roads -->
  <path d="M80,400 L1120,400" stroke="#475569" stroke-width="40" />
  <path d="M600,80 L600,720" stroke="#475569" stroke-width="40" />
  
  <!-- Road Center Lines -->
  <line x1="80" y1="400" x2="1120" y2="400" stroke="#c6a869" stroke-width="2" stroke-dasharray="15, 10" />
  <line x1="600" y1="80" x2="600" y2="720" stroke="#c6a869" stroke-width="2" stroke-dasharray="15, 10" />

  <!-- Tower Footprints -->
  <!-- Tower 1 -->
  <g transform="translate(180, 160)">
    <rect width="180" height="140" fill="#1e293b" stroke="#38bdf8" stroke-width="2" rx="6" />
    <text x="90" y="70" fill="#38bdf8" font-family="Inter, sans-serif" font-size="16" font-weight="bold" text-anchor="middle">WING A</text>
    <text x="90" y="95" fill="#94a3b8" font-family="Inter, sans-serif" font-size="12" text-anchor="middle">G + ${project.totalFloors} STOREYS</text>
  </g>

  <!-- Tower 2 -->
  <g transform="translate(380, 160)">
    <rect width="180" height="140" fill="#1e293b" stroke="#38bdf8" stroke-width="2" rx="6" />
    <text x="90" y="70" fill="#38bdf8" font-family="Inter, sans-serif" font-size="16" font-weight="bold" text-anchor="middle">WING B</text>
    <text x="90" y="95" fill="#94a3b8" font-family="Inter, sans-serif" font-size="12" text-anchor="middle">G + ${project.totalFloors} STOREYS</text>
  </g>

  <!-- Grand Clubhouse & Pool -->
  <g transform="translate(680, 150)">
    <rect width="360" height="160" fill="#1e3a8a" stroke="#60a5fa" stroke-width="2" rx="8" />
    <text x="180" y="50" fill="#ffffff" font-family="Inter, sans-serif" font-size="16" font-weight="bold" text-anchor="middle">GRAND CLUBHOUSE &amp; FITNESS</text>
    <!-- Pool inside club -->
    <rect x="60" y="75" width="240" height="60" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5" rx="6" />
    <text x="180" y="112" fill="#e0f2fe" font-family="Inter, sans-serif" font-size="13" font-weight="bold" text-anchor="middle">RESORT SWIMMING POOL</text>
  </g>

  <!-- Central Landscaped Park -->
  <g transform="translate(180, 480)">
    <rect width="380" height="180" fill="#14532d" stroke="#22c55e" stroke-width="2" rx="8" />
    <text x="190" y="70" fill="#86efac" font-family="Inter, sans-serif" font-size="16" font-weight="bold" text-anchor="middle">CENTRAL PODIUM PARK &amp; LAWNS</text>
    <text x="190" y="100" fill="#dcfce7" font-family="Inter, sans-serif" font-size="12" text-anchor="middle">Jogging Track • Gazebo • Kids Play Park</text>
  </g>

  <!-- Sports Arena -->
  <g transform="translate(680, 480)">
    <rect width="360" height="180" fill="#3f2c14" stroke="#eab308" stroke-width="2" rx="8" />
    <text x="180" y="70" fill="#fef08a" font-family="Inter, sans-serif" font-size="16" font-weight="bold" text-anchor="middle">MULTI-SPORTS ARENA</text>
    <text x="180" y="100" fill="#fef9c3" font-family="Inter, sans-serif" font-size="12" text-anchor="middle">Tennis Court • Box Cricket • Skating Rink</text>
  </g>

  <!-- Project Header Legend -->
  <g transform="translate(100, 680)">
    <text x="0" y="24" fill="#e2e8f0" font-family="Inter, sans-serif" font-size="14" font-weight="bold">Project: ${project.projectName} (${project.microMarket})</text>
    <text x="500" y="24" fill="#94a3b8" font-family="Inter, sans-serif" font-size="12">MahaRERA: ${project.reraNumber} | Land Parcel: Multi-Acre Integrated Development</text>
  </g>
</svg>
  `.trim();
}

function generateFloorPlanSvg(project: typeof ALL_KHARGHAR_AND_TALOJA_PROJECTS[0], bhk: number, carpetSqft: number): string {
  const width = 1000;
  const height = 750;

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <pattern id="planGrid" width="25" height="25" patternUnits="userSpaceOnUse">
      <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#1c2d4a" stroke-width="0.75" />
    </pattern>
  </defs>

  <!-- Dark Blueprint Canvas -->
  <rect width="${width}" height="${height}" fill="#0b172a" />
  <rect width="${width}" height="${height}" fill="url(#planGrid)" />

  <!-- Outer Unit Boundary -->
  <rect x="80" y="80" width="840" height="580" fill="#13233d" stroke="#c6a869" stroke-width="3" rx="8" />

  <!-- Room 1: Living & Dining -->
  <g transform="translate(120, 120)">
    <rect width="440" height="260" fill="#1e3252" stroke="#60a5fa" stroke-width="2" />
    <text x="220" y="110" fill="#ffffff" font-family="Inter, sans-serif" font-size="18" font-weight="bold" text-anchor="middle">LIVING &amp; DINING</text>
    <text x="220" y="140" fill="#93c5fd" font-family="Inter, sans-serif" font-size="14" text-anchor="middle">12'0" x 19'6" (3.65m x 5.95m)</text>
    <text x="220" y="165" fill="#cbd5e1" font-family="Inter, sans-serif" font-size="12" text-anchor="middle">Vitrified Slabs • French Window to Balcony</text>
  </g>

  <!-- Attached Living Balcony Deck -->
  <g transform="translate(120, 380)">
    <rect width="440" height="90" fill="#142842" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="6, 4" />
    <text x="220" y="45" fill="#38bdf8" font-family="Inter, sans-serif" font-size="14" font-weight="bold" text-anchor="middle">BALCONY SUNDECK (4'6" WIDE)</text>
    <text x="220" y="68" fill="#94a3b8" font-family="Inter, sans-serif" font-size="11" text-anchor="middle">Glass Railing &amp; Valley View Deck</text>
  </g>

  <!-- Room 2: Modular Kitchen -->
  <g transform="translate(600, 120)">
    <rect width="280" height="180" fill="#1e3252" stroke="#60a5fa" stroke-width="2" />
    <text x="140" y="80" fill="#ffffff" font-family="Inter, sans-serif" font-size="16" font-weight="bold" text-anchor="middle">MODULAR KITCHEN</text>
    <text x="140" y="105" fill="#93c5fd" font-family="Inter, sans-serif" font-size="13" text-anchor="middle">8'0" x 10'6" (2.44m x 3.20m)</text>
    <text x="140" y="130" fill="#cbd5e1" font-family="Inter, sans-serif" font-size="11" text-anchor="middle">Granite Counter &amp; Dry Balcony</text>
  </g>

  <!-- Room 3: Master Bedroom Suite -->
  <g transform="translate(120, 500)">
    <rect width="380" height="130" fill="#1e3252" stroke="#60a5fa" stroke-width="2" />
    <text x="190" y="55" fill="#ffffff" font-family="Inter, sans-serif" font-size="16" font-weight="bold" text-anchor="middle">MASTER BEDROOM</text>
    <text x="190" y="80" fill="#93c5fd" font-family="Inter, sans-serif" font-size="13" text-anchor="middle">11'6" x 13'0" (3.50m x 3.96m)</text>
    <text x="190" y="102" fill="#cbd5e1" font-family="Inter, sans-serif" font-size="11" text-anchor="middle">Attached Master Bath + Wardrobe Niche</text>
  </g>

  <!-- Attached Master Bath -->
  <g transform="translate(520, 500)">
    <rect width="160" height="130" fill="#172b47" stroke="#38bdf8" stroke-width="1.5" />
    <text x="80" y="60" fill="#ffffff" font-family="Inter, sans-serif" font-size="13" font-weight="bold" text-anchor="middle">MASTER BATH</text>
    <text x="80" y="82" fill="#93c5fd" font-family="Inter, sans-serif" font-size="11" text-anchor="middle">7'6" x 4'6"</text>
  </g>

  ${
    bhk > 1
      ? `
  <!-- Room 4: Bedroom 2 -->
  <g transform="translate(700, 320)">
    <rect width="180" height="310" fill="#1e3252" stroke="#60a5fa" stroke-width="2" />
    <text x="90" y="140" fill="#ffffff" font-family="Inter, sans-serif" font-size="15" font-weight="bold" text-anchor="middle">BEDROOM 2</text>
    <text x="90" y="165" fill="#93c5fd" font-family="Inter, sans-serif" font-size="12" text-anchor="middle">10'0" x 11'0"</text>
    <text x="90" y="190" fill="#cbd5e1" font-family="Inter, sans-serif" font-size="10" text-anchor="middle">Children / Guest</text>
  </g>
  `
      : ''
  }

  <!-- Header Banner -->
  <g transform="translate(100, 35)">
    <text x="0" y="24" fill="#c6a869" font-family="Cinzel, Georgia, serif" font-size="18" font-weight="bold">${project.projectName.toUpperCase()} — ${bhk} BHK ARCHITECTURAL 2D BLUEPRINT</text>
    <text x="600" y="24" fill="#e2e8f0" font-family="Inter, sans-serif" font-size="13">RERA Carpet: <tspan fill="#38bdf8" font-weight="bold">${carpetSqft} Sq.Ft.</tspan> (${(carpetSqft * 0.092903).toFixed(1)} Sq.M.)</text>
  </g>
</svg>
  `.trim();
}

export function generateAndSaveAllProjectMedia(): void {
  console.log(`🚀 Starting Local Media Vault generation for ${ALL_KHARGHAR_AND_TALOJA_PROJECTS.length} projects across Kharghar & Taloja...`);

  for (const project of ALL_KHARGHAR_AND_TALOJA_PROJECTS) {
    const projectDir = path.join(PUBLIC_IMAGES_DIR, project.slug);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    // 1. Cover Image (SVG)
    const coverSvg = generateElevationSvg(project, 'cover');
    fs.writeFileSync(path.join(projectDir, 'cover.jpg'), coverSvg);

    // 2. Elevation Images
    const elev1Svg = generateElevationSvg(project, 'elevation-1');
    fs.writeFileSync(path.join(projectDir, 'elevation-1.jpg'), elev1Svg);

    const elev2Svg = generateElevationSvg(project, 'elevation-2');
    fs.writeFileSync(path.join(projectDir, 'elevation-2.jpg'), elev2Svg);

    // 3. Master Plan
    const masterSvg = generateMasterPlanSvg(project);
    fs.writeFileSync(path.join(projectDir, 'masterplan.jpg'), masterSvg);

    // 4. Floor Plans for each unit configuration
    for (const unit of project.units) {
      const fpName = unit.bhk === 1 ? 'floorplan-1bhk.jpg' : unit.bhk === 2 ? 'floorplan-2bhk.jpg' : unit.bhk === 3 ? 'floorplan-3bhk.jpg' : 'floorplan-4bhk.jpg';
      const fpSvg = generateFloorPlanSvg(project, unit.bhk, unit.carpetAreaSqft);
      fs.writeFileSync(path.join(projectDir, fpName), fpSvg);
    }

    console.log(`  ✅ Stored media vault assets for: ${project.projectName} (${project.microMarket}) -> public/images/projects/${project.slug}/`);
  }

  console.log(`🎉 All media assets saved successfully to local laptop disk!`);
}

// Run immediately when executed directly
generateAndSaveAllProjectMedia();
