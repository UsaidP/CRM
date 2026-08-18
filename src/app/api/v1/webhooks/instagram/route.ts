import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { normalizeIndianPhone } from '@/lib/domain/phone-normalizer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      igUsername,
      customerPhone,
      customerName,
      reelCode = 'REEL-KHARGHAR-2BHK',
      commentOrDmText = 'PRICE',
      eventId = `ig-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    } = body;

    // Idempotency check
    const existing = await prisma.webhookEventInbox.findUnique({
      where: { idempotencyKey: eventId },
    });
    if (existing) {
      return NextResponse.json({ success: true, message: 'Duplicate Instagram event ignored' });
    }

    await prisma.webhookEventInbox.create({
      data: {
        eventSource: 'INSTAGRAM_GRAPH',
        idempotencyKey: eventId,
        payloadJson: JSON.stringify(body),
        status: 'PROCESSED',
      },
    });

    const phoneResult = normalizeIndianPhone(customerPhone || '+919820000000');
    const org = await prisma.organization.findFirst();

    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 500 });
    }

    let lead = await prisma.lead.findUnique({
      where: { phoneE164: phoneResult.e164 },
    });

    if (lead) {
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          fullName: lead.fullName || customerName || igUsername,
          notes: `Instagram Reel inquiry on ${reelCode}: "${commentOrDmText}"`,
        },
      });
    } else {
      lead = await prisma.lead.create({
        data: {
          organizationId: org.id,
          fullName: customerName || (igUsername ? `@${igUsername}` : 'Instagram Prospect'),
          phoneE164: phoneResult.e164,
          leadSource: 'instagram_reel',
          campaignId: reelCode,
          currentStage: 'new_uncontacted',
          notes: `Lead generated via Instagram Reel (${reelCode}): "${commentOrDmText}"`,
        },
      });
    }

    await prisma.communicationLog.create({
      data: {
        leadId: lead.id,
        channel: 'INSTAGRAM_DM',
        direction: 'INBOUND',
        messageContent: `User commented/DMed: "${commentOrDmText}" on Reel ${reelCode}`,
        metadataJson: JSON.stringify({ igUsername, reelCode }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Instagram lead ingested successfully',
      data: lead,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
