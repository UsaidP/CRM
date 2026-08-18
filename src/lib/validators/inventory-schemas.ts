import { z } from 'zod';

export const createProjectSchema = z.object({
  organizationId: z.string().uuid().optional(),
  developerName: z.string().min(2, 'Developer name must be at least 2 characters'),
  projectName: z.string().min(2, 'Project name must be at least 2 characters'),
  reraNumber: z.string().min(8, 'Valid MahaRERA registration number is required'),
  microMarket: z.string().min(2, 'Micro market locality is required'),
  subLocality: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  distanceToMetroKm: z.number().min(0).optional(),
  hasOccupancyCertificate: z.boolean().default(false),
  commencementCertificateDate: z.string().optional().nullable(),
  expectedPossessionDate: z.string().optional().nullable(),
  totalTowers: z.number().int().min(1).default(1),
  totalFloors: z.number().int().min(1).default(15),
  basePricePerSqft: z.number().positive('Base price per sqft must be positive'),
  brochureUrl: z.string().url().optional().or(z.literal('')),
  youtubeWalkthroughUrl: z.string().url().optional().or(z.literal('')),
  masterPlanUrl: z.string().url().optional().or(z.literal('')),
  amenities: z.array(z.string()).default([]),
  developerSalesPocName: z.string().optional(),
  developerSalesPocPhone: z.string().optional(),
  standardCommissionPercent: z.number().min(0).max(10).default(2.0),
});

export const createUnitSchema = z.object({
  projectId: z.string().uuid('Project ID must be a valid UUID'),
  unitNumber: z.string().optional(),
  bhk: z.number().int().min(1).max(6),
  bathrooms: z.number().int().min(1).default(2),
  balconies: z.number().int().min(0).default(1),
  floorNumber: z.number().int().min(1),
  totalFloors: z.number().int().min(1),
  carpetAreaSqft: z.number().int().positive('Carpet area must be positive'),
  facing: z.enum(['EAST', 'WEST', 'NORTH', 'SOUTH', 'NORTH_EAST', 'NORTH_WEST', 'SOUTH_EAST', 'SOUTH_WEST']).default('EAST'),
  possessionStatus: z.enum(['READY_TO_MOVE', 'UNDER_CONSTRUCTION']),
  possessionDate: z.string().optional().nullable(),
  
  // Custom Overrides (optional, otherwise computed via project defaults)
  agreementValue: z.number().positive('Agreement value must be positive'),
  stampDutyRate: z.number().min(0).max(10).default(6.0),
  registrationFee: z.number().min(0).default(30000.0),
  gstRate: z.number().min(0).max(18).default(5.0),
  floorRiseCharges: z.number().min(0).default(0.0),
  parkingCharges: z.number().min(0).default(250000.0),
  societyDevelopmentCharges: z.number().min(0).default(150000.0),
  
  verificationStatus: z.enum(['DRAFT', 'RERA_VERIFIED', 'PHYSICALLY_AUDITED', 'ACTIVE_MARKETABLE', 'STALE_EXPIRED', 'ARCHIVED_SOLD']).default('DRAFT'),
  verificationNotes: z.string().optional(),
  photoGallery: z.array(z.string()).default([]),
  videoReelUrl: z.string().url().optional().or(z.literal('')),
  isHotDeal: z.boolean().default(false),
  isExclusive: z.boolean().default(false),
});

export const verifyUnitSchema = z.object({
  targetStatus: z.enum(['DRAFT', 'RERA_VERIFIED', 'PHYSICALLY_AUDITED', 'ACTIVE_MARKETABLE', 'STALE_EXPIRED', 'ARCHIVED_SOLD']),
  auditorUserId: z.string().optional(),
  auditNotes: z.string().min(3, 'Audit notes are mandatory for verification audit trail'),
  updatedAgreementValue: z.number().positive().optional(),
});
