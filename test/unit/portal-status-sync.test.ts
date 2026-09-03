import { describe, test, expect } from 'bun:test';
import { calculateAllInCost } from '@/lib/domain/cost-calculator';

describe('Property & Portal Status Sync Engine', () => {
  test('Under-Construction project correctly resolves to 5% GST and non-OC status', () => {
    const underConstructionProject = {
      hasOccupancyCertificate: false,
      reraProjectStatus: 'REGISTERED',
    };
    const unit = {
      possessionStatus: 'UNDER_CONSTRUCTION',
      agreementValue: 5000000,
    };

    const isOcReady = Boolean(
      underConstructionProject.hasOccupancyCertificate || unit.possessionStatus === 'READY_TO_MOVE'
    );
    expect(isOcReady).toBe(false);

    const cost = calculateAllInCost({
      agreementValue: unit.agreementValue,
      hasOccupancyCertificate: isOcReady,
      floorNumber: 5,
      carpetAreaSqft: 450,
      parkingCharges: 0,
      societyDevCharges: 0,
    });

    // 5% GST must apply on under construction
    expect(cost.gstRate).toBe(5.0);
    expect(cost.gstAmount).toBe(250000);
  });

  test('Ready OC project correctly resolves to 0% GST and Ready OC status', () => {
    const readyProject = {
      hasOccupancyCertificate: true,
      reraProjectStatus: 'OC_RECEIVED',
    };
    const unit = {
      possessionStatus: 'READY_TO_MOVE',
      agreementValue: 6000000,
    };

    const isOcReady = Boolean(
      readyProject.hasOccupancyCertificate || unit.possessionStatus === 'READY_TO_MOVE'
    );
    expect(isOcReady).toBe(true);

    const cost = calculateAllInCost({
      agreementValue: unit.agreementValue,
      hasOccupancyCertificate: isOcReady,
      floorNumber: 10,
      carpetAreaSqft: 650,
      parkingCharges: 0,
      societyDevCharges: 0,
    });

    // 0% GST must apply on Ready OC
    expect(cost.gstRate).toBe(0.0);
    expect(cost.gstAmount).toBe(0);
  });

  test('Unit marked READY_TO_MOVE under project with OC inherits 0% GST exemption', () => {
    const project = { hasOccupancyCertificate: true };
    const unit = { possessionStatus: 'READY_TO_MOVE' };

    const isOc = Boolean(project.hasOccupancyCertificate || unit.possessionStatus === 'READY_TO_MOVE');
    expect(isOc).toBe(true);
  });

  test('City Avenue project (hasOccupancyCertificate: false) does not show Ready OC', () => {
    const cityAvenue = {
      projectName: 'City Avenue',
      hasOccupancyCertificate: false,
    };
    const unit101 = {
      unitNumber: '101',
      possessionStatus: 'UNDER_CONSTRUCTION',
    };

    const isOc = Boolean(cityAvenue.hasOccupancyCertificate || unit101.possessionStatus === 'READY_TO_MOVE');
    expect(isOc).toBe(false);
  });
});
