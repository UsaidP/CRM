/**
 * Unified Export & Reporting Engine
 * GENRE: Architectural Botanical Ledger & Luxury Real Estate
 *
 * Tenant-neutral by design: every firm-specific value in an export (firm name,
 * statutory registration) is passed in by the caller from the session. See
 * `src/lib/constants/brand.ts` for why.
 */

import { PRODUCT_NAME, resolveFirmName } from '@/lib/constants/brand';

export interface CsvExportOptions {
  filename?: string;
  reportTitle: string;
  subtitle?: string;
  filtersApplied?: Record<string, string | number | boolean | null | undefined>;
  /**
   * Tenant display name (i.e. `organization.name`). Falls back to the product
   * name when absent.
   *
   * Never hardcode a firm name inside an export template: a tenant's CSV must
   * carry that tenant's name, not whichever firm the code happened to be written
   * for.
   */
  firmName?: string;
  /**
   * Statutory registration string for the tenant, when known. Omitted from the
   * header entirely if not supplied, rather than defaulting to some firm's real
   * registration number.
   */
  reraNumber?: string;
}

/**
 * Tenant contact identity for customer-facing message templates.
 *
 * Every field is optional: whatever is not supplied simply drops out of the
 * message rather than falling back to some other firm's real phone number or
 * website. A missing footer line is a cosmetic problem; another company's
 * contact details on a client's WhatsApp message is a real one.
 */
export interface FirmIdentity {
  /** Display name. Falls back to the product name. */
  name?: string;
  /** Statutory registration number, e.g. a MahaRERA registration. */
  reraNumber?: string;
  /** Contact phone shown in the footer. */
  phone?: string;
  /** Website shown in the footer. */
  website?: string;
}

/**
 * Formats a number to standard Indian Rupee notation (Lakhs / Crores)
 */
export function formatINR(val: unknown): string {
  if (val === null || val === undefined || !Number.isFinite(Number(val))) return '₹0';
  const amount = Number(val);
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} Lakh`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Formats exact currency number with commas
 */
export function formatINRFull(val: unknown): string {
  if (val === null || val === undefined || !Number.isFinite(Number(val))) return '₹0';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

/**
 * Escapes a cell value for standard CSV compatibility
 */
function escapeCsvCell(cell: unknown): string {
  if (cell === null || cell === undefined) return '""';
  let str = String(cell).trim();
  // Neutralize CSV / formula injection for spreadsheet applications (=, +, -, @, tab, CR)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Triggers client-side download of a CSV file
 */
export function downloadCsvFile(filename: string, csvContent: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate an executive header block for CSV exports.
 *
 * The tenant's name and registration number are supplied by the caller (from the
 * session) rather than hardcoded, so the same code produces correct letterheads
 * for every tenant.
 */
export function generateCrmCsvHeader(options: CsvExportOptions): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const firm = resolveFirmName(options.firmName);
  const rera = typeof options.reraNumber === 'string' ? options.reraNumber.trim() : '';

  // Build the subtitle from the caller's text, the tenant's RERA number (only if
  // a real one was supplied), and the product name used to generate the report.
  const subtitleParts = [
    options.subtitle,
    rera ? `MahaRERA Reg: ${rera}` : null,
    `Generated with ${PRODUCT_NAME}`,
  ].filter((part): part is string => Boolean(part));

  const lines: string[] = [
    `# ============================================================================`,
    `# ${firm.toUpperCase()} — MAHARASHTRA STATUTORY CRM`,
    `# ${options.reportTitle.toUpperCase()}`,
    `# ${subtitleParts.join(' • ')}`,
    `# Generated At: ${dateStr} ${timeStr} IST`,
  ];

  if (options.filtersApplied && Object.keys(options.filtersApplied).length > 0) {
    const filterParts = Object.entries(options.filtersApplied)
      .filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'ALL')
      .map(([k, v]) => `${k}: ${v}`);
    if (filterParts.length > 0) {
      lines.push(`# Filters Applied: ${filterParts.join(' | ')}`);
    }
  }

  lines.push(`# Confidential • For Internal ${firm} Brokerage Operations Only`);
  lines.push(`# ============================================================================`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Filesystem-safe slug for export filenames, e.g. "Lucky CRM" -> "lucky-crm".
 * Keeps generated filenames meaningful per tenant without leaking spaces or
 * punctuation into a download.
 */
export function firmNameToSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'crm';
}

/**
 * Export Leads Matrix to CSV
 */
