/**
 * Automated Verification for CRM Export Formats.
 *
 * These tests assert TENANT-NEUTRALITY, not one firm's branding. The exports take
 * a firm identity from the caller (see src/lib/constants/brand.ts); a test that
 * asserted a hardcoded firm name would re-introduce exactly the coupling this
 * module was refactored to remove.
 */
import {
  generateCrmCsvHeader,
  firmNameToSlug,
  formatQuotationWhatsApp,
  formatSiteVisitWhatsApp,
  formatINR,
  formatINRFull,
} from '../src/lib/export-utils';
import { PRODUCT_NAME } from '../src/lib/constants/brand';

console.log('🧪 Testing CRM Export Formats...');

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

// ---------------------------------------------------------------------------
// Test 1: CSV header reflects the supplying tenant
// ---------------------------------------------------------------------------
const TENANT = 'Apex Realty Partners';

const csvHeader = generateCrmCsvHeader({
  reportTitle: 'BUYER LEADS REGISTER',
  firmName: TENANT,
  reraNumber: 'A12345678901',
  filtersApplied: { Stage: 'MEETING_SCHEDULED', Market: 'Kharghar' },
});

assert(csvHeader.includes(TENANT.toUpperCase()), 'CSV header carries the supplied tenant name');
assert(csvHeader.includes('A12345678901'), 'CSV header carries the supplied registration number');
assert(csvHeader.includes('BUYER LEADS REGISTER'), 'CSV header contains report name');
assert(csvHeader.includes('Stage: MEETING_SCHEDULED'), 'CSV header includes active filter metadata');
assert(
  csvHeader.includes(`Generated with ${PRODUCT_NAME}`),
  'CSV header names the product that generated it'
);

// ---------------------------------------------------------------------------
// Test 2: No tenant supplied -> product name fallback, and NO leaked firm data
// ---------------------------------------------------------------------------
const anonymousHeader = generateCrmCsvHeader({ reportTitle: 'EXPORT' });

assert(
  anonymousHeader.includes(PRODUCT_NAME.toUpperCase()),
  'CSV header falls back to the product name when no tenant is supplied'
);
assert(
  !anonymousHeader.includes('A52000028714'),
  'CSV header never leaks a hardcoded registration number'
);
assert(!/ZamZam/i.test(anonymousHeader), 'CSV header contains no hardcoded legacy firm name');

// ---------------------------------------------------------------------------
// Test 3: Filename slug
// ---------------------------------------------------------------------------
assert(firmNameToSlug('Lucky CRM') === 'lucky-crm', 'slug lowercases and hyphenates');
assert(firmNameToSlug('  Apex  Realty & Co.  ') === 'apex-realty-co', 'slug trims and strips punctuation');
assert(firmNameToSlug('') === 'crm', 'slug falls back when empty');

// ---------------------------------------------------------------------------
// Test 4: Statutory quotation WhatsApp share format
// ---------------------------------------------------------------------------
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
  quotationNotes: 'Special festive parking concession applied',
  firm: { name: TENANT, reraNumber: 'A12345678901', phone: '+91 90000 00000', website: 'https://example.test' },
});

assert(quotationWa.includes(TENANT.toUpperCase()), 'Quotation carries the supplied tenant name');
assert(quotationWa.includes('A12345678901'), 'Quotation carries the supplied registration number');
assert(quotationWa.includes('+91 90000 00000'), 'Quotation carries the supplied phone');
assert(quotationWa.includes('Crown Heights'), 'Quotation includes project name');
assert(quotationWa.includes('₹75,00,000'), 'Quotation formats agreement value with Indian commas');
assert(quotationWa.includes('₹90,75,000'), 'Quotation calculates all-in total');
assert(!/ZamZam/i.test(quotationWa), 'Quotation contains no hardcoded legacy firm name');

// ---------------------------------------------------------------------------
// Test 5: Footer contact lines drop out rather than defaulting to another firm
// ---------------------------------------------------------------------------
const bareQuotation = formatQuotationWhatsApp({
  projectName: 'X', market: 'Y', towerUnit: 'Z', carpetAreaSqft: 1,
  clientName: 'C', preparedBy: 'P', agreementValue: 1, ratePerSqftAgreement: 1,
  stampDutyRate: 5, stampDutyAmount: 0, registrationFee: 0, gstRate: 5, gstAmount: 0,
  amenitiesTotal: 0, totalAllInCost: 0, ratePerSqftAllIn: 0, percentageOverAgreement: '0',
  loanLtv: 0, loanInterestRate: 0, loanTenureYears: 0, eligibleLoanAmount: 0,
  requiredDownPayment: 0, monthlyEMI: 0,
});

assert(!bareQuotation.includes('+91'), 'Quotation omits phone entirely when not supplied');
assert(
  !/https?:\/\/zamzamproperties\.in/.test(bareQuotation),
  'Quotation omits the legacy website'
);

// ---------------------------------------------------------------------------
// Test 6: VIP escorted site visit WhatsApp itinerary
// ---------------------------------------------------------------------------
const visitWa = formatSiteVisitWhatsApp({
  clientName: 'Mrs. Shabana Shaikh',
  clientPhone: '+91 98201 23456',
  scheduledDateStr: 'Sat, 29 Aug 2026',
  timeSlot: '11:00 AM - 02:00 PM',
  pickupLocation: 'Kharghar Metro Station, Navi Mumbai',
  cabDetails: 'White Toyota Innova (MH 46 AB 1234)',
  assignedBrokerName: 'Aamir Patel',
  firm: { name: TENANT },
  stops: [
    { projectName: 'Crown Heights', bhk: 2, microMarket: 'Sector 35 Kharghar', expectedTime: '11:15 AM', developerPocName: 'Rajesh (Sales)' },
    { projectName: 'Riverview Residency', bhk: 3, microMarket: 'Sector 14 Taloja', expectedTime: '12:45 PM', developerPocName: 'Vikas' },
  ],
});

assert(
  visitWa.includes(`${TENANT.toUpperCase()} — ESCORTED PROPERTY TOUR ITINERARY`),
  'Visit itinerary uses the supplied tenant name in the header'
);
assert(visitWa.includes('Mrs. Shabana Shaikh'), 'Visit itinerary includes client name');
assert(visitWa.includes('Crown Heights (2 BHK)'), 'Visit itinerary includes stop 1');
assert(visitWa.includes('Riverview Residency (3 BHK)'), 'Visit itinerary includes stop 2');
assert(!/ZamZam/i.test(visitWa), 'Visit itinerary contains no hardcoded legacy firm name');

// ---------------------------------------------------------------------------
// Test 7: Currency formatters
// ---------------------------------------------------------------------------
assert(formatINR(7500000) === '₹75.00 Lakh', 'formatINR formats 75 Lakh properly');
assert(formatINR(12500000) === '₹1.25 Cr', 'formatINR formats 1.25 Cr properly');
assert(formatINRFull(9075000) === '₹90,75,000', 'formatINRFull uses Indian digit grouping');

console.log(`\n================================`);
console.log(`Export Format Results: ${passed} Passed, ${failed} Failed`);
console.log(`================================`);

if (failed > 0) {
  process.exit(1);
}
