import { describe, it, expect } from 'bun:test';
import {
  buildPipelineFunnelStages,
  buildCashFlowTimeSeries,
  buildMarketInventoryBars,
  buildSlaVelocityMetrics,
} from '@/lib/domain/dashboard-analytics';

describe('Dashboard Analytics & Visualization Engine', () => {
  describe('buildPipelineFunnelStages', () => {
    it('generates 6 sequential funnel stages from raw leads', () => {
      const mockLeads = [
        { currentStage: 'NEW' },
        { currentStage: 'NEW' },
        { currentStage: 'CONTACTED' },
        { currentStage: 'REQUIREMENTS_COLLECTED' },
        { currentStage: 'PROPOSAL_SHARED' },
        { currentStage: 'SITE_VISIT_SCHEDULED' },
        { currentStage: 'BOOKED' },
      ];

      const stages = buildPipelineFunnelStages(mockLeads);

      expect(stages).toHaveLength(6);
      expect(stages[0].label).toBe('01. Inbound Ingestion');
      expect(stages[0].value).toBe(2);
      expect(stages[1].label).toBe('02. First Connect Made');
      expect(stages[1].value).toBe(1);
      expect(stages[5].label).toBe('06. Deal Won & Booked');
      expect(stages[5].value).toBe(1);
    });

    it('respects pre-aggregated stageCounts when supplied', () => {
      const stageCounts = {
        NEW: 50,
        CONTACTED: 40,
        REQUIREMENTS_COLLECTED: 30,
        PROPOSAL_SHARED: 20,
        SITE_VISIT_SCHEDULED: 10,
        NEGOTIATION: 5,
        BOOKED: 3,
      };

      const stages = buildPipelineFunnelStages([], stageCounts);

      expect(stages[0].value).toBe(50);
      expect(stages[0].percentage).toBe(100);
      expect(stages[5].value).toBe(8); // 5 + 3
      expect(stages[5].percentage).toBe(16);
    });

    it('handles empty leads gracefully without throwing', () => {
      const stages = buildPipelineFunnelStages([]);
      expect(stages).toHaveLength(6);
      expect(stages[0].value).toBe(0);
    });
  });

  describe('buildCashFlowTimeSeries', () => {
    it('aggregates deals by bookingDate and computes gross and net brokerage', () => {
      const mockDeals = [
        {
          bookingDate: '2026-03-01T10:00:00Z',
          grossBrokerageAmount: 200000,
          firmNetBrokerageAmount: 140000,
          dealStatus: 'PAYMENT_RECEIVED',
        },
        {
          bookingDate: '2026-03-01T15:00:00Z',
          grossBrokerageAmount: 300000,
          firmNetBrokerageAmount: 210000,
          dealStatus: 'PAYMENT_RECEIVED',
        },
        {
          bookingDate: '2026-03-02T11:00:00Z',
          grossBrokerageAmount: 500000,
          firmNetBrokerageAmount: 350000,
          dealStatus: 'AGREEMENT_SIGNED',
        },
      ];

      const points = buildCashFlowTimeSeries(mockDeals, '30d');

      expect(points.length).toBeGreaterThanOrEqual(2);
      const day1 = points.find((p) => p.date === '2026-03-01');
      expect(day1).toBeDefined();
      expect(day1?.grossBrokerage).toBe(500000);
      expect(day1?.realizedNet).toBe(350000);
      expect(day1?.dealCount).toBe(2);
    });

    it('pads single-point series with a zero baseline for smooth area charting', () => {
      const mockDeals = [
        {
          bookingDate: '2026-03-05T10:00:00Z',
          grossBrokerageAmount: 150000,
          firmNetBrokerageAmount: 105000,
        },
      ];

      const points = buildCashFlowTimeSeries(mockDeals, '7d');

      expect(points).toHaveLength(2);
      expect(points[0].grossBrokerage).toBe(0);
      expect(points[1].grossBrokerage).toBe(150000);
    });

    it('returns a stable 7-day fallback when deals are empty', () => {
      const points = buildCashFlowTimeSeries([], '7d');
      expect(points).toHaveLength(7);
      expect(points[0].grossBrokerage).toBe(0);
    });
  });

  describe('buildMarketInventoryBars', () => {
    it('groups inventory units by micro-market and verification status', () => {
      const mockUnits = [
        { project: { microMarket: 'Kharghar Sector 10' }, verificationStatus: 'VERIFIED_FRESH', expectedPrice: 8000000 },
        { project: { microMarket: 'Kharghar Sector 35' }, verificationStatus: 'PENDING_VERIFICATION', expectedPrice: 7000000 },
        { project: { microMarket: 'Taloja Phase 1' }, verificationStatus: 'ACTIVE_MARKETABLE', expectedPrice: 4500000 },
        { project: { microMarket: 'Panvel West' }, verificationStatus: 'STALE_EXPIRED', expectedPrice: 6000000 },
      ];

      const bars = buildMarketInventoryBars(mockUnits);

      const kharghar = bars.find((b) => b.market === 'Kharghar');
      expect(kharghar).toBeDefined();
      expect(kharghar?.active).toBe(1);
      expect(kharghar?.stale).toBe(1);
      expect(kharghar?.total).toBe(2);

      const taloja = bars.find((b) => b.market === 'Taloja');
      expect(taloja?.active).toBe(1);
      expect(taloja?.stale).toBe(0);

      const panvel = bars.find((b) => b.market === 'Panvel');
      expect(panvel?.active).toBe(0);
      expect(panvel?.stale).toBe(1);
    });

    it('handles empty units cleanly', () => {
      const bars = buildMarketInventoryBars([]);
      expect(bars).toHaveLength(3);
      expect(bars[0].total).toBe(0);
    });
  });

  describe('buildSlaVelocityMetrics', () => {
    it('computes response latency tiers correctly from lead communications', () => {
      const now = Date.now();
      const mockLeads = [
        {
          createdAt: new Date(now - 10 * 60000).toISOString(),
          communications: [{ createdAt: new Date(now - 8 * 60000).toISOString() }], // 2 mins -> <5m
        },
        {
          createdAt: new Date(now - 30 * 60000).toISOString(),
          communications: [{ createdAt: new Date(now - 20 * 60000).toISOString() }], // 10 mins -> <15m
        },
        {
          createdAt: new Date(now - 60 * 60000).toISOString(),
          communications: [{ createdAt: new Date(now - 40 * 60000).toISOString() }], // 20 mins -> <30m
        },
        {
          createdAt: new Date(now - 120 * 60000).toISOString(),
          communications: [{ createdAt: new Date(now - 30 * 60000).toISOString() }], // 90 mins -> >1h
        },
      ];

      const sla = buildSlaVelocityMetrics(mockLeads);

      expect(sla.under5m).toBe(1);
      expect(sla.under15m).toBe(1);
      expect(sla.under30m).toBe(1);
      expect(sla.over1h).toBe(1);
      expect(sla.complianceRate).toBe(50); // (1+1)/4 = 50%
    });
  });
});
