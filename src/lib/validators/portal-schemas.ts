import { z } from 'zod';

export const createPortalSchema = z.object({
  organizationId: z.string().uuid().optional(),
  leadId: z.string().uuid('Lead ID must be a valid UUID'),
  title: z.string().min(3, 'Portal title must be at least 3 characters'),
  customMessage: z.string().optional().nullable(),
  createdById: z.string().uuid().optional().nullable(),
  expiresInDays: z.number().int().min(1).max(90).default(30),
  selectedUnitIds: z.array(z.string().uuid()).min(1, 'Select at least one property unit'),
});

export const portalTelemetryEventSchema = z.object({
  actionType: z.enum([
    'PORTAL_OPEN',
    'UNIT_EXPAND',
    'PHOTO_SWIPE',
    'VIDEO_PLAY',
    'BROCHURE_DOWNLOAD',
    'MAP_OPEN',
    'WHATSAPP_CLICK',
    'CALL_CLICK',
    'VISIT_BOOKING_CLICK',
  ]),
  unitId: z.string().uuid().optional().nullable(),
  dwellTimeSec: z.number().int().min(0).default(0),
  metadata: z.record(z.any()).optional().default({}),
});
