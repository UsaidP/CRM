import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const campaign = await prisma.inboundCampaign.findUnique({
      where: { customSlug: slug },
    });

    if (!campaign) {
      // Fallback redirect to homepage if slug not found
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Increment click count
    await prisma.inboundCampaign.update({
      where: { id: campaign.id },
      data: {
        totalClicks: { increment: 1 },
      },
    });

    // Generate destination WhatsApp URL
    const brokerPhone = '919820123456';
    const textEncoded = encodeURIComponent(campaign.waPrefilledText);
    const destinationUrl = `https://wa.me/${brokerPhone}?text=${textEncoded}`;

    return NextResponse.redirect(destinationUrl, { status: 302 });
  } catch (error: any) {
    return NextResponse.redirect(new URL('/', req.url));
  }
}
