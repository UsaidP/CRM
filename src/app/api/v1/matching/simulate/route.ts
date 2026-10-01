import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { rankMatchingProperties, BuyerRequirementInput, PropertyUnitForMatching } from '@/lib/domain/matching-engine';
import { generateWhatsAppPitchWithAI } from '@/lib/services/gemini-service';
import { requireSession, orgScope } from '@/lib/services/api-auth';
import { handleApiError } from '@/lib/services/api-handler';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const {
      budgetMax,
      budgetMin,
      bhkPreferences = [2],
      targetLocations = [],
      possessionPreference = 'ANY',
      minCarpetSqft,
      purpose = 'self_use',
      floorPreference = 'any',
      clientName = 'Valued Home Buyer',
      generateAiPitch = false,
    } = body;

    if (!budgetMax || Number(budgetMax) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid budgetMax is required for matching' },
        { status: 400 }
      );
    }

    if (
      targetLocations !== undefined &&
      (!Array.isArray(targetLocations) || !targetLocations.every((loc: unknown) => typeof loc === 'string'))
    ) {
      return NextResponse.json(
        { success: false, error: 'targetLocations must be an array of strings' },
        { status: 400 }
      );
    }

    if (
      bhkPreferences !== undefined &&
      !(
        (typeof bhkPreferences === 'number' && Number.isFinite(bhkPreferences)) ||
        (Array.isArray(bhkPreferences) &&
          bhkPreferences.every((b: unknown) => typeof b === 'number' && Number.isFinite(b)))
      )
    ) {
      return NextResponse.json(
        { success: false, error: 'bhkPreferences must be a number or an array of numbers' },
        { status: 400 }
      );
    }

    const requirement: BuyerRequirementInput = {
      budgetMin: budgetMin ? Number(budgetMin) : null,
      budgetMax: Number(budgetMax),
      bhkPreferences: Array.isArray(bhkPreferences) ? bhkPreferences.map(Number) : [Number(bhkPreferences)],
      targetLocations: targetLocations || [],
      possessionPreference,
      minCarpetSqft: minCarpetSqft ? Number(minCarpetSqft) : null,
      purpose,
      floorPreference,
    };

    const safeParse = <T>(str: string | null | undefined, fallback: T): T => {
      if (!str) return fallback;
      try { return JSON.parse(str); } catch { return fallback; }
    };

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

    const rankedMatches = rankMatchingProperties(requirement, formattedUnits);

    let aiPitch = null;
    if (generateAiPitch && rankedMatches.length > 0) {
      try {
        const topUnits = rankedMatches.slice(0, 3).map((m) => m.unit);
        aiPitch = await generateWhatsAppPitchWithAI(clientName, requirement, topUnits);
      } catch (err) {
        console.warn('Simulation AI pitch generation skipped:', err);
      }
    }

    return NextResponse.json({
      success: true,
      matchCount: rankedMatches.length,
      requirement,
      aiPitch,
      data: rankedMatches,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to simulate matching properties');
  }
}

