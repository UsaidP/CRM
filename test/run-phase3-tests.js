const assert = require('assert');

// Standalone matching algorithm matching src/lib/domain/matching-engine.ts
function evaluatePropertyMatch(requirement, property) {
  const matchingHighlights = [];
  const tradeOffs = [];

  // Check 1.1: Staleness decay (> 14 days)
  const lastDate = new Date(property.lastVerifiedAt);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (daysSince > 14 || property.verificationStatus === 'STALE_EXPIRED') {
    return {
      totalScore: 0,
      tier: 'DISQUALIFIED',
      disqualificationReason: 'Listing unverified for >14 days (Stale Expired).',
    };
  }

  // Check 1.2: Strict Budget Ceiling (+5% limit)
  const maxAllowedBudget = requirement.budgetMax * 1.05;
  if (property.allInTotalCost > maxAllowedBudget) {
    return {
      totalScore: 0,
      tier: 'DISQUALIFIED',
      disqualificationReason: `All-in cost exceeds buyer max budget ceiling (+5% limit).`,
    };
  }

  // Check 1.3: BHK Configuration match
  const acceptableBhks = requirement.bhkPreferences && requirement.bhkPreferences.length > 0
    ? requirement.bhkPreferences
    : [1, 2, 3];
  if (!acceptableBhks.includes(property.bhk)) {
    return {
      totalScore: 0,
      tier: 'DISQUALIFIED',
      disqualificationReason: `BHK mismatch.`,
    };
  }

  // Check 1.4: Ready-to-Move OC Invariant
  if (requirement.possessionPreference === 'READY_TO_MOVE' && !property.project.hasOccupancyCertificate) {
    return {
      totalScore: 0,
      tier: 'DISQUALIFIED',
      disqualificationReason: 'Requires Ready-to-Move with OC, but project is Under-Construction.',
    };
  }

  // --- WEIGHTED SOFT SCORING ---
  // Budget (35%)
  const budgetDiff = Math.abs(property.allInTotalCost - requirement.budgetMax);
  const budgetScore = Math.max(0.2, 1.0 - (budgetDiff / requirement.budgetMax));

  // Carpet (25%)
  const minCarpet = requirement.minCarpetSqft || 600;
  const carpetScore = Math.min(1.0, Math.max(0.3, property.carpetAreaSqft / minCarpet));

  // Transit (15%)
  const metroDist = property.project.distanceToMetroKm ?? 1.5;
  let transitScore = 0.5;
  if (metroDist <= 0.5) transitScore = 1.0;
  else if (metroDist <= 1.0) transitScore = 0.85;
  else transitScore = Math.max(0.3, 1.0 - (metroDist * 0.15));

  // Possession (15%)
  let possessionScore = 0.7;
  if (property.project.hasOccupancyCertificate) possessionScore = 1.0;
  else if (requirement.possessionPreference === 'UNDER_CONSTRUCTION' || requirement.possessionPreference === 'ANY') possessionScore = 0.9;

  // Amenities (10%)
  let amenitiesScore = 0.8;
  if (property.floorNumber >= 8) amenitiesScore += 0.1;
  if (property.isHotDeal) amenitiesScore += 0.1;
  amenitiesScore = Math.min(1.0, amenitiesScore);

  const weightedSum = (
    (budgetScore * 0.35) +
    (carpetScore * 0.25) +
    (transitScore * 0.15) +
    (possessionScore * 0.15) +
    (amenitiesScore * 0.10)
  );

  const totalScore = Number((weightedSum * 100).toFixed(1));

  let tier = 'COMPROMISE';
  if (totalScore >= 88.0) tier = 'PRIME_MATCH';
  else if (totalScore >= 74.0) tier = 'STRONG_ALTERNATIVE';

  return {
    budgetScore: Number(budgetScore.toFixed(2)),
    carpetScore: Number(carpetScore.toFixed(2)),
    transitScore: Number(transitScore.toFixed(2)),
    possessionScore: Number(possessionScore.toFixed(2)),
    amenitiesScore: Number(amenitiesScore.toFixed(2)),
    totalScore,
    tier,
  };
}

