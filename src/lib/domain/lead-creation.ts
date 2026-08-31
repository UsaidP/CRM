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
  sourceCode?: string;
  contactedBrokerNumber?: string;
  assignedBrokerId?: string | null;
  campaignId?: string | null;
  notes?: string;
  currentStage?: string;
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
    leadSource = 'MANUAL_ENTRY',
    sourceCode,
    contactedBrokerNumber = OFFICIAL_BROKER_NUMBERS.SAFWAN.e164,
    assignedBrokerId: requestedBrokerId,
    campaignId,
    notes,
    currentStage = 'new_uncontacted',
  } = input;

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
  });
  if (!org) {
    throw new LeadValidationError('Organization not found');
  }

  // 1. Normalize phone
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
  let inboundNumber = contactedBrokerNumber;
  if (!assignedBrokerId && contactedBrokerNumber) {
    const brokerRes = await resolveBrokerByInboundIdentifier(contactedBrokerNumber, org.id);
    assignedBrokerId = brokerRes.brokerId;
    inboundNumber = brokerRes.brokerPhoneE164 || contactedBrokerNumber;
  }

  // 3. Source attribution
  const attribution = analyzeInboundAttribution(
    sourceCode ? `Code: ${sourceCode} ${notes || ''}` : notes || '',
    'CALL'
  );

  // 4. Contact identity resolution
  const contact = await findOrCreateContact({
    organizationId: org.id,
    fullName: fullName || 'Direct Manual Lead',
    phoneE164: phoneE164 || undefined,
    email: email || undefined,
    assignedBrokerId,
    notes: notes ? `Manual entry: ${notes}` : undefined,
  });

  // 5. Lead row
  const finalStage = currentStage || 'new_uncontacted';
  const lead = await prisma.lead.create({
    data: {
      organizationId: org.id,
      contactId: contact?.id,
      fullName: fullName || 'Direct Manual Lead',
      phoneE164,
      email,
      leadSource: sourceCode ? attribution.leadSource : leadSource || 'MANUAL_ENTRY',
      sourceConfidence: sourceCode ? 'EXACT' : 'UNKNOWN',
      sourceCode: sourceCode?.toUpperCase(),
      inboundNumber,
      campaignId,
      assignedBrokerId,
      currentStage: finalStage,
      firstResponseAt: finalStage !== 'new_uncontacted' ? new Date() : null,
      firstResponseSlaMinutes: 0,
      lastInboundMessageAt: new Date(),
      notes,
    },
  });

  // 6. Zero-Orphan Inbound Rule: speed-to-lead reminder
  await ensureLeadFallbackReminder(lead.id, { organizationId: org.id });

  // 7. Record initial assignment in audit trail if broker is assigned
  if (assignedBrokerId) {
    try {
      await prisma.leadAssignment.create({
        data: {
          leadId: lead.id,
          userId: assignedBrokerId,
          assignedById: ctx.userId || null,
          assignmentType: 'DIRECT',
          notes: 'Initial assignment on lead creation',
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
  };
}
