const assert = require('assert');
const { 
  parseDelimitedText, 
  parseJSONContent, 
  parseHTMLTable, 
  parseUnstructuredText, 
  parseUniversalLeadData,
  detectDelimiter 
} = require('../src/lib/domain/lead-file-parser');
const { 
  normalizeLeadStage, 
  resolveMicroMarket, 
  sanitizeName, 
  classifyLeadSource,
  extractBhkPreferences,
  parseBudgetINR 
} = require('../src/lib/domain/lead-auto-adjuster');

console.log('🧪 Running Suite: Universal Multi-Format Lead Capture & Normalization Tests\n');

let passed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// ==========================================
// 1. Delimiter & CSV / TSV / Pipe / Semicolon
// ==========================================
test('Test 1.1: Auto-detect Delimiters (Comma, Tab, Pipe, Semicolon)', () => {
  assert.strictEqual(detectDelimiter('Name,Phone,Email,Budget'), ',');
  assert.strictEqual(detectDelimiter('Name\tPhone\tEmail\tBudget'), '\t');
  assert.strictEqual(detectDelimiter('Name|Phone|Email|Budget'), '|');
  assert.strictEqual(detectDelimiter('Name;Phone;Email;Budget'), ';');
});

test('Test 1.2: Parse Pipe-Delimited text with pipeline stages', () => {
  const pipeText = `Name|Phone|Budget|Location|Stage
Amitabh Verma|9820123456|75L|Kharghar Sector 35|Site Visit Scheduled
Pooja Nair|9819054321|1.2 Cr|Upper Kharghar|Negotiation`;

  const res = parseDelimitedText(pipeText);
  assert.strictEqual(res.totalRows, 2);
  assert.strictEqual(res.leads[0].fullName, 'Amitabh Verma');
  assert.strictEqual(res.leads[0].phoneE164, '+919820123456');
  assert.strictEqual(res.leads[0].stage, 'visit_scheduled');
  assert.strictEqual(res.leads[1].stage, 'negotiation_token');
});

test('Test 1.3: Parse Headerless CSV data without discarding first row', () => {
  const headerlessCsv = `Amitabh Verma,9820123456,amitabh@test.com,65L,2 BHK,Kharghar Sec 35
Pooja Nair,9819054321,pooja@test.com,1.2 Cr,3 BHK,Kharghar Sec 36`;

  const res = parseDelimitedText(headerlessCsv);
  assert.strictEqual(res.totalRows, 2);
  assert.strictEqual(res.leads[0].fullName, 'Amitabh Verma');
  assert.strictEqual(res.leads[0].phoneE164, '+919820123456');
  assert.strictEqual(res.leads[1].fullName, 'Pooja Nair');
});

// ==========================================
// 2. HTML Tables & Web Scrapes
// ==========================================
test('Test 2.1: Parse HTML Table extracted from web portals or Google Sheets copy-paste', () => {
  const html = `
    <table>
      <thead>
        <tr>
          <th>Client Name</th>
          <th>Mobile No</th>
          <th>Budget</th>
          <th>BHK</th>
          <th>Micro Market</th>
          <th>Current Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Dr. Anil Deshpande</td>
          <td>+91 9820011223</td>
          <td>2.25 Cr</td>
          <td>3 BHK</td>
          <td>Kharghar Sector 37</td>
          <td>Discovery Call</td>
        </tr>
        <tr>
          <td>Farhan Qureshi</td>
          <td>9819022334</td>
          <td>55 Lakhs</td>
          <td>1 BHK</td>
          <td>Taloja Phase 1 Sector 11</td>
          <td>Site Visit Done</td>
        </tr>
      </tbody>
    </table>
  `;

  const res = parseHTMLTable(html);
  assert.strictEqual(res.totalRows, 2);
  assert.strictEqual(res.leads[0].fullName, 'Anil Deshpande');
  assert.strictEqual(res.leads[0].phoneE164, '+919820011223');
  assert.strictEqual(res.leads[0].stage, 'discovery_call');
  assert.strictEqual(res.leads[1].stage, 'visit_done');
});

