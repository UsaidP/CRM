import { z } from 'zod';

export const createLeadSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional().nullable(),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  leadSource: z.enum([
    'instagram_reel',
    'youtube_short',
    'youtube_video',
    'whatsapp_group',
    'fb_group',
    'direct_call',
    'referral',
    'web_form',
  ]).default('whatsapp_group'),
  campaignId: z.string().uuid().optional().nullable(),
  sourceRefUrl: z.string().url().optional().nullable().or(z.literal('')),
  assignedBrokerId: z.string().uuid().optional().nullable(),
  currentStage: z.enum([
    'new_uncontacted',
    'discovery_call',
    'portal_shared',
    'visit_scheduled',
    'visit_done',
    'revisit_scheduled',
    'negotiation_token',
    'under_registration',
    'closed_won',
    'on_hold_nurture',
    'closed_lost',
  ]).default('new_uncontacted'),
  notes: z.string().optional().nullable(),
  city: z.string().default('Navi Mumbai'),
});

export const updateLeadStageSchema = z.object({
  currentStage: z.enum([
    'new_uncontacted',
    'discovery_call',
    'portal_shared',
    'visit_scheduled',
    'visit_done',
    'revisit_scheduled',
    'negotiation_token',
    'under_registration',
    'closed_won',
    'on_hold_nurture',
    'closed_lost',
  ]),
  notes: z.string().optional(),
  assignedBrokerId: z.string().uuid().optional(),
});

export const buyerRequirementSchema = z.object({
  budgetMin: z.number().min(0).optional().nullable(),
  budgetMax: z.number().positive('Budget max must be greater than 0'),
  bhkPreferences: z.array(z.number().int().min(1).max(6)).min(1, 'Select at least one BHK preference'),
  targetLocations: z.array(z.string()).default(['Kharghar Sector 35']),
  possessionPreference: z.enum(['READY_TO_MOVE', 'UNDER_CONSTRUCTION', 'ANY']).default('ANY'),
  minCarpetSqft: z.number().int().positive().optional().nullable(),
  loanPreApproved: z.boolean().default(false),
  purpose: z.enum(['self_use', 'investment']).default('self_use'),
  floorPreference: z.enum(['high', 'middle', 'low', 'any']).default('middle'),
});

export const simulateInboundLeadSchema = z.object({
  fromPhone: z.string().min(10, 'Valid phone number required'),
  senderName: z.string().optional().default('Prospective Buyer'),
  messageText: z.string().min(3, 'Message text is required'),
  channelSource: z.enum(['WHATSAPP', 'INSTAGRAM', 'YOUTUBE', 'FACEBOOK', 'PHONE_CALL']).default('WHATSAPP'),
  campaignSlug: z.string().optional(),
});
