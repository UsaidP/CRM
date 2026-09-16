import { prisma } from '@/lib/db/prisma';
import type { Organization } from '@prisma/client';

export type WebhookProvider = 'WHATSAPP' | 'INSTAGRAM' | 'TELEPHONY';

export interface ResolvedWebhookOrg {
  org: Organization;
  source: 'credential' | 'single_org_fallback';
}

/**
 * Resolve the target organization for a public webhook based on
 * provider-specific identifiers (Meta phone_number_id, Instagram Page ID, Exotel virtual DID).
 *
 * 1. Checks WebhookCredential table for an active matching record.
 * 2. If no credential match is found:
 *    - If exactly 1 organization exists in the database, returns it as a fallback (backward compatibility).
 *    - If multiple organizations exist, fails CLOSED with an error to prevent tenant bleed.
 */
export async function resolveWebhookOrg(
  provider: WebhookProvider,
  providerIdentifier?: string | null
): Promise<ResolvedWebhookOrg> {
  const cleanIdentifier = providerIdentifier?.trim();

  if (cleanIdentifier) {
    const credential = await prisma.webhookCredential.findFirst({
      where: {
        provider,
        providerIdentifier: cleanIdentifier,
        isActive: true,
      },
      include: {
        organization: true,
      },
    });

    if (credential && credential.organization) {
      return {
        org: credential.organization,
        source: 'credential',
      };
    }
  }

  // Single-org fallback: if exactly 1 organization exists in the database
  const orgs = await prisma.organization.findMany({
    take: 2,
  });

  if (orgs.length === 1) {
    return {
      org: orgs[0],
      source: 'single_org_fallback',
    };
  }

  if (orgs.length === 0) {
    throw new Error(
      `[WebhookOrgResolver] No organization exists in CRM. Cannot route webhook for ${provider}:${cleanIdentifier || 'none'}.`
    );
  }

  throw new Error(
    `[WebhookOrgResolver] Cannot resolve organization for ${provider}:${cleanIdentifier || 'none'}. Multiple organizations exist (${orgs.length}+) and no active WebhookCredential is registered for this identifier.`
  );
}