// ==========================================
// 3. Unstructured Text: Key-Value & WhatsApp Logs
// ==========================================
test('Test 3.1: Parse Key-Value formatted text blocks', () => {
  const kvText = `
Name: Rajesh Kulkarni
Phone: +91 9820098765
Email: rajesh.k@example.com
Budget: 45-55 Lakhs
BHK: 2 BHK
Location: Taloja Phase 1
Stage: Discovery Call
Source: WhatsApp Inquiry

---

Name: Sneha Deshmukh
Phone: 9967712345
Budget: 75 Lacs
BHK: 2 BHK
Location: Kharghar Sector 20
Stage: Closed Won
Source: Direct Call
  `;

  const res = parseUnstructuredText(kvText);
  assert.strictEqual(res.totalRows, 2);
  assert.strictEqual(res.leads[0].fullName, 'Rajesh Kulkarni');
  assert.strictEqual(res.leads[0].stage, 'discovery_call');
  assert.strictEqual(res.leads[1].fullName, 'Sneha Deshmukh');
  assert.strictEqual(res.leads[1].stage, 'closed_won');
  assert.strictEqual(res.leads[1].budgetMax, 7500000);
});

test('Test 3.2: Parse WhatsApp Chat Export logs with phone numbers and inquiries', () => {
  const waChat = `
[27/08/26, 2:30:15 PM] +91 9820445566: Hi looking for 3 BHK in Kharghar Sector 36 under 1.5 Cr near Metro station.
[27/08/26, 3:15:20 PM] +91 9819998877: Rahul here, need 2 BHK in Taloja Phase 1 under 50 Lakhs.
  `;

  const res = parseUnstructuredText(waChat);
  assert.strictEqual(res.totalRows, 2);
  assert.strictEqual(res.leads[0].phoneE164, '+919820445566');
  assert.strictEqual(res.leads[0].budgetMax, 15000000);
  assert.strictEqual(res.leads[1].phoneE164, '+919819998877');
  assert.strictEqual(res.leads[1].budgetMax, 5000000);
});

// ==========================================
// 4. JSON & JSONL Parsing
// ==========================================
test('Test 4.1: Parse JSONL (JSON Lines) streams', () => {
  const jsonl = `{"name":"Amitabh Verma","phone":"9820123456","budget":"75L","stage":"Site Visit Scheduled"}
{"name":"Pooja Nair","phone":"9819054321","budget":"1.2 Cr","stage":"Negotiation"}`;

  const res = parseJSONContent(jsonl);
  assert.strictEqual(res.totalRows, 2);
  assert.strictEqual(res.leads[0].fullName, 'Amitabh Verma');
  assert.strictEqual(res.leads[0].stage, 'visit_scheduled');
  assert.strictEqual(res.leads[1].stage, 'negotiation_token');
});

// ==========================================
// 5. Universal Master Dispatcher
// ==========================================
test('Test 5.1: Master Universal Dispatcher correctly routes across formats', () => {
  const csvRes = parseUniversalLeadData('Name,Phone,Budget\nVikram Rao,9769011223,1.8 Cr');
  assert.strictEqual(csvRes.leads[0].fullName, 'Vikram Rao');

  const jsonRes = parseUniversalLeadData('[{"name":"Vikram Rao","phone":"9769011223","budget":"1.8 Cr"}]');
  assert.strictEqual(jsonRes.leads[0].fullName, 'Vikram Rao');

  const htmlRes = parseUniversalLeadData('<table><tr><th>Name</th><th>Phone</th></tr><tr><td>Vikram Rao</td><td>9769011223</td></tr></table>');
  assert.strictEqual(htmlRes.leads[0].fullName, 'Vikram Rao');
});

// ==========================================
// 6. Name Sanitization with Email Fallback
// ==========================================
test('Test 6.1: Extract clean human name from email when name is missing or generic', () => {
  assert.strictEqual(sanitizeName('', 'amitabh.verma@barclays.com'), 'Amitabh Verma');
  assert.strictEqual(sanitizeName('Lead', 'rahul.sharma@infosys.com'), 'Rahul Sharma');
  assert.strictEqual(sanitizeName('Deshmukh, Sneha', ''), 'Sneha Deshmukh');
});

console.log('\n================================');
console.log(`Universal Lead Capture Results: ${passed} Passed, 0 Failed`);
console.log('================================\n');
