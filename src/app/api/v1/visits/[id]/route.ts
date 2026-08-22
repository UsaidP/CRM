import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      status, // CONFIRMED, COMPLETED, CANCELLED, NO_SHOW
      scheduledDate,
      timeSlot,
      pickupLocation,
      cabDetails,
      feedbackNotes,
      feedbackRating,
      feedbackOutcome, // TOKEN_SUBMITTED, HIGH_INTEREST, PRICE_OBJECTION, LAYOUT_OBJECTION, NEEDS_MORE_OPTIONS
    } = body;

    const visit = await prisma.siteVisit.findUnique({ where: { id } });
    if (!visit) {
      return NextResponse.json({ success: false, error: 'Visit not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const v = await tx.siteVisit.update({
        where: { id },
        data: {
          status: status || undefined,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
          timeSlot: timeSlot || undefined,
          pickupLocation: pickupLocation || undefined,
          cabDetails: cabDetails || undefined,
          feedbackNotes: feedbackNotes !== undefined ? feedbackNotes : undefined,
          feedbackRating: feedbackRating ? Number(feedbackRating) : undefined,
          feedbackOutcome: feedbackOutcome || undefined,
        },
      });

      // Update lead currentStage if visit completed or token submitted
      if (feedbackOutcome === 'TOKEN_SUBMITTED') {
        await tx.lead.update({
          where: { id: visit.leadId },
          data: { currentStage: 'closed_won' },
        });
      } else if (status === 'COMPLETED') {
        await tx.lead.update({
          where: { id: visit.leadId },
          data: { currentStage: 'visit_done' },
        });
      }

      // Log communication note
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

    return NextResponse.json({ success: true, message: 'Visit feedback recorded successfully', data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
