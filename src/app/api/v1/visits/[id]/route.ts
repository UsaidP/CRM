import { NextResponse } from 'next/server';
import { requireSession, orgScope } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/services/api-handler';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const body = await req.json();
    const {
      status, // SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW
      confirmedVia, // WHATSAPP, PHONE_CALL, SMS, IN_PERSON
      confirmedAt,
      noShowReason, // UNREACHABLE, CANCELLED_LAST_MINUTE, WEATHER, PERSONAL_EMERGENCY, UNKNOWN
      scheduledDate,
      timeSlot,
      pickupLocation,
      cabDetails,
      feedbackNotes,
      feedbackRating,
      feedbackOutcome, // TOKEN_SUBMITTED, HIGH_INTEREST, PRICE_OBJECTION, LAYOUT_OBJECTION, NEEDS_MORE_OPTIONS
    } = body;

    const visit = await prisma.siteVisit.findFirst({
      where: { id, ...orgScope(auth.session) },
      include: {
        lead: {
          select: {
            id: true,
            fullName: true,
            phoneE164: true,
            currentStage: true,
            organizationId: true,
          },
        },
      },
    });
    if (!visit) {
      return NextResponse.json({ success: false, error: 'Visit not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Check if rescheduling
      const isDateChanged = scheduledDate &&
        new Date(scheduledDate).toISOString().split('T')[0] !== new Date(visit.scheduledDate).toISOString().split('T')[0];
      const isRescheduling = isDateChanged || (timeSlot && timeSlot !== visit.timeSlot && (visit.status === 'NO_SHOW' || visit.status === 'CANCELLED'));

      const updateData: any = {
        pickupLocation: pickupLocation || undefined,
        cabDetails: cabDetails || undefined,
        feedbackNotes: feedbackNotes !== undefined ? feedbackNotes : undefined,
        feedbackRating: feedbackRating ? Number(feedbackRating) : undefined,
        feedbackOutcome: feedbackOutcome || undefined,
      };

      if (timeSlot) updateData.timeSlot = timeSlot;
      if (scheduledDate) updateData.scheduledDate = new Date(scheduledDate);

      // Handle Rescheduling
      if (isRescheduling) {
        updateData.rescheduleCount = (visit.rescheduleCount || 0) + 1;
        // If visit was previously cancelled or no-show, reset to SCHEDULED unless explicitly setting status
        if (!status && (visit.status === 'NO_SHOW' || visit.status === 'CANCELLED')) {
          updateData.status = 'SCHEDULED';
        }
      }

      // Handle Status transitions
      if (status) {
        updateData.status = status;
      }

      if (status === 'CONFIRMED' || (!status && confirmedVia && visit.status !== 'CONFIRMED')) {
        updateData.status = 'CONFIRMED';
        updateData.confirmedAt = confirmedAt ? new Date(confirmedAt) : new Date();
        updateData.confirmedVia = confirmedVia || visit.confirmedVia || 'PHONE_CALL';
      }

      if (status === 'NO_SHOW') {
        updateData.noShowReason = noShowReason || 'UNKNOWN';
      }

      const v = await tx.siteVisit.update({
        where: { id },
        data: updateData,
      });

      // Synchronize Lead currentStage according to visit lifecycle
      if (feedbackOutcome === 'TOKEN_SUBMITTED') {
        await tx.lead.update({
          where: { id: visit.leadId },
          data: { currentStage: 'closed_won' },
        });
      } else if (status === 'COMPLETED' || updateData.status === 'COMPLETED') {
        await tx.lead.update({
          where: { id: visit.leadId },
          data: { currentStage: 'visit_done' },
        });
      } else if (updateData.status === 'CONFIRMED') {
        await tx.lead.update({
          where: { id: visit.leadId },
          data: { currentStage: 'visit_confirmed' },
        });
      } else if (isRescheduling && (visit.lead.currentStage === 'on_hold_nurture' || visit.lead.currentStage === 'closed_lost')) {
        await tx.lead.update({
          where: { id: visit.leadId },
          data: { currentStage: 'visit_scheduled' },
        });
      }

      // Communication Logs & Follow-up Reminders
      if (updateData.status === 'CONFIRMED' && visit.status !== 'CONFIRMED') {
        const formattedDate = new Date(v.scheduledDate).toLocaleDateString('en-IN', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        await tx.communicationLog.create({
          data: {
            leadId: visit.leadId,
            channel: (updateData.confirmedVia === 'WHATSAPP' ? 'WHATSAPP' : 'PHONE_CALL') as any,
            direction: 'INBOUND',
            messageContent: `Buyer confirmed attendance for site tour on ${formattedDate} (${v.timeSlot}) via ${updateData.confirmedVia || 'Phone Call'}.`,
          },
        });
      }

      if (updateData.status === 'NO_SHOW') {
        await tx.communicationLog.create({
          data: {
            leadId: visit.leadId,
            channel: 'PHONE_CALL',
            direction: 'OUTBOUND',
            messageContent: `Site Visit Marked NO-SHOW. Reason: ${noShowReason || 'Buyer Unreachable'}. Re-engagement cadence triggered.`,
          },
        });

        // Automatically create a follow-up reminder for tomorrow morning
        const reminderDue = new Date();
        reminderDue.setDate(reminderDue.getDate() + 1);
        reminderDue.setHours(10, 30, 0, 0);

        await tx.leadReminder.create({
          data: {
            organizationId: visit.organizationId,
            leadId: visit.leadId,
            reminderType: 'CALL',
            priority: 'HIGH',
            status: 'PENDING',
            title: `Reschedule Missed Site Visit (${noShowReason || 'No-Show'})`,
            notes: `Buyer did not attend scheduled visit. Call to reschedule or address blockers.`,
            dueAt: reminderDue,
            createdById: visit.assignedBrokerId || auth.session.userId || null,
          },
        });
      }

      if (isRescheduling) {
        const newFormattedDate = new Date(v.scheduledDate).toLocaleDateString('en-IN', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        await tx.communicationLog.create({
          data: {
            leadId: visit.leadId,
            channel: 'PHONE_CALL',
            direction: 'OUTBOUND',
            messageContent: `Site Visit rescheduled to ${newFormattedDate} at ${v.timeSlot} (Reschedule #${v.rescheduleCount}).`,
          },
        });
      }

      if (feedbackNotes || feedbackOutcome) {
        await tx.communicationLog.create({
          data: {
            leadId: visit.leadId,
            channel: 'PHONE_CALL',
            direction: 'INBOUND',
            messageContent: `Post-Visit Feedback Logged: [${feedbackOutcome || 'REVIEW'}] ${feedbackNotes || ''} (Rating: ${feedbackRating || 5}/5)`,
          },
        });
      }

      return v;
    });

    return NextResponse.json({
      success: true,
      message: 'Site visit updated successfully',
      data: updated,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to update site visit');
  }
}
