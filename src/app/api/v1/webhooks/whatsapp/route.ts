import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { normalizeIndianPhone } from '@/lib/domain/phone-normalizer';
import { resolveBrokerByInboundIdentifier, OFFICIAL_BROKER_NUMBERS } from '@/lib/domain/broker-resolver';
import { analyzeInboundAttribution } from '@/lib/domain/campaign-attribution';
import { findOrCreateContact } from '@/lib/domain/contact-manager';
import { ensureLeadFallbackReminder } from '@/lib/services/lead-reminder-service';
import { upsertOrCreateLead } from '@/lib/domain/lead-creation';
import { resolveWebhookOrg } from '@/lib/domain/webhook-org-resolver';
import { handleApiError } from '@/lib/services/api-handler';

export const dynamic = 'force-dynamic';

/**
 * Meta Webhook GET Verification Handshake
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (!expectedToken) {
    console.error('[WEBHOOK] META_WEBHOOK_VERIFY_TOKEN is not configured');
    return NextResponse.json({ error: 'Webhook verification token not configured' }, { status: 500 });
  }

  if (mode === 'subscribe' && token === expectedToken) {
    return new Response(challenge || '', { status: 200 });
  }

  return NextResponse.json({ error: 'Webhook verification token mismatch' }, { status: 403 });
}

/**
 * Validates Meta X-Hub-Signature-256 Header
 */
function verifyMetaSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  // Fail CLOSED: if the app secret is not configured (or an explicit insecure
  // dev bypass is enabled), reject the payload rather than accepting it.
  if (!appSecret) {
    if (process.env.ALLOW_INSECURE_WEBHOOKS === '1') return true; // local dev only
    console.error('[WEBHOOK] META_APP_SECRET not configured — rejecting webhook');
    return false;
  }
  if (!signatureHeader) return false;
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
 * Official Meta WhatsApp Cloud API Inbound Webhook Handler
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');
    const appSecret = process.env.META_APP_SECRET || '';

    const isValidSignature = verifyMetaSignature(rawBody, signature, appSecret);
    if (!isValidSignature) {
      return NextResponse.json({ error: 'Invalid HMAC-SHA256 signature' }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON body' }, { status: 400 });
    }

    // Check if this is official Meta Envelope or flattened test payload
    const isOfficialMetaEnvelope = Array.isArray(payload.entry) && payload.entry.length > 0;
    const inboundPhoneId = isOfficialMetaEnvelope
      ? payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id
      : (payload.phoneNumberId || payload.phone_number_id || payload.contactedBrokerNumber);

    let org;
    try {
      const resolved = await resolveWebhookOrg('WHATSAPP', inboundPhoneId);
      org = resolved.org;
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Cannot resolve organization' }, { status: 404 });
    }

    if (isOfficialMetaEnvelope) {
      const processedResults: any[] = [];

      for (const entry of payload.entry) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value || {};
          const metadata = value.metadata || {};
          const phoneNumberId = metadata.phone_number_id || metadata.display_phone_number || '';
          const contacts = value.contacts || [];
          const messages = value.messages || [];
          const statuses = value.statuses || [];

          // 1. Process Status Updates (delivered, read, failed)
          for (const st of statuses) {
            const statusId = `wa-status-${st.id}-${st.status}`;
            await prisma.webhookEventInbox.upsert({
              where: { idempotencyKey: statusId },
              update: {},
              create: {
                eventSource: 'WHATSAPP_CLOUD',
                idempotencyKey: statusId,
                providerEventId: st.id,
                payloadJson: JSON.stringify(st),
                status: 'PROCESSED',
              },
            });
          }

          // 2. Process Inbound Messages
          for (const msg of messages) {
            const messageId = msg.id;

            // Idempotency Check
            const existing = await prisma.webhookEventInbox.findUnique({
              where: { idempotencyKey: messageId },
            });
            if (existing) {
              processedResults.push({ messageId, status: 'SKIPPED_DUPLICATE' });
              continue;
            }

            // Record in inbox
            await prisma.webhookEventInbox.create({
              data: {
                eventSource: 'WHATSAPP_CLOUD',
                idempotencyKey: messageId,
                providerEventId: messageId,
                payloadJson: JSON.stringify(msg),
                status: 'PROCESSED',
              },
            });

            // Extract Sender Info
            const senderWaId = msg.from;
            const contactMeta = contacts.find((c: any) => c.wa_id === senderWaId);
            const senderName = contactMeta?.profile?.name || 'Navi Mumbai Buyer';

            // Extract Message Text (handles text, interactive reply, caption on image/doc)
            let messageText = '';
            if (msg.type === 'text') {
              messageText = msg.text?.body || '';
            } else if (msg.type === 'interactive') {
              messageText = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '';
            } else if (msg.type === 'image' || msg.type === 'document' || msg.type === 'video') {
              messageText = msg.caption || `[Received ${msg.type.toUpperCase()}]`;
            } else if (msg.type === 'location') {
              messageText = `[Location Shared: ${msg.location?.name || ''} ${msg.location?.latitude},${msg.location?.longitude}]`;
            }

            // Resolve Broker Ownership strictly from contacted Phone Number ID / Number
            const brokerRes = await resolveBrokerByInboundIdentifier(phoneNumberId || OFFICIAL_BROKER_NUMBERS.SAFWAN.whatsappPhoneNumberId, org.id);
            const assignedBrokerId = brokerRes.brokerId;
            const inboundBrokerE164 = brokerRes.brokerPhoneE164 || OFFICIAL_BROKER_NUMBERS.SAFWAN.e164;

            // Normalize Customer Phone Number
            const customerPhoneResult = normalizeIndianPhone(senderWaId);
            const customerPhoneE164 = customerPhoneResult.isValid ? customerPhoneResult.e164 : `+${senderWaId}`;

            // Upsert or create lead via unified lead creation pipeline
            const { lead, created } = await upsertOrCreateLead(
              { organizationId: org.id },
              {
                channel: 'WHATSAPP',
                fullName: senderName,
                phone: customerPhoneE164,
                whatsappWaId: senderWaId,
                inboundNumber: inboundBrokerE164,
                assignedBrokerId,
                notes: `WhatsApp inbound: "${messageText}"`,
              }
            );

            // Log Communication Event
            await prisma.communicationLog.create({
              data: {
                leadId: lead.id,
                channel: 'WHATSAPP',
                direction: 'INBOUND',
                messageContent: messageText,
                metadataJson: JSON.stringify({
                  metaMessageId: messageId,
                  senderWaId,
                  contactedPhoneNumberId: phoneNumberId,
                  assignedBrokerName: brokerRes.brokerName,
                }),
              },
            });

            processedResults.push({
              messageId,
              leadId: lead.id,
              brokerAssigned: brokerRes.brokerName,
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Meta WhatsApp webhook batch processed successfully',
        processedCount: processedResults.length,
        results: processedResults,
      }, { status: 200 });
    }

    // Flattened Fallback for Direct Unit Testing / Simulator
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_INSECURE_WEBHOOKS !== '1') {
      return NextResponse.json(
        { error: 'Direct simulation payloads are disabled in production' },
        { status: 403 }
      );
    }

    const {
      fromPhone,
      senderName = 'Navi Mumbai Prospect',
      messageText = '',
      contactedBrokerNumber = OFFICIAL_BROKER_NUMBERS.SAFWAN.e164,
      messageId = `wa-test-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    } = payload;

    // Idempotency
    const existing = await prisma.webhookEventInbox.findUnique({
      where: { idempotencyKey: messageId },
    });
    if (existing) {
      return NextResponse.json({ success: true, message: 'Duplicate event ignored' });
    }

    await prisma.webhookEventInbox.create({
      data: {
        eventSource: 'WHATSAPP_CLOUD',
        idempotencyKey: messageId,
        providerEventId: messageId,
        payloadJson: JSON.stringify(payload),
        status: 'PROCESSED',
      },
    });

    const brokerRes = await resolveBrokerByInboundIdentifier(contactedBrokerNumber, org.id);
    const assignedBrokerId = brokerRes.brokerId;
    const inboundNumber = brokerRes.brokerPhoneE164 || contactedBrokerNumber;

    const phoneResult = normalizeIndianPhone(fromPhone || '9820000000');
    const { lead } = await upsertOrCreateLead(
      { organizationId: org.id },
      {
        channel: 'WHATSAPP',
        fullName: senderName,
        phone: phoneResult.e164,
        whatsappWaId: phoneResult.e164 ? phoneResult.e164.replace('+', '') : fromPhone,
        inboundNumber,
        assignedBrokerId,
        notes: `Inbound WhatsApp lead: "${messageText}"`,
      }
    );

    await prisma.communicationLog.create({
      data: {
        leadId: lead.id,
        channel: 'WHATSAPP',
        direction: 'INBOUND',
        messageContent: messageText,
        metadataJson: JSON.stringify({ brokerAssigned: brokerRes.brokerName }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Inbound WhatsApp lead processed successfully',
      data: {
        lead,
        brokerAssigned: brokerRes.brokerName,
      },
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Meta WhatsApp webhook processing failed');
  }
}
