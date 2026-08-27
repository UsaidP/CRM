const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Import typescript compiled / runtime functions
const { 
  searchMahaReraProject, 
  computeStringSimilarity, 
  buildMahaReraCertificatePdf,
  downloadAndSaveMahaReraCertificate 
} = require('../src/lib/services/maharera-service');

async function runMahaReraAutomationTests() {
  console.log('🧪 Running Suite: MahaRERA Automated Lookup & Certificate Ingestion Tests\n');
  let passed = 0;
  let failed = 0;

  // Test 1: Search MahaRERA Project by RERA ID
  try {
    const result = await searchMahaReraProject('P52000079818', 'City Avenue Phase II', 'City Developers');
    assert.strictEqual(result.reraNumber, 'P52000079818');
    assert.strictEqual(result.districtCode, '520');
    assert.strictEqual(result.projectType, 'RESIDENTIAL');
    assert.strictEqual(result.totalFloors, 7);
    assert.strictEqual(result.totalTowers, 2);
    assert.strictEqual(result.isExactNameMatch, true);
    assert(result.similarityScore >= 0.7, 'Expected high similarity score');
    console.log('  ✅ PASS: Test 1: MahaRERA Project Lookup & Name Matcher (P52000079818)');
    passed++;
  } catch (err) {
    console.error('  ❌ FAIL: Test 1: MahaRERA Project Lookup', err.message);
    failed++;
  }

  // Test 2: Fuzzy Name Similarity Computation
  try {
    const simExact = computeStringSimilarity('Crown Heights', 'Crown Heights');
    assert.strictEqual(simExact, 1.0);

    const simClose = computeStringSimilarity('City Avenue (Taloja Phase II)', 'City Avenue Phase 2');
    assert(simClose > 0.5, 'Expected similarity > 0.5');

    const simDifferent = computeStringSimilarity('Godrej Bayview Vashi', 'Balaji Symphony Panvel');
    assert(simDifferent < 0.2, 'Expected low similarity for distinct projects');
    console.log('  ✅ PASS: Test 2: Fuzzy Name Similarity & Token Matching');
    passed++;
  } catch (err) {
    console.error('  ❌ FAIL: Test 2: Fuzzy Name Similarity', err.message);
    failed++;
  }

  // Test 3: High-Fidelity Statutory PDF Certificate Generation
  try {
    const mockProject = {
      reraNumber: 'P52000028714',
      projectName: 'Crown Heights',
      developerName: 'Crown Lifespaces Pvt Ltd',
      promoterName: 'Crown Horizon Realty LLP',
      projectType: 'RESIDENTIAL',
      districtCode: '520',
      districtName: 'Raigad / Navi Mumbai',
      microMarket: 'Kharghar Sector 35',
      address: 'Plot No. 88, Sector 35, Kharghar, Navi Mumbai 410210',
      projectStatus: 'APPROVED',
      registrationDate: '2021-08-10',
      validUntil: '2026-12-31',
      proposedCompletionDate: '2026-12-31',
      totalTowers: 1,
      totalFloors: 22,
      approvedUnitsCount: 88,
      hasLitigations: false,
      officialPortalUrl: 'https://maharera.maharashtra.gov.in',
      directSearchUrl: 'https://maharera.maharashtra.gov.in/projects-search-result?rera=P52000028714',
      source: 'MAHARERA_STATUTORY_REGISTRY',
    };

    const pdfBuffer = buildMahaReraCertificatePdf(mockProject);
    assert(Buffer.isBuffer(pdfBuffer), 'Expected buffer output');
    assert(pdfBuffer.length > 500, 'Expected non-trivial PDF content');

    const pdfHeader = pdfBuffer.slice(0, 5).toString('utf-8');
    assert.strictEqual(pdfHeader, '%PDF-', 'Expected valid PDF magic bytes');

    const pdfString = pdfBuffer.toString('utf-8');
    assert(pdfString.toLowerCase().includes('maharashtra real estate regulatory authority'), 'Expected official title');
    assert(pdfString.includes("FORM 'C'"), 'Expected Form C in PDF');
    assert(pdfString.includes('P52000028714'), 'Expected RERA number in PDF');
    assert(pdfString.toLowerCase().includes('crown heights'), 'Expected Project Name in PDF');
    console.log('  ✅ PASS: Test 3: Form C Statutory PDF Certificate Generation & Binary Structure');
    passed++;
  } catch (err) {
    console.error('  ❌ FAIL: Test 3: PDF Certificate Generation', err.message);
    failed++;
  }

  // Test 4: End-to-End Download & Save Certificate to Disk
  try {
    const result = await downloadAndSaveMahaReraCertificate(
      'P52000018920',
      'Balaji Symphony Phase 3',
      'Balaji Group'
    );

    assert(result.certificateUrl.startsWith('/uploads/rera-certificates/'), 'Expected valid relative URL');
    assert(result.fileSizeBytes > 500, 'Expected written file size');

    const filePath = path.join(process.cwd(), 'public', result.certificateUrl);
    assert(fs.existsSync(filePath), 'Expected file to exist on local disk');

    console.log('  ✅ PASS: Test 4: Local Certificate File Ingestion & Storage (/public' + result.certificateUrl + ')');
    passed++;
  } catch (err) {
    console.error('  ❌ FAIL: Test 4: Download & Save Certificate', err.message);
    failed++;
  }

  console.log('\n================================');
  console.log(`MahaRERA Automation Results: ${passed} Passed, ${failed} Failed`);
  console.log('================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMahaReraAutomationTests();
