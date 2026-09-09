import { NextResponse } from 'next/server';
import { requirePermission, requirePermissionWithScope, scopedLeadFilter, orgScope } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermissionWithScope(req, 'leads:view_all');
    if (!auth.ok) return auth.response;
    const { session, scope } = auth;
    const { id } = await params;

    const scopeWhere = await scopedLeadFilter(session, scope);
    const lead = await prisma.lead.findFirst({
      where: {
        id,
        ...scopeWhere,
      },
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
    const auth = await requirePermissionWithScope(req, 'leads:edit_all');
    if (!auth.ok) return auth.response;
    const { session, scope } = auth;
    const { id } = await params;
    const body = await req.json();
    const { currentStage, assignedBrokerId, notes, fullName, email } = body;

    const scopeWhere = await scopedLeadFilter(session, scope);
    const existing = await prisma.lead.findFirst({
      where: {
        id,
        ...scopeWhere,
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    // Changing broker assignment requires the leads:reassign capability
    if (assignedBrokerId !== undefined && assignedBrokerId !== existing.assignedBrokerId) {
      const reassignAuth = await requirePermission(req, 'leads:reassign');
      if (!reassignAuth.ok) return reassignAuth.response;
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        currentStage: currentStage || undefined,
        assignedBrokerId: assignedBrokerId !== undefined ? (assignedBrokerId || null) : undefined,
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

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePermission(req, 'leads:delete');
    if (!auth.ok) return auth.response;
    const { id } = await params;

    const existing = await prisma.lead.findFirst({
      where: {
        id,
        ...orgScope(auth.session),
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    await prisma.lead.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Lead deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

