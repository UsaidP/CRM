import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requirePermissionWithScope, orgScope } from '@/lib/services/api-auth';
import { assignLead, getAssignmentHistory, type AssignmentType } from '@/lib/services/lead-assignment-service';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermissionWithScope(req, 'leads:view_all');
    if (!auth.ok) return auth.response;
    const { session } = auth;

    const { id: leadId } = await params;

    // Verify lead belongs to caller's organization
    const lead = await prisma.lead.findFirst({
      where: orgScope(session, { id: leadId }),
      select: { id: true, assignedBrokerId: true },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found in your organization' },
        { status: 404 }
      );
    }

    const history = await getAssignmentHistory(leadId);

    return NextResponse.json({
      success: true,
      leadId,
      currentAssignedBrokerId: lead.assignedBrokerId,
      history,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch assignment history' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermissionWithScope(req, 'leads:reassign');
    if (!auth.ok) return auth.response;
    const { session } = auth;

    const { id: leadId } = await params;
    const body = await req.json();
    const { userId, assignmentType, notes } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Target user ID is required' },
        { status: 400 }
      );
    }

    // Verify target lead is in organization
    const lead = await prisma.lead.findFirst({
      where: orgScope(session, { id: leadId }),
      select: { id: true, assignedBrokerId: true },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found in your organization' },
        { status: 404 }
      );
    }

    // Verify target user is active in organization
    const targetUser = await prisma.user.findFirst({
      where: orgScope(session, { id: userId, isActive: true }),
      select: { id: true, fullName: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Target user not found or inactive' },
        { status: 400 }
      );
    }

    const assignment = await assignLead({
      leadId,
      userId,
      assignedById: session.userId,
      assignmentType: (assignmentType as AssignmentType) || 'MANUAL_REASSIGN',
      notes: notes || `Reassigned by ${session.fullName}`,
    });

    return NextResponse.json({
      success: true,
      assignment,
      message: `Lead successfully reassigned to ${targetUser.fullName}.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to assign lead' },
      { status: 500 }
    );
  }
}