async function runPhase3Tests() {
  console.log('🧪 Running Suite: Phase 3 Requirements-to-Property Matching Engine Tests\n');
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     ${err.message}`);
      failed++;
    }
  }

  // --- SUITE 1: Hard Disqualifiers ---
  test('Test 1.1: Disqualify unit exceeding +5% max budget ceiling', () => {
    const req = { budgetMax: 6000000, bhkPreferences: [2] };
    const property = {
      bhk: 2,
      carpetAreaSqft: 650,
      floorNumber: 5,
      allInTotalCost: 6500000, // > 60L * 1.05 = 63L
      verificationStatus: 'ACTIVE_MARKETABLE',
      lastVerifiedAt: new Date(),
      project: { distanceToMetroKm: 0.5, hasOccupancyCertificate: true },
    };

    const res = evaluatePropertyMatch(req, property);
    assert.strictEqual(res.tier, 'DISQUALIFIED');
    assert.strictEqual(res.totalScore, 0);
  });

  test('Test 1.2: Disqualify unit on BHK mismatch', () => {
    const req = { budgetMax: 8000000, bhkPreferences: [1] }; // strictly 1 BHK
    const property = {
      bhk: 2, // 2 BHK unit
      carpetAreaSqft: 650,
      floorNumber: 5,
      allInTotalCost: 6500000,
      verificationStatus: 'ACTIVE_MARKETABLE',
      lastVerifiedAt: new Date(),
      project: { distanceToMetroKm: 0.5, hasOccupancyCertificate: true },
    };

    const res = evaluatePropertyMatch(req, property);
    assert.strictEqual(res.tier, 'DISQUALIFIED');
    assert.strictEqual(res.totalScore, 0);
  });

  test('Test 1.3: Disqualify Under-Construction when buyer requires RTM with OC', () => {
    const req = { budgetMax: 7000000, bhkPreferences: [2], possessionPreference: 'READY_TO_MOVE' };
    const property = {
      bhk: 2,
      carpetAreaSqft: 640,
      floorNumber: 8,
      allInTotalCost: 6500000,
      verificationStatus: 'ACTIVE_MARKETABLE',
      lastVerifiedAt: new Date(),
      project: { distanceToMetroKm: 0.8, hasOccupancyCertificate: false }, // Under Construction (No OC)
    };

    const res = evaluatePropertyMatch(req, property);
    assert.strictEqual(res.tier, 'DISQUALIFIED');
    assert.strictEqual(res.totalScore, 0);
  });

  test('Test 1.4: Disqualify Stale Expired inventory (>14 days unverified)', () => {
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

    const req = { budgetMax: 5000000, bhkPreferences: [1] };
    const property = {
      bhk: 1,
      carpetAreaSqft: 420,
      floorNumber: 3,
      allInTotalCost: 3800000,
      verificationStatus: 'ACTIVE_MARKETABLE',
      lastVerifiedAt: twentyDaysAgo, // 20 days ago
      project: { distanceToMetroKm: 0.3, hasOccupancyCertificate: true },
    };

    const res = evaluatePropertyMatch(req, property);
    assert.strictEqual(res.tier, 'DISQUALIFIED');
    assert.strictEqual(res.totalScore, 0);
  });

  // --- SUITE 2: Multi-Factor Weighted Scoring ---
  test('Test 2.1: Prime Match calculation for Crown Heights (Kharghar Sec 35 2BHK)', () => {
    const req = {
      budgetMax: 8000000,
      bhkPreferences: [2],
      minCarpetSqft: 650,
      possessionPreference: 'ANY',
    };
    const property = {
      bhk: 2,
      carpetAreaSqft: 685,
      floorNumber: 12,
      allInTotalCost: 7962000, // ~80L max
      verificationStatus: 'ACTIVE_MARKETABLE',
      lastVerifiedAt: new Date(),
      isHotDeal: true,
      project: { distanceToMetroKm: 0.45, hasOccupancyCertificate: true },
    };

    const res = evaluatePropertyMatch(req, property);
    assert.strictEqual(res.tier, 'PRIME_MATCH');
    assert.ok(res.totalScore >= 90.0, `Score should be >= 90%, received: ${res.totalScore}%`);
  });

  test('Test 2.2: Metro Line 1 distance impact on Transit sub-score', () => {
    const req = { budgetMax: 7000000, bhkPreferences: [2] };
    
    // Unit A: 450m from Metro
    const propA = {
      bhk: 2, carpetAreaSqft: 640, floorNumber: 5, allInTotalCost: 6500000,
      verificationStatus: 'ACTIVE_MARKETABLE', lastVerifiedAt: new Date(),
      project: { distanceToMetroKm: 0.45, hasOccupancyCertificate: true },
    };
    // Unit B: 3.5km from Metro
    const propB = {
      bhk: 2, carpetAreaSqft: 640, floorNumber: 5, allInTotalCost: 6500000,
      verificationStatus: 'ACTIVE_MARKETABLE', lastVerifiedAt: new Date(),
      project: { distanceToMetroKm: 3.5, hasOccupancyCertificate: true },
    };

    const resA = evaluatePropertyMatch(req, propA);
    const resB = evaluatePropertyMatch(req, propB);

    assert.ok(resA.transitScore > resB.transitScore, 'Closer metro distance must yield higher transit score');
    assert.ok(resA.totalScore > resB.totalScore, 'Closer metro distance must yield higher overall score');
  });

  console.log(`\n================================`);
  console.log(`Phase 3 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`================================\n`);

  if (failed > 0) process.exit(1);
}

runPhase3Tests();
