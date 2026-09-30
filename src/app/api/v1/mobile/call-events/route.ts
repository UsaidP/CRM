import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { normalizeIndianPhone } from '@/lib/domain/phone-normalizer';
import { resolveBrokerByInboundIdentifier, OFFICIAL_BROKER_NUMBERS } from '@/lib/domain/broker-resolver';
import { analyzeInboundAttribution } from '@/lib/domain/campaign-attribution';
import { findOrCreateContact } from '@/lib/domain/contact-manager';
import { upsertOrCreateLead } from '@/lib/domain/lead-creation';
import { requireSession } from '@/lib/services/api-auth';
import { handleApiError } from '@/lib/services/api-handler';

import { analyzeCallWithAI } from '@/lib/services/call-ai-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

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
      callRecordingUrl,
      callOutcome,
      clientCallId,
      callId = clientCallId || `call-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    } = body;

    // Idempotency Check on both webhook inbox and CommunicationLog clientCallId
    const existingLog = await prisma.communicationLog.findFirst({
      where: {
        OR: [
          { clientCallId: callId },
          ...(clientCallId ? [{ clientCallId }] : []),
        ],
      },
    });
    if (existingLog) {
      return NextResponse.json({
        success: true,
        message: 'Duplicate call event ignored (already logged)',
        data: { communicationLog: existingLog },
      });
    }

    const existingInbox = await prisma.webhookEventInbox.findUnique({
      where: { idempotencyKey: callId },
    });
    if (existingInbox) {
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

    const org = await prisma.organization.findUnique({
      where: { id: auth.session.organizationId },
      select: { id: true },
    });
    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    // 1. Resolve Broker Ownership:
    // If logged in as TELECALLER or AGENT, assign the logged call to themselves!
    let assignedBrokerId: string | undefined = undefined;
    let inboundNumber = contactedBrokerNumber;
    let assignedBrokerName = 'Assigned Agent';

    if (auth.session.role === 'TELECALLER' || auth.session.role === 'AGENT') {
      assignedBrokerId = auth.session.userId;
      inboundNumber = auth.session.email || contactedBrokerNumber;
      assignedBrokerName = auth.session.email || 'Telecaller';
    } else {
      const brokerRes = await resolveBrokerByInboundIdentifier(contactedBrokerNumber, org.id);
      assignedBrokerId = brokerRes.brokerId;
      inboundNumber = brokerRes.brokerPhoneE164 || contactedBrokerNumber;
      assignedBrokerName = brokerRes.brokerName || 'Assigned Broker';
    }

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

    // 4. Upsert or create lead via unified domain pipeline
    const callSummary = direction === 'MISSED'
      ? `Missed call on ${new Date(startTime).toLocaleTimeString()}`
      : `Phone call (${durationSeconds}s) with ${assignedBrokerName}`;

    const { lead, contactId } = await upsertOrCreateLead(
      { organizationId: org.id, userId: auth.session.userId },
      {
        channel: 'MOBILE_CALL',
        fullName: callerName || 'Navi Mumbai Phone Prospect',
        phone: phoneResult.e164,
        leadSource,
        sourceConfidence,
        sourceCode: sourceCode?.toUpperCase(),
        inboundNumber,
        campaignId: matchedCampaign?.id,
        assignedBrokerId,
        currentStage: direction === 'MISSED' ? 'new_uncontacted' : 'discovery_call',
        firstResponseSlaMinutes: direction === 'MISSED' ? 0 : 1,
        firstResponseAt: direction !== 'MISSED' ? new Date() : null,
        notes: notes || callSummary,
      }
    );

    // 5. Intelligent Call Analysis via Gemini Flash
    let aiSummary: string | undefined = undefined;
    let aiSentiment: string | undefined = undefined;
    let transcriptText: string | undefined = undefined;
    let finalOutcome = callOutcome || (direction === 'MISSED' ? 'NO_ANSWER' : undefined);

    try {
      const aiAnalysis = await analyzeCallWithAI({
        audioUrl: callRecordingUrl,
        callerNumber: phoneResult.e164,
        leadName: callerName || lead.fullName || 'Lead',
        durationSeconds,
        notes,
      });

      if (aiAnalysis) {
        aiSummary = aiAnalysis.summary;
        aiSentiment = aiAnalysis.sentiment;
        transcriptText = aiAnalysis.transcript;
        if (!finalOutcome || finalOutcome === 'CONNECTED_INTERESTED') {
          finalOutcome = aiAnalysis.callOutcome;
        }
      }
    } catch (aiErr: any) {
      console.warn('[Call Events] Gemini AI call analysis notice:', aiErr?.message || aiErr);
    }

    // 6. Log Communication with rich Call Intelligence
    const commLog = await prisma.communicationLog.create({
      data: {
        leadId: lead.id,
        channel: 'PHONE_CALL',
        direction: direction === 'OUTGOING' ? 'OUTBOUND' : 'INBOUND',
        callDurationSeconds: durationSeconds,
        callRecordingUrl: callRecordingUrl || null,
        clientCallId: callId,
        callOutcome: finalOutcome || 'INTERESTED',
        aiSummary,
        aiSentiment,
        transcriptText,
        processingStatus: 'COMPLETED',
        messageContent: notes || aiSummary || `${direction} Call to ${inboundNumber} (${assignedBrokerName})`,
        metadataJson: JSON.stringify({
          callId,
          direction,
          startTime,
          contactedBrokerNumber: inboundNumber,
          brokerAssigned: assignedBrokerName,
          sourceCode,
          callOutcome: finalOutcome,
          callRecordingUrl,
          aiSentiment,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Call event captured, attributed, and analyzed successfully',
      data: {
        lead,
        contactId,
        brokerAssigned: assignedBrokerName,
        sourceConfidence,
        communicationLog: commLog,
        aiSummary,
        aiSentiment,
        callOutcome: finalOutcome,
      },
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Call event logging failed');
  }
}
