const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('🧹 Starting full database purge (cleaning all tables)...');

  try {
    // 1. Clear tables in reverse dependency order
    console.log('🗑️  Deleting all table records...');
    
    await prisma.leadReminder.deleteMany({});
    await prisma.portalTelemetryLog.deleteMany({});
    await prisma.clientPortalUnit.deleteMany({});
    await prisma.clientPortal.deleteMany({});
    await prisma.dealTransaction.deleteMany({});
    await prisma.siteVisit.deleteMany({});
    await prisma.communicationLog.deleteMany({});
    await prisma.buyerRequirement.deleteMany({});
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
    await prisma.user.deleteMany({});
    await prisma.organization.deleteMany({});

    // 2. Perform SQLite VACUUM to compact file and reset storage
    try {
      await prisma.$executeRawUnsafe('VACUUM;');
    } catch (vacuumErr) {
      // Non-critical if DB provider does not support VACUUM
    }

    // 3. Verify all tables are 0
    const counts = {
      Organization: await prisma.organization.count(),
      User: await prisma.user.count(),
      BrokerPhoneNumber: await prisma.brokerPhoneNumber.count(),
      Contact: await prisma.contact.count(),
      ContactIdentity: await prisma.contactIdentity.count(),
      ContactMergeAudit: await prisma.contactMergeAudit.count(),
      DeveloperProject: await prisma.developerProject.count(),
      PropertyUnit: await prisma.propertyUnit.count(),
      InventoryAuditLog: await prisma.inventoryAuditLog.count(),
      InboundCampaign: await prisma.inboundCampaign.count(),
      WebhookEventInbox: await prisma.webhookEventInbox.count(),
      Lead: await prisma.lead.count(),
      CommunicationLog: await prisma.communicationLog.count(),
      BuyerRequirement: await prisma.buyerRequirement.count(),
      ClientPortal: await prisma.clientPortal.count(),
      ClientPortalUnit: await prisma.clientPortalUnit.count(),
      PortalTelemetryLog: await prisma.portalTelemetryLog.count(),
      SiteVisit: await prisma.siteVisit.count(),
      DealTransaction: await prisma.dealTransaction.count(),
      LeadReminder: await prisma.leadReminder.count(),
    };

    console.log('\n📊 Database Status Verification:');
    console.table(counts);

    const totalRecords = Object.values(counts).reduce((acc, c) => acc + c, 0);

    if (totalRecords === 0) {
      console.log('\n✨ Database is now 100% CLEAN (0 records across all 20 models). Schema and structure remain intact.');
    } else {
      console.warn(`\n⚠️ Warning: ${totalRecords} records still remain.`);
    }
  } catch (error) {
    console.error('❌ Error during database purge:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
