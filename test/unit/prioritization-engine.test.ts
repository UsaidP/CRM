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
});
