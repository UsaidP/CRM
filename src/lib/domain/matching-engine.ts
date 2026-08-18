/**
 * Requirements-to-Property Multi-Factor Matching Engine
 * 
 * Rules & Weights:
 * - Hard Disqualifiers (Score = 0%):
 *   1. Budget Ceiling: Total All-In cost (C_all-in) > Budget Max * 1.05 (+5% strict stretch ceiling).
 *   2. BHK Invariant: Property BHK not in buyer's accepted BHK preferences.
 *   3. OC/RTM Invariant: Buyer requires READY_TO_MOVE but property lacks Occupancy Certificate.
 *   4. Staleness Invariant: Property is STALE_EXPIRED (last_verified_at > 14 days ago).
 * 
 * - Weighted Soft Scores (0% to 100%):
 *   - Budget Sweet Spot: 35%
 *   - Carpet Area Sufficiency: 25%
 *   - Metro Line 1 Transit Proximity: 15%
 *   - Possession Timeline Alignment: 15%
 *   - Amenities & Soft Preferences: 10%
 */

import { assessUnitFreshness } from './verification-engine';

export interface BuyerRequirementInput {
  budgetMin?: number | null;
  budgetMax: number;
  bhkPreferences: number[]; // e.g. [1, 2]
  targetLocations?: string[]; // e.g. ["Kharghar Sector 35", "Taloja Phase 1"]
  possessionPreference?: 'READY_TO_MOVE' | 'UNDER_CONSTRUCTION' | 'ANY' | string;
  minCarpetSqft?: number | null;
  loanPreApproved?: boolean;
  purpose?: 'self_use' | 'investment' | string;
  floorPreference?: string; // "high", "middle", "any"
}

export interface PropertyUnitForMatching {
  id: string;
  unitNumber?: string | null;
  bhk: number;
  carpetAreaSqft: number;
  floorNumber: number;
  totalFloors: number;
  agreementValue: number;
  allInTotalCost: number;
  verificationStatus: string;
  lastVerifiedAt: Date | string;
  possessionStatus: string;
  possessionDate?: Date | string | null;
  photoGallery?: string[];
  videoReelUrl?: string | null;
  isHotDeal?: boolean;
  isExclusive?: boolean;
  project: {
    id: string;
    projectName: string;
    developerName: string;
    reraNumber: string;
    microMarket: string;
    distanceToMetroKm?: number | null;
    hasOccupancyCertificate: boolean;
    amenitiesJson?: string;
    brochureUrl?: string | null;
    youtubeWalkthroughUrl?: string | null;
  };
}

export interface MatchScoreBreakdown {
  budgetScore: number;      // 0.0 - 1.0
  carpetScore: number;      // 0.0 - 1.0
  transitScore: number;     // 0.0 - 1.0
  possessionScore: number;  // 0.0 - 1.0
  amenitiesScore: number;   // 0.0 - 1.0
  totalScore: number;       // 0 - 100
  tier: 'PRIME_MATCH' | 'STRONG_ALTERNATIVE' | 'COMPROMISE' | 'DISQUALIFIED';
  disqualificationReason?: string;
  matchingHighlights: string[];
  tradeOffs: string[];
}

export interface RankedPropertyMatch {
  unit: PropertyUnitForMatching;
  score: MatchScoreBreakdown;
}

