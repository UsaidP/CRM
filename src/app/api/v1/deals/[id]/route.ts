import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      dealStatus, // TOKEN_RECEIVED, AGREEMENT_REGISTERED, INVOICE_SENT, PAYMENT_RECEIVED, CANCELLED
      developerInvoiceNumber,
      paymentReceivedDate,
      notes,
    } = body;

    const deal = await prisma.dealTransaction.findUnique({ where: { id } });
    if (!deal) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }

    const updated = await prisma.dealTransaction.update({
      where: { id },
      data: {
        dealStatus: dealStatus || undefined,
        developerInvoiceNumber: developerInvoiceNumber !== undefined ? developerInvoiceNumber : undefined,
        paymentReceivedDate: paymentReceivedDate ? new Date(paymentReceivedDate) : (dealStatus === 'PAYMENT_RECEIVED' ? new Date() : undefined),
        notes: notes !== undefined ? notes : undefined,
      },
      include: {
        lead: true,
        propertyUnit: { include: { project: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Deal transaction updated successfully',
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
