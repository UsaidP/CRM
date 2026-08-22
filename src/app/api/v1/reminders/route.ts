import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get('leadId');
    const status = searchParams.get('status'); // PENDING, COMPLETED, SNOOZED, ALL
    const timeframe = searchParams.get('timeframe'); // today, overdue, upcoming, all
    const reminderType = searchParams.get('reminderType');

    const where: any = {};

    if (leadId) {
      where.leadId = leadId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (reminderType && reminderType !== 'ALL') {
      where.reminderType = reminderType;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (timeframe === 'today') {
      where.dueAt = {
        gte: startOfToday,
        lte: endOfToday,
      };
      if (!status || status === 'ALL') {
        where.status = { in: ['PENDING', 'SNOOZED'] };
      }
    } else if (timeframe === 'overdue') {
      where.dueAt = {
        lt: now,
      };
      where.status = { in: ['PENDING', 'SNOOZED'] };
    } else if (timeframe === 'upcoming') {
      where.dueAt = {
        gt: now,
      };
      where.status = { in: ['PENDING', 'SNOOZED'] };
    }

    const reminders = await prisma.leadReminder.findMany({
      where,
      include: {
        lead: {
          include: {
            contact: {
              include: {
                identities: true,
              },
            },
            campaign: true,
          },
        },
      },
      orderBy: { dueAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      count: reminders.length,
      data: reminders,
    });
  } catch (error: any) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch reminders' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      leadId,
      title,
      reminderType = 'CALL',
      dueAt,
      priority = 'HIGH',
      notes,
    } = body;

    if (!leadId) {
      return NextResponse.json(
        { success: false, error: 'Lead ID is required to create a reminder' },
        { status: 400 }
      );
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Reminder title / task description is required' },
        { status: 400 }
      );
    }

    if (!dueAt) {
      return NextResponse.json(
        { success: false, error: 'Due date and time is required' },
        { status: 400 }
      );
    }

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 500 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const reminder = await prisma.leadReminder.create({
      data: {
        organizationId: org.id,
        leadId,
        title: title.trim(),
        reminderType: reminderType.toUpperCase(),
        dueAt: new Date(dueAt),
        priority: priority.toUpperCase(),
        status: 'PENDING',
        notes: notes ? notes.trim() : null,
      },
      include: {
        lead: {
          include: {
            contact: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Reminder scheduled successfully',
        data: reminder,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating reminder:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create reminder' },
      { status: 500 }
    );
  }
}
