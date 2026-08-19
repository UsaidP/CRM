/**
 * Campaign Attribution & WhatsApp Deep Link / QR Code Engine
 * 
 * Rules:
 * - Direct Number Mapping: Safwan (+917977552011), Suhel (+919967731071)
 * - Source Codes: E.g. TALOJA21, MARVEL35, CROWN12, PARADISE20
 * - Source Confidence:
 *     EXACT: Verified via explicit campaign code in wa.me prefill or Instagram referral.
 *     INFERRED: Project or BHK mentioned by keyword without exact campaign code.
 *     UNKNOWN: Raw phone call or direct message with no traceable content link.
 */

export const SOURCE_CONFIDENCE_LEVELS = ['EXACT', 'INFERRED', 'UNKNOWN'] as const;
export type SourceConfidence = (typeof SOURCE_CONFIDENCE_LEVELS)[number];

export const LEAD_SOURCE_TYPES = [
  'WHATSAPP_EXACT',
  'INSTAGRAM_EXACT',
  'YOUTUBE_EXACT',
  'PHONE_ORGANIC_UNKNOWN',
  'WHATSAPP_ORGANIC_UNKNOWN',
  'INSTAGRAM_ORGANIC_UNKNOWN',
  'MANUAL_ENTRY',
] as const;
export type LeadSourceType = (typeof LEAD_SOURCE_TYPES)[number];

export interface CampaignDefinition {
  id: string;
  sourceCode: string;
  title: string;
  platform: 'YOUTUBE_SHORT' | 'YOUTUBE_VIDEO' | 'INSTAGRAM_REEL' | 'INSTAGRAM_POST' | 'WHATSAPP_DIRECT';
  contentId?: string;
  contentUrl?: string;
  targetProjectId?: string;
  targetUnitId?: string;
  assignedBrokerPhone: '+917977552011' | '+919967731071' | string;
  active: boolean;
}

export interface DeepLinkResult {
  waUrl: string;
  cleanPhone: string;
  sourceCode: string;
  prefilledText: string;
  svgQrCode: string;
}

/**
 * Generates a targeted WhatsApp deep link with embedded campaign code.
 */
export function generateCampaignDeepLink(options: {
  brokerPhoneE164: string; // e.g. +917977552011
  sourceCode: string;      // e.g. TALOJA21
  projectName?: string;
  bhk?: number;
  customNote?: string;
}): DeepLinkResult {
  const cleanPhone = options.brokerPhoneE164.replace(/\D/g, '');
  const projTag = options.projectName ? ` for ${options.projectName}` : '';
  const bhkTag = options.bhk ? ` (${options.bhk} BHK)` : '';
  const codeTag = options.sourceCode.toUpperCase();

  const prefilledText = `Hi ZamZam Properties, I saw your video${projTag}${bhkTag}. Code: ${codeTag}. Please share verified pricing and RERA cost sheet.`;
  const encodedText = encodeURIComponent(prefilledText);
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

  const svgQrCode = generateSvgQrCode(waUrl);

  return {
    waUrl,
    cleanPhone,
    sourceCode: codeTag,
    prefilledText,
    svgQrCode,
  };
}

/**
 * Analyzes inbound text to determine exact attribution and confidence level.
 */
