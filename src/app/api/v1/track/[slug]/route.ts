import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limiter';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const campaign = await prisma.inboundCampaign.findUnique({
      where: { customSlug: slug },
      include: {
        assignedBroker: {
          select: {
            phoneE164: true,
          },
        },
      },
    });

    if (!campaign) {
      // Fallback redirect to homepage if slug not found
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Rate-limit click increments to 10/min per IP to mitigate click fraud
    const clientIp = getClientIp(req);
    const rl = checkRateLimit(`track:${slug}:${clientIp}`, 10, 60_000);
    if (rl.allowed) {
      await prisma.inboundCampaign.update({
        where: { id: campaign.id },
        data: {
          totalClicks: { increment: 1 },
        },
      });
    }

    // Generate destination WhatsApp URL using assigned broker's phone
    const rawPhone = campaign.assignedBroker?.phoneE164?.replace(/\D/g, '') || '919820123456';
    const brokerPhone = rawPhone.startsWith('91') || rawPhone.length > 10 ? rawPhone : `91${rawPhone}`;
    const textEncoded = encodeURIComponent(campaign.waPrefilledText || '');
    const destinationUrl = `https://wa.me/${brokerPhone}?text=${textEncoded}`;

    return NextResponse.redirect(destinationUrl, { status: 302 });
  } catch {
    return NextResponse.redirect(new URL('/', req.url));
  }
}
