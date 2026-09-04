/**
 * Verification Test Suite for Distinct Carpet Area Extraction, 40% Builder Loading,
 * and Indian Statutory GST Slabs (1% <= 45L, 5% > 45L)
 */

import { calculateAllInCost } from '../src/lib/domain/cost-calculator';
import { aggregateUnitsByDistinctCarpetArea } from '../src/lib/services/gemini-service';
import { parseBrochureText } from '../src/lib/services/brochure-parser-service';

console.log('🧪 Testing Distinct Carpet Area Extraction, GST Slabs & 40% Loading...\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// ----------------------------------------------------
// TEST SUITE 1: Statutory GST Slabs (1% <= 45L, 5% > 45L)
// ----------------------------------------------------
console.log('▶ Testing Statutory GST Slabs & Cost Calculation...');

// 1.1 Affordable Housing: Agreement Value <= 45 Lakhs (40 Lakhs)
const costAffordable = calculateAllInCost({
  agreementValue: 4000000,
  floorNumber: 2,
  carpetAreaSqft: 400,
  hasOccupancyCertificate: false,
  isFemaleBuyer: false,
  builderLoadingPercentage: 40,
});

assert(costAffordable.gstRate === 1.0, `GST rate for <= 45L (₹40L) is 1%: got ${costAffordable.gstRate}%`);
assert(costAffordable.gstAmount === 40000, `GST amount for ₹40L is ₹40,000 (1%): got ₹${costAffordable.gstAmount}`);
assert(costAffordable.stampDutyAmount === 240000, `Stamp duty is 6% of 40L (₹2,40,000): got ₹${costAffordable.stampDutyAmount}`);
assert(costAffordable.registrationFee === 30000, `Registration fee capped at ₹30,000: got ₹${costAffordable.registrationFee}`);

// 1.2 Boundary Condition: Exactly 45 Lakhs
const costBoundary = calculateAllInCost({
  agreementValue: 4500000,
  floorNumber: 1,
  carpetAreaSqft: 420,
  hasOccupancyCertificate: false,
  builderLoadingPercentage: 40,
});
assert(costBoundary.gstRate === 1.0, `GST rate at exactly ₹45L threshold is 1%: got ${costBoundary.gstRate}%`);
assert(costBoundary.gstAmount === 45000, `GST amount at ₹45L is ₹45,000: got ₹${costBoundary.gstAmount}`);

// 1.3 Standard Housing: Agreement Value > 45 Lakhs (50 Lakhs)
const costStandard = calculateAllInCost({
  agreementValue: 5000000,
  floorNumber: 5,
  carpetAreaSqft: 600,
  hasOccupancyCertificate: false,
  builderLoadingPercentage: 40,
});
assert(costStandard.gstRate === 5.0, `GST rate for > 45L (₹50L) is 5%: got ${costStandard.gstRate}%`);
assert(costStandard.gstAmount === 250000, `GST amount for ₹50L is ₹2,50,000 (5%): got ₹${costStandard.gstAmount}`);

// 1.4 Ready-To-Move with Occupancy Certificate (OC)
const costOC = calculateAllInCost({
  agreementValue: 6000000,
  floorNumber: 3,
  carpetAreaSqft: 650,
  hasOccupancyCertificate: true,
  builderLoadingPercentage: 40,
});
assert(costOC.gstRate === 0.0, `GST rate for OC ready unit is 0%: got ${costOC.gstRate}%`);
assert(costOC.gstAmount === 0, `GST amount for OC ready unit is 0: got ₹${costOC.gstAmount}`);

// ----------------------------------------------------
// TEST SUITE 2: 40% Builder Loading (Taloja Standard >= 38%)
// ----------------------------------------------------
console.log('\n▶ Testing 40% Builder Loading Calculation...');

// 400 sq.ft -> 560 sq.ft saleable (40% loading)
assert(costAffordable.saleableAreaSqft === 560, `400 sq.ft carpet with 40% loading = 560 sq.ft saleable: got ${costAffordable.saleableAreaSqft}`);
assert(costAffordable.builtUpAreaSqft === 460, `400 sq.ft carpet with 15% built-up = 460 sq.ft: got ${costAffordable.builtUpAreaSqft}`);
assert(costAffordable.loadingPercentage === 40, `Loading percentage is recorded as 40%: got ${costAffordable.loadingPercentage}%`);

// 420 sq.ft -> 588 sq.ft saleable
assert(costBoundary.saleableAreaSqft === 588, `420 sq.ft carpet with 40% loading = 588 sq.ft saleable: got ${costBoundary.saleableAreaSqft}`);

// 433 sq.ft -> 606 sq.ft saleable
const cost433 = calculateAllInCost({
  agreementValue: 3500000,
  floorNumber: 1,
  carpetAreaSqft: 433,
  hasOccupancyCertificate: false,
  builderLoadingPercentage: 40,
});
assert(cost433.saleableAreaSqft === 606, `433 sq.ft carpet with 40% loading = 606 sq.ft: got ${cost433.saleableAreaSqft}`);

// ----------------------------------------------------
// TEST SUITE 3: Distinct Carpet Area Aggregation Engine
// ----------------------------------------------------
console.log('\n▶ Testing Distinct Carpet Area Aggregation Engine...');

// Simulate 100 raw flats from a building (with repeated 400, 420, and 433 sq.ft flats across 15 floors)
const rawFlats100 = [];

// 40 flats of 400 sq.ft
for (let floor = 1; floor <= 10; floor++) {
  rawFlats100.push({ unitNumber: `Flat ${floor}01`, bhk: 1, carpetAreaSqft: 400, floorNumber: floor, facing: 'EAST' });
  rawFlats100.push({ unitNumber: `Flat ${floor}02`, bhk: 1, carpetAreaSqft: 400, floorNumber: floor, facing: 'EAST' });
  rawFlats100.push({ unitNumber: `Flat ${floor}03`, bhk: 1, carpetAreaSqft: 400, floorNumber: floor, facing: 'EAST' });
  rawFlats100.push({ unitNumber: `Flat ${floor}04`, bhk: 1, carpetAreaSqft: 400, floorNumber: floor, facing: 'EAST' });
}

// 30 flats of 420 sq.ft
for (let floor = 1; floor <= 10; floor++) {
  rawFlats100.push({ unitNumber: `Flat ${floor}05`, bhk: 1, carpetAreaSqft: 420, floorNumber: floor, facing: 'WEST' });
  rawFlats100.push({ unitNumber: `Flat ${floor}06`, bhk: 1, carpetAreaSqft: 420, floorNumber: floor, facing: 'WEST' });
  rawFlats100.push({ unitNumber: `Flat ${floor}07`, bhk: 1, carpetAreaSqft: 420, floorNumber: floor, facing: 'WEST' });
}

// 30 flats of 433 sq.ft
for (let floor = 1; floor <= 10; floor++) {
  rawFlats100.push({ unitNumber: `Flat ${floor}08`, bhk: 1, carpetAreaSqft: 433, floorNumber: floor, facing: 'NORTH' });
  rawFlats100.push({ unitNumber: `Flat ${floor}09`, bhk: 1, carpetAreaSqft: 433, floorNumber: floor, facing: 'NORTH' });
  rawFlats100.push({ unitNumber: `Flat ${floor}10`, bhk: 1, carpetAreaSqft: 433, floorNumber: floor, facing: 'NORTH' });
}

assert(rawFlats100.length === 100, `Simulated 100 raw repetitive flats: ${rawFlats100.length}`);

// Run aggregation
const distinctUnits = aggregateUnitsByDistinctCarpetArea(
  rawFlats100,
  15,
  8000, // ₹8,000/sqft base price
  false,
  'Taloja Heights'
);

assert(distinctUnits.length === 3, `Aggregated exactly 3 distinct 1 BHK units from 100 flats: got ${distinctUnits.length}`);

const unit400 = distinctUnits.find(u => u.carpetAreaSqft === 400);
const unit420 = distinctUnits.find(u => u.carpetAreaSqft === 420);
const unit433 = distinctUnits.find(u => u.carpetAreaSqft === 433);

assert(Boolean(unit400), 'Found 400 sq.ft distinct configuration');
assert(unit400?.totalUnitsCount === 40, `400 sq.ft config represents 40 flats: got ${unit400?.totalUnitsCount}`);
assert(unit400?.saleableAreaSqft === 560, `400 sq.ft saleable is 560 sq.ft: got ${unit400?.saleableAreaSqft}`);
assert(unit400?.agreementValue === 400 * 8000, `Agreement value is 400 * 8000 = ₹32,00,000: got ₹${unit400?.agreementValue}`);
assert(unit400?.gstRate === 1.0, `Agreement value ₹32L <= 45L gets 1% GST: got ${unit400?.gstRate}%`);
assert(unit400?.gstAmount === 32000, `GST amount is 1% of 32L = ₹32,000: got ₹${unit400?.gstAmount}`);

assert(Boolean(unit420), 'Found 420 sq.ft distinct configuration');
assert(unit420?.totalUnitsCount === 30, `420 sq.ft config represents 30 flats: got ${unit420?.totalUnitsCount}`);
assert(unit420?.saleableAreaSqft === 588, `420 sq.ft saleable is 588 sq.ft: got ${unit420?.saleableAreaSqft}`);
assert(unit420?.agreementValue === 420 * 8000, `Agreement value is 420 * 8000 = ₹33,60,000: got ₹${unit420?.agreementValue}`);
assert(unit420?.gstRate === 1.0, `Agreement value ₹33.6L <= 45L gets 1% GST: got ${unit420?.gstRate}%`);

assert(Boolean(unit433), 'Found 433 sq.ft distinct configuration');
assert(unit433?.totalUnitsCount === 30, `433 sq.ft config represents 30 flats: got ${unit433?.totalUnitsCount}`);
assert(unit433?.saleableAreaSqft === 606, `433 sq.ft saleable is 606 sq.ft: got ${unit433?.saleableAreaSqft}`);

// ----------------------------------------------------
// TEST SUITE 4: Multi-Typology Distinct Carpet Extraction (1 BHK, 2 BHK, 3 BHK)
// ----------------------------------------------------
console.log('\n▶ Testing Multi-Typology Distinct Carpet Extraction...');

const multiTypologyBrochure = `
SHREE KRISHNA PRESENTS NIRVANA TOWERS
Location: Sector 26, Taloja Phase 2, Navi Mumbai
MahaRERA Reg No: P52000034567
Elevation: G+16 Storey Tower
Typology & Carpet Areas:
- 1 BHK: 400, 420 & 433 sqft
- 2 BHK: 615 & 645 sqft
- 3 BHK: 850 sqft
Base Rate: ₹7,500/sqft
Status: Under Construction
Amenities: Swimming Pool, Gymnasium, Landscaped Garden
`;

const parsedMulti = parseBrochureText(multiTypologyBrochure, 'Nirvana_Brochure.pdf');

// We expect: 3 configs for 1 BHK, 2 configs for 2 BHK, 1 config for 3 BHK = 6 distinct configs
assert(parsedMulti.units.length === 6, `Extracted 6 distinct configurations across 1, 2, 3 BHK: got ${parsedMulti.units.length}`);

const bhk1Configs = parsedMulti.units.filter(u => u.bhk === 1);
const bhk2Configs = parsedMulti.units.filter(u => u.bhk === 2);
const bhk3Configs = parsedMulti.units.filter(u => u.bhk === 3);

assert(bhk1Configs.length === 3, `1 BHK has 3 distinct configurations: got ${bhk1Configs.length}`);
assert(bhk1Configs.some(u => u.carpetAreaSqft === 400), '1 BHK includes 400 sq.ft');
assert(bhk1Configs.some(u => u.carpetAreaSqft === 420), '1 BHK includes 420 sq.ft');
assert(bhk1Configs.some(u => u.carpetAreaSqft === 433), '1 BHK includes 433 sq.ft');

assert(bhk2Configs.length === 2, `2 BHK has 2 distinct configurations: got ${bhk2Configs.length}`);
assert(bhk2Configs.some(u => u.carpetAreaSqft === 615), '2 BHK includes 615 sq.ft');
assert(bhk2Configs.some(u => u.carpetAreaSqft === 645), '2 BHK includes 645 sq.ft');

assert(bhk3Configs.length === 1, `3 BHK has 1 distinct configuration: got ${bhk3Configs.length}`);
assert(bhk3Configs[0].carpetAreaSqft === 850, `3 BHK is 850 sq.ft: got ${bhk3Configs[0].carpetAreaSqft}`);

// Verify 2 BHK 645 sqft cost:
// Agreement value = 645 * 7500 = ₹48,37,500 (> 45 Lakhs) -> 5% GST
const bhk2_645 = bhk2Configs.find(u => u.carpetAreaSqft === 645);
assert(bhk2_645?.agreementValue === 645 * 7500, `2 BHK 645 agreement value is ₹48,37,500: got ₹${bhk2_645?.agreementValue}`);
assert(bhk2_645?.gstRate === 5.0, `Agreement value > 45L gets 5% GST: got ${bhk2_645?.gstRate}%`);
assert(bhk2_645?.saleableAreaSqft === Math.round(645 * 1.40), `Saleable area is 645 * 1.40 = 903 sq.ft: got ${bhk2_645?.saleableAreaSqft}`);

console.log(`\n================================`);
console.log(`Distinct Units & GST Tests: ${passed} Passed, ${failed} Failed`);
console.log(`================================\n`);

if (failed > 0) {
  process.exit(1);
}
