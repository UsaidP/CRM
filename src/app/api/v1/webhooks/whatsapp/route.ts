import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { normalizeIndianPhone } from '@/lib/domain/phone-normalizer';
import { parseInboundMessageText, generateSpeedToLeadResponse } from '@/lib/domain/attribution-engine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      fromPhone,
      senderName,
      messageText,
      messageId = `wa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    } = body;

    // Idempotency check
    const existingEvent = await prisma.webhookEventInbox.findUnique({
      where: { idempotencyKey: messageId },
    });
    if (existingEvent) {
      return NextResponse.json({ success: true, message: 'Duplicate webhook payload ignored' });
    }

    // Record raw event in Webhook Inbox
    await prisma.webhookEventInbox.create({
      data: {
        eventSource: 'WHATSAPP_CLOUD',
        idempotencyKey: messageId,
        payloadJson: JSON.stringify(body),
        status: 'PROCESSED',
      },
    });

    // Normalize Phone Number to E.164 (+91)
    const phoneResult = normalizeIndianPhone(fromPhone);
    if (!phoneResult.isValid) {
      return NextResponse.json(
        { success: false, error: phoneResult.error },
        { status: 400 }
      );
    }

    // Parse Message for Organic Attribution & References
    const attribution = parseInboundMessageText(messageText);

    // Retrieve default organization
    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not initialized' }, { status: 500 });
    }

    // Match Campaign if ref code exists
    let matchedCampaign = null;
    if (attribution.detectedRefCode) {
      matchedCampaign = await prisma.inboundCampaign.findFirst({
        where: {
          OR: [
            { customSlug: { contains: attribution.detectedRefCode.toLowerCase() } },
            { contentId: { contains: attribution.detectedRefCode } },
          ],
        },
      });
    }

    // Find or Create Lead (Deduplication on E.164 Phone)
    let lead = await prisma.lead.findUnique({
      where: { phoneE164: phoneResult.e164 },
    });

    if (lead) {
      // Existing lead returning: update stage if new inquiry, log communication
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          fullName: lead.fullName || senderName,
          leadSource: attribution.detectedChannel,
          campaignId: matchedCampaign?.id || lead.campaignId,
          notes: `New inquiry received on ${new Date().toLocaleDateString()}: "${messageText}"`,
        },
      });
    } else {
      // Create new Lead
      lead = await prisma.lead.create({
        data: {
          organizationId: org.id,
          fullName: senderName || 'Navi Mumbai Buyer',
          phoneE164: phoneResult.e164,
          leadSource: attribution.detectedChannel,
          campaignId: matchedCampaign?.id,
          currentStage: 'new_uncontacted',
          notes: `Captured via WhatsApp: "${messageText}"`,
        },
      });

      // If matched campaign, increment lead count
      if (matchedCampaign) {
        await prisma.inboundCampaign.update({
          where: { id: matchedCampaign.id },
          data: { totalLeadsGenerated: { increment: 1 } },
        });
      }
    }

    // Create Inbound Communication Log
    await prisma.communicationLog.create({
      data: {
        leadId: lead.id,
        channel: 'WHATSAPP',
        direction: 'INBOUND',
        messageContent: messageText,
        metadataJson: JSON.stringify({
          attribution,
          matchedCampaignId: matchedCampaign?.id,
        }),
      },
    });

    // Auto-generate Speed-to-Lead Acknowledgment response
    const speedToLeadText = generateSpeedToLeadResponse(
      lead.fullName,
      attribution.detectedProjectKeyword,
      'Kharghar / Taloja'
    );

    return NextResponse.json({
      success: true,
      message: 'Inbound WhatsApp lead captured and attributed successfully',
      data: {
        lead,
        attribution,
        speedToLeadResponse: speedToLeadText,
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
