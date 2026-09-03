const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPasswordSync(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
  return `pbkdf2:sha512:100000:${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

async function main() {
  console.log('👤 Seeding Super Admin user...');

  // 1. Ensure Organization exists
  let org = await prisma.organization.findFirst({
    where: { slug: 'zamzam-properties' },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'ZamZam Properties Real Estate Advisory',
        slug: 'zamzam-properties',
        reraBrokerRegistration: 'A52000029381',
        settingsJson: JSON.stringify({
          state: 'Maharashtra',
          currency: 'INR',
          primaryCity: 'Navi Mumbai',
          activeMicroMarkets: [
            'Kharghar Sector 10',
            'Kharghar Sector 20',
            'Kharghar Sector 35',
            'Taloja Phase 1',
            'Taloja Phase 2',
            'Ulwe Sector 19',
            'Panvel',
          ],
        }),
      },
    });
    console.log(`🏢 Created Organization: ${org.name} (${org.id})`);
  } else {
    console.log(`🏢 Found Organization: ${org.name} (${org.id})`);
  }

  // 2. Hash default password from environment variable
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!password) {
    console.error('❌ Error: SUPER_ADMIN_PASSWORD environment variable is required to seed superadmin.');
    process.exit(1);
  }
  const passwordHash = hashPasswordSync(password);

  // 3. Create or update Super Admin
  const superAdminEmail = 'usaid@zamzamproperties.in';
  const existingUser = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });

  let superAdmin;
  if (!existingUser) {
    superAdmin = await prisma.user.create({
      data: {
        organizationId: org.id,
        fullName: 'Usaid Patel',
        email: superAdminEmail,
        phoneE164: '+919820123456',
        role: 'SUPER_ADMIN',
        passwordHash,
      },
    });
    console.log(`✅ Created Super Admin: ${superAdmin.fullName} (${superAdmin.email}) [Role: ${superAdmin.role}]`);
  } else {
    superAdmin = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: 'SUPER_ADMIN',
        passwordHash,
      },
    });
    console.log(`✅ Updated existing user to Super Admin: ${superAdmin.fullName} (${superAdmin.email})`);
  }

  console.log('\n==========================================');
  console.log('🔑 SUPER ADMIN LOGIN CREDENTIALS');
  console.log('==========================================');
  console.log(`Email:    ${superAdminEmail}`);
  console.log(`Password: ${password}`);
  console.log(`Role:     SUPER_ADMIN`);
  console.log(`Org ID:   ${org.id}`);
  console.log('==========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error creating Super Admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