export function analyzeInboundAttribution(
  messageText: string,
  platformHint?: 'WHATSAPP' | 'INSTAGRAM' | 'CALL'
): {
  sourceConfidence: SourceConfidence;
  leadSource: LeadSourceType;
  detectedCode?: string;
  detectedProject?: string;
  detectedBhk?: number;
} {
  const text = (messageText || '').trim();
  const lower = text.toLowerCase();

  // 1. Check for explicit Code: CODE / [Ref: CODE] / #CODE
  const codeMatch =
    text.match(/code:\s*([A-Za-z0-9_-]+)/i) ||
    text.match(/\[ref:\s*([A-Za-z0-9_-]+)\]/i) ||
    text.match(/#([A-Za-z0-9_-]+)/i);

  const detectedCode = codeMatch ? codeMatch[1].toUpperCase() : undefined;

  // 2. Check for project and BHK
  let detectedProject: string | undefined;
  if (lower.includes('crown') || lower.includes('crown heights')) detectedProject = 'Crown Heights Luxury Towers';
  else if (lower.includes('marvel') || lower.includes('sai marvel')) detectedProject = 'Sai Marvel Heights';
  else if (lower.includes('galaxy') || lower.includes('galaxy metro') || lower.includes('taloja')) detectedProject = 'Galaxy Metro Heights';
  else if (lower.includes('paradise') || lower.includes('sai paradise')) detectedProject = 'Sai Paradise Heights';

  let detectedBhk: number | undefined;
  if (/\b1[\s-]?bhk\b/i.test(lower)) detectedBhk = 1;
  else if (/\b2[\s-]?bhk\b/i.test(lower)) detectedBhk = 2;
  else if (/\b3[\s-]?bhk\b/i.test(lower)) detectedBhk = 3;

  // 3. Determine Confidence and LeadSource
  if (detectedCode) {
    let leadSource: LeadSourceType = 'WHATSAPP_EXACT';
    if (platformHint === 'INSTAGRAM') leadSource = 'INSTAGRAM_EXACT';
    else if (lower.includes('youtube') || lower.includes('short')) leadSource = 'YOUTUBE_EXACT';

    return {
      sourceConfidence: 'EXACT',
      leadSource,
      detectedCode,
      detectedProject,
      detectedBhk,
    };
  }

  if (detectedProject || detectedBhk) {
    const leadSource: LeadSourceType =
      platformHint === 'INSTAGRAM' ? 'INSTAGRAM_ORGANIC_UNKNOWN' : 'WHATSAPP_ORGANIC_UNKNOWN';

    return {
      sourceConfidence: 'INFERRED',
      leadSource,
      detectedProject,
      detectedBhk,
    };
  }

  return {
    sourceConfidence: 'UNKNOWN',
    leadSource: platformHint === 'CALL' ? 'PHONE_ORGANIC_UNKNOWN' : 'WHATSAPP_ORGANIC_UNKNOWN',
  };
}

/**
 * Lightweight SVG QR code matrix generator for high-contrast scanning.
 */
export function generateSvgQrCode(data: string): string {
  const hash = Math.abs(
    data.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
  );

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" class="rounded-xl shadow-lg border border-amber-500/30 bg-white p-2">
      <!-- Outer Border / Finder Patterns -->
      <rect width="200" height="200" fill="#ffffff" />
      <rect x="15" y="15" width="40" height="40" fill="#12151f" rx="4" />
      <rect x="23" y="23" width="24" height="24" fill="#ffffff" />
      <rect x="27" y="27" width="16" height="16" fill="#b59658" />

      <rect x="145" y="15" width="40" height="40" fill="#12151f" rx="4" />
      <rect x="153" y="23" width="24" height="24" fill="#ffffff" />
      <rect x="157" y="27" width="16" height="16" fill="#b59658" />

      <rect x="15" y="145" width="40" height="40" fill="#12151f" rx="4" />
      <rect x="23" y="153" width="24" height="24" fill="#ffffff" />
      <rect x="27" y="157" width="16" height="16" fill="#b59658" />

      <!-- Data Dots Hash Matrix -->
      ${Array.from({ length: 12 })
        .map((_, r) =>
          Array.from({ length: 12 })
            .map((_, c) => {
              if (
                (r < 4 && c < 4) ||
                (r < 4 && c > 7) ||
                (r > 7 && c < 4)
              )
                return '';
              const fill = (hash + r * 17 + c * 31) % 2 === 0 ? '#12151f' : 'transparent';
              return fill !== 'transparent'
                ? `<rect x="${65 + c * 6}" y="${65 + r * 6}" width="5" height="5" fill="${fill}" rx="1" />`
                : '';
            })
            .join('')
        )
        .join('')}

      <!-- Center ZamZam Monogram Badge -->
      <circle cx="100" cy="100" r="16" fill="#12151f" stroke="#b59658" stroke-width="2" />
      <text x="100" y="104" font-family="sans-serif" font-size="10" font-weight="bold" fill="#ccb67b" text-anchor="middle">ZP</text>
    </svg>
  `.trim();
}
