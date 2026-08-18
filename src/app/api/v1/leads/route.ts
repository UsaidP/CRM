import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { normalizeIndianPhone } from '@/lib/domain/phone-normalizer';
import { createLeadSchema } from '@/lib/validators/lead-schemas';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const leadSource = searchParams.get('leadSource');
    const currentStage = searchParams.get('currentStage');
    const search = searchParams.get('search');
    
    // Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (leadSource && leadSource !== 'ALL') {
      where.leadSource = leadSource;
    }
    if (currentStage && currentStage !== 'ALL') {
      where.currentStage = currentStage;
    }
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { phoneE164: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        include: {
          campaign: {
            select: {
              id: true,
              campaignName: true,
              channelType: true,
              customSlug: true,
            },
          },
          assignedBroker: {
            select: { id: true, fullName: true, email: true },
          },
          requirements: true,
          communications: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      count: leads.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: leads,
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
    const body = await req.json();
    const parsed = createLeadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: parsed.error.format() },
        { status: 422 }
      );
    }

    const {
      fullName,
      phone,
      email,
      leadSource = 'direct_call',
      campaignId,
      notes,
    } = parsed.data;

    const phoneResult = normalizeIndianPhone(phone);
    if (!phoneResult.isValid) {
      return NextResponse.json({ success: false, error: phoneResult.error }, { status: 400 });
    }

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 500 });
    }

    // Check for existing lead with same phone
    const existingLead = await prisma.lead.findUnique({
      where: { phoneE164: phoneResult.e164 },
    });

    if (existingLead) {
      // Update existing lead notes and return
      const updated = await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          fullName: fullName || existingLead.fullName,
          notes: notes ? `${existingLead.notes || ''}\n[Update]: ${notes}` : existingLead.notes,
        },
        include: { requirements: true, campaign: true },
      });

      return NextResponse.json({
        success: true,
        message: 'Existing lead profile updated',
        data: updated,
      });
    }

    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        fullName: fullName || 'New Buyer',
        phoneE164: phoneResult.e164,
        email: email || null,
        leadSource,
        campaignId: campaignId || null,
        currentStage: 'new_uncontacted',
        notes: notes || 'Captured via broker desk',
        requirements: body.budgetMax
          ? {
              create: {
                budgetMax: Number(body.budgetMax),
                bhkPreferencesJson: JSON.stringify(body.bhkPreferences || [2]),
                targetLocationsJson: JSON.stringify(['Kharghar Sector 35', 'Taloja Phase 1']),
              },
            }
          : undefined,
      },
      include: {
        requirements: true,
        campaign: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Lead profile created successfully',
      data: lead,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create lead' },
      { status: 400 }
    );
  }
}
