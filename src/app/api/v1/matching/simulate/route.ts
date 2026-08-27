import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { rankMatchingProperties, BuyerRequirementInput, PropertyUnitForMatching } from '@/lib/domain/matching-engine';
import { generateWhatsAppPitchWithAI } from '@/lib/services/gemini-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
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

    const requirement: BuyerRequirementInput = {
      budgetMin: budgetMin ? Number(budgetMin) : null,
      budgetMax: Number(budgetMax),
      bhkPreferences: Array.isArray(bhkPreferences) ? bhkPreferences.map(Number) : [Number(bhkPreferences)],
      targetLocations,
      possessionPreference,
      minCarpetSqft: minCarpetSqft ? Number(minCarpetSqft) : null,
      purpose,
      floorPreference,
    };

    const units = await prisma.propertyUnit.findMany({
      include: {
        project: true,
      },
    });

    const formattedUnits: PropertyUnitForMatching[] = units.map((u) => ({
      ...u,
      photoGallery: JSON.parse(u.photoGalleryJson || '[]'),
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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

