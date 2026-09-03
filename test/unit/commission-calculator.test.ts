import { describe, it, expect } from 'bun:test';
import { calculateDealCommission } from '@/lib/domain/commission-calculator';

describe('Commission & Brokerage Calculator — Edge Cases', () => {
  it('computes the canonical 2.5% / 50% / 0% co-broker deal', () => {
    const r = calculateDealCommission({ agreementValue: 8500000 });
    expect(r.grossBrokerageAmount).toBe(Math.round(8500000 * 0.025)); // 212500
    expect(r.gstAmount).toBe(Math.round(212500 * 0.18));              // 38250
    expect(r.totalInvoiceAmountWithGst).toBe(250750);
    expect(r.repCommissionAmount).toBe(106250);
    expect(r.coBrokerAmount).toBe(0);
    expect(r.firmNetBrokerageAmount).toBe(106250);
  });

  it('uses documented defaults when optional fields are omitted', () => {
    const r = calculateDealCommission({ agreementValue: 10000000 });
    expect(r.brokeragePercent).toBe(2.5);
    expect(r.grossBrokerageAmount).toBe(250000);
  });

  it('honors an explicit 0% brokerage instead of silently defaulting to 2.5%', () => {
    // Direct-deal where the firm charges no brokerage. The `input.x ? ... : default`
    // ternary treats 0 as falsy, so an explicit 0 previously became 2.5%.
    // Fix: explicit 0 must be respected (use null/undefined checks for defaults).
    const r = calculateDealCommission({
      agreementValue: 8500000,
      brokeragePercent: 0,
      repSplitPercent: 0,
      coBrokerSharePercent: 0,
    });
    expect(r.brokeragePercent).toBe(0);
    expect(r.grossBrokerageAmount).toBe(0);
    expect(r.gstAmount).toBe(0);
    expect(r.totalInvoiceAmountWithGst).toBe(0);
    expect(r.repCommissionAmount).toBe(0);
    expect(r.firmNetBrokerageAmount).toBe(0);
  });

  it('splits correctly with a co-broker share (20% co-broker, 60% rep)', () => {
    const r = calculateDealCommission({
      agreementValue: 10000000,
      brokeragePercent: 2.0,
      repSplitPercent: 60,
      coBrokerSharePercent: 20,
    });
    expect(r.grossBrokerageAmount).toBe(200000);
    expect(r.coBrokerAmount).toBe(40000);
    expect(r.repCommissionAmount).toBe(96000); // 60% of (200000 - 40000)
    expect(r.firmNetBrokerageAmount).toBe(64000);
    expect(r.grossBrokerageAmount).toBe(r.repCommissionAmount + r.coBrokerAmount + r.firmNetBrokerageAmount);
  });

  it('handles a 100% rep split (fully internal agent deal)', () => {
    const r = calculateDealCommission({
      agreementValue: 5000000,
      brokeragePercent: 2,
      repSplitPercent: 100,
    });
    expect(r.repCommissionAmount).toBe(r.grossBrokerageAmount);
    expect(r.firmNetBrokerageAmount).toBe(0);
  });

  it('handles a 0% rep split (house deal, no agent commission)', () => {
    const r = calculateDealCommission({
      agreementValue: 5000000,
      brokeragePercent: 2,
      repSplitPercent: 0,
    });
    expect(r.repCommissionAmount).toBe(0);
    expect(r.firmNetBrokerageAmount).toBe(r.grossBrokerageAmount);
  });

  it('rounds fractional paise deterministically (banker-safe Math.round)', () => {
    const r = calculateDealCommission({ agreementValue: 3333333, brokeragePercent: 2.5 });
    // 3333333 * 2.5 / 100 = 83333.325 -> 83333
    expect(r.grossBrokerageAmount).toBe(83333);
    expect(Number.isInteger(r.grossBrokerageAmount)).toBe(true);
    expect(Number.isInteger(r.gstAmount)).toBe(true);
  });

  it('handles a zero-value agreement', () => {
    const r = calculateDealCommission({ agreementValue: 0, brokeragePercent: 2.5 });
    expect(r.grossBrokerageAmount).toBe(0);
    expect(r.firmNetBrokerageAmount).toBe(0);
  });

  it('handles very large agreement values without overflow', () => {
    const r = calculateDealCommission({ agreementValue: 100000000000, brokeragePercent: 2.5 });
    expect(r.grossBrokerageAmount).toBe(2500000000);
    expect(r.firmNetBrokerageAmount).toBe(1250000000);
  });

  it('never returns NaN for any finite input', () => {
    const r = calculateDealCommission({ agreementValue: 8500000, brokeragePercent: 2.5, repSplitPercent: 50 });
    for (const v of Object.values(r)) {
      expect(Number.isNaN(v)).toBe(false);
    }
  });
});
