/**
 * Verification of Duplicate Project Prevention & Unit Synchronization
 */
import { prisma } from '../src/lib/db/prisma';

console.log('🧪 Testing Duplicate Project Prevention & Deduplication...');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runDeduplicationTest() {
  // 1. Setup sample organization
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'ZamZam Properties Real Estate',
        slug: 'zamzam-properties-dedup',
        reraBrokerRegistration: 'A52000028714',
      },
    });
  }

  // Clean up any test duplicates
  await prisma.propertyUnit.deleteMany({
    where: { project: { reraNumber: 'P52000079818' } },
  });
  await prisma.developerProject.deleteMany({
    where: { reraNumber: 'P52000079818' },
  });

  // Count projects before
  const initialProjectCount = await prisma.developerProject.count({
    where: { reraNumber: 'P52000079818' },
  });
  assert(initialProjectCount === 0, 'No existing project before test');

  // 2. First Submission (e.g. Uploading City Avenue brochure first time)
  const payload1 = {
    developerName: 'City Space',
    projectName: 'City Avenue',
    reraNumber: 'P52000079818',
    microMarket: 'Taloja Phase 2',
    subLocality: 'Plot No. 12D, Sector-24, Taloja Phase II',
    totalFloors: 7,
    basePricePerSqft: 6200,
    brochureUrl: '/uploads/brochures/city-avenue-v1.pdf',
    amenities: ["2'x2' Vitrified Flooring", "Granite Kitchen Platform", "Branded High-Speed Elevators"],
    units: [
      { unitNumber: 'Flat-01', bhk: 1, carpetAreaSqft: 415, floorNumber: 2, agreementValue: 2573000 },
      { unitNumber: 'Flat-02', bhk: 2, carpetAreaSqft: 625, floorNumber: 5, agreementValue: 3875000 },
    ],
  };

  const req1 = new Request('http://localhost:3000/api/v1/inventory/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload1),
  });

  const { POST } = await import('../src/app/api/v1/inventory/projects/route');
  const res1 = await POST(req1);
  const json1 = await res1.json();

  assert(res1.status === 201, 'First submission created project with status 201');
  assert(json1.success === true, 'First submission returned success = true');
  assert(json1.isDuplicate === false, 'First submission flagged as isDuplicate = false');

  const countAfterFirst = await prisma.developerProject.count({
    where: { reraNumber: 'P52000079818' },
  });
  const unitsAfterFirst = await prisma.propertyUnit.count({
    where: { project: { reraNumber: 'P52000079818' } },
  });

  assert(countAfterFirst === 1, `Exact 1 project created in DB (count = ${countAfterFirst})`);
  assert(unitsAfterFirst === 2, `Exact 2 units created in DB (count = ${unitsAfterFirst})`);

  // 3. Second Submission with same RERA & same Project Name (Duplicate Upload)
  const payload2 = {
    developerName: 'City Space',
    projectName: 'City Avenue',
    reraNumber: 'P52000079818',
    microMarket: 'Taloja Phase 2',
    subLocality: 'Plot No. 12D, Sector-24, Taloja Phase II, Navi Mumbai',
    totalFloors: 7,
    basePricePerSqft: 6300,
    brochureUrl: '/uploads/brochures/city-avenue-v2-updated.pdf',
    amenities: ["Intercom Facility", "Power Backup for Lifts", "2'x2' Vitrified Flooring"],
    units: [
      { unitNumber: 'Flat-01', bhk: 1, carpetAreaSqft: 415, floorNumber: 2, agreementValue: 2614500 },
      { unitNumber: 'Flat-02', bhk: 2, carpetAreaSqft: 625, floorNumber: 5, agreementValue: 3937500 },
      { unitNumber: 'Flat-03', bhk: 2, carpetAreaSqft: 640, floorNumber: 6, agreementValue: 4032000 }, // New configuration added
    ],
  };

  const req2 = new Request('http://localhost:3000/api/v1/inventory/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload2),
  });

  const res2 = await POST(req2);
  const json2 = await res2.json();

  assert(res2.status === 200, 'Duplicate submission handled gracefully with status 200');
  assert(json2.success === true, 'Duplicate submission returned success = true');
  assert(json2.isDuplicate === true, 'Duplicate submission correctly flagged as isDuplicate = true');
  assert(json2.message.includes('already exists in CRM'), `Informative message returned: "${json2.message}"`);

  // 4. Verify Database Integrity: NO duplicate DeveloperProject rows!
  const countAfterSecond = await prisma.developerProject.count({
    where: { reraNumber: 'P52000079818' },
  });
  const unitsAfterSecond = await prisma.propertyUnit.count({
    where: { project: { reraNumber: 'P52000079818' } },
  });

  assert(countAfterSecond === 1, `CRITICAL: Project count remains exactly 1 (No duplicate project added!)`);
  assert(unitsAfterSecond === 3, `Units cleanly synchronized: 2 updated + 1 new added (Total = 3 units)`);

  const updatedProject = await prisma.developerProject.findFirst({
    where: { reraNumber: 'P52000079818' },
  });
  assert(updatedProject.brochureUrl === '/uploads/brochures/city-avenue-v2-updated.pdf', 'Project metadata seamlessly updated');

  console.log(`\n================================`);
  console.log(`Deduplication Results: ${passed} Passed, ${failed} Failed`);
  console.log(`================================`);

  if (failed > 0) process.exit(1);
}

runDeduplicationTest().catch((err) => {
  console.error('❌ Deduplication test failed:', err);
  process.exit(1);
});
