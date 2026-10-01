import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { rankMatchingProperties, BuyerRequirementInput, PropertyUnitForMatching } from '@/lib/domain/matching-engine';
import { generateWhatsAppPitchWithAI } from '@/lib/services/gemini-service';
import { requireSession, orgScope } from '@/lib/services/api-auth';
import { handleApiError } from '@/lib/services/api-handler';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ leadId: string }> }) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  try {
    const { leadId } = await params;
    const { searchParams } = new URL(req.url);
    const includeAiPitch = searchParams.get('aiPitch') !== 'false';

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, ...orgScope(auth.session) },
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

    const safeParse = <T>(str: string | null | undefined, fallback: T): T => {
      if (!str) return fallback;
      try { return JSON.parse(str); } catch { return fallback; }
    };

    const rawBhk = safeParse<unknown>(requirementRecord.bhkPreferencesJson, [2]);
    const bhkPreferences: number[] = Array.isArray(rawBhk)
      ? rawBhk.map(Number).filter((n) => !isNaN(n) && Number.isInteger(n))
      : [2];

    const rawLocs = safeParse<unknown>(requirementRecord.targetLocationsJson, []);
    const targetLocations: string[] = Array.isArray(rawLocs)
      ? rawLocs.filter((l): l is string => typeof l === 'string' && l.trim().length > 0)
      : [];

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

    // Fetch all active property units scoped to tenant
    const units = await prisma.propertyUnit.findMany({
      where: {
        project: orgScope(auth.session),
      },
      include: {
        project: true,
      },
    });

    const formattedUnits: PropertyUnitForMatching[] = units.map((u) => ({
      ...u,
      photoGallery: safeParse(u.photoGalleryJson, []),
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
  } catch (error) {
    return handleApiError(error, 'Failed to match properties for lead');
  }
}

