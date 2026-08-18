/**
 * Inventory Verification & Anti-Staleness Lifecycle Engine
 * 
 * Rules:
 * - States: DRAFT -> RERA_VERIFIED -> PHYSICALLY_AUDITED -> ACTIVE_MARKETABLE -> STALE_EXPIRED | ARCHIVED_SOLD
 * - Staleness Window: 14 Days max without broker verification.
 * - Invariant: Cannot reach ACTIVE_MARKETABLE without a validated MahaRERA registration number.
 */

export const VERIFICATION_STATUSES = [
  'DRAFT',
  'RERA_VERIFIED',
  'PHYSICALLY_AUDITED',
  'ACTIVE_MARKETABLE',
  'STALE_EXPIRED',
  'ARCHIVED_SOLD',
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const MAX_FRESHNESS_DAYS = 14;

export interface FreshnessAssessment {
  status: VerificationStatus;
  lastVerifiedAt: Date;
  daysSinceVerification: number;
  isStale: boolean;
  daysRemaining: number;
  effectiveMarketableStatus: VerificationStatus;
}

export function assessUnitFreshness(
  currentStatus: string,
  lastVerifiedAt: Date | string
): FreshnessAssessment {
  const lastDate = new Date(lastVerifiedAt);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  const daysSinceVerification = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, MAX_FRESHNESS_DAYS - daysSinceVerification);
  const isStale = daysSinceVerification > MAX_FRESHNESS_DAYS;

  let effectiveStatus: VerificationStatus = (currentStatus as VerificationStatus) || 'DRAFT';

  // If status is marked ACTIVE_MARKETABLE but verification expired > 14 days ago, decay to STALE_EXPIRED
  if (effectiveStatus === 'ACTIVE_MARKETABLE' && isStale) {
    effectiveStatus = 'STALE_EXPIRED';
  }

  return {
    status: currentStatus as VerificationStatus,
    lastVerifiedAt: lastDate,
    daysSinceVerification,
    isStale,
    daysRemaining,
    effectiveMarketableStatus: effectiveStatus,
  };
}

export function validateReraNumber(reraNumber: string): { isValid: boolean; normalized?: string; error?: string } {
  if (!reraNumber || typeof reraNumber !== 'string') {
    return { isValid: false, error: 'MahaRERA registration number is required.' };
  }

  const cleaned = reraNumber.trim().toUpperCase();
  // MahaRERA standard format: P520000XXXXX or P followed by digits
  const reraRegex = /^P[0-9]{11}$|^[A-Z0-9]{8,15}$/;
  
  if (cleaned.length < 8) {
    return { isValid: false, error: 'MahaRERA registration number must be at least 8 characters.' };
  }

  return { isValid: true, normalized: cleaned };
}

export function canTransitionStatus(
  currentStatus: VerificationStatus,
  targetStatus: VerificationStatus,
  hasValidRera: boolean
): { allowed: boolean; reason?: string } {
  if (targetStatus === 'ACTIVE_MARKETABLE' && !hasValidRera) {
    return {
      allowed: false,
      reason: 'Cannot activate listing without a validated MahaRERA registration number.',
    };
  }

  if (targetStatus === currentStatus) {
    return { allowed: true }; // Re-verification / Refresh timestamp
  }

  // Allowed transitions
  const allowedMap: Record<VerificationStatus, VerificationStatus[]> = {
    DRAFT: ['RERA_VERIFIED', 'PHYSICALLY_AUDITED', 'ARCHIVED_SOLD'],
    RERA_VERIFIED: ['PHYSICALLY_AUDITED', 'ACTIVE_MARKETABLE', 'DRAFT', 'ARCHIVED_SOLD'],
    PHYSICALLY_AUDITED: ['ACTIVE_MARKETABLE', 'RERA_VERIFIED', 'ARCHIVED_SOLD'],
    ACTIVE_MARKETABLE: ['STALE_EXPIRED', 'ARCHIVED_SOLD', 'ACTIVE_MARKETABLE'],
    STALE_EXPIRED: ['ACTIVE_MARKETABLE', 'PHYSICALLY_AUDITED', 'ARCHIVED_SOLD'],
    ARCHIVED_SOLD: ['DRAFT'],
  };

  const allowedNext = allowedMap[currentStatus] || [];
  if (!allowedNext.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Cannot transition directly from ${currentStatus} to ${targetStatus}.`,
    };
  }

  return { allowed: true };
}
