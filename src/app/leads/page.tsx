import { prisma } from '@/lib/db/prisma';
import { LeadsMatrixClient } from '@/components/leads/LeadsMatrixClient';
import { evaluate24HourMessagingWindow } from '@/lib/domain/contact-manager';
import { getServerSession } from '@/lib/services/server-auth';
import { runWithTenant } from '@/lib/db/tenant-context';
import { hasPermission, getPermissionScope } from '@/lib/domain/rbac-engine';
import { scopedLeadFilter } from '@/lib/services/api-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LeadsPage() {
  const session = await getServerSession();

  let initialLeads: any[] = [];
  let canDeleteLeads = false;
  let canReassignLeads = false;
  let assignableUsers: Array<{ id: string; fullName: string; role: string; email: string }> = [];

  try {
    const result = await runWithTenant(session.organizationId, async () => {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, role: true, customPermissionsJson: true, teamId: true },
      });

      const userScope = getPermissionScope(user, 'leads:view_all');
      const scopeWhere = await scopedLeadFilter({ ...session, teamId: user?.teamId }, userScope);

      const hasReassignPerm = hasPermission(user, 'leads:reassign');

      const [rawLeads, usersList] = await Promise.all([
        prisma.lead.findMany({
          relationLoadStrategy: 'join',
          where: scopeWhere,
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
            assignments: {
              where: { unassignedAt: null },
              orderBy: { assignedAt: 'desc' },
              include: {
                user: {
                  select: { id: true, fullName: true, role: true },
                },
              },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        hasReassignPerm
          ? prisma.user.findMany({
              where: { organizationId: session.organizationId, isActive: true },
              select: { id: true, fullName: true, role: true, email: true },
              orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
            })
          : Promise.resolve([]),
      ]);

      return { user, rawLeads, usersList, hasReassignPerm };
    });

    canDeleteLeads = hasPermission(result.user, 'leads:delete');
    canReassignLeads = result.hasReassignPerm;
    assignableUsers = result.usersList;

    initialLeads = result.rawLeads.map((l) => ({
      ...l,
      messagingWindow: evaluate24HourMessagingWindow(l.lastInboundMessageAt || l.createdAt),
    }));
  } catch (err) {
    console.error('Error fetching initial leads:', err);
  }

  return (
    <LeadsMatrixClient
      initialLeads={initialLeads}
      canDeleteLeads={canDeleteLeads}
      canReassignLeads={canReassignLeads}
      assignableUsers={assignableUsers}
      currentUserId={session.userId}
      currentUserRole={session.role}
    />
  );
}

