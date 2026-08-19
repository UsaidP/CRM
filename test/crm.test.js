import { test, expect, describe } from 'bun:test';
import { readFileSync } from 'node:fs';
import { calculateAllInCost } from '../src/lib/domain/cost-calculator';
import { validateReraNumber, assessUnitFreshness } from '../src/lib/domain/verification-engine';
import { normalizeIndianPhone } from '../src/lib/domain/phone-normalizer';
import { parseInboundMessageText } from '../src/lib/domain/attribution-engine';
import { evaluatePropertyMatch } from '../src/lib/domain/matching-engine';
import { generatePortalToken, buildWhatsAppPortalShareText, evaluateEngagementTier } from '../src/lib/domain/portal-generator';
import { buildWhatsAppSiteVisitItinerary } from '../src/lib/domain/visit-dispatcher';
import { calculateDealCommission } from '../src/lib/domain/commission-calculator';
import { computeContentRoi, computeAgentLeaderboard, computeCashFlowForecast, summarizeContentRoi } from '../src/lib/domain/analytics-engine';
import { normalizeMediaGallery, parseInventoryContent } from '../src/lib/inventory-media';
import {
  MATCHING_SIMULATION_ENDPOINT,
  buildPublicPortalPath,
  buildPublicPortalUrl,
  isPublicPortalPath,
} from '../src/lib/navigation';

const readSource = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('Phase 1: Inventory & Cost Engine', () => {
  test('Under-Construction Unit statutory breakdown with 5% GST and floor rise', () => {
    const cost = calculateAllInCost({
      agreementValue: 5000000,
      floorNumber: 5,
      carpetAreaSqft: 600,
      parkingCharges: 250000,
      societyDevCharges: 150000,
      hasOccupancyCertificate: false,
      isFemaleBuyer: false,
    });
    expect(cost.stampDutyAmount).toBe(300000);
    expect(cost.registrationFee).toBe(30000);
    expect(cost.gstAmount).toBe(250000);
    expect(cost.totalAllInCost).toBe(6010000);
  });

  test('Ready-to-Move with OC must have 0% GST', () => {
    const cost = calculateAllInCost({
      agreementValue: 7000000,
      floorNumber: 1,
      carpetAreaSqft: 750,
      hasOccupancyCertificate: true,
    });
    expect(cost.gstAmount).toBe(0);
  });

  test('MahaRERA format validation', () => {
    expect(validateReraNumber('P52000018920').isValid).toBe(true);
    expect(validateReraNumber('INVALID').isValid).toBe(false);
  });

  test('Freshness circuit breaker (<14 days vs >14 days)', () => {
    const fresh = assessUnitFreshness('ACTIVE_MARKETABLE', new Date(Date.now() - 2 * 86400000));
    expect(fresh.isStale).toBe(false);

    const stale = assessUnitFreshness('ACTIVE_MARKETABLE', new Date(Date.now() - 16 * 86400000));
    expect(stale.isStale).toBe(true);
  });

  test('Rich inventory media normalizes legacy photos and structured assets', () => {
    expect(normalizeMediaGallery('', JSON.stringify(['https://cdn.example/legacy.jpg']))[0]).toMatchObject({
      kind: 'image',
      url: 'https://cdn.example/legacy.jpg',
    });
    const parsed = parseInventoryContent({
      amenitiesJson: '["Clubhouse"]',
      keyHighlightsJson: '["Valley view"]',
      featureHighlightsJson: '["Morning light"]',
      mediaGalleryJson: JSON.stringify([{ id: 'm1', url: '/uploads/inventory/home.jpg', kind: 'image', alt: 'Living room' }]),
    });
    expect(parsed.amenities).toEqual(['Clubhouse']);
    expect(parsed.keyHighlights).toEqual(['Valley view']);
    expect(parsed.featureHighlights).toEqual(['Morning light']);
    expect(parsed.mediaGallery[0].url).toBe('/uploads/inventory/home.jpg');
  });
});

describe('Phase 2: Lead Attribution & Normalization', () => {
  test('E.164 phone normalization', () => {
    expect(normalizeIndianPhone('9820123456').e164).toBe('+919820123456');
    expect(normalizeIndianPhone('09820123456').e164).toBe('+919820123456');
    expect(normalizeIndianPhone('+91 98201 23456').e164).toBe('+919820123456');
  });

  test('Inbound inquiry parsing', () => {
    const parsed = parseInboundMessageText('Hi ZamZam, saw your YouTube Short for Sai Marvel 2BHK. Price?');
    expect(parsed.detectedBhk).toBe(2);
    expect(parsed.detectedChannel).toBe('YOUTUBE_SHORT');
    expect(parsed.detectedProjectKeyword).toBe('Sai Marvel');
  });
});

