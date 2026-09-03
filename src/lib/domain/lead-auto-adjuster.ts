import { normalizeIndianPhone, type PhoneValidationResult } from '@/lib/domain/phone-normalizer';
import { OFFICIAL_BROKER_NUMBERS } from '@/lib/constants/broker-constants';

export interface RawLeadRow {
  [key: string]: any;
}

export interface ColumnMapping {
  fullName?: string;
  phone?: string;
  email?: string;
  budget?: string;
  bhk?: string;
  location?: string;
  source?: string;
  campaign?: string;
  notes?: string;
  stage?: string;
  possession?: string;
  date?: string;
}

export interface AutoAdjustedLead {
  raw: RawLeadRow;
  fullName: string;
  phoneValidation: PhoneValidationResult;
  phoneE164: string;
  email: string;
  budgetMin: number;
  budgetMax: number;
  budgetFormatted: string;
  bhkPreferences: number[];
  targetLocations: string[];
  primaryLocation: string;
  microMarket?: string;
  possessionPreference: 'READY_TO_MOVE' | 'UNDER_CONSTRUCTION' | 'ANY';
  leadSource: string;
  sourceConfidence: 'EXACT' | 'INFERRED' | 'UNKNOWN';
  sourceCode?: string;
  assignedBrokerName: string;
  assignedBrokerPhone: string;
  stage: string;
  stageFormatted: string;
  notes: string;
  warnings: string[];
  status: 'READY' | 'WARNING' | 'INVALID';
}

/**
 * Universal CSV Line Parser (handles quotes, commas, escapes)
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export const STAGE_DISPLAY_NAMES: Record<string, string> = {
  new_uncontacted: 'New / Uncontacted',
  discovery_call: 'Discovery Call',
  portal_shared: 'Portal Shared',
  visit_scheduled: 'Site Visit Scheduled',
  visit_done: 'Site Visit Done',
  revisit_scheduled: 'Re-Visit Scheduled',
  negotiation_token: 'Negotiation / Token',
  under_registration: 'Under Registration',
  closed_won: 'Closed Won',
  on_hold_nurture: 'On Hold / Nurture',
  closed_lost: 'Closed Lost',
};

/**
 * Normalizes any free-form status or pipeline stage string to canonical CRM stages
 */
export function normalizeLeadStage(input?: string | null): string {
  if (!input) return 'new_uncontacted';
  const clean = String(input).trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  
  if (clean.includes('revisit') || clean.includes('re_visit') || clean.includes('second_visit') || clean.includes('2nd_visit')) {
    return 'revisit_scheduled';
  }
  if (clean.includes('visit_done') || clean.includes('visited') || clean.includes('site_done') || clean.includes('tour_done') || clean.includes('completed_visit')) {
    return 'visit_done';
  }
  if (clean.includes('visit') || clean.includes('tour') || clean.includes('inspection') || clean.includes('appointment')) {
    return 'visit_scheduled';
  }
  if (clean.includes('won') || clean.includes('closed_won') || clean.includes('deal_booked') || clean.includes('unit_booked') || (clean.includes('booked') && !clean.includes('visit') && !clean.includes('tour')) || (clean.includes('registered') && !clean.includes('under'))) {
    return 'closed_won';
  }
  if (clean.includes('not_intrest') || clean.includes('not_interest') || clean.includes('not_req') || clean.includes('dnd') || clean.includes('wrong_num') || clean.includes('lost') || clean.includes('dropped') || clean.includes('closed_lost') || clean.includes('junk') || clean.includes('invalid') || clean.includes('rejected')) {
    return 'closed_lost';
  }
  if (clean.includes('no_ans') || clean.includes('noans') || clean.includes('no_answer') || clean.includes('rnr') || clean.includes('ringing') || clean.includes('busy') || clean.includes('switched_off') || clean.includes('out_of_reach') || clean.includes('agent') || clean.includes('broker') || clean.includes('nurture') || clean.includes('hold') || clean.includes('postpone') || clean.includes('cold') || clean.includes('later')) {
    return 'on_hold_nurture';
  }
  if (clean.includes('regis') || clean.includes('under_registration') || clean.includes('agreement') || clean.includes('stamp_duty')) {
    return 'under_registration';
  }
  if (clean.includes('token') || clean.includes('negotiat') || clean.includes('costing') || clean.includes('pricing') || clean.includes('offer')) {
    return 'negotiation_token';
  }
  if (clean.includes('schedule')) {
    return 'visit_scheduled';
  }
  if (clean.includes('portal') || clean.includes('brochure') || clean.includes('proposal') || clean.includes('link') || clean.includes('catalog') || clean.includes('shared')) {
    return 'portal_shared';
  }
  if (clean.includes('intrest') || clean.includes('interest') || clean.includes('argent') || clean.includes('urgent') || clean.includes('hot') || clean.includes('call_back') || clean.includes('callback') || clean.includes('follow') || clean.includes('discover') || clean.includes('contact') || clean.includes('called') || clean.includes('spoke') || clean.includes('connect') || clean.includes('warm') || clean.includes('qualif') || clean.includes('in_progress')) {
    return 'discovery_call';
  }
  if (clean.includes('new') || clean.includes('uncontacted') || clean.includes('open') || clean.includes('fresh') || clean.includes('inbound')) {
    return 'new_uncontacted';
  }
  
  return 'new_uncontacted';
}

