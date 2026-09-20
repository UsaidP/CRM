import { prisma } from '@/lib/db/prisma';
import { normalizeIndianPhone } from '@/lib/domain/phone-normalizer';
import {
  resolveBrokerByInboundIdentifier,
  OFFICIAL_BROKER_NUMBERS,
} from '@/lib/domain/broker-resolver';
import { analyzeInboundAttribution } from '@/lib/domain/campaign-attribution';
import { findOrCreateContact } from '@/lib/domain/contact-manager';
import { ensureLeadFallbackReminder } from '@/lib/services/lead-reminder-service';

/**
 * Lead creation pipeline.
 *
 * One deep module for every inbound lead entry point (manual POST, CSV
 * import, telephony call events): phone normalization → broker resolution →
 * source attribution → contact identity resolution → lead row →
 * speed-to-lead reminder. Route handlers should be thin adapters around
 * this module, not re-implement the pipeline.
 */

export interface CreateLeadInput {
  fullName?: string;
  phone?: string;
  email?: string;
  leadSource?: string;
  sourceConfidence?: 'EXACT' | 'INFERRED' | 'UNKNOWN';
  sourceCode?: string;
  sourceContentId?: string;
  contactedBrokerNumber?: string;
  inboundNumber?: string;
  assignedBrokerId?: string | null;
  campaignId?: string | null;
  notes?: string;
  currentStage?: string;
  city?: string;

  // Channel-specific enrichment
  channel?: 'MANUAL_ENTRY' | 'WHATSAPP' | 'INSTAGRAM' | 'TELEPHONY' | 'MOBILE_CALL' | 'CSV_IMPORT';
  instagramId?: string;
  whatsappWaId?: string;

  // Upsert behavior: if a contact already exists and has a lead, or by existingContactId
  existingContactId?: string;

  // CSV import & structured requirements
  requirements?: {
    budgetMin?: number | null;
    budgetMax?: number | null;
    bhkPreferences?: number[];
    targetLocations?: string[];
    possessionPreference?: string | null;
    purpose?: string | null;
    loanPreApproved?: boolean | null;
    isActive?: boolean;
  };

  // Top-level budget/bhk preferences for backward compatibility
  budgetMin?: number | null;
  budgetMax?: number | null;
  bhkPreferences?: number[];
  targetLocations?: string[];
  possessionPreference?: string | null;
  purpose?: string | null;
  loanPreApproved?: boolean | null;

  // SLA & timing
  firstResponseAt?: Date | null;
  firstResponseSlaMinutes?: number;
  lastInboundMessageAt?: Date | null;
}

export interface LeadActorContext {
  organizationId: string;
  /** Set when the lead arrives via an authenticated device/user; absent for pure webhooks. */
  userId?: string;
}

export interface CreatedLeadResult {
  leadId: string;
  contactId: string | null;
  assignedBrokerId: string | undefined;
  phoneE164: string | null;
  currentStage: string;
  lead?: any;
}

export interface UpsertLeadResult {
  lead: any;
  created: boolean;
  leadId: string;
  contactId: string | null;
  assignedBrokerId: string | undefined;
  phoneE164: string | null;
  currentStage: string;
}

export class LeadValidationError extends Error {
  status = 400;
}

/**
 * Create a lead and all of its satellite records. Throws
 * LeadValidationError for caller-fixable problems; anything else is a
 * server fault.
 */
