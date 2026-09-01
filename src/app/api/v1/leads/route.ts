import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createLeadSchema } from '@/lib/validators/lead-schemas';
import {
  createLead,
  LeadValidationError,
  type CreateLeadInput,
} from '@/lib/domain/lead-creation';
import { evaluate24HourMessagingWindow } from '@/lib/domain/contact-manager';
import { requireSession, requirePermissionWithScope, scopedLeadFilter, orgScope } from '@/lib/services/api-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const auth = await requirePermissionWithScope(req, 'leads:view_all');
    if (!auth.ok) return auth.response;
    const { session, scope } = auth;

    const { searchParams } = new URL(req.url);
    const leadSource = searchParams.get('leadSource');
    const sourceConfidence = searchParams.get('sourceConfidence');
    const brokerId = searchParams.get('brokerId');
    const currentStage = searchParams.get('currentStage');
    const search = searchParams.get('search');
    
    // Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    // Scope-aware filter: respects GLOBAL, ORGANIZATION, TEAM, OWN_AND_ASSIGNED, OWN
    const baseScopeWhere = await scopedLeadFilter(session, scope);
    const where: Record<string, unknown> = { ...baseScopeWhere };
    if (leadSource && leadSource !== 'ALL') {
      where.leadSource = leadSource;
    }
    if (sourceConfidence && sourceConfidence !== 'ALL') {
      where.sourceConfidence = sourceConfidence;
    }
    if (brokerId && brokerId !== 'ALL') {
      where.assignedBrokerId = brokerId;
    }
    if (currentStage && currentStage !== 'ALL') {
      where.currentStage = currentStage;
    }
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { phoneE164: { contains: search } },
        { notes: { contains: search } },
        { sourceCode: { contains: search } },
        { contact: { primaryName: { contains: search } } },
      ];
    }

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        include: {
          contact: {
            include: {
              identities: true,
            },
          },
          campaign: {
            select: {
              id: true,
              campaignName: true,
              channelType: true,
              customSlug: true,
              sourceCode: true,
            },
          },
          assignedBroker: {
            select: { id: true, fullName: true, email: true, phoneE164: true },
          },
          requirements: true,
          communications: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          portals: {
            include: {
              telemetryLogs: true,
            },
          },
          reminders: {
            orderBy: { dueAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const enriched = leads.map((l) => {
      const windowInfo = evaluate24HourMessagingWindow(l.lastInboundMessageAt || l.createdAt);
      return {
        ...l,
        messagingWindow: windowInfo,
      };
    });

    return NextResponse.json({
      success: true,
      count: enriched.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: enriched,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();

    const result = await createLead(
      { organizationId: auth.session.organizationId, userId: auth.session.userId },
      body as CreateLeadInput
    );

    const lead = await prisma.lead.findUnique({
      where: { id: result.leadId },
      include: {
        contact: { include: { identities: true } },
        assignedBroker: true,
        campaign: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Lead created successfully',
      data: lead,
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof LeadValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create lead' },
      { status: 500 }
    );
  }
}
