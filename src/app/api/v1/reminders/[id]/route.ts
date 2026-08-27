import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import { completeReminderAndScheduleNext } from '@/lib/services/lead-reminder-service';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const reminder = await prisma.leadReminder.findUnique({
      where: { id },
      include: {
        lead: {
          include: {
            contact: true,
            campaign: true,
          },
        },
      },
    });

    if (!reminder) {
      return NextResponse.json({ success: false, error: 'Reminder not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: reminder });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch reminder' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const body = await req.json();

    const {
      status, // PENDING, COMPLETED, SNOOZED, CANCELLED
      snoozeMinutes,
      dueAt,
      title,
      notes,
      priority,
      reminderType,
      completionNotes,
      nextReminder,
    } = body;

    // Check if this is an atomic complete-and-schedule-next request
    if (status && status.toUpperCase() === 'COMPLETED' && (completionNotes !== undefined || nextReminder !== undefined)) {
      const result = await completeReminderAndScheduleNext({
        reminderId: id,
        completionNotes,
        nextReminder,
      });

      return NextResponse.json({
        success: true,
        message: 'Reminder completed and next touchpoint scheduled',
        data: result.completedReminder,
        nextReminder: result.nextReminder,
      });
    }

    const existing = await prisma.leadReminder.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Reminder not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (status) {
      updateData.status = status.toUpperCase();
      if (status.toUpperCase() === 'COMPLETED') {
        updateData.completedAt = new Date();
      } else if (status.toUpperCase() === 'PENDING') {
        updateData.completedAt = null;
      }
    }

    if (snoozeMinutes) {
      const minutes = parseInt(String(snoozeMinutes), 10);
      const newDueDate = new Date(Date.now() + minutes * 60 * 1000);
      updateData.dueAt = newDueDate;
      updateData.snoozedUntil = newDueDate;
      updateData.status = 'SNOOZED';
    } else if (dueAt) {
      updateData.dueAt = new Date(dueAt);
      if (!status) {
        updateData.status = 'PENDING';
      }
    }

    if (title) updateData.title = title.trim();
    if (notes !== undefined) updateData.notes = notes ? notes.trim() : null;
    if (priority) updateData.priority = priority.toUpperCase();
    if (reminderType) updateData.reminderType = reminderType.toUpperCase();

    const updated = await prisma.leadReminder.update({
      where: { id },
      data: updateData,
      include: {
        lead: {
          include: {
            contact: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Reminder updated successfully',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating reminder:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update reminder' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const { id } = await params;
    await prisma.leadReminder.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Reminder deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting reminder:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete reminder' },
      { status: 500 }
    );
  }
}
