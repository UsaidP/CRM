import { prisma } from '@/lib/db/prisma';
import { DealsLedgerClient } from '@/components/deals/DealsLedgerClient';

export const dynamic = 'force-dynamic';

export default async function DealsPage() {
  let initialDeals: any[] = [];
  let initialLeads: any[] = [];
  let initialUnits: any[] = [];
  let summary = { totalGrossBrokerage: 0, totalCollected: 0, totalPending: 0 };

  try {
    const [deals, leads, units] = await Promise.all([
      prisma.dealTransaction.findMany({
        include: {
          lead: true,
          propertyUnit: { include: { project: true } },
          closingBroker: true,
          developerProject: true,
        },
        orderBy: { bookingDate: 'desc' },
      }),
      prisma.lead.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      prisma.propertyUnit.findMany({
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
