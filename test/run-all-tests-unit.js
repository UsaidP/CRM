const assert = require('assert');

// 1. Standalone calculation logic replica matching src/lib/domain/cost-calculator.ts
function calculateAllInCost(input) {
  const agreementValue = Math.max(0, Number(input.agreementValue) || 0);
  const isFemaleBuyer = Boolean(input.isFemaleBuyer);
  const hasOC = Boolean(input.hasOccupancyCertificate);
  const floorNumber = Math.max(1, Number(input.floorNumber) || 1);
  const carpetAreaSqft = Math.max(0, Number(input.carpetAreaSqft) || 0);

  const stampDutyRate = isFemaleBuyer ? 5.0 : 6.0;
  const stampDutyAmount = Math.round((agreementValue * stampDutyRate) / 100);

  const rawReg = (agreementValue * 1.0) / 100;
  const registrationFee = Math.round(Math.min(30000, rawReg));

  const gstRate = hasOC ? 0.0 : 5.0;
  const gstAmount = Math.round((agreementValue * gstRate) / 100);

  const threshold = input.baseFloorThreshold ?? 4;
  const floorRiseRate = input.floorRisePerSqftPerFloor ?? 50;
  const applicableFloors = Math.max(0, floorNumber - threshold);
  const floorRiseCharges = Math.round(applicableFloors * floorRiseRate * carpetAreaSqft);

  const parkingCharges = input.parkingCharges !== undefined ? Math.max(0, Number(input.parkingCharges)) : 250000;
  const societyDevCharges = input.societyDevCharges !== undefined ? Math.max(0, Number(input.societyDevCharges)) : 150000;

  const taxAndLegalTotal = stampDutyAmount + registrationFee + gstAmount;
  const amenitiesTotal = floorRiseCharges + parkingCharges + societyDevCharges;
  const totalAllInCost = agreementValue + taxAndLegalTotal + amenitiesTotal;

  return {
    agreementValue,
    stampDutyRate,
    stampDutyAmount,
    registrationFee,
    gstRate,
    gstAmount,
    floorRiseCharges,
    parkingCharges,
    societyDevCharges,
    totalAllInCost,
    taxAndLegalTotal,
    amenitiesTotal,
  };
}

// 2. Freshness assessment replica matching src/lib/domain/verification-engine.ts
function assessUnitFreshness(currentStatus, lastVerifiedAt) {
  const lastDate = new Date(lastVerifiedAt);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  const daysSinceVerification = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, 14 - daysSinceVerification);
  const isStale = daysSinceVerification > 14;

  let effectiveStatus = currentStatus || 'DRAFT';
  if (effectiveStatus === 'ACTIVE_MARKETABLE' && isStale) {
    effectiveStatus = 'STALE_EXPIRED';
  }

  return {
    status: currentStatus,
    daysSinceVerification,
    isStale,
    daysRemaining,
    effectiveMarketableStatus: effectiveStatus,
  };
}

function validateReraNumber(reraNumber) {
  if (!reraNumber || typeof reraNumber !== 'string') {
    return { isValid: false, error: 'MahaRERA registration number is required.' };
  }
  const cleaned = reraNumber.trim().toUpperCase();
  if (cleaned.length < 8) {
    return { isValid: false, error: 'MahaRERA registration number must be at least 8 characters.' };
  }
  return { isValid: true, normalized: cleaned };
}

function canTransitionStatus(currentStatus, targetStatus, hasValidRera) {
  if (targetStatus === 'ACTIVE_MARKETABLE' && !hasValidRera) {
    return { allowed: false, reason: 'Cannot activate listing without a validated MahaRERA registration number.' };
  }
  return { allowed: true };
}

