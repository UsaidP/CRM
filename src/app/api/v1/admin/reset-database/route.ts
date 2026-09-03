import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function hashPasswordSync(password: string): string {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
  return `pbkdf2:sha512:100000:${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

function constantTimeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

// POST /api/v1/admin/reset-database
// Purges all database records and resets to 1 clean Organization with 1 sole Super Admin account
export async function POST(req: Request) {
  // 1. Mandatory Kill-Switch: Endpoint returns 404 unless ENABLE_DB_RESET=true is explicitly set in environment
  if (process.env.ENABLE_DB_RESET !== 'true') {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const headerKey = req.headers.get('x-admin-key') || req.headers.get('authorization')?.replace('Bearer ', '') || '';
    const validKey = process.env.SUPER_ADMIN_KEY || '';

    // Security: Only accept secret via HTTP header (never in JSON body). Use constant-time comparison.
    const isKeyAuthorized = Boolean(validKey && headerKey && constantTimeCompare(headerKey, validKey));

    if (!isKeyAuthorized) {
      const auth = await requireSuperAdmin(req);
      if (!auth.ok) return auth.response;
    }

    if (body.confirmPurge !== 'CONFIRM_PURGE_ALL_DATA') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required confirmation. Please provide confirmPurge: "CONFIRM_PURGE_ALL_DATA".',
        },
        { status: 400 }
      );
    }

    // 1. Purge records in reverse dependency order
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

    // 2. Create Fresh Organization
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

    // 3. Create the Sole Super Admin Account
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
    if (!superAdminPassword) {
      return NextResponse.json(
        { success: false, error: 'SUPER_ADMIN_PASSWORD environment variable is not configured.' },
        { status: 500 }
      );
    }
    const passwordHash = hashPasswordSync(superAdminPassword);

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

    return NextResponse.json({
      success: true,
      message: 'Database purged successfully. Reset to 1 sole Super Admin account.',
      data: {
        organization: {
          id: org.id,
          name: org.name,
        },
        superAdmin: {
          id: superAdmin.id,
          fullName: superAdmin.fullName,
          email: superAdmin.email,
          role: superAdmin.role,
        },
      },
    });
  } catch (error: unknown) {
    console.error('[SECURITY] Error during database reset API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset database' },
      { status: 500 }
    );
  }
}
