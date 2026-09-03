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
  verifyUnitSchema,
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

    it('rejects buyer requirement with an empty BHK preference list', () => {
      const result = buyerRequirementSchema.safeParse({
        budgetMax: 10000000,
        bhkPreferences: [],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('bhkPreferences'))).toBe(true);
      }
    });

    it('rejects out-of-range BHK preferences (0, 7, fractional)', () => {
      for (const bhk of [[0], [7], [2.5]]) {
        const result = buyerRequirementSchema.safeParse({
          budgetMax: 10000000,
          bhkPreferences: bhk,
        });
        expect(result.success).toBe(false);
      }
    });

    it('rejects missing budgetMax (required field)', () => {
      const result = buyerRequirementSchema.safeParse({
        bhkPreferences: [2],
      });
      expect(result.success).toBe(false);
    });

    it('applies documented defaults for optional buyer requirement fields', () => {
      const result = buyerRequirementSchema.safeParse({
        budgetMax: 10000000,
        bhkPreferences: [2],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.possessionPreference).toBe('ANY');
        expect(result.data.loanPreApproved).toBe(false);
        expect(result.data.purpose).toBe('self_use');
        expect(result.data.targetLocations).toEqual(['Kharghar Sector 35']);
      }
    });

    it('rejects lead with phone shorter than 10 chars but accepts exactly 10', () => {
      const base = { fullName: 'Rahul Sharma' };
      expect(createLeadSchema.safeParse({ ...base, phone: '982012345' }).success).toBe(false);
      expect(createLeadSchema.safeParse({ ...base, phone: '9820123456' }).success).toBe(true);
    });

    it('rejects malformed email but allows empty-string or null email', () => {
      const base = { fullName: 'Rahul Sharma', phone: '9820123456' };
      expect(createLeadSchema.safeParse({ ...base, email: 'not-an-email' }).success).toBe(false);
      expect(createLeadSchema.safeParse({ ...base, email: '' }).success).toBe(true);
      expect(createLeadSchema.safeParse({ ...base, email: null }).success).toBe(true);
    });

    it('rejects a 1-character fullName but allows null fullName', () => {
      const base = { phone: '9820123456' };
      expect(createLeadSchema.safeParse({ ...base, fullName: 'R' }).success).toBe(false);
      expect(createLeadSchema.safeParse({ ...base, fullName: null }).success).toBe(true);
    });

    it('rejects an unknown leadSource instead of silently defaulting', () => {
      const result = createLeadSchema.safeParse({
        fullName: 'Rahul Sharma',
        phone: '9820123456',
        leadSource: 'carrier_pigeon',
      });
      expect(result.success).toBe(false);
    });

    it('applies documented defaults on minimal lead payloads', () => {
      const result = createLeadSchema.safeParse({ phone: '9820123456' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.leadSource).toBe('whatsapp_group');
        expect(result.data.currentStage).toBe('new_uncontacted');
        expect(result.data.city).toBe('Navi Mumbai');
      }
    });

    it('rejects a non-UUID assignedBrokerId in stage updates', () => {
      const result = updateLeadStageSchema.safeParse({
        currentStage: 'discovery_call',
        assignedBrokerId: 'broker-1',
      });
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

    it('rejects out-of-bounds brokeragePercent (< 0.5 or > 10)', () => {
      const base = {
        leadId: '123e4567-e89b-12d3-a456-426614174000',
        propertyUnitId: '123e4567-e89b-12d3-a456-426614174001',
      };
      expect(createDealSchema.safeParse({ ...base, brokeragePercent: 0 }).success).toBe(false);
      expect(createDealSchema.safeParse({ ...base, brokeragePercent: 0.4 }).success).toBe(false);
      expect(createDealSchema.safeParse({ ...base, brokeragePercent: 25 }).success).toBe(false);
      expect(createDealSchema.safeParse({ ...base, brokeragePercent: 10 }).success).toBe(true);
    });

    it('rejects out-of-bounds repSplitPercent and coBrokerSharePercent', () => {
      const base = {
        leadId: '123e4567-e89b-12d3-a456-426614174000',
        propertyUnitId: '123e4567-e89b-12d3-a456-426614174001',
      };
      expect(createDealSchema.safeParse({ ...base, repSplitPercent: 101 }).success).toBe(false);
      expect(createDealSchema.safeParse({ ...base, repSplitPercent: -1 }).success).toBe(false);
      expect(createDealSchema.safeParse({ ...base, coBrokerSharePercent: 150 }).success).toBe(false);
      expect(createDealSchema.safeParse({ ...base, repSplitPercent: 100 }).success).toBe(true);
    });

    it('rejects a negative or zero agreementValue', () => {
      const base = {
        leadId: '123e4567-e89b-12d3-a456-426614174000',
        propertyUnitId: '123e4567-e89b-12d3-a456-426614174001',
      };
      expect(createDealSchema.safeParse({ ...base, agreementValue: -1 }).success).toBe(false);
      expect(createDealSchema.safeParse({ ...base, agreementValue: 0 }).success).toBe(false);
    });

    it('applies documented deal defaults', () => {
      const result = createDealSchema.safeParse({
        leadId: '123e4567-e89b-12d3-a456-426614174000',
        propertyUnitId: '123e4567-e89b-12d3-a456-426614174001',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.brokeragePercent).toBe(2.5);
        expect(result.data.repSplitPercent).toBe(50);
        expect(result.data.coBrokerSharePercent).toBe(0);
        expect(result.data.dealStatus).toBe('TOKEN_RECEIVED');
      }
    });

    it('rejects invalid updateDealStatus values but accepts valid ones', () => {
      expect(updateDealStatusSchema.safeParse({ dealStatus: 'MAGIC_STATUS' }).success).toBe(false);
      expect(
        updateDealStatusSchema.safeParse({ dealStatus: 'PAYMENT_RECEIVED', notes: 'paid via NEFT' }).success
      ).toBe(true);
    });

    it('enforces bounds on simulateCommissionSchema', () => {
      expect(simulateCommissionSchema.safeParse({ agreementValue: 10000000, brokeragePercent: 0.2 }).success).toBe(false);
      expect(simulateCommissionSchema.safeParse({ agreementValue: -5 }).success).toBe(false);
      expect(simulateCommissionSchema.safeParse({ agreementValue: 10000000 }).success).toBe(true);
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

    it('rejects a portal title shorter than 3 characters', () => {
      const base = {
        leadId: '123e4567-e89b-12d3-a456-426614174000',
        selectedUnitIds: ['123e4567-e89b-12d3-a456-426614174001'],
      };
      expect(createPortalSchema.safeParse({ ...base, title: 'ab' }).success).toBe(false);
      expect(createPortalSchema.safeParse({ ...base, title: 'abc' }).success).toBe(true);
    });

    it('rejects an empty selectedUnitIds array and non-UUID entries', () => {
      const base = {
        leadId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Curated Properties',
      };
      const empty = createPortalSchema.safeParse({ ...base, selectedUnitIds: [] });
      expect(empty.success).toBe(false);
      if (!empty.success) {
        expect(empty.error.issues.some((i) => i.path.includes('selectedUnitIds'))).toBe(true);
      }
      expect(createPortalSchema.safeParse({ ...base, selectedUnitIds: ['unit-1'] }).success).toBe(false);
    });

    it('enforces expiresInDays bounds of 1..90 with default 30', () => {
      const base = {
        leadId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Curated Properties',
        selectedUnitIds: ['123e4567-e89b-12d3-a456-426614174001'],
      };
      expect(createPortalSchema.safeParse({ ...base, expiresInDays: 0 }).success).toBe(false);
      expect(createPortalSchema.safeParse({ ...base, expiresInDays: 91 }).success).toBe(false);
      expect(createPortalSchema.safeParse({ ...base, expiresInDays: 90 }).success).toBe(true);
      const defaulted = createPortalSchema.safeParse(base);
      expect(defaulted.success).toBe(true);
      if (defaulted.success) expect(defaulted.data.expiresInDays).toBe(30);
    });

    it('rejects negative or fractional dwellTimeSec', () => {
      expect(portalTelemetryEventSchema.safeParse({ actionType: 'PORTAL_OPEN', dwellTimeSec: -1 }).success).toBe(false);
      expect(portalTelemetryEventSchema.safeParse({ actionType: 'PORTAL_OPEN', dwellTimeSec: 1.5 }).success).toBe(false);
    });

    it('defaults dwellTimeSec to 0 when omitted', () => {
      const result = portalTelemetryEventSchema.safeParse({ actionType: 'UNIT_EXPAND' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.dwellTimeSec).toBe(0);
    });

    it('accepts every documented telemetry actionType', () => {
      for (const actionType of [
        'PORTAL_OPEN', 'UNIT_EXPAND', 'PHOTO_SWIPE', 'VIDEO_PLAY', 'BROCHURE_DOWNLOAD',
        'MAP_OPEN', 'WHATSAPP_CLICK', 'CALL_CLICK', 'VISIT_BOOKING_CLICK',
      ]) {
        expect(portalTelemetryEventSchema.safeParse({ actionType }).success).toBe(true);
      }
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

    it('rejects a RERA number shorter than 8 characters', () => {
      const base = {
        developerName: 'Godrej Properties',
        projectName: 'Godrej Kharghar Highland',
        microMarket: 'Kharghar Sector 35',
        basePricePerSqft: 11500,
      };
      expect(createProjectSchema.safeParse({ ...base, reraNumber: 'P520' }).success).toBe(false);
      expect(createProjectSchema.safeParse({ ...base, reraNumber: 'P52000018920' }).success).toBe(true);
    });

    it('rejects a non-positive basePricePerSqft', () => {
      const result = createProjectSchema.safeParse({
        developerName: 'Godrej Properties',
        projectName: 'Godrej Kharghar Highland',
        reraNumber: 'P52000018920',
        microMarket: 'Kharghar Sector 35',
        basePricePerSqft: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rejects out-of-range BHK (0 or 7) on unit creation', () => {
      const base = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        unitNumber: 'Tower A 1002',
        carpetAreaSqft: 720,
        floorNumber: 10,
        totalFloors: 24,
        possessionStatus: 'UNDER_CONSTRUCTION',
        agreementValue: 8200000,
      };
      expect(createUnitSchema.safeParse({ ...base, bhk: 0 }).success).toBe(false);
      expect(createUnitSchema.safeParse({ ...base, bhk: 7 }).success).toBe(false);
    });

    it('rejects zero carpet area and zero agreement value', () => {
      const base = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        bhk: 2,
        floorNumber: 10,
        totalFloors: 24,
        possessionStatus: 'READY_TO_MOVE',
      };
      expect(createUnitSchema.safeParse({ ...base, carpetAreaSqft: 0, agreementValue: 8200000 }).success).toBe(false);
      expect(createUnitSchema.safeParse({ ...base, carpetAreaSqft: 720, agreementValue: 0 }).success).toBe(false);
    });

    it('applies documented statutory charge defaults on unit creation', () => {
      const result = createUnitSchema.safeParse({
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        bhk: 2,
        carpetAreaSqft: 720,
        floorNumber: 10,
        totalFloors: 24,
        possessionStatus: 'READY_TO_MOVE',
        agreementValue: 8200000,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stampDutyRate).toBe(6.0);
        expect(result.data.gstRate).toBe(5.0);
        expect(result.data.floorRiseCharges).toBe(0.0);
        expect(result.data.verificationStatus).toBe('DRAFT');
      }
    });

    it('enforces mandatory audit notes (min 3 chars) on verifyUnitSchema', () => {
      expect(verifyUnitSchema.safeParse({ targetStatus: 'RERA_VERIFIED', auditNotes: 'x' }).success).toBe(false);
      expect(
        verifyUnitSchema.safeParse({ targetStatus: 'RERA_VERIFIED', auditNotes: 'Physically audited on site' }).success
      ).toBe(true);
    });

    it('rejects an invalid visit itinerary stop structure', () => {
      const result = createVisitSchema.safeParse({
        leadId: '123e4567-e89b-12d3-a456-426614174000',
        scheduledDate: new Date().toISOString(),
        timeSlot: 'Saturday 11:00 AM',
        itineraryStops: [{ unitId: 'not-a-uuid' }],
      });
      expect(result.success).toBe(false);
    });
  });
});
