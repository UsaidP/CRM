import { describe, it, expect } from 'bun:test';
import {
  createLeadSchema,
  updateLeadStageSchema,
  buyerRequirementSchema,
  simulateInboundLeadSchema,
} from '@/lib/validators/lead-schemas';
import {
  createDealSchema,
  updateDealStatusSchema,
  simulateCommissionSchema,
} from '@/lib/validators/deal-schemas';
import {
  createPortalSchema,
  portalTelemetryEventSchema,
} from '@/lib/validators/portal-schemas';
import {
  createVisitSchema,
  updateVisitFeedbackSchema,
} from '@/lib/validators/visit-schemas';
import {
  createProjectSchema,
  createUnitSchema,
} from '@/lib/validators/inventory-schemas';

describe('Zod Validators Suite', () => {
  describe('Lead Schemas', () => {
    it('validates a valid lead creation payload', () => {
      const valid = {
        fullName: 'Rahul Sharma',
        phone: '+919967731071',
        email: 'rahul@example.com',
        leadSource: 'whatsapp_group',
        currentStage: 'new_uncontacted',
      };
      const result = createLeadSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects lead with invalid phone length', () => {
      const invalid = {
        fullName: 'Rahul Sharma',
        phone: '123',
      };
      const result = createLeadSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('phone');
      }
    });

    it('rejects invalid lead currentStage enum', () => {
      const invalid = {
        currentStage: 'INVALID_STAGE_VALUE',
      };
      const result = updateLeadStageSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates buyer requirements budget and bhk', () => {
      const valid = {
        budgetMin: 5000000,
        budgetMax: 10000000,
        bhkPreferences: [2, 3],
        targetLocations: ['Kharghar Sector 35'],
      };
      const result = buyerRequirementSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects buyer requirement with negative or zero budgetMax', () => {
      const invalid = {
        budgetMax: -100,
        bhkPreferences: [2],
      };
      const result = buyerRequirementSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Deal Schemas', () => {
    it('validates deal creation payload', () => {
      const valid = {
        leadId: '123e4567-e89b-12d3-a456-426614174000',
        propertyUnitId: '123e4567-e89b-12d3-a456-426614174001',
        agreementValue: 8500000,
        brokeragePercent: 2.5,
        repSplitPercent: 50,
      };
      const result = createDealSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects deal creation with non-UUID leadId', () => {
      const invalid = {
        leadId: 'not-a-uuid',
        propertyUnitId: '123e4567-e89b-12d3-a456-426614174001',
      };
      const result = createDealSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates commission simulation schema bounds', () => {
      const valid = {
        agreementValue: 10000000,
        brokeragePercent: 2.0,
        repSplitPercent: 60,
        coBrokerSharePercent: 20,
      };
      const result = simulateCommissionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('Portal & Telemetry Schemas', () => {
    it('validates portal creation schema', () => {
      const valid = {
        leadId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Curated 2BHK Properties',
        selectedUnitIds: ['123e4567-e89b-12d3-a456-426614174001'],
      };
      const result = createPortalSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('validates portal telemetry schema actionType enum', () => {
      const valid = {
        actionType: 'PORTAL_OPEN',
        dwellTimeSec: 15,
      };
      const result = portalTelemetryEventSchema.safeParse(valid);
      expect(result.success).toBe(true);

      const invalid = {
        actionType: 'UNKNOWN_ACTION_HACK',
      };
      const invalidResult = portalTelemetryEventSchema.safeParse(invalid);
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('Inventory & Visit Schemas', () => {
    it('validates developer project creation schema', () => {
      const valid = {
        developerName: 'Godrej Properties',
        projectName: 'Godrej Kharghar Highland',
        reraNumber: 'P52000018920',
        microMarket: 'Kharghar Sector 35',
        basePricePerSqft: 11500,
      };
      const result = createProjectSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('validates property unit creation schema with floor rise and statutory charges', () => {
      const valid = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        unitNumber: 'Tower A 1002',
        bhk: 2,
        carpetAreaSqft: 720,
        floorNumber: 10,
        totalFloors: 24,
        possessionStatus: 'UNDER_CONSTRUCTION',
        agreementValue: 8200000,
      };
      const result = createUnitSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('validates site visit scheduling schema', () => {
      const valid = {
        leadId: '123e4567-e89b-12d3-a456-426614174000',
        scheduledDate: new Date().toISOString(),
        timeSlot: 'Saturday 11:00 AM',
        pickupLocation: 'Central Park Metro Station',
        itineraryStops: [
          {
            unitId: '123e4567-e89b-12d3-a456-426614174001',
            projectName: 'Godrej Highlands',
            microMarket: 'Kharghar Sector 35',
            bhk: 2,
            expectedTime: '11:30 AM',
          },
        ],
      };
      const result = createVisitSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });
});
