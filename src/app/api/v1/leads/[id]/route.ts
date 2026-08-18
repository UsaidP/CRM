import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        campaign: true,
        assignedBroker: true,
        requirements: true,
        communications: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: lead });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { currentStage, assignedBrokerId, notes, fullName, email } = body;

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        currentStage: currentStage || undefined,
        assignedBrokerId: assignedBrokerId || undefined,
        notes: notes || undefined,
        fullName: fullName || undefined,
        email: email || undefined,
      },
      include: {
        campaign: true,
        assignedBroker: true,
        requirements: true,
      },
    });

    return NextResponse.json({ success: true, message: 'Lead updated successfully', data: lead });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
