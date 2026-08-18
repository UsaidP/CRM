import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { evaluateEngagementTier } from '@/lib/domain/portal-generator';

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = await req.json();
    const {
      unitId,
      actionType, // PORTAL_OPEN, UNIT_EXPAND, PHOTO_SWIPE, VIDEO_PLAY, BROCHURE_DOWNLOAD, MAP_OPEN, WHATSAPP_CLICK, CALL_CLICK, VISIT_BOOKING_CLICK
      dwellTimeSec = 0,
      metadata = {},
    } = body;

    const portal = await prisma.clientPortal.findUnique({
      where: { token },
      include: { lead: true },
    });

    if (!portal) {
      return NextResponse.json({ success: false, error: 'Portal not found' }, { status: 404 });
    }

    const telemetryLog = await prisma.portalTelemetryLog.create({
      data: {
        portalId: portal.id,
        unitId: unitId || null,
        actionType: actionType || 'PORTAL_OPEN',
        dwellTimeSec: Number(dwellTimeSec),
        metadataJson: JSON.stringify(metadata),
      },
    });

    // If hot action like visit booking click or whatsapp inquiry, log communication record
    if (['VISIT_BOOKING_CLICK', 'WHATSAPP_CLICK', 'CALL_CLICK'].includes(actionType)) {
      await prisma.communicationLog.create({
        data: {
          leadId: portal.leadId,
          channel: 'WHATSAPP',
          direction: 'INBOUND',
          messageContent: `Client interaction on Portal (${token}): ${actionType} on Unit ${unitId || 'Overview'}.`,
        },
      });
    }

    return NextResponse.json({ success: true, loggedId: telemetryLog.id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const portal = await prisma.clientPortal.findUnique({
      where: { token },
      include: {
        telemetryLogs: {
          orderBy: { createdAt: 'desc' },
        },
        lead: {
          select: { fullName: true, phoneE164: true },
        },
      },
    });

    if (!portal) {
      return NextResponse.json({ success: false, error: 'Portal not found' }, { status: 404 });
    }

    const engagement = evaluateEngagementTier(portal.telemetryLogs);

    return NextResponse.json({
      success: true,
      data: {
        portalToken: portal.token,
        lead: portal.lead,
        totalViews: portal.totalViews,
        lastViewedAt: portal.lastViewedAt,
        engagement,
        recentLogs: portal.telemetryLogs.slice(0, 10),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
