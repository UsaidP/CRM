/**
 * Automated Verification for ZamZam Real Estate CRM Export Formats
 */
import {
  generateZamZamCsvHeader,
  formatQuotationWhatsApp,
  formatSiteVisitWhatsApp,
  formatINR,
  formatINRFull
} from '../src/lib/export-utils';

console.log('🧪 Testing ZamZam Properties Export Formats...');

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

// Test 1: ZamZam CSV Metadata Header
const csvHeader = generateZamZamCsvHeader({
  reportTitle: 'BUYER LEADS REGISTER',
  filtersApplied: { 'Stage': 'MEETING_SCHEDULED', 'Market': 'Kharghar' }
});
assert(csvHeader.includes('ZAMZAM REAL ESTATE'), 'CSV Header contains ZAMZAM REAL ESTATE branding');
assert(csvHeader.includes('A52000028714'), 'CSV Header contains MahaRERA Reg A52000028714');
assert(csvHeader.includes('BUYER LEADS REGISTER'), 'CSV Header contains Report Name');
assert(csvHeader.includes('Stage: MEETING_SCHEDULED'), 'CSV Header includes active filter metadata');

// Test 2: Statutory Quotation WhatsApp Share Format
const quotationWa = formatQuotationWhatsApp({
  projectName: 'Crown Heights',
  market: 'Sector 35, Kharghar',
  towerUnit: 'Tower B - 1204',
  carpetAreaSqft: 750,
  clientName: 'Dr. Sameer Khan',
  preparedBy: 'Tariq Merchant',
  agreementValue: 7500000,
  ratePerSqftAgreement: 10000,
  floorRiseCharges: 300000,
  floorNumber: 12,
  stampDutyRate: 6,
  stampDutyAmount: 450000,
  registrationFee: 30000,
  gstRate: 5,
  gstAmount: 375000,
  amenitiesTotal: 450000,
  totalAllInCost: 9075000,
  ratePerSqftAllIn: 12100,
  percentageOverAgreement: '21.0',
  loanLtv: 80,
  loanInterestRate: 8.5,
  loanTenureYears: 20,
  eligibleLoanAmount: 6000000,
  requiredDownPayment: 3075000,
  monthlyEMI: 52069,
  quotationNotes: 'Special festive parking concession applied'
});

assert(quotationWa.includes('ZAMZAM PROPERTIES'), 'Quotation WhatsApp text contains ZamZam branding');
assert(quotationWa.includes('A52000028714'), 'Quotation WhatsApp text includes MahaRERA A52000028714');
assert(quotationWa.includes('Crown Heights'), 'Quotation WhatsApp text includes Project Name');
assert(quotationWa.includes('₹75,00,000'), 'Quotation WhatsApp text formats Agreement Value with Indian commas');
assert(quotationWa.includes('₹90,75,000'), 'Quotation WhatsApp text calculates All-In total');

// Test 3: VIP Escorted Site Visit WhatsApp Itinerary
const visitWa = formatSiteVisitWhatsApp({
  clientName: 'Mrs. Shabana Shaikh',
  clientPhone: '+91 98201 23456',
  scheduledDateStr: 'Sat, 29 Aug 2026',
  timeSlot: '11:00 AM - 02:00 PM',
  pickupLocation: 'Kharghar Metro Station, Navi Mumbai',
  cabDetails: 'White Toyota Innova (MH 46 AB 1234)',
  assignedBrokerName: 'Aamir Patel',
  stops: [
    { projectName: 'Crown Heights', bhk: 2, microMarket: 'Sector 35 Kharghar', expectedTime: '11:15 AM', developerPocName: 'Rajesh (Sales)' },
    { projectName: 'Riverview Residency', bhk: 3, microMarket: 'Sector 14 Taloja', expectedTime: '12:45 PM', developerPocName: 'Vikas' }
  ]
});

assert(visitWa.includes('ZAMZAM PROPERTIES — ESCORTED PROPERTY TOUR ITINERARY'), 'Visit WhatsApp text contains Escorted Tour header');
assert(visitWa.includes('Mrs. Shabana Shaikh'), 'Visit WhatsApp text includes client name');
assert(visitWa.includes('Crown Heights (2 BHK)'), 'Visit WhatsApp text includes Stop 1');
assert(visitWa.includes('Riverview Residency (3 BHK)'), 'Visit WhatsApp text includes Stop 2');

// Test 4: Formatters
assert(formatINR(7500000) === '₹75.00 Lakh', 'formatINR formats 75 Lakh properly');
assert(formatINR(12500000) === '₹1.25 Cr', 'formatINR formats 1.25 Cr properly');

console.log(`\n================================`);
console.log(`Export Format Results: ${passed} Passed, ${failed} Failed`);
console.log(`================================`);

if (failed > 0) {
  process.exit(1);
}
