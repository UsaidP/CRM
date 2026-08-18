import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { rankMatchingProperties, BuyerRequirementInput } from '@/lib/domain/matching-engine';

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

    const formattedUnits = units.map((u) => ({
      ...u,
      photoGallery: JSON.parse(u.photoGalleryJson || '[]'),
    }));

    const rankedMatches = rankMatchingProperties(requirement, formattedUnits);

    return NextResponse.json({
      success: true,
      matchCount: rankedMatches.length,
      requirement,
      data: rankedMatches,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
