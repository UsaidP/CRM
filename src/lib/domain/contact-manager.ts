import { prisma } from '@/lib/db/prisma';

export interface UpsertContactOptions {
  organizationId: string;
  fullName?: string;
  phoneE164?: string;
  whatsappWaId?: string;
  instagramId?: string;
  email?: string;
  assignedBrokerId?: string;
  notes?: string;
}

export interface ContactMergeResult {
  success: boolean;
  targetContactId: string;
  mergedIdentitiesCount: number;
  mergedLeadsCount: number;
  auditId: string;
  error?: string;
}

/**
 * Finds or creates a durable Contact and associates all provided identities.
 */
export async function findOrCreateContact(options: UpsertContactOptions) {
  const {
    organizationId,
    fullName,
    phoneE164,
    whatsappWaId,
    instagramId,
    email,
    assignedBrokerId,
    notes,
  } = options;

  let existingContactId: string | null = null;

  // 1. Search existing identity matches
  if (phoneE164) {
    const identity = await prisma.contactIdentity.findFirst({
      where: { identityType: 'PHONE_E164', identityValue: phoneE164 },
      select: { contactId: true },
    });
    if (identity) existingContactId = identity.contactId;
  }

  if (!existingContactId && whatsappWaId) {
    const identity = await prisma.contactIdentity.findFirst({
      where: { identityType: 'WHATSAPP_WAID', identityValue: whatsappWaId },
      select: { contactId: true },
    });
    if (identity) existingContactId = identity.contactId;
  }

  if (!existingContactId && instagramId) {
    const identity = await prisma.contactIdentity.findFirst({
      where: { identityType: 'INSTAGRAM_IGID', identityValue: instagramId },
      select: { contactId: true },
    });
    if (identity) existingContactId = identity.contactId;
  }

  if (!existingContactId && email) {
    const identity = await prisma.contactIdentity.findFirst({
      where: { identityType: 'EMAIL', identityValue: email.toLowerCase() },
      select: { contactId: true },
    });
    if (identity) existingContactId = identity.contactId;
  }

  let contact;

  if (existingContactId) {
    contact = await prisma.contact.update({
      where: { id: existingContactId },
      data: {
        primaryName: fullName || undefined,
        assignedBrokerId: assignedBrokerId || undefined,
        lastActivityAt: new Date(),
        notes: notes ? `${notes}` : undefined,
      },
      include: { identities: true },
    });
  } else {
    contact = await prisma.contact.create({
      data: {
        organizationId,
        primaryName: fullName || (instagramId ? `@${instagramId}` : 'Navi Mumbai Prospect'),
        assignedBrokerId,
        lifecycleStage: 'PROSPECT',
        notes,
      },
      include: { identities: true },
    });
  }

  // Ensure all passed identities exist on the contact
  const existingTypesAndValues = new Set(
    contact.identities.map((i) => `${i.identityType}:${i.identityValue}`)
  );

  const newIdentities: Array<{ identityType: string; identityValue: string; isPrimary?: boolean }> = [];

  if (phoneE164 && !existingTypesAndValues.has(`PHONE_E164:${phoneE164}`)) {
    newIdentities.push({ identityType: 'PHONE_E164', identityValue: phoneE164, isPrimary: true });
  }
  if (whatsappWaId && !existingTypesAndValues.has(`WHATSAPP_WAID:${whatsappWaId}`)) {
    newIdentities.push({ identityType: 'WHATSAPP_WAID', identityValue: whatsappWaId });
  }
  if (instagramId && !existingTypesAndValues.has(`INSTAGRAM_IGID:${instagramId}`)) {
    newIdentities.push({ identityType: 'INSTAGRAM_IGID', identityValue: instagramId, isPrimary: !phoneE164 });
  }
  if (email && !existingTypesAndValues.has(`EMAIL:${email.toLowerCase()}`)) {
    newIdentities.push({ identityType: 'EMAIL', identityValue: email.toLowerCase() });
  }

  for (const ident of newIdentities) {
    await prisma.contactIdentity.create({
      data: {
        contactId: contact.id,
        identityType: ident.identityType,
        identityValue: ident.identityValue,
        isPrimary: ident.isPrimary || false,
      },
    });
  }

  return prisma.contact.findUnique({
    where: { id: contact.id },
    include: { identities: true, leads: true, assignedBroker: true },
  });
}

/**
 * Merges sourceContact into targetContact and records full audit snapshot.
 */
export async function mergeContacts(params: {
  organizationId: string;
  sourceContactId: string;
  targetContactId: string;
  mergedByUserId?: string;
  reason?: string;
}): Promise<ContactMergeResult> {
  const { organizationId, sourceContactId, targetContactId, mergedByUserId, reason } = params;

  if (sourceContactId === targetContactId) {
    return {
      success: false,
      targetContactId,
      mergedIdentitiesCount: 0,
      mergedLeadsCount: 0,
      auditId: '',
      error: 'Cannot merge contact into itself.',
    };
  }

  const [source, target] = await Promise.all([
    prisma.contact.findUnique({
      where: { id: sourceContactId },
      include: { identities: true, leads: true },
    }),
    prisma.contact.findUnique({
      where: { id: targetContactId },
      include: { identities: true, leads: true },
    }),
  ]);

  if (!source || !target) {
    return {
      success: false,
      targetContactId,
      mergedIdentitiesCount: 0,
      mergedLeadsCount: 0,
      auditId: '',
      error: 'Source or target contact record not found.',
    };
  }

  // Create Audit Snapshot
  const audit = await prisma.contactMergeAudit.create({
    data: {
      organizationId,
      sourceContactId,
      targetContactId,
      mergedByUserId,
      mergedReason: reason || 'Manual broker contact deduplication merge',
      snapshotJson: JSON.stringify({
        sourceSnapshot: source,
        targetSnapshot: target,
      }),
    },
  });

  // Re-link all identities from source to target
  await prisma.contactIdentity.updateMany({
    where: { contactId: sourceContactId },
    data: { contactId: targetContactId },
  });

  // Re-link all leads from source to target
  await prisma.lead.updateMany({
    where: { contactId: sourceContactId },
    data: { contactId: targetContactId },
  });

  // Update target contact name and notes if target lacked them
  await prisma.contact.update({
    where: { id: targetContactId },
    data: {
      primaryName: target.primaryName || source.primaryName,
      companyName: target.companyName || source.companyName,
      notes: [target.notes, source.notes ? `[Merged]: ${source.notes}` : null]
        .filter(Boolean)
        .join(' | '),
      lastActivityAt: new Date(),
    },
  });

  // Remove stale source contact container
  await prisma.contact.delete({
    where: { id: sourceContactId },
  });

  return {
    success: true,
    targetContactId,
    mergedIdentitiesCount: source.identities.length,
    mergedLeadsCount: source.leads.length,
    auditId: audit.id,
  };
}

import { evaluate24HourMessagingWindow } from '@/lib/constants/broker-constants';
export { evaluate24HourMessagingWindow };
