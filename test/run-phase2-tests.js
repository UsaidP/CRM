const assert = require('assert');

// 1. Phone Normalizer implementation matching src/lib/domain/phone-normalizer.ts
function normalizeIndianPhone(input) {
  if (!input) {
    return { isValid: false, e164: '', nationalFormat: '', rawInput: '', error: 'Phone number cannot be empty' };
  }
  const raw = String(input).trim();
  const digitsOnly = raw.replace(/\D/g, '');
  let tenDigitNumber = '';

  if (digitsOnly.length === 10) {
    tenDigitNumber = digitsOnly;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    tenDigitNumber = digitsOnly.substring(1);
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    tenDigitNumber = digitsOnly.substring(2);
  } else if (digitsOnly.length === 13 && digitsOnly.startsWith('091')) {
    tenDigitNumber = digitsOnly.substring(3);
  } else {
    return { isValid: false, e164: '', nationalFormat: '', rawInput: raw, error: `Invalid phone length` };
  }

  const firstDigit = tenDigitNumber.charAt(0);
  if (!['6', '7', '8', '9'].includes(firstDigit)) {
    return { isValid: false, e164: '', nationalFormat: '', rawInput: raw, error: `Invalid Indian mobile starting digit '${firstDigit}'` };
  }

  return {
    isValid: true,
    e164: `+91${tenDigitNumber}`,
    nationalFormat: `${tenDigitNumber.slice(0, 5)} ${tenDigitNumber.slice(5)}`,
    rawInput: raw,
  };
}

// 2. Attribution Engine parser matching src/lib/domain/attribution-engine.ts
function parseInboundMessageText(messageText) {
  const text = messageText || '';
  const lower = text.toLowerCase();

  let detectedChannel = 'WHATSAPP_GROUP';
  if (lower.includes('youtube short') || lower.includes('yt short') || lower.includes('shorts')) {
    detectedChannel = 'YOUTUBE_SHORT';
  } else if (lower.includes('youtube') || lower.includes('video review')) {
    detectedChannel = 'YOUTUBE_VIDEO';
  } else if (lower.includes('reel') || lower.includes('instagram reel') || lower.includes('insta')) {
    detectedChannel = 'INSTAGRAM_REEL';
  } else if (lower.includes('fb') || lower.includes('facebook')) {
    detectedChannel = 'FB_GROUP';
  } else if (lower.includes('whatsapp') || lower.includes('wa group') || lower.includes('broadcast')) {
    detectedChannel = 'WHATSAPP_GROUP';
  }

  const refMatch = text.match(/\[Ref:\s*([^\]]+)\]/i) || text.match(/#([A-Za-z0-9_-]+)/);
  const detectedRefCode = refMatch ? refMatch[1].trim() : undefined;

  let detectedBhk = undefined;
  if (lower.includes('1 bhk') || lower.includes('1bhk')) detectedBhk = 1;
  else if (lower.includes('2 bhk') || lower.includes('2bhk')) detectedBhk = 2;
  else if (lower.includes('3 bhk') || lower.includes('3bhk')) detectedBhk = 3;

  let detectedProjectKeyword = undefined;
  if (lower.includes('crown') || lower.includes('crown heights')) detectedProjectKeyword = 'Crown Heights';
  else if (lower.includes('marvel') || lower.includes('sai marvel')) detectedProjectKeyword = 'Sai Marvel';
  else if (lower.includes('galaxy') || lower.includes('galaxy metro')) detectedProjectKeyword = 'Galaxy Metro Heights';

  return {
    detectedChannel,
    detectedRefCode,
    detectedBhk,
    detectedProjectKeyword,
    rawMessage: text,
  };
}

async function runPhase2Tests() {
  console.log('🧪 Running Suite: Phase 2 Organic Inbound Lead Attribution & Ingestion\n');
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

  // --- SUITE 1: E.164 Phone Normalization ---
  test('Test 1.1: 10-digit standard Indian mobile formats', () => {
    const res = normalizeIndianPhone('9820123456');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.e164, '+919820123456');
  });

  test('Test 1.2: Leading zero normalization (09820123456)', () => {
    const res = normalizeIndianPhone('09820123456');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.e164, '+919820123456');
  });

  test('Test 1.3: Country code with spaces (+91 98201 23456)', () => {
    const res = normalizeIndianPhone('+91 98201 23456');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.e164, '+919820123456');
  });

  test('Test 1.4: Country code without plus (919820123456)', () => {
    const res = normalizeIndianPhone('919820123456');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.e164, '+919820123456');
  });

  test('Test 1.5: Reject invalid starting digit (2345678901)', () => {
    const res = normalizeIndianPhone('2345678901');
    assert.strictEqual(res.isValid, false);
  });

  // --- SUITE 2: Organic Attribution & Message Parsing ---
  test('Test 2.1: Parse YouTube Short inquiry with Ref tag and Project', () => {
    const text = 'Hi ZamZam, saw your YouTube Short of Sai Marvel 2BHK [Ref: #YT-MARVEL-01]. Please share price.';
    const res = parseInboundMessageText(text);

    assert.strictEqual(res.detectedChannel, 'YOUTUBE_SHORT');
    assert.strictEqual(res.detectedRefCode, '#YT-MARVEL-01');
    assert.strictEqual(res.detectedBhk, 2);
    assert.strictEqual(res.detectedProjectKeyword, 'Sai Marvel');
  });

  test('Test 2.2: Parse Instagram Reel inquiry with BHK and Crown Heights', () => {
    const text = 'Interested in Crown Heights Luxury 3 BHK from your Instagram Reel #KG35-CROWN';
    const res = parseInboundMessageText(text);

    assert.strictEqual(res.detectedChannel, 'INSTAGRAM_REEL');
    assert.strictEqual(res.detectedRefCode, 'KG35-CROWN');
    assert.strictEqual(res.detectedBhk, 3);
    assert.strictEqual(res.detectedProjectKeyword, 'Crown Heights');
  });

  test('Test 2.3: Parse Facebook Group referral inquiry', () => {
    const text = 'Hello from Kharghar Property FB Group, looking for 1 BHK in Taloja';
    const res = parseInboundMessageText(text);

    assert.strictEqual(res.detectedChannel, 'FB_GROUP');
    assert.strictEqual(res.detectedBhk, 1);
  });

  console.log(`\n================================`);
  console.log(`Phase 2 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`================================\n`);

  if (failed > 0) process.exit(1);
}

runPhase2Tests();