/**
 * Fuzzy Header Auto-Detector for Lead Sheets (CSV / Excel / TSV / JSON)
 */
export function detectLeadColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const cleanHeaders = headers.map((h) => ({
    original: h,
    normalized: String(h || '').toLowerCase().replace(/[^a-z0-9]/g, ''),
  }));

  for (const h of cleanHeaders) {
    const n = h.normalized;
    const orig = h.original;
    if (!n) continue;

    // Reject openpyxl artifacts e.g. "<Cell 'Sheet1'.A2>"
    if (orig.startsWith('<Cell') || n.includes('cellsheet') || n.startsWith('column')) {
      continue;
    }

    // Full Name
    if (!mapping.fullName && (
      n.includes('fullname') ||
      n.includes('clientname') ||
      n.includes('customername') ||
      n.includes('leadname') ||
      n.includes('buyername') ||
      n.includes('prospectname') ||
      n.includes('applicantname') ||
      n.includes('contactperson') ||
      n.includes('callername') ||
      n.includes('partyname') ||
      n.includes('firstname') ||
      n === 'name' ||
      n === 'client' ||
      n === 'customer' ||
      n === 'lead' ||
      n === 'buyer' ||
      n === 'prospect' ||
      (n.includes('name') && !n.includes('campaign') && !n.includes('project') && !n.includes('builder') && !n.includes('developer') && !n.includes('broker') && !n.includes('user') && !n.includes('file'))
    )) {
      mapping.fullName = orig;
    } 
    // Phone Number / Mobile (Strict matching to avoid 'cell' artifacts)
    else if (!mapping.phone && (
      n.includes('phone') ||
      n.includes('mobile') ||
      n.includes('contact') ||
      n.includes('whatsapp') ||
      n.includes('calling') ||
      n.includes('telephone') ||
      n.includes('mob') ||
      n.includes('phno') ||
      n === 'cell' ||
      n === 'cellnumber' ||
      n === 'cellno' ||
      n === 'cellphone' ||
      n === 'number' ||
      n === 'contactno' ||
      n === 'mobileno'
    )) {
      mapping.phone = orig;
    } 
    // Email
    else if (!mapping.email && (
      n.includes('email') ||
      n.includes('mail') ||
      n.includes('emailid') ||
      n.includes('mailid') ||
      n.includes('emailaddress')
    )) {
      mapping.email = orig;
    } 
    // Budget
    else if (!mapping.budget && (
      n.includes('budget') ||
      n.includes('price') ||
      n.includes('investment') ||
      n.includes('cost') ||
      n.includes('pricerange') ||
      n.includes('targetbudget') ||
      n.includes('approxbudget') ||
      n.includes('ticketsize') ||
      n.includes('amount') ||
      n.includes('whatisyourbudget')
    )) {
      mapping.budget = orig;
    } 
    // BHK / Configuration
    else if (!mapping.bhk && (
      n.includes('bhk') ||
      n.includes('bedroom') ||
      n.includes('config') ||
      n.includes('unittype') ||
      n.includes('requirement') ||
      n.includes('bhktype') ||
      n.includes('typology') ||
      n.includes('flattype') ||
      n.includes('whichbhk')
    )) {
      mapping.bhk = orig;
    } 
    // Location / Micro-Market
    else if (!mapping.location && (
      n.includes('location') ||
      n.includes('locality') ||
      n.includes('city') ||
      n.includes('sector') ||
      n.includes('area') ||
      n.includes('micromarket') ||
      n.includes('preferredlocation') ||
      n.includes('preferredlocality') ||
      n.includes('sitelocation') ||
      n.includes('address') ||
      n.includes('whichlocation')
    )) {
      mapping.location = orig;
    } 
    // Lead Source / Campaign
    else if (!mapping.source && (
      n.includes('source') ||
      n.includes('platform') ||
      n.includes('channel') ||
      n.includes('utm') ||
      n.includes('leadsource') ||
      n.includes('adsource') ||
      n.includes('medium') ||
      n.includes('publisher')
    )) {
      mapping.source = orig;
    } 
    // Campaign Name
    else if (!mapping.campaign && (
      n.includes('campaign') ||
      n.includes('adset') ||
      n.includes('adname') ||
      n.includes('campaignname')
    )) {
      mapping.campaign = orig;
    } 
    // Notes / Remarks / Query
    else if (!mapping.notes && (
      n.includes('notes') ||
      n.includes('remark') ||
      n.includes('comment') ||
      n.includes('message') ||
      n.includes('query') ||
      n.includes('inquiry') ||
      n.includes('description') ||
      n.includes('feedback')
    )) {
      mapping.notes = orig;
    } 
    // Pipeline Stage / Status
    else if (!mapping.stage && (
      n.includes('stage') ||
      n.includes('status') ||
      n.includes('leadstatus') ||
      n.includes('leadstage') ||
      n.includes('pipelinestage') ||
      n.includes('pipelinestatus') ||
      n.includes('currentstage') ||
      n.includes('currentstatus') ||
      n === 'state'
    )) {
      mapping.stage = orig;
    } 
    // Possession Preference
    else if (!mapping.possession && (
      n.includes('possession') ||
      n.includes('timeline') ||
      n.includes('rtm') ||
      n.includes('construction')
    )) {
      mapping.possession = orig;
    } 
    // Inquiry Date / Timestamp
    else if (!mapping.date && (
      n.includes('date') ||
      n.includes('time') ||
      n.includes('created') ||
      n.includes('timestamp')
    )) {
      mapping.date = orig;
    }
  }

  return mapping;
}

