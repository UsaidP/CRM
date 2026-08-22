/**
 * TypeScript Interfaces for ZamZam Properties CRM & Real Estate Operations Suite
 */

export interface Organization {
  id: string;
  name: string;
  slug: string;
  reraBrokerRegistration?: string | null;
  settingsJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  organizationId: string;
  fullName: string;
  email: string;
  phoneE164: string;
  role: 'SUPER_ADMIN' | 'BROKER_MANAGER' | 'SALES_EXECUTIVE' | 'TELECALLER';
  isActive: boolean;
}

export interface DeveloperProject {
  id: string;
  organizationId: string;
  developerName: string;
  projectName: string;
  reraNumber: string;
  microMarket: string;
  subLocality?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distanceToMetroKm?: number | null;
  hasOccupancyCertificate: boolean;
  commencementCertificateDate?: string | null;
  expectedPossessionDate?: string | null;
  totalTowers: number;
  totalFloors: number;
  basePricePerSqft: number;
  brochureUrl?: string | null;
  youtubeWalkthroughUrl?: string | null;
  masterPlanUrl?: string | null;
  amenitiesJson: string;
  developerSalesPocName?: string | null;
  developerSalesPocPhone?: string | null;
  standardCommissionPercent: number;
  units?: PropertyUnit[];
  createdAt: string;
  updatedAt: string;
}

export interface PropertyUnit {
  id: string;
  projectId: string;
  project?: DeveloperProject;
  unitNumber?: string | null;
  bhk: number;
  bathrooms: number;
  balconies: number;
  floorNumber: number;
  totalFloors: number;
  carpetAreaSqft: number;
  facing: string;
  possessionStatus: 'READY_TO_MOVE' | 'UNDER_CONSTRUCTION';
  possessionDate?: string | null;
  agreementValue: number;
  stampDutyRate: number;
  registrationFee: number;
  gstRate: number;
  floorRiseCharges: number;
  parkingCharges: number;
  societyDevelopmentCharges: number;
  allInTotalCost: number;
  verificationStatus: 'DRAFT' | 'RERA_VERIFIED' | 'PHYSICALLY_AUDITED' | 'ACTIVE_MARKETABLE' | 'STALE_EXPIRED' | 'ARCHIVED_SOLD';
  verifiedByUserId?: string | null;
  lastVerifiedAt: string;
  verificationNotes?: string | null;
  photoGalleryJson: string;
  videoReelUrl?: string | null;
  isHotDeal: boolean;
  isExclusive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InboundCampaign {
  id: string;
  organizationId: string;
  campaignName: string;
  channelType: 'YOUTUBE_SHORT' | 'YOUTUBE_VIDEO' | 'INSTAGRAM_REEL' | 'INSTAGRAM_DM' | 'FB_GROUP' | 'WHATSAPP_GROUP' | 'DIRECT_CALL';
  contentId?: string | null;
  targetProjectId?: string | null;
  targetPropertyUnitId?: string | null;
  customSlug: string;
  waPrefilledText: string;
  totalClicks: number;
  totalLeadsGenerated: number;
  isActive: boolean;
  createdAt: string;
}

export interface Lead {
  id: string;
  organizationId: string;
  fullName?: string | null;
  phoneE164: string;
  email?: string | null;
  city: string;
  leadSource: string;
  campaignId?: string | null;
  campaign?: InboundCampaign | null;
  sourceRefUrl?: string | null;
  assignedBrokerId?: string | null;
  assignedBroker?: User | null;
  currentStage: 
    | 'new_uncontacted' 
    | 'discovery_call' 
    | 'portal_shared' 
    | 'visit_scheduled' 
    | 'visit_done' 
    | 'revisit_scheduled'
    | 'negotiation_token'
    | 'under_registration'
    | 'closed_won' 
    | 'on_hold_nurture'
    | 'closed_lost';
  notes?: string | null;
  requirements?: BuyerRequirement[];
  portals?: ClientPortal[];
  siteVisits?: SiteVisit[];
  deals?: DealTransaction[];
  createdAt: string;
  updatedAt: string;
}

export interface BuyerRequirement {
  id: string;
  leadId: string;
  budgetMin?: number | null;
  budgetMax: number;
  bhkPreferencesJson: string;
  targetLocationsJson: string;
  possessionPreference?: string | null;
  maxPossessionDate?: string | null;
  minCarpetSqft?: number | null;
  loanPreApproved: boolean;
  purpose: string;
  floorPreference?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ClientPortal {
  id: string;
  organizationId: string;
  leadId: string;
  lead?: Lead;
  token: string;
  title: string;
  customMessage?: string | null;
  createdById?: string | null;
  createdBy?: User | null;
  expiresAt?: string | null;
  isActive: boolean;
  totalViews: number;
  lastViewedAt?: string | null;
  portalUnits?: ClientPortalUnit[];
  telemetryLogs?: PortalTelemetryLog[];
  createdAt: string;
  updatedAt: string;
}

export interface ClientPortalUnit {
  id: string;
  portalId: string;
  propertyUnitId: string;
  propertyUnit?: PropertyUnit;
  displayOrder: number;
  brokerHighlight?: string | null;
  isFeatured: boolean;
}

export interface PortalTelemetryLog {
  id: string;
  portalId: string;
  unitId?: string | null;
  actionType: string;
  dwellTimeSec: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadataJson: string;
  createdAt: string;
}

export interface SiteVisit {
  id: string;
  organizationId: string;
  leadId: string;
  lead?: Lead;
  assignedBrokerId?: string | null;
  assignedBroker?: User | null;
  scheduledDate: string;
  timeSlot: string;
  pickupLocation: string;
  cabDetails?: string | null;
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  itineraryUnitsJson: string;
  feedbackNotes?: string | null;
  feedbackRating?: number | null;
  feedbackOutcome?: 'TOKEN_SUBMITTED' | 'HIGH_INTEREST' | 'PRICE_OBJECTION' | 'LAYOUT_OBJECTION' | 'NEEDS_MORE_OPTIONS' | null;
  createdAt: string;
  updatedAt: string;
}

export interface DealTransaction {
  id: string;
  organizationId: string;
  leadId: string;
  lead?: Lead;
  propertyUnitId: string;
  propertyUnit?: PropertyUnit;
  developerProjectId: string;
  developerProject?: DeveloperProject;
  closingBrokerId?: string | null;
  closingBroker?: User | null;
  agreementValue: number;
  brokeragePercent: number;
  grossBrokerageAmount: number;
  repCommissionAmount: number;
  firmNetBrokerageAmount: number;
  coBrokerName?: string | null;
  coBrokerSharePercent: number;
  bookingDate: string;
  dealStatus: 'TOKEN_RECEIVED' | 'AGREEMENT_REGISTERED' | 'INVOICE_SENT' | 'PAYMENT_RECEIVED' | 'CANCELLED';
  developerInvoiceNumber?: string | null;
  paymentReceivedDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  count: number;
  total: number;
  page: number;
  totalPages: number;
  data: T[];
}