export function exportLeadsToCsv(
  leads: any[],
  activeFilters?: Record<string, any>,
  firmName?: string
): void {
  const header = generateCrmCsvHeader({
    reportTitle: 'Verified Buyer & Inbound Leads Register',
    subtitle: 'Navi Mumbai Residential Property Requirements & Pipeline',
    filtersApplied: activeFilters,
    firmName,
  });

  const columns = [
    'Lead ID',
    'Client Full Name',
    'Phone (E.164)',
    'Email Address',
    'Channel / Source',
    'Source Reference Tag',
    'Stage / Status',
    'Preferred BHK',
    'Min Budget (INR)',
    'Max Budget (INR)',
    'Max Budget (Formatted)',
    'Preferred Location',
    'Assigned Broker',
    'Portal Token',
    'Created At',
  ];

  const rows = leads.map((lead) => {
    const req = lead.requirements?.[0] || {};
    const maxBudget = req.maxBudget || lead.budgetMax || 0;
    const minBudget = req.minBudget || lead.budgetMin || 0;
    const portalToken = lead.portals?.[0]?.token || '';

    return [
      lead.id,
      lead.fullName || 'Valued Buyer',
      lead.phoneE164 || '',
      lead.email || '',
      lead.channel || 'DIRECT_ORGANIC',
      lead.sourceCode || '',
      lead.stage || 'NEW_UNTOUCHED',
      req.bhk ? `${req.bhk} BHK` : 'Any',
      minBudget,
      maxBudget,
      formatINR(maxBudget),
      req.locationPreference || 'Kharghar / Taloja',
      lead.assignedTo?.fullName || lead.assignedBroker?.fullName || 'General Desk',
      portalToken,
      lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-IN') : '',
    ].map(escapeCsvCell).join(',');
  });

  const csvContent = `${header}${columns.map(escapeCsvCell).join(',')}\n${rows.join('\n')}`;
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadCsvFile(`${firmNameToSlug(resolveFirmName(firmName))}_leads_register_${timestamp}.csv`, csvContent);
}

/**
 * Export Deals & Brokerage Ledger to CSV
 */
export function exportDealsToCsv(
  deals: any[],
  summary?: any,
  activeFilters?: Record<string, any>,
  firmName?: string
): void {
  const header = generateCrmCsvHeader({
    reportTitle: 'Deal Closing & Brokerage Ledger Report',
    subtitle: 'Developer Invoices, Sales Rep Splits & Co-Broker Payouts',
    filtersApplied: activeFilters,
    firmName,
  });

  const summaryLines = [
    `# SUMMARY METRICS:`,
    `# Total Gross Commission Earned: ${formatINRFull(summary?.totalGrossBrokerage || 0)}`,
    `# Total Commission Collected: ${formatINRFull(summary?.totalCollected || 0)}`,
    `# Total Commission Pending: ${formatINRFull(summary?.totalPending || 0)}`,
    `# Total Closed Transactions: ${deals.length}`,
    `#`,
  ].join('\n');

  const columns = [
    'Deal ID',
    'Invoice Number',
    'Client Name',
    'Client Phone',
    'Project Name',
    'Unit Number',
    'Agreement Value (INR)',
    'Agreement Value (Formatted)',
    'Brokerage Rate (%)',
    'Gross Brokerage (INR)',
    'Sales Rep Share (%)',
    'Sales Rep Commission (INR)',
    'Co-Broker Name',
    'Co-Broker Share (%)',
    'Co-Broker Commission (INR)',
    'Deal Stage',
    'Deal Date',
    'Assigned Advisor',
  ];

  const rows = deals.map((deal) => {
    return [
      deal.id,
      deal.invoiceNumber || 'PENDING_INVOICE',
      deal.lead?.fullName || 'Client',
      deal.lead?.phoneE164 || '',
      deal.unit?.project?.name || deal.projectName || 'Navi Mumbai Project',
      deal.unit?.unitNumber || deal.unitNo || '',
      deal.agreementValue || 0,
      formatINRFull(deal.agreementValue || 0),
      deal.brokeragePercent || 2.5,
      deal.grossBrokerageAmount || 0,
      deal.repSplitPercent || 50,
      deal.repCommissionAmount || 0,
      deal.coBrokerName || 'None',
      deal.coBrokerSharePercent || 0,
      deal.coBrokerShareAmount || 0,
      deal.status || 'BOOKING_TOKEN_PAID',
      deal.dealDate ? new Date(deal.dealDate).toLocaleDateString('en-IN') : '',
      deal.lead?.assignedTo?.fullName || 'General Desk',
    ].map(escapeCsvCell).join(',');
  });

  const csvContent = `${header}${summaryLines}\n${columns.map(escapeCsvCell).join(',')}\n${rows.join('\n')}`;
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadCsvFile(`${firmNameToSlug(resolveFirmName(firmName))}_deals_ledger_${timestamp}.csv`, csvContent);
}

/**
 * Export Campaign ROI & Analytics to CSV
 */