describe('Phase 3: Requirements-to-Property Matchmaker', () => {
  test('Matchmaker UI targets the implemented simulation route', () => {
    expect(MATCHING_SIMULATION_ENDPOINT).toBe('/api/v1/matching/simulate');
  });

  test('Budget ceiling filtering', () => {
    const req = {
      budgetMax: 7000000,
      bhkPreferences: [2],
      targetLocations: ['Kharghar Sector 35'],
      possessionPreference: 'ANY',
      minCarpetSqft: 600,
    };
    const unitExpensive = {
      id: 'unit-1',
      bhk: 2,
      carpetAreaSqft: 650,
      floorNumber: 5,
      totalFloors: 15,
      agreementValue: 7500000,
      allInTotalCost: 8500000, // > 5% over 70L
      verificationStatus: 'ACTIVE_MARKETABLE',
      lastVerifiedAt: new Date(),
      possessionStatus: 'READY_TO_MOVE',
      project: { id: 'p-1', projectName: 'Crown Heights', developerName: 'Crown', reraNumber: 'P52000018920', microMarket: 'Kharghar Sector 35', hasOccupancyCertificate: true },
    };
    const match = evaluatePropertyMatch(req, unitExpensive);
    expect(match.tier).toBe('DISQUALIFIED');
  });
});

describe('Phase 4: Client Portals & Telemetry', () => {
  test('Public portal links use the implemented /p route', () => {
    expect(buildPublicPortalPath('rahul-2bhk-options-8f2a')).toBe('/p/rahul-2bhk-options-8f2a');
    expect(buildPublicPortalUrl('http://localhost:3000', 'rahul-2bhk-options-8f2a')).toBe(
      'http://localhost:3000/p/rahul-2bhk-options-8f2a'
    );
  });

  test('Only public portal paths bypass the internal CRM shell', () => {
    expect(isPublicPortalPath('/p/rahul-2bhk-options-8f2a')).toBe(true);
    expect(isPublicPortalPath('/p')).toBe(true);
    expect(isPublicPortalPath('/portals')).toBe(false);
    expect(isPublicPortalPath('/matching')).toBe(false);
  });

  test('Slugified portal token generation', () => {
    const token = generatePortalToken('Rahul Sharma');
    expect(token.startsWith('rahul-sharma-')).toBe(true);
  });

  test('Engagement tier detection', () => {
    const viewLog = evaluateEngagementTier([{ actionType: 'PORTAL_OPEN', dwellTimeSec: 10 }]);
    expect(viewLog.engagementTier).toBe('INITIAL_VIEW');

    const warmLog = evaluateEngagementTier([
      { actionType: 'PORTAL_OPEN', dwellTimeSec: 20 },
      { actionType: 'PHOTO_SWIPE', dwellTimeSec: 30 },
    ]);
    expect(warmLog.engagementTier).toBe('WARM_INTEREST');

    const hotLog = evaluateEngagementTier([
      { actionType: 'VISIT_BOOKING_CLICK', dwellTimeSec: 10 },
    ]);
    expect(hotLog.engagementTier).toBe('HOT_PROSPECT');
  });

  test('Portal share copy describes recorded evidence without certification claims', () => {
    const text = buildWhatsAppPortalShareText({
      leadName: 'Rahul',
      portalUrl: 'https://crm.example/p/rahul-options',
      propertyCount: 2,
      microMarkets: ['Kharghar'],
    });
    expect(text).toContain('RERA registration IDs');
    expect(text).toContain('reconfirm price and availability');
    expect(text).not.toContain('100%');
    expect(text).not.toContain('Verified Photos');
  });
});

describe('Phase 5 & 6: Site Visits & Deal Closing Ledger', () => {
  test('WhatsApp itinerary dispatch formatting', () => {
    const text = buildWhatsAppSiteVisitItinerary({
      scheduledDateFormatted: 'Saturday, 22 Aug 2026',
      timeSlot: '10:00 AM',
      pickupLocation: 'Kharghar Station',
      leadName: 'Vikram Mehta',
      leadPhone: '+919820566778',
      assignedBrokerName: 'Farhan Shaikh',
      assignedBrokerPhone: '+919820000001',
      stops: [
        { unitId: 'u-1', expectedTime: '10:30 AM', projectName: 'Crown Heights', microMarket: 'Kharghar 35', bhk: 2, googleMapsQuery: 'Crown Heights' },
      ],
    });
    expect(text).toContain('Crown Heights');
  });

  test('Brokerage calculations with splits', () => {
    const deal = calculateDealCommission({ agreementValue: 6800000, brokeragePercent: 2.5, repSplitPercent: 50 });
    expect(deal.grossBrokerageAmount).toBe(170000);
    expect(deal.repCommissionAmount).toBe(85000);
    expect(deal.firmNetBrokerageAmount).toBe(85000);
  });
});