/**
 * Data-Driven Column Inference: Inspecs actual cell values if headers are ambiguous
 */
export function inferColumnMappingFromData(
  rows: RawLeadRow[],
  headers: string[],
  currentMapping: ColumnMapping = {}
): ColumnMapping {
  const mapping: ColumnMapping = { ...currentMapping };
  if (!rows || rows.length === 0) return mapping;

  const sampleRows = rows.slice(0, 100);

  // 1. Phone Detection: Score all columns by phone density
  let bestPhoneHeader = mapping.phone || '';
  let highestPhoneScore = 0;

  for (const h of headers) {
    if (!h) continue;
    const values = sampleRows.map((r) => String(r[h] ?? '').trim()).filter((v) => v.length > 0);
    if (values.length === 0) continue;

    const phoneMatches = values.filter((v) => {
      const digits = v.replace(/\D/g, '');
      // 10-digit Indian phone (e.g. 9004247557) or with 91 / 0 prefix
      return (digits.length === 10 && /^[6-9]/.test(digits)) ||
             (digits.length === 12 && digits.startsWith('91') && /^91[6-9]/.test(digits)) ||
             (digits.length === 11 && digits.startsWith('0') && /^0[6-9]/.test(digits));
    });

    const score = phoneMatches.length;
    if (score > highestPhoneScore && score >= 2) {
      highestPhoneScore = score;
      bestPhoneHeader = h;
    }
  }

  if (bestPhoneHeader) {
    mapping.phone = bestPhoneHeader;
  }

  // 2. Scan remaining columns for other fields
  for (const h of headers) {
    if (!h || h === mapping.phone) continue;

    const values = sampleRows
      .map((r) => String(r[h] ?? '').trim())
      .filter((v) => v.length > 0);

    if (values.length === 0) continue;

    // Email
    if (!mapping.email) {
      const emailMatches = values.filter((v) => v.includes('@') && v.includes('.'));
      if (emailMatches.length / values.length >= 0.4) {
        mapping.email = h;
        continue;
      }
    }

    // Stage / Disposition (e.g. "no ans", "Not intrested", "Intrested", "agent", "busy")
    if (!mapping.stage) {
      const stageMatches = values.filter((v) => {
        const lower = v.toLowerCase();
        return (
          lower.includes('ans') ||
          lower.includes('intrest') ||
          lower.includes('interest') ||
          lower.includes('agent') ||
          lower.includes('busy') ||
          lower.includes('visit') ||
          lower.includes('new') ||
          lower.includes('won') ||
          lower.includes('lost') ||
          lower.includes('call') ||
          lower.includes('argent') ||
          lower.includes('urgent') ||
          lower.includes('token') ||
          lower.includes('hold')
        );
      });
      if (stageMatches.length >= 2 || stageMatches.length / values.length >= 0.3) {
        mapping.stage = h;
        continue;
      }
    }

    // BHK / Typology (e.g. "1RK", "shop", "1BHK", "2BHK", "3BHK", "studio")
    if (!mapping.bhk) {
      const bhkMatches = values.filter((v) => {
        const lower = v.toLowerCase();
        return lower.includes('bhk') || lower.includes('rk') || lower.includes('shop') || lower.includes('studio') || lower.includes('bedroom') || lower.includes('flat') || lower.includes('room');
      });
      if (bhkMatches.length >= 2 || bhkMatches.length / values.length >= 0.3) {
        mapping.bhk = h;
        continue;
      }
    }

    // Location / Micro-Market (e.g. "Mumbai", "Mira Road", "Kharghar", "Taloja")
    if (!mapping.location) {
      const locationMatches = values.filter((v) => {
        const lower = v.toLowerCase();
        return lower.includes('mumbai') || lower.includes('road') || lower.includes('kharghar') || lower.includes('taloja') || lower.includes('sector') || lower.includes('sec') || lower.includes('panvel') || lower.includes('vashi') || lower.includes('thane');
      });
      if (locationMatches.length >= 2 || locationMatches.length / values.length >= 0.3) {
        mapping.location = h;
        continue;
      }
    }

    // Skip sequential serial number columns (e.g. 1, 2, 3, 4...)
    const isSerialCol = values.length >= 3 && values.slice(0, 5).every((v, i) => parseInt(v, 10) === i + 1);
    if (isSerialCol) continue;

    // Budget (e.g. "20", "65", "40", "40 -55", "75L", "1.2 Cr")
    if (!mapping.budget) {
      const budgetMatches = values.filter((v) => {
        const lower = v.toLowerCase();
        const num = parseFloat(v.replace(/[^0-9.]/g, ''));
        return lower.includes('cr') || lower.includes('crore') || lower.includes('lakh') || lower.includes('lac') || lower.includes('₹') || (lower.endsWith('l') && !isNaN(num)) || (num >= 15 && num <= 500);
      });
      if (budgetMatches.length >= 2 || budgetMatches.length / values.length >= 0.3) {
        mapping.budget = h;
        continue;
      }
    }

    // Full Name (Text column with human names, not numbers, not serial IDs)
    if (!mapping.fullName && h !== mapping.phone && h !== mapping.email && h !== mapping.stage && h !== mapping.bhk && h !== mapping.location && h !== mapping.budget) {
      const nameMatches = values.filter((v) => {
        return /^[a-zA-Z\s.]{2,35}$/.test(v) && !/^(sale|rent|resale|buy|yes|no|na|null)$/i.test(v);
      });
      if (nameMatches.length >= 2 || nameMatches.length / values.length >= 0.5) {
        mapping.fullName = h;
        continue;
      }
    }

    // Source / Notes
    if (!mapping.source && values.some((v) => /^(sale|rent|resale|buy|meta|fb|google|youtube|walkin|whatsapp)$/i.test(v))) {
      mapping.source = h;
      continue;
    }
  }

  return mapping;
}

