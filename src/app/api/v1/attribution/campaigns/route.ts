import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generateWhatsAppDeepLink } from '@/lib/domain/attribution-engine';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const channelType = searchParams.get('channelType');

    const where: any = {};
    if (channelType && channelType !== 'ALL') {
      where.channelType = channelType;
    }

    const campaigns = await prisma.inboundCampaign.findMany({
      where,
      include: {
        targetProject: {
          select: { id: true, projectName: true, microMarket: true },
        },
        targetPropertyUnit: {
          select: { id: true, unitNumber: true, bhk: true, allInTotalCost: true },
        },
        _count: {
          select: { leads: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, count: campaigns.length, data: campaigns });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      campaignName,
      channelType,
      contentId,
      targetProjectId,
      targetPropertyUnitId,
      customSlug,
      brokerPhone = '+919820123456',
    } = body;

    if (!campaignName || !channelType || !customSlug) {
      return NextResponse.json(
        { success: false, error: 'Campaign name, channel type, and custom slug are required' },
        { status: 400 }
      );
    }

    const slugClean = customSlug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-');

    // Retrieve organization
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: 'ZamZam Properties',
          slug: 'zamzam-properties',
        },
      });
    }

    // Generate prefilled text
    let projectName: string | undefined;
    if (targetProjectId) {
      const proj = await prisma.developerProject.findUnique({ where: { id: targetProjectId } });
      if (proj) projectName = proj.projectName;
    }

    const deepLinkData = generateWhatsAppDeepLink({
      brokerPhoneE164: brokerPhone,
      campaignSlug: slugClean,
      channelType: channelType as any,
      projectName,
      contentCode: contentId,
    });

    const campaign = await prisma.inboundCampaign.create({
      data: {
        organizationId: org.id,
        campaignName,
        channelType,
        contentId,
        targetProjectId,
        targetPropertyUnitId,
        customSlug: slugClean,
        waPrefilledText: deepLinkData.prefilledText,
      },
      include: {
        targetProject: true,
        targetPropertyUnit: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Campaign created successfully',
      data: {
        ...campaign,
        waDirectUrl: deepLinkData.waUrl,
        trackingUrl: `/api/v1/track/${campaign.customSlug}`,
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create campaign' },
      { status: 400 }
    );
  }
}
