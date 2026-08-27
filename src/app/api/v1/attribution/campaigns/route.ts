import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import { generateCampaignDeepLink } from '@/lib/domain/campaign-attribution';
import { OFFICIAL_BROKER_NUMBERS } from '@/lib/domain/broker-resolver';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const campaigns = await prisma.inboundCampaign.findMany({
      include: {
        targetProject: true,
        targetPropertyUnit: true,
        assignedBroker: true,
        leads: {
          select: {
            id: true,
            fullName: true,
            currentStage: true,
            sourceConfidence: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = campaigns.map((camp) => {
      const brokerPhone = camp.assignedBroker?.phoneE164 || OFFICIAL_BROKER_NUMBERS.SAFWAN.e164;
      const sourceCode = camp.sourceCode || camp.customSlug.toUpperCase();
      const deepLink = generateCampaignDeepLink({
        brokerPhoneE164: brokerPhone,
        sourceCode,
        projectName: camp.targetProject?.projectName,
      });

      return {
        ...camp,
        brokerPhone,
        sourceCode,
        deepLinkUrl: deepLink.waUrl,
        svgQrCode: deepLink.svgQrCode,
        prefilledText: deepLink.prefilledText,
      };
    });

    return NextResponse.json({
      success: true,
      data: enriched,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const body = await req.json();
    const {
      campaignName,
      channelType = 'YOUTUBE_SHORT',
      contentId,
      sourceCode,
      targetProjectId,
      targetPropertyUnitId,
      assignedBrokerId,
      customSlug,
      waPrefilledText,
    } = body;

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 500 });
    }

    const cleanCode = (sourceCode || customSlug || `CAMPAIGN-${Date.now()}`).toUpperCase();
    const slug = (customSlug || sourceCode || `camp-${Date.now()}`).toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const campaign = await prisma.inboundCampaign.create({
      data: {
        organizationId: org.id,
        campaignName,
        channelType,
        contentId,
        sourceCode: cleanCode,
        targetProjectId,
        targetPropertyUnitId,
        assignedBrokerId,
        customSlug: slug,
        waPrefilledText: waPrefilledText || `Inquiry for ${cleanCode}`,
        isActive: true,
      },
      include: {
        targetProject: true,
        assignedBroker: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: campaign,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
