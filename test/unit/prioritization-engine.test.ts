import { describe, it, expect } from 'bun:test';
import {
  evaluateLeadConnectPriority,
  rankFirmLeadsForNextConnect,
} from '@/lib/domain/prioritization-engine';

describe('Prioritization & Connect Next Engine Unit Tests', () => {
  const now = new Date('2026-09-01T10:00:00.000Z');

  it('assigns CRITICAL / HIGH tier to leads with overdue reminders', () => {
    const overdueLead = {
      id: 'lead-1',
      fullName: 'Vikram Mehta',
      phoneE164: '+919967731071',
      currentStage: 'discovery_call',
      leadSource: 'WHATSAPP_EXACT',
      reminders: [
        {
          id: 'rem-1',
          title: 'Urgent follow-up on Kharghar unit booking',
          reminderType: 'CALL',
          dueAt: new Date('2026-09-01T08:00:00.000Z'), // 2 hours overdue
          priority: 'URGENT',
          status: 'PENDING',
        },
      ],
    };

    const evaluated = evaluateLeadConnectPriority(overdueLead, now);
    expect(evaluated.isOverdue).toBe(true);
    expect(evaluated.totalScore).toBeGreaterThanOrEqual(40);
    expect(['CRITICAL', 'HIGH']).toContain(evaluated.urgencyTier);
    expect(evaluated.nextRecommendedAction).toBe('CALL');
  });

  it('awards high priority to fresh inbound leads created within last 2 hours', () => {
    const freshInboundLead = {
      id: 'lead-2',
      fullName: 'Ayesha Khan',
      phoneE164: '+919820011223',
      currentStage: 'new_uncontacted',
      leadSource: 'INSTAGRAM_EXACT',
      createdAt: new Date('2026-09-01T09:30:00.000Z'), // 30 mins ago
      lastInboundMessageAt: new Date('2026-09-01T09:30:00.000Z'),
    };

    const evaluated = evaluateLeadConnectPriority(freshInboundLead, now);
    expect(evaluated.isFreshInbound).toBe(true);
    expect(evaluated.totalScore).toBeGreaterThanOrEqual(20);
  });

  it('ranks a list of leads deterministically in descending score order', () => {
    const leads = [
      {
        id: 'cold-lead',
        fullName: 'Cold Prospect',
        currentStage: 'on_hold_nurture',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 'hot-lead',
        fullName: 'Urgent Buyer',
        currentStage: 'negotiation_token',
        reminders: [
          {
            id: 'rem-hot',
            title: 'Close token collection',
            reminderType: 'CALL',
            dueAt: new Date('2026-09-01T09:00:00.000Z'),
            priority: 'URGENT',
            status: 'PENDING',
          },
        ],
      },
    ];

    const ranked = rankFirmLeadsForNextConnect(leads, now);
    expect(ranked.length).toBe(2);
    expect(ranked[0].leadId).toBe('hot-lead');
    expect(ranked[0].totalScore).toBeGreaterThan(ranked[1].totalScore);
  });

  it('ignores reminders that are DONE or CANCELLED', () => {
    const lead = {
      id: 'lead-done',
      fullName: 'Completed Follow Up',
      currentStage: 'discovery_call',
      reminders: [
        {
          id: 'rem-done',
          title: 'Already handled',
          reminderType: 'CALL',
          dueAt: new Date('2026-09-01T08:00:00.000Z'), // overdue, but done
          priority: 'URGENT',
          status: 'DONE',
        },
        {
          id: 'rem-cancelled',
          title: 'Cancelled',
          reminderType: 'CALL',
          dueAt: new Date('2026-09-01T07:00:00.000Z'),
          priority: 'URGENT',
          status: 'CANCELLED',
        },
      ],
    };
    const evaluated = evaluateLeadConnectPriority(lead, now);
    expect(evaluated.isOverdue).toBe(false);
    expect(evaluated.dueReminder).toBeNull();
  });

  it('counts SNOOZED reminders as pending', () => {
    const lead = {
      id: 'lead-snoozed',
      fullName: 'Snoozed Reminder',
      currentStage: 'discovery_call',
      reminders: [
        {
          id: 'rem-snooze',
          title: 'Snoozed call',
          reminderType: 'CALL',
          dueAt: new Date('2026-09-01T08:00:00.000Z'),
          priority: 'HIGH',
          status: 'SNOOZED',
        },
      ],
    };
    const evaluated = evaluateLeadConnectPriority(lead, now);
    expect(evaluated.isOverdue).toBe(true);
  });

  it('flags reminders due within the next hour as due-today / HIGH, not overdue', () => {
    const lead = {
      id: 'lead-soon',
      fullName: 'Call In 30 Minutes',
      currentStage: 'discovery_call',
      reminders: [
        {
          id: 'rem-soon',
          title: 'Call about Kharghar floor plan',
          reminderType: 'WHATSAPP',
          dueAt: new Date('2026-09-01T10:30:00.000Z'), // 30 min in future
          priority: 'URGENT',
          status: 'PENDING',
        },
      ],
    };
    const evaluated = evaluateLeadConnectPriority(lead, now);
    expect(evaluated.isOverdue).toBe(false);
    expect(evaluated.isDueToday).toBe(true);
    expect(evaluated.nextRecommendedAction).toBe('WHATSAPP');
  });

  it('never returns NaN for leads missing createdAt/updatedAt/communications', () => {
    const evaluated = evaluateLeadConnectPriority({ id: 'bare-lead' }, now);
    expect(Number.isNaN(evaluated.totalScore)).toBe(false);
    expect(evaluated.totalScore).toBeGreaterThanOrEqual(5); // floor clamps to 5
  });

  it('clamps the total score to the 0-100 band', () => {
    // Overdue (45) + fresh inbound (20) + negotiation (15) + portal (15) + inactivity (15) > 100
    const overloaded = {
      id: 'lead-max',
      fullName: 'Everything At Once',
      currentStage: 'negotiation_token',
      leadSource: 'INSTAGRAM_EXACT',
      portals: [{ telemetryLogs: [{ actionType: 'PORTAL_OPEN', createdAt: new Date('2026-09-01T09:59:00.000Z') }] }],
      reminders: [{
        id: 'rem-max',
        title: 'Overdue',
        reminderType: 'CALL',
        dueAt: new Date('2026-08-30T08:00:00.000Z'),
        priority: 'URGENT',
        status: 'PENDING',
      }],
      createdAt: new Date('2026-09-01T10:00:00.000Z'),
      lastInboundMessageAt: new Date('2026-09-01T10:00:00.000Z'),
    };
    const evaluated = evaluateLeadConnectPriority(overloaded, now);
    // Score is hard-capped at 100 no matter how many factors fire at once
    expect(evaluated.totalScore).toBeLessThanOrEqual(100);
    expect(evaluated.totalScore).toBeGreaterThanOrEqual(80);
  });

  it('ranks an empty lead list without crashing', () => {
    expect(rankFirmLeadsForNextConnect([], now)).toEqual([]);
  });

  it('keeps a deterministic order for equal-score leads (stable sort)', () => {
    const mk = (id: string) => ({
      id,
      fullName: id,
      currentStage: 'on_hold_nurture',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const ranked1 = rankFirmLeadsForNextConnect([mk('a'), mk('b'), mk('c')], now);
    const ranked2 = rankFirmLeadsForNextConnect([mk('a'), mk('b'), mk('c')], now);
    expect(ranked1.map((r) => r.leadId)).toEqual(['a', 'b', 'c']);
    expect(ranked2.map((r) => r.leadId)).toEqual(['a', 'b', 'c']);
  });
});
