const assert = require('assert');

// 1. Portal Token Generator matching src/lib/domain/portal-generator.ts
function generatePortalToken(leadName, bhkDescription = 'options') {
  const cleanName = (leadName || 'client')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20);

  const cleanBhk = bhkDescription
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .slice(0, 15);

  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${cleanName}-${cleanBhk}-${randomSuffix}`;
}

// 2. WhatsApp Portal Share Text Builder
function buildWhatsAppPortalShareText(params) {
  const { leadName, portalUrl, propertyCount, microMarkets } = params;
  const marketList = microMarkets.join(' & ');

  return `Hello ${leadName}! 😊\n\nBased on our conversation, we have curated *${propertyCount} verified property options* in *${marketList}* matching your budget & timeline.\n\n📱 View your private, verified options here:\n👉 ${portalUrl}\n\nKey Highlights:\n✅ 100% MahaRERA Verified\n✅ Full All-In Statutory Cost Sheets Included\n✅ Verified Photos & Walkthrough Videos\n\nFeel free to tap *Ask on WhatsApp* or *Book Site Visit* directly on any property!`;
}

// 3. Telemetry Engagement Tier Evaluator
function evaluateEngagementTier(logs) {
  let totalViews = 0;
  let dwellTimeSeconds = 0;
  let photoSwipes = 0;
  let brochureDownloads = 0;
  let videoPlays = 0;
  let whatsAppInquiries = 0;
  let visitBookingsRequested = 0;

  for (const log of logs) {
    dwellTimeSeconds += log.dwellTimeSec || 0;
    switch (log.actionType) {
      case 'PORTAL_OPEN':
        totalViews++;
        break;
      case 'PHOTO_SWIPE':
        photoSwipes++;
        break;
      case 'BROCHURE_DOWNLOAD':
        brochureDownloads++;
        break;
      case 'VIDEO_PLAY':
        videoPlays++;
        break;
      case 'WHATSAPP_CLICK':
        whatsAppInquiries++;
        break;
      case 'VISIT_BOOKING_CLICK':
        visitBookingsRequested++;
        break;
    }
  }

  let engagementTier = 'NO_ACTIVITY';
  let brokerAlertMessage = undefined;

  if (visitBookingsRequested > 0 || whatsAppInquiries > 0 || (brochureDownloads > 0 && photoSwipes >= 4)) {
    engagementTier = 'HOT_PROSPECT';
    brokerAlertMessage = '🔥 HOT LEAD: Client is actively requesting visit/details or downloaded brochure!';
  } else if (photoSwipes >= 2 || totalViews >= 2 || dwellTimeSeconds >= 45) {
    engagementTier = 'WARM_INTEREST';
    brokerAlertMessage = '⚡ WARM LEAD: Client spent >45s browsing photos & specs.';
  } else if (totalViews > 0) {
    engagementTier = 'INITIAL_VIEW';
  }

  return {
    totalViews,
    dwellTimeSeconds,
    photoSwipes,
    brochureDownloads,
    videoPlays,
    whatsAppInquiries,
    visitBookingsRequested,
    engagementTier,
    brokerAlertMessage,
  };
}

async function runPhase4Tests() {
  console.log('🧪 Running Suite: Phase 4 Tokenized Client Portal & Real-Time Telemetry Tests\n');
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

  // --- SUITE 1: Token & URL Generation ---
  test('Test 1.1: Generate slugified portal token for Rahul Sharma', () => {
    const token = generatePortalToken('Rahul Sharma', '2bhk-options');
    assert.ok(token.startsWith('rahul-sharma-2bhk-options-'));
    assert.ok(/^[a-z0-9-]+$/.test(token), 'Token must contain only URL-safe lowercase alphanumerics & hyphens');
  });

  test('Test 1.2: Generate prefilled WhatsApp share message', () => {
    const msg = buildWhatsAppPortalShareText({
      leadName: 'Rahul Sharma',
      portalUrl: 'http://localhost:3000/p/rahul-2bhk-options-8f2a',
      propertyCount: 2,
      microMarkets: ['Kharghar Sector 35', 'Kharghar Sector 36'],
    });

    assert.ok(msg.includes('Hello Rahul Sharma!'));
    assert.ok(msg.includes('2 verified property options'));
    assert.ok(msg.includes('Kharghar Sector 35 & Kharghar Sector 36'));
    assert.ok(msg.includes('http://localhost:3000/p/rahul-2bhk-options-8f2a'));
    assert.ok(msg.includes('MahaRERA Verified'));
  });

  // --- SUITE 2: Telemetry Scoring & Hot Lead Detection ---
  test('Test 2.1: Detect Initial View tier on simple open', () => {
    const logs = [{ actionType: 'PORTAL_OPEN', dwellTimeSec: 10 }];
    const res = evaluateEngagementTier(logs);
    assert.strictEqual(res.engagementTier, 'INITIAL_VIEW');
    assert.strictEqual(res.totalViews, 1);
  });

  test('Test 2.2: Detect Warm Interest tier on photo browsing & dwell time >45s', () => {
    const logs = [
      { actionType: 'PORTAL_OPEN', dwellTimeSec: 15 },
      { actionType: 'PHOTO_SWIPE', dwellTimeSec: 20 },
      { actionType: 'PHOTO_SWIPE', dwellTimeSec: 20 },
    ];
    const res = evaluateEngagementTier(logs);
    assert.strictEqual(res.engagementTier, 'WARM_INTEREST');
    assert.strictEqual(res.photoSwipes, 2);
    assert.strictEqual(res.dwellTimeSeconds, 55);
  });

  test('Test 2.3: Detect HOT PROSPECT tier on Site Visit request / WhatsApp click', () => {
    const logs = [
      { actionType: 'PORTAL_OPEN', dwellTimeSec: 10 },
      { actionType: 'PHOTO_SWIPE', dwellTimeSec: 5 },
      { actionType: 'VISIT_BOOKING_CLICK', dwellTimeSec: 25 },
    ];
    const res = evaluateEngagementTier(logs);
    assert.strictEqual(res.engagementTier, 'HOT_PROSPECT');
    assert.ok(res.brokerAlertMessage.includes('HOT LEAD'));
  });

  console.log(`\n================================`);
  console.log(`Phase 4 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`================================\n`);

  if (failed > 0) process.exit(1);
}

runPhase4Tests();