/**
 * Indian Currency & Budget String Parser
 * Handles: "65L", "1.2 Cr", "45-55 Lakhs", "₹70,00,000", "80 Lacs", "50L to 75L", "1.5Crores"
 */
export function parseIndianBudget(budgetString?: string | number): {
  min: number;
  max: number;
  formatted: string;
} {
  if (!budgetString && budgetString !== 0) {
    return { min: 0, max: 0, formatted: 'Unspecified' };
  }

  const raw = String(budgetString).trim();
  if (!raw) {
    return { min: 0, max: 0, formatted: 'Unspecified' };
  }

  // Helper to parse single value like "65L", "1.2 Cr", "7500000"
  const parseSingleValue = (val: string): number => {
    let clean = val.replace(/[₹,]/g, '').trim().toLowerCase();
    if (!clean) return 0;

    // Check Crore
    if (clean.includes('cr') || clean.includes('crore')) {
      const num = parseFloat(clean.replace(/[^0-9.]/g, ''));
      return isNaN(num) ? 0 : Math.round(num * 10000000);
    }
    // Check Lakh / Lac
    if (clean.includes('l') || clean.includes('lac') || clean.includes('lakh')) {
      const num = parseFloat(clean.replace(/[^0-9.]/g, ''));
      return isNaN(num) ? 0 : Math.round(num * 100000);
    }
    // Check raw number
    const num = parseFloat(clean.replace(/[^0-9.]/g, ''));
    if (isNaN(num)) return 0;
    // If entered as e.g. 65 (assuming lakhs if < 500)
    if (num > 0 && num < 500) {
      return Math.round(num * 100000);
    }
    return Math.round(num);
  };

  // Check for ranges e.g. "45-55 Lakhs", "1 Cr - 1.5 Cr", "50L to 75L"
  const rangeMatch = raw.split(/[-–—]|to/i).map((s) => s.trim()).filter(Boolean);
  if (rangeMatch.length === 2) {
    const minVal = parseSingleValue(rangeMatch[0]);
    const maxVal = parseSingleValue(rangeMatch[1]);

    const min = Math.min(minVal, maxVal);
    const max = Math.max(minVal, maxVal);

    return {
      min,
      max: max || min,
      formatted: formatBudgetINR(min, max),
    };
  }

  const single = parseSingleValue(raw);
  return {
    min: single ? Math.round(single * 0.9) : 0,
    max: single,
    formatted: formatBudgetINR(single ? Math.round(single * 0.9) : 0, single),
  };
}

