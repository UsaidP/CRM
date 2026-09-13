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

export interface ReraValidationResult {
  isValid: boolean;
  normalized?: string;
  raw?: string;
  formatType?: 'MAHARERA_PROJECT' | 'MAHARERA_AGENT' | 'NATIONAL_RERA' | 'INVALID';
  state?: string;
  authority?: string;
  entityType?: 'PROJECT' | 'AGENT' | 'OTHER';
  districtCode?: string;
  districtName?: string;
  officialPortalUrl?: string;
  directSearchUrl?: string;
  error?: string;
}

export const MAHARERA_DISTRICTS: Record<string, string> = {
  '517': 'Thane (Kalyan, Dombivli, Mira-Bhayandar, Thane City)',
  '518': 'Mumbai Suburban (Bandra, Andheri, Borivali, Goregaon)',
  '519': 'Mumbai City (South Mumbai, Worli, Dadar)',
  '520': 'Raigad / Navi Mumbai (Kharghar, Panvel, Ulwe, Taloja, Dronagiri)',
  '521': 'Pune (Hinjawadi, Wakad, Baner, Kharadi, Pimpri-Chinchwad)',
  '522': 'Palghar (Vasai, Virar, Nalasopara, Boisar)',
  '523': 'Ratnagiri',
  '524': 'Nashik',
  '525': 'Ahmednagar',
  '526': 'Solapur',
  '527': 'Satara',
  '528': 'Nagpur',
  '529': 'Chhatrapati Sambhaji Nagar (Aurangabad)',
  '530': 'Kolhapur',
  '531': 'Sangli',
  '532': 'Jalgaon',
  '533': 'Dhule',
  '534': 'Nanded',
  '535': 'Latur',
  '536': 'Amravati',
  '537': 'Akola',
  '538': 'Chandrapur',
  '539': 'Parbhani',
  '540': 'Beed',
  '541': 'Yavatmal',
  '542': 'Jalna',
  '543': 'Gondia',
  '544': 'Wardha',
  '545': 'Buldhana',
  '546': 'Bhandara',
  '547': 'Washim',
  '548': 'Hingoli',
  '549': 'Gadchiroli',
  '550': 'Nandurbar',
  '551': 'Sindhudurg',
  '990': 'Daman & Diu / Multi-District Special Zone',
};

export const MAHARERA_PORTAL_SEARCH_URL = 'https://maharera.maharashtra.gov.in/projects-search-result';
export const MAHARERA_AGENT_SEARCH_URL = 'https://maharera.maharashtra.gov.in/agents-search-result';
export const MAHARERA_PORTAL_BASE_URL = 'https://maharera.maharashtra.gov.in';

