import { z } from 'zod';

const optionalUrl = z.string().trim().optional().nullable().or(z.literal(''));

export const inventoryMediaAssetSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  kind: z.enum(['image', 'video']),
  title: z.string().max(120).optional(),
  alt: z.string().max(240).optional(),
  caption: z.string().max(240).optional(),
  mimeType: z.string().max(80).optional(),
  bytes: z.number().int().nonnegative().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationSeconds: z.number().nonnegative().optional(),
});

export const flexibleMediaAssetSchema = z.union([
  inventoryMediaAssetSchema,
  z.string(),
  z.object({
    asset_id: z.string().optional(),
    project_id: z.string().optional(),
    asset_type: z.string().optional(),
    subtype: z.string().optional(),
    title: z.string().optional(),
    file_url: z.string().optional(),
    url: z.string().optional(),
    page_number: z.number().optional(),
    original: z.boolean().optional(),
    display_position: z.string().optional(),
    sort_order: z.number().optional(),
    confidence: z.number().optional(),
    description: z.string().optional(),
  }).passthrough(),
]);

const mediaGallery = z.array(flexibleMediaAssetSchema).max(100).default([]);
const highlights = z.array(z.string().trim().min(2).max(240)).max(20).default([]);

export const createProjectSchema = z.object({
  organizationId: z.string().uuid().optional().nullable(),
  developerName: z.string().min(2, 'Developer name must be at least 2 characters'),
  projectName: z.string().min(2, 'Project name must be at least 2 characters'),
  reraNumber: z.string().min(8, 'Valid MahaRERA registration number is required'),
  microMarket: z.string().min(2, 'Micro market locality is required'),
  subLocality: z.string().optional().nullable(),
  shortDescription: z.string().trim().max(1000).optional().nullable(),
  description: z.string().trim().max(10000).optional().nullable(),
  locationDescription: z.string().trim().max(2000).optional().nullable(),
  keyHighlights: highlights,
  mediaGallery,
  coverImageUrl: optionalUrl,
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  distanceToMetroKm: z.number().min(0).optional().nullable(),
  hasOccupancyCertificate: z.boolean().default(false),
  commencementCertificateDate: z.string().optional().nullable(),
  expectedPossessionDate: z.string().optional().nullable(),
  totalTowers: z.number().int().min(1).default(1),
  totalFloors: z.number().int().min(1).default(15),
  basePricePerSqft: z.number().positive('Base price per sqft must be positive'),
  brochureUrl: optionalUrl,
  youtubeWalkthroughUrl: optionalUrl,
  masterPlanUrl: optionalUrl,
  amenities: z.array(z.string()).default([]),
  developerSalesPocName: z.string().optional().nullable(),
  developerSalesPocPhone: z.string().optional().nullable(),
  standardCommissionPercent: z.number().min(0).max(10).default(2.0),
  reraCertificateUrl: optionalUrl,
  reraRegisteredName: z.string().optional().nullable(),
  reraProjectStatus: z.string().optional().nullable(),
  reraValidUntil: z.string().optional().nullable(),
  reraVerificationDate: z.string().optional().nullable(),
  reraCertDataJson: z.string().optional().nullable(),
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
  description: z.string().trim().max(4000).optional(),
  featureHighlights: highlights,
  floorPlanUrl: optionalUrl,
  mediaGallery,
  
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
  videoReelUrl: optionalUrl,
  isHotDeal: z.boolean().default(false),
  isExclusive: z.boolean().default(false),
});

export const updateProjectSchema = createProjectSchema.partial();
export const updateUnitSchema = createUnitSchema.partial();

export const verifyUnitSchema = z.object({
  targetStatus: z.enum(['DRAFT', 'RERA_VERIFIED', 'PHYSICALLY_AUDITED', 'ACTIVE_MARKETABLE', 'STALE_EXPIRED', 'ARCHIVED_SOLD']),
  auditorUserId: z.string().optional(),
  auditNotes: z.string().min(3, 'Audit notes are mandatory for verification audit trail'),
  updatedAgreementValue: z.number().positive().optional(),
});
