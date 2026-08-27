/**
 * Test Suite for Gemini 2.5 Flash AI Features & MahaRERA Verification
 * 
 * Tests:
 * 1. AI Lead Notes Parser (Unstructured text -> Structured BuyerRequirement)
 * 2. AI WhatsApp Pitch Synthesizer (Matches -> Strategic Rationale & WhatsApp Copy)
 * 3. Unified Brochure Async Parser (AI-First + Fallback)
 * 4. MahaRERA Statutory Verification Engine
 */

import { validateReraNumber } from '../src/lib/domain/verification-engine';
import { parseLeadNotesWithAI, generateWhatsAppPitchWithAI, extractBrochureWithAI } from '../src/lib/services/gemini-service';
import { parseBrochureAsync, parseBrochureText } from '../src/lib/services/brochure-parser-service';

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

async function runTests() {
  console.log('\n🧪 Running AI Gemini 2.5 Flash & MahaRERA Integration Tests\n');

  // Test 1: MahaRERA Statutory Verification Engine
  console.log('▶ Testing MahaRERA Statutory Verification Engine...');
  const validProjectRera = validateReraNumber('P52000028714');
  assert(validProjectRera.isValid === true, 'P52000028714 is a valid MahaRERA project ID');
  assert(validProjectRera.districtCode === '520', 'District code 520 correctly mapped');
  assert(validProjectRera.districtName.includes('Raigad / Navi Mumbai'), 'District correctly identified as Raigad / Navi Mumbai');
  assert(validProjectRera.directSearchUrl.includes('P52000028714'), 'Direct search URL generated');

  const prefixedRera = validateReraNumber('MahaRERA Reg No: P52000079818');
  assert(prefixedRera.isValid === true, 'Auto-cleans label prefix "MahaRERA Reg No:"');
  assert(prefixedRera.normalized === 'P52000079818', 'Normalizes cleaned registration code');

  const invalidRera = validateReraNumber('INVALID_123');
  assert(invalidRera.isValid === false, 'Rejects malformed RERA number');

  // Test 2: AI Lead Notes Parsing
  console.log('\n▶ Testing AI Lead Notes Parser (Gemini 2.5 Flash)...');
  const rawNotes = 'Customer Vikram Mehta looking for 2BHK in Kharghar Sector 35 near metro, budget 75-80 Lakhs, ready to move in with OC received.';
  const parsedNotes = await parseLeadNotesWithAI(rawNotes);
  assert(typeof parsedNotes.budgetMax === 'number' && parsedNotes.budgetMax >= 7500000, `Budget ceiling parsed: ₹${parsedNotes.budgetMax}`);
  assert(Array.isArray(parsedNotes.bhkPreferences) && parsedNotes.bhkPreferences.includes(2), 'BHK preference detected as 2 BHK');
  assert(parsedNotes.possessionPreference === 'READY_TO_MOVE', 'Possession preference parsed as READY_TO_MOVE');

  // Test 3: AI WhatsApp Pitch Generation
  console.log('\n▶ Testing AI WhatsApp Pitch Synthesizer (Gemini 2.5 Flash)...');
  const mockUnit = {
    id: 'unit-crown-35',
    bhk: 2,
    carpetAreaSqft: 685,
    floorNumber: 12,
    totalFloors: 24,
    agreementValue: 6800000,
    allInTotalCost: 7750000,
    verificationStatus: 'RERA_VERIFIED',
    lastVerifiedAt: new Date(),
    possessionStatus: 'READY_TO_MOVE',
    project: {
      id: 'proj-crown',
      projectName: 'Crown Heights',
      developerName: 'Paradise Group',
      reraNumber: 'P52000028714',
      microMarket: 'Kharghar Sector 35',
      distanceToMetroKm: 0.3,
      hasOccupancyCertificate: true,
    },
  };

  const pitch = await generateWhatsAppPitchWithAI(
    'Vikram Mehta',
    {
      budgetMax: 8000000,
      bhkPreferences: [2],
      targetLocations: ['Kharghar Sector 35'],
      possessionPreference: 'READY_TO_MOVE',
    },
    [mockUnit]
  );

  assert(typeof pitch.pitchNarrative === 'string' && pitch.pitchNarrative.length > 20, 'Pitch narrative generated');
  assert(typeof pitch.waMessage === 'string' && pitch.waMessage.includes('Vikram Mehta'), 'WhatsApp message contains lead name');
  assert(pitch.waMessage.includes('P52000028714') || pitch.waMessage.includes('Crown Heights'), 'WhatsApp message references project/RERA number');

  // Test 4: Unified Brochure Parser Async Execution
  console.log('\n▶ Testing Unified Brochure Async Parser (AI & Fallback)...');
  const sampleBrochureText = `
    CITY AVENUE by City Space
    Plot No. 12D, Sector-24, Taloja Phase II, Navi Mumbai-410208
    MahaRERA Registration Number: P52000079818
    G+7 Storey Tower with 1 BHK (420 sqft) & 2 BHK (640 sqft)
    Amenities: Swimming Pool, Gymnasium, Clubhouse, 24x7 Security
  `;
  const textBuffer = Buffer.from(sampleBrochureText, 'utf-8');
  const parsedBrochure = await parseBrochureAsync(textBuffer, 'application/pdf', 'City_Avenue_Brochure.pdf');
  assert(parsedBrochure.data.projectName.length > 0, `Extracted Project: ${parsedBrochure.data.projectName}`);
  assert(parsedBrochure.data.reraNumber === 'P52000079818', `Extracted MahaRERA: ${parsedBrochure.data.reraNumber}`);
  assert(parsedBrochure.data.units.length >= 1, `Extracted ${parsedBrochure.data.units.length} Unit configurations`);

  console.log(`\n================================`);
  console.log(`AI Feature Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
