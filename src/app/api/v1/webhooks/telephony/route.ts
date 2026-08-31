import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { normalizeIndianPhone } from '@/lib/domain/phone-normalizer';
import { ensureLeadFallbackReminder } from '@/lib/services/lead-reminder-service';

export const dynamic = 'force-dynamic';

/**
 * Shared-secret verification for the telephony provider (e.g. Exotel).
 *
 * Configure TELEPHONY_WEBHOOK_SECRET in the provider dashboard and send it
 * as the `x-webhook-secret` header. Fails CLOSED in production when the
 * secret is not configured — an unauthenticated lead-creation endpoint is
 * not acceptable. Set TELEPHONY_WEBHOOK_ALLOW_INSECURE=true only for local
 * development.
 */
function verifyTelephonySecret(req: Request): boolean {
  const secret = process.env.TELEPHONY_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production' && !process.env.TELEPHONY_WEBHOOK_ALLOW_INSECURE) {
      return false;
    }
    return process.env.TELEPHONY_WEBHOOK_ALLOW_INSECURE === 'true' || process.env.NODE_ENV !== 'production';
  }
  const provided = req.headers.get('x-webhook-secret');
  if (!provided || provided.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) {
    diff |= secret.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(req: Request) {
  if (!verifyTelephonySecret(req)) {
    return NextResponse.json(
      { success: false, error: 'Invalid webhook credentials' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const {
      callerNumber,
      virtualNumber,
      callType = 'MISSED_CALL', // MISSED_CALL, INBOUND_ANSWERED
      callDuration = 0,
      recordingUrl,
      callId = `tel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    } = body;

    const phoneResult = normalizeIndianPhone(callerNumber);
    if (!phoneResult.isValid) {
      return NextResponse.json({ success: false, error: phoneResult.error }, { status: 400 });
    }

    // Record webhook event
    await prisma.webhookEventInbox.create({
      data: {
        eventSource: 'TELEPHONY_EXOTEL',
        idempotencyKey: callId,
        payloadJson: JSON.stringify(body),
        status: 'PROCESSED',
      },
    });

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 500 });
    }

    let lead = await prisma.lead.findFirst({
      where: { phoneE164: phoneResult.e164 },
    });

    if (lead) {
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          notes: `Inbound ${callType} from caller on virtual number ${virtualNumber || 'Main Line'}`,
        },
      });
    } else {
      lead = await prisma.lead.create({
        data: {
          organizationId: org.id,
          fullName: `Caller (${phoneResult.nationalFormat})`,
          phoneE164: phoneResult.e164,
          leadSource: 'direct_call',
          currentStage: 'new_uncontacted',
          notes: `Direct ${callType} via virtual number ${virtualNumber || 'Main Line'}`,
        },
      });
    }

    await prisma.communicationLog.create({
      data: {
        leadId: lead.id,
        channel: 'PHONE_CALL',
        direction: 'INBOUND',
        callDurationSeconds: Number(callDuration),
        callRecordingUrl: recordingUrl,
        messageContent: `Call logged: ${callType} (Virtual DID: ${virtualNumber || 'Main Line'})`,
        metadataJson: JSON.stringify(body),
      },
    });

    // Auto-seed callback reminder for inbound/missed call
    await ensureLeadFallbackReminder(lead.id, {
      organizationId: org.id,
      preferredTitle: `Return Missed Inbound Call (${phoneResult.nationalFormat})`,
      preferredType: 'CALL',
    });

    return NextResponse.json({
      success: true,
      message: 'Telephony call logged successfully',
      data: lead,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
