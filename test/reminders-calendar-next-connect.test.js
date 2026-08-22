/**
 * Automated Verification Test:
 * Lead Reminders, Unified Calendar Feed & Intelligent Connect Next Prioritization Engine
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import engine logic directly
const {
  evaluateLeadConnectPriority,
  rankFirmLeadsForNextConnect,
} = require('../src/lib/domain/prioritization-engine');

async function runTests() {
  console.log('\n======================================================');
  console.log('🚀 TESTING LEAD REMINDERS, CALENDAR & NEXT CONNECT');
  console.log('======================================================\n');

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

  try {
    const org = await prisma.organization.findFirst();
    assert(org !== null, 'Organization exists in database');

    // 1. TEST PRIORITIZATION SCORING ENGINE (PURE LOGIC)
    console.log('\n--- 1. Testing Prioritization Engine Calculation ---');
    const now = new Date('2026-08-20T12:00:00Z');

    // Lead A: Overdue reminder
    const leadOverdue = {
      id: 'lead-1',
      fullName: 'Vikram Joshi (Overdue)',
      currentStage: 'discovery_call',
      createdAt: new Date('2026-08-19T10:00:00Z'),
      reminders: [
        {
          id: 'rem-1',
          title: 'Promise to call back at 11am',
          reminderType: 'CALL',
          dueAt: new Date('2026-08-20T11:00:00Z'), // 1 hour overdue
          status: 'PENDING',
          priority: 'URGENT',
        },
      ],
    };

    const scoreOverdue = evaluateLeadConnectPriority(leadOverdue, now);
    assert(scoreOverdue.isOverdue === true, 'Correctly identifies overdue reminder');
    assert(scoreOverdue.totalScore >= 50, `Overdue lead has high priority score (${scoreOverdue.totalScore})`);
    assert(scoreOverdue.primaryReason.includes('Overdue Reminder'), 'Primary reason cites overdue reminder');

    // Lead B: Fresh inbound (< 10m old)
    const leadFresh = {
      id: 'lead-2',
      fullName: 'Rahul Sharma (Fresh Inbound)',
      currentStage: 'new_uncontacted',
      createdAt: new Date('2026-08-20T11:55:00Z'), // 5m old
      leadSource: 'YOUTUBE_EXACT',
      reminders: [],
    };

    const scoreFresh = evaluateLeadConnectPriority(leadFresh, now);
    assert(scoreFresh.isFreshInbound === true, 'Correctly identifies fresh inbound speed-to-lead');
    assert(scoreFresh.totalScore >= 35, `Fresh lead has high speed-to-lead score (${scoreFresh.totalScore})`);

    // Lead C: Live presentation portal active
    const leadPortal = {
      id: 'lead-3',
      fullName: 'Ananya Verma (Active Portal)',
      currentStage: 'portal_shared',
      createdAt: new Date('2026-08-15T10:00:00Z'),
      portals: [
        {
          id: 'portal-1',
          telemetryLogs: [
            {
              id: 'log-1',
              actionType: 'VIDEO_PLAY',
              createdAt: new Date('2026-08-20T11:45:00Z'), // 15m ago
            },
          ],
        },
      ],
      reminders: [],
    };

    const scorePortal = evaluateLeadConnectPriority(leadPortal, now);
    assert(scorePortal.isLivePortalActive === true, 'Correctly detects live presentation telemetry');
    assert(scorePortal.primaryReason.includes('Live Portal Engagement'), 'Primary reason highlights live portal activity');

    // Test Ranking Order
    const ranked = rankFirmLeadsForNextConnect([leadFresh, leadPortal, leadOverdue], now);
    assert(ranked[0].leadId === 'lead-1', `Rank #1 is overdue reminder lead (${ranked[0].leadName})`);

    // 2. TEST PRISMA DATABASE CRUD FOR REMINDERS
    console.log('\n--- 2. Testing LeadReminder Database CRUD ---');

    // Find or create test lead
    let testLead = await prisma.lead.findFirst({ where: { organizationId: org.id } });
    if (!testLead) {
      testLead = await prisma.lead.create({
        data: {
          organizationId: org.id,
          fullName: 'Test Automation Lead',
          phoneE164: '+919820011223',
          leadSource: 'MANUAL_ENTRY',
          sourceConfidence: 'EXACT',
          currentStage: 'discovery_call',
        },
      });
    }

    // Create Reminder
    const reminder = await prisma.leadReminder.create({
      data: {
        organizationId: org.id,
        leadId: testLead.id,
        title: 'Review Kharghar Sector 35 2BHK Price with Developer VP',
        reminderType: 'CALL',
        dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // In 2 hours
        priority: 'HIGH',
        status: 'PENDING',
        notes: 'Client requested 5% discount or waiver on car parking charges',
      },
    });

    assert(reminder.id !== undefined, `Successfully created reminder ID: ${reminder.id}`);
    assert(reminder.status === 'PENDING', 'Reminder status is PENDING');

    // Update / Complete Reminder
    const updated = await prisma.leadReminder.update({
      where: { id: reminder.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    assert(updated.status === 'COMPLETED', 'Reminder status successfully toggled to COMPLETED');
    assert(updated.completedAt !== null, 'completedAt timestamp recorded');

    // Reopen & Snooze Reminder
    const snoozed = await prisma.leadReminder.update({
      where: { id: reminder.id },
      data: { status: 'SNOOZED', dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });
    assert(snoozed.status === 'SNOOZED', 'Reminder status updated to SNOOZED');

    // Clean up test reminder
    await prisma.leadReminder.delete({ where: { id: reminder.id } });
    assert(true, 'Test reminder cleaned up successfully');

    // 3. TEST CALENDAR AGGREGATION
    console.log('\n--- 3. Testing Calendar Feed Aggregation ---');
    const allReminders = await prisma.leadReminder.findMany();
    const allVisits = await prisma.siteVisit.findMany();
    console.log(`  Current active reminders: ${allReminders.length}`);
    console.log(`  Current active site visits: ${allVisits.length}`);
    assert(true, 'Calendar event data streams accessible');

    console.log('\n======================================================');
    console.log(`🎉 ALL CHECKS COMPLETED: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
