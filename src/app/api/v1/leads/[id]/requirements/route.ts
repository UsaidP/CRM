import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const body = await req.json();
    const {
      budgetMax,
      budgetMin,
      bhkPreferences = [2],
      targetLocations = ['Kharghar Sector 35'],
      possessionPreference = 'ANY',
      minCarpetSqft,
      loanPreApproved = false,
      purpose = 'self_use',
      floorPreference = 'middle',
    } = body;

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    // Check if an existing requirement profile exists
    const existing = await prisma.buyerRequirement.findFirst({
      where: { leadId: id, isActive: true },
    });

    let requirement;
    if (existing) {
      requirement = await prisma.buyerRequirement.update({
        where: { id: existing.id },
        data: {
          budgetMin: budgetMin ? Number(budgetMin) : undefined,
          budgetMax: Number(budgetMax),
          bhkPreferencesJson: JSON.stringify(bhkPreferences),
          targetLocationsJson: JSON.stringify(targetLocations),
          possessionPreference,
          minCarpetSqft: minCarpetSqft ? Number(minCarpetSqft) : undefined,
          loanPreApproved: Boolean(loanPreApproved),
          purpose,
          floorPreference,
        },
      });
    } else {
      requirement = await prisma.buyerRequirement.create({
        data: {
          leadId: id,
          budgetMin: budgetMin ? Number(budgetMin) : undefined,
          budgetMax: Number(budgetMax),
          bhkPreferencesJson: JSON.stringify(bhkPreferences),
          targetLocationsJson: JSON.stringify(targetLocations),
          possessionPreference,
          minCarpetSqft: minCarpetSqft ? Number(minCarpetSqft) : undefined,
          loanPreApproved: Boolean(loanPreApproved),
          purpose,
          floorPreference,
          isActive: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Buyer requirements saved successfully',
      data: requirement,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
