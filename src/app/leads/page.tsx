import { prisma } from '@/lib/db/prisma';
import { LeadsMatrixClient } from '@/components/leads/LeadsMatrixClient';
import { evaluate24HourMessagingWindow } from '@/lib/domain/contact-manager';
import { getServerSession } from '@/lib/services/server-auth';
import { runWithTenant } from '@/lib/db/tenant-context';
import { hasPermission } from '@/lib/domain/rbac-engine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LeadsPage() {
  const session = await getServerSession();

  let initialLeads: any[] = [];
  let canDeleteLeads = false;
  try {
    const [user, rawLeads] = await runWithTenant(session.organizationId, async () => {
      return Promise.all([
        prisma.user.findUnique({
          where: { id: session.userId },
          select: { id: true, role: true, customPermissionsJson: true },
        }),
        prisma.lead.findMany({
          relationLoadStrategy: 'join',
          where: { organizationId: session.organizationId },
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
        }),
      ]);
    });

    canDeleteLeads = hasPermission(user, 'leads:delete');

    initialLeads = rawLeads.map((l) => ({
      ...l,
      messagingWindow: evaluate24HourMessagingWindow(l.lastInboundMessageAt || l.createdAt),
    }));
  } catch (err) {
    console.error('Error fetching initial leads:', err);
  }

  return <LeadsMatrixClient initialLeads={initialLeads} canDeleteLeads={canDeleteLeads} />;
}

