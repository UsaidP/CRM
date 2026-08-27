/**
 * Automated Verification for Brochure Parser & AI Project Extraction Engine
 */
import { parseBrochureText, extractTextFromPdfBuffer } from '../src/lib/services/brochure-parser-service';

console.log('🧪 Testing Developer Brochure (PDF) AI Extraction Engine...');

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

// Test 1: Full Luxury High-Rise Developer Brochure Parsing
const brochureSample1 = `
PARADISE GROUP PRESENTS CROWN HEIGHTS
An Ultra-Luxury Residential Address in Kharghar
MahaRERA Registration Number: P52000028714
Location: Sector 35, Kharghar, Navi Mumbai (Near Metro Station & Central Park)
Architectural Elevation:
G+24 Storey Magnificent Landmark Tower with 2 Grand Residential Wings
Configurations & Floor Plans:
- 1 BHK Executive Suite: 450 sq.ft RERA Carpet Area
- 2 BHK Luxury Residence: 685 sq.ft RERA Carpet Area
- 3 BHK Royal Penthouse: 1050 sq.ft RERA Carpet Area
Pricing & Terms: Base Rate ₹10,500/sqft
Possession Timeline: December 2027 (Under Construction)
Podium & Clubhouse Amenities:
Infinity Edge Swimming Pool & Kids Splash Pool, State-of-the-Art Fitness Center & Gymnasium, Grand Lifestyle Clubhouse & Community Hall, Rooftop Sky Lounge & Stargazing Deck, 3-Tier Security with 24/7 CCTV, Double Height Designer Entrance Lobby, Multi-Level Covered Podium Car Parking, EV Car Charging Stations, Landscaped Podium Garden with Gazebo, High-Speed Lifts.
Contact Sales: Site Sales Office (+91 98201 23456)
`;

const result1 = parseBrochureText(brochureSample1, 'Crown_Heights_Brochure.pdf');

assert(result1.projectName.includes('Crown Heights'), `Project Name correctly identified: "${result1.projectName}"`);
assert(result1.developerName.includes('Paradise Group'), `Developer Name correctly identified: "${result1.developerName}"`);
assert(result1.reraNumber === 'P52000028714', `MahaRERA Reg No correctly extracted: "${result1.reraNumber}"`);
assert(result1.microMarket.includes('Kharghar'), `Micro-Market correctly mapped: "${result1.microMarket}"`);
assert(result1.totalFloors === 24, `Storey height parsed correctly: ${result1.totalFloors} floors`);
assert(result1.elevation.includes('G+24'), `Elevation description populated: "${result1.elevation}"`);
assert(result1.basePricePerSqft === 10500, `Base rate/sqft extracted: ₹${result1.basePricePerSqft}`);

// Verify Unit Configurations (1, 2, 3 BHK)
assert(result1.units.length === 3, `Extracted 3 typologies: ${result1.units.length} units`);
const unit1 = result1.units.find(u => u.bhk === 1);
const unit2 = result1.units.find(u => u.bhk === 2);
const unit3 = result1.units.find(u => u.bhk === 3);

assert(unit1 && unit1.carpetAreaSqft === 450, `1 BHK carpet area: ${unit1?.carpetAreaSqft} sq.ft`);
assert(unit2 && unit2.carpetAreaSqft === 685, `2 BHK carpet area: ${unit2?.carpetAreaSqft} sq.ft`);
assert(unit3 && unit3.carpetAreaSqft === 1050, `3 BHK carpet area: ${unit3?.carpetAreaSqft} sq.ft`);

// Verify Statutory Costs
assert(unit2 && unit2.agreementValue === 685 * 10500, `2 BHK Agreement Value: ₹${unit2?.agreementValue}`);
assert(unit2 && unit2.stampDutyAmount === (unit2.agreementValue * 6) / 100, `2 BHK 6% Stamp Duty: ₹${unit2?.stampDutyAmount}`);
assert(unit2 && unit2.gstAmount === (unit2.agreementValue * 5) / 100, `2 BHK 5% GST: ₹${unit2?.gstAmount}`);
assert(unit2 && unit2.allInTotalCost > unit2.agreementValue, `2 BHK All-In Total Cost computed: ₹${unit2?.allInTotalCost}`);

// Verify Extracted Amenities
assert(result1.amenities.length >= 6, `Extracted ${result1.amenities.length} luxury amenities`);
assert(result1.amenities.some(a => a.includes('Swimming Pool')), 'Swimming Pool amenity detected');
assert(result1.amenities.some(a => a.includes('Gymnasium')), 'Gymnasium amenity detected');
assert(result1.amenities.some(a => a.includes('Sky Lounge')), 'Sky Lounge / Deck detected');

