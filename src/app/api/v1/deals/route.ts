import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { calculateDealCommission } from '@/lib/domain/commission-calculator';
import { createDealSchema } from '@/lib/validators/deal-schemas';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.dealStatus = status;
    }

    const [total, deals] = await Promise.all([
      prisma.dealTransaction.count({ where }),
      prisma.dealTransaction.findMany({
        where,
        skip,
        take: limit,
        include: {
          lead: {
            select: {
              id: true,
              fullName: true,
              phoneE164: true,
            },
          },
          propertyUnit: {
            select: {
              id: true,
              unitNumber: true,
              bhk: true,
              carpetAreaSqft: true,
              allInTotalCost: true,
            },
          },
          developerProject: {
            select: {
              id: true,
              projectName: true,
              developerName: true,
              microMarket: true,
            },
          },
          closingBroker: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { bookingDate: 'desc' },
      }),
    ]);

    const allDeals = await prisma.dealTransaction.findMany({
      select: { grossBrokerageAmount: true, dealStatus: true },
    });

    const totalGrossBrokerage = allDeals.reduce((acc, d) => acc + (d.grossBrokerageAmount || 0), 0);
    const totalCollected = allDeals
      .filter((d) => d.dealStatus === 'PAYMENT_RECEIVED')
      .reduce((acc, d) => acc + (d.grossBrokerageAmount || 0), 0);
    const totalPending = totalGrossBrokerage - totalCollected;

    return NextResponse.json({
      success: true,
      count: deals.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalGrossBrokerage,
        totalCollected,
        totalPending,
      },
      data: deals,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createDealSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: parsed.error.format() },
        { status: 422 }
      );
    }

    const {
      leadId,
      propertyUnitId,
      brokeragePercent = 2.5,
      repSplitPercent = 50,
      coBrokerName,
      coBrokerSharePercent = 0,
      notes = 'Booked via physical site visit tour',
      closingBrokerId,
      dealStatus = 'TOKEN_RECEIVED',
      developerInvoiceNumber,
    } = parsed.data;

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const unit = await prisma.propertyUnit.findUnique({
      where: { id: propertyUnitId },
      include: { project: true },
    });
    if (!unit) {
      return NextResponse.json({ success: false, error: 'Property unit not found' }, { status: 404 });
    }

    const agreementVal = parsed.data.agreementValue || unit.agreementValue;

    const commission = calculateDealCommission({
      agreementValue: agreementVal,
      brokeragePercent: Number(brokeragePercent),
      repSplitPercent: Number(repSplitPercent),
      coBrokerSharePercent: Number(coBrokerSharePercent),
    });

    const deal = await prisma.$transaction(async (tx) => {
      const d = await tx.dealTransaction.create({
        data: {
          organizationId: lead.organizationId,
          leadId: lead.id,
          propertyUnitId: unit.id,
          developerProjectId: unit.projectId,
          closingBrokerId: closingBrokerId || lead.assignedBrokerId || null,
          agreementValue: commission.agreementValue,
          brokeragePercent: commission.brokeragePercent,
          grossBrokerageAmount: commission.grossBrokerageAmount,
          repCommissionAmount: commission.repCommissionAmount,
          firmNetBrokerageAmount: commission.firmNetBrokerageAmount,
          coBrokerName: coBrokerName || null,
          coBrokerSharePercent: Number(coBrokerSharePercent),
          dealStatus,
          developerInvoiceNumber: developerInvoiceNumber || null,
          notes,
        },
      });

      // Update lead stage to closed_won
      await tx.lead.update({
        where: { id: lead.id },
        data: { currentStage: 'closed_won' },
      });

      // Log communication record
      await tx.communicationLog.create({
        data: {
          leadId: lead.id,
          channel: 'PHONE_CALL',
          direction: 'INBOUND',
          messageContent: `🎉 DEAL RECORDED: ${unit.bhk} BHK at ${unit.project.projectName} (Agreement: ₹${(agreementVal / 100000).toFixed(2)}L • Gross Brokerage: ₹${(commission.grossBrokerageAmount / 1000).toFixed(1)}k).`,
        },
      });

      return d;
    });

    return NextResponse.json({
      success: true,
      message: 'Deal recorded and commission ledger calculated successfully',
      data: deal,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
