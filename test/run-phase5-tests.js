const assert = require('assert');

// 1. WhatsApp Site Visit Itinerary Builder matching src/lib/domain/visit-dispatcher.ts
function buildWhatsAppSiteVisitItinerary(params) {
  const {
    leadName,
    scheduledDateFormatted,
    pickupLocation,
    cabDetails,
    assignedBrokerName,
    assignedBrokerPhone,
    stops,
  } = params;

  let message = `🚗 *ZamZam Properties • Confirmed Physical Site Visit Itinerary*\n\n`;
  message += `Hello ${leadName}! 😊 Your physical property inspection tour is confirmed for *${scheduledDateFormatted}*.\n\n`;
  message += `📍 *Pickup Point*: ${pickupLocation}\n`;
  if (cabDetails) {
    message += `🚕 *Cab Coordination*: ${cabDetails}\n`;
  }
  message += `👤 *Your ZamZam Property Advisor*: ${assignedBrokerName} (${assignedBrokerPhone})\n\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📋 *SCHEDULED TOUR ITINERARY (${stops.length} Projects)*:\n\n`;

  stops.forEach((stop, index) => {
    message += `*Stop ${index + 1}: ${stop.expectedTime}*\n`;
    message += `🏢 *${stop.projectName}* (${stop.bhk} BHK • Unit ${stop.unitNumber || 'Sample'})\n`;
    message += `📍 Location: ${stop.microMarket}\n`;
    if (stop.developerPocName) {
      message += `🤝 Site Manager: ${stop.developerPocName} (${stop.developerPocPhone || ''})\n`;
    }
    message += `🗺️ Google Maps: https://maps.google.com/?q=${encodeURIComponent(stop.googleMapsQuery || stop.projectName + ' ' + stop.microMarket)}\n\n`;
  });

  return message;
}

// 2. Commission Ledger Calculator matching src/lib/domain/commission-calculator.ts
function calculateDealCommission(input) {
  const agreementValue = Number(input.agreementValue);
  const brokeragePercent = input.brokeragePercent ? Number(input.brokeragePercent) : 2.5;
  const repSplitPercent = input.repSplitPercent ? Number(input.repSplitPercent) : 50;
  const coBrokerSharePercent = input.coBrokerSharePercent ? Number(input.coBrokerSharePercent) : 0;

  const grossBrokerageAmount = Math.round((agreementValue * brokeragePercent) / 100);
  const gstAmount = Math.round(grossBrokerageAmount * 0.18);
  const totalInvoiceAmountWithGst = grossBrokerageAmount + gstAmount;

  const coBrokerAmount = Math.round((grossBrokerageAmount * coBrokerSharePercent) / 100);
  const repCommissionAmount = Math.round(((grossBrokerageAmount - coBrokerAmount) * repSplitPercent) / 100);
  const firmNetBrokerageAmount = grossBrokerageAmount - repCommissionAmount - coBrokerAmount;

  return {
    agreementValue,
    brokeragePercent,
    grossBrokerageAmount,
    gstAmount,
    totalInvoiceAmountWithGst,
    repCommissionAmount,
    coBrokerAmount,
    firmNetBrokerageAmount,
  };
}

async function runPhase5Tests() {
  console.log('🧪 Running Suite: Phase 5 Site Visit Dispatcher & Deal Closing Ledger Tests\n');
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

  // --- SUITE 1: Site Visit Itinerary Dispatcher ---
  test('Test 1.1: Generate multi-project WhatsApp itinerary for Saturday tour', () => {
    const itinerary = buildWhatsAppSiteVisitItinerary({
      leadName: 'Rahul Sharma',
      leadPhone: '+919820199887',
      scheduledDateFormatted: 'Saturday, 22 Aug 2026',
      timeSlot: '11:00 AM',
      pickupLocation: 'Kharghar Railway Station (East)',
      cabDetails: 'Ertiga MH-46-AZ-1234 (Driver: Ramesh 9820011223)',
      assignedBrokerName: 'Usaid Patel',
      assignedBrokerPhone: '+919820123456',
      stops: [
        {
          unitId: 'unit-1',
          projectName: 'Crown Heights Luxury Towers',
          microMarket: 'Kharghar Sector 35',
          unitNumber: 'A-1204',
          bhk: 2,
          expectedTime: '11:00 AM',
          developerPocName: 'Rajesh Mehra',
          developerPocPhone: '+919876543210',
          googleMapsQuery: 'Crown Heights Kharghar Sector 35',
        },
        {
          unitId: 'unit-2',
          projectName: 'Sai Marvel Premium Residency',
          microMarket: 'Kharghar Sector 36',
          unitNumber: 'B-802',
          bhk: 2,
          expectedTime: '12:15 PM',
          developerPocName: 'Sunil Deshmukh',
          developerPocPhone: '+919811223344',
          googleMapsQuery: 'Sai Marvel Kharghar Sector 36',
        },
      ],
    });

    assert.ok(itinerary.includes('Rahul Sharma'));
    assert.ok(itinerary.includes('Saturday, 22 Aug 2026'));
    assert.ok(itinerary.includes('Kharghar Railway Station (East)'));
    assert.ok(itinerary.includes('Ertiga MH-46-AZ-1234'));
    assert.ok(itinerary.includes('Stop 1: 11:00 AM'));
    assert.ok(itinerary.includes('Crown Heights Luxury Towers'));
    assert.ok(itinerary.includes('Stop 2: 12:15 PM'));
    assert.ok(itinerary.includes('Sai Marvel Premium Residency'));
    assert.ok(itinerary.includes('https://maps.google.com/?q='));
  });

  // --- SUITE 2: Deal Commission Ledger Mathematics ---
  test('Test 2.1: Standard 2.5% developer brokerage on ₹68.00 Lakhs Agreement Value', () => {
    const res = calculateDealCommission({
      agreementValue: 6800000,
      brokeragePercent: 2.5,
      repSplitPercent: 50,
      coBrokerSharePercent: 0,
    });

    assert.strictEqual(res.grossBrokerageAmount, 170000); // ₹1.70L
    assert.strictEqual(res.gstAmount, 30600);              // 18% of ₹1.70L
    assert.strictEqual(res.totalInvoiceAmountWithGst, 200600);
    assert.strictEqual(res.repCommissionAmount, 85000);    // 50% of ₹1.70L
    assert.strictEqual(res.firmNetBrokerageAmount, 85000);
  });

  test('Test 2.2: Commission with Co-Broker 20% split on ₹1.20 Cr luxury booking (3% brokerage)', () => {
    const res = calculateDealCommission({
      agreementValue: 12000000,
      brokeragePercent: 3.0,
      repSplitPercent: 50,
      coBrokerSharePercent: 20, // 20% to external co-broker
    });

    assert.strictEqual(res.grossBrokerageAmount, 360000); // ₹3.60L
    assert.strictEqual(res.coBrokerAmount, 72000);         // 20% of ₹3.60L
    // Remaining = 3.60L - 72k = 2.88L
    assert.strictEqual(res.repCommissionAmount, 144000);   // 50% of 2.88L
    assert.strictEqual(res.firmNetBrokerageAmount, 144000);
  });

  console.log(`\n================================`);
  console.log(`Phase 5 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`================================\n`);

  if (failed > 0) process.exit(1);
}

runPhase5Tests();
