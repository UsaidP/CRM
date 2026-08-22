import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const communications = await prisma.communicationLog.findMany({
      where: { leadId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, communications });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch communication logs' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const metadata = {
      outcome: outcome || 'CONNECTED_INTERESTED',
      followUpDate: followUpDate || null,
      nextSteps: nextSteps || '',
      callerName: callerName || 'Safwan Diwan',
      tags: tags || [],
      loggedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newLog = await prisma.communicationLog.create({
      data: {
        leadId: id,
        channel: channel.toUpperCase(),
        direction: direction.toUpperCase(),
        messageContent: messageContent || `Call Outcome: ${outcome}`,
        callDurationSeconds: parseInt(String(callDurationSeconds), 10) || 0,
        callRecordingUrl: callRecordingUrl || null,
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
    if (followUpDate) {
      try {
        await prisma.leadReminder.create({
          data: {
            organizationId: leadRecord.organizationId,
            leadId: id,
            title: nextSteps ? `Follow-up: ${nextSteps}` : `Follow-up on ${outcome}`,
            reminderType: channel === 'WHATSAPP' ? 'WHATSAPP' : 'CALL',
            dueAt: new Date(followUpDate),
            priority: 'HIGH',
            status: 'PENDING',
            notes: messageContent || null,
          },
        });
      } catch (remErr) {
        console.error('Failed to auto-create reminder from communication log:', remErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Communication log recorded successfully',
      communication: newLog,
    });
  } catch (error: any) {
    console.error('Error creating communication log:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create communication log' },
      { status: 500 }
    );
  }
}
