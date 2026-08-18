/**
 * Organic Attribution & WhatsApp Deep Link Generation Engine
 * 
 * Rules:
 * - Deterministic Channel Tags: YOUTUBE_SHORT, YOUTUBE_VIDEO, INSTAGRAM_REEL, INSTAGRAM_DM, FB_GROUP, WHATSAPP_GROUP, DIRECT_CALL
 * - Generates URL-encoded wa.me prefilled links with property reference hashtags.
 * - Extracts campaign tags and property references from inbound text messages.
 */

export const ORGANIC_CHANNEL_TYPES = [
  'YOUTUBE_SHORT',
  'YOUTUBE_VIDEO',
  'INSTAGRAM_REEL',
  'INSTAGRAM_DM',
  'FB_GROUP',
  'WHATSAPP_GROUP',
  'DIRECT_CALL',
] as const;

export type OrganicChannelType = (typeof ORGANIC_CHANNEL_TYPES)[number];

export interface WhatsAppDeepLinkOptions {
  brokerPhoneE164: string; // e.g. +919820123456
  campaignSlug: string;    // e.g. yt-sec35-crown
  channelType: OrganicChannelType;
  projectName?: string;
  bhk?: number;
  contentCode?: string;    // e.g. #KG35-01
}

export function generateWhatsAppDeepLink(options: WhatsAppDeepLinkOptions): {
  waUrl: string;
  trackingSlugUrl: string;
  prefilledText: string;
} {
  const cleanPhone = options.brokerPhoneE164.replace(/\+/g, '');
  const codeTag = options.contentCode || options.campaignSlug.toUpperCase();
  const projText = options.projectName ? ` for ${options.projectName}` : '';
  const bhkText = options.bhk ? ` (${options.bhk} BHK)` : '';

  const prefilledText = `Hi ZamZam Properties, I saw your ${options.channelType.replace('_', ' ')} post${projText}${bhkText} [Ref: ${codeTag}]. Please share verified pricing & brochure.`;

  const encodedText = encodeURIComponent(prefilledText);
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
  const trackingSlugUrl = `/api/v1/track/${options.campaignSlug}`;

  return {
    waUrl,
    trackingSlugUrl,
    prefilledText,
  };
}

export interface InboundMessageAttribution {
  detectedChannel: OrganicChannelType;
  detectedRefCode?: string;
  detectedBhk?: number;
  detectedProjectKeyword?: string;
  rawMessage: string;
}

export function parseInboundMessageText(messageText: string): InboundMessageAttribution {
  const text = messageText || '';
  const lower = text.toLowerCase();

  let detectedChannel: OrganicChannelType = 'WHATSAPP_GROUP';

  if (lower.includes('youtube short') || lower.includes('yt short') || lower.includes('shorts')) {
    detectedChannel = 'YOUTUBE_SHORT';
  } else if (lower.includes('youtube') || lower.includes('video review')) {
    detectedChannel = 'YOUTUBE_VIDEO';
  } else if (lower.includes('reel') || lower.includes('instagram reel') || lower.includes('insta')) {
    detectedChannel = 'INSTAGRAM_REEL';
  } else if (lower.includes('fb') || lower.includes('facebook')) {
    detectedChannel = 'FB_GROUP';
  } else if (lower.includes('whatsapp') || lower.includes('wa group') || lower.includes('broadcast')) {
    detectedChannel = 'WHATSAPP_GROUP';
  }

  // Extract Ref Code if present [Ref: XYZ] or #XYZ
  const refMatch = text.match(/\[Ref:\s*([^\]]+)\]/i) || text.match(/#([A-Za-z0-9_-]+)/);
  const detectedRefCode = refMatch ? refMatch[1].trim() : undefined;

  // Extract BHK if mentioned
  let detectedBhk: number | undefined;
  if (lower.includes('1 bhk') || lower.includes('1bhk')) detectedBhk = 1;
  else if (lower.includes('2 bhk') || lower.includes('2bhk')) detectedBhk = 2;
  else if (lower.includes('3 bhk') || lower.includes('3bhk')) detectedBhk = 3;

  // Extract Project Keyword
  let detectedProjectKeyword: string | undefined;
  if (lower.includes('crown') || lower.includes('crown heights')) detectedProjectKeyword = 'Crown Heights';
  else if (lower.includes('marvel') || lower.includes('sai marvel')) detectedProjectKeyword = 'Sai Marvel';
  else if (lower.includes('galaxy') || lower.includes('galaxy metro')) detectedProjectKeyword = 'Galaxy Metro Heights';

  return {
    detectedChannel,
    detectedRefCode,
    detectedBhk,
    detectedProjectKeyword,
    rawMessage: text,
  };
}

export function generateSpeedToLeadResponse(
  leadName: string | null,
  projectName?: string,
  microMarket?: string
): string {
  const name = leadName ? ` ${leadName}` : '';
  const proj = projectName ? ` regarding ${projectName}` : '';
  const loc = microMarket ? ` in ${microMarket}` : '';

  return `Hello${name}! Thank you for connecting with ZamZam Properties${proj}${loc}. All our inventory is 100% MahaRERA verified with confirmed all-inclusive cost sheets. A senior Navi Mumbai advisor will share your curated property options shortly.`;
}
