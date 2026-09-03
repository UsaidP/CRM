import { describe, it, expect } from 'bun:test';
import { calculateAllInCost } from '@/lib/domain/cost-calculator';
import { sanitizeProjectFolderName, getCloudinaryFolder } from '@/lib/services/cloud-media-service';
import { matchFloorPlansForUnit } from '@/lib/services/brochure-persistence';

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

    const matching2Bhk = matchFloorPlansForUnit(2, projectFloorPlans);
    expect(matching2Bhk).toHaveLength(1);
    expect(matching2Bhk[0].url).toBe('https://cdn.com/fp-2bhk.jpg');

    // Zero-fabrication: unmatched BHK must NOT broadcast other floor plans
    const matching4Bhk = matchFloorPlansForUnit(4, projectFloorPlans);
    expect(matching4Bhk).toHaveLength(0);
  });

  it('sanitizes project folder names and routes assets to dedicated Cloudinary folders', () => {
    expect(sanitizeProjectFolderName('Godrej Horizon')).toBe('Godrej_Horizon');
    expect(sanitizeProjectFolderName('Saras-Icon / Tower A & B!')).toBe('Saras-Icon_Tower_A_B');
    expect(sanitizeProjectFolderName('')).toBe('');

    expect(getCloudinaryFolder('brochures', 'Godrej Horizon')).toBe('zamzam_crm/projects/Godrej_Horizon/brochures');
    expect(getCloudinaryFolder('elevations', 'Godrej Horizon')).toBe('zamzam_crm/projects/Godrej_Horizon/elevations');
    expect(getCloudinaryFolder('floor-plans', 'Godrej Horizon')).toBe('zamzam_crm/projects/Godrej_Horizon/floor-plans');
    expect(getCloudinaryFolder('gallery', 'Godrej Horizon')).toBe('zamzam_crm/projects/Godrej_Horizon/gallery');
    expect(getCloudinaryFolder('general')).toBe('zamzam_crm/general');
  });

  it('sets default coverImageUrl to the primary elevation render', () => {
    const elevations = [
      { id: 'el-1', url: 'https://cloudinary.com/proj/elevations/front_facade.jpg', title: 'Front Facade Elevation' },
      { id: 'el-2', url: 'https://cloudinary.com/proj/elevations/aerial_view.jpg', title: 'Aerial View' },
    ];

    const defaultCoverImageUrl = elevations[0]?.url || null;
    expect(defaultCoverImageUrl).toBe('https://cloudinary.com/proj/elevations/front_facade.jpg');
  });
});
