import { NextResponse } from 'next/server';
import { requireSession, requirePermission, requirePermissionWithScope, scopedLeadFilter, orgScope } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import { reassignLead } from '@/lib/services/lead-assignment-service';
import { normalizeIndianPhone } from '@/lib/domain/phone-normalizer';
import { handleApiError } from '@/lib/services/api-handler';

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
        assignments: {
          where: { unassignedAt: null },
          include: {
            user: { select: { id: true, fullName: true, role: true } },
          },
          take: 1,
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: lead });
  } catch (error) {
    return handleApiError(error, 'Failed to fetch lead');
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionAuth = await requireSession(req);
    if (!sessionAuth.ok) return sessionAuth.response;
    const { session } = sessionAuth;
    const { id } = await params;
    const body = await req.json();
    const { currentStage, assignedBrokerId, notes, fullName, email, phone } = body;

    // Determine edit authorization:
    // 1. If user holds 'leads:edit_all', scope to their granted permission scope
    // 2. Otherwise, allow assigned broker / telecaller to update stage & remarks on their own assigned lead
    const editAllAuth = await requirePermissionWithScope(req, 'leads:edit_all');
    let scopeWhere: Record<string, unknown>;

    if (editAllAuth.ok) {
      scopeWhere = await scopedLeadFilter(session, editAllAuth.scope);
    } else {
      if (fullName !== undefined || email !== undefined || phone !== undefined) {
        return editAllAuth.response;
      }
      scopeWhere = {
        organizationId: session.organizationId,
        OR: [
          { assignedBrokerId: session.userId },
          { assignments: { some: { userId: session.userId, unassignedAt: null } } },
        ],
      };
    }

    const existing = await prisma.lead.findFirst({
      where: {
        id,
        ...scopeWhere,
      },
      select: {
        id: true,
        assignedBrokerId: true,
        contactId: true,
      },
    });

    if (!existing) {
      if (!editAllAuth.ok) {
        return editAllAuth.response;
      }
      return NextResponse.json(
        { success: false, error: 'Lead not found or you do not have permission to edit this lead' },
        { status: 404 }
      );
    }

    // Phone normalization if phone is provided
    let phoneE164Update: string | null | undefined = undefined;
    if (phone !== undefined) {
      if (phone.trim() === '') {
        phoneE164Update = null;
      } else {
        const phoneResult = normalizeIndianPhone(phone);
        if (!phoneResult.isValid) {
          return NextResponse.json(
            { success: false, error: phoneResult.error || 'Invalid phone number format' },
            { status: 400 }
          );
        }
        phoneE164Update = phoneResult.e164;
      }
    }

    // Changing broker assignment requires the leads:reassign capability
    if (assignedBrokerId !== undefined && assignedBrokerId !== existing.assignedBrokerId) {
      const reassignAuth = await requirePermission(req, 'leads:reassign');
      if (!reassignAuth.ok) return reassignAuth.response;

      if (assignedBrokerId) {
        await reassignLead(id, assignedBrokerId, session.userId, notes || 'Reassigned by admin');
      } else {
        await prisma.leadAssignment.updateMany({
          where: { leadId: id, unassignedAt: null },
          data: { unassignedAt: new Date() },
        });
        await prisma.lead.update({
          where: { id },
          data: { assignedBrokerId: null },
        });
      }
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        currentStage: currentStage || undefined,
        notes: notes || undefined,
        fullName: fullName || undefined,
        email: email || undefined,
        ...(phoneE164Update !== undefined ? { phoneE164: phoneE164Update } : {}),
      },
      include: {
        campaign: true,
        assignedBroker: true,
        requirements: true,
        assignments: {
          where: { unassignedAt: null },
          include: {
            user: { select: { id: true, fullName: true, role: true } },
          },
          take: 1,
        },
      },
    });

    if (existing.contactId && phoneE164Update) {
      await prisma.contactIdentity.updateMany({
        where: { contactId: existing.contactId, isPrimary: true },
        data: { identityValue: phoneE164Update },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, message: 'Lead updated successfully', data: lead });
  } catch (error) {
    return handleApiError(error, 'Failed to update lead');
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
  } catch (error) {
    return handleApiError(error, 'Failed to delete lead');
  }
}