export function evaluatePropertyMatch(
  requirement: BuyerRequirementInput,
  property: PropertyUnitForMatching
): MatchScoreBreakdown {
  const matchingHighlights: string[] = [];
  const tradeOffs: string[] = [];

  // --- 1. HARD DISQUALIFIERS ---

  // Check 1.1: Staleness decay (> 14 days)
  const freshness = assessUnitFreshness(property.verificationStatus, property.lastVerifiedAt);
  if (freshness.effectiveMarketableStatus === 'STALE_EXPIRED' || freshness.isStale) {
    return {
      budgetScore: 0,
      carpetScore: 0,
      transitScore: 0,
      possessionScore: 0,
      amenitiesScore: 0,
      totalScore: 0,
      tier: 'DISQUALIFIED',
      disqualificationReason: 'Listing unverified for >14 days (Stale Expired). Suppressed from matching.',
      matchingHighlights: [],
      tradeOffs: ['Listing needs broker re-audit'],
    };
  }

  // Check 1.2: Strict Budget Ceiling (+5% limit)
  const maxAllowedBudget = requirement.budgetMax * 1.05;
  if (property.allInTotalCost > maxAllowedBudget) {
    return {
      budgetScore: 0,
      carpetScore: 0,
      transitScore: 0,
      possessionScore: 0,
      amenitiesScore: 0,
      totalScore: 0,
      tier: 'DISQUALIFIED',
      disqualificationReason: `All-in cost (₹${(property.allInTotalCost / 100000).toFixed(1)}L) exceeds buyer max budget ceiling (₹${(requirement.budgetMax / 100000).toFixed(1)}L + 5% stretch).`,
      matchingHighlights: [],
      tradeOffs: ['Over maximum budget ceiling'],
    };
  }

  // Check 1.3: BHK Configuration match
  const acceptableBhks = requirement.bhkPreferences && requirement.bhkPreferences.length > 0 
    ? requirement.bhkPreferences 
    : [1, 2, 3];

  if (!acceptableBhks.includes(property.bhk)) {
    return {
      budgetScore: 0,
      carpetScore: 0,
      transitScore: 0,
      possessionScore: 0,
      amenitiesScore: 0,
      totalScore: 0,
      tier: 'DISQUALIFIED',
      disqualificationReason: `Unit is ${property.bhk} BHK, but buyer strictly requested ${acceptableBhks.join(', ')} BHK.`,
      matchingHighlights: [],
      tradeOffs: ['BHK mismatch'],
    };
  }

  // Check 1.4: Ready-to-Move OC Invariant
  if (
    requirement.possessionPreference === 'READY_TO_MOVE' && 
    !property.project.hasOccupancyCertificate
  ) {
    return {
      budgetScore: 0,
      carpetScore: 0,
      transitScore: 0,
      possessionScore: 0,
      amenitiesScore: 0,
      totalScore: 0,
      tier: 'DISQUALIFIED',
      disqualificationReason: 'Buyer requires Ready-to-Move with OC, but project is Under-Construction.',
      matchingHighlights: [],
      tradeOffs: ['Under-construction (No OC)'],
    };
  }

  // --- 2. WEIGHTED SOFT SCORING (0.0 to 1.0) ---

  // 2.1 Budget Score (35% weight)
  const targetBudget = requirement.budgetMax;
  const budgetDiff = Math.abs(property.allInTotalCost - targetBudget);
  const budgetScore = Math.max(0.2, 1.0 - (budgetDiff / targetBudget));
  
  if (property.allInTotalCost <= requirement.budgetMax) {
    matchingHighlights.push(`₹${((requirement.budgetMax - property.allInTotalCost) / 100000).toFixed(1)}L under max budget`);
  } else {
    tradeOffs.push(`₹${((property.allInTotalCost - requirement.budgetMax) / 100000).toFixed(1)}L slight stretch (+${(((property.allInTotalCost - requirement.budgetMax) / requirement.budgetMax) * 100).toFixed(1)}%)`);
  }

  // 2.2 Carpet Area Score (25% weight)
  const minCarpet = requirement.minCarpetSqft || (property.bhk === 1 ? 400 : property.bhk === 2 ? 600 : 850);
  const carpetRatio = property.carpetAreaSqft / minCarpet;
  const carpetScore = Math.min(1.0, Math.max(0.3, carpetRatio));

  if (property.carpetAreaSqft >= minCarpet) {
    matchingHighlights.push(`Spacious ${property.carpetAreaSqft} sq.ft carpet (${Math.round((carpetRatio - 1) * 100)}% larger than min)`);
  } else {
    tradeOffs.push(`Compact ${property.carpetAreaSqft} sq.ft carpet`);
  }

  // 2.3 Transit / Metro Line 1 Score (15% weight)
  const metroDist = property.project.distanceToMetroKm ?? 1.5;
  let transitScore = 0.5;
  if (metroDist <= 0.5) {
    transitScore = 1.0;
    matchingHighlights.push(`Prime Metro TOD: ${metroDist} km (${Math.round(metroDist * 12)} min walk)`);
  } else if (metroDist <= 1.0) {
    transitScore = 0.85;
    matchingHighlights.push(`Near Metro Station: ${metroDist} km`);
  } else {
    transitScore = Math.max(0.3, 1.0 - (metroDist * 0.15));
    tradeOffs.push(`${metroDist} km from nearest Metro station`);
  }

  // 2.4 Possession Timeline Score (15% weight)
  let possessionScore = 0.7;
  if (property.project.hasOccupancyCertificate) {
    possessionScore = 1.0;
    matchingHighlights.push('🟢 Ready to Move (0% GST • Immediate OC)');
  } else if (requirement.possessionPreference === 'UNDER_CONSTRUCTION' || requirement.possessionPreference === 'ANY') {
    possessionScore = 0.9;
    matchingHighlights.push('Under Construction (Stage-linked payment flexibility)');
  } else {
    possessionScore = 0.6;
    tradeOffs.push('Under-construction delivery timeline');
  }

  // 2.5 Amenities & Soft Preferences Score (10% weight)
  let amenitiesScore = 0.8;
  if (property.floorNumber >= 8) {
    amenitiesScore += 0.1;
    matchingHighlights.push(`High Floor (${property.floorNumber}th) with panoramic views`);
  }
  if (property.isHotDeal) {
    amenitiesScore += 0.1;
    matchingHighlights.push('⭐ Featured Broker Hot Deal');
  }
  amenitiesScore = Math.min(1.0, amenitiesScore);

  // --- 3. AGGREGATED MATCH PERCENTAGE ---
  const weightedSum = (
    (budgetScore * 0.35) +
    (carpetScore * 0.25) +
    (transitScore * 0.15) +
    (possessionScore * 0.15) +
    (amenitiesScore * 0.10)
  );

  const totalScore = Number((weightedSum * 100).toFixed(1));

  let tier: 'PRIME_MATCH' | 'STRONG_ALTERNATIVE' | 'COMPROMISE' | 'DISQUALIFIED' = 'COMPROMISE';
  if (totalScore >= 88.0) {
    tier = 'PRIME_MATCH';
  } else if (totalScore >= 74.0) {
    tier = 'STRONG_ALTERNATIVE';
  }

  return {
    budgetScore: Number(budgetScore.toFixed(2)),
    carpetScore: Number(carpetScore.toFixed(2)),
    transitScore: Number(transitScore.toFixed(2)),
    possessionScore: Number(possessionScore.toFixed(2)),
    amenitiesScore: Number(amenitiesScore.toFixed(2)),
    totalScore,
    tier,
    matchingHighlights,
    tradeOffs,
  };
}

export function rankMatchingProperties(
  requirement: BuyerRequirementInput,
  properties: PropertyUnitForMatching[]
): RankedPropertyMatch[] {
  const evaluated = properties.map((unit) => ({
    unit,
    score: evaluatePropertyMatch(requirement, unit),
  }));

  // Filter out disqualified units and sort by highest totalScore
  return evaluated
    .filter((m) => m.score.tier !== 'DISQUALIFIED' && m.score.totalScore > 0)
    .sort((a, b) => b.score.totalScore - a.score.totalScore);
}
