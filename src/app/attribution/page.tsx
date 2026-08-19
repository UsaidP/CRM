import { prisma } from '@/lib/db/prisma';
import { CampaignAttributionManager } from '@/components/attribution/CampaignAttributionManager';
import { generateCampaignDeepLink } from '@/lib/domain/campaign-attribution';
import { OFFICIAL_BROKER_NUMBERS } from '@/lib/domain/broker-resolver';

export const dynamic = 'force-dynamic';

export default async function AttributionPage() {
  let initialCampaigns: any[] = [];
  try {
    const raw = await prisma.inboundCampaign.findMany({
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

    initialCampaigns = raw.map((camp) => {
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
  } catch (err) {
    console.error('Error prefetching campaigns in SSR:', err);
  }

  return <CampaignAttributionManager initialCampaigns={initialCampaigns} />;
}