export async function createLead(
  ctx: LeadActorContext,
  input: CreateLeadInput
): Promise<CreatedLeadResult> {
  const {
    fullName,
    phone,
    email,
    leadSource,
    sourceConfidence: explicitConfidence,
    sourceCode,
    sourceContentId,
    contactedBrokerNumber = OFFICIAL_BROKER_NUMBERS.SAFWAN.e164,
    assignedBrokerId: requestedBrokerId,
    campaignId: requestedCampaignId,
    notes,
    currentStage = 'new_uncontacted',
    city = 'Navi Mumbai',
    channel = 'MANUAL_ENTRY',
    instagramId,
    whatsappWaId,
    existingContactId,
    firstResponseAt: explicitFirstResponseAt,
    firstResponseSlaMinutes: explicitSlaMinutes,
    lastInboundMessageAt,
  } = input;

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { id: true },
  });
  if (!org) {
    throw new LeadValidationError('Organization not found');
  }

  // 1. Normalize phone (if provided; Instagram leads may not have phone)
  let phoneE164: string | null = null;
  if (phone && phone.trim() !== '') {
    const phoneResult = normalizeIndianPhone(phone);
    if (!phoneResult.isValid) {
      throw new LeadValidationError(phoneResult.error || 'Invalid phone number');
    }
    phoneE164 = phoneResult.e164;
  }

  // 2. Resolve broker assignment
  let assignedBrokerId = requestedBrokerId ?? undefined;
  let inboundNumber = input.inboundNumber || contactedBrokerNumber;

  // Auto-assign to creator if the creator is a TELECALLER or AGENT and no broker was explicitly requested
  if (!assignedBrokerId && ctx.userId) {
    try {
      const creator = await prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { id: true, role: true, phoneE164: true },
      });
      if (creator && (creator.role === 'TELECALLER' || creator.role === 'AGENT')) {
        assignedBrokerId = creator.id;
        if (creator.phoneE164 && !input.inboundNumber) {
          inboundNumber = creator.phoneE164;
        }
      }
    } catch {
      // Fallback gracefully
    }
  }

  // Fallback to contacted broker line if still unassigned and contactedBrokerNumber is provided
  if (!assignedBrokerId && contactedBrokerNumber) {
    const brokerRes = await resolveBrokerByInboundIdentifier(contactedBrokerNumber, org.id);
    assignedBrokerId = brokerRes.brokerId;
    if (!input.inboundNumber) {
      inboundNumber = brokerRes.brokerPhoneE164 || contactedBrokerNumber;
    }
  }

  // 3. Source attribution & campaign matching
  const attributionChannel = channel === 'WHATSAPP' ? 'WHATSAPP' : channel === 'INSTAGRAM' ? 'INSTAGRAM' : 'CALL';
  const attribution = analyzeInboundAttribution(
    sourceCode ? `Code: ${sourceCode} ${notes || ''}` : notes || '',
    attributionChannel
  );

  let finalLeadSource = leadSource || (sourceCode ? attribution.leadSource : 'MANUAL_ENTRY');
  let finalSourceConfidence = explicitConfidence || (sourceCode ? 'EXACT' : attribution.sourceConfidence || 'UNKNOWN');
  let campaignId = requestedCampaignId;

  const detectedCode = sourceCode || attribution.detectedCode;
  if (!campaignId && detectedCode) {
    try {
      const matchedCampaign = await prisma.inboundCampaign.findFirst({
        where: {
          OR: [
            { sourceCode: detectedCode.trim().toUpperCase() },
            { customSlug: detectedCode.trim().toLowerCase() },
          ],
        },
      });
      if (matchedCampaign) {
        campaignId = matchedCampaign.id;
      }
    } catch {
      // Non-blocking
    }
  }

  // 4. Contact identity resolution
  let contact = null;
  if (existingContactId) {
    contact = await prisma.contact.findUnique({
      where: { id: existingContactId },
    });
  }
  if (!contact) {
    contact = await findOrCreateContact({
      organizationId: org.id,
      fullName: fullName || (instagramId ? `@${instagramId}` : 'Direct Manual Lead'),
      phoneE164: phoneE164 || undefined,
      email: email || undefined,
      whatsappWaId,
      instagramId,
      assignedBrokerId,
      notes: notes ? `Entry via ${channel}: ${notes}` : undefined,
    });
  }

  // 5. Lead row creation
  const finalStage = currentStage || 'new_uncontacted';
  const firstResponseAt = explicitFirstResponseAt !== undefined
    ? explicitFirstResponseAt
    : (finalStage !== 'new_uncontacted' ? new Date() : null);
  const firstResponseSlaMinutes = explicitSlaMinutes ?? 0;

  const lead = await prisma.lead.create({
    data: {
      organizationId: org.id,
      contactId: contact?.id,
      fullName: fullName || (instagramId ? `@${instagramId}` : 'Direct Manual Lead'),
      phoneE164,
      email: email || null,
      city,
      leadSource: finalLeadSource,
      sourceConfidence: finalSourceConfidence,
      sourceCode: detectedCode ? detectedCode.toUpperCase() : undefined,
      sourceContentId: sourceContentId || undefined,
      inboundNumber,
      campaignId,
      assignedBrokerId,
      currentStage: finalStage,
      firstResponseAt,
      firstResponseSlaMinutes,
      lastInboundMessageAt: lastInboundMessageAt || new Date(),
      notes,
    },
  });

  // Campaign counter increment
  if (campaignId) {
    try {
      await prisma.inboundCampaign.update({
        where: { id: campaignId },
        data: { totalLeadsGenerated: { increment: 1 } },
      });
    } catch {
      // Non-blocking
    }
  }

  // 6. Create buyer requirement profile if preferences provided
  const reqData = input.requirements;
  if (reqData) {
    try {
      await prisma.buyerRequirement.create({
        data: {
          leadId: lead.id,
          budgetMin: reqData.budgetMin ?? null,
          budgetMax: reqData.budgetMax ?? 7000000,
          bhkPreferencesJson: JSON.stringify(reqData.bhkPreferences || []),
          targetLocationsJson: JSON.stringify(reqData.targetLocations || []),
          possessionPreference: reqData.possessionPreference !== 'ANY' ? (reqData.possessionPreference || null) : null,
          purpose: reqData.purpose || 'self_use',
          loanPreApproved: Boolean(reqData.loanPreApproved),
          isActive: reqData.isActive ?? true,
        },
      });
    } catch {
      // Non-blocking
    }
  } else if (input.budgetMax || (input.bhkPreferences && input.bhkPreferences.length > 0)) {
    try {
      await prisma.buyerRequirement.create({
        data: {
          leadId: lead.id,
          budgetMin: input.budgetMin ?? null,
          budgetMax: input.budgetMax ?? 7500000,
          bhkPreferencesJson: JSON.stringify(input.bhkPreferences || [2]),
          targetLocationsJson: JSON.stringify(input.targetLocations || ['Kharghar Sector 35']),
          possessionPreference: input.possessionPreference || 'ANY',
          purpose: input.purpose || 'self_use',
          loanPreApproved: Boolean(input.loanPreApproved),
          isActive: true,
        },
      });
    } catch {
      // Non-blocking
    }
  }

  // 7. Zero-Orphan Inbound Rule: speed-to-lead reminder
  await ensureLeadFallbackReminder(lead.id, { organizationId: org.id });

  // 8. Record initial assignment in audit trail if broker is assigned
  if (assignedBrokerId) {
    try {
      await prisma.leadAssignment.create({
        data: {
          leadId: lead.id,
          userId: assignedBrokerId,
          assignedById: ctx.userId || null,
          assignmentType: 'DIRECT',
          notes: ctx.userId === assignedBrokerId ? 'Self-created lead by rep' : 'Initial assignment on lead creation',
        },
      });
    } catch {
      // Non-blocking for lead creation pipeline
    }
  }

  return {
    leadId: lead.id,
    contactId: contact?.id ?? null,
    assignedBrokerId,
    phoneE164,
    currentStage: finalStage,
    lead,
  };
}

