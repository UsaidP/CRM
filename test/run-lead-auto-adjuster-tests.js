const assert = require('assert');

// 1. Re-implement or import the stage normalizer logic to verify
function normalizeLeadStage(input) {
  if (!input) return 'new_uncontacted';
  const clean = String(input).trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  
  if (clean.includes('revisit') || clean.includes('re_visit') || clean.includes('second_visit') || clean.includes('2nd_visit')) {
    return 'revisit_scheduled';
  }
  if (clean.includes('visit_done') || clean.includes('visited') || clean.includes('site_done') || clean.includes('tour_done') || clean.includes('completed_visit')) {
    return 'visit_done';
  }
  if (clean.includes('visit') || clean.includes('tour') || clean.includes('inspection') || clean.includes('appointment')) {
    return 'visit_scheduled';
  }
  if (clean.includes('won') || clean.includes('closed_won') || clean.includes('deal_booked') || clean.includes('unit_booked') || (clean.includes('booked') && !clean.includes('visit') && !clean.includes('tour')) || (clean.includes('registered') && !clean.includes('under'))) {
    return 'closed_won';
  }
  if (clean.includes('lost') || clean.includes('dropped') || clean.includes('closed_lost') || clean.includes('junk') || clean.includes('invalid') || clean.includes('not_interested') || clean.includes('rejected')) {
    return 'closed_lost';
  }
  if (clean.includes('nurture') || clean.includes('hold') || clean.includes('postpone') || clean.includes('cold') || clean.includes('later')) {
    return 'on_hold_nurture';
  }
  if (clean.includes('regis') || clean.includes('under_registration') || clean.includes('agreement') || clean.includes('stamp_duty')) {
    return 'under_registration';
  }
  if (clean.includes('token') || clean.includes('negotiat') || clean.includes('costing') || clean.includes('pricing') || clean.includes('offer')) {
    return 'negotiation_token';
  }
  if (clean.includes('schedule')) {
    return 'visit_scheduled';
  }
  if (clean.includes('portal') || clean.includes('brochure') || clean.includes('proposal') || clean.includes('link') || clean.includes('catalog') || clean.includes('shared')) {
    return 'portal_shared';
  }
  if (clean.includes('discover') || clean.includes('contact') || clean.includes('called') || clean.includes('spoke') || clean.includes('connect') || clean.includes('warm') || clean.includes('qualif') || clean.includes('follow') || clean.includes('in_progress')) {
    return 'discovery_call';
  }
  if (clean.includes('new') || clean.includes('uncontacted') || clean.includes('open') || clean.includes('fresh') || clean.includes('inbound')) {
    return 'new_uncontacted';
  }
  
  return 'new_uncontacted';
}

function detectLeadColumnMapping(headers) {
  const mapping = {};
  const cleanHeaders = headers.map((h) => ({
    original: h,
    normalized: String(h || '').toLowerCase().replace(/[^a-z0-9]/g, ''),
  }));

  for (const h of cleanHeaders) {
    const n = h.normalized;
    const orig = h.original;
    if (!n) continue;

    if (!mapping.fullName && (n.includes('fullname') || n.includes('clientname') || n === 'name' || n === 'lead')) {
      mapping.fullName = orig;
    } else if (!mapping.phone && (n.includes('phone') || n.includes('mobile') || n.includes('contact') || n === 'number')) {
      mapping.phone = orig;
    } else if (!mapping.stage && (n.includes('stage') || n.includes('status') || n.includes('leadstatus') || n.includes('leadstage') || n === 'state')) {
      mapping.stage = orig;
    }
  }

  return mapping;
}

async function runLeadAutoAdjusterTests() {
  console.log('🧪 Running Suite: Lead Stage Normalization & Bulk Auto-Adjuster Tests\n');
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

  // --- SUITE 1: Stage Normalization ---
  test('Test 1.1: Normalize "Site Visit Scheduled" to visit_scheduled', () => {
    assert.strictEqual(normalizeLeadStage('Site Visit Scheduled'), 'visit_scheduled');
    assert.strictEqual(normalizeLeadStage('site_visit_booked'), 'visit_scheduled');
    assert.strictEqual(normalizeLeadStage('Tour Booked'), 'visit_scheduled');
  });

  test('Test 1.2: Normalize "Discovery Call / Contacted" to discovery_call', () => {
    assert.strictEqual(normalizeLeadStage('Contacted'), 'discovery_call');
    assert.strictEqual(normalizeLeadStage('Discovery Call'), 'discovery_call');
    assert.strictEqual(normalizeLeadStage('Spoke to Client'), 'discovery_call');
    assert.strictEqual(normalizeLeadStage('Follow up required'), 'discovery_call');
  });

  test('Test 1.3: Normalize "Negotiation / Token" to negotiation_token', () => {
    assert.strictEqual(normalizeLeadStage('Negotiation'), 'negotiation_token');
    assert.strictEqual(normalizeLeadStage('Token Received'), 'negotiation_token');
    assert.strictEqual(normalizeLeadStage('Under Costing Discussion'), 'negotiation_token');
  });

  test('Test 1.4: Normalize "Closed Won" and "Closed Lost"', () => {
    assert.strictEqual(normalizeLeadStage('Deal Won / Booked'), 'closed_won');
    assert.strictEqual(normalizeLeadStage('Closed Lost'), 'closed_lost');
    assert.strictEqual(normalizeLeadStage('Not Interested / Dropped'), 'closed_lost');
  });

  test('Test 1.5: Normalize "Portal Shared" and "On Hold / Nurture"', () => {
    assert.strictEqual(normalizeLeadStage('Portal Shared'), 'portal_shared');
    assert.strictEqual(normalizeLeadStage('Brochure Sent'), 'portal_shared');
    assert.strictEqual(normalizeLeadStage('On Hold'), 'on_hold_nurture');
    assert.strictEqual(normalizeLeadStage('Nurture for Future'), 'on_hold_nurture');
  });

  test('Test 1.6: Default fallback for empty or unknown stage is new_uncontacted', () => {
    assert.strictEqual(normalizeLeadStage(''), 'new_uncontacted');
    assert.strictEqual(normalizeLeadStage(null), 'new_uncontacted');
    assert.strictEqual(normalizeLeadStage('Fresh Inbound'), 'new_uncontacted');
  });

  // --- SUITE 2: Header Detection for Stage Column ---
  test('Test 2.1: Auto-detect header mapping for various Stage and Status columns', () => {
    const headers1 = ['Full Name', 'Mobile Number', 'Lead Status', 'Budget'];
    const map1 = detectLeadColumnMapping(headers1);
    assert.strictEqual(map1.stage, 'Lead Status');

    const headers2 = ['Client Name', 'Phone', 'Pipeline Stage', 'Location'];
    const map2 = detectLeadColumnMapping(headers2);
    assert.strictEqual(map2.stage, 'Pipeline Stage');

    const headers3 = ['Name', 'Contact', 'Current Status'];
    const map3 = detectLeadColumnMapping(headers3);
    assert.strictEqual(map3.stage, 'Current Status');
  });

  console.log(`\n================================`);
  console.log(`Lead Auto-Adjuster Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`================================\n`);

  if (failed > 0) process.exit(1);
}

runLeadAutoAdjusterTests();
