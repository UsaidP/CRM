import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { analyzeInboundAttribution } from '@/lib/domain/campaign-attribution';
import { findOrCreateContact } from '@/lib/domain/contact-manager';
import { ensureLeadFallbackReminder } from '@/lib/services/lead-reminder-service';

export const dynamic = 'force-dynamic';

/**
 * Meta Instagram GET Verification Handshake
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const expectedToken =
    process.env.INSTAGRAM_VERIFY_TOKEN ||
    process.env.META_WEBHOOK_VERIFY_TOKEN ||
    'zamzam_meta_webhook_secret_2026';

  if (mode === 'subscribe' && token === expectedToken) {
    return new Response(challenge || '', { status: 200 });
  }

  return NextResponse.json({ error: 'Instagram webhook verification token mismatch' }, { status: 403 });
}

function verifyInstagramSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader || !appSecret) return true;
  try {
    const parts = signatureHeader.split('=');
    const signature = parts[1];
    const hmac = crypto.createHmac('sha256', appSecret);
    const expected = hmac.update(rawBody).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Official Meta Instagram Messaging & Reel Referral Webhook Handler
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');
    const appSecret = process.env.META_APP_SECRET || '';

    const isValidSignature = verifyInstagramSignature(rawBody, signature, appSecret);
    if (!isValidSignature) {
      return NextResponse.json({ error: 'Invalid HMAC-SHA256 signature' }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 500 });
    }

    const isOfficialEnvelope = Array.isArray(payload.entry) && payload.entry.length > 0;

    if (isOfficialEnvelope) {
      const processedResults: any[] = [];

      for (const entry of payload.entry) {
        const messaging = entry.messaging || [];
        for (const item of messaging) {
          const sender = item.sender || {};
          const igUserId = sender.id;
          const msg = item.message || {};
          const messageId = msg.mid || `ig-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

          // Idempotency Check
          const existing = await prisma.webhookEventInbox.findUnique({
            where: { idempotencyKey: messageId },
          });
          if (existing) {
            processedResults.push({ messageId, status: 'SKIPPED_DUPLICATE' });
            continue;
          }

          await prisma.webhookEventInbox.create({
            data: {
              eventSource: 'INSTAGRAM_GRAPH',
              idempotencyKey: messageId,
              providerEventId: messageId,
              payloadJson: JSON.stringify(item),
              status: 'PROCESSED',
            },
          });

          // Extract Referral metadata if user swiped up on a Reel or Story
          const referral = msg.referral || item.referral || {};
          const referralRef = referral.ref || '';
          const referralSource = referral.source || 'REEL';
          const messageText = msg.text || `[Instagram ${referralSource} Referral]`;

          // Attribution analysis
          const rawTextForAttribution = referralRef ? `${messageText} Code: ${referralRef}` : messageText;
          const attribution = analyzeInboundAttribution(rawTextForAttribution, 'INSTAGRAM');

          // Find campaign if referral / code matches
          let matchedCampaign = null;
          if (attribution.detectedCode) {
            matchedCampaign = await prisma.inboundCampaign.findFirst({
              where: {
                OR: [
                  { sourceCode: attribution.detectedCode },
                  { customSlug: attribution.detectedCode.toLowerCase() },
                  { contentId: attribution.detectedCode },
                ],
              },
            });
          }

          // Resolve assigned broker (use campaign owner or Safwan as Kharghar lead)
          let assignedBrokerId = matchedCampaign?.assignedBrokerId;
          if (!assignedBrokerId) {
            const defaultBroker = await prisma.user.findFirst({
              where: { role: 'BROKER_MANAGER' },
            });
            assignedBrokerId = defaultBroker?.id;
          }

          // Upsert Durable Contact with INSTAGRAM_IGID identity (NO FAKE PHONE!)
          const contact = await findOrCreateContact({
            organizationId: org.id,
            fullName: `@${igUserId}`,
            instagramId: igUserId,
            assignedBrokerId,
            notes: `Instagram ${referralSource} inquiry: "${messageText}"`,
          });

          // Upsert Lead
          let lead = await prisma.lead.findFirst({
            where: { contactId: contact?.id },
          });

          if (lead) {
            lead = await prisma.lead.update({
              where: { id: lead.id },
              data: {
                leadSource: attribution.leadSource,
                sourceConfidence: attribution.sourceConfidence,
                sourceCode: attribution.detectedCode || lead.sourceCode,
                sourceContentId: referralRef || lead.sourceContentId,
                campaignId: matchedCampaign?.id || lead.campaignId,
                assignedBrokerId: assignedBrokerId || lead.assignedBrokerId,
                lastInboundMessageAt: new Date(),
                notes: `New Instagram message: "${messageText}"`,
              },
            });
          } else {
            lead = await prisma.lead.create({
              data: {
                organizationId: org.id,
                contactId: contact?.id,
                fullName: `@${igUserId}`,
                phoneE164: null, // NO FAKE PHONE FALLBACK
                leadSource: attribution.leadSource,
                sourceConfidence: attribution.sourceConfidence,
                sourceCode: attribution.detectedCode,
                sourceContentId: referralRef || undefined,
                campaignId: matchedCampaign?.id,
                assignedBrokerId,
                currentStage: 'new_uncontacted',
                firstResponseSlaMinutes: 0,
                lastInboundMessageAt: new Date(),
                notes: `Lead captured via Instagram ${referralSource}: "${messageText}"`,
              },
            });

            if (matchedCampaign) {
              await prisma.inboundCampaign.update({
                where: { id: matchedCampaign.id },
                data: { totalLeadsGenerated: { increment: 1 } },
              });
            }

            // Auto-seed speed-to-lead SLA reminder for fresh inbound
            await ensureLeadFallbackReminder(lead.id, {
              organizationId: org.id,
            });
          }

          // Log Communication Event
          await prisma.communicationLog.create({
            data: {
              leadId: lead.id,
              channel: 'INSTAGRAM_DM',
              direction: 'INBOUND',
              messageContent: messageText,
              metadataJson: JSON.stringify({
                igUserId,
                referral,
                attribution,
              }),
            },
          });

          processedResults.push({
            messageId,
            leadId: lead.id,
            attribution,
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Instagram events processed successfully',
        processedCount: processedResults.length,
        results: processedResults,
      }, { status: 200 });
    }

    // Direct / Test JSON Payload
    const {
      igUsername,
      customerName,
      sourceCode,
      commentOrDmText = '',
      eventId = `ig-test-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    } = payload;

    const existing = await prisma.webhookEventInbox.findUnique({
      where: { idempotencyKey: eventId },
    });
    if (existing) {
      return NextResponse.json({ success: true, message: 'Duplicate event ignored' });
    }

    await prisma.webhookEventInbox.create({
      data: {
        eventSource: 'INSTAGRAM_GRAPH',
        idempotencyKey: eventId,
        providerEventId: eventId,
        payloadJson: JSON.stringify(payload),
        status: 'PROCESSED',
      },
    });

    const textToAnalyze = sourceCode ? `${commentOrDmText} Code: ${sourceCode}` : commentOrDmText;
    const attribution = analyzeInboundAttribution(textToAnalyze, 'INSTAGRAM');

    let matchedCampaign = null;
    if (attribution.detectedCode) {
      matchedCampaign = await prisma.inboundCampaign.findFirst({
        where: {
          OR: [
            { sourceCode: attribution.detectedCode },
            { customSlug: attribution.detectedCode.toLowerCase() },
          ],
        },
      });
    }

    const defaultBroker = await prisma.user.findFirst({
      where: { role: 'BROKER_MANAGER' },
    });

    const contact = await findOrCreateContact({
      organizationId: org.id,
      fullName: customerName || (igUsername ? `@${igUsername}` : 'Instagram Prospect'),
      instagramId: igUsername || 'unknown_ig_user',
      assignedBrokerId: matchedCampaign?.assignedBrokerId || defaultBroker?.id,
      notes: `Direct Instagram DM: "${commentOrDmText}"`,
    });

    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        contactId: contact?.id,
        fullName: customerName || (igUsername ? `@${igUsername}` : 'Instagram Prospect'),
        phoneE164: null, // NO FAKE PHONE!
        leadSource: attribution.leadSource,
        sourceConfidence: attribution.sourceConfidence,
        sourceCode: attribution.detectedCode,
        campaignId: matchedCampaign?.id,
        assignedBrokerId: matchedCampaign?.assignedBrokerId || defaultBroker?.id,
        currentStage: 'new_uncontacted',
        lastInboundMessageAt: new Date(),
        notes: `Inbound Instagram DM inquiry: "${commentOrDmText}"`,
      },
    });

    await prisma.communicationLog.create({
      data: {
        leadId: lead.id,
        channel: 'INSTAGRAM_DM',
        direction: 'INBOUND',
        messageContent: commentOrDmText,
        metadataJson: JSON.stringify({ igUsername, attribution }),
      },
    });

    // Auto-seed speed-to-lead SLA reminder
    await ensureLeadFallbackReminder(lead.id, {
      organizationId: org.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Instagram lead ingested without dummy phone',
      data: {
        lead,
        attribution,
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Instagram webhook failed' },
      { status: 500 }
    );
  }
}
