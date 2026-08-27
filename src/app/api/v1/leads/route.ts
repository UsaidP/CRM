import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { normalizeIndianPhone } from '@/lib/domain/phone-normalizer';
import { createLeadSchema } from '@/lib/validators/lead-schemas';
import { evaluate24HourMessagingWindow, findOrCreateContact } from '@/lib/domain/contact-manager';
import { resolveBrokerByInboundIdentifier, OFFICIAL_BROKER_NUMBERS } from '@/lib/domain/broker-resolver';
import { analyzeInboundAttribution } from '@/lib/domain/campaign-attribution';
import { ensureLeadFallbackReminder } from '@/lib/services/lead-reminder-service';
import { requireSession, orgScope } from '@/lib/services/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const { session } = auth;

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

    // Multi-tenant: always restrict to the caller's organization
    const where: any = orgScope(session);
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
    const { session } = auth;

    const body = await req.json();
    const {
      fullName,
      phone,
      email,
      leadSource = 'MANUAL_ENTRY',
      sourceCode,
      contactedBrokerNumber = OFFICIAL_BROKER_NUMBERS.SAFWAN.e164,
      assignedBrokerId: requestedBrokerId,
      campaignId,
      notes,
    } = body;

    // Multi-tenant: create within the caller's organization
    const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    let phoneE164: string | null = null;
    if (phone && phone.trim() !== '') {
      const phoneResult = normalizeIndianPhone(phone);
      if (!phoneResult.isValid) {
        return NextResponse.json({ success: false, error: phoneResult.error }, { status: 400 });
      }
      phoneE164 = phoneResult.e164;
    }

    // Resolve Broker Assignment
    let assignedBrokerId = requestedBrokerId;
    let inboundNumber = contactedBrokerNumber;

    if (!assignedBrokerId && contactedBrokerNumber) {
      const brokerRes = await resolveBrokerByInboundIdentifier(contactedBrokerNumber, org.id);
      assignedBrokerId = brokerRes.brokerId;
      inboundNumber = brokerRes.brokerPhoneE164 || contactedBrokerNumber;
    }

    // Attribution
    const attribution = analyzeInboundAttribution(
      sourceCode ? `Code: ${sourceCode} ${notes || ''}` : (notes || ''),
      'CALL'
    );

    const contact = await findOrCreateContact({
      organizationId: org.id,
      fullName: fullName || 'Direct Manual Lead',
      phoneE164: phoneE164 || undefined,
      email: email || undefined,
      assignedBrokerId,
      notes: notes ? `Manual entry: ${notes}` : undefined,
    });

    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        contactId: contact?.id,
        fullName: fullName || 'Direct Manual Lead',
        phoneE164,
        email,
        leadSource: sourceCode ? attribution.leadSource : (leadSource || 'MANUAL_ENTRY'),
        sourceConfidence: sourceCode ? 'EXACT' : 'UNKNOWN',
        sourceCode: sourceCode?.toUpperCase(),
        inboundNumber,
        campaignId,
        assignedBrokerId,
        currentStage: 'new_uncontacted',
        firstResponseSlaMinutes: 0,
        lastInboundMessageAt: new Date(),
        notes,
      },
      include: {
        contact: { include: { identities: true } },
        assignedBroker: true,
        campaign: true,
      },
    });

    // Zero-Orphan Inbound Rule: Auto-seed 15-minute speed-to-lead reminder
    await ensureLeadFallbackReminder(lead.id, {
      organizationId: org.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Lead created successfully',
      data: lead,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create lead' },
      { status: 500 }
    );
  }
}
