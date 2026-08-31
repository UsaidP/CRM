import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireSession } from '@/lib/services/api-auth';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await req.json();

    const existingLog = await prisma.communicationLog.findUnique({
      where: { id },
    });

    if (!existingLog) {
      return NextResponse.json(
        { success: false, error: 'Communication log not found' },
        { status: 404 }
      );
    }

    let existingMeta: any = {};
    try {
      existingMeta = JSON.parse(existingLog.metadataJson || '{}');
    } catch {
      existingMeta = {};
    }

    const updatedMeta = {
      ...existingMeta,
      outcome: body.outcome !== undefined ? body.outcome : existingMeta.outcome,
      followUpDate: body.followUpDate !== undefined ? body.followUpDate : existingMeta.followUpDate,
      nextSteps: body.nextSteps !== undefined ? body.nextSteps : existingMeta.nextSteps,
      callerName: body.callerName !== undefined ? body.callerName : existingMeta.callerName,
      tags: body.tags !== undefined ? body.tags : existingMeta.tags,
      lastEditedAt: new Date().toISOString(),
      editHistory: [
        ...(existingMeta.editHistory || []),
        {
          editedAt: new Date().toISOString(),
          previousContent: existingLog.messageContent,
        },
      ],
    };

    const updateFields: any = {
      metadataJson: JSON.stringify(updatedMeta),
    };

    if (body.messageContent !== undefined) {
      updateFields.messageContent = body.messageContent;
    }
    if (body.channel !== undefined) {
      updateFields.channel = body.channel.toUpperCase();
    }
    if (body.direction !== undefined) {
      updateFields.direction = body.direction.toUpperCase();
    }
    if (body.callDurationSeconds !== undefined) {
      updateFields.callDurationSeconds = parseInt(String(body.callDurationSeconds), 10) || 0;
    }

    const updated = await prisma.communicationLog.update({
      where: { id },
      data: updateFields,
    });

    return NextResponse.json({
      success: true,
      message: 'Communication log updated successfully',
      communication: updated,
    });
  } catch (error: any) {
    console.error('Error updating communication log:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update communication log' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    await prisma.communicationLog.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Communication log deleted successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete communication log' },
      { status: 500 }
    );
  }
}
