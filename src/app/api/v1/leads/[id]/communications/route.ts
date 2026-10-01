import { NextRequest, NextResponse } from 'next/server';
import { requireSession, requirePermissionWithScope, scopedLeadFilter } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/services/api-handler';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermissionWithScope(req, 'leads:view_all');
    if (!auth.ok) return auth.response;
    const { session, scope } = auth;
    const { id } = await params;

    const scopeWhere = await scopedLeadFilter(session, scope);
    const lead = await prisma.lead.findFirst({
      where: { id, ...scopeWhere },
      select: { id: true },
    });
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const communications = await prisma.communicationLog.findMany({
      where: { leadId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, communications });
  } catch (error) {
    return handleApiError(error, 'Failed to fetch communication logs');
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionAuth = await requireSession(req);
    if (!sessionAuth.ok) return sessionAuth.response;
    const { session } = sessionAuth;
    const { id } = await params;

    const editAllAuth = await requirePermissionWithScope(req, 'leads:edit_all');
    let scopeWhere: Record<string, unknown>;

    if (editAllAuth.ok) {
      scopeWhere = await scopedLeadFilter(session, editAllAuth.scope);
    } else {
      scopeWhere = {
        organizationId: session.organizationId,
        OR: [
          { assignedBrokerId: session.userId },
          { assignments: { some: { userId: session.userId, unassignedAt: null } } },
        ],
      };
    }

    const lead = await prisma.lead.findFirst({
      where: { id, ...scopeWhere },
      select: { id: true, organizationId: true },
    });
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found or access restricted' }, { status: 404 });
    }

    const body = await req.json();

    const {
      channel = 'PHONE_CALL',
      direction = 'OUTBOUND',
      messageContent,
      callDurationSeconds = 0,
      callRecordingUrl,
      outcome,
      followUpDate,
      nextSteps,
      callerName,
      stageUpdate,
      tags,
    } = body;

    if (!messageContent && !outcome) {
      return NextResponse.json(
        { success: false, error: 'Communication notes or call outcome is required' },
        { status: 400 }
      );
    }

    let parsedFollowUp: Date | null = null;
    if (followUpDate) {
      parsedFollowUp = new Date(followUpDate);
      if (Number.isNaN(parsedFollowUp.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid followUpDate format' },
          { status: 400 }
        );
      }
    }
    const hasValidFollowUp = parsedFollowUp !== null;

    const normalizedChannel = String(channel || 'PHONE_CALL').toUpperCase();
    const reminderType = normalizedChannel === 'WHATSAPP' ? 'WHATSAPP' : 'CALL';

    let aiSummary: string | undefined = undefined;
    let aiSentiment: string | undefined = undefined;
    let transcriptText: string | undefined = undefined;
    let finalOutcome = outcome || 'INTERESTED';

    if (normalizedChannel === 'PHONE_CALL') {
      try {
        const { analyzeCallWithAI } = await import('@/lib/services/call-ai-service');
        const aiRes = await analyzeCallWithAI({
          audioUrl: callRecordingUrl,
          leadName: lead.id,
          durationSeconds: parseInt(String(callDurationSeconds), 10) || 0,
          notes: messageContent,
        });
        if (aiRes) {
          aiSummary = aiRes.summary;
          aiSentiment = aiRes.sentiment;
          transcriptText = aiRes.transcript;
          if (!outcome) {
            finalOutcome = aiRes.callOutcome;
          }
        }
      } catch (aiErr) {
        console.warn('[Communications API] AI analysis notice:', aiErr);
      }
    }

    const metadata = {
      outcome: finalOutcome,
      followUpDate: parsedFollowUp ? parsedFollowUp.toISOString() : null,
      nextSteps: nextSteps || '',
      callerName: callerName || session.fullName || 'Broker',
      tags: tags || [],
      loggedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      aiSummary,
      aiSentiment,
    };

    const newLog = await prisma.communicationLog.create({
      data: {
        leadId: id,
        channel: normalizedChannel,
        direction: String(direction || 'OUTBOUND').toUpperCase(),
        messageContent: messageContent || aiSummary || `Call Outcome: ${finalOutcome}`,
        callDurationSeconds: parseInt(String(callDurationSeconds), 10) || 0,
        callRecordingUrl: callRecordingUrl || null,
        callOutcome: finalOutcome,
        aiSummary,
        aiSentiment,
        transcriptText,
        processingStatus: 'COMPLETED',
        metadataJson: JSON.stringify(metadata),
      },
    });

    // Optionally update lead's stage, latest communication date, and current remark/notes
    const updateData: any = {
      lastInboundMessageAt: new Date(),
    };
    if (messageContent) {
      updateData.notes = messageContent;
    }
    if (stageUpdate) {
      updateData.currentStage = stageUpdate;
    }

    const leadRecord = await prisma.lead.update({
      where: { id },
      data: updateData,
    });

    // Automatically sync with LeadReminder table if a follow-up date is set
    if (hasValidFollowUp && parsedFollowUp) {
      try {
        await prisma.leadReminder.create({
          data: {
            organizationId: leadRecord.organizationId,
            leadId: id,
            title: nextSteps ? `Follow-up: ${nextSteps}` : `Follow-up on ${outcome}`,
            reminderType,
            dueAt: parsedFollowUp,
            priority: 'HIGH',
            status: 'PENDING',
            notes: messageContent || null,
          },
        });
      } catch (remErr) {
        console.error('Failed to auto-create reminder from communication log:', remErr);
      }
    }

    /**
     * Safety net (Phase 1): a call that ended "no answer" / "busy, call later" is a
     * guaranteed callback. Even if the agent closes the log modal without setting a
     * follow-up, the retry reminder must still land on the calendar.
     */
    const AUTO_RETRY_OUTCOMES = new Set(['RINGING_NO_ANSWER', 'BUSY_CALL_LATER']);
    let autoReminder: { id: string; dueAt: string; title: string } | null = null;
    const normalizedOutcome = String(finalOutcome || '').toUpperCase();

    if (!hasValidFollowUp && AUTO_RETRY_OUTCOMES.has(normalizedOutcome)) {
      try {
        const retryAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
        const created = await prisma.leadReminder.create({
          data: {
            organizationId: leadRecord.organizationId,
            leadId: id,
            title: `Retry call — ${normalizedOutcome === 'BUSY_CALL_LATER' ? 'client was busy' : 'no answer'}`,
            reminderType,
            dueAt: retryAt,
            priority: 'URGENT',
            status: 'PENDING',
            notes: messageContent ? String(messageContent).slice(0, 500) : null,
          },
        });
        autoReminder = {
          id: created.id,
          dueAt: created.dueAt.toISOString(),
          title: created.title,
        };
      } catch (retryErr) {
        console.error('Failed to auto-create retry reminder from call outcome:', retryErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Communication log recorded successfully',
      communication: newLog,
      autoReminder,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to create communication log');
  }
}