export function validateReraNumber(reraNumber: string): ReraValidationResult {
  if (!reraNumber || typeof reraNumber !== 'string') {
    return {
      isValid: false,
      raw: reraNumber || '',
      formatType: 'INVALID',
      error: 'MahaRERA registration number is required.',
    };
  }

  // Sanitize input: Remove common compound lead labels like "MahaRERA Reg No:", "RERA ID:", "Registration No:", colons, spaces, dashes
  let cleaned = reraNumber.trim().toUpperCase();
  cleaned = cleaned.replace(/^(?:MAHARERA|RERA|REGISTRATION|REG|NUMBER|NUM|NO|ID|BROKER|CERTIFICATE|PROJECT|PRJ|[:\s.#/-])+/gi, '');
  cleaned = cleaned.replace(/[\s-]+/g, '');

  if (!cleaned || cleaned.length < 8) {
    return {
      isValid: false,
      raw: reraNumber,
      formatType: 'INVALID',
      error: 'RERA registration number must be at least 8 alphanumeric characters.',
    };
  }

  // 1. MahaRERA Project Format: P followed by 11 digits (e.g. P52000028714)
  const mahaReraProjectRegex = /^P([0-9]{3})[0-9]{8}$/;
  const mahaProjectMatch = cleaned.match(mahaReraProjectRegex);

  if (mahaProjectMatch) {
    const districtCode = mahaProjectMatch[1];
    const districtName = MAHARERA_DISTRICTS[districtCode] || `Maharashtra District (${districtCode})`;

    return {
      isValid: true,
      normalized: cleaned,
      raw: reraNumber,
      formatType: 'MAHARERA_PROJECT',
      state: 'Maharashtra',
      authority: 'MahaRERA (Maharashtra Real Estate Regulatory Authority)',
      entityType: 'PROJECT',
      districtCode,
      districtName,
      officialPortalUrl: MAHARERA_PORTAL_BASE_URL,
      directSearchUrl: `${MAHARERA_PORTAL_SEARCH_URL}?rera=${cleaned}`,
    };
  }

  // 2. MahaRERA Agent / Broker Format: A followed by 11 digits (e.g. A52000029381) or R-517...
  const mahaReraAgentRegex = /^[AR]([0-9]{3})[0-9]{8}$/;
  const mahaAgentMatch = cleaned.match(mahaReraAgentRegex);

  if (mahaAgentMatch) {
    const districtCode = mahaAgentMatch[1];
    const districtName = MAHARERA_DISTRICTS[districtCode] || `Maharashtra District (${districtCode})`;

    return {
      isValid: true,
      normalized: cleaned,
      raw: reraNumber,
      formatType: 'MAHARERA_AGENT',
      state: 'Maharashtra',
      authority: 'MahaRERA (Maharashtra Real Estate Regulatory Authority)',
      entityType: 'AGENT',
      districtCode,
      districtName,
      officialPortalUrl: MAHARERA_PORTAL_BASE_URL,
      directSearchUrl: `${MAHARERA_AGENT_SEARCH_URL}?rera=${cleaned}`,
    };
  }

  // 3. Indian State RERA Formats (Karnataka, UP, Haryana, Gujarat, Telangana, Delhi, etc.)
  // Format examples: PRM/KA/RERA/1251/310/PR/..., UPRERAPRJ12345, HRERA-PKL-123-2021, PR/GJ/...
  const nationalReraRegex = /^(?:PRM\/[A-Z]{2}\/RERA\/[A-Z0-9/_-]+|UPRERA[A-Z0-9]+|HRERA[A-Z0-9/_-]+|PR\/[A-Z]{2}\/[A-Z0-9/_-]+|TSRERA[A-Z0-9/_-]+|DLRERA[A-Z0-9/_-]+|RERA\-[A-Z]{2}\-[A-Z0-9/_-]+|[A-Z]{2,4}\/PRJ\/[0-9]{4,16})$/i;

  if (nationalReraRegex.test(cleaned)) {
    let state = 'India (Inter-State RERA)';
    let authority = 'State Real Estate Regulatory Authority';
    let portalUrl = MAHARERA_PORTAL_BASE_URL;

    if (cleaned.includes('KA') || cleaned.startsWith('PRM/KA')) {
      state = 'Karnataka';
      authority = 'K-RERA (Karnataka Real Estate Regulatory Authority)';
      portalUrl = 'https://rera.karnataka.gov.in';
    } else if (cleaned.startsWith('UPRERA') || cleaned.includes('UP')) {
      state = 'Uttar Pradesh';
      authority = 'UP RERA';
      portalUrl = 'https://www.up-rera.in';
    } else if (cleaned.includes('HRERA') || cleaned.startsWith('HR')) {
      state = 'Haryana';
      authority = 'HARERA (Haryana Real Estate Regulatory Authority)';
      portalUrl = 'https://haryanarera.gov.in';
    } else if (cleaned.includes('GJ') || cleaned.startsWith('PR/GJ')) {
      state = 'Gujarat';
      authority = 'GujRERA (Gujarat Real Estate Regulatory Authority)';
      portalUrl = 'https://gujrera.gujarat.gov.in';
    } else if (cleaned.startsWith('TSRERA') || cleaned.startsWith('P024')) {
      state = 'Telangana';
      authority = 'TSRERA';
      portalUrl = 'https://rera.telangana.gov.in';
    }

    return {
      isValid: true,
      normalized: cleaned,
      raw: reraNumber,
      formatType: 'NATIONAL_RERA',
      state,
      authority,
      entityType: cleaned.includes('AGT') || cleaned.includes('AG') ? 'AGENT' : 'PROJECT',
      officialPortalUrl: portalUrl,
      directSearchUrl: portalUrl,
    };
  }

  return {
    isValid: false,
    normalized: cleaned,
    raw: reraNumber,
    formatType: 'INVALID',
    error: 'Invalid RERA format. Official MahaRERA project ID format is "P" followed by 11 digits (e.g. P52000028714).',
  };
}

export const RERA_STATUTORY_PLOT_THRESHOLD_SQM = 500;
export const RERA_STATUTORY_PLOT_THRESHOLD_SQFT = 5381.96; // 500 * 10.7639

export type ReraComplianceStatus =
  | 'VERIFIED'
  | 'EXEMPT_PLOT_UNDER_500'
  | 'MANDATORY_MISSING'
  | 'NOT_UPDATED';

export interface ReraComplianceAssessment {
  status: ReraComplianceStatus;
  isCompliant: boolean;
  isMandatory: boolean;
  isExempt: boolean;
  badgeLabel: string;
  badgeTone: 'emerald' | 'amber' | 'rose' | 'slate';
  description: string;
  legalBasis?: string;
  validation?: ReraValidationResult;
  plotSizeSqMeters?: number | null;
  plotSizeSqFt?: number | null;
}

/**
 * Evaluates MahaRERA statutory registration compliance under Section 3(2)(a).
 * - Plot size > 500 sq.m: Registration is COMPULSORY.
 * - Plot size <= 500 sq.m: Statutory EXEMPTION (registration not required).
 * - Plot size unspecified & no RERA: Permitted with "RERA Not Updated" advisory flag.
 */
export function checkReraCompliance(params: {
  reraNumber?: string | null;
  plotSizeSqMeters?: number | null;
  plotSizeSqFt?: number | null;
}): ReraComplianceAssessment {
  const { reraNumber, plotSizeSqMeters, plotSizeSqFt } = params;
  const cleanRera = (reraNumber || '').trim();

  let effectiveSqm = typeof plotSizeSqMeters === 'number' && plotSizeSqMeters > 0 ? plotSizeSqMeters : null;
  let effectiveSqft = typeof plotSizeSqFt === 'number' && plotSizeSqFt > 0 ? plotSizeSqFt : null;

  if (effectiveSqm && !effectiveSqft) {
    effectiveSqft = Math.round(effectiveSqm * 10.7639 * 100) / 100;
  } else if (effectiveSqft && !effectiveSqm) {
    effectiveSqm = Math.round((effectiveSqft / 10.7639) * 100) / 100;
  }

  const isMandatory = effectiveSqm !== null && effectiveSqm > RERA_STATUTORY_PLOT_THRESHOLD_SQM;
  const isExempt = effectiveSqm !== null && effectiveSqm <= RERA_STATUTORY_PLOT_THRESHOLD_SQM;

  if (cleanRera.length > 0) {
    const validation = validateReraNumber(cleanRera);
    if (validation.isValid) {
      return {
        status: 'VERIFIED',
        isCompliant: true,
        isMandatory,
        isExempt: false,
        badgeLabel: 'MahaRERA Verified',
        badgeTone: 'emerald',
        description: `Officially registered under MahaRERA (${validation.normalized}).`,
        validation,
        plotSizeSqMeters: effectiveSqm,
        plotSizeSqFt: effectiveSqft,
      };
    }
  }

  if (isMandatory) {
    return {
      status: 'MANDATORY_MISSING',
      isCompliant: false,
      isMandatory: true,
      isExempt: false,
      badgeLabel: 'RERA Compulsory • Missing',
      badgeTone: 'rose',
      description: `Plot size (${effectiveSqm} sq.m / ${effectiveSqft} sq.ft) exceeds 500 sq.m. MahaRERA registration is legally mandatory under Section 3(2)(a).`,
      legalBasis: 'RERA Act 2016, Section 3(2)(a)',
      plotSizeSqMeters: effectiveSqm,
      plotSizeSqFt: effectiveSqft,
    };
  }

  if (isExempt) {
    return {
      status: 'EXEMPT_PLOT_UNDER_500',
      isCompliant: true,
      isMandatory: false,
      isExempt: true,
      badgeLabel: 'RERA Exempt (Plot ≤ 500 sq.m)',
      badgeTone: 'emerald',
      description: `Plot size (${effectiveSqm} sq.m / ${effectiveSqft} sq.ft) is within the statutory 500 sq.m threshold. RERA registration is optional.`,
      legalBasis: 'RERA Act 2016, Section 3(2)(a)',
      plotSizeSqMeters: effectiveSqm,
      plotSizeSqFt: effectiveSqft,
    };
  }

  return {
    status: 'NOT_UPDATED',
    isCompliant: true,
    isMandatory: false,
    isExempt: false,
    badgeLabel: 'RERA Not Updated',
    badgeTone: 'amber',
    description: 'MahaRERA registration number has not been recorded yet. Permitted for preliminary marketing.',
    plotSizeSqMeters: effectiveSqm,
    plotSizeSqFt: effectiveSqft,
  };
}

export function canTransitionStatus(
  currentStatus: VerificationStatus,
  targetStatus: VerificationStatus,
  hasValidRera: boolean,
  isReraExempt: boolean = false,
  isMandatoryViolation: boolean = false
): { allowed: boolean; reason?: string } {
  if (targetStatus === 'ACTIVE_MARKETABLE' && isMandatoryViolation) {
    return {
      allowed: false,
      reason: 'Cannot activate listing: Plot size exceeds 500 sq.m where MahaRERA registration is legally compulsory.',
    };
  }

  if (targetStatus === currentStatus) {
    return { allowed: true }; // Re-verification / Refresh timestamp
  }

  // Allowed transitions
  const allowedMap: Record<VerificationStatus, VerificationStatus[]> = {
    DRAFT: ['RERA_VERIFIED', 'PHYSICALLY_AUDITED', 'ACTIVE_MARKETABLE', 'ARCHIVED_SOLD'],
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
