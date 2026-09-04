/**
 * Maharashtra Real Estate Statutory All-In Capitalized Acquisition Cost Engine
 * 
 * Formula:
 * C_all_in = V_agreement + Stamp_duty + Registration + GST + Floor_rise + Parking + Society_dev + Ancillary + Custom_charges
 * 
 * Rules:
 * - Stamp Duty: 6% standard in Maharashtra (5% if sole/first female buyer concession applies, 4% rural/gram panchayat, or custom rate).
 * - Registration: 1% of Agreement Value, strictly capped at ₹30,000 in Maharashtra (or customizable).
 * - GST: 5% on Under-Construction residential units without ITC. 0% for Ready-To-Move with Occupancy Certificate (OC). 1% for Affordable Housing (<= ₹45L & <= 60 sqm).
 * - Floor Rise: Typically ₹50/sqft per floor above the 4th floor (customizable threshold and rate).
 * - Parking & Society Development: Slabs based on project category.
 * - Ancillary & Custom Charges: Club membership, legal documentation, infrastructure meters, advance maintenance, and arbitrary custom line items.
 */

export interface CustomChargeItem {
  id: string;
  name: string;
  amount: number;
  category?: 'STATUTORY' | 'DEVELOPER' | 'INFRASTRUCTURE' | 'CORPUS' | 'CUSTOM';
  notes?: string;
}

export interface CostCalculationInput {
  agreementValue: number;
  isFemaleBuyer?: boolean;
  hasOccupancyCertificate?: boolean;
  floorNumber: number;
  carpetAreaSqft: number;
  floorRisePerSqftPerFloor?: number; // default ₹50/sqft
  baseFloorThreshold?: number;       // default 4th floor
  includeFloorRise?: boolean;        // default true
  parkingCharges?: number;          // default ₹2,50,000
  societyDevCharges?: number;       // default ₹1,50,000

  // Customizable Statutory & Tax Overrides
  customStampDutyRate?: number;     // e.g. 5, 6, 7, 4
  customStampDutyAmount?: number;   // direct ₹ override
  customRegistrationFee?: number;   // direct ₹ override
  customGstRate?: number;           // e.g. 0, 1, 5, 12, 18
  customGstAmount?: number;         // direct ₹ override
  customFloorRiseCharges?: number;  // direct ₹ override
  builderLoadingPercentage?: number;// default 40% (Taloja builder loading standard >= 38%)

  // Ancillary & Infrastructure Charges
  legalAndDocumentationCharges?: number; // e.g. ₹15,000 - ₹35,000
  infrastructureCharges?: number;        // e.g. Electricity / Water / Gas meters (₹50,000 - ₹1,50,000)
  clubhouseCharges?: number;             // e.g. ₹1,00,000 - ₹2,50,000
  advanceMaintenanceMonths?: number;     // e.g. 12 or 24 months
  advanceMaintenancePerSqftMonth?: number; // e.g. ₹3/sqft/mo
  advanceMaintenanceLumpSum?: number;    // direct ₹ amount

  // Arbitrary User-Defined Custom Charges
  customCharges?: CustomChargeItem[];
}

export interface CostCalculationResult {
  agreementValue: number;
  stampDutyRate: number;            // 5%, 6%, etc.
  stampDutyAmount: number;
  registrationFee: number;          // 1% capped at ₹30,000 (or custom)
  gstRate: number;                  // 0%, 1%, 5%, etc.
  gstAmount: number;
  floorRiseCharges: number;
  parkingCharges: number;
  societyDevCharges: number;
  legalAndDocumentationCharges: number;
  infrastructureCharges: number;
  clubhouseCharges: number;
  advanceMaintenanceCharges: number;
  customChargesTotal: number;
  totalAllInCost: number;
  taxAndLegalTotal: number;
  amenitiesTotal: number;
  percentageOverAgreement: number; // e.g. 17.5%
  ratePerSqftAgreement: number;    // ₹/sqft base
  ratePerSqftAllIn: number;       // ₹/sqft all-in
  saleableAreaSqft: number;        // ₹/sqft saleable based on builder loading (default 40%)
  builtUpAreaSqft: number;         // internal walls/balcony (~15%)
  loadingPercentage: number;       // 40% standard
}

