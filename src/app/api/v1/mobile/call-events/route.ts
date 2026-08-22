import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { normalizeIndianPhone } from '@/lib/domain/phone-normalizer';
import { resolveBrokerByInboundIdentifier, OFFICIAL_BROKER_NUMBERS } from '@/lib/domain/broker-resolver';
import { analyzeInboundAttribution } from '@/lib/domain/campaign-attribution';
import { findOrCreateContact } from '@/lib/domain/contact-manager';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      callerNumber,
      callerName,
      contactedBrokerNumber = OFFICIAL_BROKER_NUMBERS.SAFWAN.e164,
      direction = 'INCOMING', // INCOMING, OUTGOING, MISSED, REJECTED
      startTime = new Date().toISOString(),
      durationSeconds = 0,
      sourceCode,
      notes = '',
      callId = `call-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    } = body;

    // Idempotency Check
    const existing = await prisma.webhookEventInbox.findUnique({
      where: { idempotencyKey: callId },
    });
    if (existing) {
      return NextResponse.json({ success: true, message: 'Duplicate call event ignored' });
    }

    await prisma.webhookEventInbox.create({
      data: {
        eventSource: 'ANDROID_COMPANION',
        idempotencyKey: callId,
        providerEventId: callId,
        payloadJson: JSON.stringify(body),
        status: 'PROCESSED',
      },
    });

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 500 });
    }

    // 1. Resolve Broker Ownership strictly from contacted line
    const brokerRes = await resolveBrokerByInboundIdentifier(contactedBrokerNumber, org.id);
    const assignedBrokerId = brokerRes.brokerId;
    const inboundNumber = brokerRes.brokerPhoneE164 || contactedBrokerNumber;

    // 2. Normalize Caller Phone Number
    const phoneResult = normalizeIndianPhone(callerNumber);
    if (!phoneResult.isValid) {
      return NextResponse.json(
        { success: false, error: `Invalid caller phone number: ${phoneResult.error}` },
        { status: 400 }
      );
    }

    // 3. Attribution Analysis
    let sourceConfidence: 'EXACT' | 'INFERRED' | 'UNKNOWN' = 'UNKNOWN';
    let leadSource: string = 'PHONE_ORGANIC_UNKNOWN';
    let matchedCampaign = null;

    if (sourceCode) {
      const cleanCode = sourceCode.trim().toUpperCase();
      matchedCampaign = await prisma.inboundCampaign.findFirst({
        where: {
          OR: [
            { sourceCode: cleanCode },
            { customSlug: cleanCode.toLowerCase() },
          ],
        },
      });

      sourceConfidence = 'EXACT';
      leadSource = matchedCampaign?.channelType === 'YOUTUBE_SHORT' || matchedCampaign?.channelType === 'YOUTUBE_VIDEO'
        ? 'YOUTUBE_EXACT'
        : 'WHATSAPP_EXACT';
    }

    // 4. Find or Create Durable Contact & Identities
    const contact = await findOrCreateContact({
      organizationId: org.id,
      fullName: callerName || 'Navi Mumbai Phone Prospect',
      phoneE164: phoneResult.e164,
      assignedBrokerId,
      notes: notes ? `Call note: ${notes}` : `Call recorded via ${inboundNumber}`,
    });

    // 5. Upsert Lead
    let lead = await prisma.lead.findFirst({
      where: { contactId: contact?.id },
    });

    const callSummary = direction === 'MISSED'
      ? `Missed call on ${new Date(startTime).toLocaleTimeString()}`
      : `Phone call (${durationSeconds}s) with ${brokerRes.brokerName}`;

    if (lead) {
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          fullName: lead.fullName || callerName,
          inboundNumber,
          sourceConfidence: sourceCode ? 'EXACT' : lead.sourceConfidence,
          sourceCode: sourceCode?.toUpperCase() || lead.sourceCode,
          campaignId: matchedCampaign?.id || lead.campaignId,
          assignedBrokerId: assignedBrokerId || lead.assignedBrokerId,
          notes: notes ? `${lead.notes || ''}\n${notes}` : lead.notes,
          lastInboundMessageAt: new Date(),
        },
      });
    } else {
      lead = await prisma.lead.create({
        data: {
          organizationId: org.id,
          contactId: contact?.id,
          fullName: callerName || 'Navi Mumbai Phone Prospect',
          phoneE164: phoneResult.e164,
          leadSource,
          sourceConfidence,
          sourceCode: sourceCode?.toUpperCase(),
          inboundNumber,
          campaignId: matchedCampaign?.id,
          assignedBrokerId,
          currentStage: direction === 'MISSED' ? 'new_uncontacted' : 'discovery_call',
          firstResponseSlaMinutes: direction === 'MISSED' ? 0 : 1,
          firstResponseAt: direction !== 'MISSED' ? new Date() : null,
          lastInboundMessageAt: new Date(),
          notes: notes || callSummary,
        },
      });

      if (matchedCampaign) {
        await prisma.inboundCampaign.update({
          where: { id: matchedCampaign.id },
          data: { totalLeadsGenerated: { increment: 1 } },
        });
      }
    }

    // 6. Log Communication
    await prisma.communicationLog.create({
      data: {
        leadId: lead.id,
        channel: 'PHONE_CALL',
        direction: direction === 'OUTGOING' ? 'OUTBOUND' : 'INBOUND',
        callDurationSeconds: durationSeconds,
        messageContent: `${direction} Call to ${inboundNumber} (${brokerRes.brokerName}). ${notes}`,
        metadataJson: JSON.stringify({
          callId,
          direction,
          startTime,
          contactedBrokerNumber: inboundNumber,
          brokerAssigned: brokerRes.brokerName,
          sourceCode,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Call event captured and attributed successfully',
      data: {
        lead,
        contact,
        brokerAssigned: brokerRes.brokerName,
        sourceConfidence,
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Call event logging failed' },
      { status: 500 }
    );
  }
}
