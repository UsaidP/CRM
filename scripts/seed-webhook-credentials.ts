import { prisma } from '../src/lib/db/prisma';
import { OFFICIAL_BROKER_NUMBERS } from '../src/lib/domain/broker-resolver';

async function main() {
  console.log('Seeding WebhookCredentials for active organization...');

  const org = await prisma.organization.findUnique({
    where: { slug: 'zamzam-properties' },
  });

  if (!org) {
    console.error('Organization "zamzam-properties" not found.');
    process.exit(1);
  }

  const credentials = [
    {
      provider: 'WHATSAPP',
      providerIdentifier: OFFICIAL_BROKER_NUMBERS.SAFWAN.whatsappPhoneNumberId,
      label: 'Safwan WhatsApp Business Line',
    },
    {
      provider: 'TELEPHONY',
      providerIdentifier: '02269719000', // Exotel virtual DID
      label: 'Exotel Primary Virtual Number',
    },
  ];

  for (const cred of credentials) {
    const existing = await prisma.webhookCredential.findUnique({
      where: {
        provider_providerIdentifier: {
          provider: cred.provider,
          providerIdentifier: cred.providerIdentifier,
        },
      },
    });

    if (existing) {
      console.log(`✓ Credential already exists: ${cred.provider} (${cred.providerIdentifier})`);
    } else {
      await prisma.webhookCredential.create({
        data: {
          organizationId: org.id,
          provider: cred.provider,
          providerIdentifier: cred.providerIdentifier,
          label: cred.label,
          isActive: true,
        },
      });
      console.log(`+ Created credential: ${cred.provider} (${cred.providerIdentifier})`);
    }
  }

  console.log('Done.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
