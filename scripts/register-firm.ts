import { prisma } from '../src/lib/db/prisma';
import { generateSecureToken, hashToken } from '../src/lib/services/auth-service';

interface RegisterFirmOptions {
  name: string;
  slug?: string;
  reraNumber?: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  whatsappPhoneNumberId?: string;
  telephonyDid?: string;
}

/**
 * CLI & programmatic helper to register a new firm (tenant) into the CRM,
 * initialize their default team, create their primary ADMIN user, and generate
 * an activation / set-password invite link.
 */
export async function registerFirm(options: RegisterFirmOptions) {
  const {
    name,
    adminName,
    adminEmail,
    adminPhone,
    reraNumber,
    whatsappPhoneNumberId,
    telephonyDid,
  } = options;

  const slug =
    options.slug ||
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

  const cleanEmail = adminEmail.trim().toLowerCase();
  const cleanPhone = adminPhone.trim();

  console.log(`\n==============================================`);
  console.log(`🏢 REGISTERING NEW FIRM / TENANT: ${name}`);
  console.log(`==============================================\n`);

  // 1. Check for existing organization slug or admin email
  const existingOrg = await prisma.organization.findUnique({
    where: { slug },
  });

  if (existingOrg) {
    throw new Error(`An organization with slug "${slug}" already exists (ID: ${existingOrg.id}).`);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });

  if (existingUser) {
    throw new Error(`A user with email "${cleanEmail}" already exists across the system.`);
  }

  // 2. Create the Organization (Tenant)
  const org = await prisma.organization.create({
    data: {
      name,
      slug,
      reraBrokerRegistration: reraNumber || null,
      settingsJson: JSON.stringify({
        currency: 'INR',
        state: 'Maharashtra',
        defaultCommissionRate: 2.0,
      }),
    },
  });
  console.log(`✅ Organization created: ${org.name} (ID: ${org.id}, Slug: ${org.slug})`);

  // 3. Create Default Team
  const defaultTeam = await prisma.team.create({
    data: {
      organizationId: org.id,
      name: 'Primary Brokerage Team',
      description: 'Default sales and operations team for ' + org.name,
    },
  });
  console.log(`✅ Default team created: ${defaultTeam.name}`);

  // 4. Generate Admin Invitation Token
  const rawInviteToken = generateSecureToken();
  const inviteTokenHash = hashToken(rawInviteToken);
  const inviteTokenExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

  // 5. Create Firm Primary Administrator
  const adminUser = await prisma.user.create({
    data: {
      organizationId: org.id,
      fullName: adminName.trim(),
      email: cleanEmail,
      phoneE164: cleanPhone,
      role: 'ADMIN',
      teamId: defaultTeam.id,
      isActive: true,
      inviteToken: inviteTokenHash,
      inviteTokenExpiresAt,
    },
  });
  console.log(`✅ Firm Admin created: ${adminUser.fullName} (${adminUser.email})`);

  // 6. Optional: Register WhatsApp Webhook / Phone Credential
  if (whatsappPhoneNumberId) {
    await prisma.webhookCredential.create({
      data: {
        organizationId: org.id,
        provider: 'WHATSAPP',
        providerIdentifier: whatsappPhoneNumberId.trim(),
        label: `${org.name} WhatsApp Business`,
        isActive: true,
      },
    });

    await prisma.brokerPhoneNumber.create({
      data: {
        organizationId: org.id,
        brokerId: adminUser.id,
        e164: cleanPhone,
        displayName: `${adminUser.fullName} (Primary Line)`,
        whatsappPhoneNumberId: whatsappPhoneNumberId.trim(),
        active: true,
      },
    });
    console.log(`✅ WhatsApp Webhook Credential registered: ${whatsappPhoneNumberId}`);
  }

  // 7. Optional: Register Telephony DID (Exotel / Virtual DID)
  if (telephonyDid) {
    await prisma.webhookCredential.create({
      data: {
        organizationId: org.id,
        provider: 'TELEPHONY',
        providerIdentifier: telephonyDid.trim(),
        label: `${org.name} Virtual Inbound DID`,
        isActive: true,
      },
    });
    console.log(`✅ Telephony Inbound DID registered: ${telephonyDid}`);
  }

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const activationUrl = `${appBaseUrl}/set-password?token=${rawInviteToken}`;

  console.log(`\n----------------------------------------------`);
  console.log(`🎉 ONBOARDING READY FOR: ${org.name}`);
  console.log(`----------------------------------------------`);
  console.log(`🔑 Organization ID:    ${org.id}`);
  console.log(`📧 Admin Email:        ${adminUser.email}`);
  console.log(`📱 Admin Phone:        ${adminUser.phoneE164}`);
  console.log(`🔗 Password Setup URL: ${activationUrl}`);
  console.log(`----------------------------------------------\n`);

  return {
    org,
    adminUser,
    defaultTeam,
    activationUrl,
  };
}

// CLI Execution Helper
if (import.meta.main || process.argv[1]?.endsWith('register-firm.ts')) {
  const args = process.argv.slice(2);

  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
  };

  const name = getArg('--name');
  const adminName = getArg('--admin-name');
  const adminEmail = getArg('--admin-email');
  const adminPhone = getArg('--admin-phone');
  const slug = getArg('--slug');
  const reraNumber = getArg('--rera');
  const whatsappPhoneNumberId = getArg('--whatsapp-id');
  const telephonyDid = getArg('--telephony-did');

  if (!name || !adminName || !adminEmail || !adminPhone) {
    console.log(`
Usage:
  bun scripts/register-firm.ts \\
    --name "Firm Legal Name" \\
    --admin-name "Admin Full Name" \\
    --admin-email "admin@firm.com" \\
    --admin-phone "+919876543210" \\
    [--slug "firm-slug"] \\
    [--rera "A520000XXXXX"] \\
    [--whatsapp-id "1092837465"] \\
    [--telephony-did "02269719000"]

Example:
  bun scripts/register-firm.ts \\
    --name "Prestige Realty Advisors" \\
    --admin-name "Tariq Mansoori" \\
    --admin-email "tariq@prestigerealty.in" \\
    --admin-phone "+919820098200" \\
    --rera "A52000031245"
`);
    process.exit(0);
  }

  registerFirm({
    name,
    slug,
    reraNumber,
    adminName,
    adminEmail,
    adminPhone,
    whatsappPhoneNumberId,
    telephonyDid,
  })
    .catch((err) => {
      console.error('❌ Registration failed:', err.message);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
