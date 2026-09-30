import { test, expect, describe } from 'bun:test';
import {
  formatDailyCallDigestWhatsApp,
  getIstDayRange,
  type DailyDigestData,
} from '../../src/lib/services/whatsapp-digest-service';

describe('WhatsApp Daily Digest Service: Timezone Boundaries', () => {
  test('calculates correct IST day boundaries', () => {
    // 29 Sep 2026 12:00:00 UTC = 29 Sep 2026 17:30:00 IST
    const date = new Date('2026-09-29T12:00:00Z');
    const { startOfDay, endOfDay, dateFormatted } = getIstDayRange(date);

    expect(dateFormatted).toContain('Sep');
    expect(dateFormatted).toContain('2026');
    // Start of day in IST (00:00:00 IST) should be 18:30:00 UTC on 28 Sep
    expect(startOfDay.toISOString()).toBe('2026-09-28T18:30:00.000Z');
    // End of day in IST (23:59:59.999 IST) should be 18:29:59.999 UTC on 29 Sep
    expect(endOfDay.toISOString()).toBe('2026-09-29T18:29:59.999Z');
  });
});

describe('WhatsApp Daily Digest Service: Message Formatting', () => {
  const mockDigestData: DailyDigestData = {
    dateFormatted: '29 Sep 2026',
    generatedAt: '08:00 PM',
    overall: {
      totalCalls: 32,
      inboundCalls: 12,
      outboundCalls: 20,
      missedCalls: 6,
      connectedCalls: 26,
      connectionRatePercent: 81.3,
      totalDurationSeconds: 6300,
      formattedDuration: '1h 45m',
      averageDurationSeconds: 242,
      outcomesBreakdown: { INTERESTED: 8, CALLBACK_REQUESTED: 4 },
      sentimentsBreakdown: { POSITIVE: 10 },
    },
    reps: [
      {
        userId: 'rep-1',
        fullName: 'Safwan Diwan',
        role: 'Senior Broker',
        totalCalls: 20,
        inboundCalls: 8,
        outboundCalls: 12,
        missedCalls: 3,
        connectedCalls: 17,
        connectionRatePercent: 85.0,
        totalDurationSeconds: 4200,
        formattedDuration: '1h 10m',
        averageDurationSeconds: 247,
        interestedCount: 5,
        callbackCount: 2,
        notInterestedCount: 1,
        noAnswerCount: 3,
        positiveSentimentCount: 7,
        rank: 1,
      },
      {
        userId: 'rep-2',
        fullName: 'Suhel Patel',
        role: 'Senior Broker',
        totalCalls: 12,
        inboundCalls: 4,
        outboundCalls: 8,
        missedCalls: 3,
        connectedCalls: 9,
        connectionRatePercent: 75.0,
        totalDurationSeconds: 2100,
        formattedDuration: '35m',
        averageDurationSeconds: 233,
        interestedCount: 3,
        callbackCount: 2,
        notInterestedCount: 0,
        noAnswerCount: 3,
        positiveSentimentCount: 3,
        rank: 2,
      },
    ],
    topLeads: [
      {
        leadName: 'Vikram Mehta',
        leadPhone: '+919820566778',
        repName: 'Safwan Diwan',
        durationSeconds: 185,
        callOutcome: 'INTERESTED',
        aiSummary: 'Client looking for ready 2 BHK in Kharghar Sector 35. Requested brochure and floor plans.',
        requirementSummary: '2 BHK in Navi Mumbai (Budget: ₹80L)',
      },
    ],
  };

  test('formats comprehensive WhatsApp markdown message with all sections', () => {
    const message = formatDailyCallDigestWhatsApp(mockDigestData);

    // Header & Date
    expect(message).toContain('Lucky CRM Daily Call Intelligence Report');
    expect(message).toContain('29 Sep 2026');
    expect(message).toContain('08:00 PM IST');

    // Company Call Summary
    expect(message).toContain('Total Calls: *32*');
    expect(message).toContain('26 Connected');
    expect(message).toContain('*81.3%* rate');
    expect(message).toContain('Total Talk Time: *1h 45m*');

    // Reps Breakdown
    expect(message).toContain('🥇 *Safwan Diwan*');
    expect(message).toContain('🥈 *Suhel Patel*');
    expect(message).toContain('*5 Interested*, *2 Callbacks*');

    // Top Leads
    expect(message).toContain('*1. Vikram Mehta* (+919820566778)');
    expect(message).toContain('Req: 2 BHK in Navi Mumbai (Budget: ₹80L)');
    expect(message).toContain('AI Note: _"Client looking for ready 2 BHK in Kharghar Sector 35.');

    // Action Items & CRM Companion Link
    expect(message).toContain('Review scheduled callbacks');
    // Companion link host varies by environment (localhost vs production domain)
    expect(message).toContain('/admin/companion');
  });
});
