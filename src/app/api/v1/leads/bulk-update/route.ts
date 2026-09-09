import { NextResponse } from 'next/server';
import { requirePermission, requirePermissionWithScope, scopedLeadFilter, orgScope } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import { ensureLeadFallbackReminder } from '@/lib/services/lead-reminder-service';

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

    const updateData: any = {};
    if (currentStage) {
      updateData.currentStage = currentStage;
      if (currentStage !== 'new_uncontacted') {
        updateData.firstResponseAt = new Date();
      }
    }
    if (assignedBrokerId !== undefined) {
      updateData.assignedBrokerId = assignedBrokerId || null;
    }
    if (notes) {
      updateData.notes = notes;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No update fields provided.' },
        { status: 400 }
      );
    }

    // Ensure we only update leads within the user's permissible data scope
    const scopeWhere = await scopedLeadFilter(session, scope);
    const updateResult = await prisma.lead.updateMany({
      where: {
        id: { in: leadIds },
        ...scopeWhere,
      },
      data: updateData,
    });

    // If stage was updated, sync fallback reminders for affected leads
    if (currentStage) {
      for (const id of leadIds) {
        try {
          await ensureLeadFallbackReminder(id, { organizationId: session.organizationId });
        } catch {
          // ignore individual sync errors
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updateResult.count} leads.`,
      updatedCount: updateResult.count,
    });
  } catch (error: any) {
    console.error('Error during bulk leads update:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to perform bulk update.' },
      { status: 500 }
    );
  }
}
