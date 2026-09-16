import { prisma } from '@/lib/db/prisma';
import { DealsLedgerClient } from '@/components/deals/DealsLedgerClient';
import { getServerSession } from '@/lib/services/server-auth';
import {
  getUserDealWhere,
  getUserLeadWhere,
  type UserScopeView,
} from '@/lib/services/user-scope';

export const dynamic = 'force-dynamic';

export default async function DealsPage(props: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession();
  const isAdmin = session.role === 'ADMIN' || session.role === 'SUPER_ADMIN' || session.isSuperAdmin;
  const viewMode: UserScopeView = isAdmin && searchParams?.view === 'firm' ? 'firm' : 'mine';

  let initialDeals: any[] = [];
  let initialLeads: any[] = [];
  let initialUnits: any[] = [];
  let summary = { totalGrossBrokerage: 0, totalCollected: 0, totalPending: 0 };

  const dealWhere = getUserDealWhere(session, viewMode);
  const leadWhere = getUserLeadWhere(session, viewMode);

  try {
    const [deals, leads, units] = await Promise.all([
      prisma.dealTransaction.findMany({
        where: dealWhere,
        include: {
          lead: true,
          propertyUnit: { include: { project: true } },
          closingBroker: true,
          developerProject: true,
        },
        orderBy: { bookingDate: 'desc' },
      }),
      prisma.lead.findMany({
        where: leadWhere,
        orderBy: { createdAt: 'desc' },
      }),
      // Property units remain shared firm-wide for all brokers
      prisma.propertyUnit.findMany({
        where: { project: { organizationId: session.organizationId } },
        include: { project: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    initialDeals = deals;
    initialLeads = leads;
    initialUnits = units;

    const totalGrossBrokerage = deals.reduce((acc, d) => acc + (d.grossBrokerageAmount || 0), 0);
    const totalCollected = deals
      .filter((d) => d.dealStatus === 'PAYMENT_RECEIVED')
      .reduce((acc, d) => acc + (d.firmNetBrokerageAmount || 0), 0);
    const totalPending = deals
      .filter((d) => d.dealStatus !== 'PAYMENT_RECEIVED' && d.dealStatus !== 'CANCELLED')
      .reduce((acc, d) => acc + (d.grossBrokerageAmount || 0), 0);

    summary = {
      totalGrossBrokerage,
      totalCollected,
      totalPending,
    };
  } catch (err) {
    console.error('Error loading initial deals:', err);
  }

  return (
    <DealsLedgerClient
      initialDeals={initialDeals}
      initialLeads={initialLeads}
      initialUnits={initialUnits}
      initialSummary={summary}
    />
  );
}
