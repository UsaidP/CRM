import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { rankMatchingProperties, BuyerRequirementInput, PropertyUnitForMatching } from '@/lib/domain/matching-engine';
import { generateWhatsAppPitchWithAI } from '@/lib/services/gemini-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ leadId: string }> }) {
  try {
    const { leadId } = await params;
    const { searchParams } = new URL(req.url);
    const includeAiPitch = searchParams.get('aiPitch') !== 'false';

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        requirements: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const requirementRecord = lead.requirements[0];
    if (!requirementRecord) {
      return NextResponse.json(
        { success: false, error: 'Lead does not have an active requirement profile yet' },
        { status: 400 }
      );
    }

    const bhkPreferences: number[] = JSON.parse(requirementRecord.bhkPreferencesJson || '[2]');
    const targetLocations: string[] = JSON.parse(requirementRecord.targetLocationsJson || '[]');

    const buyerRequirement: BuyerRequirementInput = {
      budgetMin: requirementRecord.budgetMin,
      budgetMax: requirementRecord.budgetMax,
      bhkPreferences,
      targetLocations,
      possessionPreference: requirementRecord.possessionPreference || 'ANY',
      minCarpetSqft: requirementRecord.minCarpetSqft,
      loanPreApproved: requirementRecord.loanPreApproved,
      purpose: requirementRecord.purpose,
      floorPreference: requirementRecord.floorPreference || 'any',
    };

    // Fetch all active property units
    const units = await prisma.propertyUnit.findMany({
      include: {
        project: true,
      },
    });

    const formattedUnits: PropertyUnitForMatching[] = units.map((u) => ({
      ...u,
      photoGallery: JSON.parse(u.photoGalleryJson || '[]'),
    }));

    const rankedMatches = rankMatchingProperties(buyerRequirement, formattedUnits);

    let aiPitchData = null;
    if (includeAiPitch && rankedMatches.length > 0) {
      try {
        const topMatchedUnits = rankedMatches.slice(0, 3).map((m) => m.unit);
        aiPitchData = await generateWhatsAppPitchWithAI(
          lead.fullName || 'Valued Client',
          buyerRequirement,
          topMatchedUnits
        );
      } catch (aiErr) {
        console.warn('AI pitch generation skipped or failed:', aiErr);
      }
    }

    return NextResponse.json({
      success: true,
      lead: {
        id: lead.id,
        fullName: lead.fullName,
        phoneE164: lead.phoneE164,
        requirements: buyerRequirement,
      },
      matchCount: rankedMatches.length,
      aiPitch: aiPitchData,
      data: rankedMatches,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

