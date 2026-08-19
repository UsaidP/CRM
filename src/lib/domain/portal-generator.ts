/**
 * Client Portal Generator & Engagement Telemetry Service
 */

export interface PortalGenerationInput {
  leadId: string;
  leadName: string;
  leadPhone: string;
  selectedUnitIds: string[];
  customMessage?: string;
  createdById?: string;
}

export function generatePortalToken(leadName: string, bhkDescription: string = 'options'): string {
  const cleanName = (leadName || 'client')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20);

  const cleanBhk = bhkDescription
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .slice(0, 15);

  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${cleanName}-${cleanBhk}-${randomSuffix}`;
}

export function buildWhatsAppPortalShareText(params: {
  leadName: string;
  portalUrl: string;
  propertyCount: number;
  microMarkets: string[];
}): string {
  const { leadName, portalUrl, propertyCount, microMarkets } = params;
  const marketList = microMarkets.join(' & ');

  return `Hello ${leadName}!\n\nBased on our conversation, we selected *${propertyCount} property options* in *${marketList}* from our current broker records.\n\nView your private options here:\n${portalUrl}\n\nIncluded where recorded:\n- RERA registration IDs\n- Calculated all-in cost breakdowns\n- Listing photos, brochures, and walkthrough links\n\nPlease ask us to reconfirm price and availability before making a decision.`;
}

export type EngagementTier = 'HOT_PROSPECT' | 'WARM_INTEREST' | 'INITIAL_VIEW' | 'NO_ACTIVITY';

export interface TelemetrySummary {
  totalViews: number;
  dwellTimeSeconds: number;
  photoSwipes: number;
  brochureDownloads: number;
  videoPlays: number;
  whatsAppInquiries: number;
  visitBookingsRequested: number;
  engagementTier: EngagementTier;
  brokerAlertMessage?: string;
}

export function evaluateEngagementTier(logs: Array<{ actionType: string; dwellTimeSec?: number }>): TelemetrySummary {
  let totalViews = 0;
  let dwellTimeSeconds = 0;
  let photoSwipes = 0;
  let brochureDownloads = 0;
  let videoPlays = 0;
  let whatsAppInquiries = 0;
  let visitBookingsRequested = 0;

  for (const log of logs) {
    dwellTimeSeconds += log.dwellTimeSec || 0;
    switch (log.actionType) {
      case 'PORTAL_OPEN':
        totalViews++;
        break;
      case 'PHOTO_SWIPE':
        photoSwipes++;
        break;
      case 'BROCHURE_DOWNLOAD':
        brochureDownloads++;
        break;
      case 'VIDEO_PLAY':
        videoPlays++;
        break;
      case 'WHATSAPP_CLICK':
        whatsAppInquiries++;
        break;
      case 'VISIT_BOOKING_CLICK':
        visitBookingsRequested++;
        break;
    }
  }

  let engagementTier: EngagementTier = 'NO_ACTIVITY';
  let brokerAlertMessage = undefined;

  if (visitBookingsRequested > 0 || whatsAppInquiries > 0 || (brochureDownloads > 0 && photoSwipes >= 4)) {
    engagementTier = 'HOT_PROSPECT';
    brokerAlertMessage = '🔥 HOT LEAD: Client is actively requesting visit/details or downloaded brochure!';
  } else if (photoSwipes >= 2 || totalViews >= 2 || dwellTimeSeconds >= 45) {
    engagementTier = 'WARM_INTEREST';
    brokerAlertMessage = '⚡ WARM LEAD: Client spent >45s browsing photos & specs.';
  } else if (totalViews > 0) {
    engagementTier = 'INITIAL_VIEW';
  }

  return {
    totalViews,
    dwellTimeSeconds,
    photoSwipes,
    brochureDownloads,
    videoPlays,
    whatsAppInquiries,
    visitBookingsRequested,
    engagementTier,
    brokerAlertMessage,
  };
}
