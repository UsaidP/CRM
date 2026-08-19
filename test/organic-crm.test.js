import { test, expect, describe } from 'bun:test';
import { resolveBrokerByInboundIdentifier, OFFICIAL_BROKER_NUMBERS } from '../src/lib/domain/broker-resolver';
import {
  generateCampaignDeepLink,
  analyzeInboundAttribution,
  generateSvgQrCode,
} from '../src/lib/domain/campaign-attribution';
import { evaluate24HourMessagingWindow } from '../src/lib/domain/contact-manager';

describe('ZamZam Organic Lead Capture & CRM Program Tests', () => {
  describe('Phase 1 & 2: Broker Number Invariants & Resolver', () => {
    test('Official broker constants match user directives (+917977552011 & +919967731071)', () => {
      expect(OFFICIAL_BROKER_NUMBERS.SAFWAN.e164).toBe('+917977552011');
      expect(OFFICIAL_BROKER_NUMBERS.SAFWAN.cleanDigits).toBe('7977552011');
      expect(OFFICIAL_BROKER_NUMBERS.SUHEL.e164).toBe('+919967731071');
      expect(OFFICIAL_BROKER_NUMBERS.SUHEL.cleanDigits).toBe('9967731071');
    });

    test('Resolver accurately resolves Safwan Diwan from clean digits or E.164', async () => {
      const res = await resolveBrokerByInboundIdentifier('7977552011');
      expect(res.success).toBe(true);
      expect(res.brokerPhoneE164).toBe('+917977552011');
      expect(res.brokerName).toContain('Safwan');
    });

    test('Resolver accurately resolves Suhel Patel from clean digits or E.164', async () => {
      const res = await resolveBrokerByInboundIdentifier('+919967731071');
      expect(res.success).toBe(true);
      expect(res.brokerPhoneE164).toBe('+919967731071');
      expect(res.brokerName).toContain('Suhel');
    });

    test('Resolver rejects unknown numbers without falling back to round-robin or current user', async () => {
      const res = await resolveBrokerByInboundIdentifier('+919876543210');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Unregistered inbound contacted number');
    });
  });

  describe('Phase 3 & 5: Deep Link Engine & Attribution Code Parsing', () => {
    test('generateCampaignDeepLink builds valid wa.me URL with clean digits and uppercase code', () => {
      const link = generateCampaignDeepLink({
        brokerPhoneE164: '+917977552011',
        sourceCode: 'marvel35',
        projectName: 'Sai Marvel',
        bhk: 2,
      });

      expect(link.cleanPhone).toBe('917977552011');
      expect(link.sourceCode).toBe('MARVEL35');
      expect(link.waUrl).toContain('https://wa.me/917977552011?text=');
      expect(link.waUrl).toContain('MARVEL35');
      expect(link.svgQrCode).toContain('<svg');
      expect(link.svgQrCode).toContain('ZP');
    });

    test('analyzeInboundAttribution identifies EXACT code attribution from WhatsApp text', () => {
      const text = 'Hi ZamZam Properties, I saw your video for Sai Marvel 2BHK. Code: MARVEL35. Please share pricing.';
      const res = analyzeInboundAttribution(text, 'WHATSAPP');

      expect(res.sourceConfidence).toBe('EXACT');
      expect(res.leadSource).toBe('WHATSAPP_EXACT');
      expect(res.detectedCode).toBe('MARVEL35');
      expect(res.detectedProject).toBe('Sai Marvel Heights');
      expect(res.detectedBhk).toBe(2);
    });

    test('analyzeInboundAttribution detects YouTube exact attribution with #code', () => {
      const text = 'Inquiring about Taloja 1 BHK from your YouTube Short #TALOJA21';
      const res = analyzeInboundAttribution(text, 'WHATSAPP');

      expect(res.sourceConfidence).toBe('EXACT');
      expect(res.leadSource).toBe('YOUTUBE_EXACT');
      expect(res.detectedCode).toBe('TALOJA21');
      expect(res.detectedBhk).toBe(1);
    });

    test('analyzeInboundAttribution infers INFERRED confidence for keyword mentions without codes', () => {
      const text = 'Hello, looking for 2 BHK in Crown Heights Kharghar';
      const res = analyzeInboundAttribution(text, 'WHATSAPP');

      expect(res.sourceConfidence).toBe('INFERRED');
      expect(res.leadSource).toBe('WHATSAPP_ORGANIC_UNKNOWN');
      expect(res.detectedCode).toBeUndefined();
      expect(res.detectedProject).toBe('Crown Heights Luxury Towers');
      expect(res.detectedBhk).toBe(2);
    });

    test('Direct call without stated source code is classified as PHONE_ORGANIC_UNKNOWN', () => {
      const text = 'Hello is this ZamZam Properties?';
      const res = analyzeInboundAttribution(text, 'CALL');

      expect(res.sourceConfidence).toBe('UNKNOWN');
      expect(res.leadSource).toBe('PHONE_ORGANIC_UNKNOWN');
    });
  });

  describe('Phase 4: Social Identity Without Fake Phone Numbers', () => {
    test('SVG QR generator creates valid XML SVG output with high contrast', () => {
      const svg = generateSvgQrCode('https://wa.me/917977552011?text=Hi');
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect(svg).toContain('viewBox="0 0 200 200"');
    });
  });

  describe('Phase 8: 24-Hour Messaging Window Compliance', () => {
    test('Recent inbound message keeps 24h window open', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const res = evaluate24HourMessagingWindow(oneHourAgo);

      expect(res.isOpen).toBe(true);
      expect(res.requiresApprovedTemplate).toBe(false);
      expect(res.hoursRemaining).toBeGreaterThanOrEqual(22.9);
      expect(res.windowLabel).toContain('24h Window Open');
    });

    test('Expired inbound message (>24h) flags template requirement', () => {
      const twentySixHoursAgo = new Date(Date.now() - 26 * 60 * 60 * 1000);
      const res = evaluate24HourMessagingWindow(twentySixHoursAgo);

      expect(res.isOpen).toBe(false);
      expect(res.requiresApprovedTemplate).toBe(true);
      expect(res.hoursRemaining).toBe(0);
      expect(res.windowLabel).toContain('24h Window Expired');
    });

    test('Null inbound date gracefully reports closed window', () => {
      const res = evaluate24HourMessagingWindow(null);
      expect(res.isOpen).toBe(false);
      expect(res.requiresApprovedTemplate).toBe(true);
    });
  });

  describe('Phase 6 & 7: Contact Deduplication & Merging Audit Trail', () => {
    test('Deduplication logic accurately records audit snapshot and re-links identities', async () => {
      const { prisma } = await import('../src/lib/db/prisma');
      const { findOrCreateContact, mergeContacts } = await import('../src/lib/domain/contact-manager');

      const org = await prisma.organization.findFirst();
      if (!org) return;

      const uniquePhone = `+91999${Math.floor(1000000 + Math.random() * 9000000)}`;
      const uniqueIg = `test_ig_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      // Create contact A (phone)
      const contactA = await findOrCreateContact({
        organizationId: org.id,
        fullName: 'Test Buyer Alpha',
        phoneE164: uniquePhone,
        notes: 'Inquired about Kharghar 35',
      });

      // Create contact B (social ig_id)
      const contactB = await findOrCreateContact({
        organizationId: org.id,
        fullName: `@${uniqueIg}`,
        instagramId: uniqueIg,
        notes: 'Inquired via Instagram Reel',
      });

      expect(contactA).not.toBeNull();
      expect(contactB).not.toBeNull();

      // Merge contact B into contact A
      const mergeRes = await mergeContacts({
        organizationId: org.id,
        sourceContactId: contactB.id,
        targetContactId: contactA.id,
        reason: 'Same individual verified via WhatsApp number confirmation',
      });

      expect(mergeRes.success).toBe(true);
      expect(mergeRes.targetContactId).toBe(contactA.id);

      // Verify audit record created
      const audit = await prisma.contactMergeAudit.findUnique({
        where: { id: mergeRes.auditId },
      });
      expect(audit).not.toBeNull();
      expect(audit?.sourceContactId).toBe(contactB.id);
      expect(audit?.targetContactId).toBe(contactA.id);

      // Verify identities transferred
      const targetIdentities = await prisma.contactIdentity.findMany({
        where: { contactId: contactA.id },
      });
      const types = targetIdentities.map((i) => i.identityType);
      expect(types).toContain('PHONE_E164');
      expect(types).toContain('INSTAGRAM_IGID');
    });
  });
});

