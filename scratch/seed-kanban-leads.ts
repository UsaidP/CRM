import { prisma } from '../src/lib/db/prisma';

async function seedOrgLeads(orgId: string, orgPrefix: string) {
  const sampleLeads = [
    {
      fullName: `${orgPrefix} - Rajesh Sharma (NRI Investor)`,
      phoneE164: `+9198201${Math.floor(10000 + Math.random() * 90000)}`,
      email: `rajesh.${Date.now()}@investor.in`,
      city: 'Navi Mumbai',
      leadSource: 'PORTAL_MAGICBRICKS',
      currentStage: 'new_uncontacted',
      notes: 'Interested in 3 BHK in Kharghar Sector 10. Budget ₹2.2 Cr. High urgency.',
    },
    {
      fullName: `${orgPrefix} - Dr. Ananya Desai`,
      phoneE164: `+9198202${Math.floor(10000 + Math.random() * 90000)}`,
      email: `ananya.${Date.now()}@hospital.in`,
      city: 'Navi Mumbai',
      leadSource: 'INBOUND_CALL',
      currentStage: 'discovery_call',
      notes: 'Looking for 2 BHK near Apollo Hospital Belapur or Seawoods.',
    },
    {
      fullName: `${orgPrefix} - Vikram Malhotra`,
      phoneE164: `+9198203${Math.floor(10000 + Math.random() * 90000)}`,
      email: `vikram.${Date.now()}@techmumbai.com`,
      city: 'Navi Mumbai',
      leadSource: 'WEBSITE_FORM',
      currentStage: 'portal_shared',
      notes: 'Shortlist deck sent. Viewed brochure 4 times via client portal.',
    },
    {
      fullName: `${orgPrefix} - Preeti & Kunal Singhania`,
      phoneE164: `+9198204${Math.floor(10000 + Math.random() * 90000)}`,
      email: `singhania.${Date.now()}@gmail.com`,
      city: 'Navi Mumbai',
      leadSource: 'DIRECT_BROKER',
      currentStage: 'visit_scheduled',
      notes: 'Site visit fixed for Sunday 11:30 AM at Godrej Highlands Panvel.',
    },
    {
      fullName: `${orgPrefix} - Amitav Banerjee`,
      phoneE164: `+9198205${Math.floor(10000 + Math.random() * 90000)}`,
      email: `amitav.${Date.now()}@corp.in`,
      city: 'Navi Mumbai',
      leadSource: 'WHATSAPP_CAMPAIGN',
      currentStage: 'negotiation_token',
      notes: 'Token advance discussed for Unit 1402. Brokerage rate 2% agreed.',
    },
  ];

  for (const item of sampleLeads) {
    const created = await prisma.lead.create({
      data: {
        organizationId: orgId,
        ...item,
      },
    });

    // Create a reminder for each lead
    await prisma.leadReminder.create({
      data: {
        leadId: created.id,
        organizationId: orgId,
        title: `Follow-up call with ${item.fullName.split(' ')[0]}`,
        reminderType: 'CALL',
        status: 'PENDING',
        dueAt: new Date(Date.now() + 3600 * 1000 * 4), // 4 hours from now
      },
    });

    // Create an initial communication trail
    await prisma.communicationLog.create({
      data: {
        leadId: created.id,
        channel: 'PHONE_CALL',
        direction: 'OUTBOUND',
        messageContent: item.notes,
      },
    });
  }

  console.log(`Seeded 5 leads for org: ${orgId} (${orgPrefix})`);
}

async function main() {
  await seedOrgLeads('b5a5281e-5446-41da-b0e5-1a6e6f9062e3', 'ZamZam');
  await seedOrgLeads('org-test-zamzam-001', 'Alpha');
  console.log('Seeding complete.');
}

main().catch(console.error);
