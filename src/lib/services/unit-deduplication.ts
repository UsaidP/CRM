import { calculateAllInCost } from '@/lib/domain/cost-calculator';
import type { ExtractedBrochureUnit } from './brochure-parser-service';

export interface DeduplicateUnitsOptions {
  totalFloors?: number;
  basePricePerSqft?: number;
  hasOccupancyCertificate?: boolean;
  projectName?: string;
  carpetToleranceSqft?: number; // default ±5 sq.ft
}

/**
 * Deduplicates raw real estate flat entries into strictly ONE record per distinct configuration.
 *
 * A configuration is distinct if:
 * - Different BHK (e.g. 1 BHK vs 2 BHK)
 * - Different usable RERA carpet area (outside ±5 sq.ft tolerance)
 *
 * All flats sharing the same configuration are collapsed into one canonical unit record
 * with combined flat counts, series labels, 40% builder loading, and statutory GST costs.
 */
export function deduplicateUnitsByConfiguration(
  rawUnits: any[],
  options: DeduplicateUnitsOptions = {}
): ExtractedBrochureUnit[] {
  if (!Array.isArray(rawUnits) || rawUnits.length === 0) {
    return [];
  }

  const {
    totalFloors = 7,
    basePricePerSqft = 0,
    hasOccupancyCertificate = false,
    projectName = 'Project',
    carpetToleranceSqft = 5,
  } = options;

  interface ConfigCluster {
    bhk: number;
    carpetAreaSqft: number;
    bathrooms: number;
    balconies: number;
    floorNumber: number;
    totalFloors: number;
    facing: string;
    flatNumbers: string[];
    count: number;
    possessionStatus: string;
    floorPlanUrl?: string | null;
    rawUnits: any[];
    agreementValue: number;
    descriptions: string[];
    highlights: string[];
  }

  const clusters: ConfigCluster[] = [];

  for (const u of rawUnits) {
    let rawCarpet = Number(u.carpet_area_sqft || u.carpetAreaSqft) || 0;
    const bhk = Number(u.bhk) || (u.bhkLabel?.match(/(\d+)\s*BHK/i)?.[1] ? parseInt(u.bhkLabel.match(/(\d+)\s*BHK/i)[1], 10) : 1);

    // If no carpet area was explicitly printed on the floor plan drawing, default to standard realistic carpet for this typology
    if (rawCarpet <= 0) {
      if (bhk === 1) rawCarpet = 420;
      else if (bhk === 2) rawCarpet = 650;
      else if (bhk === 3) rawCarpet = 950;
      else if (bhk >= 4) rawCarpet = 1350;
      else rawCarpet = 400;
    }
    const normalizedCarpet = Math.round(rawCarpet);
    const flatNo = String(u.unit_number || u.unitNumber || u.flatNumber || u.flat_number || '').trim();
    const facing = (u.orientation || u.facing || 'EAST').trim();
    const floorPlanUrl = u.floorPlanUrl || u.floor_plan_url || null;
    const unitCount = Number(u.totalUnitsCount) || 1;
    const bathrooms = Number(u.bathrooms) || (bhk >= 2 ? 2 : 1);
    const balconies = Number(u.balconies) || (bhk >= 2 ? 2 : 1);
    const floorNumber = Number(u.floorNumber) || Math.min(totalFloors, Math.max(1, bhk === 1 ? 1 : 2));
    const possessionStatus = u.possessionStatus || (hasOccupancyCertificate ? 'READY_TO_MOVE' : 'UNDER_CONSTRUCTION');
    const agreementValue = Number(u.agreementValue) || 0;

    // Find existing cluster within ±5 sq.ft tolerance for this BHK
    let matchedCluster = clusters.find(
      (c) => c.bhk === bhk && Math.abs(c.carpetAreaSqft - normalizedCarpet) <= carpetToleranceSqft
    );

    if (!matchedCluster) {
      matchedCluster = {
        bhk,
        carpetAreaSqft: normalizedCarpet,
        bathrooms,
        balconies,
        floorNumber,
        totalFloors,
        facing,
        flatNumbers: flatNo ? [flatNo] : [],
        count: unitCount,
        possessionStatus,
        floorPlanUrl,
        rawUnits: [u],
        agreementValue,
        descriptions: [u.description].filter(Boolean),
        highlights: Array.isArray(u.featureHighlights) ? [...u.featureHighlights] : [],
      };
      clusters.push(matchedCluster);
    } else {
      matchedCluster.count += unitCount;
      matchedCluster.rawUnits.push(u);
      if (flatNo && !matchedCluster.flatNumbers.includes(flatNo)) {
        matchedCluster.flatNumbers.push(flatNo);
      }
      if (floorPlanUrl && !matchedCluster.floorPlanUrl) {
        matchedCluster.floorPlanUrl = floorPlanUrl;
      }
      if (agreementValue > 0 && matchedCluster.agreementValue === 0) {
        matchedCluster.agreementValue = agreementValue;
      }
      if (u.description && !matchedCluster.descriptions.includes(u.description)) {
        matchedCluster.descriptions.push(u.description);
      }
      if (Array.isArray(u.featureHighlights)) {
        for (const h of u.featureHighlights) {
          if (!matchedCluster.highlights.includes(h)) {
            matchedCluster.highlights.push(h);
          }
        }
      }
    }
  }

  // Sort clusters by BHK ascending, then carpet area ascending
  clusters.sort((a, b) => {
    if (a.bhk !== b.bhk) return a.bhk - b.bhk;
    return a.carpetAreaSqft - b.carpetAreaSqft;
  });

  // Assign sequential config letters per BHK (1 BHK Config A, 1 BHK Config B...)
  const bhkConfigCounters: Record<number, number> = {};

  return clusters.map((cluster) => {
    const bhk = cluster.bhk;
    bhkConfigCounters[bhk] = (bhkConfigCounters[bhk] || 0) + 1;
    const configLetter = String.fromCharCode(64 + bhkConfigCounters[bhk]); // A, B, C...

    const carpetAreaSqft = cluster.carpetAreaSqft;
    const floorNumber = cluster.floorNumber;

    // Calculate agreement value if not specified
    let agreementValue = cluster.agreementValue;
    if (agreementValue <= 0 && basePricePerSqft > 0) {
      agreementValue = Math.round(carpetAreaSqft * basePricePerSqft);
    }

    // Cost calculation with 1% GST <= 45L, 5% > 45L, and 40% builder loading
    const costBreakdown = calculateAllInCost({
      agreementValue,
      floorNumber,
      carpetAreaSqft,
      hasOccupancyCertificate,
      parkingCharges: 250000,
      societyDevCharges: 150000,
      builderLoadingPercentage: 40,
    });

    // Clean representative flat / series label
    let seriesOrFlatNumbers = '';
    if (cluster.flatNumbers.length > 0) {
      if (cluster.flatNumbers.length <= 4) {
        seriesOrFlatNumbers = cluster.flatNumbers.join(', ');
      } else {
        seriesOrFlatNumbers = `${cluster.flatNumbers.slice(0, 3).join(', ')} +${cluster.flatNumbers.length - 3} more (${cluster.count} flats)`;
      }
    } else {
      seriesOrFlatNumbers = `Config ${configLetter} Series (${cluster.count} unit${cluster.count > 1 ? 's' : ''})`;
    }

    const bhkLabel = `${bhk} BHK • ${carpetAreaSqft} sq.ft (Config ${configLetter})`;
    const unitNumber = `${bhk}BHK-${configLetter} (${carpetAreaSqft} sqft)`;

    const highlights: string[] = [
      `${carpetAreaSqft} sq.ft Usable RERA Carpet Area`,
      `${costBreakdown.saleableAreaSqft} sq.ft Saleable Area (40% Loading)`,
      `Available across typical floors (Total ${cluster.totalFloors || totalFloors} Storeys)`,
    ];
    if (seriesOrFlatNumbers) {
      highlights.push(`Represented Flats: ${seriesOrFlatNumbers}`);
    }

    return {
      unitNumber,
      bhk,
      bhkLabel,
      carpetAreaSqft,
      saleableAreaSqft: costBreakdown.saleableAreaSqft,
      builtUpAreaSqft: costBreakdown.builtUpAreaSqft,
      loadingPercentage: 40,
      seriesOrFlatNumbers,
      totalUnitsCount: cluster.count,
      bathrooms: cluster.bathrooms,
      balconies: cluster.balconies,
      floorNumber,
      totalFloors: cluster.totalFloors || totalFloors,
      facing: (cluster.facing as any) || 'EAST',
      agreementValue,
      stampDutyRate: costBreakdown.stampDutyRate,
      stampDutyAmount: costBreakdown.stampDutyAmount,
      registrationFee: costBreakdown.registrationFee,
      gstRate: costBreakdown.gstRate,
      gstAmount: costBreakdown.gstAmount,
      parkingCharges: costBreakdown.parkingCharges,
      societyDevelopmentCharges: costBreakdown.societyDevCharges,
      allInTotalCost: costBreakdown.totalAllInCost,
      possessionStatus: (cluster.possessionStatus as any) || (hasOccupancyCertificate ? 'READY_TO_MOVE' : 'UNDER_CONSTRUCTION'),
      floorPlanUrl: cluster.floorPlanUrl || null,
      description: `${bhk} BHK residential apartment (${carpetAreaSqft} sq.ft usable carpet, ${costBreakdown.saleableAreaSqft} sq.ft saleable at 40% loading) in ${projectName}.`,
      featureHighlights: highlights,
    };
  });
}
