import { prisma } from '../src/lib/db/prisma';

async function testOmnisearch() {
  console.log('🧪 Testing Global Omnisearch Backend & API Queries...\n');

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

  try {
    // Test 1: Search by Project Name (e.g. "City Avenue" or "Crown")
    const projects = await prisma.developerProject.findMany({
      where: {
        OR: [
          { projectName: { contains: 'City' } },
          { developerName: { contains: 'City' } },
          { reraNumber: { contains: 'City' } },
          { microMarket: { contains: 'City' } },
        ],
      },
      take: 6,
    });
    assert(Array.isArray(projects), 'Project search returns an array');
    console.log(`     Found ${projects.length} project matches for "City"`);

    // Test 2: Search by MahaRERA number
    const reraMatches = await prisma.developerProject.findMany({
      where: {
        OR: [
          { reraNumber: { contains: 'P520' } },
        ],
      },
      take: 6,
    });
    assert(reraMatches.length > 0, `MahaRERA search for "P520" found ${reraMatches.length} projects`);

    // Test 3: Search Leads by Name
    const leadMatches = await prisma.lead.findMany({
      where: {
        OR: [
          { fullName: { contains: 'a' } },
        ],
      },
      take: 6,
    });
    assert(Array.isArray(leadMatches), 'Lead search returns an array');
    console.log(`     Found ${leadMatches.length} lead matches for "a"`);

    // Test 4: Search Leads by Phone Digits
    const phoneMatches = await prisma.lead.findMany({
      where: {
        OR: [
          { phoneE164: { contains: '98' } },
        ],
      },
      take: 6,
    });
    assert(Array.isArray(phoneMatches), 'Phone search returns an array');
    console.log(`     Found ${phoneMatches.length} phone matches for "98"`);

    // Test 5: Search Micro-market
    const marketMatches = await prisma.developerProject.findMany({
      where: {
        OR: [
          { microMarket: { contains: 'Taloja' } },
          { subLocality: { contains: 'Taloja' } },
        ],
      },
      take: 6,
    });
    assert(marketMatches.length > 0, `Micro-market search for "Taloja" found ${marketMatches.length} projects`);

    console.log(`\n================================`);
    console.log(`Omnisearch Tests: ${passed} Passed, ${failed} Failed`);
    console.log(`================================\n`);

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Error during omnisearch testing:', err);
    process.exit(1);
  }
}

testOmnisearch();