/**
 * Upsert or create lead: checks if a lead already exists for the contact or phone
 * in the tenant organization. If found, updates the lead with inbound interaction metadata.
 * If not found, delegates to createLead.
 */
export async function upsertOrCreateLead(
  ctx: LeadActorContext,
  input: CreateLeadInput
): Promise<UpsertLeadResult> {
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { id: true },
  });
  if (!org) {
    throw new LeadValidationError('Organization not found');
  }

  let contactId = input.existingContactId;
  let phoneE164: string | null = null;
  if (input.phone && input.phone.trim() !== '') {
    const phoneResult = normalizeIndianPhone(input.phone);
    if (phoneResult.isValid) {
      phoneE164 = phoneResult.e164;
    }
  }

  // If existingContactId was not passed, resolve or find contact identity
  if (!contactId && (phoneE164 || input.whatsappWaId || input.instagramId || input.email)) {
    const resolvedContact = await findOrCreateContact({
      organizationId: org.id,
      fullName: input.fullName || (input.instagramId ? `@${input.instagramId}` : 'Inbound Prospect'),
      phoneE164: phoneE164 || undefined,
      whatsappWaId: input.whatsappWaId,
      instagramId: input.instagramId,
      email: input.email || undefined,
      assignedBrokerId: input.assignedBrokerId || undefined,
      notes: input.notes,
    });
    if (resolvedContact) {
      contactId = resolvedContact.id;
    }
  }

  // Look for existing lead by contactId or phoneE164 within organization
  let existingLead = null;
  if (contactId) {
    existingLead = await prisma.lead.findFirst({
      where: {
        organizationId: org.id,
        contactId,
      },
    });
  }
  if (!existingLead && phoneE164) {
    existingLead = await prisma.lead.findFirst({
      where: {
        organizationId: org.id,
        phoneE164,
      },
    });
  }

  if (existingLead) {
    const updateData: any = {
      lastInboundMessageAt: input.lastInboundMessageAt || new Date(),
    };

    if (
      input.fullName &&
      (!existingLead.fullName ||
        existingLead.fullName.startsWith('Caller (') ||
        existingLead.fullName.startsWith('@') ||
        existingLead.fullName === 'Direct Manual Lead' ||
        existingLead.fullName === 'Navi Mumbai Buyer' ||
        existingLead.fullName === 'Inbound Prospect')
    ) {
      updateData.fullName = input.fullName;
    }
    if (input.notes) {
      updateData.notes = existingLead.notes ? `${existingLead.notes}\n${input.notes}` : input.notes;
    }
    if (input.sourceCode && !existingLead.sourceCode) {
      updateData.sourceCode = input.sourceCode.toUpperCase();
    }
    if (input.sourceConfidence && existingLead.sourceConfidence === 'UNKNOWN') {
      updateData.sourceConfidence = input.sourceConfidence;
    }
    if (input.sourceContentId && !existingLead.sourceContentId) {
      updateData.sourceContentId = input.sourceContentId;
    }
    if (input.campaignId && !existingLead.campaignId) {
      updateData.campaignId = input.campaignId;
    }
    if (input.assignedBrokerId && !existingLead.assignedBrokerId) {
      updateData.assignedBrokerId = input.assignedBrokerId;
    }
    if (input.inboundNumber && !existingLead.inboundNumber) {
      updateData.inboundNumber = input.inboundNumber;
    }

    const updatedLead = await prisma.lead.update({
      where: { id: existingLead.id },
      data: updateData,
    });

    return {
      lead: updatedLead,
      created: false,
      leadId: updatedLead.id,
      contactId: updatedLead.contactId,
      assignedBrokerId: updatedLead.assignedBrokerId || undefined,
      phoneE164: updatedLead.phoneE164,
      currentStage: updatedLead.currentStage,
    };
  }

  // Not found: delegate to createLead
  const createResult = await createLead(ctx, {
    ...input,
    existingContactId: contactId || undefined,
  });

  return {
    lead: createResult.lead,
    created: true,
    leadId: createResult.leadId,
    contactId: createResult.contactId,
    assignedBrokerId: createResult.assignedBrokerId,
    phoneE164: createResult.phoneE164,
    currentStage: createResult.currentStage,
  };
}
