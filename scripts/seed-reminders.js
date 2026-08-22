const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedReminders() {
  const org = await prisma.organization.findFirst();
  if (!org) return;

  const leads = await prisma.lead.findMany();
  if (leads.length === 0) return;

  console.log(`Found ${leads.length} leads. Seeding reminders...`);

  // Clear existing reminders
  await prisma.leadReminder.deleteMany();

  const now = new Date();

  // 1. Overdue reminder on Lead 0
  if (leads[0]) {
    await prisma.leadReminder.create({
      data: {
        organizationId: org.id,
        leadId: leads[0].id,
        title: 'Urgent: Call to discuss builder price concession on 2BHK Kharghar Sector 35',
        reminderType: 'CALL',
        dueAt: new Date(now.getTime() - 45 * 60 * 1000), // 45 mins overdue
        priority: 'URGENT',
        status: 'PENDING',
        notes: 'Client was promised a callback after developer sales VP agreed to waive floor rise charges.',
      },
    });
  }

  // 2. Due today reminder on Lead 1
  if (leads[1]) {
    const today4pm = new Date(now);
    today4pm.setHours(16, 0, 0, 0);
    if (today4pm.getTime() < now.getTime()) {
      today4pm.setTime(now.getTime() + 2 * 60 * 60 * 1000);
    }

    await prisma.leadReminder.create({
      data: {
        organizationId: org.id,
        leadId: leads[1].id,
        title: 'WhatsApp: Send updated master floor plan and video walkthrough link',
        reminderType: 'WHATSAPP',
        dueAt: today4pm,
        priority: 'HIGH',
        status: 'PENDING',
        notes: 'Client inquired via Instagram Reel TALOJA21 about East-facing 2BHK units.',
      },
    });
  }

  // 3. Upcoming weekend reminder on Lead 2
  if (leads[2]) {
    const saturday = new Date(now);
    saturday.setDate(saturday.getDate() + ((6 - saturday.getDay() + 7) % 7 || 7));
    saturday.setHours(11, 0, 0, 0);

    await prisma.leadReminder.create({
      data: {
        organizationId: org.id,
        leadId: leads[2].id,
        title: 'Site Visit Follow-up: Confirm cab pickup at Kharghar Railway Station',
        reminderType: 'SITE_VISIT_FOLLOWUP',
        dueAt: saturday,
        priority: 'HIGH',
        status: 'PENDING',
        notes: 'Driver Ramesh (Ertiga MH-46-AZ-1234) coordinated for 11:00 AM station pickup.',
      },
    });
  }

  console.log('✅ Reminders successfully seeded!');
  await prisma.$disconnect();
}

seedReminders();
