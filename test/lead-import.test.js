import { test, expect, describe } from 'bun:test';
import * as XLSX from 'xlsx';
import { prisma } from '../src/lib/db/prisma';
import { 
  parseIndianBudget, 
  extractBhkPreferences, 
  resolveMicroMarket, 
  resolveAssignedBroker,
  sanitizeName,
  classifyLeadSource,
  parseAndAutoAdjustLeadsCSV 
} from '../src/lib/domain/lead-auto-adjuster';
import { 
  parseDelimitedText, 
  parseExcelBuffer, 
  parseJSONContent, 
  detectDelimiter 
} from '../src/lib/domain/lead-file-parser';
import { findOrCreateContact } from '../src/lib/domain/contact-manager';

describe('Lead Multi-Format Auto-Adjustment & Ingestion Engine Tests', () => {
  
  test('parseIndianBudget handles diverse Indian currency formats accurately', () => {
    // 65L
    const b1 = parseIndianBudget('65L');
    expect(b1.max).toBe(6500000);
    expect(b1.formatted).toContain('65 L');

    // 1.25 Cr
    const b2 = parseIndianBudget('1.25 Cr');
    expect(b2.max).toBe(12500000);
    expect(b2.formatted).toContain('1.25 Cr');

    // 45-55 Lakhs Range
    const b3 = parseIndianBudget('45-55 Lakhs');
    expect(b3.min).toBe(4500000);
    expect(b3.max).toBe(5500000);
    expect(b3.formatted).toContain('45 L - ₹55 L');

    // ₹70,00,000 standard Indian comma format
    const b4 = parseIndianBudget('₹70,00,000');
    expect(b4.max).toBe(7000000);

    // 80 Lacs
    const b5 = parseIndianBudget('80 Lacs');
    expect(b5.max).toBe(8000000);

    // Empty / Unspecified
    const b6 = parseIndianBudget('');
    expect(b6.max).toBe(0);
    expect(b6.formatted).toBe('Unspecified');
  });

  test('extractBhkPreferences extracts clean numeric arrays from freeform strings', () => {
    expect(extractBhkPreferences('2 BHK')).toEqual([2]);
    expect(extractBhkPreferences('3 BHK + Study Room')).toEqual([3]);
    expect(extractBhkPreferences('1 or 2 BHK')).toEqual([1, 2]);
    expect(extractBhkPreferences('Studio Apartment')).toEqual([1]);
    expect(extractBhkPreferences('4BHK Penthouse')).toEqual([4]);
    expect(extractBhkPreferences('')).toEqual([2]); // Default standard
  });

  test('resolveMicroMarket standardizes locality variations', () => {
    expect(resolveMicroMarket('Kharghar Sec 35').canonical).toBe('Kharghar Sector 35');
    expect(resolveMicroMarket('Kharghar Sec 35').region).toBe('KHARGHAR');

    expect(resolveMicroMarket('taloja phase 1 near metro').canonical).toBe('Taloja Phase 1');
    expect(resolveMicroMarket('taloja phase 1 near metro').region).toBe('TALOJA_1');

    expect(resolveMicroMarket('Taloja 2 sector 26').canonical).toBe('Taloja Phase 2');
    expect(resolveMicroMarket('Taloja 2 sector 26').region).toBe('TALOJA_2');

    expect(resolveMicroMarket('Upper Kharghar 37').canonical).toBe('Kharghar Sector 37');
  });

  test('resolveAssignedBroker routes Kharghar leads to Safwan and Taloja leads to Suhel', () => {
    const khargharBroker = resolveAssignedBroker('KHARGHAR');
    expect(khargharBroker.brokerPhone).toBe('+917977552011');
    expect(khargharBroker.brokerName).toContain('Safwan Diwan');

    const talojaBroker = resolveAssignedBroker('TALOJA_1');
    expect(talojaBroker.brokerPhone).toBe('+919967731071');
    expect(talojaBroker.brokerName).toContain('Suhel Patel');

    const taloja2Broker = resolveAssignedBroker('TALOJA_2');
    expect(taloja2Broker.brokerPhone).toBe('+919967731071');
  });

  test('sanitizeName cleans salutations and formats proper case', () => {
    expect(sanitizeName('mr. rahul sharma')).toBe('Rahul Sharma');
    expect(sanitizeName('DR. POOJA NAIR')).toBe('Pooja Nair');
    expect(sanitizeName('adv. rajesh kulkarni')).toBe('Rajesh Kulkarni');
    expect(sanitizeName('')).toBe('Navi Mumbai Prospect');
  });

  test('classifyLeadSource classifies ad platforms and referral channels', () => {
    expect(classifyLeadSource('Facebook Lead Gen', 'Kharghar Campaign').leadSource).toBe('META_ADS');
    expect(classifyLeadSource('Google Search Ads', '2BHK Taloja').leadSource).toBe('GOOGLE_ADS');
    expect(classifyLeadSource('99acres portal inquiry', '').leadSource).toBe('99ACRES_INQUIRY');
    expect(classifyLeadSource('MagicBricks', '').leadSource).toBe('MAGICBRICKS_INQUIRY');
  });

  test('Delimited text parser handles TSV (Tab Separated) and Pipe formats', () => {
    // TSV
    const tsvData = `Name\tPhone\tEmail\tBudget\tBHK\tLocation
Sameer Khan\t09820155667\tsameer@test.com\t70L\t2 BHK\tKharghar Sector 20
Ananya Sen\t9819033445\tananya@test.com\t1.4 Cr\t3 BHK\tKharghar Sector 36`;

    expect(detectDelimiter(tsvData.split('\n')[0])).toBe('\t');
    const tsvResult = parseDelimitedText(tsvData);
    expect(tsvResult.totalRows).toBe(2);
    expect(tsvResult.leads[0].fullName).toBe('Sameer Khan');
    expect(tsvResult.leads[0].phoneE164).toBe('+919820155667');
    expect(tsvResult.leads[0].budgetMax).toBe(7000000);

    // Pipe-separated
    const pipeData = `Name|Mobile|Budget|Locality
Vijay Rane|9967711223|50 Lakhs|Taloja 1`;
    expect(detectDelimiter(pipeData.split('\n')[0])).toBe('|');
    const pipeResult = parseDelimitedText(pipeData);
    expect(pipeResult.totalRows).toBe(1);
    expect(pipeResult.leads[0].fullName).toBe('Vijay Rane');
    expect(pipeResult.leads[0].phoneE164).toBe('+919967711223');
    expect(pipeResult.leads[0].primaryLocation).toBe('Taloja Phase 1');
  });

  test('JSON parser handles array of lead objects', () => {
    const jsonData = JSON.stringify([
      {
        fullName: 'Dr. Meera Joshi',
        phone: '09820199887',
        email: 'meera@test.com',
        budget: '1.6 Cr',
        bhk: '3 BHK',
        location: 'Kharghar Sector 37',
      },
    ]);

    const jsonResult = parseJSONContent(jsonData);
    expect(jsonResult.totalRows).toBe(1);
    expect(jsonResult.leads[0].fullName).toBe('Meera Joshi');
    expect(jsonResult.leads[0].phoneE164).toBe('+919820199887');
    expect(jsonResult.leads[0].budgetMax).toBe(16000000);
    expect(jsonResult.leads[0].assignedBrokerPhone).toBe('+917977552011');
  });

  test('Excel XLSX parser handles binary workbook data', () => {
    // Generate in-memory Excel workbook buffer
    const ws = XLSX.utils.json_to_sheet([
      {
        'Client Name': 'Gaurav Sawant',
        'Mobile Number': '9820144556',
        'Email Address': 'gaurav@test.com',
        'Target Budget': '85 Lakhs',
        'BHK Type': '2 BHK',
        'Locality': 'Kharghar Sector 35',
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'LeadsSheet');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const excelResult = parseExcelBuffer(buffer);
    expect(excelResult.totalRows).toBe(1);
    expect(excelResult.leads[0].fullName).toBe('Gaurav Sawant');
    expect(excelResult.leads[0].phoneE164).toBe('+919820144556');
    expect(excelResult.leads[0].budgetMax).toBe(8500000);
    expect(excelResult.leads[0].primaryLocation).toBe('Kharghar Sector 35');
  });

  test('Excel parser skips leading title/metadata rows and finds true header row', () => {
    // 2D array simulating a real-world export with 3 title rows before actual header
    const rawGridData = [
      ['METADATA REPORT - KHARGHAR & TALOJA INBOUND LEADS', ''],
      ['Generated On: 2026-08-20', 'Exported by: Admin'],
      ['', ''], // Empty row
      ['Full Name', 'Contact Number', 'Email Id', 'Budget', 'Configuration', 'Preferred Location'],
      ['Deepak Patil', '9820199999', 'deepak@test.com', '75 Lakhs', '2 BHK', 'Kharghar Sector 20'],
      ['Suresh Hegde', '09967788888', 'suresh@test.com', '1.1 Cr', '3 BHK', 'Taloja Phase 1'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rawGridData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'InboundLeads');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const result = parseExcelBuffer(buffer);
    expect(result.totalRows).toBe(2);
    expect(result.readyCount).toBe(2);
    expect(result.leads[0].fullName).toBe('Deepak Patil');
    expect(result.leads[0].phoneE164).toBe('+919820199999');
    expect(result.leads[0].budgetMax).toBe(7500000);

    expect(result.leads[1].fullName).toBe('Suresh Hegde');
    expect(result.leads[1].phoneE164).toBe('+919967788888');
    expect(result.leads[1].primaryLocation).toBe('Taloja Phase 1');
    expect(result.leads[1].assignedBrokerPhone).toBe('+919967731071'); // Suhel for Taloja
  });

  test('Data-driven inference automatically recovers unmapped columns', () => {
    // 2D array with generic column names "Col A", "Col B", "Col C", "Col D"
    const rawGridData = [
      ['Col A', 'Col B', 'Col C', 'Col D'],
      ['Karan Johar', '9820177777', 'karan@test.com', '60L'],
      ['Neha Sharma', '9820166666', 'neha@test.com', '1.5 Cr'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rawGridData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'GenericSheet');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const result = parseExcelBuffer(buffer);
    expect(result.totalRows).toBe(2);
    expect(result.readyCount).toBe(2);
    // Col B should have been inferred as phone!
    expect(result.leads[0].phoneE164).toBe('+919820177777');
    expect(result.leads[1].phoneE164).toBe('+919820166666');
    // Col C should have been inferred as email!
    expect(result.leads[0].email).toBe('karan@test.com');
  });

  test('Deduplication: findOrCreateContact matches existing contact by phone without creating duplicate', async () => {
    const org = await prisma.organization.findFirst();
    if (!org) return;

    const testPhone = '+919820112233';

    // 1. Create initial contact
    const contact1 = await findOrCreateContact({
      organizationId: org.id,
      fullName: 'Test Deduplication Buyer',
      phoneE164: testPhone,
      email: 'dedup.buyer@test.com',
      notes: 'Initial Facebook ad inquiry',
    });

    expect(contact1.id).toBeDefined();

    // 2. Ingest duplicate lead with same phone
    const contact2 = await findOrCreateContact({
      organizationId: org.id,
      fullName: 'Test Deduplication Buyer',
      phoneE164: testPhone,
      notes: 'Second inquiry from 99acres',
    });

    // Contact ID must match!
    expect(contact2.id).toBe(contact1.id);

    // Clean up test contact
    await prisma.contact.delete({
      where: { id: contact1.id },
    });
  });
});