export function calculateAllInCost(input: CostCalculationInput): CostCalculationResult {
  const agreementValue = Math.max(0, Number(input.agreementValue) || 0);
  const isFemaleBuyer = Boolean(input.isFemaleBuyer);
  const hasOC = Boolean(input.hasOccupancyCertificate);
  const floorNumber = Math.max(1, Number(input.floorNumber) || 1);
  const carpetAreaSqft = Math.max(0, Number(input.carpetAreaSqft) || 0);

  // 1. Stamp Duty (Custom override, or 6% standard, 5% female buyer)
  let stampDutyRate = input.customStampDutyRate !== undefined && input.customStampDutyRate !== null
    ? Number(input.customStampDutyRate)
    : (isFemaleBuyer ? 5.0 : 6.0);
  
  let stampDutyAmount: number;
  if (input.customStampDutyAmount !== undefined && input.customStampDutyAmount !== null) {
    stampDutyAmount = Math.max(0, Math.round(Number(input.customStampDutyAmount)));
    stampDutyRate = agreementValue > 0 ? Number(((stampDutyAmount / agreementValue) * 100).toFixed(2)) : stampDutyRate;
  } else {
    stampDutyAmount = Math.round((agreementValue * stampDutyRate) / 100);
  }

  // 2. Registration Fee: 1% capped at ₹30,000 for residential in Maharashtra (or custom override)
  let registrationFee: number;
  if (input.customRegistrationFee !== undefined && input.customRegistrationFee !== null) {
    registrationFee = Math.max(0, Math.round(Number(input.customRegistrationFee)));
  } else {
    const rawReg = (agreementValue * 1.0) / 100;
    registrationFee = Math.round(Math.min(30000, rawReg));
  }

  // 3. GST: 0% if OC is received (RTM). Under-construction: 1% if Agreement Value <= ₹45L, 5% if > ₹45L (or custom override)
  let gstRate = input.customGstRate !== undefined && input.customGstRate !== null
    ? Number(input.customGstRate)
    : (hasOC ? 0.0 : (agreementValue <= 4500000 ? 1.0 : 5.0));

  let gstAmount: number;
  if (input.customGstAmount !== undefined && input.customGstAmount !== null) {
    gstAmount = Math.max(0, Math.round(Number(input.customGstAmount)));
    gstRate = agreementValue > 0 ? Number(((gstAmount / agreementValue) * 100).toFixed(2)) : gstRate;
  } else {
    gstAmount = Math.round((agreementValue * gstRate) / 100);
  }

  // 4. Floor Rise Calculation: (Floor - threshold) * rate * carpetArea (or custom override)
  const includeFloorRise = input.includeFloorRise !== false;
  const threshold = input.baseFloorThreshold ?? 4;
  const floorRiseRate = input.floorRisePerSqftPerFloor ?? 50;
  const applicableFloors = includeFloorRise ? Math.max(0, floorNumber - threshold) : 0;
  const floorRiseCharges = input.customFloorRiseCharges !== undefined && input.customFloorRiseCharges !== null
    ? Math.max(0, Math.round(Number(input.customFloorRiseCharges)))
    : Math.round(applicableFloors * floorRiseRate * carpetAreaSqft);

  // 5. Parking & Society Development
  const parkingCharges = input.parkingCharges !== undefined ? Math.max(0, Number(input.parkingCharges)) : 250000;
  const societyDevCharges = input.societyDevCharges !== undefined ? Math.max(0, Number(input.societyDevCharges)) : 150000;

  // 6. Ancillary, Infrastructure & Legal Fees
  const legalAndDocumentationCharges = input.legalAndDocumentationCharges !== undefined 
    ? Math.max(0, Number(input.legalAndDocumentationCharges)) 
    : 0;
  
  const infrastructureCharges = input.infrastructureCharges !== undefined 
    ? Math.max(0, Number(input.infrastructureCharges)) 
    : 0;

  const clubhouseCharges = input.clubhouseCharges !== undefined 
    ? Math.max(0, Number(input.clubhouseCharges)) 
    : 0;

  // 7. Advance Maintenance
  let advanceMaintenanceCharges = 0;
  if (input.advanceMaintenanceLumpSum !== undefined && input.advanceMaintenanceLumpSum !== null) {
    advanceMaintenanceCharges = Math.max(0, Number(input.advanceMaintenanceLumpSum));
  } else if (input.advanceMaintenanceMonths && input.advanceMaintenancePerSqftMonth && carpetAreaSqft > 0) {
    advanceMaintenanceCharges = Math.round(
      Number(input.advanceMaintenanceMonths) * Number(input.advanceMaintenancePerSqftMonth) * carpetAreaSqft
    );
  }

  // 8. Custom Additional Dynamic Charges
  const customChargesTotal = (input.customCharges || []).reduce((acc, curr) => {
    return acc + (Number(curr.amount) || 0);
  }, 0);

  // 9. Aggregates
  const taxAndLegalTotal = stampDutyAmount + registrationFee + gstAmount + legalAndDocumentationCharges;
  const amenitiesTotal = floorRiseCharges + parkingCharges + societyDevCharges + infrastructureCharges + clubhouseCharges + advanceMaintenanceCharges + customChargesTotal;
  const totalAllInCost = agreementValue + taxAndLegalTotal + amenitiesTotal;

  const percentageOverAgreement = agreementValue > 0 
    ? Number((((totalAllInCost - agreementValue) / agreementValue) * 100).toFixed(2))
    : 0;

  const ratePerSqftAgreement = carpetAreaSqft > 0 ? Math.round(agreementValue / carpetAreaSqft) : 0;
  const ratePerSqftAllIn = carpetAreaSqft > 0 ? Math.round(totalAllInCost / carpetAreaSqft) : 0;

  const loadingPercentage = input.builderLoadingPercentage !== undefined ? Number(input.builderLoadingPercentage) : 40;
  const saleableAreaSqft = Math.round(carpetAreaSqft * (1 + loadingPercentage / 100));
  const builtUpAreaSqft = Math.round(carpetAreaSqft * 1.15);

  return {
    agreementValue,
    stampDutyRate,
    stampDutyAmount,
    registrationFee,
    gstRate,
    gstAmount,
    floorRiseCharges,
    parkingCharges,
    societyDevCharges,
    legalAndDocumentationCharges,
    infrastructureCharges,
    clubhouseCharges,
    advanceMaintenanceCharges,
    customChargesTotal,
    totalAllInCost,
    taxAndLegalTotal,
    amenitiesTotal,
    percentageOverAgreement,
    ratePerSqftAgreement,
    ratePerSqftAllIn,
    saleableAreaSqft,
    builtUpAreaSqft,
    loadingPercentage,
  };
}

