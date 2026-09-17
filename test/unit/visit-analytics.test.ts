import { describe, it, expect } from 'bun:test';
import {
  calculateVisitKpis,
  buildVisitConversionFunnel,
  buildBrokerVisitLeaderboard,
  buildOutcomeDistribution,
} from '@/lib/domain/visit-analytics';

describe('Site Visit Domain Analytics Engine', () => {
  const mockVisits = [
    {
      id: 'v1',
      status: 'SCHEDULED',
      assignedBrokerId: 'b1',
      assignedBroker: { id: 'b1', fullName: 'Faizan Khan', email: 'faizan@zamzam.com' },
      rescheduleCount: 0,
      feedbackOutcome: null,
      feedbackRating: null,
    },
    {
      id: 'v2',
      status: 'CONFIRMED',
      confirmedAt: '2026-08-20T10:00:00Z',
      confirmedVia: 'PHONE_CALL',
      assignedBrokerId: 'b1',
      assignedBroker: { id: 'b1', fullName: 'Faizan Khan', email: 'faizan@zamzam.com' },
      rescheduleCount: 1,
      feedbackOutcome: null,
      feedbackRating: null,
    },
    {
      id: 'v3',
      status: 'COMPLETED',
      assignedBrokerId: 'b1',
      assignedBroker: { id: 'b1', fullName: 'Faizan Khan', email: 'faizan@zamzam.com' },
      rescheduleCount: 0,
      feedbackOutcome: 'TOKEN_SUBMITTED',
      feedbackRating: 5,
    },
    {
      id: 'v4',
      status: 'COMPLETED',
      assignedBrokerId: 'b2',
      assignedBroker: { id: 'b2', fullName: 'Ayesha Sayed', email: 'ayesha@zamzam.com' },
      rescheduleCount: 0,
      feedbackOutcome: 'HIGH_INTEREST',
      feedbackRating: 4,
    },
    {
      id: 'v5',
      status: 'NO_SHOW',
      assignedBrokerId: 'b2',
      assignedBroker: { id: 'b2', fullName: 'Ayesha Sayed', email: 'ayesha@zamzam.com' },
      noShowReason: 'UNREACHABLE',
      rescheduleCount: 0,
      feedbackOutcome: null,
      feedbackRating: null,
    },
  ];

  describe('calculateVisitKpis', () => {
    it('returns zeroes for empty input', () => {
      const kpis = calculateVisitKpis([]);
      expect(kpis.totalVisits).toBe(0);
      expect(kpis.confirmationRate).toBe(0);
      expect(kpis.completionRate).toBe(0);
      expect(kpis.noShowRate).toBe(0);
      expect(kpis.rescheduleCount).toBe(0);
    });

    it('correctly calculates counts and health ratios', () => {
      const kpis = calculateVisitKpis(mockVisits);

      expect(kpis.totalVisits).toBe(5);
      expect(kpis.scheduledCount).toBe(1);
      expect(kpis.confirmedCount).toBe(1);
      expect(kpis.completedCount).toBe(2);
      expect(kpis.noShowCount).toBe(1);
      expect(kpis.rescheduleCount).toBe(1); // v2 has rescheduleCount: 1
      expect(kpis.tokenCount).toBe(1);
      expect(kpis.avgRating).toBe(4.5); // (5 + 4) / 2
      expect(kpis.noShowRate).toBe(20); // 1 out of 5 = 20%
      expect(kpis.completionRate).toBe(40); // 2 out of 5 = 40%
      expect(kpis.rescheduleRate).toBe(20); // 1 out of 5 = 20%
    });
  });

  describe('buildVisitConversionFunnel', () => {
    it('builds a 5-step conversion funnel with percentages and gradients', () => {
      const funnel = buildVisitConversionFunnel(mockVisits, [
        { id: 'd1', dealStatus: 'TOKEN_RECEIVED' },
      ]);

      expect(funnel).toHaveLength(5);
      expect(funnel[0].id).toBe('scheduled');
      expect(funnel[0].count).toBe(5);
      expect(funnel[0].percentage).toBe(100);

      // Confirmed: v2 (CONFIRMED) + v3 (COMPLETED) + v4 (COMPLETED) = 3
      expect(funnel[1].id).toBe('confirmed');
      expect(funnel[1].count).toBe(3);
      expect(funnel[1].percentage).toBe(60);

      // Attended: v3 and v4 (COMPLETED) = 2
      expect(funnel[2].id).toBe('attended');
      expect(funnel[2].count).toBe(2);
      expect(funnel[2].percentage).toBe(40);

      // Offer/Token: v3 (TOKEN_SUBMITTED) + v4 (HIGH_INTEREST) = 2
      expect(funnel[3].id).toBe('offer_token');
      expect(funnel[3].count).toBe(2);

      // Closed Deal: 1 deal
      expect(funnel[4].id).toBe('closed');
      expect(funnel[4].count).toBe(1);
    });

    it('handles empty inputs gracefully', () => {
      const funnel = buildVisitConversionFunnel([]);
      expect(funnel).toHaveLength(5);
      expect(funnel[0].count).toBe(0);
      expect(funnel[0].percentage).toBe(0);
    });
  });

  describe('buildBrokerVisitLeaderboard', () => {
    it('aggregates performance correctly per broker and ranks by completed tours', () => {
      const leaderboard = buildBrokerVisitLeaderboard(mockVisits);

      expect(leaderboard).toHaveLength(2);
      // Faizan Khan: 3 visits (1 scheduled, 1 confirmed, 1 completed with token)
      // Ayesha Sayed: 2 visits (1 completed, 1 no-show)
      const faizan = leaderboard.find((b) => b.brokerName === 'Faizan Khan');
      const ayesha = leaderboard.find((b) => b.brokerName === 'Ayesha Sayed');

      expect(faizan).toBeDefined();
      expect(faizan?.totalAssigned).toBe(3);
      expect(faizan?.completedCount).toBe(1);
      expect(faizan?.tokenCount).toBe(1);
      expect(faizan?.avgRating).toBe(5);

      expect(ayesha).toBeDefined();
      expect(ayesha?.totalAssigned).toBe(2);
      expect(ayesha?.completedCount).toBe(1);
      expect(ayesha?.noShowCount).toBe(1);
      expect(ayesha?.tokenCount).toBe(0);
      expect(ayesha?.avgRating).toBe(4);
    });
  });

  describe('buildOutcomeDistribution', () => {
    it('computes breakdown of feedback outcomes', () => {
      const outcomes = buildOutcomeDistribution(mockVisits);

      const token = outcomes.find((o) => o.outcome === 'TOKEN_SUBMITTED');
      const highInterest = outcomes.find((o) => o.outcome === 'HIGH_INTEREST');
      const pending = outcomes.find((o) => o.outcome === 'PENDING_OUTCOME');

      expect(token?.count).toBe(1);
      expect(highInterest?.count).toBe(1);
      expect(pending?.count).toBe(3); // v1, v2, v5 have no outcome
    });
  });
});
