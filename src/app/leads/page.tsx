import { prisma } from '@/lib/db/prisma';
import { LeadsMatrixClient } from '@/components/leads/LeadsMatrixClient';
import { evaluate24HourMessagingWindow } from '@/lib/domain/contact-manager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LeadsPage() {
  let initialLeads: any[] = [];
  try {
    const rawLeads = await prisma.lead.findMany({
      include: {
        contact: {
          include: {
            identities: true,
          },
        },
        campaign: true,
        assignedBroker: true,
        requirements: true,
        communications: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        portals: {
          include: {
            telemetryLogs: true,
          },
        },
        reminders: {
          orderBy: { dueAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    initialLeads = rawLeads.map((l) => ({
      ...l,
      messagingWindow: evaluate24HourMessagingWindow(l.lastInboundMessageAt || l.createdAt),
    }));
  } catch (err) {
    console.error('Error fetching initial leads:', err);
  }

  return <LeadsMatrixClient initialLeads={initialLeads} />;
}