export function exportAnalyticsToCsv(
  roi: any[],
  leaderboard: any[],
  firmName?: string
): void {
  const header = generateCrmCsvHeader({
    reportTitle: 'Organic Content ROI & Broker Performance Analytics',
    subtitle: 'YouTube Shorts, Instagram Reels & Sales Incentive Attribution',
    firmName,
  });

  let csvContent = header;

  // Section 1: Content Marketing ROI
  csvContent += `# ============================================================================\n`;
  csvContent += `# SECTION 1: CONTENT ASSET REVENUE ATTRIBUTION\n`;
  csvContent += `# ============================================================================\n`;
  const roiCols = [
    'Ref Tag',
    'Channel',
    'Property / Topic',
    'Total Leads Generated',
    'Hot Prospects',
    'Site Visits Scheduled',
    'Closed Deals',
    'Attributed Agreement Value (INR)',
    'Attributed Brokerage (INR)',
    'Production Cost (INR)',
    'Net Profit (INR)',
    'ROI Multiplier',
  ];
  const roiRows = roi.map((item) => [
    item.sourceCode || item.refTag || '',
    item.channel || 'ORGANIC',
    item.title || item.property || '',
    item.leadCount || 0,
    item.hotLeadCount || 0,
    item.visitCount || 0,
    item.closedDealsCount || 0,
    item.attributedAgreementValue || 0,
    item.attributedBrokerage || 0,
    item.productionCost || 0,
    item.netProfit || 0,
    item.roiMultiplier ? `${item.roiMultiplier}x` : '0x',
  ].map(escapeCsvCell).join(','));

  csvContent += `${roiCols.map(escapeCsvCell).join(',')}\n${roiRows.join('\n')}\n\n`;

  // Section 2: Agent Performance Leaderboard
  csvContent += `# ============================================================================\n`;
  csvContent += `# SECTION 2: ADVISOR PERFORMANCE & INCENTIVE LEADERBOARD\n`;
  csvContent += `# ============================================================================\n`;
  const lbCols = [
    'Rank',
    'Advisor Name',
    'Role',
    'Total Closed Deals',
    'Total Sales Volume (INR)',
    'Gross Brokerage Generated (INR)',
    'Earned Commission Payout (INR)',
    'Target Achievement (%)',
    'Leaderboard Tier',
  ];
  const lbRows = leaderboard.map((item, idx) => [
    idx + 1,
    item.fullName || item.brokerName || 'Advisor',
    item.role || 'Sales Advisor',
    item.closedDeals || 0,
    item.totalVolume || 0,
    item.grossBrokerage || 0,
    item.earnedPayout || 0,
    item.targetAchievement ? `${item.targetAchievement}%` : '100%',
    item.tier || 'Gold Champion',
  ].map(escapeCsvCell).join(','));

  csvContent += `${lbCols.map(escapeCsvCell).join(',')}\n${lbRows.join('\n')}`;

  const timestamp = new Date().toISOString().slice(0, 10);
  downloadCsvFile(`${firmNameToSlug(resolveFirmName(firmName))}_executive_analytics_${timestamp}.csv`, csvContent);
}

/**
 * WhatsApp formatter for the statutory cost sheet.
 */