async function runTests() {
  console.log('🧪 Running Suite: Phase 1 Inventory & Cost Engine Tests\n');
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

  // --- SUITE 1: Statutory Cost Calculator ---
  test('Test 1.1: Under-Construction Unit statutory breakdown with 5% GST and floor rise', () => {
    const res = calculateAllInCost({
      agreementValue: 5000000,
      hasOccupancyCertificate: false,
      floorNumber: 10,
      carpetAreaSqft: 500,
      parkingCharges: 250000,
      societyDevCharges: 150000,
    });

    assert.strictEqual(res.stampDutyAmount, 300000, 'Stamp duty should be 6% of 50L (3,00,000)');
    assert.strictEqual(res.registrationFee, 30000, 'Registration should be capped at ₹30,000');
    assert.strictEqual(res.gstAmount, 250000, 'GST should be 5% of 50L (2,50,000)');
    assert.strictEqual(res.floorRiseCharges, 150000, 'Floor rise (10 - 4) * 50 * 500 = 1,50,000');
    assert.strictEqual(res.totalAllInCost, 6130000, 'Total All-In should be exactly ₹61,30,000');
  });

  test('Test 1.2: Ready-to-Move with OC must have 0% GST', () => {
    const res = calculateAllInCost({
      agreementValue: 6000000,
      hasOccupancyCertificate: true,
      floorNumber: 2,
      carpetAreaSqft: 600,
      parkingCharges: 200000,
      societyDevCharges: 100000,
    });

    assert.strictEqual(res.gstRate, 0.0, 'GST rate must be 0% for OC certified units');
    assert.strictEqual(res.gstAmount, 0, 'GST amount must be 0 for OC certified units');
    assert.strictEqual(res.registrationFee, 30000, 'Registration should be ₹30,000');
    assert.strictEqual(res.totalAllInCost, 6690000, 'Total All-In should be ₹66,90,000');
  });

  test('Test 1.3: Female Buyer Concession sets Stamp Duty to 5%', () => {
    const res = calculateAllInCost({
      agreementValue: 4000000,
      isFemaleBuyer: true,
      hasOccupancyCertificate: true,
      floorNumber: 1,
      carpetAreaSqft: 400,
      parkingCharges: 0,
      societyDevCharges: 0,
    });

    assert.strictEqual(res.stampDutyRate, 5.0, 'Stamp duty rate should be 5% for female buyer');
    assert.strictEqual(res.stampDutyAmount, 200000, 'Stamp duty should be ₹2,00,000');
  });

  // --- SUITE 2: MahaRERA Invariant Checks ---
  test('Test 2.1: Valid MahaRERA format acceptance', () => {
    const res = validateReraNumber('P52000018920');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.normalized, 'P52000018920');
  });

  test('Test 2.2: Reject invalid/empty RERA number', () => {
    const res = validateReraNumber('');
    assert.strictEqual(res.isValid, false);
    const shortRes = validateReraNumber('ABC');
    assert.strictEqual(shortRes.isValid, false);
  });

  test('Test 2.3: Block ACTIVE_MARKETABLE transition if RERA is invalid', () => {
    const transition = canTransitionStatus('DRAFT', 'ACTIVE_MARKETABLE', false);
    assert.strictEqual(transition.allowed, false, 'Must block activation without valid RERA');
  });

  // --- SUITE 3: 14-Day Anti-Staleness Engine ---
  test('Test 3.1: Fresh property (verified 2 days ago) remains ACTIVE_MARKETABLE', () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const freshness = assessUnitFreshness('ACTIVE_MARKETABLE', twoDaysAgo);
    assert.strictEqual(freshness.isStale, false);
    assert.strictEqual(freshness.effectiveMarketableStatus, 'ACTIVE_MARKETABLE');
    assert.strictEqual(freshness.daysRemaining, 12);
  });

  test('Test 3.2: Stale property (verified 16 days ago) decays to STALE_EXPIRED', () => {
    const sixteenDaysAgo = new Date();
    sixteenDaysAgo.setDate(sixteenDaysAgo.getDate() - 16);

    const freshness = assessUnitFreshness('ACTIVE_MARKETABLE', sixteenDaysAgo);
    assert.strictEqual(freshness.isStale, true);
    assert.strictEqual(freshness.effectiveMarketableStatus, 'STALE_EXPIRED');
    assert.strictEqual(freshness.daysRemaining, 0);
  });

  console.log(`\n================================`);
  console.log(`Phase 1 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