function formatBudgetINR(min: number, max: number): string {
  if (!max) return 'Unspecified';
  const formatNum = (n: number) => {
    if (n >= 10000000) {
      return `₹${(n / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
    }
    if (n >= 100000) {
      return `₹${(n / 100000).toFixed(2).replace(/\.00$/, '')} L`;
    }
    return `₹${n.toLocaleString('en-IN')}`;
  };

  if (min === max || min === 0) {
    return formatNum(max);
  }
  return `${formatNum(min)} - ${formatNum(max)}`;
}

/**
 * BHK Preference Extractor
 * Handles: "2 BHK", "1, 2 BHK", "3BHK Luxury", "2+3 BHK", "2.5 BHK", "Studio", "1BHK / 2BHK"
 */
export function extractBhkPreferences(input?: string | number): number[] {
  if (!input && input !== 0) return [2]; // Default to 2 BHK standard

  const raw = String(input).toUpperCase();
  const bhks: Set<number> = new Set();

  if (raw.includes('STUDIO') || raw.includes('1RK')) {
    bhks.add(1);
  }

  const matches = raw.match(/\b([1-5])(?:\.5)?\s*(?:BHK|BED|BEDROOM)?\b/gi);
  if (matches) {
    for (const m of matches) {
      const digit = parseInt(m.replace(/\D/g, ''), 10);
      if (digit >= 1 && digit <= 5) {
        bhks.add(digit);
      }
    }
  }

  if (bhks.size === 0) {
    // Fallback search for any isolated digits 1-5
    const fallbackDigits = raw.match(/\b[1-5]\b/g);
    if (fallbackDigits) {
      for (const d of fallbackDigits) {
        bhks.add(parseInt(d, 10));
      }
    }
  }

  return bhks.size > 0 ? Array.from(bhks).sort((a, b) => a - b) : [2];
}

/**
 * Micro-Market Alignment & Resolver
 * Standardizes freeform mentions to canonical Kharghar & Taloja nodes.
 */
export function resolveMicroMarket(input?: string): {
  canonical: string;
  region: 'KHARGHAR' | 'TALOJA_1' | 'TALOJA_2' | 'OTHER';
} {
  if (!input) {
    return { canonical: 'Kharghar', region: 'KHARGHAR' };
  }

  const raw = input.toLowerCase();

  // 1. Taloja priority checks
  if (
    raw.includes('taloja 2') ||
    raw.includes('taloja phase 2') ||
    raw.includes('phase 2') ||
    raw.includes('phase2') ||
    raw.includes('sec 26') ||
    raw.includes('sector 26') ||
    raw.includes('sector 21') ||
    raw.includes('sector 28')
  ) {
    return { canonical: 'Taloja Phase 2', region: 'TALOJA_2' };
  }
  if (
    raw.includes('taloja 1') ||
    raw.includes('taloja phase 1') ||
    raw.includes('phase 1') ||
    raw.includes('phase1') ||
    raw.includes('taloja') ||
    raw.includes('sec 11') ||
    raw.includes('sector 11') ||
    raw.includes('sec 4') ||
    raw.includes('sec 6')
  ) {
    return { canonical: 'Taloja Phase 1', region: 'TALOJA_1' };
  }

  // 2. Specific Sector match for Kharghar e.g. "Kharghar Sec 35", "Sector 35", "Upper Kharghar 37"
  const secMatch =
    raw.match(/(?:kharghar\s*)?(?:sec(?:tor)?\.?\s*)(\d{1,2})/i) ||
    raw.match(/kharghar.*?(\d{1,2})/i);
  if (secMatch) {
    const secNum = parseInt(secMatch[1], 10);
    if (secNum >= 1 && secNum <= 37) {
      return { canonical: `Kharghar Sector ${secNum}`, region: 'KHARGHAR' };
    }
  }

  if (raw.includes('upper kharghar')) {
    const numMatch = raw.match(/(\d{1,2})/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      if (num >= 1 && num <= 37) {
        return { canonical: `Kharghar Sector ${num}`, region: 'KHARGHAR' };
      }
    }
    return { canonical: 'Upper Kharghar (Sec 36-37)', region: 'KHARGHAR' };
  }
  if (raw.includes('central park') || raw.includes('utsav') || raw.includes('golf')) {
    return { canonical: 'Kharghar Central Park', region: 'KHARGHAR' };
  }
  if (raw.includes('panvel') || raw.includes('karanjade') || raw.includes('new panvel')) {
    return { canonical: 'Panvel Node', region: 'OTHER' };
  }
  if (raw.includes('ulwe') || raw.includes('dronagiri') || raw.includes('seawoods') || raw.includes('vashi') || raw.includes('nerul')) {
    return { canonical: input.trim(), region: 'OTHER' };
  }
  if (raw.includes('kharghar')) {
    return { canonical: 'Kharghar', region: 'KHARGHAR' };
  }

  return { canonical: input.trim() || 'Kharghar', region: 'KHARGHAR' };
}

/**
 * Broker Auto-Routing Engine
 * Directs Kharghar leads to Safwan Diwan (+91 7977552011) and Taloja leads to Suhel Patel (+91 9967731071).
 */
export function resolveAssignedBroker(
  region: 'KHARGHAR' | 'TALOJA_1' | 'TALOJA_2' | 'OTHER',
  explicitBrokerPhone?: string
): {
  brokerName: string;
  brokerPhone: string;
} {
  if (explicitBrokerPhone) {
    const cleanPhone = explicitBrokerPhone.replace(/\D/g, '');
    if (cleanPhone.includes('7977552011')) {
      return { brokerName: OFFICIAL_BROKER_NUMBERS.SAFWAN.displayName, brokerPhone: OFFICIAL_BROKER_NUMBERS.SAFWAN.e164 };
    }
    if (cleanPhone.includes('9967731071')) {
      return { brokerName: OFFICIAL_BROKER_NUMBERS.SUHEL.displayName, brokerPhone: OFFICIAL_BROKER_NUMBERS.SUHEL.e164 };
    }
  }

  if (region === 'TALOJA_1' || region === 'TALOJA_2') {
    return { brokerName: OFFICIAL_BROKER_NUMBERS.SUHEL.displayName, brokerPhone: OFFICIAL_BROKER_NUMBERS.SUHEL.e164 };
  }

  // Default to Kharghar Lead
  return { brokerName: OFFICIAL_BROKER_NUMBERS.SAFWAN.displayName, brokerPhone: OFFICIAL_BROKER_NUMBERS.SAFWAN.e164 };
}

/**
 * Name Sanitizer & Capitalizer with Email Fallback
 */
export function sanitizeName(name?: string, emailFallback?: string): string {
  let clean = String(name || '').trim().replace(/^(mr\.|mrs\.|ms\.|dr\.|adv\.)\s*/i, '');

  // If name is "Lastname, Firstname", reverse it
  if (clean.includes(',')) {
    const parts = clean.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 2) {
      clean = `${parts[1]} ${parts[0]}`;
    }
  }

  // If name is generic or empty, try extracting from email (e.g. "amitabh.verma@example.com" -> "Amitabh Verma")
  const isGeneric = !clean || /^(prospect|inbound|lead|customer|client|buyer|user|na|null|undefined|none)$/i.test(clean);
  if (isGeneric && emailFallback && emailFallback.includes('@')) {
    const userPart = emailFallback.split('@')[0].replace(/[0-9._-]/g, ' ').trim();
    if (userPart.length >= 2) {
      clean = userPart;
    }
  }

  if (!clean || clean.length < 2) return 'Navi Mumbai Prospect';

  return clean
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Lead Source & Attribution Classifier
 */
export function classifyLeadSource(rawSource?: string, rawCampaign?: string): {
  leadSource: string;
  sourceConfidence: 'EXACT' | 'INFERRED' | 'UNKNOWN';
} {
  const combined = `${rawSource || ''} ${rawCampaign || ''}`.toLowerCase();

  if (combined.includes('meta') || combined.includes('fb') || combined.includes('facebook') || combined.includes('instagram') || combined.includes('ig') || combined.includes('reel')) {
    return { leadSource: 'META_ADS', sourceConfidence: 'EXACT' };
  }
  if (combined.includes('google') || combined.includes('gads') || combined.includes('cpc') || combined.includes('search') || combined.includes('adwords')) {
    return { leadSource: 'GOOGLE_ADS', sourceConfidence: 'EXACT' };
  }
  if (combined.includes('99acres') || combined.includes('99 acres')) {
    return { leadSource: '99ACRES_INQUIRY', sourceConfidence: 'EXACT' };
  }
  if (combined.includes('magicbricks') || combined.includes('magic bricks') || combined.includes('mb')) {
    return { leadSource: 'MAGICBRICKS_INQUIRY', sourceConfidence: 'EXACT' };
  }
  if (combined.includes('housing') || combined.includes('housing.com')) {
    return { leadSource: 'HOUSING_COM', sourceConfidence: 'EXACT' };
  }
  if (combined.includes('youtube') || combined.includes('yt') || combined.includes('short')) {
    return { leadSource: 'YOUTUBE_ORGANIC', sourceConfidence: 'EXACT' };
  }
  if (combined.includes('indiamart') || combined.includes('justdial') || combined.includes('jd')) {
    return { leadSource: 'DIRECTORY_INQUIRY', sourceConfidence: 'EXACT' };
  }
  if (combined.includes('walk') || combined.includes('offline') || combined.includes('site') || combined.includes('office')) {
    return { leadSource: 'SITE_VISIT_WALKIN', sourceConfidence: 'EXACT' };
  }
  if (combined.includes('whatsapp') || combined.includes('wa') || combined.includes('chat')) {
    return { leadSource: 'WHATSAPP_INQUIRY', sourceConfidence: 'EXACT' };
  }
  if (combined.includes('referral') || combined.includes('friend') || combined.includes('channel partner') || combined.includes('broker')) {
    return { leadSource: 'REFERRAL', sourceConfidence: 'EXACT' };
  }

  return { leadSource: 'CSV_IMPORT', sourceConfidence: 'INFERRED' };
}

/**
 * Complete Row Auto-Adjuster
 */
export function autoAdjustLeadRow(row: RawLeadRow, mapping: ColumnMapping): AutoAdjustedLead {
  const rawName = mapping.fullName ? row[mapping.fullName] : row['name'] || row['Full Name'];
  const rawPhone = mapping.phone ? row[mapping.phone] : row['phone'] || row['Mobile'];
  const rawEmail = mapping.email ? row[mapping.email] : row['email'] || row['Email'];
  const rawBudget = mapping.budget ? row[mapping.budget] : row['budget'] || row['Budget'];
  const rawBhk = mapping.bhk ? row[mapping.bhk] : row['bhk'] || row['BHK'];
  const rawLoc = mapping.location ? row[mapping.location] : row['location'] || row['Locality'];
  const rawSource = mapping.source ? row[mapping.source] : row['source'] || row['Source'];
  const rawCampaign = mapping.campaign ? row[mapping.campaign] : row['campaign'] || row['Campaign'];
  const rawNotes = mapping.notes ? row[mapping.notes] : row['notes'] || row['Remarks'] || row['remarks'] || row['Comment'] || row['comment'];
  const rawPossession = mapping.possession ? row[mapping.possession] : row['possession'] || row['Possession'];
  const rawStage = mapping.stage 
    ? row[mapping.stage] 
    : row['stage'] || 
      row['Stage'] || 
      row['status'] || 
      row['Status'] || 
      row['leadStatus'] || 
      row['Lead Status'] || 
      row['lead_status'] || 
      row['pipelineStage'] || 
      row['Pipeline Stage'] || 
      row['currentStage'] || 
      row['Current Stage'] || 
      row['current_stage'] || 
      row['State'] || 
      row['state'];

  const warnings: string[] = [];

  // 1. Name
  const fullName = sanitizeName(rawName, rawEmail);

  // 2. Phone
  const phoneValidation = normalizeIndianPhone(rawPhone || '');
  if (!phoneValidation.isValid) {
    warnings.push(phoneValidation.error || 'Invalid Indian phone number');
  }

  // 3. Email
  const email = (rawEmail || '').trim().toLowerCase();

  // 4. Budget
  const budget = parseIndianBudget(rawBudget);

  // 5. BHK
  const bhkPreferences = extractBhkPreferences(rawBhk);

  // 6. Micro-Market & Location
  const marketResult = resolveMicroMarket(rawLoc);
  const targetLocations = [marketResult.canonical];

  // 7. Broker Routing
  const broker = resolveAssignedBroker(marketResult.region);

  // 8. Source Attribution
  const attribution = classifyLeadSource(rawSource, rawCampaign);

  // 9. Possession
  let possessionPreference: 'READY_TO_MOVE' | 'UNDER_CONSTRUCTION' | 'ANY' = 'ANY';
  const possStr = (rawPossession || '').toLowerCase();
  if (possStr.includes('ready') || possStr.includes('rtm') || possStr.includes('oc')) {
    possessionPreference = 'READY_TO_MOVE';
  } else if (possStr.includes('under') || possStr.includes('construction') || possStr.includes('new launch')) {
    possessionPreference = 'UNDER_CONSTRUCTION';
  }

  // 10. Pipeline Stage Normalization
  const stage = normalizeLeadStage(rawStage);
  const stageFormatted = STAGE_DISPLAY_NAMES[stage] || stage.replace(/_/g, ' ');

  // Overall status
  let status: 'READY' | 'WARNING' | 'INVALID' = 'READY';
  if (!phoneValidation.isValid && !email) {
    status = 'INVALID';
  } else if (!phoneValidation.isValid || warnings.length > 0) {
    status = 'WARNING';
  }

  return {
    raw: row,
    fullName,
    phoneValidation,
    phoneE164: phoneValidation.e164 || '',
    email,
    budgetMin: budget.min,
    budgetMax: budget.max,
    budgetFormatted: budget.formatted,
    bhkPreferences,
    targetLocations,
    primaryLocation: marketResult.canonical,
    microMarket: marketResult.canonical,
    possessionPreference,
    leadSource: attribution.leadSource,
    sourceConfidence: attribution.sourceConfidence,
    assignedBrokerName: broker.brokerName,
    assignedBrokerPhone: broker.brokerPhone,
    stage,
    stageFormatted,
    notes: rawNotes ? String(rawNotes).trim() : `Imported lead from ${attribution.leadSource}.`,
    warnings,
    status,
  };
}

/**
 * Complete CSV String Parser and Auto-Adjuster
 */
export function parseAndAutoAdjustLeadsCSV(csvText: string, customMapping?: ColumnMapping): {
  leads: AutoAdjustedLead[];
  headers: string[];
  mapping: ColumnMapping;
  totalRows: number;
  readyCount: number;
  warningCount: number;
  invalidCount: number;
  errors: string[];
} {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return {
      leads: [],
      headers: [],
      mapping: {},
      totalRows: 0,
      readyCount: 0,
      warningCount: 0,
      invalidCount: 0,
      errors: ['CSV must have a header row and at least one lead data row.'],
    };
  }

  const headers = parseCSVLine(lines[0]);
  const mapping = customMapping || detectLeadColumnMapping(headers);

  const leads: AutoAdjustedLead[] = [];
  let readyCount = 0;
  let warningCount = 0;
  let invalidCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;

    const rowObj: RawLeadRow = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] || '';
    });

    const adjusted = autoAdjustLeadRow(rowObj, mapping);
    leads.push(adjusted);

    if (adjusted.status === 'READY') readyCount++;
    else if (adjusted.status === 'WARNING') warningCount++;
    else if (adjusted.status === 'INVALID') invalidCount++;
  }

  return {
    leads,
    headers,
    mapping,
    totalRows: lines.length - 1,
    readyCount,
    warningCount,
    invalidCount,
    errors: [],
  };
}