export function formatQuotationWhatsApp(quote: {
  projectName: string;
  market: string;
  towerUnit: string;
  carpetAreaSqft: number;
  clientName: string;
  preparedBy: string;
  agreementValue: number;
  ratePerSqftAgreement: number;
  floorRiseCharges?: number;
  floorNumber?: number;
  stampDutyRate: number;
  stampDutyAmount: number;
  registrationFee: number;
  gstRate: number;
  gstAmount: number;
  amenitiesTotal: number;
  totalAllInCost: number;
  ratePerSqftAllIn: number;
  percentageOverAgreement: string | number;
  loanLtv: number;
  loanInterestRate: number;
  loanTenureYears: number;
  eligibleLoanAmount: number;
  requiredDownPayment: number;
  monthlyEMI: number;
  quotationNotes?: string;
  /** Tenant identity for the letterhead and footer. */
  firm?: FirmIdentity;
}): string {
  const firm = resolveFirmName(quote.firm?.name);
  const rera = typeof quote.firm?.reraNumber === 'string' ? quote.firm.reraNumber.trim() : '';

  return `🏛️ *${firm.toUpperCase()} — MAHARASHTRA STATUTORY COST ESTIMATE*
${rera ? `_MahaRERA Registered Advisory | Reg No: ${rera}_\n` : ''}━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 *Project:* ${quote.projectName} (${quote.market})
🏢 *Unit Typology:* ${quote.towerUnit} | *Carpet:* ${quote.carpetAreaSqft} sq.ft
👤 *Client:* ${quote.clientName || 'Valued Buyer'}
👔 *Prepared By:* ${quote.preparedBy || `Advisory Desk`}
📅 *Date:* ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}

━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *CAPITALIZED STATUTORY BREAKDOWN:*
━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ *Base Agreement Value:* ${formatINRFull(quote.agreementValue)} (₹${quote.ratePerSqftAgreement}/sq.ft)
${quote.floorRiseCharges && quote.floorRiseCharges > 0 ? `2️⃣ *Floor Rise (Fl ${quote.floorNumber || 1}):* ${formatINRFull(quote.floorRiseCharges)}\n` : ''}3️⃣ *Maharashtra Stamp Duty (${quote.stampDutyRate}%):* ${formatINRFull(quote.stampDutyAmount)}
4️⃣ *MahaRERA Registration Fee:* ${formatINRFull(quote.registrationFee)}
5️⃣ *Statutory GST (${quote.gstRate}%):* ${formatINRFull(quote.gstAmount)}
6️⃣ *Development Corpus & Amenities:* ${formatINRFull(quote.amenitiesTotal)}

💎 *GRAND ALL-IN CAPITALIZED COST (C_all-in):*
👉 *${formatINRFull(quote.totalAllInCost)}*
_(Effective All-In Rate: ₹${quote.ratePerSqftAllIn}/sq.ft | +${quote.percentageOverAgreement}% over Base)_

━━━━━━━━━━━━━━━━━━━━━━━━━━
🏦 *BANK LOAN STRUCTURING (${quote.loanLtv}% LTV @ ${quote.loanInterestRate}%):*
━━━━━━━━━━━━━━━━━━━━━━━━━━
• *Sanctioned Loan Principal:* ${formatINRFull(quote.eligibleLoanAmount)}
• *Self-Funded Cash Down Payment:* ${formatINRFull(quote.requiredDownPayment)}
• *Estimated Monthly EMI:* ${formatINRFull(quote.monthlyEMI)} / month (${quote.loanTenureYears} Years)

${quote.quotationNotes ? `📌 *Notes:* ${quote.quotationNotes}\n` : ''}━━━━━━━━━━━━━━━━━━━━━━━━━━
${quote.firm?.phone ? `📞 *${firm} Desk:* ${quote.firm.phone}\n` : ''}${quote.firm?.website ? `🌐 *Website:* ${quote.firm.website}\n` : ''}_Compliant with Maharashtra Stamp Act & MahaRERA Guidelines._`;
}

/**
 * WhatsApp formatter for escorted site-visit itineraries.
 */
export function formatSiteVisitWhatsApp(visit: {
  clientName: string;
  clientPhone: string;
  scheduledDateStr: string;
  timeSlot: string;
  pickupLocation: string;
  cabDetails?: string;
  assignedBrokerName?: string;
  stops: Array<{
    projectName: string;
    bhk: string | number;
    microMarket: string;
    expectedTime?: string;
    developerPocName?: string;
  }>;
  /** Tenant identity for the header and footer. */
  firm?: FirmIdentity;
}): string {
  const firm = resolveFirmName(visit.firm?.name);
  const stopsFormatted = visit.stops.map((s, idx) => {
    return `   *Stop ${idx + 1}:* ${s.projectName} (${s.bhk} BHK) — ${s.microMarket}\n   ⏱️ Arrival: ${s.expectedTime || 'As scheduled'}${s.developerPocName ? ` | POC: ${s.developerPocName}` : ''}`;
  }).join('\n\n');

  return `🚗 *${firm.toUpperCase()} — ESCORTED PROPERTY TOUR ITINERARY*
_VIP Physical Inspection Protocol | Kharghar & Taloja Hub_
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Guest:* ${visit.clientName}
📅 *Date & Time:* ${visit.scheduledDateStr} • ${visit.timeSlot}
📍 *Pickup Location:* ${visit.pickupLocation}
🚖 *Assigned Chauffeur:* ${visit.cabDetails || 'Escort Vehicle'}
👔 *Accompanying Advisor:* ${visit.assignedBrokerName || 'Senior Property Consultant'}

━━━━━━━━━━━━━━━━━━━━━━━━━━
🗺️ *PLANNED PROJECT STOPS (${visit.stops.length} Developments):*
━━━━━━━━━━━━━━━━━━━━━━━━━━
${stopsFormatted}

━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ *Tour Preparation Guidelines:*
• Sanctioned RERA blueprints & carpet measurements provided on-site.
• Direct builder inventory pricing & bank loan spot-approval available.
• For live route assistance, contact your advisor.${visit.firm?.phone ? ` ${visit.firm.phone}` : ''}

_${firm} — Real Estate Ground Truth with Zero Fluff._`;
}
