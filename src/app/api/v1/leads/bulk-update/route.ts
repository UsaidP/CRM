import { NextResponse } from 'next/server';
import { requirePermission, requirePermissionWithScope, scopedLeadFilter } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import { ensureLeadFallbackReminder } from '@/lib/services/lead-reminder-service';
import { bulkReassignLeads } from '@/lib/services/lead-assignment-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await requirePermissionWithScope(req, 'leads:edit_all');
    if (!auth.ok) return auth.response;
    const { session, scope } = auth;

    const body = await req.json();
    const { leadIds, currentStage, assignedBrokerId, notes } = body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please provide an array of lead IDs to update.' },
        { status: 400 }
      );
    }

    if (assignedBrokerId !== undefined) {
      const reassignAuth = await requirePermission(req, 'leads:reassign');
      if (!reassignAuth.ok) return reassignAuth.response;
    }

    if (!currentStage && assignedBrokerId === undefined && !notes) {
      return NextResponse.json(
        { success: false, error: 'No update fields provided.' },
        { status: 400 }
      );
    }

    // Ensure we only update leads within the user's permissible data scope
    const scopeWhere = await scopedLeadFilter(session, scope);
    const authorizedLeads = await prisma.lead.findMany({
      where: {
        id: { in: leadIds },
        ...scopeWhere,
      },
      select: { id: true },
    });
    const authorizedIds = authorizedLeads.map((l) => l.id);

    if (authorizedIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No leads matched your accessible data scope.',
        updatedCount: 0,
      });
    }

    // 1. Handle reassignment with atomic audit trail
    if (assignedBrokerId !== undefined) {
      await bulkReassignLeads(
        authorizedIds,
        assignedBrokerId || null,
        session.userId,
        notes
      );
    }

    // 2. Handle other field updates (stage, notes)
    const otherUpdates: any = {};
    if (currentStage) {
      otherUpdates.currentStage = currentStage;
      if (currentStage !== 'new_uncontacted') {
        otherUpdates.firstResponseAt = new Date();
      }
    }
    if (notes && assignedBrokerId === undefined) {
      otherUpdates.notes = notes;
    }

    if (Object.keys(otherUpdates).length > 0) {
      await prisma.lead.updateMany({
        where: { id: { in: authorizedIds } },
        data: otherUpdates,
      });
    }

    // 3. If stage was updated, sync fallback reminders for affected leads
    if (currentStage) {
      for (const id of authorizedIds) {
        try {
          await ensureLeadFallbackReminder(id, { organizationId: session.organizationId });
        } catch {
          // ignore individual sync errors
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${authorizedIds.length} leads.`,
      updatedCount: authorizedIds.length,
    });
  } catch (error: any) {
    console.error('Error during bulk leads update:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to perform bulk update.' },
      { status: 500 }
    );
  }
}
