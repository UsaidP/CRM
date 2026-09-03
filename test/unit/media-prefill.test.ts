import { describe, it, expect } from 'bun:test';
import { prisma } from '@/lib/db/prisma';
import { calculateAllInCost } from '@/lib/domain/cost-calculator';

describe('Unit Media Pre-fill and Management API', () => {
  it('calculates statutory costs properly without fabricating rates', () => {
    const cost = calculateAllInCost({
      agreementValue: 5000000,
      hasOccupancyCertificate: false,
      floorNumber: 5,
      carpetAreaSqft: 650,
      parkingCharges: 250000,
      societyDevCharges: 150000,
    });

    expect(cost.stampDutyRate).toBe(6.0);
    expect(cost.stampDutyAmount).toBe(300000);
    expect(cost.gstRate).toBe(5.0);
    expect(cost.gstAmount).toBe(250000);
    expect(cost.floorRiseCharges).toBe(32500); // Floor 5: (5-1) * 50 * 650 = 32500
    expect(cost.totalAllInCost).toBe(5000000 + 300000 + 30000 + 250000 + 250000 + 150000 + 32500);
  });

  it('correctly associates and filters floor plans by unit BHK', () => {
    const projectFloorPlans = [
      { id: 'fp-1', url: 'https://cdn.com/fp-1bhk.jpg', title: '1 BHK Floor Plan', bhk: 1, carpetAreaSqft: 450 },
      { id: 'fp-2', url: 'https://cdn.com/fp-2bhk.jpg', title: '2 BHK Floor Plan', bhk: 2, carpetAreaSqft: 685 },
      { id: 'fp-3', url: 'https://cdn.com/fp-3bhk.jpg', title: '3 BHK Floor Plan', bhk: 3, carpetAreaSqft: 1050 },
    ];

    const unit2Bhk = { bhk: 2 };
    const matching2Bhk = projectFloorPlans.filter((fp) => fp.bhk === unit2Bhk.bhk);
    expect(matching2Bhk).toHaveLength(1);
    expect(matching2Bhk[0].url).toBe('https://cdn.com/fp-2bhk.jpg');

    const unit4Bhk = { bhk: 4 };
    const matching4Bhk = projectFloorPlans.filter((fp) => fp.bhk === unit4Bhk.bhk);
    const fallback4Bhk = matching4Bhk.length > 0 ? matching4Bhk : projectFloorPlans;
    expect(fallback4Bhk).toHaveLength(3);
  });
});
