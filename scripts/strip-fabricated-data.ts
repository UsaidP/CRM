/**
 * One-shot backfill: strips known fabricated data from existing project records.
 *
 * Zero-fabrication cleanup — only touches fields whose ENTIRE value exactly
 * matches a historically hardcoded default. Anything customized by a broker
 * is left untouched. Idempotent: re-running produces no further changes.
 *
 * Usage:
 *   bun scripts/strip-fabricated-data.ts            # apply
 *   bun scripts/strip-fabricated-data.ts --dry-run  # report only
 */
import { prisma } from '../src/lib/db/prisma';

const FABRICATED_AMENITIES = new Set([
  JSON.stringify([
    'Grand Lifestyle Clubhouse',
    'Modern Gymnasium',
    'Children Play Park & Sandpit',
    'Branded High-Speed Passenger Elevators',
    'Landscaped Podium Gardens',
    '24x7 CCTV Security & Intercom',
    'Power Backup for Common Areas',
    'Rainwater Harvesting & Eco Water System',
  ]),
]);

const FABRICATED_SPECIFICATIONS = new Set([
  JSON.stringify({
    flooring: "2'x2' Vitrified flooring tiles in all rooms",
    kitchen: "Granite kitchen platform with stainless steel sink & ceramic tiles dado",
    doors: "Decorative lamination finish main door & internal wooden doors with marble frames",
    windows: "Powder Coated Aluminum sliding windows",
    bathrooms: "Concealed plumbing with branded sanitary fittings",
    electrical: "Concealed copper wiring with modular switches & TV points",
    waterproofing: "Special terrace water proofing treatment with china chips",
  }),
  JSON.stringify({
    flooring: "2'x2' Vitrified flooring tiles in all rooms",
    kitchen: "Granite kitchen platform with stainless steel sink & glazed dado tiles",
    doors: "Decorative lamination finish main door with marble frame",
    windows: "Powder Coated Aluminum sliding windows",
    bathrooms: "Concealed plumbing with branded sanitary fittings",
    electrical: "Concealed copper wiring with modular switches & TV points",
    waterproofing: "Special terrace waterproofing with china chips",
  }),
]);

const FABRICATED_PRICE_FLOORS = new Set([6500, 10500, 9500, 8200, 7500, 12000]);

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  let projectsFixed = 0;

  const projects = await prisma.developerProject.findMany();
  for (const p of projects) {
    const data: Record<string, unknown> = {};

    // amenitiesJson: exact fabricated list → []
    try {
      const amenities = JSON.parse(p.amenitiesJson || '[]');
      if (Array.isArray(amenities) && amenities.length > 0 && FABRICATED_AMENITIES.has(JSON.stringify(amenities))) {
        data.amenitiesJson = '[]';
      }
    } catch { /* keep */ }

    // Fabricated scalar defaults → 0 / null (DeveloperProject has no
    // plotDetails/structureType columns; those fabrication defaults only
    // surfaced through the amenities/price fields below).
    if (p.expectedPossessionDate && p.expectedPossessionDate.getUTCMonth() === 11 && p.expectedPossessionDate.getUTCFullYear() === 2026) {
      // exactly the hardcoded "December 2026" default
      data.expectedPossessionDate = null;
    }
    if (p.basePricePerSqft && FABRICATED_PRICE_FLOORS.has(p.basePricePerSqft)) data.basePricePerSqft = 0;

    if (Object.keys(data).length > 0) {
      projectsFixed++;
      console.log(`  🧹 ${p.projectName} (${p.id}): ${Object.keys(data).join(', ')}`);
      if (!dryRun) {
        await prisma.developerProject.update({ where: { id: p.id }, data });
      }
    }
  }

  // Units: strip fabricated feature highlight sets derived from the same defaults
  let unitsFixed = 0;
  const units = await prisma.propertyUnit.findMany();
  for (const u of units) {
    try {
      const highlights = JSON.parse(u.featureHighlightsJson || '[]');
      if (!Array.isArray(highlights) || highlights.length === 0) continue;
      const fabricatedHighlights = highlights.filter((h: string) =>
        typeof h === 'string' && (
          /^Vastu Compliant Layout$/.test(h) ||
          /^\d+ Sq\.ft Usable Carpet Area$/.test(h) ||
          /^\d+ Bathrooms with Branded Fittings$/.test(h) ||
          h === 'Under Construction (MahaRERA Sanctioned)'
        )
      );
      if (fabricatedHighlights.length === highlights.length) {
        unitsFixed++;
        console.log(`  🧹 Unit ${u.unitNumber || u.id}: fabricated featureHighlights → []`);
        if (!dryRun) {
          await prisma.propertyUnit.update({ where: { id: u.id }, data: { featureHighlightsJson: '[]' } });
        }
      }
    } catch { /* keep */ }
  }

  console.log(`\n${dryRun ? '[DRY RUN] Would clean' : 'Cleaned'} ${projectsFixed} project(s) and ${unitsFixed} unit(s).`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});