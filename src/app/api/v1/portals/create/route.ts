import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generatePortalToken, buildWhatsAppPortalShareText } from '@/lib/domain/portal-generator';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      leadId,
      selectedUnitIds = [],
      customMessage = 'Here are property options selected from current broker records for your requirements.',
      createdById,
    } = body;

    if (!leadId) {
      return NextResponse.json({ success: false, error: 'leadId is required' }, { status: 400 });
    }

    if (!selectedUnitIds || selectedUnitIds.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one selected unit is required' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        requirements: { where: { isActive: true }, take: 1 },
      },
    });

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const units = await prisma.propertyUnit.findMany({
      where: { id: { in: selectedUnitIds } },
      include: { project: true },
    });

    if (units.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid property units found' }, { status: 404 });
    }

    // Determine bhk summary (e.g. "2bhk-options")
    const bhks = Array.from(new Set(units.map((u) => `${u.bhk}bhk`))).join('-');
    const token = generatePortalToken(lead.fullName || 'client', bhks || 'options');

    // Create ClientPortal and ClientPortalUnits in a transaction
    const portal = await prisma.$transaction(async (tx) => {
      const p = await tx.clientPortal.create({
        data: {
          organizationId: lead.organizationId,
          leadId: lead.id,
          token,
          title: `Curated Property Options for ${lead.fullName || 'Client'}`,
          customMessage,
          createdById: createdById || lead.assignedBrokerId || null,
          portalUnits: {
            create: units.map((u, idx) => ({
              propertyUnitId: u.id,
              displayOrder: idx + 1,
              brokerHighlight: u.isHotDeal ? '🔥 Exclusive ZamZam Direct Pricing' : null,
              isFeatured: idx === 0,
            })),
          },
        },
        include: {
          portalUnits: {
            include: {
              propertyUnit: {
                include: { project: true },
              },
            },
          },
        },
      });

      // Update lead current stage to 'portal_shared'
      await tx.lead.update({
        where: { id: lead.id },
        data: { currentStage: 'portal_shared' },
      });

      // Log communication record
      await tx.communicationLog.create({
        data: {
          leadId: lead.id,
          channel: 'WHATSAPP',
          direction: 'OUTBOUND',
          messageContent: `Generated tokenized Client Portal (${p.token}) with ${units.length} verified units.`,
        },
      });

      return p;
    });

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const shareableUrl = `${protocol}://${host}/p/${portal.token}`;

    const microMarkets = Array.from(new Set(units.map((u) => u.project.microMarket)));
    const waShareText = buildWhatsAppPortalShareText({
      leadName: lead.fullName || 'Client',
      portalUrl: shareableUrl,
      propertyCount: units.length,
      microMarkets,
    });

    return NextResponse.json({
      success: true,
      message: 'Private Client Portal generated successfully',
      data: {
        portal,
        token: portal.token,
        shareableUrl,
        waShareText,
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
