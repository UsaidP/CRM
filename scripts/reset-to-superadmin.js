const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPasswordSync(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
  return `pbkdf2:sha512:100000:${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

async function resetToSuperAdmin() {
  console.log('🧹 Starting Full Database Reset to Fresh State with Single Super Admin Account...\n');

  try {
    // 1. Purge all records in reverse dependency order
    console.log('🗑️  Purging all CRM data, leads, deals, contacts, inventory, portals, and logs...');
    
    await prisma.leadReminder.deleteMany({});
    await prisma.portalTelemetryLog.deleteMany({});
    await prisma.clientPortalUnit.deleteMany({});
    await prisma.clientPortal.deleteMany({});
    await prisma.dealTransaction.deleteMany({});
    await prisma.siteVisit.deleteMany({});
    await prisma.communicationLog.deleteMany({});
    await prisma.buyerRequirement.deleteMany({});
    await prisma.leadAssignment.deleteMany({});
    await prisma.lead.deleteMany({});
    await prisma.contactMergeAudit.deleteMany({});
    await prisma.contactIdentity.deleteMany({});
    await prisma.contact.deleteMany({});
    await prisma.brokerPhoneNumber.deleteMany({});
    await prisma.inboundCampaign.deleteMany({});
    await prisma.webhookEventInbox.deleteMany({});
    await prisma.inventoryAuditLog.deleteMany({});
    await prisma.propertyUnit.deleteMany({});
    await prisma.developerProject.deleteMany({});
    await prisma.rolePermission.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.organization.deleteMany({});

    console.log('✅ All existing records purged.');

    // 2. Create Fresh Organization
    console.log('\n🏢 Creating fresh Organization...');
    const org = await prisma.organization.create({
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
    console.log(`✅ Organization created: ${org.name} (ID: ${org.id})`);

    // 3. Create the Sole Super Admin Account
    console.log('\n👤 Creating Sole Super Admin Account...');
    const defaultPassword = process.env.SUPER_ADMIN_PASSWORD || 'ZamZam@2026';
    const passwordHash = hashPasswordSync(defaultPassword);

    const superAdmin = await prisma.user.create({
      data: {
        organizationId: org.id,
        fullName: 'Usaid Patel',
        email: 'usaid@zamzamproperties.in',
        phoneE164: '+919820123456',
        role: 'SUPER_ADMIN',
        passwordHash,
      },
    });
    console.log(`✅ Super Admin created: ${superAdmin.fullName} (${superAdmin.email})`);

    // 4. Verification Check
    const counts = {
      Organization: await prisma.organization.count(),
      SuperAdminUser: await prisma.user.count(),
      Teams: await prisma.team.count(),
      Projects: await prisma.developerProject.count(),
      Units: await prisma.propertyUnit.count(),
      Contacts: await prisma.contact.count(),
      Leads: await prisma.lead.count(),
      Deals: await prisma.dealTransaction.count(),
    };

    console.log('\n📊 Database State Summary:');
    console.table(counts);

    console.log('====================================================');
    console.log('✨ FRESH START COMPLETE — 1 SOLE SUPER ADMIN ACCOUNT');
    console.log('====================================================');
    console.log(`Organization: ${org.name}`);
    console.log(`Super Admin:  ${superAdmin.fullName}`);
    console.log(`Email:        ${superAdmin.email}`);
    console.log(`Password:     ${defaultPassword}`);
    console.log(`Role:         ${superAdmin.role}`);
    console.log('====================================================\n');

  } catch (error) {
    console.error('❌ Error during database reset:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetToSuperAdmin();
