import { describe, it, expect } from 'bun:test';
import { prisma } from '@/lib/db/prisma';
import { resolveWebhookOrg } from '@/lib/domain/webhook-org-resolver';

describe('Webhook Org Resolver', () => {
  it('resolves organization via active WebhookCredential', async () => {
    // 1. Get or create test organization
    let org = await prisma.organization.findFirst({
      where: { slug: 'zamzam-properties' },
    });
    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: 'ZamZam Properties Test Org',
          slug: 'zamzam-properties',
        },
      });
    }

    const testPhoneNumberId = `test-wa-${Date.now()}`;

    // 2. Create WebhookCredential
    const cred = await prisma.webhookCredential.create({
      data: {
        organizationId: org.id,
        provider: 'WHATSAPP',
        providerIdentifier: testPhoneNumberId,
        label: 'Test WA Credential',
        isActive: true,
      },
    });

    try {
      const result = await resolveWebhookOrg('WHATSAPP', testPhoneNumberId);
      expect(result.org.id).toBe(org.id);
      expect(result.source).toBe('credential');
    } finally {
      await prisma.webhookCredential.delete({
        where: { id: cred.id },
      });
    }
  }, 20000);

  it('falls back to single org when no credential exists but exactly one org is present', async () => {
    const orgs = await prisma.organization.findMany({ take: 2 });
    if (orgs.length === 1) {
      const result = await resolveWebhookOrg('TELEPHONY', 'non-existent-did-12345');
      expect(result.org.id).toBe(orgs[0].id);
      expect(result.source).toBe('single_org_fallback');
    }
  });
});