export function formatINR(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  if (val >= 10000000) {
    const cr = val / 10000000;
    return `₹${cr.toFixed(2)} Cr`;
  }
  if (val >= 100000) {
    const lk = val / 100000;
    return `₹${lk.toFixed(2)} L`;
  }
  return `₹${val.toLocaleString('en-IN')}`;
}

export function formatINRFull(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return `₹${Number(Math.round(val)).toLocaleString('en-IN')}`;
}

/**
 * Standard MahaRERA Construction Linked Milestone Payment Plan Helper
 */
export interface PaymentMilestone {
  id: string;
  name: string;
  stageDescription: string;
  defaultPercentage: number;
  percentage: number;
  isCompleted?: boolean;
}

export const DEFAULT_MAHARERA_MILESTONES: PaymentMilestone[] = [
  { id: 'm1', name: 'Booking / Token Amount', stageDescription: 'Earnest money deposit on application', defaultPercentage: 10, percentage: 10 },
  { id: 'm2', name: 'Execution of Agreement', stageDescription: 'Upon signing & registered agreement (Max 10% under MahaRERA)', defaultPercentage: 10, percentage: 10 },
  { id: 'm3', name: 'Completion of Plinth', stageDescription: 'Foundation & plinth beam inspection completion', defaultPercentage: 15, percentage: 15 },
  { id: 'm4', name: 'RCC Slabs Completion', stageDescription: 'Casting of floor slabs up to unit level', defaultPercentage: 25, percentage: 25 },
  { id: 'm5', name: 'Brickwork, Plaster & Flooring', stageDescription: 'Internal brickwork, external plaster & tiling', defaultPercentage: 20, percentage: 20 },
  { id: 'm6', name: 'Lifts, Water Pumps & MEP', stageDescription: 'Sanitary fittings, electrical meters & fire fighting', defaultPercentage: 10, percentage: 10 },
  { id: 'm7', name: 'Possession & Handover', stageDescription: 'Upon Occupancy Certificate (OC) grant & key handover', defaultPercentage: 10, percentage: 10 },
];

/**
 * Home Loan EMI Calculation Helper
 * EMI = [P x R x (1+R)^N]/[(1+R)^N-1]
 */
export interface HomeLoanEstimates {
  eligibleLoanAmount: number;
  requiredDownPayment: number;
  monthlyEMI: number;
  totalInterestPayable: number;
  totalRepaymentAmount: number;
}

export function calculateHomeLoan({
  agreementValue,
  totalAllInCost,
  ltvPercentage = 80,
  interestRateAnnual = 8.5,
  tenureYears = 20,
}: {
  agreementValue: number;
  totalAllInCost: number;
  ltvPercentage: number;
  interestRateAnnual: number;
  tenureYears: number;
}): HomeLoanEstimates {
  const principal = Math.round((agreementValue * ltvPercentage) / 100);
  const requiredDownPayment = Math.max(0, totalAllInCost - principal);
  
  const monthlyRate = interestRateAnnual / (12 * 100);
  const totalMonths = tenureYears * 12;

  let monthlyEMI = 0;
  if (principal > 0 && monthlyRate > 0 && totalMonths > 0) {
    const factor = Math.pow(1 + monthlyRate, totalMonths);
    monthlyEMI = Math.round((principal * monthlyRate * factor) / (factor - 1));
  }

  const totalRepaymentAmount = monthlyEMI * totalMonths;
  const totalInterestPayable = Math.max(0, totalRepaymentAmount - principal);

  return {
    eligibleLoanAmount: principal,
    requiredDownPayment,
    monthlyEMI,
    totalInterestPayable,
    totalRepaymentAmount,
  };
}
