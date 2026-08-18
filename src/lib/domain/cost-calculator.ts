/**
 * Maharashtra Real Estate Statutory All-In Capitalized Acquisition Cost Engine
 * 
 * Formula:
 * C_all_in = V_agreement + Stamp_duty + Registration + GST + Floor_rise + Parking + Society_dev
 * 
 * Rules:
 * - Stamp Duty: 6% standard in Maharashtra (5% if sole/first female buyer concession applies).
 * - Registration: 1% of Agreement Value, strictly capped at ₹30,000 in Maharashtra.
 * - GST: 5% on Under-Construction residential units without ITC. 0% for Ready-To-Move with Occupancy Certificate (OC).
 * - Floor Rise: Typically ₹50/sqft per floor above the 4th floor.
 * - Parking & Society Development: Slabs based on project category.
 */

export interface CostCalculationInput {
  agreementValue: number;
  isFemaleBuyer?: boolean;
  hasOccupancyCertificate: boolean;
  floorNumber: number;
  carpetAreaSqft: number;
  floorRisePerSqftPerFloor?: number; // default ₹50/sqft
  baseFloorThreshold?: number;       // default 4th floor
  parkingCharges?: number;          // default ₹2,50,000
  societyDevCharges?: number;       // default ₹1,50,000
}

export interface CostCalculationResult {
  agreementValue: number;
  stampDutyRate: number;            // 5% or 6%
  stampDutyAmount: number;
  registrationFee: number;          // 1% capped at ₹30,000
  gstRate: number;                  // 0% or 5%
  gstAmount: number;
  floorRiseCharges: number;
  parkingCharges: number;
  societyDevCharges: number;
  totalAllInCost: number;
  taxAndLegalTotal: number;
  amenitiesTotal: number;
  percentageOverAgreement: number; // e.g. 17.5%
}

export function calculateAllInCost(input: CostCalculationInput): CostCalculationResult {
  const agreementValue = Math.max(0, Number(input.agreementValue) || 0);
  const isFemaleBuyer = Boolean(input.isFemaleBuyer);
  const hasOC = Boolean(input.hasOccupancyCertificate);
  const floorNumber = Math.max(1, Number(input.floorNumber) || 1);
  const carpetAreaSqft = Math.max(0, Number(input.carpetAreaSqft) || 0);

  // 1. Stamp Duty (6% standard, 5% female buyer)
  const stampDutyRate = isFemaleBuyer ? 5.0 : 6.0;
  const stampDutyAmount = Math.round((agreementValue * stampDutyRate) / 100);

  // 2. Registration Fee: 1% capped at ₹30,000 for residential in Maharashtra
  const rawReg = (agreementValue * 1.0) / 100;
  const registrationFee = Math.round(Math.min(30000, rawReg));

  // 3. GST: 0% if OC is received (RTM), 5% for Under-Construction
  const gstRate = hasOC ? 0.0 : 5.0;
  const gstAmount = Math.round((agreementValue * gstRate) / 100);

  // 4. Floor Rise Calculation: (Floor - threshold) * rate * carpetArea (only if floor > threshold)
  const threshold = input.baseFloorThreshold ?? 4;
  const floorRiseRate = input.floorRisePerSqftPerFloor ?? 50;
  const applicableFloors = Math.max(0, floorNumber - threshold);
  const floorRiseCharges = Math.round(applicableFloors * floorRiseRate * carpetAreaSqft);

  // 5. Parking & Society Development
  const parkingCharges = input.parkingCharges !== undefined ? Math.max(0, Number(input.parkingCharges)) : 250000;
  const societyDevCharges = input.societyDevCharges !== undefined ? Math.max(0, Number(input.societyDevCharges)) : 150000;

  // 6. Aggregates
  const taxAndLegalTotal = stampDutyAmount + registrationFee + gstAmount;
  const amenitiesTotal = floorRiseCharges + parkingCharges + societyDevCharges;
  const totalAllInCost = agreementValue + taxAndLegalTotal + amenitiesTotal;

  const percentageOverAgreement = agreementValue > 0 
    ? Number((((totalAllInCost - agreementValue) / agreementValue) * 100).toFixed(2))
    : 0;

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
    totalAllInCost,
    taxAndLegalTotal,
    amenitiesTotal,
    percentageOverAgreement,
  };
}
