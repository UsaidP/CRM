import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { computeCashFlowForecast } from '@/lib/domain/analytics-engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const deals = await prisma.dealTransaction.findMany({
      include: {
        developerProject: true,
        closingBroker: true,
      },
      orderBy: { bookingDate: 'desc' },
    });

    const forecast = computeCashFlowForecast(deals);

    return NextResponse.json({
      success: true,
      data: forecast,
      dealsBreakdown: deals.map((d) => ({
        id: d.id,
        projectName: d.developerProject?.projectName || 'Direct / Unassigned',
        brokerName: d.closingBroker?.fullName || 'Unassigned',
        agreementValue: d.agreementValue,
        grossBrokerage: d.grossBrokerageAmount,
        firmNet: d.firmNetBrokerageAmount,
        repCommission: d.repCommissionAmount,
        status: d.dealStatus,
        bookingDate: d.bookingDate,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
