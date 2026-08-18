/**
 * Real Estate Commission & Brokerage Deal Ledger Calculator
 * 
 * Rules:
 * - Gross Brokerage = Agreement Value * (Standard Brokerage % / 100)
 * - GST on Invoicing = Gross Brokerage * 18%
 * - Rep Commission = Gross Brokerage * (Rep Split % / 100) (e.g. 50% or 70%)
 * - CoBroker Share = Gross Brokerage * (CoBroker % / 100)
 * - Firm Net Brokerage = Gross Brokerage - Rep Commission - CoBroker Share
 */

export interface CommissionCalculationInput {
  agreementValue: number;
  brokeragePercent?: number;      // e.g. 2.5%
  repSplitPercent?: number;        // e.g. 50%
  coBrokerSharePercent?: number;   // e.g. 0% or 20%
}

export interface CommissionCalculationResult {
  agreementValue: number;
  brokeragePercent: number;
  grossBrokerageAmount: number;
  gstAmount: number;
  totalInvoiceAmountWithGst: number;
  repCommissionAmount: number;
  coBrokerAmount: number;
  firmNetBrokerageAmount: number;
}

export function calculateDealCommission(input: CommissionCalculationInput): CommissionCalculationResult {
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
