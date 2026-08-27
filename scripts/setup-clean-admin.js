const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  console.log('🌱 Initializing clean Organization and Admin account (with zero dummy data)...');

  const org = await prisma.organization.create({
    data: {
      name: 'ZamZam Properties Real Estate Advisory',
      slug: 'zamzam-properties',
      reraBrokerRegistration: 'A52000029381',
      settingsJson: JSON.stringify({
        currency: 'INR',
        state: 'Maharashtra',
        defaultCommissionRate: 2.5,
        defaultTaxRate: 18.0,
      }),
    },
  });

  const superAdmin = await prisma.user.create({
    data: {
      organizationId: org.id,
      fullName: 'Super Administrator',
      email: 'admin@zamzamproperties.in',
      phoneE164: '+919820123456',
      role: 'SUPER_ADMIN',
      passwordHash: hashPassword('Admin@12345'),
      customPermissionsJson: '[]',
      isActive: true,
    },
  });

  await prisma.brokerPhoneNumber.create({
    data: {
      organizationId: org.id,
      brokerId: superAdmin.id,
      e164: '+919820123456',
      displayName: 'Main Broker Desk',
      active: true,
    },
  });

  console.log(`✅ Clean setup complete.`);
  console.log(`   Organization: ${org.name}`);
  console.log(`   Admin Email: ${superAdmin.email}`);
  console.log(`   Admin Password: Admin@12345`);
  console.log(`   Projects: 0 (Clean)`);
  console.log(`   Units: 0 (Clean)`);
  console.log(`   Leads: 0 (Clean)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
