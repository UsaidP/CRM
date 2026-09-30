import { test, expect, describe } from 'bun:test';
import {
  formatCallDuration,
  computeRepCallPerformance,
  computeCallAnalyticsOverall,
  type CallLogItem,
} from '../../src/lib/domain/call-analytics-engine';

describe('Call Analytics Engine: Duration Formatting', () => {
  test('formats zero and negative seconds cleanly', () => {
    expect(formatCallDuration(0)).toBe('0s');
    expect(formatCallDuration(-10)).toBe('0s');
  });

  test('formats seconds under one minute', () => {
    expect(formatCallDuration(45)).toBe('45s');
  });

  test('formats minutes and seconds', () => {
    expect(formatCallDuration(145)).toBe('2m 25s');
  });

  test('formats hours, minutes, and seconds', () => {
    expect(formatCallDuration(3665)).toBe('1h 1m 5s');
  });
});

describe('Call Analytics Engine: Rep Call Performance & Ranking', () => {
  const mockUsers = [
    { id: 'usr-1', fullName: 'Safwan Diwan', role: 'SENIOR_BROKER' },
    { id: 'usr-2', fullName: 'Suhel Patel', role: 'SENIOR_BROKER' },
  ];

  const mockCalls: CallLogItem[] = [
    // Safwan: 2 calls, 1 connected (120s), 1 missed (0s)
    {
      id: 'c1',
      leadId: 'l1',
      channel: 'PHONE_CALL',
      direction: 'OUTBOUND',
      callDurationSeconds: 120,
      callOutcome: 'INTERESTED',
      aiSentiment: 'POSITIVE',
      assignedBrokerId: 'usr-1',
      createdAt: new Date(),
    },
    {
      id: 'c2',
      leadId: 'l2',
      channel: 'PHONE_CALL',
      direction: 'INBOUND',
      callDurationSeconds: 0,
      callOutcome: 'NO_ANSWER',
      assignedBrokerId: 'usr-1',
      createdAt: new Date(),
    },
    // Suhel: 1 call, connected (300s)
    {
      id: 'c3',
      leadId: 'l3',
      channel: 'PHONE_CALL',
      direction: 'OUTBOUND',
      callDurationSeconds: 300,
      callOutcome: 'CALLBACK_REQUESTED',
      aiSentiment: 'NEUTRAL',
      assignedBrokerId: 'usr-2',
      createdAt: new Date(),
    },
  ];

  test('computes correct call counts, connection rates and durations per rep', () => {
    const reps = computeRepCallPerformance(mockUsers, mockCalls);

    const safwan = reps.find((r) => r.userId === 'usr-1')!;
    expect(safwan).toBeDefined();
    expect(safwan.totalCalls).toBe(2);
    expect(safwan.outboundCalls).toBe(1);
    expect(safwan.inboundCalls).toBe(1);
    expect(safwan.connectedCalls).toBe(1);
    expect(safwan.missedCalls).toBe(1);
    expect(safwan.connectionRatePercent).toBe(50.0);
    expect(safwan.totalDurationSeconds).toBe(120);
    expect(safwan.formattedDuration).toBe('2m');
    expect(safwan.averageDurationSeconds).toBe(120);
    expect(safwan.interestedCount).toBe(1);
    expect(safwan.positiveSentimentCount).toBe(1);

    const suhel = reps.find((r) => r.userId === 'usr-2')!;
    expect(suhel).toBeDefined();
    expect(suhel.totalCalls).toBe(1);
    expect(suhel.connectedCalls).toBe(1);
    expect(suhel.connectionRatePercent).toBe(100.0);
    expect(suhel.totalDurationSeconds).toBe(300);
    expect(suhel.formattedDuration).toBe('5m');
    expect(suhel.callbackCount).toBe(1);
  });

  test('assigns rank based on connected calls and talk time', () => {
    const reps = computeRepCallPerformance(mockUsers, mockCalls);
    // Both have 1 connected call, but Suhel has 300s > Safwan 120s
    expect(reps[0].userId).toBe('usr-2');
    expect(reps[0].rank).toBe(1);
    expect(reps[1].userId).toBe('usr-1');
    expect(reps[1].rank).toBe(2);
  });
});

describe('Call Analytics Engine: Overall Organization KPIs', () => {
  const mockCalls: CallLogItem[] = [
    {
      id: 'c1',
      leadId: 'l1',
      channel: 'PHONE_CALL',
      direction: 'OUTBOUND',
      callDurationSeconds: 60,
      callOutcome: 'INTERESTED',
      aiSentiment: 'POSITIVE',
      createdAt: new Date(),
    },
    {
      id: 'c2',
      leadId: 'l2',
      channel: 'PHONE_CALL',
      direction: 'INBOUND',
      callDurationSeconds: 180,
      callOutcome: 'CALLBACK_REQUESTED',
      aiSentiment: 'POSITIVE',
      createdAt: new Date(),
    },
    {
      id: 'c3',
      leadId: 'l3',
      channel: 'PHONE_CALL',
      direction: 'INBOUND',
      callDurationSeconds: 0,
      callOutcome: 'NO_ANSWER',
      aiSentiment: 'NEUTRAL',
      createdAt: new Date(),
    },
  ];

  test('aggregates company-wide calls, connected rate, and outcomes', () => {
    const overall = computeCallAnalyticsOverall(mockCalls);
    expect(overall.totalCalls).toBe(3);
    expect(overall.inboundCalls).toBe(2);
    expect(overall.outboundCalls).toBe(1);
    expect(overall.connectedCalls).toBe(2);
    expect(overall.missedCalls).toBe(1);
    expect(overall.connectionRatePercent).toBe(66.7);
    expect(overall.totalDurationSeconds).toBe(240);
    expect(overall.formattedDuration).toBe('4m');
    expect(overall.averageDurationSeconds).toBe(120);
    expect(overall.outcomesBreakdown['INTERESTED']).toBe(1);
    expect(overall.outcomesBreakdown['CALLBACK_REQUESTED']).toBe(1);
    expect(overall.outcomesBreakdown['NO_ANSWER']).toBe(1);
    expect(overall.sentimentsBreakdown['POSITIVE']).toBe(2);
  });
});