describe('Phase 7: Analytics & Reporting', () => {
  test('Cash flow forecast breakdown', () => {
    const forecast = computeCashFlowForecast([
      { dealStatus: 'PAYMENT_RECEIVED', grossBrokerageAmount: 100000, firmNetBrokerageAmount: 50000, repCommissionAmount: 50000 },
      { dealStatus: 'INVOICE_SENT', grossBrokerageAmount: 200000, firmNetBrokerageAmount: 100000, repCommissionAmount: 100000 },
    ]);
    expect(forecast.totalRealizedFirmNet).toBe(50000);
    expect(forecast.invoiceSentAmount).toBe(200000);
  });

  test('Channel pipeline shares come from recorded campaign channels', () => {
    const report = [
      { channelType: 'YOUTUBE_SHORT', attributedAgreementValue: 5000000, grossBrokerageRupees: 100000 },
      { channelType: 'INSTAGRAM_REEL', attributedAgreementValue: 3000000, grossBrokerageRupees: 50000 },
      { channelType: 'DIRECT_CALL', attributedAgreementValue: 2000000, grossBrokerageRupees: 50000 },
    ];
    const summary = summarizeContentRoi(report);
    expect(summary.totalAttributedGmv).toBe(10000000);
    expect(summary.youtubePipeline).toBe(100000);
    expect(summary.instagramPipeline).toBe(50000);
    expect(summary.youtubeSharePercent).toBe(50);
    expect(summary.instagramSharePercent).toBe(25);
  });

  test('Channel shares remain unavailable without attributed brokerage', () => {
    const summary = summarizeContentRoi([]);
    expect(summary.youtubeSharePercent).toBeNull();
    expect(summary.instagramSharePercent).toBeNull();
  });
});

describe('UI regression contracts', () => {
  test('Primary workflows and public portal expose route-specific metadata', () => {
    expect(readSource('../src/app/leads/layout.tsx')).toContain("title: 'Leads'");
    expect(readSource('../src/app/matching/layout.tsx')).toContain("title: 'Matchmaker'");
    expect(readSource('../src/app/p/[token]/layout.tsx')).toContain('Private property selection');
  });

  test('Shell exposes active navigation and isolates public portal content', () => {
    const shell = readSource('../src/components/layout/AppShell.tsx');
    const styles = readSource('../src/app/globals.css');
    expect(shell).toContain('aria-current={isActive ? \'page\' : undefined}');
    expect(shell).toContain('if (isPublicPortal)');
    expect(styles).toContain('.public-portal-main');
    expect(styles).toContain('overflow-x: clip');
  });

  test('Accessible dialog contract includes labelled native dialog and focus return', () => {
    const dialog = readSource('../src/components/ui/AccessibleDialog.tsx');
    expect(dialog).toContain('<dialog');
    expect(dialog).toContain('aria-labelledby={titleId}');
    expect(dialog).toContain('dialog.showModal()');
    expect(dialog).toContain('returnFocusRef.current?.focus()');
  });

  test('Deal stage updates retain rollback and visible failure state', () => {
    const deals = readSource('../src/components/deals/DealsLedgerClient.tsx');
    expect(deals).toContain('const previousDeals = deals');
    expect(deals).toContain('setDeals(previousDeals)');
    expect(deals).toContain('setActionError(err.message');
  });

  test('Shared visual system defines semantic status and reduced-motion tokens', () => {
    const styles = readSource('../src/app/globals.css');
    expect(styles).toContain('--color-status-success');
    expect(styles).toContain('--color-status-warning');
    expect(styles).toContain('--color-status-danger');
    expect(styles).toContain('--color-status-info');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
  });

  test('Inventory editing and media upload contracts are exposed', () => {
    const inventory = readSource('../src/components/inventory/InventoryClient.tsx');
    const uploader = readSource('../src/components/inventory/MediaUploader.tsx');
    const projectRoute = readSource('../src/app/api/v1/inventory/projects/[id]/route.ts');
    const unitRoute = readSource('../src/app/api/v1/inventory/units/[id]/route.ts');
    const mediaRoute = readSource('../src/app/api/v1/inventory/media/route.ts');
    const portalPage = readSource('../src/components/portal/ClientPortalView.tsx') + readSource('../src/app/p/[token]/page.tsx');
    expect(inventory).toContain('openEditProject');
    expect(inventory).toContain('openEditUnit');
    expect(inventory).toContain('Save project changes');
    expect(inventory).toContain('Save unit changes');
    expect(uploader).toContain('250 MB');
    expect(projectRoute).toContain('export async function PUT');
    expect(unitRoute).toContain('export async function PUT');
    expect(mediaRoute).toContain('MAX_IMAGE_BYTES');
    expect(mediaRoute).toContain('MAX_VIDEO_BYTES');
    expect(portalPage).toContain('iframe');
    expect(portalPage).toContain('Verified photos being uploaded');
  });
});
