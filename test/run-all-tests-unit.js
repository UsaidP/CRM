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

const MAHARERA_DISTRICTS = {
  '517': 'Thane (Kalyan, Dombivli, Mira-Bhayandar, Thane City)',
  '518': 'Mumbai Suburban (Bandra, Andheri, Borivali, Goregaon)',
  '519': 'Mumbai City (South Mumbai, Worli, Dadar)',
  '520': 'Raigad / Navi Mumbai (Kharghar, Panvel, Ulwe, Taloja, Dronagiri)',
  '521': 'Pune (Hinjawadi, Wakad, Baner, Kharadi, Pimpri-Chinchwad)',
  '522': 'Palghar (Vasai, Virar, Nalasopara, Boisar)',
};

function validateReraNumber(reraNumber) {
  if (!reraNumber || typeof reraNumber !== 'string') {
    return { isValid: false, error: 'MahaRERA registration number is required.', formatType: 'INVALID' };
  }

  let cleaned = reraNumber.trim().toUpperCase();
  cleaned = cleaned.replace(/^(?:MAHARERA|RERA|REGISTRATION|REG|NUMBER|NUM|NO|ID|BROKER|CERTIFICATE|PROJECT|PRJ|[:\s.#/-])+/gi, '');
  cleaned = cleaned.replace(/[\s-]+/g, '');

  if (!cleaned || cleaned.length < 8) {
    return { isValid: false, error: 'RERA registration number must be at least 8 alphanumeric characters.', formatType: 'INVALID' };
  }

  // 1. MahaRERA Project Format: P followed by 11 digits
  const mahaProjectMatch = cleaned.match(/^P([0-9]{3})[0-9]{8}$/);
  if (mahaProjectMatch) {
    const districtCode = mahaProjectMatch[1];
    const districtName = MAHARERA_DISTRICTS[districtCode] || `Maharashtra District (${districtCode})`;
    return {
      isValid: true,
      normalized: cleaned,
      formatType: 'MAHARERA_PROJECT',
      state: 'Maharashtra',
      authority: 'MahaRERA (Maharashtra Real Estate Regulatory Authority)',
      entityType: 'PROJECT',
      districtCode,
      districtName,
      officialPortalUrl: 'https://maharera.maharashtra.gov.in',
      directSearchUrl: 'https://maharera.maharashtra.gov.in/projects-search-result',
    };
  }

  // 2. MahaRERA Agent Format: A followed by 11 digits
  const mahaAgentMatch = cleaned.match(/^[AR]([0-9]{3})[0-9]{8}$/);
  if (mahaAgentMatch) {
    const districtCode = mahaAgentMatch[1];
    const districtName = MAHARERA_DISTRICTS[districtCode] || `Maharashtra District (${districtCode})`;
    return {
      isValid: true,
      normalized: cleaned,
      formatType: 'MAHARERA_AGENT',
      state: 'Maharashtra',
      authority: 'MahaRERA (Maharashtra Real Estate Regulatory Authority)',
      entityType: 'AGENT',
      districtCode,
      districtName,
      officialPortalUrl: 'https://maharera.maharashtra.gov.in',
    };
  }

  // 3. Indian State RERA
  const nationalReraRegex = /^(?:PRM\/[A-Z]{2}\/RERA\/[A-Z0-9/_-]+|UPRERA[A-Z0-9]+|HRERA[A-Z0-9/_-]+|PR\/[A-Z]{2}\/[A-Z0-9/_-]+|[A-Z]{2,4}[0-9]{6,16}|[A-Z0-9/_-]{8,30})$/;
  if (nationalReraRegex.test(cleaned)) {
    return {
      isValid: true,
      normalized: cleaned,
      formatType: 'NATIONAL_RERA',
      state: 'India (Inter-State RERA)',
      officialPortalUrl: 'https://maharera.maharashtra.gov.in',
    };
  }

  return {
    isValid: false,
    normalized: cleaned,
    formatType: 'INVALID',
    error: 'Invalid RERA format.',
  };
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
    assert.strictEqual(res.districtCode, '520');
    assert.strictEqual(res.formatType, 'MAHARERA_PROJECT');
  });

  test('Test 2.2: Reject invalid/empty RERA number and non-matching formats', () => {
    const res = validateReraNumber('');
    assert.strictEqual(res.isValid, false);
    const shortRes = validateReraNumber('ABC');
    assert.strictEqual(shortRes.isValid, false);
  });

  test('Test 2.3: MahaRERA Agent and Broker license validation', () => {
    const agentRes = validateReraNumber('A52000029381');
    assert.strictEqual(agentRes.isValid, true);
    assert.strictEqual(agentRes.formatType, 'MAHARERA_AGENT');
    assert.strictEqual(agentRes.entityType, 'AGENT');
  });

  test('Test 2.4: Auto-sanitize prefix labels and hyphens (e.g. MahaRERA: P52000028714)', () => {
    const prefixed = validateReraNumber('MahaRERA Reg No: P52000028714');
    assert.strictEqual(prefixed.isValid, true);
    assert.strictEqual(prefixed.normalized, 'P52000028714');

    const hyphenated = validateReraNumber('P-52000028714');
    assert.strictEqual(hyphenated.isValid, true);
    assert.strictEqual(hyphenated.normalized, 'P52000028714');
  });

  test('Test 2.5: Block ACTIVE_MARKETABLE transition if RERA is invalid', () => {
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