// Test 2: Taloja Affordable Luxury Leaflet Parsing
const brochureSample2 = `
TODAY GLOBAL PRESENTS RIVERVIEW RESIDENCY
MahaRERA Reg No: P52000019842
Location: Sector 14, Taloja Phase 1
Elevation: G+18 Storey Twin Towers
Typology: 1 BHK (420 sqft) & 2 BHK (640 sqft)
Base Rate: ₹6,800/sqft
Status: Under Construction
`;

const result2 = parseBrochureText(brochureSample2, 'Riverview_Residency.pdf');
assert(result2.projectName.includes('Riverview Residency'), `Taloja Project Name parsed: "${result2.projectName}"`);
assert(result2.reraNumber === 'P52000019842', `MahaRERA ID parsed: "${result2.reraNumber}"`);
assert(result2.microMarket.includes('Taloja'), `Micro-Market parsed: "${result2.microMarket}"`);
assert(result2.totalFloors === 18, `Elevation parsed: ${result2.totalFloors} storeys`);
assert(result2.basePricePerSqft === 6800, `Base rate parsed: ₹${result2.basePricePerSqft}`);

// Test 3: City Avenue (City Space - Taloja Phase II)
const cityAvenueSample = `
CITY AVENUE
Plot No. 12D, Sector-24, Taloja Phase II, Navi Mumbai-410208
MahaRERA Registration Number: P52000079818
ABOUT PROJECT:
G+7 with Commercial & Residential Project
Taste-Fully Designed Entrance & Floor Lobbies
Branded High Speed Elevators
Clear Title CIDCO Transfer Plot
1 BHK & 2 BHK Spacious Flats with Balcony
1st Floor 7 Flat & 2nd to 7th Slab 8 Flat Each Floor
Power Backup For Lifts & Common Area
AMENITIES:
2'x2' Vitrified flooring tiles in all the rooms
Granite kitchen platform with stainless steel sink
Concealed plumbing with branded fittings
Powder Coated Aluminum sliding windows
Intercom facility & Rain water harvesting
Special water proofing treatment with china chips
A Project By: City Space
Office Add: #35, 1st Floor, Hiranandani Crystal Plaza, Sector-7, Kharghar
Site Add: Plot No. 12D, Sector-24, Taloja Phase II, Navi Mumbai-410208
Email: citygroup36@gmail.com
Architects: Destination Architecture Interior Designs
RCC Consultants: SRS Consultants
CONTACT FOR BOOKING: MOHD SAQLAIN - 9920540484
`;

const result3 = parseBrochureText(cityAvenueSample, 'City_Avenue_Brochure.pdf');
assert(result3.projectName === 'City Avenue', `City Avenue Project Name parsed: "${result3.projectName}"`);
assert(result3.developerName === 'City Space', `City Space Developer parsed: "${result3.developerName}"`);
assert(result3.reraNumber === 'P52000079818', `City Avenue MahaRERA parsed: "${result3.reraNumber}"`);
assert(result3.microMarket.includes('Taloja'), `Micro-market identified: "${result3.microMarket}"`);
assert(result3.totalFloors === 7, `G+7 storeys identified: ${result3.totalFloors} storeys`);
assert(result3.elevation.includes('G+7'), `Elevation string populated: "${result3.elevation}"`);
assert(result3.developerSalesPocName.includes('Mohd Saqlain') || result3.developerSalesPocPhone.includes('9920540484'), `Sales contact identified: ${result3.developerSalesPocName} (${result3.developerSalesPocPhone})`);
assert(result3.units.length >= 2, `1 BHK & 2 BHK units generated: ${result3.units.length} units`);
assert(result3.amenities.some(a => a.includes('Vitrified') || a.includes('Granite') || a.includes('Elevators')), 'Amenities cataloged from City Avenue specs');

// Test 4: PDF Binary Buffer Text Extraction Fallback
const fakePdfBuffer = Buffer.from('%PDF-1.4 BT (CROWN HEIGHTS) Tj (P52000028714) Tj ET');
const extractedPdfText = extractTextFromPdfBuffer(fakePdfBuffer);
assert(extractedPdfText.includes('CROWN HEIGHTS') || extractedPdfText.includes('P52000028714'), 'extractTextFromPdfBuffer successfully extracts text chunks from PDF stream');

console.log(`\n================================`);
console.log(`Brochure Parser Results: ${passed} Passed, ${failed} Failed`);
console.log(`================================`);

if (failed > 0) {
  process.exit(1);
}
