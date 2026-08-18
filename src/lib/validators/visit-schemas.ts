import { z } from 'zod';

export const itineraryStopSchema = z.object({
  unitId: z.string(),
  projectName: z.string().min(1, 'Project name is required'),
  microMarket: z.string().min(1, 'Micro market is required'),
  unitNumber: z.string().optional().nullable(),
  bhk: z.number().int().min(1).max(6),
  expectedTime: z.string().min(1, 'Expected time is required'),
  developerPocName: z.string().optional().nullable(),
  developerPocPhone: z.string().optional().nullable(),
  googleMapsQuery: z.string().optional(),
});

export const createVisitSchema = z.object({
  organizationId: z.string().uuid().optional(),
  leadId: z.string().uuid('Lead ID must be a valid UUID'),
  assignedBrokerId: z.string().uuid().optional().nullable(),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  timeSlot: z.string().min(1, 'Time slot is required'),
  pickupLocation: z.string().min(2, 'Pickup location is required'),
  cabDetails: z.string().optional().nullable(),
  itineraryStops: z.array(itineraryStopSchema).min(1, 'At least one itinerary stop is required'),
});

export const updateVisitFeedbackSchema = z.object({
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).default('COMPLETED'),
  feedbackRating: z.number().int().min(1).max(5).optional().nullable(),
  feedbackOutcome: z.enum([
    'TOKEN_SUBMITTED',
    'HIGH_INTEREST',
    'PRICE_OBJECTION',
    'LAYOUT_OBJECTION',
    'NEEDS_MORE_OPTIONS',
  ]),
  feedbackNotes: z.string().optional().nullable(),
});
